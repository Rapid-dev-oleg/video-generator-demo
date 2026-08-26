const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { uploadImage, ensureDir } = require('../middleware/upload');

const IMAGES_DIR = path.join(__dirname, '../../uploads/images');
const OUTPUT_DIR = path.join(__dirname, '../../uploads/output');

router.post('/upload', (req, res) => {
  uploadImage(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: req.file.filename, name: req.file.originalname, path: req.file.filename });
  });
});

router.get('/', (req, res) => {
  ensureDir(IMAGES_DIR);
  const files = fs.readdirSync(IMAGES_DIR).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  res.json(files.map(f => ({ id: f, name: f, url: `/uploads/images/${f}` })));
});

router.delete('/:id', (req, res) => {
  const filePath = path.join(IMAGES_DIR, req.params.id);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

module.exports = router;
