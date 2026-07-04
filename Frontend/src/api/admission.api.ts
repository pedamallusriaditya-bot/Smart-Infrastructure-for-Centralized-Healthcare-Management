import axiosInstance from './axiosInstance';

export const admitPatient = async (payload: { patientId: string, bedId: string, reason: string }) => {
  const response = await axiosInstance.post('/admissions/admit', payload);
  return response.data.data;
};

export const getAdmissionStatus = async () => {
  const response = await axiosInstance.get('/admissions/my-status');
  return response.data.data;
};