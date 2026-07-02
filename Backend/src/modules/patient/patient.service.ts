import QRCode from "qrcode";
import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";

export class PatientService {
  async getPatientProfileByUserId(userId: string) {
    const patient = await prisma.patient.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        address: true,
        bloodGroup: true,
        insuranceNumber: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            email: true,
            createdAt: true,
          },
        },
        appointments: {
          select: {
            id: true,
            appointmentDate: true,
            status: true,
          },
        },
      },
    });

    if (!patient) {
      throw new Error("PATIENT_NOT_FOUND");
    }

    return patient;
  }

  async updatePatientProfileByUserId(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      bloodGroup?: string;
    }
  ) {
    return prisma.patient.update({
      where: {
        userId,
      },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        bloodGroup: data.bloodGroup,
      },
    });
  }

  async getMedicalHistoryByUserId(userId: string) {
    return prisma.medicalRecord.findMany({
      where: {
        patient: {
          userId,
        },
      },
      select: {
        id: true,
        diagnosis: true,
        notes: true,
        attachments: true,
        createdAt: true,
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async generatePatientQR(userId: string) {
    const patient = await prisma.patient.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!patient) {
      throw new Error("PATIENT_NOT_FOUND");
    }

    const token = crypto.randomBytes(32).toString("hex");

    const frontendUrl =
      process.env.FRONTEND_URL ?? "http://localhost:5173";

    const qrUrl = `${frontendUrl}/patient-access/${token}`;

    const qrCode = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: "H",
    });

    logger.info("Patient QR generated", {
      patientId: patient.id,
    });

    return {
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      qrCode,
      accessUrl: qrUrl,
      expiresIn: "15 minutes",
    };
  }
}