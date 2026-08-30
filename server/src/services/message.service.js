import { Message, ReadReceipt, UserProfile } from '../models/index.js';
import { uploadImage, uploadVoice, isCloudinaryConfigured } from '../config/cloudinary.js';
import { EDIT_WINDOW_MS } from '../utils/constants.js';
import { serializeMessage } from '../utils/messageHelpers.js';

export const saveMessage = async (data) => {
  const { room, sender, message, type, timestamp, replyTo, imageUrl, voiceUrl, voiceDuration } = data;

  const messageData = {
    room,
    sender,
    type: type || 'text',
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    edited: false,
    editedAt: null,
    replyTo: replyTo || null,
  };

  if (type === 'text') {
    messageData.message = message || '';
  } else if (type === 'image') {
    messageData.imageUrl = imageUrl || '';
  } else if (type === 'voice') {
    messageData.voiceUrl = voiceUrl || '';
    messageData.voiceDuration = voiceDuration || null;
  }

  const savedMsg = await new Message(messageData).save();

  await ReadReceipt.findOneAndUpdate(
    { room, messageId: savedMsg._id, userId: sender },
    { readAt: new Date() },
    { upsert: true }
  );

  return savedMsg;
};

export const getChatHistory = async (roomId, limit = 50) => {
  const history = await Message
    .find({ room: roomId })
    .sort({ timestamp: 1 })
    .limit(limit)
    .lean();

  const historyWithStrId = history.map(serializeMessage);

  const messagesWithReceipts = await Promise.all(historyWithStrId.map(async (msg) => {
    const readers = await ReadReceipt.distinct('userId', { room: roomId, messageId: msg.id });
    return { ...msg, readBy: readers, readCount: readers.length };
  }));

  return messagesWithReceipts;
};

export const searchMessages = async (roomId, query) => {
  const results = await Message.find(
    {
      room: roomId,
      type: 'text',
      $text: { $search: query },
    },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' }, timestamp: -1 })
    .limit(20)
    .lean();

  return results.map((msg) => ({
    id: msg._id.toString(),
    room: msg.room,
    sender: msg.sender,
    message: msg.message,
    timestamp: msg.timestamp,
  }));
};

export const deleteMessage = async (messageId, username) => {
  const msg = await Message.findById(messageId);
  if (!msg) return null;
  if (msg.sender !== username) {
    throw new Error('Cannot delete other user\'s message');
  }
  await Message.deleteOne({ _id: messageId });
  return msg;
};

export const editMessage = async (messageId, newMessage, username) => {
  const trimmedMessage = String(newMessage || '').trim();

  if (!trimmedMessage) {
    throw new Error('Message cannot be empty');
  }

  if (trimmedMessage.length > 5000) {
    throw new Error('Message is too long to edit');
  }

  const msg = await Message.findById(messageId);
  if (!msg) throw new Error('Message not found');

  if (msg.type !== 'text') {
    throw new Error('Only text messages can be edited');
  }

  if (msg.sender !== username) {
    throw new Error('You can only edit your own messages');
  }

  if (Date.now() - new Date(msg.timestamp).getTime() > EDIT_WINDOW_MS) {
    throw new Error('Editing is only allowed within 5 minutes');
  }

  msg.message = trimmedMessage;
  msg.edited = true;
  msg.editedAt = new Date();
  await msg.save();

  return msg;
};

export const addReaction = async (messageId, emoji) => {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw new Error('Invalid message ID');
  }
  return await Message.findByIdAndUpdate(
    messageId,
    { $inc: { [`reactions.${emoji}`]: 1 } },
    { new: true }
  );
};

export const getMessageContext = async (roomId, messageId, windowSize = 15) => {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return null;
  }

  const center = await Message.findOne({ _id: messageId, room: roomId }).lean();
  if (!center) {
    return null;
  }

  const earlierDocs = await Message
    .find({
      room: roomId,
      $or: [
        { timestamp: { $lt: center.timestamp } },
        { timestamp: center.timestamp, _id: { $lt: center._id } },
      ],
    })
    .sort({ timestamp: -1, _id: -1 })
    .limit(windowSize)
    .lean();

  const laterDocs = await Message
    .find({
      room: roomId,
      $or: [
        { timestamp: { $gt: center.timestamp } },
        { timestamp: center.timestamp, _id: { $gt: center._id } },
      ],
    })
    .sort({ timestamp: 1, _id: 1 })
    .limit(windowSize)
    .lean();

  const position = await Message.countDocuments({
    room: roomId,
    $or: [
      { timestamp: { $lt: center.timestamp } },
      { timestamp: center.timestamp, _id: { $lte: center._id } },
    ],
  });

  return {
    anchorId: center._id.toString(),
    position,
    messages: [
      ...earlierDocs.reverse().map(serializeMessage),
      serializeMessage(center),
      ...laterDocs.map(serializeMessage),
    ],
  };
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

export const getMessageCount = async (roomId) => {
  return await Message.countDocuments({ room: roomId });
};

export default {
  saveMessage,
  getChatHistory,
  searchMessages,
  deleteMessage,
  editMessage,
  addReaction,
  getMessageContext,
  getMessageStats,
  getMessageTypes,
  getTopUsers,
  getActivityHeatmap,
  getMessageCount,
};
