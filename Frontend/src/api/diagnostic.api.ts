import axiosInstance from './axiosInstance';

export const getOwnHospitalDiagnostics = async () => {
  const response = await axiosInstance.get('/v1/diagnostics/hospital');
  return response.data.data;
};

export const updateHospitalDiagnostics = async (
  updates: Array<{ testType: string; status: string; cost?: number }>
) => {
  const response = await axiosInstance.put('/v1/diagnostics/hospital', { updates });
  return response.data.data;
};

export const getDistrictComparison = async () => {
  const response = await axiosInstance.get('/v1/diagnostics/district');
  return response.data.data;
};

export const lookupDiagnosticTest = async (hospitalId: string, testType: string) => {
  const response = await axiosInstance.get('/v1/diagnostics/lookup', {
    params: { hospitalId, testType }
  });
  return response.data.data;
};
