import mongoose from 'mongoose';

const adminAuditSchema = new mongoose.Schema({
  adminId: { type: String },
  adminName: { type: String },
  action: { type: String },
  target: { type: String },
  targetType: { type: String, enum: ['user', 'room', 'system'] },
  details: { type: Object, default: {} },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: false });

export const AdminAudit = mongoose.models.AdminAudit || mongoose.model('AdminAudit', adminAuditSchema);
export default AdminAudit;
