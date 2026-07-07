import { Request, Response } from 'express';
import { NurseService } from './nurse.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { MedicationRoute } from '@prisma/client';

const nurseService = new NurseService();

export const getNurseProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const profile = await nurseService.getNurseProfile(req.user!.id);
    return successResponse(res, "Nurse profile retrieved successfully", profile, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to retrieve nurse profile", 500);
  }
};

export const getAdmittedPatients = async (req: Request, res: Response): Promise<any> => {
  try {
    const patients = await nurseService.getAdmittedPatients(req.user!.id);
    return successResponse(res, "Admitted patients list retrieved successfully", patients, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to retrieve admitted patients", 500);
  }
};

export const getPrescriptions = async (req: Request, res: Response): Promise<any> => {
  try {
    const patientId = req.query.patientId as string | undefined;
    const prescriptions = await nurseService.getPrescriptions(req.user!.id, patientId);
    return successResponse(res, "Prescriptions list retrieved successfully", prescriptions, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to retrieve prescriptions", 500);
  }
};

export const getMedicationHistory = async (req: Request, res: Response): Promise<any> => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return errorResponse(res, "Patient ID is required.", 400);
    }
    const history = await nurseService.getMedicationHistory(patientId);
    return successResponse(res, "Medication administration history retrieved successfully", history, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to retrieve medication history", 500);
  }
};

export const recordVitalSigns = async (req: Request, res: Response): Promise<any> => {
  try {
    const { patientId, bloodPressure, heartRate, temperature, respiratoryRate } = req.body;
    if (!patientId) {
      return errorResponse(res, "Patient ID is required.", 400);
    }

    const vitals = await nurseService.recordVitalSigns(req.user!.id, patientId, {
      bloodPressure,
      heartRate: heartRate ? parseInt(heartRate, 10) : undefined,
      temperature: temperature ? parseFloat(temperature) : undefined,
      respiratoryRate: respiratoryRate ? parseInt(respiratoryRate, 10) : undefined
    });

    return successResponse(res, "Vital signs recorded successfully", vitals, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to record vital signs", 500);
  }
};

export const updateNursingNotes = async (req: Request, res: Response): Promise<any> => {
  try {
    const { patientId, notes } = req.body;
    if (!patientId || !notes) {
      return errorResponse(res, "Patient ID and nursing notes content are required.", 400);
    }

    const noteRecord = await nurseService.updateNursingNotes(req.user!.id, patientId, notes);
    return successResponse(res, "Nursing notes added to patient timeline successfully", noteRecord, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to add nursing notes", 500);
  }
};

export const administerMedication = async (req: Request, res: Response): Promise<any> => {
  try {
    const { patientId, prescriptionId, medicineId, dose, route, remarks, reaction } = req.body;

    if (!patientId || !prescriptionId || !medicineId || !dose || !route) {
      return errorResponse(res, "Missing required fields for administering medication.", 400);
    }

    const validRoutes = Object.values(MedicationRoute);
    if (!validRoutes.includes(route as MedicationRoute)) {
      return errorResponse(res, `Invalid medication route. Must be one of: ${validRoutes.join(', ')}`, 400);
    }

    const record = await nurseService.administerMedication(req.user!.id, {
      patientId,
      prescriptionId,
      medicineId,
      dose,
      route: route as MedicationRoute,
      remarks,
      reaction
    });

    return successResponse(res, "Medication dose administered and inventory deducted successfully", record, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to administer medication", 500);
  }
};
