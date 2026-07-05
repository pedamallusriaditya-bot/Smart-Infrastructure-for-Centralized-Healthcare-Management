import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isSuperAdmin = user?.email === 'superadmin@carehive.med';

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
    { name: 'Staff Directory', path: '/admin/staff', icon: 'groups', hideForSuper: true },
    { name: 'Departments', path: '/admin/departments', icon: 'domain', hideForSuper: true },
    { name: 'Doctor Approvals', path: '/admin/doctors-approval', icon: 'verified_user', hideForSuper: true },
    { name: 'Appointments', path: '/admin/appointments', icon: 'event', hideForSuper: true },
    { name: 'Emergency CommandCenter', path: '/admin/emergency', icon: 'emergency', hideForSuper: true },
    { name: 'System Audit Logs', path: '/admin/audit', icon: 'history', hideForSuper: true },
  ];

  const activePath = location.pathname;

  return (
    <div className="flex h-screen bg-background text-on-surface font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-outline-variant flex flex-col shrink-0">
        
        {/* Sidebar Header */}
        <div className="p-lg flex flex-col gap-xs">
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl font-fill">admin_panel_settings</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display-lg text-title-lg font-bold text-primary leading-tight">CareHive</span>
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                {isSuperAdmin ? 'Super Admin' : 'Hospital Admin'}
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex-grow px-md py-lg flex flex-col gap-sm overflow-y-auto">
          {menuItems
            .filter(item => !(isSuperAdmin && item.hideForSuper))
            .map((item) => {
              const isActive = activePath === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-md px-md py-3 rounded-lg transition-all font-label-lg text-label-lg font-bold ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}

          <button
            onClick={logout}
            className="flex items-center gap-md px-md py-3 text-error hover:bg-error/5 rounded-lg transition-all text-left w-full cursor-pointer mt-auto font-label-lg text-label-lg font-bold"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Disconnect</span>
          </button>
        </nav>

        {/* Sidebar Footer details */}
        <div className="p-lg border-t border-outline-variant flex flex-col gap-xs text-[10px] text-on-surface-variant">
          <span className="font-bold">CareHive OS</span>
          <span>© 2026 CareHive Systems. All rights reserved.</span>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-grow flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <header className="flex justify-between items-center w-full px-margin-desktop h-16 bg-surface border-b border-outline-variant shadow-sm shrink-0">
          <div>
            <span className="font-display-lg text-headline-sm font-bold text-primary">
              {isSuperAdmin ? 'Super Admin Terminal' : 'Clinical Command & Controls'}
            </span>
          </div>
          <div className="flex items-center gap-md">
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold text-on-surface">{user?.firstName} {user?.lastName || 'Admin'}</span>
              <span className="text-[10px] text-on-surface-variant">{user?.email}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-sm">
              {user?.firstName?.[0] || 'A'}
            </div>
          </div>
        </header>

        {/* Outlet Wrapper */}
        <main className="flex-grow overflow-y-auto p-margin-desktop bg-background">
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default AdminLayout;
