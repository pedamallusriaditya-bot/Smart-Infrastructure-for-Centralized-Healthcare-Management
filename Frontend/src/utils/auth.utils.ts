import { Role } from '../types/auth.types';

/**
 * Determines the entry point for a user based on their hospital role.
 */
export const getRouteByRole = (role: Role | string): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'DOCTOR':
      return '/doctor/dashboard';
    case 'LAB_TECHNICIAN':
      return '/lab/dashboard';
    case 'PATIENT':
      return '/patient/dashboard';
    case 'EMERGENCY_STAFF':
      return '/admin/emergency'; // Or a dedicated emergency dash
    default:
      return '/login';
  }
};