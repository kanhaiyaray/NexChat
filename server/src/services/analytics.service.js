import { Message, UserProfile, PrivateRoom } from '../models/index.js';

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

export const getMessageStats = async (days = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const pipeline = [
    { $match: { timestamp: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];

  return await Message.aggregate(pipeline);
};

export const getMessageTypes = async () => {
  const types = await Message.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);

  const total = types.reduce((sum, t) => sum + t.count, 0);
  return types.map(t => ({
    name: t._id,
    value: t.count,
    percentage: total ? ((t.count / total) * 100).toFixed(1) : 0
  }));
};

export const getTopUsers = async (limit = 10) => {
  const topUsers = await Message.aggregate([
    { $group: { _id: '$sender', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);

  const enriched = await Promise.all(topUsers.map(async (u) => {
    const profile = await UserProfile.findOne({ username: u._id }).lean();
    return {
      username: u._id,
      messageCount: u.count,
      lastSeen: profile?.lastSeen || null,
      status: profile?.status || 'active'
    };
  }));

  return enriched;
};

export const getActivityHeatmap = async (days = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

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
    { $sort: { '_id.day': 1, '_id.hour': 1 } }
  ];

  const results = await Message.aggregate(pipeline);
  return results.map(r => ({
    day: r._id.day,
    hour: r._id.hour,
    count: r.count
  }));
};

export default {
  getUserGrowth,
  getRoomGrowth,
  getMessageStats,
  getMessageTypes,
  getTopUsers,
  getActivityHeatmap,
};
