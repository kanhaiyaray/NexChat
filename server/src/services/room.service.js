import { PrivateRoom } from '../models/index.js';
import { generateShortCode, generateRoomId } from '../utils/generateCode.js';

const codeRoomMap = new Map();

export const resolveCode = async (code) => {
  if (codeRoomMap.has(code)) return codeRoomMap.get(code);
  const doc = await PrivateRoom.findOne({ code }).lean();
  if (doc) {
    codeRoomMap.set(code, doc.roomId);
    return doc.roomId;
  }
  return null;
};

export const createPrivateRoom = async (createdBy = 'anonymous') => {
  const roomId = generateRoomId();
  const code = await generateShortCode();

  codeRoomMap.set(code, roomId);

  await PrivateRoom.create({ roomId, code, createdBy });

  return { roomId, code };
};

export const getRoomByCode = async (code) => {
  return await PrivateRoom.findOne({ code }).lean();
};

export const getRoomByRoomId = async (roomId) => {
  return await PrivateRoom.findOne({ roomId }).lean();
};

export const getPinnedMessages = async (roomId) => {
  const room = await PrivateRoom.findOne({ roomId }).populate('pinnedMessages');
  if (!room) return [];
  return room.pinnedMessages;
};

export const pinMessage = async (roomId, messageId) => {
  const room = await PrivateRoom.findOne({ roomId });
  if (!room) throw new Error('Room not found');
  if (room.pinnedMessages.length >= 5) {
    throw new Error('Maximum 5 pinned messages per room.');
  }
  if (!room.pinnedMessages.includes(messageId)) {
    room.pinnedMessages.push(messageId);
    await room.save();
  }
  return room;
};

export const unpinMessage = async (roomId, messageId) => {
  const room = await PrivateRoom.findOne({ roomId });
  if (!room) throw new Error('Room not found');
  room.pinnedMessages = room.pinnedMessages.filter(id => id.toString() !== messageId);
  await room.save();
  return room;
};

export const isRoomSuspended = async (roomId) => {
  const room = await PrivateRoom.findOne({ roomId });
  return room?.suspended || false;
};

export const getAllRooms = async (query = {}, options = {}) => {
  const { page = 1, limit = 20, search = '' } = options;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let filter = { ...query };
  if (search) {
    filter.$or = [
      { roomId: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } }
    ];
  }

  const [rooms, total] = await Promise.all([
    PrivateRoom.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).lean(),
    PrivateRoom.countDocuments(filter)
  ]);

  return {
    rooms,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit)
  };
};

export const deleteRoomById = async (id) => {
  const room = await PrivateRoom.findById(id);
  if (!room) throw new Error('Room not found');
  await PrivateRoom.deleteOne({ _id: id });
  codeRoomMap.delete(room.code);
  return room;
};

export const suspendRoom = async (id) => {
  const room = await PrivateRoom.findById(id);
  if (!room) throw new Error('Room not found');
  room.suspended = true;
  await room.save();
  return room;
};

export const unsuspendRoom = async (id) => {
  const room = await PrivateRoom.findById(id);
  if (!room) throw new Error('Room not found');
  room.suspended = false;
  await room.save();
  return room;
};

export const getCodeRoomMap = () => codeRoomMap;

export default {
  resolveCode,
  createPrivateRoom,
  getRoomByCode,
  getRoomByRoomId,
  getPinnedMessages,
  pinMessage,
  unpinMessage,
  isRoomSuspended,
  getAllRooms,
  deleteRoomById,
  suspendRoom,
  unsuspendRoom,
  getCodeRoomMap,
};
