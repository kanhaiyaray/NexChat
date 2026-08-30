import { AdminAudit, SystemSettings, UserProfile, PrivateRoom } from '../models/index.js';
import { getCodeRoomMap } from './room.service.js';
import { getDBStatus } from '../config/database.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';

let roomState = {};

export const setRoomState = (state) => {
  roomState = state;
};

export const logAdminAction = async (adminId, adminName, action, target, targetType, details = {}) => {
  try {
    await AdminAudit.create({ adminId, adminName, action, target, targetType, details });
  } catch (err) {
    console.warn('Audit log failed:', err.message);
  }
};

export const fetchStats = async () => {
  const totalUsers = await UserProfile.countDocuments();
  const onlineUsers = Object.values(roomState).flat().length;
  const totalRooms = await PrivateRoom.countDocuments();
  const activeRooms = Object.keys(roomState).filter(roomId => roomState[roomId]?.length >= 2).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const messagesToday = await Message.countDocuments({ timestamp: { $gte: today } });
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const newUsers24h = await UserProfile.countDocuments({ createdAt: { $gte: yesterday } });

  return {
    totalUsers,
    onlineUsers,
    totalRooms,
    activeRooms,
    messagesToday,
    newUsers24h,
    serverUptime: process.uptime(),
    mongoStatus: getDBStatus(),
    cloudinaryStatus: isCloudinaryConfigured() ? 'configured' : 'missing',
  };
};

export const getSystemSettings = async () => {
  return await SystemSettings.findOne().lean();
};

export const updateSystemSettings = async (updates) => {
  const allowed = ['maintenanceMode', 'maxMessageLength', 'allowImageUploads', 'allowNewRooms', 'siteName'];
  const filtered = Object.keys(updates)
    .filter(k => allowed.includes(k))
    .reduce((obj, k) => { obj[k] = updates[k]; return obj; }, {});
  filtered.updatedAt = new Date();

  return await SystemSettings.findOneAndUpdate(
    {},
    { $set: filtered },
    { new: true, upsert: true }
  );
};

export const initializeSystemSettings = async () => {
  const settings = await SystemSettings.findOne();
  if (!settings) {
    await SystemSettings.create({});
    console.log('✅ Default system settings created');
  }
};

export const getAuditLogs = async (options = {}) => {
  const { page = 1, limit = 20, search = '' } = options;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let query = {};
  if (search) {
    query.$or = [
      { adminName: { $regex: search, $options: 'i' } },
      { action: { $regex: search, $options: 'i' } },
      { target: { $regex: search, $options: 'i' } }
    ];
  }

  const [logs, total] = await Promise.all([
    AdminAudit.find(query).skip(skip).limit(parseInt(limit)).sort({ timestamp: -1 }).lean(),
    AdminAudit.countDocuments(query)
  ]);

  return {
    logs,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit)
  };
};

export const getSystemHealth = () => {
  return {
    serverUptime: process.uptime(),
    mongo: getDBStatus(),
    cloudinary: isCloudinaryConfigured() ? 'configured' : 'missing',
    socketConnections: Object.values(roomState).reduce((acc, users) => acc + users.length, 0),
  };
};

export const getUserGrowth = async (days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const pipeline = [
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];

  return await UserProfile.aggregate(pipeline);
};

export const getRoomGrowth = async (days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const pipeline = [
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];

  return await PrivateRoom.aggregate(pipeline);
};

export default {
  setRoomState,
  logAdminAction,
  fetchStats,
  getSystemSettings,
  updateSystemSettings,
  initializeSystemSettings,
  getAuditLogs,
  getSystemHealth,
  getUserGrowth,
  getRoomGrowth,
};
