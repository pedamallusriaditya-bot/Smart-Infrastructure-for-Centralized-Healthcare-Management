import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import PatientOverview from './pages/patient/PatientOverview'; // IMPORT THE REAL PAGE
import { useAuth } from './context/AuthContext';

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
        
        {/* THE REAL DASHBOARDS */}
        <Route 
          path="/patient/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['PATIENT']}>
              <PatientOverview /> {/* SWAPPED PLACEHOLDER FOR REAL COMPONENT */}
            </ProtectedRoute>
          } 
        />

        {/* Root Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;