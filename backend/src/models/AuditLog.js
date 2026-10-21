import mongoose from 'mongoose';
import { createEmbeddedModel } from '../config/embeddedDb.js';

let AuditLogModel;

if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'embedded') {
  const auditLogSchema = new mongoose.Schema(
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: { type: String, default: 'System' },
      action: { type: String, required: true },
      entityType: { type: String, required: true },
      entityId: { type: String, default: '' },
      previousValues: { type: mongoose.Schema.Types.Mixed },
      newValues: { type: mongoose.Schema.Types.Mixed },
      notes: { type: String, default: '' },
      timestamp: { type: Date, default: Date.now, index: true }
    },
    { timestamps: true }
  );

  AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
} else {
  AuditLogModel = createEmbeddedModel('auditlogs', {
    user: null,
    userName: 'System',
    action: '',
    entityType: '',
    entityId: '',
    previousValues: null,
    newValues: null,
    notes: '',
    timestamp: new Date()
  });
}

export const AuditLog = AuditLogModel;
