import axiosInstance from './axiosInstance';

export const getHospitalStockAnalytics = async () => {
  const response = await axiosInstance.get('/v1/inventory/ai/hospital');
  return response.data.data;
};

export const getDistrictStockComparison = async () => {
  const response = await axiosInstance.get('/v1/inventory/ai/district');
  return response.data.data;
};
