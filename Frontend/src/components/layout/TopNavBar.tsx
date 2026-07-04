import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User as UserIcon } from 'lucide-react';

// Step 1: Define every prop you want to use
interface TopNavBarProps {
  userName?: string;
  userRole?: string; // This fixes the 'Property does not exist' error
}

const TopNavBar: React.FC<TopNavBarProps> = ({ 
  userName = "Medical Personnel", 
  userRole = "Clinical Staff" 
}) => {
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-gray-200 flex justify-between items-center w-full px-8 h-16 sticky top-0 z-50">
      <div className="font-bold text-2xl text-[#00488d] tracking-tighter">
        CareHive
      </div>

      <div className="flex items-center gap-5">
        <button className="relative p-2 text-gray-400 hover:bg-gray-100 rounded-full">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
          <div className="text-right hidden sm:block">
             <p className="text-sm font-black text-slate-800 leading-none mb-1">{userName}</p>
             <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{userRole}</p>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="w-10 h-10 rounded-xl bg-[#00488d] text-white flex items-center justify-center shadow-lg shadow-blue-100"
          >
            <UserIcon size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TopNavBar;