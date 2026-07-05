import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Loader2, Plus, Edit, ShieldAlert } from 'lucide-react';

const DepartmentMgmt: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Modal / Form States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDeptId, setEditDeptId] = useState('');
  const [deptForm, setDeptForm] = useState({ name: '', status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const response = await axiosInstance.get('/admin/departments/stats');
      setDepartments(response.data.data || []);
    } catch (err: any) {
      console.error(err);
      setErrorState(err.response?.data?.message || "Failed to retrieve hospital clinical departments.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name) return;
    try {
      await axiosInstance.post('/admin/departments', deptForm);
      alert("Clinical department registered successfully.");
      setIsCreateOpen(false);
      setDeptForm({ name: '', status: 'ACTIVE' });
      loadDepartments();
    } catch (err: any) {
      alert("Failed to register department: " + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name) return;
    try {
      await axiosInstance.put(`/admin/departments/${editDeptId}`, deptForm);
      alert("Department details updated successfully.");
      setIsEditOpen(false);
      setDeptForm({ name: '', status: 'ACTIVE' });
      loadDepartments();
    } catch (err: any) {
      alert("Failed to update department: " + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleStatus = async (id: string, name: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to change the status of ${name} to ${nextStatus}?`)) return;
    try {
      await axiosInstance.put(`/admin/departments/${id}`, { status: nextStatus });
      loadDepartments();
    } catch (err: any) {
      alert("Failed to toggle status: " + (err.response?.data?.message || err.message));
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
          <h4 className="font-bold">Governance Access Fault</h4>
          <p className="text-sm mt-xs">{errorState}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-xl font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Department Governance</h2>
          <p className="text-on-surface-variant text-body-md mt-xs">Provision clinical units, track practitioner metrics, and manage statuses</p>
        </div>
        <button
          onClick={() => {
            setDeptForm({ name: '', status: 'ACTIVE' });
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-sm bg-primary text-on-primary px-lg py-sm rounded-lg shadow hover:bg-primary-container font-bold transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Departments Listing */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low text-on-surface-variant text-label-lg font-bold uppercase">
            <tr>
              <th className="px-lg py-md">Department Name</th>
              <th className="px-lg py-md">Active Clinicians</th>
              <th className="px-lg py-md">Total Appointments</th>
              <th className="px-lg py-md">Status</th>
              <th className="px-lg py-md text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {departments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-lg py-8 text-center text-on-surface-variant">
                  No departments provisioned in this hospital center.
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-lg py-md font-body-lg font-bold">{dept.name}</td>
                  <td className="px-lg py-md font-body-md text-on-surface-variant">{dept.doctorsCount} doctors</td>
                  <td className="px-lg py-md font-body-md text-on-surface-variant">{dept.appointmentsCount} bookings</td>
                  <td className="px-lg py-md">
                    <button
                      onClick={() => handleToggleStatus(dept.id, dept.name, dept.status)}
                      className={`px-sm py-1 rounded text-xs font-black cursor-pointer transition-all ${
                        dept.status === 'ACTIVE' 
                          ? 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100/50' 
                          : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100/50'
                      }`}
                    >
                      {dept.status}
                    </button>
                  </td>
                  <td className="px-lg py-md text-right flex justify-end gap-sm">
                    <button
                      onClick={() => {
                        setEditDeptId(dept.id);
                        setDeptForm({ name: dept.name, status: dept.status });
                        setIsEditOpen(true);
                      }}
                      className="p-sm text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                      title="Edit details"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Department */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-md">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-[480px] p-lg shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="font-title-lg text-title-lg font-bold mb-md text-on-surface">Add Clinical Department</h3>
            <form onSubmit={handleCreate} className="space-y-md">
              <input
                type="text"
                required
                placeholder="Department Name (e.g. Pediatrics)"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
              />
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Initial Status</label>
                <select
                  value={deptForm.status}
                  onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value as any })}
                  className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Clinically available)</option>
                  <option value="INACTIVE">INACTIVE (Administrative lock)</option>
                </select>
              </div>
              <div className="flex justify-end gap-sm pt-sm">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-lg py-sm border border-outline rounded-xl font-bold text-sm cursor-pointer hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-lg py-sm bg-primary text-on-primary rounded-xl font-bold text-sm cursor-pointer hover:bg-primary-container"
                >
                  Register Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Department */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-md">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-[480px] p-lg shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="font-title-lg text-title-lg font-bold mb-md text-on-surface">Edit Department Details</h3>
            <form onSubmit={handleEdit} className="space-y-md">
              <input
                type="text"
                required
                placeholder="Department Name"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
              />
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Status</label>
                <select
                  value={deptForm.status}
                  onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value as any })}
                  className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div className="flex justify-end gap-sm pt-sm">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-lg py-sm border border-outline rounded-xl font-bold text-sm cursor-pointer hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-lg py-sm bg-primary text-on-primary rounded-xl font-bold text-sm cursor-pointer hover:bg-primary-container"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentMgmt;
