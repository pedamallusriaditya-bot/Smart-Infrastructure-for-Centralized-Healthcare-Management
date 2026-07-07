import { Request, Response } from 'express';
import { PatientAiService } from './patientAi.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { logger } from '../../lib/logger.js';

const patientAiService = new PatientAiService();

export const processPatientChat = async (req: Request, res: Response): Promise<any> => {
  try {
    const { message, language, history } = req.body;

    if (!message || typeof message !== 'string') {
      return errorResponse(res, "Message string is required", 400, "BAD_REQUEST");
    }

    const selectedLanguage = language || 'English';

    logger.info(`Patient AI Chat requested. User: ${req.user!.id}, Lang: ${selectedLanguage}`);
    
    const result = await patientAiService.processPatientChat(
      req.user!.id,
      message,
      selectedLanguage,
      history || []
    );

    return successResponse(res, "AI response generated successfully", result, 200);
  } catch (error: any) {
    logger.error("processPatientChat error:", { requestId: req.requestId, error: error.message });
    return errorResponse(res, error.message || "Failed to generate AI response", 500);
  }
};
