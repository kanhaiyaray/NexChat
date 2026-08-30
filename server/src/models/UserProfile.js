import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true, unique: true },
  displayName: { type: String, default: '' },
  email: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  avatarColor: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 160 },
  statusEmoji: { type: String, default: '🌟' },
  statusText: { type: String, default: 'Available', maxlength: 40 },
  lastSeen: { type: Date, default: Date.now },
  visibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
  hideOnlineStatus: { type: Boolean, default: false },
  hideReadReceipts: { type: Boolean, default: false },
  activityFeed: {
    type: [{
      message: String,
      timestamp: Date,
      roomId: String
    }],
    default: []
  },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'banned'], default: 'active' }
}, { timestamps: false });

// Indexes for performance
userProfileSchema.index({ username: 'text' });
userProfileSchema.index({ createdAt: 1 });
userProfileSchema.index({ status: 1 });
userProfileSchema.index({ lastSeen: 1 });

export const UserProfile = mongoose.models.UserProfile || mongoose.model('UserProfile', userProfileSchema);
export default UserProfile;
