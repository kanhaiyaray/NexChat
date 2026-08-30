export const isValidCode = (code) => {
  return code && code.length >= 4 && /^[A-Za-z0-9]+$/.test(code);
};

export const isValidRoomId = (roomId) => {
  return roomId && roomId.startsWith('room_') && roomId.length >= 10;
};

export const isValidMessage = (message) => {
  return message && typeof message === 'string' && message.trim().length > 0;
};

export const isValidUsername = (username) => {
  return username && typeof username === 'string' && username.trim().length > 0 && username.length <= 40;
};

export const isValidImageBase64 = (base64) => {
  return base64 && typeof base64 === 'string' && base64.startsWith('data:image');
};

export const isValidAudioBase64 = (base64) => {
  return base64 && typeof base64 === 'string' && base64.startsWith('data:audio');
};

export const isValidEmail = (email) => {
  return email && typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const sanitizeString = (str, maxLength = 5000) => {
  if (!str) return '';
  const sanitized = str.replace(/[<>]/g, '').trim();
  return sanitized.slice(0, maxLength);
};

export default {
  isValidCode,
  isValidRoomId,
  isValidMessage,
  isValidUsername,
  isValidImageBase64,
  isValidAudioBase64,
  isValidEmail,
  sanitizeString,
};
