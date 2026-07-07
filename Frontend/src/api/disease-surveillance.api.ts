import axiosInstance from './axiosInstance';

export const getSurveillanceStatus = async () => {
  const response = await axiosInstance.get('/v1/disease-surveillance/status');
  return response.data.data;
};

export const getSurveillanceTrends = async () => {
  const response = await axiosInstance.get('/v1/disease-surveillance/trends');
  return response.data.data;
};

export const triggerSurveillanceCheck = async () => {
  const response = await axiosInstance.post('/v1/disease-surveillance/trigger');
  return response.data.data;
};
