import { prisma } from '../../lib/prisma.js';
import { AttendanceStatus } from '@prisma/client';
import { logger } from '../../lib/logger.js';
import { writeAuditLog } from '../../utils/auditHelper.js';

export class AttendanceService {
  /**
   * Resolve Doctor by User ID
   */
  async getDoctorProfile(userId: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
      include: {
        department: true
      }
    });
    if (!doctor) throw new Error("DOCTOR_NOT_FOUND");
    return doctor;
  }

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
   * Normalize current date to 00:00:00.000 for date-based unique indexing
   */
  getTodayNormalized() {
    const d = new Date();
    // Normalize to midnight UTC or local. Let's use UTC or local consistently.
    // Setting hours to 0,0,0,0 local is standard.
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Check-In Doctor
   */
  async checkIn(doctorUserId: string) {
    const doctor = await this.getDoctorProfile(doctorUserId);
    const hospitalId = doctor.department.hospitalId;
    const today = this.getTodayNormalized();

    const existingRecord = await prisma.doctorAttendance.findUnique({
      where: {
        doctorId_date: {
          doctorId: doctor.id,
          date: today
        }
      }
    });

    if (existingRecord && existingRecord.checkInTime) {
      throw new Error("ALREADY_CHECKED_IN");
    }

    const checkInTime = new Date();
    // Determine if late (Check-in after 09:00 AM local time)
    const isLate = checkInTime.getHours() >= 9;

    const record = await prisma.doctorAttendance.upsert({
      where: {
        doctorId_date: {
          doctorId: doctor.id,
          date: today
        }
      },
      update: {
        checkInTime,
        status: AttendanceStatus.PRESENT,
        isLate,
        hospitalId
      },
      create: {
        doctorId: doctor.id,
        hospitalId,
        date: today,
        checkInTime,
        status: AttendanceStatus.PRESENT,
        isLate
      }
    });

    // Log in audit log
    await writeAuditLog(
      doctorUserId,
      'DOCTOR_CHECK_IN',
      'DoctorAttendance',
      record.id,
      existingRecord,
      record
    );

    logger.info("Doctor checked in successfully", { doctorId: doctor.id, time: checkInTime });
    return record;
  }

  /**
   * Check-Out Doctor
   */
  async checkOut(doctorUserId: string) {
    const doctor = await this.getDoctorProfile(doctorUserId);
    const today = this.getTodayNormalized();

    const record = await prisma.doctorAttendance.findUnique({
      where: {
        doctorId_date: {
          doctorId: doctor.id,
          date: today
        }
      }
    });

    if (!record || !record.checkInTime) {
      throw new Error("NOT_CHECKED_IN");
    }

    if (record.checkOutTime) {
      throw new Error("ALREADY_CHECKED_OUT");
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(record.checkInTime);
    // Calculate working hours in decimals (hours)
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    const workingHours = parseFloat(hours.toFixed(2));

    const updated = await prisma.doctorAttendance.update({
      where: {
        id: record.id
      },
      data: {
        checkOutTime,
        workingHours
      }
    });

    // Audit log record
    await writeAuditLog(
      doctorUserId,
      'DOCTOR_CHECK_OUT',
      'DoctorAttendance',
      record.id,
      record,
      updated
    );

    logger.info("Doctor checked out successfully", { doctorId: doctor.id, hours: workingHours });
    return updated;
  }

  /**
   * Update Attendance Status (BREAK, EMERGENCY_DUTY, ON_LEAVE)
   */
  async updateStatus(doctorUserId: string, status: AttendanceStatus, notes?: string) {
    const doctor = await this.getDoctorProfile(doctorUserId);
    const hospitalId = doctor.department.hospitalId;
    const today = this.getTodayNormalized();

    const existingRecord = await prisma.doctorAttendance.findUnique({
      where: {
        doctorId_date: {
          doctorId: doctor.id,
          date: today
        }
      }
    });

    // If setting to BREAK or EMERGENCY_DUTY, require they check in first
    if ((status === AttendanceStatus.BREAK || status === AttendanceStatus.EMERGENCY_DUTY) && (!existingRecord || !existingRecord.checkInTime)) {
      throw new Error("MUST_CHECK_IN_BEFORE_CHANGING_STATUS");
    }

    const record = await prisma.doctorAttendance.upsert({
      where: {
        doctorId_date: {
          doctorId: doctor.id,
          date: today
        }
      },
      update: {
        status,
        notes: notes || null,
        hospitalId
      },
      create: {
        doctorId: doctor.id,
        hospitalId,
        date: today,
        status,
        notes: notes || null,
        // If they go straight to ON_LEAVE, checkInTime is null
        checkInTime: status === AttendanceStatus.ON_LEAVE ? null : new Date()
      }
    });

    // Audit log record
    await writeAuditLog(
      doctorUserId,
      'DOCTOR_ATTENDANCE_STATUS_UPDATE',
      'DoctorAttendance',
      record.id,
      existingRecord,
      record
    );

    logger.info("Doctor attendance status updated", { doctorId: doctor.id, status });
    return record;
  }

  /**
   * Get Active Today Attendance Record
   */
  async getMyTodayAttendance(doctorUserId: string) {
    const doctor = await this.getDoctorProfile(doctorUserId);
    const today = this.getTodayNormalized();

    return prisma.doctorAttendance.findUnique({
      where: {
        doctorId_date: {
          doctorId: doctor.id,
          date: today
        }
      }
    });
  }

  /**
   * Get Doctor Attendance Summary for current month
   */
  async getMyAttendanceSummary(doctorUserId: string) {
    const doctor = await this.getDoctorProfile(doctorUserId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const attendances = await prisma.doctorAttendance.findMany({
      where: {
        doctorId: doctor.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    const totalDays = attendances.length;
    const presentDays = attendances.filter(a => 
      a.status === AttendanceStatus.PRESENT || 
      a.status === AttendanceStatus.EMERGENCY_DUTY || 
      a.status === AttendanceStatus.BREAK
    ).length;

    const onLeaveDays = attendances.filter(a => a.status === AttendanceStatus.ON_LEAVE).length;
    const lateArrivals = attendances.filter(a => a.isLate && a.status === AttendanceStatus.PRESENT).length;
    const totalWorkingHours = attendances.reduce((acc, curr) => acc + (curr.workingHours || 0), 0);
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    return {
      summary: {
        totalDays,
        presentDays,
        onLeaveDays,
        lateArrivals,
        totalWorkingHours: parseFloat(totalWorkingHours.toFixed(1)),
        attendancePercentage
      },
      history: attendances
    };
  }

  /**
   * Hospital Admin: Today's Doctor Attendance Registry
   */
  async getHospitalAttendanceToday(adminUserId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    const today = this.getTodayNormalized();

    return prisma.doctorAttendance.findMany({
      where: {
        hospitalId,
        date: today
      },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true
          }
        }
      },
      orderBy: {
        checkInTime: 'asc'
      }
    });
  }

  /**
   * Hospital Admin: Detailed Facility Metrics & Summary
   */
  async getHospitalAttendanceMetrics(adminUserId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    const today = this.getTodayNormalized();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [todayRecords, monthRecords, totalDoctors] = await Promise.all([
      prisma.doctorAttendance.findMany({
        where: { hospitalId, date: today }
      }),
      prisma.doctorAttendance.findMany({
        where: {
          hospitalId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      }),
      prisma.doctor.count({
        where: { department: { hospitalId } }
      })
    ]);

    // Today's breakdowns
    const presentToday = todayRecords.filter(r => 
      r.status === AttendanceStatus.PRESENT || 
      r.status === AttendanceStatus.EMERGENCY_DUTY || 
      r.status === AttendanceStatus.BREAK
    ).length;

    const breakToday = todayRecords.filter(r => r.status === AttendanceStatus.BREAK).length;
    const emergencyToday = todayRecords.filter(r => r.status === AttendanceStatus.EMERGENCY_DUTY).length;
    const leaveToday = todayRecords.filter(r => r.status === AttendanceStatus.ON_LEAVE).length;
    const lateToday = todayRecords.filter(r => r.isLate && r.status === AttendanceStatus.PRESENT).length;
    const absentToday = totalDoctors - (presentToday + leaveToday);

    // Monthly stats
    const totalMonthRecords = monthRecords.length;
    const presentMonthRecords = monthRecords.filter(r => 
      r.status === AttendanceStatus.PRESENT || 
      r.status === AttendanceStatus.EMERGENCY_DUTY || 
      r.status === AttendanceStatus.BREAK
    ).length;

    const monthlyPercentage = totalMonthRecords > 0 ? Math.round((presentMonthRecords / totalMonthRecords) * 100) : 100;
    const monthlyLateArrivals = monthRecords.filter(r => r.isLate && r.status === AttendanceStatus.PRESENT).length;

    return {
      today: {
        totalDoctors,
        presentToday,
        absentToday: absentToday > 0 ? absentToday : 0,
        breakToday,
        emergencyToday,
        leaveToday,
        lateToday
      },
      monthly: {
        attendancePercentage: monthlyPercentage,
        lateArrivals: monthlyLateArrivals,
        totalLogsCount: totalMonthRecords
      }
    };
  }

  /**
   * Application Admin: District Attendance Summary
   */
  async getDistrictAttendanceSummary() {
    const today = this.getTodayNormalized();

    const [todayRecords, totalDoctors] = await Promise.all([
      prisma.doctorAttendance.findMany({}),
      prisma.doctor.count({})
    ]);

    const presentToday = todayRecords.filter(r => 
      r.date.getTime() === today.getTime() && 
      (r.status === AttendanceStatus.PRESENT || 
       r.status === AttendanceStatus.EMERGENCY_DUTY || 
       r.status === AttendanceStatus.BREAK)
    ).length;

    const breakToday = todayRecords.filter(r => r.date.getTime() === today.getTime() && r.status === AttendanceStatus.BREAK).length;
    const emergencyToday = todayRecords.filter(r => r.date.getTime() === today.getTime() && r.status === AttendanceStatus.EMERGENCY_DUTY).length;
    const leaveToday = todayRecords.filter(r => r.date.getTime() === today.getTime() && r.status === AttendanceStatus.ON_LEAVE).length;
    const lateToday = todayRecords.filter(r => r.date.getTime() === today.getTime() && r.isLate && r.status === AttendanceStatus.PRESENT).length;

    return {
      totalDoctors,
      presentToday,
      breakToday,
      emergencyToday,
      leaveToday,
      lateToday
    };
  }

  /**
   * Application Admin: Hospital-by-Hospital Attendance Performance Roster
   */
  async getDistrictHospitalsStats() {
    const today = this.getTodayNormalized();
    const hospitals = await prisma.hospital.findMany({
      include: {
        _count: {
          select: {
            nurses: true,
            pharmacists: true
          }
        },
        admins: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    const stats = [];
    for (const h of hospitals) {
      // Find doctor count
      const doctorCount = await prisma.doctor.count({
        where: { department: { hospitalId: h.id } }
      });

      // Find checked in today
      const presentCount = await prisma.doctorAttendance.count({
        where: {
          hospitalId: h.id,
          date: today,
          status: {
            in: [AttendanceStatus.PRESENT, AttendanceStatus.BREAK, AttendanceStatus.EMERGENCY_DUTY]
          }
        }
      });

      stats.push({
        id: h.id,
        name: h.name,
        type: h.type,
        district: h.district,
        state: h.state,
        status: h.status,
        cliniciansCount: doctorCount,
        presentTodayCount: presentCount,
        attendanceRate: doctorCount > 0 ? Math.round((presentCount / doctorCount) * 100) + '%' : '0%'
      });
    }

    return stats;
  }
}
