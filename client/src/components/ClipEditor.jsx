import { useState, useEffect } from 'react';
import { mergeClips, addAudio, addStereoAudio, addLogo, uploadLogo, fetchClipDuration } from '../hooks/useApi';
import OverlaysPanel from './OverlaysPanel';

export default function ClipEditor({ segments, setSegments, onPreview, onLoading, onAddSegments, onOperationComplete, audioList = [], selectedAudio = '', onSelectAudio }) {
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [volume, setVolume] = useState(0.8);
  const [leftAudio, setLeftAudio] = useState('');
  const [rightAudio, setRightAudio] = useState('');
  const [leftVolume, setLeftVolume] = useState(1.0);
  const [rightVolume, setRightVolume] = useState(0.5);
  const [logoPos, setLogoPos] = useState('bottom-right');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const missing = segments
      .map((seg, idx) => ({ seg, idx }))
      .filter(({ seg }) => typeof seg.duration !== 'number');
    if (missing.length === 0) return;

    Promise.all(
      missing.map(({ seg, idx }) =>
        fetchClipDuration(seg.filename)
          .then(data => ({ idx, duration: data.duration }))
          .catch(() => ({ idx, duration: null }))
      )
    ).then(results => {
      if (cancelled) return;
      const updates = results.filter(r => r.duration !== null);
      if (updates.length === 0) return;
      setSegments(prev => {
        const next = [...prev];
        updates.forEach(({ idx, duration }) => {
          next[idx] = { ...next[idx], duration };
        });
        return next;
      });
    });

    return () => { cancelled = true; };
  }, [segments, setSegments]);

  const totalDuration = segments.reduce((sum, seg) => sum + (typeof seg.duration === 'number' ? seg.duration : 0), 0);
  const formatTime = (s) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${m}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleDragStart = (idx) => setDraggedIdx(idx);
  const handleDrop = (targetIdx) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const newSegs = [...segments];
    const [moved] = newSegs.splice(draggedIdx, 1);
    newSegs.splice(targetIdx, 0, moved);
    setSegments(newSegs);
    setDraggedIdx(null);
  };

  const removeSegment = (idx) => {
    setSegments(segs => segs.filter((_, i) => i !== idx));
  };

  const clearTimeline = () => {
    if (!confirm('Clear timeline?')) return;
    setSegments([]);
  };

  const runOperation = async (operation) => {
    if (segments.length === 0) return alert('No video in timeline');
    setProcessing(true);
    onLoading?.(true);
    try {
      await operation();
      onOperationComplete?.();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setProcessing(false);
      onLoading?.(false);
    }
  };

  const handleMerge = () => runOperation(async () => {
    if (segments.length < 2) throw new Error('Need at least 2 segments in timeline');
    if (!confirm(`Merge ${segments.length} timeline segments into one video?`)) return;
    const res = await mergeClips(segments.map(s => s.filename));
    const merged = { filename: res.filename, label: 'Merged video', duration: '—' };
    setSegments([merged]);
    onPreview?.(res.path);
  });

  const handleAddAudio = () => runOperation(async () => {
    if (!selectedAudio) throw new Error('Select audio');
    const target = segments[0];
    const res = await addAudio(target.filename, selectedAudio, volume, false);
    const updated = { filename: res.filename, label: 'Video + audio', duration: '—' };
    setSegments([updated, ...segments.slice(1)]);
    onPreview?.(res.path);
  });

  const handleAddStereoAudio = () => runOperation(async () => {
    if (!leftAudio || !rightAudio) throw new Error('Select both left and right audio');
    if (leftAudio === rightAudio) throw new Error('Left and right audio must be different');
    const target = segments[0];
    const res = await addStereoAudio(target.filename, leftAudio, rightAudio, leftVolume, rightVolume);
    const updated = { filename: res.filename, label: 'Video + stereo audio', duration: '—' };
    setSegments([updated, ...segments.slice(1)]);
    onPreview?.(res.path);
  });

  const handleAddLogo = () => runOperation(async () => {
    const target = segments[0];
    const res = await addLogo(target.filename, logoPos, 20, 0.15);
    const updated = { filename: res.filename, label: 'Video + logo', duration: '—' };
    setSegments([updated, ...segments.slice(1)]);
    onPreview?.(res.path);
  });

  const handleOverlaysApplied = (res) => {
    const updated = { filename: res.filename, label: 'Video + overlays', duration: '—' };
    setSegments([updated, ...segments.slice(1)]);
    onPreview?.(res.path);
    onOperationComplete?.();
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await uploadLogo(file);
      alert('Logo uploaded!');
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="panel" style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>
          🎞️ Timeline {segments.length > 0 && <span style={{ color: '#64748b' }}>({segments.length})</span>}
          {segments.length > 0 && <span style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>⏱ {formatTime(totalDuration)}</span>}
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={onAddSegments} disabled={processing}>
            + Add clips / videos
          </button>
          {segments.length > 0 && (
            <button className="btn btn-secondary" onClick={clearTimeline} disabled={processing}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="timeline-row">
        {segments.map((seg, idx) => (
          <div
            key={`${seg.filename}-${idx}`}
            className="segment"
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            onClick={() => onPreview?.(`/uploads/output/${seg.filename}`)}
            title="Click to preview, drag to reorder"
          >
            <span className="drag-handle">⋮⋮</span>
            <span className="segment-preview">👁</span>
            <span>{seg.label || seg.filename}</span>
            <span className="remove" onClick={(e) => { e.stopPropagation(); removeSegment(idx); }}>×</span>
          </div>
        ))}
        {segments.length === 0 && (
          <div style={{ color: '#64748b', fontSize: 13, padding: '12px 0' }}>
            Timeline is empty. Click <strong>+ Add clips / videos</strong> to add existing clips or videos.
          </div>
        )}
      </div>

      <div className="timeline-actions">
        <button className="btn btn-secondary" onClick={handleMerge} disabled={processing || segments.length < 2}>
          🔗 Merge timeline into video
        </button>

        <div className="timeline-action-group">
          <select className="select" style={{ width: 160 }} value={selectedAudio} onChange={e => onSelectAudio?.(e.target.value)}>
            <option value="">— Select audio —</option>
            {audioList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input type="range" min="0" max="2" step="0.1" value={volume} onChange={e => setVolume(Number(e.target.value))} style={{ width: 80 }} title={`Volume: ${volume}`} />
          <button className="btn btn-secondary" onClick={handleAddAudio} disabled={processing || !selectedAudio || segments.length === 0}>
            🎵 Apply audio
          </button>
          {segments.length > 0 && <span style={{ fontSize: 11, color: '#64748b' }}>to {segments[0].label || segments[0].filename}</span>}
        </div>

        <div className="timeline-action-group">
          <select className="select" style={{ width: 130 }} value={leftAudio} onChange={e => setLeftAudio(e.target.value)}>
            <option value="">— Left channel —</option>
            {audioList.map(a => <option key={`l-${a.id}`} value={a.id}>{a.name}</option>)}
          </select>
          <input type="range" min="0" max="2" step="0.1" value={leftVolume} onChange={e => setLeftVolume(Number(e.target.value))} style={{ width: 60 }} title={`Left: ${leftVolume}`} />
          <select className="select" style={{ width: 130 }} value={rightAudio} onChange={e => setRightAudio(e.target.value)}>
            <option value="">— Right channel —</option>
            {audioList.map(a => <option key={`r-${a.id}`} value={a.id}>{a.name}</option>)}
          </select>
          <input type="range" min="0" max="2" step="0.1" value={rightVolume} onChange={e => setRightVolume(Number(e.target.value))} style={{ width: 60 }} title={`Right: ${rightVolume}`} />
          <button className="btn btn-secondary" onClick={handleAddStereoAudio} disabled={processing || !leftAudio || !rightAudio || segments.length === 0}>
            🎧 Stereo audio
          </button>
          {segments.length > 0 && <span style={{ fontSize: 11, color: '#64748b' }}>to {segments[0].label || segments[0].filename}</span>}
        </div>

        <div className="timeline-action-group">
          <select className="select" style={{ width: 130 }} value={logoPos} onChange={e => setLogoPos(e.target.value)}>
            <option value="bottom-right">↘️ Logo</option>
            <option value="bottom-left">↙️ Logo</option>
            <option value="top-right">↗️ Logo</option>
            <option value="top-left">↖️ Logo</option>
            <option value="center">⬡ Center</option>
          </select>
          <button className="btn btn-secondary" onClick={handleAddLogo} disabled={processing || segments.length === 0}>
            🖼️ Apply logo
          </button>
          {segments.length > 0 && <span style={{ fontSize: 11, color: '#64748b' }}>to {segments[0].label || segments[0].filename}</span>}
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            ⬆️ Upload logo
            <input type="file" accept="image/png" style={{ display: 'none' }} onChange={handleLogoUpload} />
          </label>
        </div>
      </div>

      <OverlaysPanel
        videoFile={segments[0]?.filename}
        onApplied={handleOverlaysApplied}
        disabled={processing || segments.length === 0}
      />
    </div>
  );
}
