import { Request, Response } from 'express';
import { AttendanceService } from './attendance.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { AttendanceStatus } from '@prisma/client';

const attendanceService = new AttendanceService();

export const checkInDoctor = async (req: Request, res: Response): Promise<any> => {
  try {
    const record = await attendanceService.checkIn(req.user!.id);
    return successResponse(res, "Check-in recorded successfully", record, 201);
  } catch (error: any) {
    if (error.message === "ALREADY_CHECKED_IN") {
      return errorResponse(res, "You have already checked in for today.", 400);
    }
    return errorResponse(res, error.message || "Failed to record check-in", 500);
  }
};

export const checkOutDoctor = async (req: Request, res: Response): Promise<any> => {
  try {
    const record = await attendanceService.checkOut(req.user!.id);
    return successResponse(res, "Check-out recorded successfully", record, 200);
  } catch (error: any) {
    if (error.message === "NOT_CHECKED_IN") {
      return errorResponse(res, "No check-in record found for today. Please check-in first.", 400);
    }
    if (error.message === "ALREADY_CHECKED_OUT") {
      return errorResponse(res, "You have already checked out for today.", 400);
    }
    return errorResponse(res, error.message || "Failed to record check-out", 500);
  }
};

export const updateAttendanceStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, notes } = req.body;
    if (!status) {
      return errorResponse(res, "Attendance status is required.", 400);
    }

    const validStatuses = Object.values(AttendanceStatus);
    if (!validStatuses.includes(status as AttendanceStatus)) {
      return errorResponse(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const record = await attendanceService.updateStatus(req.user!.id, status as AttendanceStatus, notes);
    return successResponse(res, `Status updated to ${status} successfully`, record, 200);
  } catch (error: any) {
    if (error.message === "MUST_CHECK_IN_BEFORE_CHANGING_STATUS") {
      return errorResponse(res, "You must check-in before changing your duty status to break/emergency.", 400);
    }
    return errorResponse(res, error.message || "Failed to update attendance status", 500);
  }
};

export const getMyTodayAttendance = async (req: Request, res: Response): Promise<any> => {
  try {
    const record = await attendanceService.getMyTodayAttendance(req.user!.id);
    return successResponse(res, "Today's active attendance log retrieved", record, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to retrieve active log: " + error.message, 500);
  }
};

export const getMyAttendanceSummary = async (req: Request, res: Response): Promise<any> => {
  try {
    const summary = await attendanceService.getMyAttendanceSummary(req.user!.id);
    return successResponse(res, "Monthly attendance summary retrieved", summary, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load summary: " + error.message, 500);
  }
};

export const getHospitalAttendanceToday = async (req: Request, res: Response): Promise<any> => {
  try {
    const logs = await attendanceService.getHospitalAttendanceToday(req.user!.id);
    return successResponse(res, "Hospital active attendance log retrieved", logs, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load today's logs: " + error.message, 500);
  }
};

export const getHospitalAttendanceMetrics = async (req: Request, res: Response): Promise<any> => {
  try {
    const metrics = await attendanceService.getHospitalAttendanceMetrics(req.user!.id);
    return successResponse(res, "Hospital attendance metrics retrieved", metrics, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load attendance metrics: " + error.message, 500);
  }
};

export const getDistrictAttendanceSummary = async (_req: Request, res: Response): Promise<any> => {
  try {
    const summary = await attendanceService.getDistrictAttendanceSummary();
    return successResponse(res, "District attendance summary retrieved", summary, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load district summary: " + error.message, 500);
  }
};

export const getDistrictHospitalsStats = async (_req: Request, res: Response): Promise<any> => {
  try {
    const stats = await attendanceService.getDistrictHospitalsStats();
    return successResponse(res, "District hospital stats retrieved", stats, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load district hospitals stats: " + error.message, 500);
  }
};
