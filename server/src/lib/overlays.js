const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const QRCode = require('qrcode');

const IMAGES_DIR = path.join(__dirname, '../../uploads/images');

function toBase64(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${data.toString('base64')}`;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function positionAlign(position) {
  if (position.includes('left')) return 'left';
  if (position.includes('right')) return 'right';
  return 'center';
}

function getPosition(videoWidth, videoHeight, blockWidth, blockHeight, position, padding = 24) {
  switch (position) {
    case 'bottom-center': return { x: Math.round((videoWidth - blockWidth) / 2), y: videoHeight - blockHeight - padding };
    case 'bottom-left': return { x: padding, y: videoHeight - blockHeight - padding };
    case 'bottom-right': return { x: videoWidth - blockWidth - padding, y: videoHeight - blockHeight - padding };
    case 'top-left': return { x: padding, y: padding };
    case 'top-right': return { x: videoWidth - blockWidth - padding, y: padding };
    case 'right-middle': return { x: videoWidth - blockWidth - padding, y: Math.round((videoHeight - blockHeight) / 2) };
    case 'left-middle': return { x: padding, y: Math.round((videoHeight - blockHeight) / 2) };
    case 'center': return { x: Math.round((videoWidth - blockWidth) / 2), y: Math.round((videoHeight - blockHeight) / 2) };
    default: return { x: padding, y: videoHeight - blockHeight - padding };
  }
}

async function getVideoDimensions(videoPath) {
  const ffmpegPath = path.join(__dirname, '..', '..', '..', 'tools', 'ffmpeg');
  const cmd = fs.existsSync(ffmpegPath) ? ffmpegPath : 'ffmpeg';
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    exec(`${cmd} -i "${videoPath}" 2>&1`, (error, stdout) => {
      const match = stdout.match(/Video:[^\n]*?\b(\d{2,})x(\d{2,})\b/);
      if (!match) return reject(new Error('Could not determine video dimensions'));
      resolve({ width: parseInt(match[1]), height: parseInt(match[2]) });
    });
  });
}

async function renderAddressBlock(text, align = 'center') {
  const width = 900;
  const height = 90;
  const fontSize = 32;
  const textPadding = 28;

  const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
  const x = align === 'left' ? textPadding : align === 'right' ? width - textPadding : width / 2;

  const lines = escapeXml(text).split('\n').map(line => `<tspan x="${x}" dy="${fontSize + 8}" text-anchor="${anchor}">${line}</tspan>`).join('');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="12" fill="rgba(10,10,15,0.75)" filter="url(#shadow)"/>
      <text x="${x}" y="${height / 2 - (text.split('\n').length * (fontSize + 8)) / 2 + fontSize / 2}" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="500">${lines}</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function renderQRBlock(url) {
  const size = 200;
  const padding = 16;
  const qrSvg = await QRCode.toString(url, { type: 'svg', margin: 0, width: size - padding * 2, color: { dark: '#0a0a0f', light: '#ffffff' } });
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <rect x="0" y="0" width="${size}" height="${size}" rx="12" fill="rgba(255,255,255,0.95)" filter="url(#shadow)"/>
      <g transform="translate(${padding}, ${padding})">${qrSvg.replace(/<\?xml[^?]*\?>/, '').replace(/xmlns="[^"]*"/, '')}</g>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function renderAgentCardBlock({ avatar, logo, name, phone, email }) {
  const width = 420;
  const height = 170;
  const avatarBase64 = avatar ? toBase64(path.join(IMAGES_DIR, avatar)) : null;
  const logoBase64 = logo ? toBase64(path.join(IMAGES_DIR, logo)) : null;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000" flood-opacity="0.45"/>
        </filter>
        <clipPath id="avatarClip"><circle cx="54" cy="85" r="40"/></clipPath>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="14" fill="rgba(10,10,15,0.82)" filter="url(#shadow)"/>
      ${avatarBase64 ? `<image x="14" y="45" width="80" height="80" xlink:href="${avatarBase64}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>` : `<circle cx="54" cy="85" r="40" fill="#334155"/>`}
      ${logoBase64 ? `<image x="${width - 130}" y="14" width="110" height="44" xlink:href="${logoBase64}" preserveAspectRatio="xMidYMid meet"/>` : ''}
      <text x="110" y="62" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700">${escapeXml(name || '')}</text>
      <text x="110" y="96" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="16">${escapeXml(phone || '')}</text>
      <text x="110" y="124" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="14">${escapeXml(email || '')}</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function renderBlock(overlay) {
  switch (overlay.type) {
    case 'address': return renderAddressBlock(overlay.text, positionAlign(overlay.position));
    case 'qr': return renderQRBlock(overlay.url);
    case 'agent-card': return renderAgentCardBlock(overlay);
    default: throw new Error(`Unknown overlay type: ${overlay.type}`);
  }
}

function getBlockSize(overlay) {
  switch (overlay.type) {
    case 'address': return { width: 900, height: 90 };
    case 'qr': return { width: 200, height: 200 };
    case 'agent-card': return { width: 420, height: 170 };
    default: return { width: 200, height: 100 };
  }
}

async function applyOverlays(videoPath, overlays, outputPath) {
  if (!overlays || overlays.length === 0) throw new Error('No overlays');

  const { width: videoWidth, height: videoHeight } = await getVideoDimensions(videoPath);

  const rendered = await Promise.all(
    overlays.map(async (overlay) => {
      const buffer = await renderBlock(overlay);
      const size = getBlockSize(overlay);
      const position = getPosition(videoWidth, videoHeight, size.width, size.height, overlay.position);
      return { input: buffer, left: position.x, top: position.y };
    })
  );

  const compositePng = await sharp({
    create: {
      width: videoWidth,
      height: videoHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(rendered)
    .png()
    .toBuffer();

  const tempDir = path.join(path.dirname(outputPath), '.tmp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const compositePath = path.join(tempDir, `overlay_composite_${Date.now()}.png`);
  fs.writeFileSync(compositePath, compositePng);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(compositePath)
      .complexFilter([
        '[0:v][1:v]overlay=0:0[v]'
      ])
      .outputOptions(['-map', '[v]', '-map', '0:a?', '-c:a', 'copy'])
      .on('end', () => {
        fs.unlinkSync(compositePath);
        resolve(outputPath);
      })
      .on('error', (err) => {
        try { fs.unlinkSync(compositePath); } catch {}
        reject(new Error(`Overlay failed: ${err.message}`));
      })
      .save(outputPath);
  });
}

module.exports = {
  applyOverlays,
  getVideoDimensions,
};
