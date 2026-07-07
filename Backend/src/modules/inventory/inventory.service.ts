import { prisma } from '../../lib/prisma.js';
import { InventoryCategory, InventoryStatus, AlertSeverity, AlertType } from '@prisma/client';
import { logger } from '../../lib/logger.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeStatus(
  quantity: number,
  minQuantity: number,
  expiryDate: Date | null | undefined
): InventoryStatus {
  const today = new Date();

  if (expiryDate && expiryDate <= today) return InventoryStatus.EXPIRED;
  if (quantity === 0) return InventoryStatus.OUT_OF_STOCK;
  if (quantity <= minQuantity * 0.5) return InventoryStatus.CRITICAL;
  if (quantity <= minQuantity) return InventoryStatus.LOW_STOCK;
  return InventoryStatus.ADEQUATE;
}

function computeDaysRemaining(expiryDate: Date | null | undefined): number | null {
  if (!expiryDate) return null;
  const diff = expiryDate.getTime() - Date.now();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function computeTrend(quantity: number, usagePerDay: number | null | undefined): string {
  if (!usagePerDay || usagePerDay <= 0) return 'STABLE';
  const daysLeft = quantity / usagePerDay;
  if (daysLeft <= 3) return 'CRITICAL';
  if (daysLeft <= 7) return 'LOW';
  return 'STABLE';
}

function enrichItem(item: any) {
  const daysRemaining = computeDaysRemaining(item.expiryDate);
  const trend = computeTrend(item.quantity, item.usagePerDay);
  const stockPercent = item.maxQuantity > 0
    ? Math.min(100, Math.round((item.quantity / item.maxQuantity) * 100))
    : null;
  return { ...item, daysRemaining, trend, stockPercent };
}

// ─── Alert Generator ─────────────────────────────────────────────────────────

async function syncAlerts(item: any, hospitalId: string) {
  // Determine which alerts should be ACTIVE for this item
  const activeAlertTypes: { type: AlertType; severity: AlertSeverity; message: string }[] = [];

  const today = new Date();
  const daysRemaining = computeDaysRemaining(item.expiryDate);

  if (item.expiryDate && item.expiryDate <= today) {
    activeAlertTypes.push({
      type: AlertType.EXPIRED,
      severity: AlertSeverity.CRITICAL,
      message: `${item.name} (${item.category}) has EXPIRED. Immediate disposal required.`
    });
  } else if (daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0) {
    activeAlertTypes.push({
      type: AlertType.EXPIRING_SOON,
      severity: daysRemaining <= 7 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
      message: `${item.name} expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`
    });
  }

  if (item.quantity === 0) {
    activeAlertTypes.push({
      type: AlertType.OUT_OF_STOCK,
      severity: AlertSeverity.CRITICAL,
      message: `${item.name} (${item.category}) is OUT OF STOCK.`
    });
  } else if (item.quantity <= item.minQuantity * 0.5 && item.quantity > 0) {
    activeAlertTypes.push({
      type: AlertType.CRITICAL_STOCK,
      severity: AlertSeverity.CRITICAL,
      message: `${item.name} stock is critically low (${item.quantity} ${item.unit} remaining — below 50% of minimum).`
    });
  } else if (item.quantity <= item.minQuantity) {
    activeAlertTypes.push({
      type: AlertType.LOW_STOCK,
      severity: AlertSeverity.WARNING,
      message: `${item.name} stock is low (${item.quantity} ${item.unit} remaining, minimum is ${item.minQuantity}).`
    });
  }

  // Resolve all existing open alerts for this item (we'll recreate valid ones)
  await prisma.inventoryAlert.updateMany({
    where: { inventoryItemId: item.id, isResolved: false },
    data: { isResolved: true, resolvedAt: new Date() }
  });

  // Create fresh alerts
  if (activeAlertTypes.length > 0) {
    await prisma.inventoryAlert.createMany({
      data: activeAlertTypes.map(a => ({
        inventoryItemId: item.id,
        hospitalId,
        alertType: a.type,
        severity: a.severity,
        message: a.message,
        isResolved: false
      }))
    });
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class InventoryService {
  private async getAdminHospital(adminUserId: string): Promise<string> {
    const admin = await prisma.admin.findUnique({ where: { userId: adminUserId } });
    if (!admin || !admin.hospitalId) throw new Error('ADMIN_NOT_ASSIGNED_TO_HOSPITAL');
    return admin.hospitalId;
  }

  // ─ List items ─────────────────────────────────────────────────────────────
  async getInventory(adminUserId: string, category?: string, requestId?: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);

    const where: any = { hospitalId };
    if (category && Object.values(InventoryCategory).includes(category as InventoryCategory)) {
      where.category = category as InventoryCategory;
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: [{ status: 'desc' }, { name: 'asc' }]
    });

    logger.info('Inventory list fetched', { requestId, hospitalId, count: items.length });
    return items.map(enrichItem);
  }

  // ─ Single item ────────────────────────────────────────────────────────────
  async getInventoryItem(adminUserId: string, itemId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);

    const item = await prisma.inventoryItem.findFirst({
      where: { id: itemId, hospitalId },
      include: {
        alerts: {
          where: { isResolved: false },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!item) throw new Error('INVENTORY_ITEM_NOT_FOUND');
    return enrichItem(item);
  }

  // ─ Create ─────────────────────────────────────────────────────────────────
  async createItem(adminUserId: string, data: any, requestId?: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);

    const status = computeStatus(
      data.quantity ?? 0,
      data.minQuantity ?? 0,
      data.expiryDate ? new Date(data.expiryDate) : null
    );

    const item = await prisma.inventoryItem.create({
      data: {
        hospitalId,
        category: data.category as InventoryCategory,
        name: data.name,
        quantity: data.quantity ?? 0,
        minQuantity: data.minQuantity ?? 0,
        maxQuantity: data.maxQuantity ?? 0,
        unit: data.unit ?? 'units',
        supplier: data.supplier ?? null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        batchNumber: data.batchNumber ?? null,
        unitCost: data.unitCost ?? 0,
        usagePerDay: data.usagePerDay ?? null,
        notes: data.notes ?? null,
        lastRestockedAt: data.quantity > 0 ? new Date() : null,
        status
      }
    });

    await syncAlerts(item, hospitalId);

    logger.info('Inventory item created', { requestId, hospitalId, itemId: item.id, name: item.name });
    return enrichItem(item);
  }

  // ─ Update ─────────────────────────────────────────────────────────────────
  async updateItem(adminUserId: string, itemId: string, data: any, requestId?: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);

    const existing = await prisma.inventoryItem.findFirst({ where: { id: itemId, hospitalId } });
    if (!existing) throw new Error('INVENTORY_ITEM_NOT_FOUND');

    const newQty = data.quantity ?? existing.quantity;
    const newMin = data.minQuantity ?? existing.minQuantity;
    const newExpiry = data.expiryDate !== undefined
      ? (data.expiryDate ? new Date(data.expiryDate) : null)
      : existing.expiryDate;

    const status = computeStatus(newQty, newMin, newExpiry);

    // Track restock
    const wasRestocked = data.quantity !== undefined && data.quantity > existing.quantity;

    const item = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        name: data.name ?? existing.name,
        category: (data.category as InventoryCategory) ?? existing.category,
        quantity: newQty,
        minQuantity: newMin,
        maxQuantity: data.maxQuantity ?? existing.maxQuantity,
        unit: data.unit ?? existing.unit,
        supplier: data.supplier !== undefined ? data.supplier : existing.supplier,
        expiryDate: newExpiry,
        batchNumber: data.batchNumber !== undefined ? data.batchNumber : existing.batchNumber,
        unitCost: data.unitCost ?? existing.unitCost,
        usagePerDay: data.usagePerDay !== undefined ? data.usagePerDay : existing.usagePerDay,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        lastRestockedAt: wasRestocked ? new Date() : existing.lastRestockedAt,
        status
      }
    });

    await syncAlerts(item, hospitalId);

    logger.info('Inventory item updated', { requestId, hospitalId, itemId, status });
    return enrichItem(item);
  }

  // ─ Delete ─────────────────────────────────────────────────────────────────
  async deleteItem(adminUserId: string, itemId: string, requestId?: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);

    const existing = await prisma.inventoryItem.findFirst({ where: { id: itemId, hospitalId } });
    if (!existing) throw new Error('INVENTORY_ITEM_NOT_FOUND');

    await prisma.inventoryItem.delete({ where: { id: itemId } });

    logger.info('Inventory item deleted', { requestId, hospitalId, itemId, name: existing.name });
    return { deleted: true };
  }

  // ─ Alerts ─────────────────────────────────────────────────────────────────
  async getAlerts(adminUserId: string, onlyUnresolved: boolean = true, requestId?: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);

    const alerts = await prisma.inventoryAlert.findMany({
      where: {
        hospitalId,
        ...(onlyUnresolved ? { isResolved: false } : {})
      },
      include: {
        inventoryItem: {
          select: { name: true, category: true, quantity: true, unit: true }
        }
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }]
    });

    logger.info('Inventory alerts fetched', { requestId, hospitalId, count: alerts.length });
    return alerts;
  }

  async resolveAlert(adminUserId: string, alertId: string, requestId?: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);

    const alert = await prisma.inventoryAlert.findFirst({
      where: { id: alertId, hospitalId }
    });
    if (!alert) throw new Error('ALERT_NOT_FOUND');

    const updated = await prisma.inventoryAlert.update({
      where: { id: alertId },
      data: { isResolved: true, resolvedAt: new Date() }
    });

    logger.info('Inventory alert resolved', { requestId, hospitalId, alertId });
    return updated;
  }

  // ─ Dashboard Summary ─────────────────────────────────────────────────────
  async getDashboardSummary(adminUserId: string, requestId?: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);

    const [
      totalItems,
      lowStockCount,
      criticalCount,
      outOfStockCount,
      expiredCount,
      expiringCount,
      activeAlertCount,
      categoryBreakdown
    ] = await Promise.all([
      prisma.inventoryItem.count({ where: { hospitalId } }),
      prisma.inventoryItem.count({ where: { hospitalId, status: InventoryStatus.LOW_STOCK } }),
      prisma.inventoryItem.count({ where: { hospitalId, status: InventoryStatus.CRITICAL } }),
      prisma.inventoryItem.count({ where: { hospitalId, status: InventoryStatus.OUT_OF_STOCK } }),
      prisma.inventoryItem.count({ where: { hospitalId, status: InventoryStatus.EXPIRED } }),
      prisma.inventoryItem.count({
        where: {
          hospitalId,
          expiryDate: {
            gt: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.inventoryAlert.count({ where: { hospitalId, isResolved: false } }),
      prisma.inventoryItem.groupBy({
        by: ['category'],
        where: { hospitalId },
        _count: { id: true },
        _sum: { quantity: true }
      })
    ]);

    logger.info('Inventory dashboard summary generated', { requestId, hospitalId });
    return {
      totalItems,
      lowStockCount,
      criticalCount,
      outOfStockCount,
      expiredCount,
      expiringCount,
      activeAlertCount,
      categoryBreakdown: categoryBreakdown.map(c => ({
        category: c.category,
        count: c._count.id,
        totalQuantity: c._sum.quantity ?? 0
      }))
    };
  }
}
