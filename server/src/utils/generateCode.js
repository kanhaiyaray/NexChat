import { PrivateRoom } from '../models/index.js';
import { randomUUID } from 'crypto';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateShortCode = async (length = 6) => {
  let code;
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 100) {
    code = '';
    for (let i = 0; i < length; i++) {
      code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }

    const found = await PrivateRoom.findOne({ code });
    if (!found) exists = false;
    attempts++;
  }

  return code || generateShortCode(length + 1);
};

export const generateRoomId = () => {
  return `room_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
};

export default { generateShortCode, generateRoomId };
