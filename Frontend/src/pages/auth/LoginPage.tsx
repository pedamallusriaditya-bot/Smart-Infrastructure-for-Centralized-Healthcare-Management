import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginUser } from '../../api/auth.api';
import { getRouteByRole } from '../../utils/auth.utils';
import { Loader2, Lock, Mail, AlertCircle } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // State management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Inside handleSubmit in LoginPage.tsx:
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    const data = await loginUser({ email, password });
    login(data);
    navigate(getRouteByRole(data.user.role));
  } catch (err: any) {
  // LOG THE RAW ERROR TO CONSOLE SO YOU CAN SEE IT
  console.error("DEBUG LOGIN ERROR:", err.response?.data);

  const backendMessage = err.response?.data?.message;
  const backendCode = err.response?.data?.code;

  if (backendCode === 'PENDING_APPROVAL') {
    setError("Account pending admin approval.");
  } else {
    // Show the actual message from the backend (e.g., "Invalid Credentials")
    setError(backendMessage || "Network connection error.");
  }
} finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-[440px]">
        
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#00488d] rounded-xl text-white mb-4 shadow-lg shadow-blue-200">
            <span className="material-symbols-outlined text-2xl font-fill">medical_services</span>
          </div>
          <h1 className="text-3xl font-black text-[#00488d] tracking-tighter">CareHive</h1>
          <p className="text-gray-500 font-medium text-sm mt-1">Integrated Healthcare Ecosystem</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded flex gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">Hospital Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 outline-none transition-all"
                  placeholder="name@hospital.med" 
                  required 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 outline-none transition-all"
                  placeholder="••••••••" 
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 bg-[#00488d] text-white rounded-xl font-bold hover:bg-[#00366d] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Identity"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Don't have a profile? 
              <Link to="/register" className="text-[#00488d] font-bold ml-1.5 hover:underline tracking-tight">Create Medical Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;