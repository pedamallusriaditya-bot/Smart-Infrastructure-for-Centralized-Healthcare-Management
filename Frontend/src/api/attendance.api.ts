import axiosInstance from './axiosInstance';

export const checkInDoctor = async () => {
  const response = await axiosInstance.post('/v1/attendance/check-in');
  return response.data.data;
};

export const checkOutDoctor = async () => {
  const response = await axiosInstance.post('/v1/attendance/check-out');
  return response.data.data;
};

export const updateAttendanceStatus = async (status: string, notes?: string) => {
  const response = await axiosInstance.post('/v1/attendance/status', { status, notes });
  return response.data.data;
};

export const getMyTodayAttendance = async () => {
  const response = await axiosInstance.get('/v1/attendance/my-today');
  return response.data.data;
};

export const getMyAttendanceSummary = async () => {
  const response = await axiosInstance.get('/v1/attendance/my-summary');
  return response.data.data;
};

export const getHospitalAttendanceToday = async () => {
  const response = await axiosInstance.get('/v1/attendance/hospital/today');
  return response.data.data;
};

export const getHospitalAttendanceMetrics = async () => {
  const response = await axiosInstance.get('/v1/attendance/hospital/metrics');
  return response.data.data;
};

export const getDistrictAttendanceSummary = async () => {
  const response = await axiosInstance.get('/v1/attendance/district/summary');
  return response.data.data;
};

export const getDistrictHospitalsStats = async () => {
  const response = await axiosInstance.get('/v1/attendance/district/hospitals');
  return response.data.data;
};
