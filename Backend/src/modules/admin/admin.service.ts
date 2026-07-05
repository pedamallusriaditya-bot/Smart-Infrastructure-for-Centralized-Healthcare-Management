import { prisma } from '../../lib/prisma.js';
import { UserStatus, ApprovalStatus, StaffStatus } from '@prisma/client';
import { logger } from '../../lib/logger.js';
import { hashPassword } from '../../utils/password.util.js';

export class AdminService {
  /**
   * Helper: Get Admin's Hospital Context
   */
  private async getAdminHospital(adminUserId: string) {
    const admin = await prisma.admin.findUnique({ where: { userId: adminUserId } });
    if (!admin || !admin.hospitalId) throw new Error("ADMIN_NOT_ASSIGNED_TO_HOSPITAL");
    return admin.hospitalId;
  }

  /**
   * Metrics scoped to the Admin's specific hospital
   */
  async getSystemMetrics(adminUserId: string, requestId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);

    const [patients, doctors, labOrders, rooms] = await Promise.all([
      prisma.patient.count({ where: { appointments: { some: { doctor: { department: { hospitalId } } } } } }),
      prisma.doctor.count({ where: { department: { hospitalId } } }),
      prisma.labOrder.count({ where: { doctor: { department: { hospitalId } } } }),
      prisma.room.findMany({
        where: { hospitalId },
        include: { beds: { select: { status: true } } }
      })
    ]);

