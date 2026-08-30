import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const testCloudinary = () => {
  return new Promise((resolve) => {
    cloudinary.api.ping((err, result) => {
      if (err) {
        console.error('❌ Cloudinary ping failed:', err.message);
        console.warn('⚠️  Image uploads won\'t work until Cloudinary credentials are fixed.');
        resolve(false);
      } else {
        console.log('✅ Cloudinary connected:', result);
        resolve(true);
      }
    });
  });
};

export const uploadImage = async (base64Image, options = {}) => {
  const defaultOptions = {
    folder: 'nexchat',
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  };
  return cloudinary.uploader.upload(base64Image, { ...defaultOptions, ...options });
};

export const uploadVoice = async (base64Audio, options = {}) => {
  const defaultOptions = {
    folder: 'nexchat_voice',
    resource_type: 'auto',
    format: 'mp3',
  };
  return cloudinary.uploader.upload(base64Audio, { ...defaultOptions, ...options });
};

export const uploadAvatar = async (base64Image, options = {}) => {
  const defaultOptions = {
    folder: 'nexchat_avatars',
    transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
  };
  return cloudinary.uploader.upload(base64Image, { ...defaultOptions, ...options });
};

export const uploadFile = async (fileBuffer, options = {}) => {
  const defaultOptions = {
    folder: 'nexchat_files',
    resource_type: 'auto',
  };
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { ...defaultOptions, ...options },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const isCloudinaryConfigured = () => {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
};

export default cloudinary;
