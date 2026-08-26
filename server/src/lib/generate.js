const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { downloadFile } = require('./utils');

const API_BASE = 'https://api.x.ai/v1';

/**
 * Создаёт задачу на генерацию видео через xAI reference-to-video
 * @param {Object} options
 * @param {string} options.apiKey — XAI API ключ
 * @param {string} options.prompt — текст промпта. Используй <IMAGE_1> для ссылки на первое изображение
 * @param {string[]} options.imagePaths — массив путей к изображениям (локальные файлы). Будут конвертированы в base64.
 * @param {number} options.duration — длительность в секундах (макс 15 для 1.5)
 * @param {string} options.aspectRatio — "16:9", "9:16", "1:1"
 * @param {string} options.resolution — "720p" (максимум для reference-to-video)
 * @param {string} options.model — "grok-imagine-video-1.5" (по умолчанию)
 * @param {Array} options.referenceAudios — [{ voice_id: "eve" }] — опционально
 */
async function createGenerationTask(options) {
  const {
    apiKey,
    prompt,
    imagePaths = [],
    duration = 5,
    aspectRatio = '16:9',
    resolution = '720p',
    model = 'grok-imagine-video-1.5',
    referenceAudios = [],
  } = options;

  if (!apiKey) throw new Error('apiKey is required');
  if (apiKey === 'your_xai_api_key_here') {
    throw new Error('apiKey is still the placeholder value "your_xai_api_key_here". Set a real XAI_API_KEY in server/.env');
  }
  if (!prompt) throw new Error('prompt is required');
  if (imagePaths.length === 0) throw new Error('At least one imagePath is required');
  if (imagePaths.length > 7) throw new Error('Maximum 7 reference images allowed');

  // Конвертируем локальные файлы в base64 data URI
  const referenceImages = imagePaths.map(p => {
    const data = fs.readFileSync(p);
    const ext = path.extname(p).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : 
                 ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    const base64 = data.toString('base64');
    return { url: `data:${mime};base64,${base64}` };
  });

  const payload = {
    model,
    prompt,
    reference_images: referenceImages,
    duration,
    aspect_ratio: aspectRatio,
    resolution,
  };

  if (referenceAudios.length > 0) {
    payload.reference_audios = referenceAudios;
  }

  console.log('[xAI] Payload:', JSON.stringify(payload, null, 2));
  console.log('[xAI] Authorization header (masked):', `Bearer ${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`);

  try {
    const response = await axios.post(`${API_BASE}/videos/generations`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 60000,
    });

    console.log('[xAI] Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (err) {
    console.error('[xAI] Request failed:', err.message);
    if (err.response) {
      console.error('[xAI] Status:', err.response.status);
      console.error('[xAI] Headers:', JSON.stringify(err.response.headers, null, 2));
      const raw = err.response.data;
      let body;
      if (Buffer.isBuffer(raw)) {
        body = raw.toString('utf8');
      } else if (typeof raw === 'string') {
        body = raw;
      } else {
        body = JSON.stringify(raw, null, 2);
      }
      console.error('[xAI] Response body:', body);
      err.responseBody = body;
    } else if (err.request) {
      console.error('[xAI] No response received from xAI');
    }
    throw err;
  }
}

/**
 * Проверяет статус генерации
 * @param {string} requestId 
 * @param {string} apiKey 
 */
async function getGenerationStatus(requestId, apiKey) {
  const response = await axios.get(`${API_BASE}/videos/${requestId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    timeout: 30000,
  });
  return response.data;
}

/**
 * Ждёт завершения генерации с polling
 * @param {string} requestId 
 * @param {string} apiKey 
 * @param {Object} options
 * @param {number} options.interval — интервал в мс (по умолчанию 5000)
 * @param {number} options.maxAttempts — максимум попыток (по умолчанию 120)
 */
async function pollUntilDone(requestId, apiKey, options = {}) {
  const { interval = 5000, maxAttempts = 120 } = options;

  for (let i = 0; i < maxAttempts; i++) {
    const data = await getGenerationStatus(requestId, apiKey);

    if (data.status === 'done') {
      return data;
    }
    if (data.status === 'expired') {
      throw new Error('Video generation request expired');
    }
    if (data.status === 'failed') {
      throw new Error(`Video generation failed: ${data.error || 'Unknown error'}`);
    }

    await new Promise(r => setTimeout(r, interval));
  }

  throw new Error(`Polling timeout after ${maxAttempts} attempts`);
}

/**
 * Полный пайплайн: создаёт задачу, ждёт, скачивает видео
 * @param {Object} options 
 * @param {string} options.outputPath — куда сохранить MP4
 */
async function generateVideo(options) {
  const { outputPath, apiKey } = options;

  const task = await createGenerationTask(options);
  const requestId = task.request_id;

  if (!requestId) {
    throw new Error('No request_id in response: ' + JSON.stringify(task));
  }

  const result = await pollUntilDone(requestId, apiKey, {
    interval: options.pollingInterval || 5000,
    maxAttempts: options.maxPollingAttempts || 120,
  });

  if (!result.video || !result.video.url) {
    throw new Error('No video URL in completed task');
  }

  await downloadFile(result.video.url, outputPath);

  return {
    requestId,
    videoPath: outputPath,
    url: result.video.url,
    status: result.status,
  };
}

module.exports = {
  createGenerationTask,
  getGenerationStatus,
  pollUntilDone,
  generateVideo,
};
