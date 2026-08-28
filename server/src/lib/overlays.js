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
  const padding = 30;
  const fontSize = 14;
  const lineHeight = fontSize + 6;
  const rawLines = String(text || '').split('\n');
  const lines = rawLines.map(escapeXml);
  const width = measureAddressWidth(rawLines, padding);
  const height = Math.max(60, lines.length * lineHeight + padding * 2);

  const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
  const x = align === 'left' ? padding : align === 'right' ? width - padding : width / 2;
  const startDy = -(lines.length - 1) * lineHeight / 2;

  const tspans = lines.map((line, i) =>
    `<tspan x="${x}" dy="${i === 0 ? startDy : lineHeight}" text-anchor="${anchor}">${line}</tspan>`
  ).join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="12" fill="rgba(10,10,15,0.75)" filter="url(#shadow)"/>
      <text x="${x}" y="${height / 2}" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="500" dominant-baseline="middle">${tspans}</text>
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
  const width = 560;
  const height = 220;
  const padding = 24;
  const imageSize = 110;
  const avatarBase64 = avatar ? toBase64(path.join(IMAGES_DIR, avatar)) : null;
  const logoBase64 = logo ? toBase64(path.join(IMAGES_DIR, logo)) : null;

  const centerY = height / 2;
  const avatarX = padding;
  const avatarY = centerY - imageSize / 2;
  const logoX = width - padding - imageSize;
  const logoY = centerY - imageSize / 2;
  const textX = padding + imageSize + 20;
  const textRight = logoX - 16;
  const textWidth = Math.max(180, textRight - textX);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000" flood-opacity="0.45"/>
        </filter>
        <clipPath id="avatarClip"><circle cx="${avatarX + imageSize / 2}" cy="${centerY}" r="${imageSize / 2}"/></clipPath>
        <clipPath id="logoClip"><rect x="${logoX}" y="${logoY}" width="${imageSize}" height="${imageSize}" rx="14"/></clipPath>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="rgba(10,10,15,0.85)" filter="url(#shadow)"/>
      ${avatarBase64 ? `<image x="${avatarX}" y="${avatarY}" width="${imageSize}" height="${imageSize}" xlink:href="${avatarBase64}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>` : `<circle cx="${avatarX + imageSize / 2}" cy="${centerY}" r="${imageSize / 2}" fill="#334155"/>`}
      ${logoBase64 ? `<image x="${logoX}" y="${logoY}" width="${imageSize}" height="${imageSize}" xlink:href="${logoBase64}" clip-path="url(#logoClip)" preserveAspectRatio="xMidYMid meet"/>` : ''}
      <text x="${textX}" y="${centerY - 34}" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="700">${escapeXml(name || '')}</text>
      <text x="${textX}" y="${centerY + 6}" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="500">${escapeXml(phone || '')}</text>
      <text x="${textX}" y="${centerY + 44}" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="17">${escapeXml(email || '')}</text>
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

function measureAddressWidth(lines, padding) {
  const charWidth = 8.5; // approximate for 14px system-ui
  const longest = Math.max(0, ...lines.map(l => l.length));
  return Math.min(900, Math.max(200, Math.ceil(longest * charWidth + padding * 2)));
}

function getAddressSize(text) {
  const padding = 30;
  const fontSize = 14;
  const lineHeight = fontSize + 6;
  const rawLines = String(text || '').split('\n');
  const width = measureAddressWidth(rawLines, padding);
  const height = Math.max(60, rawLines.length * lineHeight + padding * 2);
  return { width, height };
}

function getBlockSize(overlay) {
  switch (overlay.type) {
    case 'address': return getAddressSize(overlay.text);
    case 'qr': return { width: 200, height: 200 };
    case 'agent-card': return { width: 560, height: 220 };
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
