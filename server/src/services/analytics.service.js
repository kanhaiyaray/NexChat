import { Message, UserProfile, PrivateRoom } from '../models/index.js';

// Caching for analytics queries
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

export const getUserGrowth = async (days = 30) => {
  const cacheKey = `userGrowth_${days}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  const maxDays = Math.min(parseInt(days), 30);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - maxDays);

  const pipeline = [
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: 31 }
  ];

  const results = await UserProfile.aggregate(pipeline);
  const data = { data: results };
  
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

export const getRoomGrowth = async (days = 30) => {
  const cacheKey = `roomGrowth_${days}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  const maxDays = Math.min(parseInt(days), 30);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - maxDays);

  const pipeline = [
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: 31 }
  ];

  const results = await PrivateRoom.aggregate(pipeline);
  const data = { data: results };
  
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

export const getMessageStats = async (days = 7) => {
  const cacheKey = `msgStats_${days}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  const maxDays = Math.min(parseInt(days), 30);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - maxDays);

  const pipeline = [
    { $match: { timestamp: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: 31 }
  ];

  const results = await Message.aggregate(pipeline);
  const data = { data: results };
  
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

export const getMessageTypes = async () => {
  const cacheKey = 'msgTypes';
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  const [textCount, imageCount, voiceCount, fileCount] = await Promise.all([
    Message.countDocuments({ type: 'text' }),
    Message.countDocuments({ type: 'image' }),
    Message.countDocuments({ type: 'voice' }),
    Message.countDocuments({ type: 'file' })
  ]);

  const total = textCount + imageCount + voiceCount + fileCount;
  const data = {
    data: [
      { name: 'text', value: textCount, percentage: total ? ((textCount / total) * 100).toFixed(1) : 0 },
      { name: 'image', value: imageCount, percentage: total ? ((imageCount / total) * 100).toFixed(1) : 0 },
      { name: 'voice', value: voiceCount, percentage: total ? ((voiceCount / total) * 100).toFixed(1) : 0 },
      { name: 'file', value: fileCount, percentage: total ? ((fileCount / total) * 100).toFixed(1) : 0 }
    ]
  };

  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

export const getTopUsers = async (limit = 10) => {
  const cacheKey = `topUsers_${limit}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  const topUsers = await Message.aggregate([
    { $group: { _id: '$sender', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);

  const enriched = await Promise.all(topUsers.map(async (u) => {
    const profile = await UserProfile.findOne({ username: u._id })
      .select('username lastSeen status')
      .lean();
    return {
      username: u._id,
      messageCount: u.count,
      lastSeen: profile?.lastSeen || null,
      status: profile?.status || 'active'
    };
  }));

  const data = { topUsers: enriched };
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

export const getActivityHeatmap = async (days = 7) => {
  const cacheKey = `heatmap_${days}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  const maxDays = Math.min(parseInt(days), 14);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - maxDays);

  const pipeline = [
    { $match: { timestamp: { $gte: startDate } } },
    {
      $project: {
        hour: { $hour: '$timestamp' },
        day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
      }
    },
    {
      $group: {
        _id: { day: '$day', hour: '$hour' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.day': 1, '_id.hour': 1 } },
    { $limit: 336 } // 14 days * 24 hours
  ];

  const results = await Message.aggregate(pipeline);
  const data = { data: results.map(r => ({
    day: r._id.day,
    hour: r._id.hour,
    count: r.count
  })) };
  
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

export const clearAnalyticsCache = () => {
  cache.clear();
  console.log('🧹 Analytics cache cleared');
};

export default {
  getUserGrowth,
  getRoomGrowth,
  getMessageStats,
  getMessageTypes,
  getTopUsers,
  getActivityHeatmap,
  clearAnalyticsCache,
};
