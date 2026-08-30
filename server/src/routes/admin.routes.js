import express from 'express';
import { isAdmin, checkAdminRole } from '../middleware/isAdmin.js';
import {
  fetchStats,
  logAdminAction,
  getSystemSettings,
  updateSystemSettings,
  getAuditLogs,
  getSystemHealth,
} from '../services/admin.service.js';
import {
  getAllRooms,
  deleteRoomById,
  suspendRoom,
  unsuspendRoom,
} from '../services/room.service.js';
import {
  getUserProfilesBatch,
  updateUserProfile,
  checkIsAdmin,
} from '../services/profile.service.js';
import {
  getMessageStats,
  getMessageTypes,
  getTopUsers,
  getActivityHeatmap,
} from '../services/message.service.js';
import { UserProfile, PrivateRoom, Message, AdminAudit } from '../models/index.js';

const router = express.Router();

// ─── Public Routes ──────────────────────────────────────────────────────────

router.get('/check-role', checkAdminRole);

// ─── Admin Routes ──────────────────────────────────────────────────────────

// Stats
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const stats = await fetchStats();
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Users
router.get('/users', isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 15, search = '', filter = 'all' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (filter === 'banned') query.status = 'banned';
    else if (filter === 'active') query.status = 'active';

    const [users, total] = await Promise.all([
      UserProfile.find(query).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).lean(),
      UserProfile.countDocuments(query)
    ]);

    // Get online users from room state
    const onlineUsernames = new Set();
    const rooms = {}; // This should be imported from roomState
    Object.values(rooms).forEach(roomUsers => roomUsers.forEach(u => onlineUsernames.add(u.username)));

    const enriched = users.map(u => ({
      ...u,
      isOnline: onlineUsernames.has(u.username)
    }));

    res.json({ users: enriched, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Users error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/ban', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserProfile.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.status = 'banned';
    await user.save();

    await logAdminAction(req.admin.clerkId, user.username, 'ban_user', user.username, 'user', { userId: user._id });
    res.json({ success: true, user });
  } catch (err) {
    console.error('Ban error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/unban', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserProfile.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.status = 'active';
    await user.save();

    await logAdminAction(req.admin.clerkId, user.username, 'unban_user', user.username, 'user', { userId: user._id });
    res.json({ success: true, user });
  } catch (err) {
    console.error('Unban error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserProfile.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await UserProfile.deleteOne({ _id: id });

    await logAdminAction(req.admin.clerkId, user.username, 'delete_user', user.username, 'user', { userId: user._id });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Rooms
router.get('/rooms', isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 15, search = '' } = req.query;
    const result = await getAllRooms({}, { page, limit, search });
    res.json(result);
  } catch (err) {
    console.error('Rooms error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/rooms/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const room = await deleteRoomById(id);

    await logAdminAction(req.admin.clerkId, 'admin', 'delete_room', room.roomId, 'room', { code: room.code });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete room error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/rooms/:id/suspend', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const room = await suspendRoom(id);

    await logAdminAction(req.admin.clerkId, 'admin', 'suspend_room', room.roomId, 'room', { code: room.code });
    res.json({ success: true, room });
  } catch (err) {
    console.error('Suspend room error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/rooms/:id/unsuspend', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const room = await unsuspendRoom(id);

    await logAdminAction(req.admin.clerkId, 'admin', 'unsuspend_room', room.roomId, 'room', { code: room.code });
    res.json({ success: true, room });
  } catch (err) {
    console.error('Unsuspend room error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Audit
router.get('/audit', isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 15, search = '' } = req.query;
    const result = await getAuditLogs({ page, limit, search });
    res.json(result);
  } catch (err) {
    console.error('Audit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health
router.get('/health', isAdmin, async (req, res) => {
  try {
    const health = getSystemHealth();
    res.json(health);
  } catch (err) {
    console.error('Health error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Settings
router.get('/settings', isAdmin, async (req, res) => {
  try {
    const settings = await getSystemSettings();
    res.json(settings || {});
  } catch (err) {
    console.error('Settings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', isAdmin, async (req, res) => {
  try {
    const settings = await updateSystemSettings(req.body);
    await logAdminAction(req.admin.clerkId, 'admin', 'update_settings', 'system', 'system', { updates: req.body });
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Update settings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Analytics ──────────────────────────────────────────────────────────────

router.get('/analytics/messages', isAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const data = await getMessageStats(days);
    res.json(data);
  } catch (err) {
    console.error('Message analytics error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/users', isAdmin, async (req, res) => {
  try {
    const total = await UserProfile.countDocuments();
    const active = await UserProfile.countDocuments({ status: 'active' });
    const banned = await UserProfile.countDocuments({ status: 'banned' });
    const online = Object.values(rooms).flat().length;

    res.json({ total, active, banned, online });
  } catch (err) {
    console.error('User analytics error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/users-over-time', isAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const data = await getUserGrowth(days);
    res.json(data);
  } catch (err) {
    console.error('User growth error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/rooms-over-time', isAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const data = await getRoomGrowth(days);
    res.json(data);
  } catch (err) {
    console.error('Room growth error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/message-types', isAdmin, async (req, res) => {
  try {
    const data = await getMessageTypes();
    res.json(data);
  } catch (err) {
    console.error('Message types error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/top-users', isAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topUsers = await getTopUsers(limit);
    res.json(topUsers);
  } catch (err) {
    console.error('Top users error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/activity-heatmap', isAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const data = await getActivityHeatmap(days);
    res.json(data);
  } catch (err) {
    console.error('Heatmap error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Export ──────────────────────────────────────────────────────────────────

const arrayToCSV = (data, headers) => {
  const headerRow = headers.join(',');
  const rows = data.map(item => headers.map(h => JSON.stringify(item[h] || '')).join(','));
  return [headerRow, ...rows].join('\n');
};

router.get('/export/users', isAdmin, async (req, res) => {
  try {
    const users = await UserProfile.find({}, 'username displayName email status role createdAt lastSeen').lean();
    const csv = arrayToCSV(users, ['username', 'displayName', 'email', 'status', 'role', 'createdAt', 'lastSeen']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);
  } catch (err) {
    console.error('Export users error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/rooms', isAdmin, async (req, res) => {
  try {
    const roomsData = await PrivateRoom.find({}, 'roomId code createdBy createdAt suspended').lean();
    const enriched = await Promise.all(roomsData.map(async (r) => {
      const count = await Message.countDocuments({ room: r.roomId });
      return { ...r, messageCount: count };
    }));
    const csv = arrayToCSV(enriched, ['roomId', 'code', 'createdBy', 'createdAt', 'suspended', 'messageCount']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=rooms.csv');
    res.send(csv);
  } catch (err) {
    console.error('Export rooms error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/audit', isAdmin, async (req, res) => {
  try {
    const logs = await AdminAudit.find({}, 'adminName action target details timestamp').lean();
    const csv = arrayToCSV(logs, ['adminName', 'action', 'target', 'details', 'timestamp']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit.csv');
    res.send(csv);
  } catch (err) {
    console.error('Export audit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
