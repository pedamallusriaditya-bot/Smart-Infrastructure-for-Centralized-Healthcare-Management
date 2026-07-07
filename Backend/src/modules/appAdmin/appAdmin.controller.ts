import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { logger } from '../../lib/logger.js';
import { PerformanceService } from './performance.service.js';

const performanceService = new PerformanceService();


/**
 * PATH: GET /api/v1/app-admin/hospitals
 */
export const getHospitals = async (req: Request, res: Response): Promise<any> => {
  try {
    const status = req.query.status as string;
    const hospitals = await prisma.hospital.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        admins: {
          include: {
            user: {
              select: {
                email: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return successResponse(res, "Hospitals fetched successfully.", hospitals, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to retrieve hospitals: " + error.message, 500);
  }
};

/**
 * PATH: POST /api/v1/app-admin/hospitals/:id/approve
 */
export const approveHospital = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: { admins: true }
    });

    if (!hospital) {
      return errorResponse(res, "Hospital facility not found.", 404);
    }

    if (hospital.status === 'ACTIVE') {
      return errorResponse(res, "Hospital facility is already active.", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Set Hospital status to ACTIVE
      const updatedHospital = await tx.hospital.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          approvedAt: new Date()
        }
      });

      // 2. Set Admin User account status to ACTIVE
      if (hospital.admins.length > 0) {
        const adminRecord = hospital.admins[0];
        await tx.user.update({
          where: { id: adminRecord.userId },
          data: { status: 'ACTIVE' }
        });

        // 3. Create Notification for Hospital Admin
        await tx.notification.create({
          data: {
            userId: adminRecord.userId,
            title: 'Approval Granted',
            message: `Your hospital facility registration for "${hospital.name}" has been approved by the District Head Office. You can now login.`,
            type: 'SYSTEM'
          }
        });
      }

      return updatedHospital;
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'APPROVE_HOSPITAL',
        entity: 'Hospital',
        entityId: id,
        oldData: { status: hospital.status },
        newData: { status: 'ACTIVE' },
        details: { message: `Hospital "${hospital.name}" Approved, Activated, and Hospital Admin account activated.` }
      }
    });

    logger.info("Application Admin: Approved hospital registration", { userId: req.user!.id, hospitalId: id });
    return successResponse(res, "Hospital registration approved and administrator activated.", result, 200);
  } catch (error: any) {
    return errorResponse(res, "Approval failed: " + error.message, 500);
  }
};

/**
 * PATH: POST /api/v1/app-admin/hospitals/:id/reject
 */
export const rejectHospital = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return errorResponse(res, "Rejection reason comments are required.", 400);
    }

    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: { admins: true }
    });

    if (!hospital) {
      return errorResponse(res, "Hospital facility not found.", 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Set Hospital status to REJECTED
      const updatedHospital = await tx.hospital.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason,
          rejectedAt: new Date()
        }
      });

      // 2. Create Notification for Hospital Admin
      if (hospital.admins.length > 0) {
        const adminRecord = hospital.admins[0];
        await tx.notification.create({
          data: {
            userId: adminRecord.userId,
            title: 'Approval Rejected',
            message: `Your hospital facility registration has been rejected by the District Head Office. Reason: ${rejectionReason}`,
            type: 'SYSTEM'
          }
        });
      }

      return updatedHospital;
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'REJECT_HOSPITAL',
        entity: 'Hospital',
        entityId: id,
        oldData: { status: hospital.status },
        newData: { status: 'REJECTED', rejectionReason },
        details: { message: `Hospital "${hospital.name}" Rejected. Reason: ${rejectionReason}` }
      }
    });

    logger.warn("Application Admin: Rejected hospital registration", { userId: req.user!.id, hospitalId: id, rejectionReason });
    return successResponse(res, "Hospital registration successfully rejected.", result, 200);
  } catch (error: any) {
    return errorResponse(res, "Rejection failed: " + error.message, 500);
  }
};

/**
 * PATH: GET /api/v1/app-admin/dashboard/stats
 */
