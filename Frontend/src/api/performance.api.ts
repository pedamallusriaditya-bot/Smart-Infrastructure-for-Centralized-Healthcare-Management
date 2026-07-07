import axiosInstance from './axiosInstance';

export const getHospitalPerformance = async () => {
  const response = await axiosInstance.get('/v1/app-admin/performance');
  return response.data.data;
};

export const getNotifications = async () => {
  const response = await axiosInstance.get('/v1/app-admin/notifications');
  return response.data.data;
};

export const markNotificationAsRead = async (id: string) => {
  const response = await axiosInstance.post(`/v1/app-admin/notifications/${id}/read`);
  return response.data.data;
};
