import axiosInstance from './axiosInstance';

export const getRedistributionStatus = async () => {
  const response = await axiosInstance.get('/app-admin/redistribution/status');
  return response.data.data;
};

export const generateRecommendations = async () => {
  const response = await axiosInstance.post('/app-admin/redistribution/recommendations');
  return response.data.data;
};

export const getTransfersList = async () => {
  const response = await axiosInstance.get('/app-admin/redistribution/transfers');
  return response.data.data;
};

export const approveTransfer = async (id: string) => {
  const response = await axiosInstance.post(`/app-admin/redistribution/transfers/${id}/approve`);
  return response.data.data;
};

export const rejectTransfer = async (id: string, reason: string) => {
  const response = await axiosInstance.post(`/app-admin/redistribution/transfers/${id}/reject`, { reason });
  return response.data.data;
};
