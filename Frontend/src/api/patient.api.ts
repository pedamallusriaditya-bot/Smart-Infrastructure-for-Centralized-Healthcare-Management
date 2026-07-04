import axiosInstance from './axiosInstance';

export const getPatientProfile = async () => {
  const response = await axiosInstance.get('/patients/profile');
  return response.data.data;
};