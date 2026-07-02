import { Response } from "express";

interface ApiSuccessResponse<T> {
  requestId: string;
  status: "success";
  message: string;
  data: T;
  timestamp: string;
}

interface ApiErrorResponse {
  requestId: string;
  status: "error";
  code: string;
  message: string;
  timestamp: string;
}

/**
 * Standard success response
 */
export const successResponse = <T>(
  res: Response,
  message: string,
  data: T,
  statusCode = 200
): Response<ApiSuccessResponse<T>> => {
  return res.status(statusCode).json({
    requestId: res.req.requestId,
    status: "success",
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Standard error response
 */
export const errorResponse = (
  res: Response,
  message: string,
  statusCode = 500,
  code = "INTERNAL_SERVER_ERROR"
): Response<ApiErrorResponse> => {
  return res.status(statusCode).json({
    requestId: res.req.requestId,
    status: "error",
    code,
    message,
    timestamp: new Date().toISOString(),
  });
};