import mongoose from 'mongoose';

const readStatusSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  lastReadMessageId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Message',
    default: null
  },
  lastReadTimestamp: { type: Date, default: Date.now },
  readMessages: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Message' 
  }],
  unreadCount: { type: Number, default: 0 }
}, { timestamps: true });

// Unique index per user per room
readStatusSchema.index({ room: 1, userId: 1 }, { unique: true });

export const ReadStatus = mongoose.models.ReadStatus || mongoose.model('ReadStatus', readStatusSchema);
export default ReadStatus;
