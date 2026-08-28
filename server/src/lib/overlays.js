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
      const match = stdout.match(/Stream #0[^\n]*Video:[^\n]*(\d{2,})x(\d{2,})/);
      if (!match) return reject(new Error('Could not determine video dimensions'));
      resolve({ width: parseInt(match[1]), height: parseInt(match[2]) });
    });
  });
}

async function renderAddressBlock(text) {
  const width = 900;
  const height = 90;
  const fontSize = 32;
  const lines = escapeXml(text).split('\n').map(line => `<tspan x="${width / 2}" dy="${fontSize + 8}" text-anchor="middle">${line}</tspan>`).join('');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="12" fill="rgba(10,10,15,0.75)" filter="url(#shadow)"/>
      <text x="${width / 2}" y="${height / 2 - (text.split('\n').length * (fontSize + 8)) / 2 + fontSize / 2}" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="500">${lines}</text>
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
    case 'address': return renderAddressBlock(overlay.text);
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
      return { buffer, x: position.x, y: position.y };
    })
  );

  const tempDir = path.join(path.dirname(outputPath), '.tmp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const pngPaths = rendered.map((r, i) => {
    const p = path.join(tempDir, `overlay_${Date.now()}_${i}.png`);
    fs.writeFileSync(p, r.buffer);
    return p;
  });

  return new Promise((resolve, reject) => {
    let filterComplex = '';
    rendered.forEach((r, i) => {
      const in1 = i === 0 ? '0:v' : `v${i}`;
      const out = `v${i + 1}`;
      filterComplex += `${filterComplex ? ';' : ''}[${in1}][${i + 1}:v]overlay=${r.x}:${r.y}[${out}]`;
    });

    const cmd = ffmpeg(videoPath);
    pngPaths.forEach(p => cmd.input(p));

    cmd
      .complexFilter(filterComplex)
      .outputOptions(['-map', `[v${rendered.length}]`, '-map', '0:a?', '-c:a', 'copy'])
      .on('end', () => {
        pngPaths.forEach(p => fs.unlinkSync(p));
        resolve(outputPath);
      })
      .on('error', (err) => {
        pngPaths.forEach(p => { try { fs.unlinkSync(p); } catch {} });
        reject(new Error(`Overlay failed: ${err.message}`));
      })
      .save(outputPath);
  });
}

module.exports = {
  applyOverlays,
  getVideoDimensions,
};
