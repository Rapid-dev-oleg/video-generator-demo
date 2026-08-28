import { useState, useEffect } from 'react';
import { applyOverlays, uploadImage } from '../hooks/useApi';

const STORAGE_KEY = 'video-generator-overlays';

const POSITIONS = [
  { id: 'bottom-center', label: '⬇️ Bottom center' },
  { id: 'bottom-left', label: '↙️ Bottom left' },
  { id: 'bottom-right', label: '↘️ Bottom right' },
  { id: 'top-left', label: '↖️ Top left' },
  { id: 'top-right', label: '↗️ Top right' },
  { id: 'right-middle', label: '➡️ Right middle' },
  { id: 'left-middle', label: '⬅️ Left middle' },
  { id: 'center', label: '⏺ Center' },
];

const DEFAULT_OVERLAY = {
  type: 'address',
  position: 'bottom-center',
  text: '',
  url: '',
  name: '',
  phone: '',
  email: '',
  avatar: '',
  logo: '',
};

function loadStoredOverlays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore corrupted storage
  }
  return [];
}

export default function OverlaysPanel({ open, onClose, videoFile, onApplied, disabled }) {
  const [overlays, setOverlays] = useState(loadStoredOverlays);
  const [processing, setProcessing] = useState(false);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overlays));
    } catch {
      // storage may be full / private mode
    }
  }, [overlays]);

  if (!open) return null;

  const startAdd = (type) => {
    const position = type === 'qr' ? 'right-middle' : type === 'agent-card' ? 'top-right' : 'bottom-center';
    setDraft({ ...DEFAULT_OVERLAY, type, position });
  };

  const startEdit = (overlay) => {
    setDraft({ ...overlay });
  };

  const saveDraft = () => {
    if (!draft) return;
    if (draft.type === 'address' && !draft.text.trim()) return alert('Enter address text');
    if (draft.type === 'qr' && !draft.url.trim()) return alert('Enter QR URL');
    if (draft.type === 'agent-card' && !draft.name.trim()) return alert('Enter agent name');
    if (draft.id) {
      setOverlays(overlays.map(o => o.id === draft.id ? { ...draft } : o));
    } else {
      setOverlays([...overlays, { ...draft, id: Date.now() }]);
    }
    setDraft(null);
  };

  const removeOverlay = (id) => setOverlays(overlays.filter(o => o.id !== id));

  const handleApply = async () => {
    if (!videoFile) return alert('No video selected. Add a clip to timeline first.');
    if (overlays.length === 0) return alert('Add at least one overlay');
    setProcessing(true);
    try {
      const payload = overlays.map(o => {
        const base = { type: o.type, position: o.position };
        if (o.type === 'address') return { ...base, text: o.text };
        if (o.type === 'qr') return { ...base, url: o.url };
        return { ...base, name: o.name, phone: o.phone, email: o.email, avatar: o.avatar, logo: o.logo };
      });
      const res = await applyOverlays(videoFile, payload);
      onApplied?.(res);
      onClose?.();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpload = async (field, file) => {
    if (!file) return;
    try {
      const data = await uploadImage(file);
      setDraft(prev => ({ ...prev, [field]: data.id }));
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const summary = (o) => {
    if (o.type === 'address') return `Address: ${o.text.slice(0, 30)}${o.text.length > 30 ? '…' : ''}`;
    if (o.type === 'qr') return `QR: ${o.url.slice(0, 30)}${o.url.length > 30 ? '…' : ''}`;
    return `Card: ${o.name}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="library-modal" onClick={e => e.stopPropagation()}>
        <div className="library-header">
          <div>
            <h3>🎨 Overlays</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Each block has its own position</p>
          </div>
          <button className="library-close" onClick={onClose}>×</button>
        </div>

        <div className="library-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => startAdd('address')} disabled={!!draft}>+ Address</button>
            <button className="btn btn-secondary" onClick={() => startAdd('qr')} disabled={!!draft}>+ QR code</button>
            <button className="btn btn-secondary" onClick={() => startAdd('agent-card')} disabled={!!draft}>+ Agent card</button>
          </div>

          {draft && (
            <div className="gen-section" style={{ marginBottom: 12 }}>
              <div className="gen-section-title">{draft.id ? 'Edit' : 'New'} {draft.type}</div>

              <div style={{ marginBottom: 8 }}>
                <label className="label">Position</label>
                <select className="select" value={draft.position} onChange={e => setDraft({ ...draft, position: e.target.value })}>
                  {POSITIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>

              {draft.type === 'address' && (
                <div>
                  <label className="label">Address text</label>
                  <textarea className="textarea" rows={2} value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} placeholder="123 Main St, City" />
                </div>
              )}

              {draft.type === 'qr' && (
                <div>
                  <label className="label">QR URL</label>
                  <input className="input" value={draft.url} onChange={e => setDraft({ ...draft, url: e.target.value })} placeholder="https://..." />
                </div>
              )}

              {draft.type === 'agent-card' && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <label className="label">Agent name</label>
                    <input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label className="label">Phone</label>
                    <input className="input" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label className="label">Email / contacts</label>
                    <input className="input" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label className="label">Avatar</label>
                    {draft.avatar ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src={`/uploads/images/${draft.avatar}`} alt="avatar" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 20 }} />
                        <button className="btn btn-secondary" onClick={() => setDraft({ ...draft, avatar: '' })}>Remove</button>
                      </div>
                    ) : (
                      <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                        Upload avatar
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload('avatar', e.target.files[0])} />
                      </label>
                    )}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label className="label">Company logo</label>
                    {draft.logo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src={`/uploads/images/${draft.logo}`} alt="logo" style={{ height: 30, objectFit: 'contain' }} />
                        <button className="btn btn-secondary" onClick={() => setDraft({ ...draft, logo: '' })}>Remove</button>
                      </div>
                    ) : (
                      <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                        Upload logo
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload('logo', e.target.files[0])} />
                      </label>
                    )}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn" onClick={saveDraft}>Save overlay</button>
                <button className="btn btn-secondary" onClick={() => setDraft(null)}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {overlays.map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '8px 10px', borderRadius: 6, fontSize: 13 }}>
                <span>{summary(o)} <span style={{ color: '#64748b' }}>({POSITIONS.find(p => p.id === o.position)?.label})</span></span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => startEdit(o)} disabled={!!draft}>Edit</button>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => removeOverlay(o.id)}>Remove</button>
                </div>
              </div>
            ))}
            {overlays.length === 0 && <span style={{ color: '#64748b', fontSize: 12 }}>No overlays yet</span>}
          </div>
        </div>

        <div className="library-footer">
          <span style={{ fontSize: 12, color: '#64748b' }}>{videoFile || 'No video selected'}</span>
          <div className="library-actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn" onClick={handleApply} disabled={processing || disabled || overlays.length === 0}>
              {processing ? 'Applying...' : 'Apply overlays'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
