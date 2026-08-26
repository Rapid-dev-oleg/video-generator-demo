const ffmpeg = require('fluent-ffmpeg');

function getOverlayExpr(position, margin) {
  switch (position) {
    case 'bottom-right':
      return `W-w-${margin}:H-h-${margin}`;
    case 'bottom-left':
      return `${margin}:H-h-${margin}`;
    case 'top-right':
      return `W-w-${margin}:${margin}`;
    case 'top-left':
      return `${margin}:${margin}`;
    case 'center':
      return `(W-w)/2:(H-h)/2`;
    default:
      return `W-w-${margin}:H-h-${margin}`;
  }
}

/**
 * Накладывает PNG логотип на видео
 * @param {string} videoPath 
 * @param {string} logoPath — путь к PNG (с альфа-каналом)
 * @param {string} outputPath 
 * @param {Object} options
 * @param {string} options.position — 'bottom-right' (default), 'bottom-left', 'top-right', 'top-left', 'center'
 * @param {number} options.margin — отступ в пикселях (default: 20)
 * @param {number} options.scale — масштаб логотипа относительно ширины видео, например 0.1 = 10% (default: null)
 */
async function addLogo(videoPath, logoPath, outputPath, options = {}) {
  const { position = 'bottom-right', margin = 20, scale = null } = options;

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(videoPath).input(logoPath);

    let filterStr;
    if (scale) {
      filterStr = `[1:v]scale=iw*${scale}:-1[logo];[0:v][logo]overlay=${getOverlayExpr(position, margin)}`;
    } else {
      filterStr = `[0:v][1:v]overlay=${getOverlayExpr(position, margin)}`;
    }

    cmd
      .complexFilter([filterStr])
      .outputOptions(['-c:a', 'copy'])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`Logo overlay failed: ${err.message}`)))
      .save(outputPath);
  });
}

module.exports = { addLogo };
