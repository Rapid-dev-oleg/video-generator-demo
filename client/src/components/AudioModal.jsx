import { useState } from 'react';
import { addStereoAudio } from '../hooks/useApi';

export default function AudioModal({ open, onClose, videoFile, audioList = [], onApplied, disabled }) {
  const [leftAudio, setLeftAudio] = useState('');
  const [rightAudio, setRightAudio] = useState('');
  const [leftVolume, setLeftVolume] = useState(1.0);
  const [rightVolume, setRightVolume] = useState(0.5);
  const [processing, setProcessing] = useState(false);

  if (!open) return null;

  const handleApply = async () => {
    if (!videoFile) return alert('No video selected. Add a clip to timeline first.');
    if (!leftAudio || !rightAudio) return alert('Select both left and right audio');
    if (leftAudio === rightAudio) return alert('Left and right audio must be different');
    setProcessing(true);
    try {
      const res = await addStereoAudio(videoFile, leftAudio, rightAudio, leftVolume, rightVolume);
      onApplied?.(res);
      onClose?.();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="library-modal" onClick={e => e.stopPropagation()}>
        <div className="library-header">
          <div>
            <h3>🎧 Audio</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Left and right stereo channels</p>
          </div>
          <button className="library-close" onClick={onClose}>×</button>
        </div>

        <div className="library-body">
          <div className="gen-section" style={{ marginBottom: 12 }}>
            <div className="gen-section-title">Left channel</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="select" style={{ flex: 1, minWidth: 140 }} value={leftAudio} onChange={e => setLeftAudio(e.target.value)}>
                <option value="">— Select audio —</option>
                {audioList.map(a => <option key={`l-${a.id}`} value={a.id}>{a.name}</option>)}
              </select>
              <input type="range" min="0" max="2" step="0.1" value={leftVolume} onChange={e => setLeftVolume(Number(e.target.value))} style={{ width: 80 }} title={`Volume: ${leftVolume}`} />
              <span style={{ fontSize: 12, color: '#94a3b8', width: 36 }}>{leftVolume.toFixed(1)}</span>
            </div>
          </div>

          <div className="gen-section" style={{ marginBottom: 12 }}>
            <div className="gen-section-title">Right channel</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="select" style={{ flex: 1, minWidth: 140 }} value={rightAudio} onChange={e => setRightAudio(e.target.value)}>
                <option value="">— Select audio —</option>
                {audioList.map(a => <option key={`r-${a.id}`} value={a.id}>{a.name}</option>)}
              </select>
              <input type="range" min="0" max="2" step="0.1" value={rightVolume} onChange={e => setRightVolume(Number(e.target.value))} style={{ width: 80 }} title={`Volume: ${rightVolume}`} />
              <span style={{ fontSize: 12, color: '#94a3b8', width: 36 }}>{rightVolume.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="library-footer">
          <span style={{ fontSize: 12, color: '#64748b' }}>{videoFile || 'No video selected'}</span>
          <div className="library-actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn" onClick={handleApply} disabled={processing || disabled}>
              {processing ? 'Applying...' : 'Apply audio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
