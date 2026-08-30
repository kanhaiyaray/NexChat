import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  sender: { type: String, required: true },
  message: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  voiceUrl: { type: String, default: '' },
  voiceDuration: { type: Number, default: null },
  type: { type: String, enum: ['text', 'image', 'voice'], default: 'text' },
  timestamp: { type: Date, default: Date.now, index: true },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  reactions: { type: Map, of: Number, default: {} },
  replyTo: {
    messageId: { type: String, default: null },
    snippet: { type: String, default: null },
    sender: { type: String, default: null }
  }
}, { timestamps: false });

// Indexes for performance
messageSchema.index({ room: 1, timestamp: -1 });
messageSchema.index({ message: 'text' });
messageSchema.index({ timestamp: 1 });
messageSchema.index({ type: 1 });
messageSchema.index({ room: 1, type: 1, timestamp: -1 });

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export default Message;
