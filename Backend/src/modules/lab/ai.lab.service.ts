import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../../lib/logger.js";

// Load environment variables from .env
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  logger.warn("GEMINI_API_KEY is not defined in the .env file. AI Lab Report Analysis will run in fallback manual mode.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export class AILabService {
  async analyzeReport(
    testName: string,
    results: Record<string, any>,
    requestId: string
  ) {
    try {
      if (!genAI) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const prompt = `
Analyze these ${testName} lab results:
${JSON.stringify(results)}

Provide:
1. summary: A 2-sentence executive summary.
2. isAbnormal: Boolean based on clinical norms.
3. flaggedFields: List names of out-of-range values.
4. recommendations: Suggest 2 follow-up clinical considerations.

Return ONLY a valid JSON object.
Do NOT include markdown or backticks.
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const cleanedJson = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      return JSON.parse(cleanedJson);
    } catch (error: any) {
      logger.error("AI Analysis failed - Continuing with manual mode", {
        requestId,
        error: error.message,
      });

      return {
        summary: "Automated analysis currently unavailable.",
        isAbnormal: false,
        flaggedFields: [],
        recommendations: [
          "Please review the raw laboratory values manually.",
        ],
      };
    }
  }
}