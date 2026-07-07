import { prisma } from '../../lib/prisma.js';
import { InventoryCategory, InventoryStatus, AlertType, AlertSeverity, NotificationType } from '@prisma/client';
import { logger } from '../../lib/logger.js';
import { writeAuditLog } from '../../utils/auditHelper.js';

export class InventoryAiService {
  /**
   * Resolve Admin Hospital ID
   */
  private async getAdminHospital(adminUserId: string) {
    const admin = await prisma.admin.findUnique({
      where: { userId: adminUserId }
    });
    if (!admin || !admin.hospitalId) throw new Error("ADMIN_NOT_ASSIGNED_TO_HOSPITAL");
    return admin.hospitalId;
  }

  /**
   * Analyze stock and generate live metrics/alerts/notifications/audit logs
   */
  async getHospitalStockAnalytics(adminUserId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    return this.calculateStockAnalyticsForHospital(hospitalId, adminUserId);
  }

  /**
   * Main calculation block
   */
  async calculateStockAnalyticsForHospital(hospitalId: string, triggerUserId?: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Load inventory items
    const items = await prisma.inventoryItem.findMany({
      where: { hospitalId },
      include: {
        alerts: {
          where: { isResolved: false }
        }
      },
      orderBy: { name: 'asc' }
    });

    const analyzedItems = [];

    // Load hospital admins to send notifications
    const admins = await prisma.admin.findMany({
      where: { hospitalId }
    });

    for (const item of items) {
      // A. Calculate dailyUsage dynamically
      let dailyUsage = item.usagePerDay || 0;

      if (dailyUsage === 0) {
        // Fallback 1: Count medication records in last 30 days
        const medCount = await prisma.medicationAdministrationRecord.count({
          where: {
            inventoryItemId: item.id,
            administeredAt: { gte: thirtyDaysAgo }
          }
        });
        if (medCount > 0) {
          dailyUsage = parseFloat((medCount / 30).toFixed(2));
        } else {
          // Fallback 2: Calculate based on depletion since restocked/creation
          const referenceDate = item.lastRestockedAt || item.createdAt;
          const daysDiff = Math.max(1, Math.round((now.getTime() - referenceDate.getTime()) / (24 * 60 * 60 * 1000)));
          const depleted = item.maxQuantity - item.quantity;
          if (depleted > 0) {
            dailyUsage = parseFloat((depleted / daysDiff).toFixed(2));
          } else {
            // Fallback 3: Standard dynamic usage profile matching size
            dailyUsage = parseFloat((item.quantity * 0.02 + 0.2).toFixed(2));
          }
        }
      }

      const weeklyUsage = parseFloat((dailyUsage * 7).toFixed(2));
      const monthlyUsage = parseFloat((dailyUsage * 30).toFixed(2));

      // B. Predicted Stock-Out Date
      let predictedStockOutDate: Date | null = null;
      if (dailyUsage > 0 && item.quantity > 0) {
        const daysRemaining = item.quantity / dailyUsage;
        predictedStockOutDate = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
      }

      // C. Recommended Reorder Quantity
      let recommendedReorderQuantity = 0;
      if (item.quantity <= item.minQuantity) {
        recommendedReorderQuantity = item.maxQuantity - item.quantity;
      }

      // D. Alerts logic
      const activeAlerts = [];
      
      // Low Stock Check
      if (item.quantity <= item.minQuantity && item.quantity > 0) {
        activeAlerts.push({
          type: AlertType.LOW_STOCK,
          severity: AlertSeverity.WARNING,
          message: `${item.name} is running low. Current: ${item.quantity} ${item.unit}. Min: ${item.minQuantity}.`
        });
      }

      // Critical Stock Check
      if (item.quantity === 0 || item.quantity <= item.minQuantity * 0.3) {
        activeAlerts.push({
          type: AlertType.CRITICAL_STOCK,
          severity: AlertSeverity.CRITICAL,
          message: `${item.name} has hit CRITICAL stock limits. Current: ${item.quantity} ${item.unit}.`
        });
      }

      // Expired Check
      if (item.expiryDate && item.expiryDate < now) {
        activeAlerts.push({
          type: AlertType.EXPIRED,
          severity: AlertSeverity.CRITICAL,
          message: `${item.name} (Batch: ${item.batchNumber || 'N/A'}) has EXPIRED on ${item.expiryDate.toLocaleDateString()}.`
        });
      }

      // Expiring Soon Check (within 30 days)
      if (item.expiryDate && item.expiryDate > now && item.expiryDate.getTime() < now.getTime() + 30 * 24 * 60 * 60 * 1000) {
        activeAlerts.push({
          type: AlertType.EXPIRING_SOON,
          severity: AlertSeverity.WARNING,
          message: `${item.name} is expiring soon on ${item.expiryDate.toLocaleDateString()}.`
        });
      }

      // E. Write Alerts & Notifications & Audit Log
      for (const alertInfo of activeAlerts) {
        const hasAlert = item.alerts.some(a => a.alertType === alertInfo.type);
        if (!hasAlert) {
          // 1. Create alert record
          const newAlert = await prisma.inventoryAlert.create({
            data: {
              inventoryItemId: item.id,
              hospitalId,
              alertType: alertInfo.type,
              severity: alertInfo.severity,
              message: alertInfo.message
            }
          });

          // 2. Create notifications for admins
          if (admins.length > 0) {
            await prisma.notification.createMany({
              data: admins.map(admin => ({
                userId: admin.userId,
                title: `AI Inventory: ${alertInfo.type.replace('_', ' ')}`,
                message: alertInfo.message,
                type: NotificationType.SYSTEM
              }))
            });
          }

          // 3. Log audit event
          if (triggerUserId) {
            await writeAuditLog(
              triggerUserId,
              `GENERATED_STOCK_ALERT_${alertInfo.type}`,
              'InventoryItem',
              item.id,
              null,
              newAlert
            );
          }
        }
      }

      analyzedItems.push({
        ...item,
        dailyUsage,
        weeklyUsage,
        monthlyUsage,
        predictedStockOutDate,
        recommendedReorderQuantity,
        activeAlertsCount: activeAlerts.length
      });
    }

    return analyzedItems;
  }

