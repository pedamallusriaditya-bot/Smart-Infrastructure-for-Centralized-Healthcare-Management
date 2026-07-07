import axiosInstance from './axiosInstance';

export const getReferralSuggestions = async (params: {
  hospitalId: string;
  lacks: string[];
  testType?: string;
  medicineName?: string;
  specialization?: string;
}) => {
  const response = await axiosInstance.get('/v1/referrals/suggest', {
    params: {
      hospitalId: params.hospitalId,
      lacks: params.lacks.join(','),
      testType: params.testType,
      medicineName: params.medicineName,
      specialization: params.specialization
    }
  });
  return response.data.data;
};

export const submitReferral = async (payload: {
  patientId: string;
  destinationHospitalId: string;
  reason: string;
  notes?: string;
}) => {
  const response = await axiosInstance.post('/v1/referrals/create', payload);
  return response.data.data;
};

export const getPatientReferralHistory = async (patientId: string) => {
  const response = await axiosInstance.get(`/v1/referrals/history/${patientId}`);
  return response.data.data;
};

export const getDoctorOutboundReferrals = async () => {
  const response = await axiosInstance.get('/v1/referrals/history');
  return response.data.data;
};
