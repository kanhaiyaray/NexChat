import { UserProfile } from '../models/index.js';
import { uploadAvatar, isCloudinaryConfigured } from '../config/cloudinary.js';
import { AVATAR_COLOR_PALETTE } from '../utils/constants.js';

export const getUserProfile = async (clerkId) => {
  return await UserProfile.findOne({ clerkId }).lean();
};

export const getOrCreateUserProfile = async (clerkId, username, email) => {
  let profile = await UserProfile.findOne({ clerkId });

  if (!profile) {
    const randomColor = AVATAR_COLOR_PALETTE[Math.floor(Math.random() * AVATAR_COLOR_PALETTE.length)];
    profile = await UserProfile.create({
      clerkId,
      username,
      displayName: username,
      email: email || '',
      avatarColor: randomColor,
      bio: '',
      statusEmoji: '🌟',
      statusText: 'Available',
      visibility: 'public',
      hideOnlineStatus: false,
      hideReadReceipts: false,
      role: 'user',
      status: 'active'
    });
  } else {
    let needsUpdate = false;
    if (profile.username !== username) {
      profile.username = username;
      if (!profile.displayName || profile.displayName === profile.username) {
        profile.displayName = username;
      }
      needsUpdate = true;
    }
    if (email && profile.email !== email) {
      profile.email = email;
      needsUpdate = true;
    }
    if (needsUpdate) {
      profile.updatedAt = new Date();
      await profile.save();
    }
  }

  return profile;
};

export const updateUserProfile = async (clerkId, updateData, avatarFile = null) => {
  let avatarUrl = null;

  if (avatarFile) {
    if (!isCloudinaryConfigured()) {
      throw new Error('Avatar upload not configured');
    }
    const base64Image = `data:${avatarFile.mimetype};base64,${avatarFile.buffer.toString('base64')}`;
    const uploadResult = await uploadAvatar(base64Image);
    avatarUrl = uploadResult.secure_url;
  }

  const updateFields = { ...updateData };
  if (avatarUrl !== null) {
    updateFields.avatarUrl = avatarUrl;
  }
  updateFields.updatedAt = new Date();

  if (updateFields.bio !== undefined) updateFields.bio = updateFields.bio?.slice(0, 160);
  if (updateFields.statusText !== undefined) updateFields.statusText = updateFields.statusText?.trim().slice(0, 40);
  if (updateFields.displayName !== undefined) updateFields.displayName = updateFields.displayName?.trim().slice(0, 40);
  if (updateFields.hideOnlineStatus !== undefined) {
    updateFields.hideOnlineStatus = updateFields.hideOnlineStatus === 'true' || updateFields.hideOnlineStatus === true;
  }
  if (updateFields.hideReadReceipts !== undefined) {
    updateFields.hideReadReceipts = updateFields.hideReadReceipts === 'true' || updateFields.hideReadReceipts === true;
  }

  const profile = await UserProfile.findOneAndUpdate(
    { clerkId },
    updateFields,
    { new: true, upsert: true }
  );

  return profile;
};

export const getUserProfilesBatch = async (clerkIds) => {
  const profiles = await UserProfile.find({ clerkId: { $in: clerkIds } }).lean();
  const profileMap = {};
  profiles.forEach(p => {
    profileMap[p.clerkId] = {
      avatarUrl: p.avatarUrl,
      avatarColor: p.avatarColor,
      bio: p.bio,
      status: p.status,
      username: p.username,
      displayName: p.displayName,
      statusEmoji: p.statusEmoji,
      statusText: p.statusText,
      hideOnlineStatus: p.hideOnlineStatus,
      lastSeen: p.lastSeen,
    };
  });
  return profileMap;
};

export const updateLastSeen = async (username) => {
  return await UserProfile.findOneAndUpdate(
    { username },
    { $set: { lastSeen: new Date() } }
  );
};

export const addActivityFeedItem = async (clerkId, message, roomId) => {
  return await UserProfile.updateOne(
    { clerkId },
    {
      $push: {
        activityFeed: {
          $each: [{ message, timestamp: new Date(), roomId }],
          $slice: -20
        }
      },
      $set: { lastSeen: new Date() }
    }
  );
};

export const checkIsAdmin = async (identifier) => {
  let query = {};
  if (identifier?.email) {
    query = { email: identifier.email };
  } else if (identifier?.clerkId) {
    query = { clerkId: identifier.clerkId };
  } else if (typeof identifier === 'string') {
    query = { clerkId: identifier };
  } else {
    return false;
  }

  const profile = await UserProfile.findOne(query);
  return profile?.role === 'admin';
};

export default {
  getUserProfile,
  getOrCreateUserProfile,
  updateUserProfile,
  getUserProfilesBatch,
  updateLastSeen,
  addActivityFeedItem,
  checkIsAdmin,
};
