import axiosInstance from './axiosInstance';

export const getPatientProfile = async () => {
  const response = await axiosInstance.get('/patients/profile');
  return response.data.data;
};

export const getMedicalHistory = async (page: number = 1, limit: number = 10) => {
  const response = await axiosInstance.get('/patients/medical-history', {
    params: { page, limit }
  });
  return response.data.data;
};

export const getPatientQR = async () => {
  const response = await axiosInstance.get('/patients/qr');
  return response.data.data;
};

export const updatePatientProfile = async (data: any) => {
  const response = await axiosInstance.put('/patients/profile', data);
  return response.data.data;
};

export const getDoctors = async () => {
  const response = await axiosInstance.get('/doctors');
  return response.data.data;
};

export const createAppointment = async (payload: { doctorId: string, scheduledTime: string, reason: string }) => {
  const response = await axiosInstance.post('/appointments', payload);
  return response.data.data;
};

export const cancelAppointment = async (id: string) => {
  const response = await axiosInstance.patch(`/appointments/${id}/status`, { status: 'CANCELLED' });
  return response.data.data;
};

export const getAppointments = async () => {
  const response = await axiosInstance.get('/appointments');
  return response.data.data;
};

export const getMyAdmissionStatus = async () => {
  const response = await axiosInstance.get('/admissions/my-status');
  return response.data.data;
};

export const getAITimeline = async (patientId: string) => {
  const response = await axiosInstance.get(`/timeline/timeline/${patientId}`);
  return response.data.data;
};

export const getLabReports = async (page: number = 1, limit: number = 10) => {
  const response = await axiosInstance.get('/lab/reports', {
    params: { page, limit }
  });
  return response.data.data;
};