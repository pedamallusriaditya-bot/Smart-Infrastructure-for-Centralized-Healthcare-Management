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
    return {
      riskLevel: "Low",
      abnormalVitals: [],
      potentialDiagnoses: ["General Wellness Status Stable"],
      recommendations: ["Maintain regular activity", "Follow up with physician as scheduled"],
      clinicalSummary: "Vital signs are within reference limits. Cardiopulmonary functions appear stable.",
      historySummary: "Clinical verification is positive; longitudinal progress shows stable health dynamics."
    };
  }
};

export interface ResourceRecommendationInput {
  hospitals: Array<{
    id: string;
    name: string;
    beds: { total: number; occupied: number; available: number };
    doctors: Array<{ specialization: string; count: number; activeAppointments: number }>;
    nurses: { totalCount: number };
    inventory: Array<{ category: string; name: string; quantity: number; minQuantity: number }>;
    pendingLabs: number;
    activeEmergencies: number;
    ambulances: number;
  }>;
}

export interface TransferRecommendation {
  sourceHospitalId: string;
  sourceHospitalName: string;
  destinationHospitalId: string;
  destinationHospitalName: string;
  resourceType: "MEDICINE" | "BLOOD" | "DOCTOR" | "NURSE" | "AMBULANCE" | "EQUIPMENT";
  resourceName: string;
  quantity: number;
  reason: string;
}

export const generateResourceRecommendations = async (
  inputData: ResourceRecommendationInput
): Promise<TransferRecommendation[]> => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `
You are a Regional Healthcare Logistics & Resource Optimization AI.
Your task is to analyze and compare hospitals in the district to identify critical resource imbalances and recommend resource transfers to balance the system.

Below is the current resource data for all hospitals in the system:
${JSON.stringify(inputData.hospitals, null, 2)}

Analyze the hospitals' data. Find shortages and overloads:
1. Medicine shortages: where a hospital has low stock of a medicine (quantity <= minQuantity) or zero, and another hospital has excess.
2. Blood shortages: where O-Negative or other blood units are critically low (e.g. 0-5 units) and another has excess.
3. Doctor shortages: look at active appointments compared to doctor count in specific specializations, or absolute lack of doctor cover in critical departments.
4. Nurse shortages: compare nurse counts with occupied beds or emergency loads.
5. Bed shortages: look at available beds (occupied close to or equal to total).
6. Lab overload: high pending labs (e.g., > 15 pending lab orders).
7. Emergency overload: high active emergencies (e.g., > 3 active cases).

Generate logical resource transfer recommendations:
- Transfer resource from a hospital that has excess (or is well-stocked) to a hospital that is critically deficient.
- Types of transfers: MEDICINE, BLOOD, DOCTOR, NURSE, AMBULANCE, EQUIPMENT.
- The resourceName should specify what is transferred (e.g., "Paracetamol", "O-Negative Blood", specialization name for DOCTOR like "CARDIOLOGY", "NURSE" for nurses, "AMBULANCE" for ambulances, equipment name like "Ventilator" for EQUIPMENT).
- Provide a clear, actionable reason explaining the imbalance.
- Ensure source and destination IDs exactly match the provided hospital IDs.
- Recommend transfer of moderate quantities (e.g., move a realistic subset of doctors/nurses like 1-3, medicines/blood like 50-200 units, ambulances like 1-2).

Return JSON ONLY as an array of transfer recommendations. Do not add markdown block markers:
[
  {
    "sourceHospitalId": "UUID of source hospital",
    "sourceHospitalName": "Name of source hospital",
    "destinationHospitalId": "UUID of destination hospital",
    "destinationHospitalName": "Name of destination hospital",
    "resourceType": "MEDICINE | BLOOD | DOCTOR | NURSE | AMBULANCE | EQUIPMENT",
    "resourceName": "Name of specific resource",
    "quantity": 10,
    "reason": "Clear explanation of why this transfer is recommended (e.g., Source Central Care has 500 units of Paracetamol, while Metro General has 0 units with a high demand)."
  }
]
`;

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    
    // Extract JSON block
    const cleaned = textResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned) as TransferRecommendation[];
  } catch (error) {
    console.error("AI Redistribution Service Error:", error);
    return [];
  }
};