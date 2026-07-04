import { Request, Response } from 'express';
import { z } from 'zod';
import { TimelineService } from '../../services/timeline.service.js';
import { generateClinicalInsight } from '../../services/ai.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
const timelineService = new TimelineService();

const PatientIdParamSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID format")
});

export const fetchAITimeline = async (req: Request, res: Response) => {
  try {
    const { patientId } = PatientIdParamSchema.parse(req.params);

    const timelineEvents = await timelineService.getTimeline(patientId, req.requestId);

    let summary = "Insufficient data to generate an AI summary.";

    if (timelineEvents.length > 0) {
      const aiResponse = await generateClinicalInsight(
        { note: "Requesting patient history summary." },
        timelineEvents
      );

      summary = aiResponse.historySummary || summary;
    }

    return successResponse(
      res,
      "AI Timeline generated successfully",
      {
        summary,
        events: timelineEvents
      },
      200
    );
  } catch (error: any) {
    return errorResponse(
      res,
      error.message || "Failed to generate AI timeline",
      500
    );
  }
};