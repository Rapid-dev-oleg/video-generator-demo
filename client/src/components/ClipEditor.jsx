import { useState, useEffect } from 'react';
import { mergeClips, fetchClipDuration } from '../hooks/useApi';
import OverlaysPanel from './OverlaysPanel';
import AudioModal from './AudioModal';

export default function ClipEditor({ segments, setSegments, onPreview, onLoading, onAddSegments, onOperationComplete, audioList = [] }) {
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [overlaysOpen, setOverlaysOpen] = useState(false);

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

  const handleOperationResult = (res, label) => {
    const updated = { filename: res.filename, label, duration: '—' };
    setSegments([updated, ...segments.slice(1)]);
    onPreview?.(res.path);
    onOperationComplete?.();
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
        <button className="btn btn-secondary" onClick={() => setAudioOpen(true)} disabled={processing || segments.length === 0}>
          🎧 Stereo audio
        </button>
        <button className="btn btn-secondary" onClick={() => setOverlaysOpen(true)} disabled={processing || segments.length === 0}>
          🎨 Overlays
        </button>
      </div>

      <AudioModal
        open={audioOpen}
        onClose={() => setAudioOpen(false)}
        videoFile={segments[0]?.filename}
        audioList={audioList}
        onApplied={(res) => handleOperationResult(res, 'Video + stereo audio')}
        disabled={processing}
      />

      <OverlaysPanel
        open={overlaysOpen}
        onClose={() => setOverlaysOpen(false)}
        videoFile={segments[0]?.filename}
        onApplied={(res) => handleOperationResult(res, 'Video + overlays')}
        disabled={processing || segments.length === 0}
      />
    </div>
  );
}
