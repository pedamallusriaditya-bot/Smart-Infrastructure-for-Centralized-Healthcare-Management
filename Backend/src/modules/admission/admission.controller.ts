import { Request, Response } from 'express';
import { AdmissionService } from './admission.service.js';
import { AdmitPatientSchema, DischargePatientSchema } from '../../schemas/admission.schema.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { logger } from '../../lib/logger.js';
import { z } from 'zod';

const admissionService = new AdmissionService();

export const admitPatient = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = AdmitPatientSchema.parse(req.body);
    // Use req.user.id as the doctor who is admitting the patient
    const admission = await admissionService.admitPatient(
      req.user!.id, 
      data.patientId, 
      data.bedId, 
      data.reason, 
      req.requestId
    );

    return successResponse(res, "Patient successfully admitted to facility", admission, 201);
  } catch (error: any) {
    logger.error("Admission Failure", { requestId: req.requestId, error: error.message });
    if (error instanceof z.ZodError) return errorResponse(res, "Invalid admission data", 400);
    if (error.message === "BED_NOT_AVAILABLE") return errorResponse(res, "The selected bed is currently occupied or under maintenance.", 409);
    
    return errorResponse(res, error.message || "Failed to process admission", 500);
  }
};

export const dischargePatient = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const result = await admissionService.dischargePatient(id, req.requestId);
    return successResponse(res, "Patient discharged and bed vacated", result, 200);
  } catch (error: any) {
    return errorResponse(res, "Discharge protocol failed", 500);
  }
};

export const getMyAdmissionStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    // For Patients to see where they are admitted
    const admission = await admissionService.getActiveAdmissionForPatient(req.user!.id);
    if (!admission) return errorResponse(res, "No active admission found", 404);
    
    return successResponse(res, "Current admission details retrieved", admission, 200);
  } catch (error: any) {
    return errorResponse(res, "Unable to fetch admission status", 500);
  }
};