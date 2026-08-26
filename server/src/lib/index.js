const { cropImage } = require('./crop');
const { generateVideo, createGenerationTask, pollUntilDone } = require('./generate');
const { mergeVideos } = require('./merge');
const { addAudioTrack } = require('./audio');
const { addLogo } = require('./logo');
const { ensureDir, downloadFile, getVideoDuration } = require('./utils');

module.exports = {
  // Обрезка изображения
  cropImage,

  // Генерация через xAI
  generateVideo,
  createGenerationTask,
  pollUntilDone,

  // Склейка
  mergeVideos,

  // Аудио
  addAudioTrack,

  // Логотип
  addLogo,

  // Утилиты
  ensureDir,
  downloadFile,
  getVideoDuration,
};
