import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Loader2, Plus, Users, ShieldAlert } from 'lucide-react';

const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Registration Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'DOCTOR' as 'DOCTOR' | 'LAB_TECHNICIAN',
    departmentId: '',
    specialization: 'GENERAL_MEDICINE',
    licenseNumber: '',
    employeeId: ''
  });

  const specializations = [
    'CARDIOLOGY', 'DERMATOLOGY', 'EMERGENCY_MEDICINE', 'GENERAL_MEDICINE',
    'NEUROLOGY', 'ONCOLOGY', 'PEDIATRICS', 'PSYCHIATRY', 'SURGERY', 'RADIOLOGY', 'PATHOLOGY'
  ];

  useEffect(() => {
    loadStaffAndDepts();
  }, []);

  const loadStaffAndDepts = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const [staffRes, deptsRes] = await Promise.all([
        axiosInstance.get('/admin/staff'),
        axiosInstance.get('/admin/departments/stats').catch(() => ({ data: { data: [] } }))
      ]);
      setStaff(staffRes.data.data || []);
      const activeDepts = (deptsRes.data.data || []).filter((d: any) => d.status === 'ACTIVE');
      setDepartments(activeDepts);
      if (activeDepts.length > 0) {
        setRegisterForm(prev => ({ ...prev, departmentId: activeDepts[0].id }));
      }
    } catch (err: any) {
      console.error(err);
      setErrorState(err.response?.data?.message || "Failed to load staff registries.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        email: registerForm.email,
        password: registerForm.password,
        firstName: registerForm.firstName,
        lastName: registerForm.lastName,
        role: registerForm.role,
        departmentId: registerForm.role === 'DOCTOR' ? registerForm.departmentId : undefined,
        specialization: registerForm.role === 'DOCTOR' ? registerForm.specialization : undefined,
        licenseNumber: registerForm.role === 'DOCTOR' ? registerForm.licenseNumber : undefined,
        employeeId: registerForm.role === 'LAB_TECHNICIAN' ? registerForm.employeeId : undefined
      };

      await axiosInstance.post('/admin/staff/register', payload);
      alert("Staff registered successfully!");
      setIsModalOpen(false);
      // Reset form
      setRegisterForm({
        email: '', password: '', firstName: '', lastName: '',
        role: 'DOCTOR', departmentId: departments[0]?.id || '',
        specialization: 'GENERAL_MEDICINE', licenseNumber: '', employeeId: ''
      });
      loadStaffAndDepts();
    } catch (err: any) {
      alert("Registration failed: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-lg text-red-700 flex gap-md">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <div>
          <h4 className="font-bold">Access Fault</h4>
          <p className="text-sm mt-xs">{errorState}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-xl font-sans text-on-surface">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Staff Directory</h2>
          <p className="text-on-surface-variant text-body-md mt-xs">Register and review doctors, technicians, and clinical operators</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-sm bg-primary text-on-primary px-lg py-sm rounded-lg shadow hover:bg-primary-container font-bold transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Register Staff Member</span>
        </button>
      </div>

      {/* Staff Listings Table */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low text-on-surface-variant text-label-lg font-bold uppercase">
            <tr>
              <th className="px-lg py-md">Staff Name</th>
              <th className="px-lg py-md">Role</th>
              <th className="px-lg py-md">Department / Scope</th>
              <th className="px-lg py-md">License / Code</th>
              <th className="px-lg py-md">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-lg py-8 text-center text-on-surface-variant">
                  No staff members registered.
                </td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-lg py-md">
                    <div className="flex flex-col">
                      <span className="font-body-lg font-bold">{s.firstName} {s.lastName}</span>
                      <span className="text-xs text-on-surface-variant">ID: {s.id}</span>
                    </div>
                  </td>
                  <td className="px-lg py-md">
                    <span className={`px-sm py-1 rounded text-xs font-black uppercase tracking-wider ${
                      s.role === 'DOCTOR' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-lg py-md">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{s.department}</span>
                      <span className="text-xs text-on-surface-variant font-medium">{s.specialty}</span>
                    </div>
                  </td>
                  <td className="px-lg py-md font-mono text-sm font-semibold">{s.license}</td>
                  <td className="px-lg py-md">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      s.status === 'ACTIVE' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Register Staff */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-md">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-[500px] p-lg shadow-xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="font-title-lg text-title-lg font-bold mb-md text-on-surface">Register Staff Member</h3>
            <form onSubmit={handleRegister} className="space-y-md">
              
              {/* Role Toggle */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Staff Role</label>
                <select
                  value={registerForm.role}
                  onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value as any })}
                  className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                >
                  <option value="DOCTOR">DOCTOR (Physician/Clinician)</option>
                  <option value="LAB_TECHNICIAN">LAB_TECHNICIAN (LIS Analyst)</option>
                </select>
              </div>

              {/* Email / Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <input
                  type="email"
                  required
                  placeholder="Registry Email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                />
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-md">
                <input
                  type="text"
                  required
                  placeholder="First Name"
                  value={registerForm.firstName}
                  onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                  className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="Last Name"
                  value={registerForm.lastName}
                  onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                  className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                />
              </div>

              {/* Doctor Specific fields */}
              {registerForm.role === 'DOCTOR' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Assigned Department</label>
                    <select
                      value={registerForm.departmentId}
                      onChange={(e) => setRegisterForm({ ...registerForm, departmentId: e.target.value })}
                      className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                    >
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Clinical Specialization</label>
                    <select
                      value={registerForm.specialization}
                      onChange={(e) => setRegisterForm({ ...registerForm, specialization: e.target.value })}
                      className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                    >
                      {specializations.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Medical License Number"
                    value={registerForm.licenseNumber}
                    onChange={(e) => setRegisterForm({ ...registerForm, licenseNumber: e.target.value })}
                    className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                  />
                </>
              )}

              {/* Technician Specific fields */}
              {registerForm.role === 'LAB_TECHNICIAN' && (
                <input
                  type="text"
                  required
                  placeholder="Technician Employee ID"
                  value={registerForm.employeeId}
                  onChange={(e) => setRegisterForm({ ...registerForm, employeeId: e.target.value })}
                  className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                />
              )}

              <div className="flex justify-end gap-sm pt-sm">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-lg py-sm border border-outline rounded-xl font-bold text-sm cursor-pointer hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-lg py-sm bg-primary text-on-primary rounded-xl font-bold text-sm cursor-pointer hover:bg-primary-container"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
