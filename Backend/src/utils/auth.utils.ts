export const getRouteByRole = (role: string): string => {
  const upperRole = role.toUpperCase();
  switch (upperRole) {
    case 'ADMIN': return '/admin/dashboard';
    case 'DOCTOR': return '/doctor/dashboard';
    case 'PATIENT': return '/patient/dashboard'; // Ensure this matches App.tsx
    default: return '/login';
  }
};