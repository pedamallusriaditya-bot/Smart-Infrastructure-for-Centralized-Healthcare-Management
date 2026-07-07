import axiosInstance from './axiosInstance';
import { Hospital } from '../types/auth.types';

export const getAssignedHospitals = async (): Promise<Hospital[]> => {
  const response = await axiosInstance.get('/hospitals');
  return response.data.data;
};

export const getPendingDoctors = async () => {
  const response = await axiosInstance.get('/admin/doctors/pending');
  return response.data.data;
};

export const reviewDoctor = async (doctorId: string, status: 'APPROVED' | 'REJECTED') => {
  const response = await axiosInstance.patch(`/admin/doctors/${doctorId}/review`, { status });
  return response.data.data;
};

// Add this to your existing file
export const getDepartmentsByHospital = async (hospitalId: string) => {
  const response = await axiosInstance.get(`/hospitals/${hospitalId}/departments`);
  return response.data.data;
};

export const getHospitalPerformanceDashboard = async () => {
  const response = await axiosInstance.get('/admin/performance-dashboard');
  return response.data.data;
};