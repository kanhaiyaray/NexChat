import { AdminAudit, SystemSettings, UserProfile, PrivateRoom } from '../models/index.js';
import { getDBStatus } from '../config/database.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';

// Import Message model for stats
import { Message } from '../models/index.js';

let roomState = {};
const statsCache = new Map();
const STATS_CACHE_TTL = 30000; // 30 seconds

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
  const cacheKey = 'adminStats';
  if (statsCache.has(cacheKey)) {
    const cached = statsCache.get(cacheKey);
    if (Date.now() - cached.timestamp < STATS_CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [
      totalUsers,
      totalRooms,
      messagesToday,
      newUsers24h
    ] = await Promise.all([
      UserProfile.countDocuments(),
      PrivateRoom.countDocuments(),
      Message.countDocuments({ timestamp: { $gte: today } }),
      UserProfile.countDocuments({ createdAt: { $gte: yesterday } })
    ]);

    const onlineUsers = Object.values(roomState).flat().length;
    const activeRooms = Object.keys(roomState).filter(roomId => roomState[roomId]?.length >= 2).length;

    const data = {
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

    statsCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (err) {
    console.error('Error fetching stats:', err.message);
    // Return fallback data
    return {
      totalUsers: 0,
      onlineUsers: 0,
      totalRooms: 0,
      activeRooms: 0,
      messagesToday: 0,
      newUsers24h: 0,
      serverUptime: process.uptime(),
      mongoStatus: getDBStatus(),
      cloudinaryStatus: isCloudinaryConfigured() ? 'configured' : 'missing',
      error: err.message
    };
  }
};

export const clearStatsCache = () => {
  statsCache.clear();
  console.log('🧹 Stats cache cleared');
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

  const settings = await SystemSettings.findOneAndUpdate(
    {},
    { $set: filtered },
    { new: true, upsert: true }
  );
  
  clearStatsCache();
  return settings;
};

export const initializeSystemSettings = async () => {
  try {
    const settings = await SystemSettings.findOne();
    if (!settings) {
      await SystemSettings.create({});
      console.log('✅ Default system settings created');
    }
  } catch (err) {
    console.warn('Error initializing settings:', err.message);
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

export default {
  setRoomState,
  logAdminAction,
  fetchStats,
  clearStatsCache,
  getSystemSettings,
  updateSystemSettings,
  initializeSystemSettings,
  getAuditLogs,
  getSystemHealth,
};
