import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 120000 });

export const fetchImages = () => api.get('/images').then(r => r.data);
export const uploadImage = (file) => {
  const fd = new FormData();
  fd.append('image', file);
  return api.post('/images/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const deleteImage = (id) => api.delete(`/images/${id}`).then(r => r.data);

export const fetchAudio = () => api.get('/audio').then(r => r.data);
export const uploadAudio = (file) => {
  const fd = new FormData();
  fd.append('audio', file);
  return api.post('/audio/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const generateTTS = (text, voice) => api.post('/audio/tts', { text, voice }).then(r => r.data);
export const fetchVoices = () => api.get('/audio/voices').then(r => r.data);

export const generateVideo = (params) => api.post('/generate', params).then(r => r.data);
export const checkStatus = (requestId) => api.get(`/generate/${requestId}/status`).then(r => r.data);
export const downloadVideo = (requestId) => api.get(`/generate/${requestId}/download`).then(r => r.data);

export const fetchClips = () => api.get('/clips').then(r => r.data);
export const fetchVideos = () => api.get('/clips/videos').then(r => r.data);
export const fetchClipDuration = (filename) => api.get(`/clips/duration/${encodeURIComponent(filename)}`).then(r => r.data);
export const mergeClips = (segments) => api.post('/clips/merge', { segments }).then(r => r.data);
export const addAudio = (videoFile, audioFile, volume, loop) => api.post('/clips/audio', { videoFile, audioFile, volume, loop }).then(r => r.data);
export const addStereoAudio = (videoFile, leftAudio, rightAudio, leftVolume, rightVolume) =>
  api.post('/clips/audio-stereo', { videoFile, leftAudio, rightAudio, leftVolume, rightVolume }).then(r => r.data);
export const addLogo = (videoFile, position, margin, scale) => api.post('/clips/logo', { videoFile, position, margin, scale }).then(r => r.data);
export const uploadLogo = (file) => {
  const fd = new FormData();
  fd.append('logo', file);
  return api.post('/clips/logo-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

export default api;
