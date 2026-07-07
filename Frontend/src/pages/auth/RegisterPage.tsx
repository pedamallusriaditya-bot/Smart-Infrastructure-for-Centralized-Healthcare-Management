import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../../api/auth.api';
import { getAssignedHospitals, getDepartmentsByHospital } from '../../api/admin.api';
import { useAuth } from '../../context/AuthContext';
import { Hospital, BloodGroup, Gender } from '../../types/auth.types';
import { 
  User, BriefcaseMedical, Loader2, AlertCircle, ShieldCheck, 
  CheckCircle2, Building2, Stethoscope, Phone, Calendar 
} from 'lucide-react';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState<'PATIENT' | 'DOCTOR' | 'NURSE'>('PATIENT');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeptLoading, setIsDeptLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '',
    password: '', confirmPassword: '',
    phone: '', dob: '', 
    gender: 'PREFER_NOT_TO_SAY' as Gender,
    bloodGroup: 'O+' as BloodGroup,
    hospitalId: '',
    departmentId: '', // THE UUID FIELD
    license: '',
    spec: 'GENERAL_MEDICINE'
  });

  // 1. Fetch Hospitals
  useEffect(() => {
    getAssignedHospitals().then(setHospitals).catch(() => {
      setHospitals([{ id: '00000000-0000-0000-0000-000000000001', name: 'Central Care Hospital', address: '1 Infinite Loop' }]);
    });
  }, []);

  // 2. Fetch Departments & AUTO-SELECT FIX
  useEffect(() => {
    const fetchDepts = async () => {
      if (formData.hospitalId && (role === 'DOCTOR' || role === 'NURSE')) {
        setIsDeptLoading(true);
        try {
          const data = await getDepartmentsByHospital(formData.hospitalId);
          setDepartments(data);
          
          // CRITICAL FIX: If data exists, force the first item into the state immediately
          if (data && data.length > 0) {
            setFormData(prev => ({ ...prev, departmentId: data[0].id }));
            console.log("📍 Auto-selected Department ID:", data[0].id);
          }
        } catch (err) {
          setDepartments([]);
        } finally {
          setIsDeptLoading(false);
        }
      }
    };
    fetchDepts();
  }, [formData.hospitalId, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match.");
    }

    // --- PIPELINE GUARD: Prevent Sending empty IDs ---
    if ((role === 'DOCTOR' || role === 'NURSE') && (!formData.departmentId || formData.departmentId === "")) {
      return setError("Please manually select a Hospital Unit/Department.");
    }
    
    setIsLoading(true);
    setError(null);

    const payload = {
      email: formData.email,
      password: formData.password,
      role: role,
      firstName: formData.firstName,
      lastName: formData.lastName,
      extraField: role === 'PATIENT' ? {
        phone: formData.phone,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        dateOfBirth: formData.dob
      } : role === 'DOCTOR' ? {
        hospitalId: formData.hospitalId,
        departmentId: formData.departmentId, // VERIFIED UUID
        licenseNumber: formData.license,
        specialization: formData.spec
      } : {
        hospitalId: formData.hospitalId,
        departmentId: formData.departmentId, // VERIFIED UUID
        employeeId: formData.license
      }
    };

    console.log("✈️ FINAL SUBMISSION:", payload);

    try {
      const data = await registerUser(payload);
      if (role === 'DOCTOR') {
        navigate('/login', { state: { info: "SUCCESS" } });
      } else if (role === 'NURSE') {
        login(data);
        if (payload.extraField.hospitalId) {
          localStorage.setItem('hospitalId', payload.extraField.hospitalId);
        }
        navigate('/nurse/dashboard');
      } else {
        login(data);
        navigate('/patient/dashboard');
      }
    } catch (err: any) {
      // Logic to show exactly what the server rejected
      const serverMsg = err.response?.data?.message || "Invalid Data: Please ensure all fields are selected.";
      setError(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 py-10 font-sans">
      <div className="w-full max-w-[680px] bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl overflow-hidden">
        
        <div className="bg-[#00488d] p-10 text-white text-center relative">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">CareHive <span className="font-light not-italic">OS</span></h1>
          <p className="text-blue-100 text-[10px] mt-2 font-bold tracking-[0.3em] uppercase opacity-80">Registry Enrollment Protocol</p>
        </div>

        <div className="p-10 space-y-8">
          <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200 gap-1.5">
            <button type="button" onClick={() => setRole('PATIENT')} className={`flex-1 py-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all ${role === 'PATIENT' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><User size={16} /> Resident Patient</button>
            <button type="button" onClick={() => setRole('DOCTOR')} className={`flex-1 py-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all ${role === 'DOCTOR' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><BriefcaseMedical size={16} /> Doctor</button>
            <button type="button" onClick={() => setRole('NURSE')} className={`flex-1 py-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all ${role === 'NURSE' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><BriefcaseMedical size={16} /> Nurse</button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold rounded-lg flex gap-3 animate-in fade-in duration-300">
              <AlertCircle className="shrink-0 w-5 h-5" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none transition-all" placeholder="First Name" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none transition-all" placeholder="Last Name" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>

            <input type="email" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none transition-all" placeholder="Registry Email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />

            {(role === 'DOCTOR' || role === 'NURSE') && (
              <div className="space-y-4 bg-teal-50/50 p-8 rounded-[1.5rem] border border-teal-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-600 w-4 h-4" />
                  <select 
                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-teal-200 rounded-xl text-sm font-bold text-teal-900"
                    required
                    value={formData.hospitalId}
                    onChange={e => setFormData({...formData, hospitalId: e.target.value, departmentId: ''})}
                  >
                    <option value="">Select Hospital Center...</option>
                    {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>

                <div className="relative">
                  <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-600 w-4 h-4" />
                  <select 
                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-teal-200 rounded-xl text-sm font-bold disabled:opacity-50"
                    required
                    disabled={!formData.hospitalId || isDeptLoading}
                    value={formData.departmentId}
                    onChange={e => setFormData({...formData, departmentId: e.target.value})}
                  >
                    <option value="" disabled>-- Select Hospital Unit / Ward --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {role === 'DOCTOR' ? (
                  <input className="w-full p-3.5 bg-white border border-teal-100 rounded-xl text-sm" placeholder="Medical License Number" required value={formData.license} onChange={e => setFormData({...formData, license: e.target.value})} />
                ) : (
                  <input className="w-full p-3.5 bg-white border border-teal-100 rounded-xl text-sm" placeholder="Nurse Employee ID" required value={formData.license} onChange={e => setFormData({...formData, license: e.target.value})} />
                )}
              </div>
            )}

            {role === 'PATIENT' && (
              <div className="grid grid-cols-2 gap-5 bg-blue-50/50 p-8 rounded-[1.5rem] border border-blue-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="col-span-2 relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
                  <input className="w-full pl-10 p-3.5 bg-white border border-blue-200 rounded-xl text-sm" placeholder="Phone" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <input type="date" className="p-3.5 bg-white border border-blue-100 rounded-xl text-sm" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                <select className="p-3.5 bg-white border border-blue-200 rounded-xl text-sm font-bold text-blue-900" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as Gender})}>
                   <option value="MALE">Male</option><option value="FEMALE">Female</option>
                </select>
                <select className="col-span-2 p-3.5 bg-white border border-blue-200 rounded-xl text-sm font-bold text-blue-900" value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value as BloodGroup})}>
                   {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map(bg => <option key={bg} value={bg}>{bg} Blood Group</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <input type="password" placeholder="Passcode" className="w-full p-3.5 bg-slate-50 border rounded-xl text-sm focus:bg-white transition-all" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              <input type="password" placeholder="Verify Passcode" className={`w-full p-3.5 bg-slate-50 border rounded-xl text-sm focus:bg-white transition-all ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-400 bg-red-50' : ''}`} required value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
            </div>

            <button disabled={isLoading} className="w-full py-5 bg-[#00488d] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:bg-slate-300">
              {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <><CheckCircle2 size={18}/> Initiate Enrollment</>}
            </button>
          </form>

          <div className="text-center font-medium text-slate-400 text-sm">
             Already a member? <Link to="/login" className="text-[#00488d] font-black hover:underline ml-1">Member Log In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;