import { Request, Response } from 'express';
import { PharmacyService } from './pharmacy.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { PrescriptionStatus } from '@prisma/client';

const pharmacyService = new PharmacyService();

export const getPharmacistProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const profile = await pharmacyService.getPharmacistProfile(req.user!.id);
    return successResponse(res, "Pharmacist profile retrieved successfully", profile, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to retrieve pharmacist profile", 500);
  }
};

export const getPharmacyInventory = async (req: Request, res: Response): Promise<any> => {
  try {
    const pharmacist = await pharmacyService.getPharmacistProfile(req.user!.id);
    if (!pharmacist.hospitalId) {
      return errorResponse(res, "Pharmacist is not associated with a hospital", 400);
    }
    const inventory = await pharmacyService.getPharmacyInventory(pharmacist.hospitalId);
    return successResponse(res, "Pharmacy inventory retrieved successfully", inventory, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to retrieve pharmacy inventory", 500);
  }
};

export const getDashboardSummary = async (req: Request, res: Response): Promise<any> => {
  try {
    const pharmacist = await pharmacyService.getPharmacistProfile(req.user!.id);
    if (!pharmacist.hospitalId) {
      return errorResponse(res, "Pharmacist is not associated with a hospital", 400);
    }
    const summary = await pharmacyService.getDashboardSummary(pharmacist.hospitalId);
    return successResponse(res, "Pharmacy dashboard summary retrieved successfully", summary, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to retrieve dashboard summary", 500);
  }
};

export const getPrescriptionsQueue = async (req: Request, res: Response): Promise<any> => {
  try {
    const pharmacist = await pharmacyService.getPharmacistProfile(req.user!.id);
    if (!pharmacist.hospitalId) {
      return errorResponse(res, "Pharmacist is not associated with a hospital", 400);
    }
    const status = req.query.status as PrescriptionStatus | undefined;
    const queue = await pharmacyService.getPrescriptionsQueue(pharmacist.hospitalId, status);
    return successResponse(res, "Prescription queue retrieved successfully", queue, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to retrieve prescription queue", 500);
  }
};

export const dispensePrescription = async (req: Request, res: Response): Promise<any> => {
  try {
    const { prescriptionId, items } = req.body;
    if (!prescriptionId) {
      return errorResponse(res, "Prescription ID is required.", 400);
    }

    const dispensed = await pharmacyService.dispensePrescription(req.user!.id, prescriptionId, items);
    return successResponse(res, "Prescription dispensed successfully", dispensed, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to dispense prescription", 500);
  }
};

export const cancelPrescription = async (req: Request, res: Response): Promise<any> => {
  try {
    const { prescriptionId } = req.body;
    if (!prescriptionId) {
      return errorResponse(res, "Prescription ID is required.", 400);
    }

    const cancelled = await pharmacyService.cancelPrescription(req.user!.id, prescriptionId);
    return successResponse(res, "Prescription cancelled successfully", cancelled, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to cancel prescription", 500);
  }
};

export const receiveMedicineStock = async (req: Request, res: Response): Promise<any> => {
  try {
    const { itemId, quantity, batchNumber, expiryDate } = req.body;
    if (!itemId || quantity === undefined) {
      return errorResponse(res, "Item ID and quantity are required.", 400);
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return errorResponse(res, "Quantity must be a positive integer.", 400);
    }

    const pharmacist = await pharmacyService.getPharmacistProfile(req.user!.id);
    if (!pharmacist.hospitalId) {
      return errorResponse(res, "Pharmacist is not associated with a hospital", 400);
    }

    const parsedExpiry = expiryDate ? new Date(expiryDate) : undefined;

    const restocked = await pharmacyService.receiveMedicineStock(
      req.user!.id,
      itemId,
      parsedQty,
      batchNumber,
      parsedExpiry
    );

    return successResponse(res, "Inventory item restocked successfully", restocked, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to receive medicine stock", 500);
  }
};
