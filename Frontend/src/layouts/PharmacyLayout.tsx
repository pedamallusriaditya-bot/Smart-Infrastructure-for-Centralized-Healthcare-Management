import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PharmacyLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-background text-on-surface font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-outline-variant flex flex-col shrink-0">
        
        {/* Sidebar Header */}
        <div className="p-lg flex flex-col gap-xs">
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl font-fill">local_pharmacy</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display-lg text-title-lg font-bold text-primary leading-tight">CareHive</span>
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                Pharmacy Hub
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex-grow px-md py-lg flex flex-col gap-sm overflow-y-auto">
          <button
            onClick={() => navigate('/pharmacy/dashboard')}
            className="flex items-center gap-md px-md py-3 rounded-lg transition-all font-label-lg text-label-lg font-bold bg-primary text-on-primary shadow-sm text-left w-full cursor-pointer"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </button>

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
              Hospital Pharmacy Console
            </span>
          </div>
          <div className="flex items-center gap-md">
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold text-on-surface">{user?.firstName} {user?.lastName || 'Pharmacist'}</span>
              <span className="text-[10px] text-on-surface-variant">{user?.email}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-sm">
              {user?.firstName?.[0] || 'P'}
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

export default PharmacyLayout;
