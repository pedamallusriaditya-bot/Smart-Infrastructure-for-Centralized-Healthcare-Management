import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserCheck, CalendarDays, Siren } from 'lucide-react';

const AdminSidebar: React.FC = () => {
  const location = useLocation();
  
  const menuItems = [
    { label: 'System Overview', path: '/admin/dashboard', icon: <LayoutDashboard size={18}/> },
    { label: 'Medical Board', path: '/admin/doctors/pending', icon: <UserCheck size={18}/> },
    { label: 'Patient Master', path: '/admin/staff', icon: <Users size={18}/> },
    { label: 'Emergency Control', path: '/admin/emergency', icon: <Siren size={18}/>, alert: true },
  ];

  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-200 fixed left-0 top-0 flex flex-col p-4 z-40 shadow-sm">
      <div className="p-4 mb-6 border-b flex items-center gap-2 text-[#00488d]">
         <span className="font-black italic tracking-tight">CareHive <span className="font-light not-italic">OS</span></span>
      </div>
      <nav className="flex-1 space-y-2">
        {menuItems.map(item => (
          <Link key={item.path} to={item.path} className={`flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition-all ${location.pathname === item.path ? 'bg-blue-50 text-blue-900 border border-blue-100 shadow-sm' : 'text-slate-500 hover:bg-slate-50'} ${item.alert ? 'text-red-500' : ''}`}>
             {item.icon} {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;