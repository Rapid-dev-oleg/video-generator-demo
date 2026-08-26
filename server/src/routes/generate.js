const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { createGenerationTask, pollUntilDone } = require('../lib/generate');
const { cropImage } = require('../lib/crop');
const { ensureDir } = require('../lib/utils');

const IMAGES_DIR = path.join(__dirname, '../../uploads/images');
const OUTPUT_DIR = path.join(__dirname, '../../uploads/output');
ensureDir(OUTPUT_DIR);

const CAMERA_PROMPTS = {
  'slow_zoom_in': 'slow cinematic zoom in on <IMAGE_1>, dramatic push-in, professional camera movement',
  'slow_zoom_out': 'slow cinematic zoom out from <IMAGE_1>, revealing the environment, wide establishing shot',
  'pan_right': 'smooth camera pan to the right across <IMAGE_1>, maintaining sharp focus, tracking shot',
  'orbit_left': 'slow 360-degree orbit around <IMAGE_1>, cinematic tracking shot, full rotation',
  'parallax_push': 'subtle parallax depth effect, camera pushes forward while background shifts, 3D motion'
};

router.post('/', async (req, res) => {
  const requestId = `gen_${Date.now()}`;
  try {
    const { imageId, duration = 5, aspectRatio = '16:9', resolution = '720p', cameraMove = 'slow_zoom_in', voice, voiceText } = req.body;
    console.log(`[${requestId}] Incoming request body:`, JSON.stringify(req.body, null, 2));

    if (!imageId) return res.status(400).json({ error: 'imageId required' });
    if (resolution && !['480p', '720p'].includes(resolution)) {
      return res.status(400).json({ error: `Resolution ${resolution} is not supported by xAI reference-to-video. Use 480p or 720p.` });
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'XAI_API_KEY not configured' });
    if (apiKey === 'your_xai_api_key_here') {
      return res.status(500).json({ error: 'XAI_API_KEY is still the placeholder value. Set a real key in server/.env' });
    }
    console.log(`[${requestId}] Using XAI_API_KEY (masked): ${apiKey.slice(0, 4)}...${apiKey.slice(-4)} (length ${apiKey.length})`);

    const imagePath = path.join(IMAGES_DIR, imageId);
    if (!fs.existsSync(imagePath)) return res.status(404).json({ error: 'Image not found' });

    // Crop image
    const croppedPath = path.join(OUTPUT_DIR, `crop_${imageId}`);
    await cropImage(imagePath, croppedPath, { ratio: aspectRatio, resolution, fit: 'cover' });

    // Build prompt
    let prompt = CAMERA_PROMPTS[cameraMove] || CAMERA_PROMPTS['slow_zoom_in'];
    if (voice && voiceText) {
      prompt += `. The person from <IMAGE_1> speaks with the voice from <AUDIO_0>, saying: "${voiceText}"`;
    }
    console.log(`[${requestId}] Built prompt:`, prompt);

    const options = {
      apiKey,
      prompt,
      imagePaths: [croppedPath],
      duration: Math.min(Math.max(parseInt(duration), 1), 15),
      aspectRatio,
      resolution,
      model: 'grok-imagine-video-1.5',
    };

    if (voice) {
      options.referenceAudios = [{ voice_id: voice }];
    }
    console.log(`[${requestId}] Options passed to generate lib:`, JSON.stringify({ ...options, apiKey: '***' }, null, 2));

    const task = await createGenerationTask(options);
    console.log(`[${requestId}] xAI create task response:`, JSON.stringify(task, null, 2));
    res.json({ requestId: task.request_id, status: 'pending' });
  } catch (err) {
    console.error(`[${requestId}] Generation failed:`, err);
    const details = err.response?.data || err.stack;
    if (details) {
      console.error(`[${requestId}] Error details:`, typeof details === 'object' ? JSON.stringify(details, null, 2) : details);
    }
    res.status(500).json({
      error: err.message,
      details: typeof details === 'object' ? details : undefined,
      stack: err.stack,
    });
  }
});

router.get('/:requestId/status', async (req, res) => {
  try {
    const apiKey = process.env.XAI_API_KEY;
    const { getGenerationStatus } = require('../lib/generate');
    const data = await getGenerationStatus(req.params.requestId, apiKey);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:requestId/download', async (req, res) => {
  try {
    const apiKey = process.env.XAI_API_KEY;
    const { downloadFile } = require('../lib/utils');
    const { getGenerationStatus } = require('../lib/generate');

    const data = await getGenerationStatus(req.params.requestId, apiKey);
    if (data.status !== 'done' || !data.video?.url) {
      return res.status(400).json({ error: 'Video not ready' });
    }

    const filename = `gen_${req.params.requestId}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    await downloadFile(data.video.url, outputPath);

    res.json({ path: `/uploads/output/${filename}`, localPath: outputPath, url: data.video.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