export const getDashboardStats = async (_req: Request, res: Response): Promise<any> => {
  try {
    // 1. Hospital counts
    const totalHospitals = await prisma.hospital.count();
    const pendingHospitals = await prisma.hospital.count({ where: { status: 'PENDING_APPROVAL' } });
    const activeHospitals = await prisma.hospital.count({ where: { status: 'ACTIVE' } });
    const rejectedHospitals = await prisma.hospital.count({ where: { status: 'REJECTED' } });

    // 2. Doctor and Patient counts
    const totalDoctors = await prisma.doctor.count({ where: { status: 'ACTIVE' } });
    const totalPatients = await prisma.patient.count();

    // 3. Bed statistics
    const totalBeds = await prisma.bed.count();
    const occupiedBeds = await prisma.bed.count({ where: { status: 'OCCUPIED' } });
    const availableBeds = await prisma.bed.count({ where: { status: 'AVAILABLE' } });

    // 4. Low stock inventory alerts (Medicines count with stock <= 10)
    const lowStockAlerts = await prisma.medicine.count({ where: { stock: { lte: 10 } } });

    // 5. Active Emergency cases (status is ACTIVE or DISPATCHED)
    const activeEmergencies = await prisma.emergency.count({
      where: { status: { in: ['ACTIVE', 'DISPATCHED'] } }
    });

    // 6. Total admissions count
    const totalAdmissions = await prisma.admission.count();

    // 7. Unresolved inventory alerts count
    const inventoryAlertsCount = await prisma.inventoryAlert.count({
      where: { isResolved: false }
    });

    // 8. Outbreak warning notifications count
    const outbreakAlertsCount = await prisma.notification.count({
      where: { title: { contains: 'OUTBREAK', mode: 'insensitive' } }
    });

    // 9. Resource transfers (redistributions) count
    const resourceTransfersCount = await prisma.resourceTransfer.count({
      where: { status: 'PENDING' }
    });

    // 10. Present Doctors today
    const presentDoctorsCount = await prisma.doctorAttendance.count({
      where: { status: 'PRESENT' }
    });

    // Extra District counts
    const totalNurses = await prisma.nurse.count();
    const totalPharmacists = await prisma.pharmacist.count();
    const totalLabTechnicians = await prisma.labTechnician.count();
    
    // Count total unique inventory item records of category MEDICINE
    const totalMedicines = await prisma.inventoryItem.count({
      where: { category: 'MEDICINE' }
    });

    // Group active low stock inventory alerts by hospitalId to count unique hospitals
    const lowStockHospitalsGroup = await prisma.inventoryAlert.groupBy({
      by: ['hospitalId'],
      where: { isResolved: false, alertType: 'LOW_STOCK' }
    });
    const lowStockHospitalsCount = lowStockHospitalsGroup.length;

    // 11. Hospital Rankings (Performance scores)
    const hospitalRankings = await performanceService.getPerformanceScoring();

    // 12. District group counts
    const rawDistrictStats = await prisma.hospital.groupBy({
      by: ['district'],
      _count: { id: true },
      where: { status: 'ACTIVE' }
    });

    const districtStats = rawDistrictStats.map(d => ({
      district: d.district || 'Unassigned District',
      count: d._count.id
    }));

    // 13. Active Hospital maps coordinates
    const mapCoordinates = await prisma.hospital.findMany({
      where: { status: 'ACTIVE', latitude: { not: null }, longitude: { not: null } },
      select: { id: true, name: true, latitude: true, longitude: true, type: true, district: true }
    });

    return successResponse(res, "Analytics dashboard statistics loaded.", {
      hospitalCounts: {
        total: totalHospitals,
        pending: pendingHospitals,
        active: activeHospitals,
        rejected: rejectedHospitals
      },
      doctorCount: totalDoctors,
      nurseCount: totalNurses,
      pharmacistCount: totalPharmacists,
      labTechnicianCount: totalLabTechnicians,
      patientCount: totalPatients,
      bedStats: {
        total: totalBeds,
        occupied: occupiedBeds,
        available: availableBeds
      },
      inventory: {
        lowStock: lowStockAlerts,
        alerts: inventoryAlertsCount,
        totalMedicines,
        lowStockHospitalsCount
      },
      emergency: {
        active: activeEmergencies
      },
      admissions: {
        total: totalAdmissions
      },
      outbreakAlertsCount,
      resourceTransfersCount,
      presentDoctorsCount,
      hospitalRankings,
      districtStats,
      mapCoordinates
    }, 200);
  } catch (error: any) {
    return errorResponse(res, "Stats retrieval failed: " + error.message, 500);
  }
};

