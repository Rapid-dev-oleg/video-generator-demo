const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { uploadAudio, ensureDir } = require('../middleware/upload');

const AUDIO_DIR = path.join(__dirname, '../../uploads/audio');
const OUTPUT_DIR = path.join(__dirname, '../../uploads/output');
ensureDir(OUTPUT_DIR);

const VOICES = [
  'ara','eve','leo','rex','sal','naksh','atlas','aurora','liora','carina',
  'zagan','helix','orion','luna','iris','altair','zenith','perseus','helios',
  'lux','kepler','rigel','cosmo','celeste','ursa','sirius','lumen','castor'
];

router.get('/voices', (req, res) => {
  res.json(VOICES);
});

router.get('/', (req, res) => {
  ensureDir(AUDIO_DIR);
  const files = fs.readdirSync(AUDIO_DIR).filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f));
  res.json(files.map(f => ({ id: f, name: f, url: `/uploads/audio/${f}` })));
});

router.post('/upload', (req, res) => {
  uploadAudio(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: req.file.filename, name: req.file.originalname, url: `/uploads/audio/${req.file.filename}` });
  });
});

router.post('/tts', async (req, res) => {
  const { text, voice = 'eve', model = 'grok-tts', language = 'auto' } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const response = await axios.post('https://api.x.ai/v1/tts', {
      text,
      voice,
      model,
      language,
    }, {
      headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}`, 'Content-Type': 'application/json' },
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    const filename = `tts_${Date.now()}.mp3`;
    const filePath = path.join(AUDIO_DIR, filename);
    ensureDir(AUDIO_DIR);
    fs.writeFileSync(filePath, Buffer.from(response.data));

    res.json({ id: filename, name: filename, url: `/uploads/audio/${filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message, details: err.response?.data?.toString() });
  }
});

module.exports = router;
