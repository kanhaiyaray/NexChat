import mongoose from 'mongoose';

const privateRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  createdBy: { type: String, default: 'anonymous' },
  createdAt: { type: Date, default: Date.now },
  pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  suspended: { type: Boolean, default: false }
}, { timestamps: false });

// Indexes for performance
privateRoomSchema.index({ createdAt: 1 });

export const PrivateRoom = mongoose.models.PrivateRoom || mongoose.model('PrivateRoom', privateRoomSchema);
export default PrivateRoom;
