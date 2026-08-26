const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

async function downloadFile(url, outputPath) {
  const response = await axios({
    method: 'GET',
    url,
    responseType: 'stream',
    timeout: 120000,
  });

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

function getVideoDuration(videoPath) {
  const ffmpegPath = path.join(__dirname, '..', '..', '..', 'tools', 'ffmpeg');
  const cmd = fs.existsSync(ffmpegPath) ? ffmpegPath : 'ffmpeg';
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    exec(`${cmd} -i "${videoPath}" 2>&1`, (error, stdout) => {
      const match = stdout.match(/Duration:\s+(\d+):(\d+):(\d+\.\d+)/);
      if (!match) {
        return reject(new Error(`Could not determine video duration: ${stdout.slice(0, 200)}`));
      }
      const [, hours, minutes, seconds] = match;
      resolve(parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds));
    });
  });
}

module.exports = {
  execPromise,
  ensureDir,
  downloadFile,
  getVideoDuration,
};
