import express from 'express';
import multer from 'multer';
import {
  getUserProfile,
  getOrCreateUserProfile,
  updateUserProfile,
  getUserProfilesBatch,
} from '../services/profile.service.js';
import { isAdmin } from '../middleware/isAdmin.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'), false);
    }
  }
});

router.post('/webhook/clerk', express.json(), async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === 'user.created' || type === 'user.updated') {
      const clerkId = data.id;
      const username = data.username || data.email_addresses?.[0]?.email_address?.split('@')[0] || 'User';
      const email = data.email_addresses?.[0]?.email_address || '';

      await getOrCreateUserProfile(clerkId, username, email);
      console.log(`✅ User profile synced: ${username} (${clerkId})`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.get('/profile/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;
    const requesterId = req.query.requesterId;

    if (!clerkId) {
      return res.status(400).json({ error: 'clerkId required' });
    }

    const profile = await getUserProfile(clerkId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const isOwner = requesterId === clerkId;

    const response = {
      clerkId: profile.clerkId,
      username: profile.username,
      displayName: profile.displayName || profile.username,
      avatarUrl: profile.avatarUrl,
      avatarColor: profile.avatarColor,
      statusEmoji: profile.statusEmoji,
      statusText: profile.statusText,
    };

    const canSeeFull = isOwner || profile.visibility === 'public' || profile.visibility === 'friends';

    if (canSeeFull) {
      response.bio = profile.bio;
      response.email = profile.email;
      response.lastSeen = profile.lastSeen;
      response.hideOnlineStatus = profile.hideOnlineStatus;
      response.hideReadReceipts = profile.hideReadReceipts;
      response.visibility = profile.visibility;
    } else {
      response.bio = null;
      response.email = null;
      response.lastSeen = null;
    }

    if (isOwner) {
      response.activityFeed = profile.activityFeed || [];
    }

    res.json(response);
  } catch (err) {
    console.error('Get profile error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.post('/profile/:clerkId', upload.single('avatar'), async (req, res) => {
  try {
    const { clerkId } = req.params;
    const {
      bio,
      status,
      avatarColor,
      displayName,
      statusEmoji,
      statusText,
      visibility,
      hideOnlineStatus,
      hideReadReceipts
    } = req.body;

    if (!clerkId) {
      return res.status(400).json({ error: 'clerkId required' });
    }

    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (status !== undefined) updateData.status = status;
    if (avatarColor !== undefined) updateData.avatarColor = avatarColor;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (statusEmoji !== undefined) updateData.statusEmoji = statusEmoji;
    if (statusText !== undefined) updateData.statusText = statusText;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (hideOnlineStatus !== undefined) updateData.hideOnlineStatus = hideOnlineStatus;
    if (hideReadReceipts !== undefined) updateData.hideReadReceipts = hideReadReceipts;

    const profile = await updateUserProfile(clerkId, updateData, req.file);

    res.json({ success: true, profile });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
});

router.post('/profiles/batch', express.json(), async (req, res) => {
  try {
    const { clerkIds } = req.body;

    if (!clerkIds || !Array.isArray(clerkIds)) {
      return res.status(400).json({ error: 'clerkIds array required' });
    }

    const profiles = await getUserProfilesBatch(clerkIds);
    res.json(profiles);
  } catch (err) {
    console.error('Batch profiles error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

router.post('/sync/:clerkId', express.json(), async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { username, email, avatarUrl } = req.body;

    if (!clerkId || !username) {
      return res.status(400).json({ error: 'clerkId and username required' });
    }

    const profile = await getOrCreateUserProfile(clerkId, username, email);

    if (avatarUrl && !profile.avatarUrl) {
      profile.avatarUrl = avatarUrl;
      profile.updatedAt = new Date();
      await profile.save();
    }

    res.json({ success: true, profile });
  } catch (err) {
    console.error('Manual sync error:', err.message);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

export default router;
