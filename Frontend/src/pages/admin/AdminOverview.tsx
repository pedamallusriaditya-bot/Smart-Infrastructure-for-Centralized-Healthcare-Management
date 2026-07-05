import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { Loader2, Plus, Trash2, Shield, UserPlus, AlertCircle, Sparkles } from 'lucide-react';

const AdminOverview: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.email === 'superadmin@carehive.med';

  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Super Admin state
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [newHospital, setNewHospital] = useState({ name: '', address: '', phone: '' });
  
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', firstName: '', lastName: '' });

  // Hospital Admin state
  const [metrics, setMetrics] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      if (isSuperAdmin) {
        const res = await axiosInstance.get('/hospitals/all-detail');
        setHospitals(res.data.data || []);
      } else {
        const [metRes, apptRes, emgRes, roomRes] = await Promise.all([
          axiosInstance.get('/admin/metrics'),
          axiosInstance.get('/appointments').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/emergencies').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/admin/bed-occupancy').catch(() => ({ data: { data: [] } }))
        ]);
        setMetrics(metRes.data.data);
        setAppointments(apptRes.data.data || []);
        setEmergencies(emgRes.data.data || []);
        setRooms(roomRes.data.data || []);
      }
    } catch (err: any) {
      console.error(err);
      setErrorState(err.response?.data?.message || "Failed to load database registries.");
    } finally {
      setLoading(false);
    }
  };

  // --- Super Admin Actions ---
  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospital.name || !newHospital.address) return;
    try {
      await axiosInstance.post('/hospitals', newHospital);
      alert("Hospital registered successfully!");
      setIsHospitalModalOpen(false);
      setNewHospital({ name: '', address: '', phone: '' });
      loadData();
    } catch (err: any) {
      alert("Failed to create hospital: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteHospital = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this hospital facility?")) return;
    try {
      await axiosInstance.delete(`/hospitals/${id}`);
      alert("Hospital facility removed.");
      loadData();
    } catch (err: any) {
      alert("Failed to delete hospital: " + (err.response?.data?.message || err.message));
    }
  };

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.email || !newAdmin.password || !newAdmin.firstName || !newAdmin.lastName) return;
    try {
      await axiosInstance.post(`/hospitals/${selectedHospitalId}/admin`, newAdmin);
      alert("Hospital administrator registered successfully!");
      setIsAdminModalOpen(false);
      setNewAdmin({ email: '', password: '', firstName: '', lastName: '' });
      loadData();
    } catch (err: any) {
      alert("Failed to assign administrator: " + (err.response?.data?.message || err.message));
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
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <h4 className="font-bold">System Connection Interrupted</h4>
          <p className="text-sm mt-xs">{errorState}</p>
        </div>
      </div>
    );
  }

  if (isSuperAdmin) {
    return (
      <div className="space-y-xl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Registered Hospitals Directory</h2>
            <p className="text-on-surface-variant text-body-md mt-xs">Provision facilities and assign administration authority</p>
          </div>
          <button 
            onClick={() => setIsHospitalModalOpen(true)}
            className="flex items-center gap-sm bg-primary text-on-primary px-lg py-sm rounded-lg shadow-md hover:bg-primary-container transition-all cursor-pointer font-bold"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Hospital</span>
          </button>
        </div>

        {/* Hospitals Table */}
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant text-label-lg font-bold uppercase">
              <tr>
                <th className="px-lg py-md">Hospital Info</th>
                <th className="px-lg py-md">Address / Contacts</th>
                <th className="px-lg py-md">Assigned Administrator</th>
                <th className="px-lg py-md text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {hospitals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-lg py-8 text-center text-on-surface-variant">
                    No hospital facilities registered in CareHive database.
                  </td>
                </tr>
              ) : (
                hospitals.map((h) => {
                  const admin = h.admins?.[0];
                  return (
                    <tr key={h.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="px-lg py-md">
                        <div className="flex flex-col">
                          <span className="font-title-md text-body-lg font-bold">{h.name}</span>
                          <span className="text-[10px] text-on-surface-variant">ID: {h.id}</span>
                        </div>
                      </td>
                      <td className="px-lg py-md font-body-md text-on-surface-variant">
                        <div>{h.address}</div>
                        {h.phone && <div className="text-xs text-primary font-semibold mt-xs">📞 {h.phone}</div>}
                      </td>
                      <td className="px-lg py-md">
                        {admin ? (
                          <div className="flex items-center gap-sm text-on-surface">
                            <Shield className="w-4 h-4 text-primary" />
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{admin.firstName} {admin.lastName}</span>
                              <span className="text-xs text-on-surface-variant">{admin.user?.email}</span>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedHospitalId(h.id);
                              setIsAdminModalOpen(true);
                            }}
                            className="flex items-center gap-xs text-primary hover:underline text-sm font-bold cursor-pointer"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>Assign Administrator</span>
                          </button>
                        )}
                      </td>
                      <td className="px-lg py-md text-right">
                        <button
                          onClick={() => handleDeleteHospital(h.id)}
                          className="p-sm text-error hover:bg-error/5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal: Create Hospital */}
        {isHospitalModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-md">
            <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-[480px] p-lg shadow-xl animate-in zoom-in-95 duration-200">
              <h3 className="font-title-lg text-title-lg font-bold mb-md text-on-surface">Create Hospital Center</h3>
              <form onSubmit={handleCreateHospital} className="space-y-md">
                <input
                  type="text"
                  required
                  placeholder="Facility Name (e.g. St. Mary's General Hospital)"
                  value={newHospital.name}
                  onChange={(e) => setNewHospital({ ...newHospital, name: e.target.value })}
                  className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="Street Address, City, State"
                  value={newHospital.address}
                  onChange={(e) => setNewHospital({ ...newHospital, address: e.target.value })}
                  className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                />
                <input
                  type="text"
                  placeholder="Phone Line"
                  value={newHospital.phone}
                  onChange={(e) => setNewHospital({ ...newHospital, phone: e.target.value })}
                  className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                />
                <div className="flex justify-end gap-sm pt-sm">
                  <button
                    type="button"
                    onClick={() => setIsHospitalModalOpen(false)}
                    className="px-lg py-sm border border-outline rounded-xl font-bold text-sm cursor-pointer hover:bg-surface-container-high"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-lg py-sm bg-primary text-on-primary rounded-xl font-bold text-sm cursor-pointer hover:bg-primary-container"
                  >
                    Register Facility
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Assign Admin */}
        {isAdminModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-md">
            <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-[480px] p-lg shadow-xl animate-in zoom-in-95 duration-200">
              <h3 className="font-title-lg text-title-lg font-bold mb-md text-on-surface">Assign Hospital Admin</h3>
              <form onSubmit={handleAssignAdmin} className="space-y-md">
                <input
                  type="email"
                  required
                  placeholder="Admin Registry Email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                />
                <input
                  type="password"
                  required
                  placeholder="Registry Access Password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                />
                <div className="grid grid-cols-2 gap-md">
                  <input
                    type="text"
                    required
                    placeholder="First Name"
                    value={newAdmin.firstName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                    className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Last Name"
                    value={newAdmin.lastName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                    className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm focus:border-blue-600 outline-none"
                  />
                </div>
                <div className="flex justify-end gap-sm pt-sm">
                  <button
                    type="button"
                    onClick={() => setIsAdminModalOpen(false)}
                    className="px-lg py-sm border border-outline rounded-xl font-bold text-sm cursor-pointer hover:bg-surface-container-high"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-lg py-sm bg-primary text-on-primary rounded-xl font-bold text-sm cursor-pointer hover:bg-primary-container"
                  >
                    Authorize Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Hospital Admin View ---
  const activeEmergencies = emergencies.filter(e => e.status === 'ACTIVE');

  return (
    <div className="space-y-xl">
      {/* Overview stats header */}
      <div>
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Hospital Overview Dashboard</h2>
        <p className="text-on-surface-variant text-body-md mt-xs">Real-time clinical metrics, beds occupancy, and staff actions</p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {/* Total Patients */}
        <div className="bg-surface border border-outline-variant p-lg rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="font-label-md text-label-md uppercase tracking-wider">Registered Patients</span>
            <span className="material-symbols-outlined text-primary text-title-lg">personal_injury</span>
          </div>
          <div className="text-headline-lg font-bold text-primary mt-sm">{metrics?.stats?.patients || 0}</div>
          <div className="text-xs text-on-surface-variant mt-sm">Total linked to clinical charts</div>
        </div>

        {/* Total Doctors */}
        <div className="bg-surface border border-outline-variant p-lg rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="font-label-md text-label-md uppercase tracking-wider">Active Clinicians</span>
            <span className="material-symbols-outlined text-primary text-title-lg">stethoscope</span>
          </div>
          <div className="text-headline-lg font-bold text-on-surface mt-sm">{metrics?.stats?.doctors || 0}</div>
          <div className="text-xs text-on-surface-variant mt-sm">On-staff active practitioners</div>
        </div>

        {/* Bed Occupancy Rate */}
        <div className="bg-surface border border-outline-variant p-lg rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="font-label-md text-label-md uppercase tracking-wider">Bed Occupancy Rate</span>
            <span className="material-symbols-outlined text-primary text-title-lg">hotel</span>
          </div>
          <div className="text-headline-lg font-bold text-on-surface mt-sm">{metrics?.occupancyRate || '0%'}</div>
          <div className="text-xs text-on-surface-variant mt-sm">
            {metrics?.stats?.occupiedBeds || 0} of {metrics?.stats?.totalBeds || 0} beds occupied
          </div>
        </div>

        {/* Lab Orders count */}
        <div className="bg-surface border border-outline-variant p-lg rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="font-label-md text-label-md uppercase tracking-wider">Active Lab Orders</span>
            <span className="material-symbols-outlined text-primary text-title-lg">biotech</span>
          </div>
          <div className="text-headline-lg font-bold text-primary mt-sm">{metrics?.stats?.labOrders || 0}</div>
          <div className="text-xs text-on-surface-variant mt-sm">Pending laboratory diagnostics</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        {/* Left Column: Today's Appointments & Bed Status */}
        <div className="lg:col-span-8 space-y-xl">
          {/* Active Emergencies Alerts (Always Top if exist) */}
          {activeEmergencies.length > 0 && (
            <section className="bg-error-container/10 border-2 border-error/20 rounded-xl p-lg space-y-md shadow-sm">
              <div className="flex items-center gap-sm text-error font-bold">
                <span className="material-symbols-outlined animate-bounce">warning</span>
                <span>CRITICAL INCIDENTS: ACTIVE EMERGENCY CALLS ({activeEmergencies.length})</span>
              </div>
              <div className="space-y-sm">
                {activeEmergencies.map((e) => (
                  <div key={e.id} className="bg-white border border-error/30 rounded-lg p-md shadow-sm flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-on-surface">Patient: {e.patient ? `${e.patient.firstName} ${e.patient.lastName}` : "CareHive Patient"}</h4>
                      <p className="text-xs text-on-surface-variant mt-xs">Reason: {e.description}</p>
                    </div>
                    <span className="px-sm py-1 bg-error-container text-on-error-container border border-error/20 rounded text-xs font-black uppercase">
                      STAT / ALERT
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Today's Appointments Table */}
          <section className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="bg-primary text-on-primary px-lg py-md flex justify-between items-center">
              <h3 className="font-title-lg text-title-lg font-semibold">Today's Scheduled Appointments</h3>
              <span className="text-xs bg-on-primary/10 px-sm py-xs rounded">Total: {appointments.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low text-on-surface-variant text-label-lg uppercase">
                  <tr>
                    <th className="px-lg py-md font-bold">Patient</th>
                    <th className="px-lg py-md font-bold">Doctor / Specialty</th>
                    <th className="px-lg py-md font-bold">Scheduled Time</th>
                    <th className="px-lg py-md font-bold">Reason</th>
                    <th className="px-lg py-md font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-lg py-8 text-center text-on-surface-variant">
                        No appointments scheduled for today.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((appt) => {
                      const name = appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : "CareHive Patient";
                      const doc = appt.doctor ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}` : "Registered Practitioner";
                      const timeStr = new Date(appt.appointmentDate).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      return (
                        <tr key={appt.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="px-lg py-lg font-bold">{name}</td>
                          <td className="px-lg py-lg">
                            <div className="flex flex-col">
                              <span>{doc}</span>
                              <span className="text-xs text-on-surface-variant font-medium">{appt.doctor?.specialization || "GENERAL_MEDICINE"}</span>
                            </div>
                          </td>
                          <td className="px-lg py-lg text-on-surface-variant">{timeStr}</td>
                          <td className="px-lg py-lg text-on-surface-variant">{appt.reason}</td>
                          <td className="px-lg py-lg">
                            <span className={`px-sm py-xs rounded-full text-xs font-bold ${
                              appt.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700' :
                              appt.status === 'COMPLETED' ? 'bg-teal-50 text-teal-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {appt.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column: Room Occupancy Statistics */}
        <aside className="lg:col-span-4 space-y-xl">
          <section className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm p-lg">
            <h3 className="font-title-lg text-title-lg font-bold text-on-surface mb-lg">Bed Occupancy Statistics</h3>
            <div className="space-y-md">
              {rooms.length === 0 ? (
                <div className="text-center py-4 text-on-surface-variant text-sm italic">
                  No rooms or bed telemetry configured.
                </div>
              ) : (
                rooms.map((room) => {
                  const total = room._count?.beds || 0;
                  const occupied = room.beds?.filter((b: any) => b.status === 'OCCUPIED').length || 0;
                  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
                  return (
                    <div key={room.roomNumber} className="border border-outline-variant p-md rounded-lg bg-surface-container-lowest">
                      <div className="flex justify-between items-center mb-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">Room {room.roomNumber}</span>
                          <span className="text-[10px] text-on-surface-variant font-black uppercase">{room.type}</span>
                        </div>
                        <span className="text-xs font-bold text-primary">{occupied} / {total} Beds</span>
                      </div>
                      <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${rate > 80 ? 'bg-error' : rate > 50 ? 'bg-tertiary' : 'bg-primary'}`}
                          style={{ width: `${rate}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default AdminOverview;
