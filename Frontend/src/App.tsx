import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import Dashboard from './pages/patient/Dashboard';
import MyRecords from './pages/patient/MyRecords';
import Appointments from './pages/patient/Appointments';
import { useAuth } from './context/AuthContext';
import PatientLayout from './layouts/PatientLayout';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import LISDashboard from './pages/lab/LISDashboard';
import AdminLayout from './layouts/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import DepartmentMgmt from './pages/admin/DepartmentMgmt';
import StaffManagement from './pages/admin/StaffManagement';
import DoctorApprovalQueue from './pages/admin/DoctorApprovalQueue';
import AppointmentMgmt from './pages/admin/AppointmentMgmt';
import SystemAuditLogs from './pages/admin/SystemAuditLogs';
import InventoryManagement from './pages/admin/InventoryManagement';
import AppAdminDashboard from './pages/appAdmin/AppAdminDashboard';
import PendingHospitals from './pages/appAdmin/PendingHospitals';
import ResourceRedistribution from './pages/appAdmin/ResourceRedistribution';
import NurseLayout from './layouts/NurseLayout';
import NurseDashboard from './pages/nurse/NurseDashboard';
import PharmacyLayout from './layouts/PharmacyLayout';
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard';

// Protected Route Logic
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex h-screen items-center justify-center font-bold text-[#00488d]">Initializing CareHive OS...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Entry Points */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Patient section with shared layout */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute allowedRoles={['PATIENT']}>
              <PatientLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="my-records" element={<MyRecords />} />
          <Route path="appointments" element={<Appointments />} />
        </Route>

        {/* Doctor section */}
        <Route 
          path="/doctor/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['DOCTOR']}>
              <DoctorDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Lab Technician section */}
        <Route 
          path="/lab/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['LAB_TECHNICIAN']}>
              <LISDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Admin section */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminLayout />
            </ProtectedRoute>
          } 
        >
          <Route path="dashboard" element={<AdminOverview />} />
          <Route path="inventory" element={<InventoryManagement />} />
          <Route path="departments" element={<DepartmentMgmt />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="doctors-approval" element={<DoctorApprovalQueue />} />
          <Route path="appointments" element={<AppointmentMgmt />} />
          <Route path="audit" element={<SystemAuditLogs />} />
        </Route>

        {/* Application Admin section */}
        <Route 
          path="/app-admin/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['APPLICATION_ADMIN']}>
              <AppAdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/app-admin/pending" 
          element={
            <ProtectedRoute allowedRoles={['APPLICATION_ADMIN']}>
              <PendingHospitals />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/app-admin/redistribution" 
          element={
            <ProtectedRoute allowedRoles={['APPLICATION_ADMIN']}>
              <ResourceRedistribution />
            </ProtectedRoute>
          } 
        />

        {/* Nurse section */}
        <Route
          path="/nurse"
          element={
            <ProtectedRoute allowedRoles={['NURSE']}>
              <NurseLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<NurseDashboard />} />
        </Route>

        {/* Pharmacy section */}
        <Route
          path="/pharmacy"
          element={
            <ProtectedRoute allowedRoles={['PHARMACIST']}>
              <PharmacyLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<PharmacyDashboard />} />
        </Route>

        {/* Root Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;