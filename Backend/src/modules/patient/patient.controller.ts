import { Request, Response } from 'express';
import { PatientService } from './patient.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { logger } from '../../lib/logger.js';
import { medicalHistoryQuerySchema } from '../../schemas/patient.schema.js';

const patientService = new PatientService();

/**
 * [SELF-SERVICE] Get authenticated patient's own profile
 */
export const getPatientProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const profile = await patientService.getPatientProfileByUserId(req.user!.id);
    return successResponse(res, "Profile retrieved", profile, 200);
  } catch (error: any) {
    logger.error("getPatientProfile Error", { requestId: req.requestId, error: error.message });
    return errorResponse(res, "Patient profile not found", 404, "NOT_FOUND");
  }
};

/**
 * [SELF-SERVICE] Update authenticated patient's own profile
 */
export const updatePatientProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const updated = await patientService.updatePatientProfile(req.user!.id, req.body);
    return successResponse(res, "Profile updated successfully", updated, 200);
  } catch (error: any) {
    logger.error("updatePatientProfile Error", { requestId: req.requestId, error: error.message });
    return errorResponse(res, "Update failed", 400, "UPDATE_FAILED");
  }
};

/**
 * [SELF-SERVICE] Get authenticated patient's own history (Paginated)
 */
export const getMedicalHistory = async (req: Request, res: Response): Promise<any> => {
  try {
    const { page, limit } = medicalHistoryQuerySchema.parse(req.query);
    const history = await patientService.getMedicalHistory(req.user!.id, page, limit);
    return successResponse(res, "Medical history retrieved", history, 200);
  } catch (error: any) {
    return errorResponse(res, "Unable to fetch history", 500, "FETCH_ERROR");
  }
};

/**
 * [SELF-SERVICE] Patient gets their own QR code
 */
export const getPatientQR = async (req: Request, res: Response): Promise<any> => {
  try {
    const qrData = await patientService.generateSecureQR(
      req.user!.id,    // Target is self
      req.user!.id,    // Requestor is self
      req.user!.role, 
      req.requestId
    );
    return successResponse(res, "Your QR code generated", qrData, 200);
  } catch (error: any) {
    return errorResponse(res, "QR generation failed", 500);
  }
};

/**
 * [CLINICAL-ACCESS] DOCTOR gets a specific patient's QR code
 */
export const getPatientQRForDoctor = async (req: Request, res: Response): Promise<any> => {
  try {
    const { patientId } = req.params; // Get targeted patient from URL
    const qrData = await patientService.generateSecureQR(
      patientId,      // Target
      req.user!.id,   // Requestor (Doctor)
      req.user!.role, 
      req.requestId
    );
    return successResponse(res, "Patient QR retrieved for clinical use", qrData, 200);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ACCESS") {
      return errorResponse(res, "Unauthorized: Only doctors can access this", 403, "FORBIDDEN");
    }
    return errorResponse(res, "Could not fetch patient QR", 404, "NOT_FOUND");
  }
};

/**
 * [CLINICAL-ACCESS] DOCTOR gets a specific patient's profile details
 */
export const getPatientProfileForDoctor = async (req: Request, res: Response): Promise<any> => {
  try {
    const { patientId } = req.params;
    const profile = await patientService.getPatientProfileById(patientId);
    
    // Safety check for audit purposes
    logger.info("Doctor viewed patient profile", { 
      requestId: req.requestId, 
      doctorId: req.user!.id, 
      patientId 
    });

    return successResponse(res, "Patient profile details retrieved", profile, 200);
  } catch (error: any) {
    logger.error("getPatientProfileForDoctor Error", { requestId: req.requestId, error: error.message });
    return errorResponse(res, "Patient details not found", 404, "NOT_FOUND");
  }
};

/**
 * [SELF-SERVICE] Get patient's care timeline events (Prescribed, Dispensed, Administered)
 */
export const getCareTimeline = async (req: Request, res: Response): Promise<any> => {
  try {
    const { prisma } = await import('../../lib/prisma.js');
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user!.id }
    });
    if (!patient) return errorResponse(res, "Patient profile not found", 404);

    const timeline = await prisma.patientTimeline.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(res, "Care timeline fetched successfully", timeline, 200);
  } catch (error: any) {
    logger.error("getCareTimeline Error", { requestId: req.requestId, error: error.message });
    return errorResponse(res, "Failed to load care timeline", 500);
  }
};