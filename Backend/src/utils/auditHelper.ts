import { prisma } from '../lib/prisma.js';

export const writeAuditLog = async (
  userId: string | null,
  action: string,
  entity: string,
  entityId: string,
  oldData?: any,
  newData?: any,
  ipAddress?: string,
  details?: any
) => {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
        newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined,
        ipAddress: ipAddress || '127.0.0.1',
        details: details || {}
      }
    });
  } catch (error: any) {
    console.error('Failed to write audit log:', error.message);
    return null;
  }
};
