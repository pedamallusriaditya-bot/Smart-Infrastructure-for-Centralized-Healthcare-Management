import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Step 1: Define prop types
interface TopNavBarProps {
  userName?: string;
  userRole?: string;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ 
  userName, 
  userRole 
}) => {
  const { user, logout } = useAuth();

  // Determine user display details
  const displayUserName = userName || (user ? `${user.firstName} ${user.lastName}` : "Medical Personnel");

  // Get initials for user avatar
  const getInitials = (name: string) => {
    if (!name) return "JD";
    return name
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const initials = getInitials(displayUserName);

  // Link CSS classes
  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "text-primary font-bold font-title-lg text-title-lg hover:bg-surface-container-high transition-colors px-2 py-1 rounded"
      : "text-on-surface-variant font-title-lg text-title-lg hover:bg-surface-container-high transition-colors px-2 py-1 rounded";

  return (
    <header className="bg-white border-b border-outline-variant flex justify-between items-center w-full px-margin-desktop h-16 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <span className="font-headline-lg text-headline-lg font-bold text-primary dark:text-primary-fixed-dim">
          CareHive
        </span>
      </div>

      {/* Navigation menu for Patients */}
      {user?.role === 'PATIENT' && (
        <nav className="hidden md:flex gap-6 items-center">
          <NavLink to="/patient/dashboard" className={getLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/patient/my-records" className={getLinkClass}>
            My Records
          </NavLink>
          <NavLink to="/patient/appointments" className={getLinkClass}>
            Appointments
          </NavLink>
          <button
            onClick={logout}
            className="text-on-surface-variant font-title-lg text-title-lg hover:bg-surface-container-high transition-colors px-2 py-1 rounded text-left"
          >
            Logout
          </button>
        </nav>
      )}

      {/* Right side utilities */}
      <div className="flex items-center gap-4">
        <button className="material-symbols-outlined text-primary cursor-pointer active:opacity-80 p-2 rounded-full hover:bg-surface-container-high transition-colors">
          help_outline
        </button>
        <button 
          onClick={() => {
            document.documentElement.classList.toggle('dark');
          }}
          className="material-symbols-outlined text-primary cursor-pointer active:opacity-80 p-2 rounded-full hover:bg-surface-container-high transition-colors"
        >
          dark_mode
        </button>
        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
          {initials}
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;