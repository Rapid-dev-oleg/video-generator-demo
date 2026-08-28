import { useState } from 'react';
import { generateVideo } from '../hooks/useApi';

const CAMERA_MOVES = [
  { id: 'slow_zoom_in', label: '🔍 Slow Zoom In' },
  { id: 'slow_zoom_out', label: '🔭 Slow Zoom Out' },
  { id: 'pan_right', label: '➡️ Pan Right' },
  { id: 'orbit_left', label: '🔄 Orbit Left' },
  { id: 'parallax_push', label: '🌌 Parallax Push' },
];

export default function GenerationPanel({ selectedImage, onPickImage, onGenerated, onStatus }) {
  const [duration, setDuration] = useState(5);
  const [cameraMove, setCameraMove] = useState('slow_zoom_in');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('1080p');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!selectedImage) return alert('Select an image first');
    setLoading(true);
    onStatus({ open: true, requestId: null, message: 'Creating task...' });
    try {
      const res = await generateVideo({
        imageId: selectedImage,
        duration,
        aspectRatio,
        resolution,
        cameraMove,
      });
      onStatus({ open: true, requestId: res.requestId, message: 'Task created. Waiting for generation...' });
      onGenerated?.(res);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
      onStatus({ open: false });
    } finally {
      setLoading(false);
    }
  };

  const selectedImgUrl = selectedImage ? `/uploads/images/${selectedImage}` : null;

  return (
    <div className="panel" style={{ gap: 16 }}>
      <h3>🎬 Generate New Clip</h3>

      <div className="gen-section">
        <div className="gen-section-title">1. Source Image</div>
        {selectedImgUrl ? (
          <div className="gen-image-preview">
            <img src={selectedImgUrl} alt="selected" />
            <button className="btn btn-secondary gen-change-image" onClick={onPickImage}>
              Change image
            </button>
          </div>
        ) : (
          <button className="btn gen-pick-image" onClick={onPickImage}>
            + Select an image from library
          </button>
        )}
      </div>

      <div className="gen-section">
        <div className="gen-section-title">2. Clip Settings</div>
        <div className="grid-2">
          <div>
            <label className="label">Duration (sec)</label>
            <input className="input" type="number" min={1} max={15} value={duration} onChange={e => setDuration(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Resolution</label>
            <select className="select" value={resolution} onChange={e => setResolution(e.target.value)}>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 10 }}>
          <div>
            <label className="label">Aspect Ratio</label>
            <select className="select" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}>
              <option value="16:9">16:9 Landscape</option>
              <option value="9:16">9:16 Portrait</option>
              <option value="1:1">1:1 Square</option>
            </select>
          </div>
          <div>
            <label className="label">Camera Movement</label>
            <select className="select" value={cameraMove} onChange={e => setCameraMove(e.target.value)}>
              {CAMERA_MOVES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <button className="btn" onClick={handleGenerate} disabled={loading || !selectedImage} style={{ marginTop: 'auto' }}>
        {loading ? 'Creating Task...' : '🚀 GENERATE CLIP'}
      </button>
    </div>
  );
}