  /**
   * Get district stock comparison analytics (For District Admin)
   */
  async getDistrictStockComparison() {
    const hospitals = await prisma.hospital.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });

    const comparison = [];

    for (const h of hospitals) {
      const items = await this.calculateStockAnalyticsForHospital(h.id);
      
      const counts = {
        MEDICINE: 0,
        VACCINE: 0,
        BLOOD_UNIT: 0,
        CONSUMABLE: 0,
        EQUIPMENT: 0,
        OXYGEN: 0
      };

      let lowStockAlerts = 0;
      let criticalAlerts = 0;
      let expiredAlerts = 0;
      let expiringSoonAlerts = 0;

      for (const item of items) {
        counts[item.category as keyof typeof counts]++;

        // Count active alerts
        if (item.quantity <= item.minQuantity && item.quantity > 0) lowStockAlerts++;
        if (item.quantity === 0 || item.quantity <= item.minQuantity * 0.3) criticalAlerts++;
        if (item.expiryDate && item.expiryDate < new Date()) expiredAlerts++;
        else if (item.expiryDate && item.expiryDate.getTime() < new Date().getTime() + 30 * 24 * 60 * 60 * 1000) expiringSoonAlerts++;
      }

      comparison.push({
        hospitalId: h.id,
        hospitalName: h.name,
        district: h.district,
        totalItems: items.length,
        categoryCounts: counts,
        alerts: {
          lowStock: lowStockAlerts,
          critical: criticalAlerts,
          expired: expiredAlerts,
          expiringSoon: expiringSoonAlerts
        }
      });
    }

    return comparison;
  }
}
