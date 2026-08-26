const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/images');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/audio');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/logos');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo${ext}`);
  }
});

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files allowed'), false);
};

const audioFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4') cb(null, true);
  else cb(new Error('Only audio files allowed'), false);
};

const logoFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png') cb(null, true);
  else cb(new Error('Only PNG logo allowed'), false);
};

module.exports = {
  uploadImage: multer({ storage: imageStorage, fileFilter: imageFilter, limits: { fileSize: 50 * 1024 * 1024 } }).single('image'),
  uploadAudio: multer({ storage: audioStorage, fileFilter: audioFilter, limits: { fileSize: 50 * 1024 * 1024 } }).single('audio'),
  uploadLogo: multer({ storage: logoStorage, fileFilter: logoFilter, limits: { fileSize: 10 * 1024 * 1024 } }).single('logo'),
  ensureDir,
};
