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

/**
 * Накладывает два аудио трека на видео в разные стерео-каналы.
 * leftAudio → левый канал, rightAudio → правый канал.
 * Каждый канал обрезается или дополняется тишиной точно до длины видео.
 * Длина выходного видео не меняется.
 * @param {string} videoPath
 * @param {string} leftAudioPath
 * @param {string} rightAudioPath
 * @param {string} outputPath
 * @param {Object} options
 * @param {number} options.leftVolume — громкость левого канала (1.0 по умолчанию)
 * @param {number} options.rightVolume — громкость правого канала (1.0 по умолчанию)
 */
async function addStereoAudioTrack(videoPath, leftAudioPath, rightAudioPath, outputPath, options = {}) {
  const { leftVolume = 1.0, rightVolume = 1.0 } = options;

  const videoDuration = await getVideoDuration(videoPath);
  const sampleRate = 48000;
  const wholeLen = Math.ceil(videoDuration * sampleRate);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(leftAudioPath)
      .input(rightAudioPath)
      .complexFilter([
        `[1:a]aformat=sample_fmts=fltp:sample_rates=${sampleRate}:channel_layouts=mono,volume=${leftVolume},atrim=0:${videoDuration},asetpts=PTS-STARTPTS,apad=whole_len=${wholeLen}[left];` +
        `[2:a]aformat=sample_fmts=fltp:sample_rates=${sampleRate}:channel_layouts=mono,volume=${rightVolume},atrim=0:${videoDuration},asetpts=PTS-STARTPTS,apad=whole_len=${wholeLen}[right];` +
        `[left][right]amerge=inputs=2[a]`,
        '[0:v]copy[v]'
      ])
      .outputOptions(['-map', '[v]', '-map', '[a]', '-shortest'])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`Stereo audio overlay failed: ${err.message}`)))
      .save(outputPath);
  });
}

module.exports = { addAudioTrack, addStereoAudioTrack };
