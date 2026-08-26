const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { ensureDir } = require('./utils');

/**
 * Склеивает несколько видео в одно через ffmpeg concat demuxer
 * @param {string[]} videoPaths — массив путей к видео (в порядке склейки)
 * @param {string} outputPath — итоговый файл
 * @param {Object} options
 */
async function mergeVideos(videoPaths, outputPath, options = {}) {
  if (!videoPaths || videoPaths.length === 0) {
    throw new Error('videoPaths array is empty');
  }

  const tempDir = path.join(path.dirname(outputPath), '.tmp');
  ensureDir(tempDir);

  const listFile = path.join(tempDir, `concat_${Date.now()}.txt`);
  const listContent = videoPaths.map(p => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(listFile, listContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(new Error(`Merge failed: ${err.message}`));
      })
      .save(outputPath);
  });
}

module.exports = { mergeVideos };
