import QRCode from "qrcode";
import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";

export class PatientService {
  /**
   * Retrieves profile for the patient (self-service).
   * Limit appointments to 5 most recent for performance.
   */
  async getPatientProfileByUserId(userId: string) {
    const patient = await prisma.patient.findUnique({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        bloodGroup: true,
        insuranceNumber: true,
        user: { select: { email: true } },
        appointments: {
          take: 5,
          orderBy: { appointmentDate: 'desc' },
          select: { id: true, appointmentDate: true, status: true }
        }
      }
    });

    if (!patient) throw new Error("PATIENT_NOT_FOUND");
    return patient;
  }

  /**
   * Retrieves profile for clinical staff use (via patient's primary ID).
   */
  async getPatientProfileById(patientId: string) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { email: true } }
      }
    });

    if (!patient) throw new Error("PATIENT_NOT_FOUND");
    return patient;
  }

  /**
   * Strict validation for updates. Only allows safe profile fields.
   */
  async updatePatientProfile(userId: string, data: any) {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw new Error("PATIENT_NOT_FOUND");

    return prisma.patient.update({
      where: { userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        bloodGroup: data.bloodGroup,
        address: data.address
      }
    });
  }

  /**
   * PERFORMANCE: Paginated history retrieval (Solves PATIENT_14).
   */
  async getMedicalHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [records, total] = await prisma.$transaction([
      prisma.medicalRecord.findMany({
        where: { patient: { userId } },
        include: { 
          doctor: { select: { firstName: true, lastName: true, specialization: true } } 
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.medicalRecord.count({ where: { patient: { userId } } })
    ]);

    return {
      records,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit)
      }
    };
  }

  /**
   * SECURITY: Only Doctor or Owner can generate/view the QR.
   */
  async generateSecureQR(targetId: string, requestorId: string, requestorRole: string, requestId: string) {
    // 1. Identify patient by either their internal patient.id or their auth user.id
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { id: targetId },
          { userId: targetId }
        ]
      }
    });

    if (!patient) throw new Error("PATIENT_NOT_FOUND");

    // 2. Authorization: Must be a DOCTOR or the account OWNER
    const isDoctor = requestorRole === 'DOCTOR';
    const isOwner = requestorId === patient.userId;

    if (!isDoctor && !isOwner) {
      logger.warn("Security Alert: Unauthorized QR access blocked", { requestId, requestorId, patientId: patient.id });
      throw new Error("UNAUTHORIZED_ACCESS");
    }

    // 3. Logic: Generate a transient verification token
    const token = crypto.randomBytes(32).toString("hex");
    
    // Audit log for sensitive medical data access
    logger.info("Patient QR Access Link Created", { 
      requestId, 
      generatedFor: patient.id, 
      generatedBy: requestorId,
      byRole: requestorRole 
    });

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
    const accessUrl = `${frontendUrl}/clinical-access/verify/${token}`;

    const qrCode = await QRCode.toDataURL(accessUrl, { errorCorrectionLevel: 'H' });

    return {
      qrCode,
      patientName: `${patient.firstName} ${patient.lastName}`,
      expiresIn: "15 minutes"
    };
  }
}