import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginUser } from '../../api/auth.api';
import { getRouteByRole } from '../../utils/auth.utils';
import { getAssignedHospitals } from '../../api/admin.api';
import { Loader2, Lock, Mail, AlertCircle } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // State management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Hospital self-registration states
  const [isHospitalRegOpen, setIsHospitalRegOpen] = useState(false);
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalType, setHospitalType] = useState('PHC');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');
  const [hospitalEmail, setHospitalEmail] = useState('');
  
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminMobile, setAdminMobile] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [hospitalRegLoading, setHospitalRegLoading] = useState(false);

  const handleHospitalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setHospitalRegLoading(true);
    try {
      await axiosInstance.post('/hospitals/register-public', {
        hospitalName,
        hospitalType,
        address: hospitalAddress,
        district,
        state,
        pincode,
        phone: hospitalPhone,
        email: hospitalEmail,
        firstName: adminFirstName,
        lastName: adminLastName,
        adminEmail,
        mobileNumber: adminMobile,
        password: adminPassword
      });
      alert("Registration submitted successfully! Your hospital registration is awaiting approval from the District Administration.");
      setIsHospitalRegOpen(false);
      setHospitalName('');
      setHospitalType('PHC');
      setHospitalAddress('');
      setDistrict('');
      setState('');
      setPincode('');
      setHospitalPhone('');
      setHospitalEmail('');
      setAdminFirstName('');
      setAdminLastName('');
      setAdminEmail('');
      setAdminMobile('');
      setAdminPassword('');
    } catch (err: any) {
      console.error(err);
      alert("Failed to register hospital: " + (err.response?.data?.message || err.message));
    } finally {
      setHospitalRegLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const data = await loginUser({ email, password });
      login(data);

      // If user is doctor or lab technician, initialize default hospitalId in session
      if (data.user.role === 'LAB_TECHNICIAN' || data.user.role === 'DOCTOR') {
        const hospitals = await getAssignedHospitals().catch(() => []);
        if (hospitals && hospitals.length > 0) {
          localStorage.setItem('hospitalId', hospitals[0].id);
        }
      }

      navigate(getRouteByRole(data.user.role));
    } catch (err: any) {
      console.error("DEBUG LOGIN ERROR:", err.response?.data);
      const backendMessage = err.response?.data?.message;
      const backendCode = err.response?.data?.code;

      if (backendCode === 'PENDING_APPROVAL') {
        setError("Account pending admin approval.");
      } else {
        setError(backendMessage || "Network connection error.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans text-on-surface">
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
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded flex gap-3 text-red-700 animate-in fade-in duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">Email ID</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 outline-none transition-all text-on-surface"
                  placeholder="Enter your email ID" 
                  required 
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 outline-none transition-all text-on-surface"
                  placeholder="••••••••" 
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 bg-[#00488d] text-white rounded-xl font-bold hover:bg-[#00366d] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Identity"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-4">
            <p className="text-sm text-gray-500 font-medium">
              Don't have a profile? 
              <Link to="/register" className="text-[#00488d] font-bold ml-1.5 hover:underline tracking-tight">Create Medical Account</Link>
            </p>
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl mt-4">
              <p className="text-sm font-black text-gray-700">Want to register your hospital?</p>
              <p className="text-xs text-gray-500 mt-1">Register your hospital with CareHive.</p>
              <button 
                type="button" 
                onClick={() => setIsHospitalRegOpen(true)}
                className="mt-3 w-full py-2.5 bg-[#00488d] text-white rounded-xl text-xs font-bold hover:bg-[#00366b] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
              >
                Register Hospital
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Public Hospital Self-Registration Modal */}
      {isHospitalRegOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 text-on-surface animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
              <h2 className="text-xl font-bold text-[#00488d] flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">domain</span>
                Register Your Hospital Facility
              </h2>
              <button 
                className="material-symbols-outlined text-gray-400 cursor-pointer hover:bg-gray-100 p-1 rounded-full animate-pulse" 
                onClick={() => setIsHospitalRegOpen(false)}
              >
                close
              </button>
            </div>
            
            <form onSubmit={handleHospitalRegister} className="space-y-4 text-left">
              {/* Hospital Section */}
              <div className="bg-blue-50/50 p-4 rounded-xl space-y-3 border border-blue-100">
                <h3 className="text-xs font-black uppercase text-[#00488d] tracking-wider">Hospital Details</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Hospital Name</label>
                    <input 
                      type="text" 
                      value={hospitalName} 
                      onChange={(e) => setHospitalName(e.target.value)} 
                      placeholder="Metro General" 
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none text-on-surface"
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Hospital Type</label>
                    <select 
                      value={hospitalType}
                      onChange={(e) => setHospitalType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none text-on-surface"
                      required
                    >
                      <option value="PHC">PHC</option>
                      <option value="CHC">CHC</option>
                      <option value="District Hospital">District Hospital</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Facility Address</label>
                  <input 
                    type="text" 
                    value={hospitalAddress} 
                    onChange={(e) => setHospitalAddress(e.target.value)} 
                    placeholder="Street, Locality" 
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none text-on-surface"
                    required 
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">District</label>
                    <input 
                      type="text" 
                      value={district} 
                      onChange={(e) => setDistrict(e.target.value)} 
                      placeholder="District" 
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none text-on-surface"
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">State</label>
                    <input 
                      type="text" 
                      value={state} 
                      onChange={(e) => setState(e.target.value)} 
                      placeholder="State" 
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none text-on-surface"
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Pincode</label>
                    <input 
                      type="text" 
                      value={pincode} 
                      onChange={(e) => setPincode(e.target.value)} 
                      placeholder="Pincode" 
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none text-on-surface"
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Hospital Phone</label>
                    <input 
                      type="tel" 
                      value={hospitalPhone} 
                      onChange={(e) => setHospitalPhone(e.target.value)} 
                      placeholder="e.g. +1 555-0199" 
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none text-on-surface"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Hospital Email</label>
                    <input 
                      type="email" 
                      value={hospitalEmail} 
                      onChange={(e) => setHospitalEmail(e.target.value)} 
                      placeholder="info@hospital.com" 
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none text-on-surface"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Administrator Section */}
              <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-200">
                <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider">Administrator Credentials</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">First Name</label>
                    <input 
                      type="text" 
                      value={adminFirstName} 
                      onChange={(e) => setAdminFirstName(e.target.value)} 
                      placeholder="John" 
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none text-on-surface"
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Last Name</label>
                    <input 
                      type="text" 
                      value={adminLastName} 
                      onChange={(e) => setAdminLastName(e.target.value)} 
                      placeholder="Doe" 
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none text-on-surface"
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Email ID (Login ID)</label>
                    <input 
                      type="email" 
                      value={adminEmail} 
                      onChange={(e) => setAdminEmail(e.target.value)} 
                      placeholder="admin@hospital.com" 
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none text-on-surface"
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Mobile Number</label>
                    <input 
                      type="tel" 
                      value={adminMobile} 
                      onChange={(e) => setAdminMobile(e.target.value)} 
                      placeholder="e.g. +1 555-0100" 
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none text-on-surface"
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Login Password</label>
                  <input 
                    type="password" 
                    value={adminPassword} 
                    onChange={(e) => setAdminPassword(e.target.value)} 
                    placeholder="••••••••" 
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none text-on-surface"
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={hospitalRegLoading}
                className="w-full bg-[#00488d] hover:bg-[#00366b] text-white py-3.5 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {hospitalRegLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">cloud_done</span>
                    Submit Registration Details
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;