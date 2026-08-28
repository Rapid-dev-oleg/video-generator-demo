const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { mergeVideos } = require('../lib/merge');
const { addAudioTrack, addStereoAudioTrack } = require('../lib/audio');
const { addLogo } = require('../lib/logo');
const { applyOverlays } = require('../lib/overlays');
const { ensureDir } = require('../lib/utils');

const OUTPUT_DIR = path.join(__dirname, '../../uploads/output');
const AUDIO_DIR = path.join(__dirname, '../../uploads/audio');
const LOGO_DIR = path.join(__dirname, '../../uploads/logos');
ensureDir(OUTPUT_DIR);

function listOutputFiles(filterRegex) {
  ensureDir(OUTPUT_DIR);
  return fs.readdirSync(OUTPUT_DIR)
    .filter(f => filterRegex.test(f))
    .map(filename => {
      const stat = fs.statSync(path.join(OUTPUT_DIR, filename));
      return { filename, url: `/uploads/output/${filename}`, createdAt: stat.mtimeMs };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

router.get('/', (req, res) => {
  res.json(listOutputFiles(/^gen_.*\.mp4$/i));
});

router.get('/videos', (req, res) => {
  res.json(listOutputFiles(/^(merged_|audio_|final_|stereo_|overlay_).*\.mp4$/i));
});

router.get('/duration/:filename', async (req, res) => {
  try {
    const { getVideoDuration } = require('../lib/utils');
    const videoPath = path.join(OUTPUT_DIR, req.params.filename);
    if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'File not found' });
    const duration = await getVideoDuration(videoPath);
    res.json({ filename: req.params.filename, duration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/merge', async (req, res) => {
  try {
    const { segments } = req.body; // array of filenames in output dir
    if (!segments || segments.length === 0) return res.status(400).json({ error: 'No segments' });

    const paths = segments.map(s => path.join(OUTPUT_DIR, s));
    const outFile = `merged_${Date.now()}.mp4`;
    const outPath = path.join(OUTPUT_DIR, outFile);

    await mergeVideos(paths, outPath);
    res.json({ path: `/uploads/output/${outFile}`, filename: outFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/audio', async (req, res) => {
  try {
    const { videoFile, audioFile, volume = 0.8, loop = false } = req.body;
    if (!videoFile || !audioFile) return res.status(400).json({ error: 'videoFile and audioFile required' });

    const videoPath = path.join(OUTPUT_DIR, videoFile);
    const audioPath = path.join(AUDIO_DIR, audioFile);
    const outFile = `audio_${Date.now()}.mp4`;
    const outPath = path.join(OUTPUT_DIR, outFile);

    await addAudioTrack(videoPath, audioPath, outPath, { volume, loop });
    res.json({ path: `/uploads/output/${outFile}`, filename: outFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/audio-stereo', async (req, res) => {
  try {
    const { videoFile, leftAudio, rightAudio, leftVolume = 1.0, rightVolume = 1.0 } = req.body;
    if (!videoFile || !leftAudio || !rightAudio) {
      return res.status(400).json({ error: 'videoFile, leftAudio and rightAudio required' });
    }

    const videoPath = path.join(OUTPUT_DIR, videoFile);
    const leftPath = path.join(AUDIO_DIR, leftAudio);
    const rightPath = path.join(AUDIO_DIR, rightAudio);
    const outFile = `stereo_${Date.now()}.mp4`;
    const outPath = path.join(OUTPUT_DIR, outFile);

    await addStereoAudioTrack(videoPath, leftPath, rightPath, outPath, { leftVolume, rightVolume });
    res.json({ path: `/uploads/output/${outFile}`, filename: outFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/overlays', async (req, res) => {
  try {
    const { videoFile, overlays } = req.body;
    if (!videoFile) return res.status(400).json({ error: 'videoFile required' });
    if (!Array.isArray(overlays) || overlays.length === 0) return res.status(400).json({ error: 'overlays array required' });

    const videoPath = path.join(OUTPUT_DIR, videoFile);
    const outFile = `overlay_${Date.now()}.mp4`;
    const outPath = path.join(OUTPUT_DIR, outFile);

    await applyOverlays(videoPath, overlays, outPath);
    res.json({ path: `/uploads/output/${outFile}`, filename: outFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logo', async (req, res) => {
  try {
    const { videoFile, position = 'bottom-right', margin = 20, scale = 0.15 } = req.body;
    if (!videoFile) return res.status(400).json({ error: 'videoFile required' });

    const videoPath = path.join(OUTPUT_DIR, videoFile);
    const logoPath = path.join(LOGO_DIR, 'logo.png');
    if (!fs.existsSync(logoPath)) return res.status(404).json({ error: 'Logo not uploaded. POST /api/logos first' });

    const outFile = `final_${Date.now()}.mp4`;
    const outPath = path.join(OUTPUT_DIR, outFile);

    await addLogo(videoPath, logoPath, outPath, { position, margin, scale });
    res.json({ path: `/uploads/output/${outFile}`, filename: outFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logo-upload', (req, res) => {
  const { uploadLogo } = require('../middleware/upload');
  uploadLogo(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ ok: true, path: req.file.path });
  });
});

router.delete('/:filename', (req, res) => {
  const filePath = path.join(OUTPUT_DIR, req.params.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

module.exports = router;
