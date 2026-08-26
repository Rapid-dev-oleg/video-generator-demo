import { useEffect, useState } from 'react';
import { checkStatus, downloadVideo } from '../hooks/useApi';

export default function StatusModal({ status, onClose, onComplete }) {
  const [data, setData] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!status.open || !status.requestId) return;
    setElapsed(0);
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    const poll = setInterval(async () => {
      try {
        const res = await checkStatus(status.requestId);
        setData(res);
        if (res.status === 'done') {
          clearInterval(poll);
          clearInterval(timer);
          const dl = await downloadVideo(status.requestId);
          onComplete?.(dl);
        }
        if (res.status === 'expired' || res.status === 'failed') {
          clearInterval(poll);
          clearInterval(timer);
        }
      } catch (err) {
        console.error(err);
      }
    }, 5000);
    return () => { clearInterval(poll); clearInterval(timer); };
  }, [status.open, status.requestId]);

  if (!status.open) return null;

  const isDone = data?.status === 'done';
  const isError = data?.status === 'expired' || data?.status === 'failed';

  return (
    <div className="modal-overlay" onClick={isDone || isError ? onClose : undefined}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {!isDone && !isError && <div className="spinner" />}
        <h3 style={{ marginBottom: 12, color: isError ? '#ef4444' : '#e2e8f0' }}>
          {isDone ? '✅ Complete!' : isError ? '❌ Failed' : status.message || 'Generating...'}
        </h3>
        {status.requestId && (
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Request: {status.requestId}</p>
        )}
        <p style={{ fontSize: 12, color: '#64748b' }}>Elapsed: {elapsed}s</p>
        {data && (
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Status: {data.status}</p>
        )}
        {(isDone || isError) && (
          <button className="btn" onClick={onClose} style={{ marginTop: 16 }}>Close</button>
        )}
      </div>
    </div>
  );
}
