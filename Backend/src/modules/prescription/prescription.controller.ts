import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { writeAuditLog } from '../../utils/auditHelper.js';

export const searchMedicines = async (req: Request, res: Response): Promise<any> => {
  try {
    const query = (req.query.q as string) || '';
    const medicines = await prisma.medicine.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive'
        }
      },
      take: 10
    });
    return successResponse(res, "Medicines list fetched", medicines, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to search medicines: " + error.message, 500);
  }
};

export const createPrescription = async (req: Request, res: Response): Promise<any> => {
  try {
    const { patientId, medicineId, dosage, frequency, duration, instructions, route, startDate, endDate } = req.body;
    
    if (!patientId || !medicineId || !dosage || !frequency || !duration) {
      return errorResponse(res, "Missing required fields for prescription entry.", 400);
    }

    // 1. Fetch doctor profile
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user!.id },
      include: { department: true }
    });
    if (!doctor) {
      return errorResponse(res, "Unauthorized: Only certified physicians can prescribe medication.", 403);
    }

    const hospitalId = doctor.department.hospitalId;

    // 2. Verify medicine existence
    const medicine = await prisma.medicine.findUnique({
      where: { id: medicineId }
    });
    if (!medicine) {
      return errorResponse(res, "Medicine not found in clinical database.", 404);
    }

    // Parse dates
    const parsedStart = startDate ? new Date(startDate) : new Date();
    const parsedEnd = endDate ? new Date(endDate) : new Date(parsedStart.getTime() + parseInt(duration, 10) * 24 * 60 * 60 * 1000);

    // 3. Perform atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create prescription
      const prescription = await tx.prescription.create({
        data: {
          patientId,
          doctorId: doctor.id,
          hospitalId,
          medicine: medicine.name,
          dosage,
          instructions: instructions || 'Take as directed',
          route: route || 'ORAL',
          frequency: frequency || 'ONCE_DAILY',
          startDate: parsedStart,
          endDate: parsedEnd,
          nextDoseTime: parsedStart,
          status: 'PENDING',
          medicines: {
            create: {
              medicineId: medicine.id,
              quantity: 1
            }
          }
        },
        include: {
          medicines: {
            include: {
              medicine: true
            }
          }
        }
      });

      // Update medicine inventory stock levels
      if (medicine.stock > 0) {
        await tx.medicine.update({
          where: { id: medicine.id },
          data: { stock: { decrement: 1 } }
        });
      }

      // Add timeline event
      await tx.patientTimeline.create({
        data: {
          patientId,
          eventType: 'PRESCRIPTION',
          description: `Prescribed: ${medicine.name} (${dosage} - ${frequency} via ${route || 'ORAL'}) by Dr. ${doctor.lastName}`,
        }
      });

      return prescription;
    });

    // Write audit log mutation record
    await writeAuditLog(
      req.user!.id,
      'CREATE_PRESCRIPTION',
      'Prescription',
      result.id,
      null,
      result,
      req.ip
    );

    return successResponse(res, "Prescription saved and pharmacy notified", result, 201);
  } catch (error: any) {
    return errorResponse(res, "Prescription protocol failed: " + error.message, 500);
  }
};

export const getDoctorPrescriptions = async (req: Request, res: Response): Promise<any> => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user!.id }
    });
    if (!doctor) {
      return errorResponse(res, "Doctor profile not found.", 404);
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { doctorId: doctor.id },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        medicines: {
          include: {
            medicine: true
          }
        }
      }
    });

    return successResponse(res, "Doctor prescriptions fetched", prescriptions, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load prescriptions: " + error.message, 500);
  }
};

export const getAllPrescriptionsForHospital = async (req: Request, res: Response): Promise<any> => {
  try {
    let hospitalId = req.query.hospitalId as string | undefined;

    if (!hospitalId) {
      // Try resolving from logged in user profile (doctor, nurse, pharmacist)
      const userId = req.user!.id;
      const doc = await prisma.doctor.findUnique({
        where: { userId },
        include: { department: true }
      });
      if (doc) {
        hospitalId = doc.department.hospitalId;
      } else {
        const nurse = await prisma.nurse.findUnique({ where: { userId } });
        if (nurse) {
          hospitalId = nurse.hospitalId;
        } else {
          const pharm = await prisma.pharmacist.findUnique({ where: { userId } });
          if (pharm) {
            hospitalId = pharm.hospitalId || undefined;
          }
        }
      }
    }

    if (!hospitalId) {
      return errorResponse(res, "Hospital ID is required or could not be determined.", 400);
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        doctor: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        medicines: {
          include: {
            medicine: true
          }
        }
      }
    });

    return successResponse(res, "Hospital prescriptions fetched", prescriptions, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load prescriptions: " + error.message, 500);
  }
};

export const getPatientPrescriptions = async (req: Request, res: Response): Promise<any> => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user!.id }
    });
    if (!patient) {
      return errorResponse(res, "Patient profile not found.", 404);
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialization: true
          }
        },
        medicines: {
          include: {
            medicine: true
          }
        }
      }
    });

    return successResponse(res, "Patient prescriptions fetched", prescriptions, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load prescriptions: " + error.message, 500);
  }
};
