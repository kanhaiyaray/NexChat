export const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const createAudioBlob = (audioChunks, mimeType = 'audio/webm') => {
  return new Blob(audioChunks, { type: mimeType });
};

export const audioToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const getAudioDuration = (url) => {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      resolve(0);
    });
  });
};

export const isAudioSupported = () => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

export const MAX_RECORDING_DURATION = 60;

export default {
  formatTime,
  createAudioBlob,
  audioToBase64,
  getAudioDuration,
  isAudioSupported,
  MAX_RECORDING_DURATION,
};
