import axiosInstance from './axiosInstance';

export const getNurseProfile = async () => {
  const response = await axiosInstance.get('/nurse/profile');
  return response.data.data;
};

export const getNursePatients = async () => {
  const response = await axiosInstance.get('/nurse/patients');
  return response.data.data;
};

export const getNursePrescriptions = async (patientId?: string) => {
  const url = patientId ? `/nurse/prescriptions?patientId=${patientId}` : '/nurse/prescriptions';
  const response = await axiosInstance.get(url);
  return response.data.data;
};

export const getMedicationHistory = async (patientId: string) => {
  const response = await axiosInstance.get(`/nurse/patients/${patientId}/history`);
  return response.data.data;
};

export interface AdministerData {
  patientId: string;
  prescriptionId: string;
  medicineId: string;
  dose: string;
  route: string;
  remarks?: string;
  reaction?: string;
}

export const administerMedication = async (data: AdministerData) => {
  const response = await axiosInstance.post('/nurse/administer', data);
  return response.data.data;
};

export interface VitalsData {
  patientId: string;
  bloodPressure?: string;
  heartRate?: string;
  temperature?: string;
  respiratoryRate?: string;
}

export const recordVitalSigns = async (data: VitalsData) => {
  const response = await axiosInstance.post('/nurse/vitals', data);
  return response.data.data;
};

export interface NursingNotesData {
  patientId: string;
  notes: string;
}

export const updateNursingNotes = async (data: NursingNotesData) => {
  const response = await axiosInstance.post('/nurse/notes', data);
  return response.data.data;
};
