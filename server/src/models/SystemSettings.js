import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema({
  maintenanceMode: { type: Boolean, default: false },
  maxMessageLength: { type: Number, default: 5000 },
  allowImageUploads: { type: Boolean, default: true },
  allowNewRooms: { type: Boolean, default: true },
  siteName: { type: String, default: 'NexChat' },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: false });

export const SystemSettings = mongoose.models.SystemSettings || mongoose.model('SystemSettings', systemSettingsSchema);
export default SystemSettings;
