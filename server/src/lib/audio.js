const ffmpeg = require('fluent-ffmpeg');
const { getVideoDuration } = require('./utils');

/**
 * Накладывает аудио трек на видео. Аудио обрезается по длине видео.
 * @param {string} videoPath 
 * @param {string} audioPath 
 * @param {string} outputPath 
 * @param {Object} options
 * @param {number} options.volume — громкость аудио (1.0 по умолчанию)
 * @param {boolean} options.loop — зациклить аудио если оно короче видео (false по умолчанию)
 */
async function addAudioTrack(videoPath, audioPath, outputPath, options = {}) {
  const { volume = 1.0, loop = false } = options;

  const videoDuration = await getVideoDuration(videoPath);

  return new Promise((resolve, reject) => {
    let filterComplex;

    if (loop) {
      // Зацикливаем аудио, потом обрезаем
      filterComplex = `[1:a]aloop=loop=-1:size=0,atrim=0:${videoDuration},asetpts=PTS-STARTPTS,volume=${volume}[a]`;
    } else {
      // Просто обрезаем
      filterComplex = `[1:a]atrim=0:${videoDuration},asetpts=PTS-STARTPTS,volume=${volume}[a]`;
    }

    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .complexFilter([
        filterComplex,
        '[0:v]copy[v]'
      ])
      .outputOptions(['-map', '[v]', '-map', '[a]', '-shortest'])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`Audio overlay failed: ${err.message}`)))
      .save(outputPath);
  });
}

module.exports = { addAudioTrack };
