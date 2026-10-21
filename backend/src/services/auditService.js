import { AuditLog } from '../models/AuditLog.js';

export async function logAudit({ user, action, entityType, entityId, previousValues, newValues, notes }) {
  try {
    await AuditLog.create({
      user: user?._id || user?.id || null,
      userName: user?.name || 'System',
      action,
      entityType,
      entityId: String(entityId || ''),
      previousValues,
      newValues,
      notes: notes || ''
    });
  } catch (err) {
    console.error('[AuditLog] Error recording audit event:', err.message);
  }
}
