import mongoose from 'mongoose';

const readReceiptSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  messageId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  userId: { type: String, required: true },
  readAt: { type: Date, default: Date.now }
}, { timestamps: false });

readReceiptSchema.index({ room: 1, messageId: 1, userId: 1 }, { unique: true });

export const ReadReceipt = mongoose.models.ReadReceipt || mongoose.model('ReadReceipt', readReceiptSchema);
export default ReadReceipt;
