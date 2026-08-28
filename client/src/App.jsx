import { useState, useEffect, useCallback } from 'react';
import GenerationPanel from './components/GenerationPanel';
import StatusModal from './components/StatusModal';
import ClipEditor from './components/ClipEditor';
import AudioTrack from './components/AudioTrack';
import VideoPreview from './components/VideoPreview';
import Library from './components/Library';
import { fetchAudio, fetchImages, fetchClips, fetchVideos } from './hooks/useApi';

const TIMELINE_KEY = 'video-generator-timeline';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [segments, setSegments] = useState(() => {
    try {
      const saved = localStorage.getItem(TIMELINE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [status, setStatus] = useState({ open: false });
  const [previewSrc, setPreviewSrc] = useState(null);
  const [selectedAudio, setSelectedAudio] = useState('');
  const [audioList, setAudioList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [images, setImages] = useState([]);
  const [clips, setClips] = useState([]);
  const [videos, setVideos] = useState([]);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState('images');
  const [libraryMode, setLibraryMode] = useState('single');
  const [libraryCallback, setLibraryCallback] = useState(null);

  const refreshLibrary = useCallback(async () => {
    try {
      const [imgs, cls, vds] = await Promise.all([fetchImages(), fetchClips(), fetchVideos()]);
      setImages(imgs);
      setClips(cls);
      setVideos(vds);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchAudio().then(setAudioList).catch(console.error);
    refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    localStorage.setItem(TIMELINE_KEY, JSON.stringify(segments));
  }, [segments]);

  const openLibrary = (tab, mode, callback) => {
    setLibraryTab(tab);
    setLibraryMode(mode);
    setLibraryCallback(() => callback);
    setLibraryOpen(true);
  };

  const handleLibrarySelect = (items) => {
    libraryCallback?.(items);
  };

  const handlePickImage = () => {
    openLibrary('images', 'single', (items) => {
      if (items.length > 0) setSelectedImage(items[0].id);
    });
  };

  const handleAddSegments = () => {
    openLibrary('clips', 'multi', (items) => {
      const newSegs = items.map((item, i) => ({
        filename: item.filename,
        label: item.type === 'video' ? 'Video' : 'Clip',
        duration: '—',
      }));
      setSegments(prev => [...prev, ...newSegs]);
    });
  };

  const handleGenerated = (res) => {
    console.log('Task created:', res.requestId);
  };

  const handleComplete = (dl) => {
    refreshLibrary();
    setStatus({ open: false });
  };

  const handleOperationComplete = (res) => {
    refreshLibrary();
    setLoading(false);
  };

  return (
    <div className="app">
      <div style={{ gridColumn: 1, gridRow: 1, minHeight: 0 }}>
        <GenerationPanel
          selectedImage={selectedImage}
          onPickImage={handlePickImage}
          onGenerated={handleGenerated}
          onStatus={setStatus}
        />
      </div>

      <div style={{ gridColumn: 2, gridRow: 1, minHeight: 0 }}>
        <VideoPreview src={previewSrc} segments={segments} />
      </div>

      <div style={{ gridColumn: 3, gridRow: 1, minHeight: 0 }}>
        <AudioTrack selectedAudio={selectedAudio} onSelectAudio={setSelectedAudio} />
      </div>

      <div style={{ gridColumn: '1 / 4', gridRow: 2, minHeight: 0 }}>
        <ClipEditor
          segments={segments}
          setSegments={setSegments}
          onPreview={setPreviewSrc}
          onLoading={setLoading}
          onAddSegments={handleAddSegments}
          onOperationComplete={handleOperationComplete}
          audioList={audioList}
        />
      </div>

      <StatusModal
        status={status}
        onClose={() => setStatus({ open: false })}
        onComplete={handleComplete}
      />

      <Library
        open={libraryOpen}
        initialTab={libraryTab}
        mode={libraryMode}
        clips={clips}
        videos={videos}
        onClose={() => setLibraryOpen(false)}
        onSelect={handleLibrarySelect}
        onPreview={setPreviewSrc}
        onDelete={refreshLibrary}
      />

      {loading && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="spinner" />
            <h3>Processing video...</h3>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
