const sharp = require('sharp');
const path = require('path');

/**
 * Обрезает изображение под заданное соотношение сторон и разрешение
 * @param {string} inputPath — путь к исходному изображению
 * @param {string} outputPath — куда сохранить результат
 * @param {Object} options
 * @param {string} options.ratio — соотношение сторон, например "16:9", "9:16", "1:1"
 * @param {string} options.resolution — разрешение, например "720p", "1080p", "480p" или "1920x1080"
 * @param {string} options.fit — 'cover' (по умолчанию) или 'contain'
 */
async function cropImage(inputPath, outputPath, options = {}) {
  const { ratio = '16:9', resolution = '720p', fit = 'cover' } = options;

  // Парсим ratio
  const [wRatio, hRatio] = ratio.split(':').map(Number);
  if (!wRatio || !hRatio) {
    throw new Error(`Invalid ratio format: ${ratio}. Expected format like "16:9"`);
  }

  // Определяем целевое разрешение
  let targetWidth, targetHeight;
  if (resolution === '720p') {
    targetWidth = 1280;
    targetHeight = 720;
  } else if (resolution === '1080p') {
    targetWidth = 1920;
    targetHeight = 1080;
  } else if (resolution === '480p') {
    targetWidth = 854;
    targetHeight = 480;
  } else {
    const match = resolution.match(/^(\d+)x(\d+)$/);
    if (match) {
      targetWidth = parseInt(match[1]);
      targetHeight = parseInt(match[2]);
    } else {
      throw new Error(`Unknown resolution: ${resolution}. Use 720p, 1080p, 480p or WIDTHxHEIGHT`);
    }
  }

  const targetRatio = wRatio / hRatio;
  const currentRatio = targetWidth / targetHeight;

  let cropWidth, cropHeight;
  if (currentRatio > targetRatio) {
    cropWidth = Math.round(targetHeight * targetRatio);
    cropHeight = targetHeight;
  } else {
    cropWidth = targetWidth;
    cropHeight = Math.round(targetWidth / targetRatio);
  }

  let pipeline = sharp(inputPath);

  if (fit === 'cover') {
    pipeline = pipeline.resize(cropWidth, cropHeight, { 
      fit: 'cover',
      position: 'center'
    });
  } else if (fit === 'contain') {
    pipeline = pipeline.resize(cropWidth, cropHeight, { 
      fit: 'inside',
      withoutEnlargement: false
    });
  }

  await pipeline.toFile(outputPath);
  return outputPath;
}

module.exports = { cropImage };
