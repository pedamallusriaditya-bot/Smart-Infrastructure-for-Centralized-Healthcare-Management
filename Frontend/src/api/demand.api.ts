import axiosInstance from './axiosInstance';

export const getHospitalDemandForecasts = async () => {
  const response = await axiosInstance.get('/v1/demand/hospital');
  return response.data.data;
};

export const generateHospitalDemandForecast = async (horizon: number) => {
  const response = await axiosInstance.post('/v1/demand/hospital', { horizon });
  return response.data.data;
};

export const getDistrictDemandComparison = async () => {
  const response = await axiosInstance.get('/v1/demand/district');
  return response.data.data;
};