/**
 * PATH: GET /api/v1/app-admin/performance
 */
export const getHospitalPerformanceScoring = async (_req: Request, res: Response): Promise<any> => {
  try {
    const data = await performanceService.getPerformanceScoring();
    return successResponse(res, "Hospital performance scores and rankings retrieved successfully.", data, 200);
  } catch (error: any) {
    logger.error(`Error in getHospitalPerformanceScoring: ${error.message}`);
    return errorResponse(res, "Failed to retrieve hospital performance scores: " + error.message, 500);
  }
};

/**
 * PATH: GET /api/v1/app-admin/notifications
 */
export const getNotifications = async (req: Request, res: Response): Promise<any> => {
  try {
    const adminUser = req.user!;
    const notifications = await prisma.notification.findMany({
      where: { userId: adminUser.id },
      orderBy: { createdAt: 'desc' }
    });
    return successResponse(res, "Notifications retrieved successfully.", notifications, 200);
  } catch (error: any) {
    logger.error(`Error in getNotifications: ${error.message}`);
    return errorResponse(res, "Failed to retrieve notifications: " + error.message, 500);
  }
};

/**
 * PATH: POST /api/v1/app-admin/notifications/:id/read
 */
export const markNotificationRead = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const adminUser = req.user!;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: adminUser.id }
    });

    if (!notification) {
      return errorResponse(res, "Notification alert not found.", 404);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    return successResponse(res, "Notification marked as read.", updated, 200);
  } catch (error: any) {
    logger.error(`Error in markNotificationRead: ${error.message}`);
    return errorResponse(res, "Failed to update notification status: " + error.message, 500);
  }
};

/**
 * PATH: POST /api/v1/app-admin/hospitals/:id/suspend
 */
export const suspendHospital = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: { admins: true }
    });

    if (!hospital) {
      return errorResponse(res, "Hospital facility not found.", 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Set Hospital status to REJECTED (acting as suspended)
      const updatedHospital = await tx.hospital.update({
        where: { id },
        data: {
          status: 'REJECTED'
        }
      });

      // 2. Set Admin User account status to SUSPENDED
      for (const admin of hospital.admins) {
        await tx.user.update({
          where: { id: admin.userId },
          data: { status: 'SUSPENDED' }
        });
      }

      return updatedHospital;
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'SUSPEND_HOSPITAL',
        entity: 'Hospital',
        entityId: id,
        oldData: { status: hospital.status },
        newData: { status: 'REJECTED (SUSPENDED)' },
        details: { message: `Hospital "${hospital.name}" and its admin accounts suspended.` }
      }
    });

    return successResponse(res, "Hospital successfully suspended.", result, 200);
  } catch (error: any) {
    return errorResponse(res, "Suspension failed: " + error.message, 500);
  }
};

/**
 * PATH: POST /api/v1/app-admin/hospitals/:id/activate
 */
export const activateHospital = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: { admins: true }
    });

    if (!hospital) {
      return errorResponse(res, "Hospital facility not found.", 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Set Hospital status to ACTIVE
      const updatedHospital = await tx.hospital.update({
        where: { id },
        data: {
          status: 'ACTIVE'
        }
      });

      // 2. Set Admin User account status to ACTIVE
      for (const admin of hospital.admins) {
        await tx.user.update({
          where: { id: admin.userId },
          data: { status: 'ACTIVE' }
        });
      }

      return updatedHospital;
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'ACTIVATE_HOSPITAL',
        entity: 'Hospital',
        entityId: id,
        oldData: { status: hospital.status },
        newData: { status: 'ACTIVE' },
        details: { message: `Hospital "${hospital.name}" and its admin accounts activated.` }
      }
    });

    return successResponse(res, "Hospital successfully activated.", result, 200);
  } catch (error: any) {
    return errorResponse(res, "Activation failed: " + error.message, 500);
  }
};


