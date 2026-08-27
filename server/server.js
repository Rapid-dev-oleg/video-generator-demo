require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { ensureDir } = require('./src/lib/utils');

// Use bundled ffmpeg if available
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = path.join(__dirname, '..', 'tools', 'ffmpeg');
if (fs.existsSync(ffmpegPath)) {
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log(`🎞️  Bundled ffmpeg: ${ffmpegPath}`);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/images', require('./src/routes/images'));
app.use('/api/generate', require('./src/routes/generate'));
app.use('/api/clips', require('./src/routes/clips'));
app.use('/api/audio', require('./src/routes/audio'));

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, xai: !!process.env.XAI_API_KEY });
});

// Serve production client build (so a single port can be exposed via tunnel)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Ensure dirs
ensureDir(path.join(__dirname, 'uploads/images'));
ensureDir(path.join(__dirname, 'uploads/audio'));
ensureDir(path.join(__dirname, 'uploads/logos'));
ensureDir(path.join(__dirname, 'uploads/output'));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads: ${path.join(__dirname, 'uploads')}`);
});
