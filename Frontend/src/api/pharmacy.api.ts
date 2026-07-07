import axiosInstance from './axiosInstance';

export const getPharmacistProfile = async () => {
  const response = await axiosInstance.get('/v1/pharmacy/profile');
  return response.data.data;
};

export const getPharmacyInventory = async () => {
  const response = await axiosInstance.get('/v1/pharmacy/inventory');
  return response.data.data;
};

export const getPharmacySummary = async () => {
  const response = await axiosInstance.get('/v1/pharmacy/summary');
  return response.data.data;
};

export const getPrescriptionsQueue = async (status?: string) => {
  const url = status ? `/v1/pharmacy/prescriptions?status=${status}` : '/v1/pharmacy/prescriptions';
  const response = await axiosInstance.get(url);
  return response.data.data;
};

export interface DispenseData {
  prescriptionId: string;
  items?: {
    medicineId: string;
    quantity: number;
  }[];
}

export const dispensePrescription = async (data: DispenseData) => {
  const response = await axiosInstance.post('/v1/pharmacy/dispense', data);
  return response.data.data;
};

export const cancelPrescription = async (prescriptionId: string) => {
  const response = await axiosInstance.post('/v1/pharmacy/cancel', { prescriptionId });
  return response.data.data;
};

export interface RestockData {
  itemId: string;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
}

export const receiveMedicineStock = async (data: RestockData) => {
  const response = await axiosInstance.post('/v1/pharmacy/restock', data);
  return response.data.data;
};
