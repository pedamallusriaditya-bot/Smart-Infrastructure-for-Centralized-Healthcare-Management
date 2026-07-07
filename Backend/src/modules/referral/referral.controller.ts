import { Request, Response } from 'express';
import { ReferralService } from './referral.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { TestType } from '@prisma/client';

const referralService = new ReferralService();

export const suggestHospitalsController = async (req: Request, res: Response): Promise<any> => {
  try {
    const { hospitalId, lacks, testType, medicineName, specialization } = req.query;

    if (!hospitalId) {
      return errorResponse(res, "Source hospitalId is required.", 400);
    }

    // Parse lacks array (comma separated or multiple values)
    let lacksArray: string[] = [];
    if (lacks) {
      if (typeof lacks === 'string') {
        lacksArray = lacks.split(',').map(s => s.trim().toUpperCase());
      } else if (Array.isArray(lacks)) {
        lacksArray = lacks.map((s: any) => String(s).trim().toUpperCase());
      }
    }

    const suggestions = await referralService.suggestNearbyHospitals({
      hospitalId: String(hospitalId),
      lacks: lacksArray,
      testType: testType ? (String(testType) as TestType) : undefined,
      medicineName: medicineName ? String(medicineName) : undefined,
      specialization: specialization ? String(specialization) : undefined
    });

    return successResponse(res, "Nearby hospitals suggested successfully.", suggestions, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to fetch suggestions: " + error.message, 500);
  }
};

export const createReferralController = async (req: Request, res: Response): Promise<any> => {
  try {
    const { patientId, destinationHospitalId, reason, notes } = req.body;
    const doctorUserId = req.user!.id; // Authenticated doctor user id

    if (!patientId || !destinationHospitalId || !reason) {
      return errorResponse(res, "patientId, destinationHospitalId, and reason are required.", 400);
    }

    const referral = await referralService.createReferral({
      doctorUserId,
      patientId,
      destinationHospitalId,
      reason,
      notes
    });

    return successResponse(res, "Patient referred successfully and records updated.", referral, 201);
  } catch (error: any) {
    return errorResponse(res, "Failed to create referral: " + error.message, 500);
  }
};

export const getReferralHistoryController = async (req: Request, res: Response): Promise<any> => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return errorResponse(res, "patientId parameter is required.", 400);
    }

    const history = await referralService.getReferralHistory(patientId);
    return successResponse(res, "Patient referral history retrieved successfully.", history, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to retrieve history: " + error.message, 500);
  }
};

export const getDoctorReferralsController = async (req: Request, res: Response): Promise<any> => {
  try {
    const doctorUserId = req.user!.id;
    const history = await referralService.getDoctorReferrals(doctorUserId);
    return successResponse(res, "Doctor's outbound referrals history retrieved successfully.", history, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to retrieve doctor referrals: " + error.message, 500);
  }
};
