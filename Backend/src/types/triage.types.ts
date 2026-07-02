export interface TriageInput {
  symptoms: string;
  hr: number;
  temp: number;
  spo2: number;
  bp: string;
  age: number;
}

export interface TriageOutput {
  riskScore: number;
  possibleDiseases: string[];
  immediateAction: string;
  priorityLevel: 'Emergency' | 'Urgent' | 'Stable';
  reasoning: string;
}