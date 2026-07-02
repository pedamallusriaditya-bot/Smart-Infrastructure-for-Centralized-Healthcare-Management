import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("CRITICAL: GEMINI_API_KEY is not defined in your .env file.");
}

const genAI = new GoogleGenerativeAI(apiKey);

interface ClinicalInsight {
  riskLevel: string;
  abnormalVitals: string[];
  potentialDiagnoses: string[];
  recommendations: string[];
  clinicalSummary: string;
  historySummary?: string;
}

export const generateClinicalInsight = async (
  currentVitals: any,
  patientHistory: any[] | null = null
): Promise<ClinicalInsight> => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const hasHistory =
      patientHistory !== null &&
      patientHistory.length > 0;

    const prompt = `
You are a Clinical Decision Support AI assistant.

Current Patient Data:
${JSON.stringify(currentVitals)}

${hasHistory
  ? `Patient History:
${JSON.stringify(patientHistory)}`
  : "No medical history provided."}

Return JSON only:

{
"riskLevel":"Low | Medium | High",
"abnormalVitals":[],
"potentialDiagnoses":[],
"recommendations":[],
"clinicalSummary":"",
"historySummary":""
}
`;

    const result = await model.generateContent(prompt);

    const response = result.response
      .text()
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(response) as ClinicalInsight;
  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error("Failed to generate clinical insight");
  }
};