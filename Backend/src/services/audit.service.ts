// backend/src/services/audit.service.ts
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

export const logAction = async (
  action: string, 
  entity: string, 
  entityId: string, 
  userId: string, 
  details?: any
) => {
  const auditData: Prisma.AuditLogUncheckedCreateInput = {
    action,
    entity,
    entityId,
    userId,
    details: details || null,
  };

  return await prisma.auditLog.create({
    data: auditData,
  });
};