export const imageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const isValidImageFile = (file) => {
  if (!file) return false;
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return validTypes.includes(file.type);
};

export const isValidImageSize = (file, maxSizeMB = 5) => {
  if (!file) return false;
  return file.size <= maxSizeMB * 1024 * 1024;
};

export const validateImage = (file, maxSizeMB = 5) => {
  if (!file) return { valid: false, error: 'No file provided' };
  if (!isValidImageFile(file)) {
    return { valid: false, error: 'Invalid image format. Please use JPEG, PNG, GIF, WebP, or SVG.' };
  }
  if (!isValidImageSize(file, maxSizeMB)) {
    return { valid: false, error: `Image size exceeds ${maxSizeMB}MB limit.` };
  }
  return { valid: true, error: null };
};

export const getImageDimensions = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
};

export const createImagePreview = (file) => {
  return URL.createObjectURL(file);
};

export const revokeImagePreview = (url) => {
  if (url) URL.revokeObjectURL(url);
};

export default {
  imageToBase64,
  isValidImageFile,
  isValidImageSize,
  validateImage,
  getImageDimensions,
  createImagePreview,
  revokeImagePreview,
};
