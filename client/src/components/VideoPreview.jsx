import { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';

export default function VideoPreview({ src, segments }) {
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    if (src) setCurrentSrc(src);
  }, [src]);

  const latestSegment = segments.length > 0 ? segments[segments.length - 1] : null;
  const previewUrl = currentSrc || (latestSegment ? `/uploads/output/${latestSegment.filename}` : null);

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = 'video.mp4';
    a.click();
  };

  return (
    <div className="panel">
      <h3>👁️ Preview</h3>

      <div style={{ aspectRatio: '16/9', background: '#000', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
        {previewUrl ? (
          <ReactPlayer url={previewUrl} width="100%" height="100%" controls playing={false} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 13 }}>
            No video to preview
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="btn btn-secondary" onClick={handleDownload} disabled={!previewUrl}>
          ⬇️ Download MP4
        </button>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          {latestSegment ? `File: ${latestSegment.filename}` : 'No file'}
        </div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          Segments: {segments.length}
        </div>
      </div>
    </div>
  );
}
