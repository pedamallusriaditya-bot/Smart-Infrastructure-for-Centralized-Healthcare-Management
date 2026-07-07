import axiosInstance from './axiosInstance';

export const getFootfallAnalytics = async () => {
  const response = await axiosInstance.get('/v1/analytics/footfall');
  return response.data.data;
};
