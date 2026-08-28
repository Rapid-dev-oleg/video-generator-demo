import { useState, useEffect, useCallback } from 'react';
import { fetchImages, uploadImage, deleteImage, deleteClip } from '../hooks/useApi';

const TABS = [
  { id: 'images', label: '🖼 Images' },
  { id: 'clips', label: '🎬 Clips' },
  { id: 'videos', label: '🎞 Videos' },
];

export default function Library({ open, initialTab = 'images', mode = 'single', onClose, onSelect, onPreview, onDelete, clips = [], videos = [] }) {
  const [tab, setTab] = useState(initialTab);
  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const loadImages = useCallback(() => {
    fetchImages().then(setImages).catch(console.error);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setSelected([]);
    if (initialTab === 'images') loadImages();
  }, [open, initialTab, loadImages]);

  useEffect(() => {
    if (!open) return;
    if (tab === 'images') loadImages();
  }, [open, tab, loadImages]);

  const isSelected = (item) => selected.some(s => s.type === item.type && s.key === item.key);

  const toggleSelect = (item) => {
    if (mode === 'single') {
      setSelected([item]);
      return;
    }
    setSelected(prev => {
      if (isSelected(item)) return prev.filter(s => !(s.type === item.type && s.key === item.key));
      return [...prev, item];
    });
  };

  const handleAdd = () => {
    onSelect?.(selected);
    onClose?.();
  };

  const handleUpload = async (files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    setUploading(true);
    for (const file of imageFiles) {
      try { await uploadImage(file); } catch (err) { alert(err.response?.data?.error || err.message); }
    }
    setUploading(false);
    loadImages();
  };

  const handleFileInput = (e) => handleUpload(e.target.files);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDeleteImage = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete image?')) return;
    await deleteImage(id);
    loadImages();
    setSelected(prev => prev.filter(s => s.id !== id));
  };

  const handleDeleteVideo = async (filename, e) => {
    e.stopPropagation();
    if (!confirm('Delete video file?')) return;
    await deleteClip(filename);
    onDelete?.(filename);
    setSelected(prev => prev.filter(s => s.filename !== filename));
  };

  const imageItems = images.map(img => ({ type: 'image', key: img.id, id: img.id, url: img.url, name: img.name }));
  const clipItems = clips.map(c => ({ type: 'clip', key: c.filename, filename: c.filename, url: c.url, name: c.filename }));
  const videoItems = videos.map(v => ({ type: 'video', key: v.filename, filename: v.filename, url: v.url, name: v.filename }));

  const currentItems = tab === 'images' ? imageItems : tab === 'clips' ? clipItems : videoItems;

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="library-modal" onClick={e => e.stopPropagation()}>
        <div className="library-header">
          <div>
            <h3>Library</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
              {mode === 'single' ? 'Select an image for generation' : 'Select clips or videos to add to timeline'}
            </p>
          </div>
          <button className="library-close" onClick={onClose}>×</button>
        </div>

        <div className="library-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`library-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="library-body">
          {tab === 'images' && (
            <div
              className={`library-dropzone ${dragOver ? 'dragover' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('library-file-input').click()}
            >
              {uploading ? 'Uploading...' : '+ Click or Drop Images Here'}
              <input id="library-file-input" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileInput} />
            </div>
          )}

          <div className="library-grid">
            {currentItems.map(item => (
              <div
                key={item.key}
                className={`library-item ${isSelected(item) ? 'selected' : ''}`}
                onClick={() => toggleSelect(item)}
                onDoubleClick={() => item.type !== 'image' && onPreview?.(item.url)}
              >
                {item.type === 'image' ? (
                  <img src={item.url} alt={item.name} loading="lazy" />
                ) : (
                  <video src={item.url} preload="metadata" muted />
                )}
                <div className="library-item-name">{item.name}</div>
                {item.type !== 'image' && (
                  <button
                    className="library-item-preview"
                    onClick={(e) => { e.stopPropagation(); onPreview?.(item.url); }}
                    title="Preview"
                  >👁</button>
                )}
                <button
                  className="library-item-delete"
                  onClick={(e) => item.type === 'image' ? handleDeleteImage(item.id, e) : handleDeleteVideo(item.filename, e)}
                  title="Delete"
                >×</button>
              </div>
            ))}
            {currentItems.length === 0 && (
              <div className="library-empty">No items in this library</div>
            )}
          </div>
        </div>

        <div className="library-footer">
          <span className="library-count">{selected.length} selected</span>
          <div className="library-actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn" onClick={handleAdd} disabled={selected.length === 0}>
              {mode === 'single' ? 'Select' : 'Add to timeline'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
