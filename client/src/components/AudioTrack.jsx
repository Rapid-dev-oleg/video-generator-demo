import { useState, useEffect } from 'react';
import { fetchAudio, uploadAudio, generateTTS, fetchVoices } from '../hooks/useApi';

export default function AudioTrack({ selectedAudio, onSelectAudio }) {
  const [audioList, setAudioList] = useState([]);
  const [voices, setVoices] = useState([]);
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('eve');
  const [uploading, setUploading] = useState(false);

  const load = () => {
    fetchAudio().then(setAudioList).catch(console.error);
  };

  useEffect(() => {
    load();
    fetchVoices().then(setVoices).catch(console.error);
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try { await uploadAudio(file); load(); } catch (err) { alert(err.response?.data?.error); }
    setUploading(false);
  };

  const handleTTS = async () => {
    if (!ttsText.trim()) return;
    try {
      await generateTTS(ttsText, ttsVoice);
      setTtsText('');
      load();
    } catch (err) { alert(err.response?.data?.error || err.message); }
  };

  return (
    <div className="panel">
      <h3>🎵 Audio Library</h3>

      <div style={{ marginBottom: 12 }}>
        <label className="label">Generate Voice (TTS)</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <select className="select" style={{ width: 100 }} value={ttsVoice} onChange={e => setTtsVoice(e.target.value)}>
            {voices.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <input className="input" placeholder="Text to speak..." value={ttsText} onChange={e => setTtsText(e.target.value)} />
          <button className="btn" style={{ padding: '8px 12px' }} onClick={handleTTS}>TTS</button>
        </div>
      </div>

      <label className="btn btn-secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 12, cursor: 'pointer' }}>
        {uploading ? 'Uploading...' : '⬆️ Upload Audio'}
        <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleUpload} />
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {audioList.map(a => (
          <div
            key={a.id}
            onClick={() => onSelectAudio(a.id)}
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              background: selectedAudio === a.id ? '#3f1e3a' : '#1e293b',
              border: `1px solid ${selectedAudio === a.id ? '#a855f7' : '#334155'}`,
              cursor: 'pointer',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>🎵</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
            <audio src={a.url} style={{ width: 80, height: 20, marginLeft: 'auto' }} controls />
          </div>
        ))}
        {audioList.length === 0 && <span style={{ color: '#64748b', fontSize: 12 }}>No audio files</span>}
      </div>
    </div>
  );
}
