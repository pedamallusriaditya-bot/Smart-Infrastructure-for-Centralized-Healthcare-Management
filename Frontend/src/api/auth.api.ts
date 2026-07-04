import axiosInstance from './axiosInstance';
import { AuthResponse } from '../types/auth.types';

/**
 * REGISTRATION PIPELINE
 * Maps Frontend state to Backend registerUser()
 */
export const registerUser = async (payload: any): Promise<AuthResponse> => {
  const response = await axiosInstance.post('/auth/register', payload);
  // Backend returns: { status: "success", data: { user, accessToken, refreshToken } }
  return response.data.data;
};

/**
 * LOGIN PIPELINE
 * Maps Credentials to Backend loginUser() + Gate Checks
 */
export const loginUser = async (credentials: any): Promise<AuthResponse> => {
  const response = await axiosInstance.post('/auth/login', credentials);
  return response.data.data;
};