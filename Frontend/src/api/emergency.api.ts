import axiosInstance from './axiosInstance';

export interface SOSPayload {
  description: string;
  latitude: number;
  longitude: number;
}

export const triggerEmergencySOS = async (payload: SOSPayload) => {
  const response = await axiosInstance.post('/emergencies/trigger', payload);
  return response.data;
};