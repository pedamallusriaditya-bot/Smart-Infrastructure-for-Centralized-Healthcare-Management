import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import { TriageInput, TriageOutput } from "../types/triage.types.js";

const prisma = new PrismaClient({});

export class TriageService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  async triageAndLog(
    data: TriageInput,
    medicalRecordId: string
  ): Promise<TriageOutput> {

    const startTime = Date.now();

    const triageResult = await this.triagePatient(data);

    const latencyMs = Date.now() - startTime;

    await prisma.triageLog.create({
      data: {
        medicalRecord: {
          connect: { id: medicalRecordId }
        },
        inputData: JSON.stringify(data),
        outputData: JSON.stringify(triageResult),
        modelUsed: "gemini-1.5-flash",
        latencyMs,
        timestamp: new Date()
      }
    });

    return triageResult;
  }

  private async triagePatient(data: TriageInput): Promise<TriageOutput> {
    const prompt = `
Act as an Emergency Room Triage Physician.

Symptoms: ${data.symptoms}
HR: ${data.hr}
Temp: ${data.temp}
SpO2: ${data.spo2}
BP: ${data.bp}
Age: ${data.age}

Return ONLY JSON:
{
  "riskScore": number,
  "possibleDiseases": string[],
  "immediateAction": string,
  "priorityLevel": "Emergency" | "Urgent" | "Stable",
  "reasoning": string
}
`;

    const model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return JSON.parse(text) as TriageOutput;
  }
}