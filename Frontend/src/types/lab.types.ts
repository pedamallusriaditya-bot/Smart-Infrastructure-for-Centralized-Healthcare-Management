export type LabPriority = 'NORMAL' | 'URGENT' | 'EMERGENCY';

export interface LabResultItem {
  label: string;
  unit: string;
  val: string;
  low: string;
  high: string;
  critical?: boolean;
}

export interface LabReport {
  id: string;
  testName: string;
  patientName: string;
  priority: LabPriority;
  results?: LabResultItem[];
  aiSummary?: string;
}