    const totalBeds = rooms.reduce((acc, r) => acc + r.beds.length, 0);
    const occupiedBeds = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'OCCUPIED').length, 0);

    // FIXED: Consuming requestId in log
    logger.info("Admin Metrics Generated", { 
      requestId, 
      adminUserId, 
      hospitalId,
      timestamp: new Date().toISOString() 
    });

    return {
      stats: { patients, doctors, labOrders, totalBeds, occupiedBeds },
      occupancyRate: totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) + '%' : '0%'
    };
  }

  /**
   * Detailed Room-by-Room Statistics
   */
  async getBedOccupancy(adminUserId: string, requestId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);

    const roomStats = await prisma.room.findMany({
      where: { hospitalId },
      select: {
        roomNumber: true,
        type: true,
        _count: { select: { beds: true } },
        beds: { select: { bedNumber: true, status: true } }
      }
    });

    // FIXED: Consuming requestId in log
    logger.info("Bed Occupancy Report Accessed", { requestId, hospitalId });
    return roomStats;
  }

  async reviewDoctor(adminUserId: string, doctorId: string, status: 'APPROVED' | 'REJECTED', requestId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    const doctor = await prisma.doctor.findFirst({ 
        where: { id: doctorId, department: { hospitalId } } 
    });

    if (!doctor) throw new Error("DOCTOR_NOT_IN_YOUR_HOSPITAL");

    const updated = await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        approvalStatus: status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        verifiedAt: new Date(),
        verifiedBy: adminUserId
      }
    });

    // FIXED: Consuming requestId in log
    logger.warn(`Doctor Review Action: ${status}`, { requestId, adminUserId, targetDoctorId: doctorId });
    return updated;
  }

  async getPendingDoctors(adminUserId: string, requestId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    
    const pending = await prisma.doctor.findMany({
      where: { 
        approvalStatus: ApprovalStatus.PENDING,
        department: { hospitalId } 
      },
      include: { 
        department: { select: { name: true } }, 
        user: { select: { email: true } } 
      }
    });

    // FIXED: Consuming requestId in log
    logger.info("Pending Doctors List Fetched", { requestId, hospitalId, count: pending.length });
    return pending;
  }

  async getAuditHistory(page: number, limit: number, requestId: string) {
    const skip = (page - 1) * limit;
    const [records, total] = await prisma.$transaction([
      prisma.loginHistory.findMany({
        take: limit, 
        skip,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } } }
      }),
      prisma.loginHistory.count()
    ]);

    // FIXED: Consuming requestId in log
    logger.info("System Audit History Accessed", { requestId, page });
    return { records, meta: { total, page } };
  }

  async suspendUser(targetId: string, adminId: string, requestId: string) {
    if (targetId === adminId) throw new Error("SELF_SUSPEND_FORBIDDEN");

    return prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId: targetId } });
      
      const suspended = await tx.user.update({
        where: { id: targetId },
        data: { status: UserStatus.SUSPENDED, deletedAt: new Date() }
      });

      // FIXED: Consuming requestId in log
      logger.error("User Suspended by Admin", { requestId, adminId, targetUserId: targetId });
      return suspended;
    });
  }

  /**
   * Create a new Department linked to the Admin's Hospital
   */
  async createDepartment(adminUserId: string, name: string, status: 'ACTIVE' | 'INACTIVE', requestId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    const existing = await prisma.department.findFirst({
      where: { hospitalId, name }
    });
    if (existing) throw new Error("DEPARTMENT_ALREADY_EXISTS");

    const dept = await prisma.department.create({
      data: {
        name,
        status: status as any,
        hospitalId
      }
    });
    logger.info("Department created by Admin", { requestId, adminUserId, hospitalId, departmentId: dept.id });
    return dept;
  }

  /**
   * Update Department name or toggle active/inactive status
   */
  async updateDepartment(adminUserId: string, departmentId: string, name: string, status: 'ACTIVE' | 'INACTIVE', requestId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, hospitalId }
    });
    if (!dept) throw new Error("DEPARTMENT_NOT_FOUND_IN_YOUR_HOSPITAL");

    const updated = await prisma.department.update({
      where: { id: departmentId },
      data: {
        name: name || undefined,
        status: (status as any) || undefined
      }
    });
    logger.info("Department updated by Admin", { requestId, adminUserId, departmentId });
    return updated;
  }

  /**
   * Fetch statistics for all clinical departments in the Admin's hospital
   */
  async getDepartmentStats(adminUserId: string, requestId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    const depts = await prisma.department.findMany({
      where: { hospitalId },
      include: {
        _count: { select: { doctors: true } },
        doctors: {
          select: {
            appointments: { select: { id: true } }
          }
        }
      }
    });

    const stats = depts.map(d => {
      const appointmentsCount = d.doctors.reduce((sum, doc) => sum + doc.appointments.length, 0);
      return {
        id: d.id,
        name: d.name,
        status: d.status,
        doctorsCount: d._count.doctors,
        appointmentsCount
      };
    });

    logger.info("Department stats fetched by Admin", { requestId, hospitalId });
    return stats;
  }

  /**
   * Fetch all staff (Doctors & Lab Technicians) belonging to the Admin's Hospital
   */
  async getHospitalStaff(adminUserId: string, requestId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    const [doctors, technicians] = await Promise.all([
      prisma.doctor.findMany({
        where: { department: { hospitalId } },
        include: { department: { select: { name: true } } }
      }),
      prisma.labTechnician.findMany()
    ]);

    const formattedDocs = doctors.map(d => ({
      id: d.id,
      userId: d.userId,
      firstName: d.firstName,
      lastName: d.lastName,
      role: 'DOCTOR',
      specialty: d.specialization,
      department: d.department.name,
      license: d.licenseNumber,
      status: d.status
    }));

    const formattedTechs = technicians.map(t => ({
      id: t.id,
      userId: t.userId,
      firstName: t.firstName,
      lastName: t.lastName,
      role: 'LAB_TECHNICIAN',
      specialty: 'LIS Diagnostics',
      department: 'Laboratory',
      license: t.employeeId,
      status: t.status
    }));

    logger.info("Hospital staff fetched by Admin", { requestId, hospitalId });
    return [...formattedDocs, ...formattedTechs];
  }

  /**
   * Create User and Role profile for Doctors / Lab Technicians
   */
  async registerStaffUser(adminUserId: string, data: any, requestId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    const { email, password, firstName, lastName, role, departmentId, licenseNumber, employeeId, specialization } = data;

    const hashedPassword = await hashPassword(password);
    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) throw new Error("INVALID_ROLE");

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          roleId: roleRecord.id
        }
      });

      if (role === 'DOCTOR') {
        if (!departmentId) throw new Error("DEPARTMENT_ID_REQUIRED");
        const dept = await tx.department.findFirst({ where: { id: departmentId, hospitalId } });
        if (!dept) throw new Error("DEPARTMENT_NOT_FOUND_IN_YOUR_HOSPITAL");

        await tx.doctor.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            specialization: specialization || 'GENERAL_MEDICINE',
            licenseNumber,
            departmentId,
            approvalStatus: ApprovalStatus.APPROVED,
            status: StaffStatus.ACTIVE
          }
        });
      } else if (role === 'LAB_TECHNICIAN') {
        await tx.labTechnician.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            employeeId,
            status: StaffStatus.ACTIVE
          }
        });
      }

      logger.info("Staff user registered by Admin", { requestId, adminUserId, email, role });
      return user;
    });
  }
}