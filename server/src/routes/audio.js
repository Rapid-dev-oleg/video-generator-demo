const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { uploadAudio, ensureDir } = require('../middleware/upload');
const { getVideoDuration } = require('../lib/utils');

const AUDIO_DIR = path.join(__dirname, '../../uploads/audio');
const OUTPUT_DIR = path.join(__dirname, '../../uploads/output');
ensureDir(AUDIO_DIR);
ensureDir(OUTPUT_DIR);

const VOICES = [
  'ara','eve','leo','rex','sal','naksh','atlas','aurora','liora','carina',
  'zagan','helix','orion','luna','iris','altair','zenith','perseus','helios',
  'lux','kepler','rigel','cosmo','celeste','ursa','sirius','lumen','castor'
];

const LANGUAGES = [
  { id: 'auto', label: 'Auto' },
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'de', label: 'Deutsch' },
  { id: 'it', label: 'Italiano' },
  { id: 'pt', label: 'Português' },
  { id: 'zh', label: '中文' },
  { id: 'ja', label: '日本語' },
  { id: 'ko', label: '한국어' },
  { id: 'ar', label: 'العربية' },
  { id: 'hi', label: 'हिन्दी' },
];

function sanitizeFileName(str) {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\u0400-\u04FF]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function makeTTSFileName(text, durationSec, voice) {
  const words = text.trim().split(/\s+/).slice(0, 3).join(' ');
  const safeWords = sanitizeFileName(words) || 'tts';
  const duration = Math.round(durationSec);
  return `tts_${duration}s_${safeWords}_${voice}.mp3`;
}

function ensureUniqueName(dir, baseName) {
  if (!fs.existsSync(path.join(dir, baseName))) return baseName;
  const ext = path.extname(baseName);
  const name = path.basename(baseName, ext);
  let counter = 1;
  let candidate;
  do {
    candidate = `${name}_${counter}${ext}`;
    counter++;
  } while (fs.existsSync(path.join(dir, candidate)));
  return candidate;
}

router.get('/voices', (req, res) => {
  res.json(VOICES);
});

router.get('/languages', (req, res) => {
  res.json(LANGUAGES);
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

    const tempName = `tts_tmp_${Date.now()}.mp3`;
    const tempPath = path.join(AUDIO_DIR, tempName);
    ensureDir(AUDIO_DIR);
    fs.writeFileSync(tempPath, Buffer.from(response.data));

    const duration = await getVideoDuration(tempPath);
    const baseName = makeTTSFileName(text, duration, voice);
    const filename = ensureUniqueName(AUDIO_DIR, baseName);
    const filePath = path.join(AUDIO_DIR, filename);
    fs.renameSync(tempPath, filePath);

    res.json({ id: filename, name: filename, url: `/uploads/audio/${filename}`, duration });
  } catch (err) {
    res.status(500).json({ error: err.message, details: err.response?.data?.toString() });
  }
});

router.delete('/:id', (req, res) => {
  const filePath = path.join(AUDIO_DIR, req.params.id);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

module.exports = router;
