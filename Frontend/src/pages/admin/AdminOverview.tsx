import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { Loader2, Plus, Trash2, Shield, UserPlus, AlertCircle, Sparkles } from 'lucide-react';
import { getInventorySummary, InventorySummary } from '../../api/inventory.api';
import {
  getHospitalAttendanceToday,
  getHospitalAttendanceMetrics
} from '../../api/attendance.api';
import {
  getOwnHospitalDiagnostics,
  updateHospitalDiagnostics
} from '../../api/diagnostic.api';
import {
  getHospitalStockAnalytics
} from '../../api/inventory-ai.api';
import {
  getHospitalDemandForecasts,
  generateHospitalDemandForecast
} from '../../api/demand.api';
import { getHospitalPerformanceDashboard } from '../../api/admin.api';

const renderPerformanceCard = (
  title: string,
  hospitalVal: string | number,
  districtVal: string | number,
  icon: string,
  comparisonType: 'higher-better' | 'lower-better',
  comparisonUnit: string = ''
) => {
  const hNum = typeof hospitalVal === 'string' ? parseFloat(hospitalVal.replace(/[^0-9.]/g, '')) : hospitalVal;
  const dNum = typeof districtVal === 'string' ? parseFloat(districtVal.replace(/[^0-9.]/g, '')) : districtVal;
  
  const difference = hNum - dNum;
  const percentDiff = dNum > 0 ? Math.round((difference / dNum) * 100) : 0;
  
  const isBetter = comparisonType === 'higher-better' ? difference >= 0 : difference <= 0;
  
  let badgeColor = '';
  let badgeText = '';
  
  if (difference === 0) {
    badgeColor = 'bg-gray-50 text-gray-600 border-gray-250 dark:bg-slate-800 dark:text-slate-300';
    badgeText = 'Equal to district avg';
  } else {
    const absDiff = Math.abs(difference).toLocaleString(undefined, { maximumFractionDigits: 1 });
    const absPercent = Math.abs(percentDiff);
    
    if (isBetter) {
      badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800';
      badgeText = comparisonType === 'higher-better' 
        ? `+${absPercent}% (${absDiff}${comparisonUnit} above avg)`
        : `-${absPercent}% (${absDiff}${comparisonUnit} below avg)`;
    } else {
      badgeColor = 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800';
      badgeText = comparisonType === 'higher-better'
        ? `-${absPercent}% (${absDiff}${comparisonUnit} below avg)`
        : `+${absPercent}% (${absDiff}${comparisonUnit} above avg)`;
    }
  }

  return (
    <div className="bg-surface border border-outline-variant p-lg rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md flex flex-col justify-between text-left">
      <div>
        <div className="flex justify-between items-center text-on-surface-variant mb-md">
          <span className="font-bold text-[10px] uppercase tracking-wider text-secondary">{title}</span>
          <span className="material-symbols-outlined text-primary text-title-lg">{icon}</span>
        </div>
        <div className="flex items-baseline gap-sm flex-wrap">
          <span className="text-2xl font-black text-on-surface">{hospitalVal}</span>
          <span className="text-[10px] text-on-surface-variant font-medium">District avg: {districtVal}</span>
        </div>
      </div>
      <div className={`mt-md px-sm py-1 border rounded-lg text-[9px] font-black text-center ${badgeColor}`}>
        {badgeText}
      </div>
    </div>
  );
};

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
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
  const [attendanceToday, setAttendanceToday] = useState<any[]>([]);
  const [attendanceMetrics, setAttendanceMetrics] = useState<any>(null);
  const [diagnosticsList, setDiagnosticsList] = useState<any[]>([]);
  const [isDiagUpdating, setIsDiagUpdating] = useState(false);
  const [aiStockData, setAiStockData] = useState<any[]>([]);
  const [demandForecasts, setDemandForecasts] = useState<any[]>([]);
  const [selectedHorizon, setSelectedHorizon] = useState<number>(30);
  const [isGeneratingForecast, setIsGeneratingForecast] = useState<boolean>(false);

  // Performance Dashboard state
  const [adminTab, setAdminTab] = useState<'overview' | 'performance'>('overview');
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  const loadPerformanceData = async () => {
    setPerfLoading(true);
    try {
      const data = await getHospitalPerformanceDashboard();
      setPerformanceData(data);
    } catch (err: any) {
      console.error("loadPerformanceData error", err);
    } finally {
      setPerfLoading(false);
    }
  };

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (adminTab === 'performance') {
      loadPerformanceData();
    }
  }, [adminTab]);

  const loadData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      if (isSuperAdmin) {
        const res = await axiosInstance.get('/hospitals/all-detail');
        setHospitals(res.data.data || []);
      } else {
        const [metRes, apptRes, emgRes, roomRes, attToday, attMetrics, diags, aiStock, forecasts] = await Promise.all([
          axiosInstance.get('/admin/metrics'),
          axiosInstance.get('/appointments').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/emergencies').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/admin/bed-occupancy').catch(() => ({ data: { data: [] } })),
          getHospitalAttendanceToday().catch(() => []),
          getHospitalAttendanceMetrics().catch(() => null),
          getOwnHospitalDiagnostics().catch(() => []),
          getHospitalStockAnalytics().catch(() => []),
          getHospitalDemandForecasts().catch(() => [])
        ]);
        setMetrics(metRes.data.data);
        setAppointments(apptRes.data.data || []);
        setEmergencies(emgRes.data.data || []);
        setRooms(roomRes.data.data || []);
        setAttendanceToday(attToday || []);
        setAttendanceMetrics(attMetrics);
        setDiagnosticsList(diags || []);
        setAiStockData(aiStock || []);
        setDemandForecasts(forecasts || []);
        // Load inventory summary (non-blocking)
        getInventorySummary().then(setInventorySummary).catch(() => {});
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

  const handleUpdateDiagnostic = async (testType: string, status: string, cost: number) => {
    setIsDiagUpdating(true);
    try {
      await updateHospitalDiagnostics([{ testType, status, cost }]);
      alert(`${testType} availability updated successfully!`);
      const diags = await getOwnHospitalDiagnostics().catch(() => []);
      setDiagnosticsList(diags || []);
    } catch (err: any) {
      alert("Failed to update availability: " + (err.response?.data?.message || err.message));
    } finally {
      setIsDiagUpdating(false);
    }
  };

  const handleGenerateForecast = async (horizon: number) => {
    setIsGeneratingForecast(true);
    try {
      await generateHospitalDemandForecast(horizon);
      alert(`AI Forecast model for ${horizon} days horizon executed successfully!`);
      const forecasts = await getHospitalDemandForecasts().catch(() => []);
      setDemandForecasts(forecasts || []);
    } catch (err: any) {
      alert("Failed to execute forecast model: " + (err.response?.data?.message || err.message));
    } finally {
      setIsGeneratingForecast(false);
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
    <div className="space-y-xl text-left">
      {/* Tab toggle and Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-outline-variant pb-md">
        <div>
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            {adminTab === 'overview' ? 'Hospital Overview Dashboard' : `${performanceData?.hospital?.name || 'Hospital'} Performance`}
          </h2>
          <p className="text-on-surface-variant text-body-md mt-xs">
            {adminTab === 'overview' 
              ? 'Real-time clinical metrics, beds occupancy, and staff actions'
              : `Scoped performance KPIs compared with district (${performanceData?.hospital?.district || 'District'}) averages`}
          </p>
        </div>

        <div className="flex bg-surface-container-high p-1 rounded-xl border border-outline-variant select-none shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setAdminTab('overview')}
            className={`px-lg py-sm rounded-lg font-bold text-sm transition-all cursor-pointer ${
              adminTab === 'overview' 
                ? 'bg-[#00488d] text-white shadow-xs font-black' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('performance')}
            className={`px-lg py-sm rounded-lg font-bold text-sm transition-all cursor-pointer flex items-center gap-xs ${
              adminTab === 'performance' 
                ? 'bg-[#00488d] text-white shadow-xs font-black' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Performance & District comparison
          </button>
        </div>
      </div>

      {adminTab === 'overview' ? (
        <div className="space-y-xl">

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
            <span className="font-label-md text-label-md uppercase tracking-wider">Hospital Staff</span>
            <span className="material-symbols-outlined text-primary text-title-lg">stethoscope</span>
          </div>
          <div className="text-headline-lg font-bold text-on-surface mt-sm">
            {(metrics?.stats?.doctors || 0) + (metrics?.stats?.nurses || 0) + (metrics?.stats?.pharmacists || 0)}
          </div>
          <div className="text-xs text-on-surface-variant mt-sm">
            D: {metrics?.stats?.doctors || 0} | N: {metrics?.stats?.nurses || 0} | P: {metrics?.stats?.pharmacists || 0}
          </div>
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

      {/* ── Inventory Summary Widget ─────────────────────────────── */}
      {inventorySummary && (
        <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius: 16, padding: '20px 24px', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: '#a5b4fc', fontSize: 22 }}>inventory_2</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Inventory Status</span>
            </div>
            <button onClick={() => navigate('/admin/inventory')} style={{ fontSize: 12, padding: '5px 14px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, color: '#e0e7ff', cursor: 'pointer', fontWeight: 600 }}>
              View All →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Total Items',   value: inventorySummary.totalItems,    icon: 'inventory_2', color: '#818cf8' },
              { label: 'Low Stock',      value: inventorySummary.lowStockCount,  icon: 'trending_down', color: '#fbbf24' },
              { label: 'Critical',       value: inventorySummary.criticalCount,  icon: 'error',       color: '#f87171' },
              { label: 'Active Alerts',  value: inventorySummary.activeAlertCount, icon: 'notifications_active', color: inventorySummary.activeAlertCount > 0 ? '#f87171' : '#6ee7b7' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: stat.color }}>{stat.icon}</span>
                </div>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{stat.value}</span>
              </div>
            ))}
          </div>
          {inventorySummary.activeAlertCount > 0 && (
            <div style={{ marginTop: 12, padding: '8px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#f87171' }}>warning</span>
              <span style={{ fontSize: 12, color: '#fca5a5', fontWeight: 600 }}>
                {inventorySummary.activeAlertCount} active inventory alert{inventorySummary.activeAlertCount !== 1 ? 's' : ''} require attention.
              </span>
              <button onClick={() => navigate('/admin/inventory')} style={{ marginLeft: 'auto', fontSize: 11, color: '#fca5a5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>View →</button>
            </div>
          )}
        </div>
      )}

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

          {/* Doctor Attendance Registry (Today) */}
          <section className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="bg-primary text-on-primary px-lg py-md flex justify-between items-center">
              <h3 className="font-title-lg text-title-lg font-semibold flex items-center gap-sm">
                <span className="material-symbols-outlined">fingerprint</span>
                Doctor Attendance & Shift Monitor
              </h3>
              {attendanceMetrics?.monthly && (
                <span className="text-xs bg-on-primary/10 px-sm py-xs rounded">
                  Monthly Rate: {attendanceMetrics.monthly.attendancePercentage}%
                </span>
              )}
            </div>
            
            {/* KPI Counts sub-grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-sm p-lg bg-surface-container-lowest border-b border-outline-variant">
              <div className="bg-surface border border-outline-variant p-sm rounded-lg text-center">
                <p className="text-[10px] text-on-surface-variant font-bold uppercase">Present</p>
                <p className="text-lg font-black text-green-700 mt-xs">{attendanceMetrics?.today?.presentToday || 0}</p>
              </div>
              <div className="bg-surface border border-outline-variant p-sm rounded-lg text-center">
                <p className="text-[10px] text-on-surface-variant font-bold uppercase">On Break</p>
                <p className="text-lg font-black text-amber-600 mt-xs">{attendanceMetrics?.today?.breakToday || 0}</p>
              </div>
              <div className="bg-surface border border-outline-variant p-sm rounded-lg text-center">
                <p className="text-[10px] text-on-surface-variant font-bold uppercase">Emergency Duty</p>
                <p className="text-lg font-black text-error mt-xs">{attendanceMetrics?.today?.emergencyToday || 0}</p>
              </div>
              <div className="bg-surface border border-outline-variant p-sm rounded-lg text-center">
                <p className="text-[10px] text-on-surface-variant font-bold uppercase">On Leave</p>
                <p className="text-lg font-black text-blue-700 mt-xs">{attendanceMetrics?.today?.leaveToday || 0}</p>
              </div>
              <div className="bg-surface border border-outline-variant p-sm rounded-lg text-center col-span-2 md:col-span-1">
                <p className="text-[10px] text-on-surface-variant font-bold uppercase">Late Arrivals</p>
                <p className="text-lg font-black text-amber-500 mt-xs">{attendanceMetrics?.today?.lateToday || 0}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low text-on-surface-variant text-label-lg uppercase">
                  <tr>
                    <th className="px-lg py-md font-bold">Doctor</th>
                    <th className="px-lg py-md font-bold">Check-In</th>
                    <th className="px-lg py-md font-bold">Check-Out</th>
                    <th className="px-lg py-md font-bold">Status</th>
                    <th className="px-lg py-md font-bold">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant text-sm">
                  {attendanceToday.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-lg py-8 text-center text-on-surface-variant italic">
                        No check-ins logged today. Clinicians will appear here as they clock into their shifts.
                      </td>
                    </tr>
                  ) : (
                    attendanceToday.map((att: any) => {
                      const docName = att.doctor ? `Dr. ${att.doctor.firstName} ${att.doctor.lastName}` : "CareHive Physician";
                      const checkIn = att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                      const checkOut = att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                      return (
                        <tr key={att.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="px-lg py-md font-bold">
                            <div className="flex flex-col">
                              <span className="flex items-center gap-xs">
                                {docName}
                                {att.isLate && (
                                  <span className="px-1 bg-amber-100 text-amber-800 text-[9px] font-black rounded tracking-wide">
                                    LATE
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-on-surface-variant font-medium">{att.doctor?.specialization}</span>
                            </div>
                          </td>
                          <td className="px-lg py-md font-mono font-semibold text-primary">{checkIn}</td>
                          <td className="px-lg py-md font-mono text-on-surface-variant">{checkOut}</td>
                          <td className="px-lg py-md">
                            <span className={`px-sm py-1 rounded text-xs font-black uppercase tracking-wider ${
                              att.status === 'PRESENT' ? 'bg-green-50 text-green-700' :
                              att.status === 'BREAK' ? 'bg-amber-50 text-amber-700' :
                              att.status === 'EMERGENCY_DUTY' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {att.status}
                            </span>
                          </td>
                          <td className="px-lg py-md font-semibold">{att.workingHours != null ? `${att.workingHours}h` : '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* AI Resource Demand Forecasting & Command Panel */}
          <section className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm mt-lg">
            <div className="bg-primary text-on-primary px-lg py-md flex flex-col md:flex-row md:items-center justify-between gap-sm">
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined">online_prediction</span>
                <h2 className="font-title-lg text-title-lg">AI Resource Demand Forecasting</h2>
              </div>
              
              <div className="flex items-center gap-sm">
                {/* Horizon selector */}
                <select
                  value={selectedHorizon}
                  onChange={(e) => setSelectedHorizon(Number(e.target.value))}
                  className="bg-primary-container text-on-primary-container border-0 rounded-lg p-sm text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="7">7 Days Horizon</option>
                  <option value="30">30 Days Horizon</option>
                  <option value="90">90 Days Horizon</option>
                </select>

                <button
                  onClick={() => handleGenerateForecast(selectedHorizon)}
                  disabled={isGeneratingForecast}
                  className="px-3 py-1.5 bg-[#00488d] border border-blue-400 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors flex items-center gap-xs cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingForecast ? <Loader2 className="animate-spin w-3 h-3" /> : <span className="material-symbols-outlined text-xs">sync</span>}
                  Re-project
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-surface text-primary border border-outline rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">print</span>
                  Print Report
                </button>
              </div>
            </div>

            {(() => {
              const activeForecast = demandForecasts.find(f => f.forecastHorizon === selectedHorizon);
              if (!activeForecast) {
                return (
                  <div className="p-lg text-center text-on-surface-variant italic text-sm">
                    No forecast telemetry loaded for the selected {selectedHorizon}-day horizon. Run "Re-project" to calculate.
                  </div>
                );
              }

              return (
                <div className="p-lg space-y-lg text-left text-xs">
                  {/* Top Stats block */}
                  <div className="flex justify-between items-center bg-slate-50 border border-slate-150 p-md rounded-xl">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Prediction Confidence Rate</p>
                      <h4 className="text-xl font-black text-[#00488d] font-mono mt-0.5">{activeForecast.confidenceRate}%</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Model Status</p>
                      <span className="inline-flex items-center gap-xs bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full mt-0.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                        Optimized
                      </span>
                    </div>
                  </div>

                  {/* Core Requirements Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
                    <div className="border border-outline-variant p-md rounded-xl bg-surface-container-lowest text-left">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Predicted Beds Required</span>
                      <h4 className="text-lg font-black text-gray-800 font-mono mt-1">{activeForecast.bedDemand} beds</h4>
                    </div>
                    <div className="border border-outline-variant p-md rounded-xl bg-surface-container-lowest text-left">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Doctors Required</span>
                      <h4 className="text-lg font-black text-gray-800 font-mono mt-1">{activeForecast.doctorRequirement} MDs</h4>
                    </div>
                    <div className="border border-outline-variant p-md rounded-xl bg-surface-container-lowest text-left">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Nurses Required</span>
                      <h4 className="text-lg font-black text-gray-800 font-mono mt-1">{activeForecast.nurseRequirement} RNs</h4>
                    </div>
                    <div className="border border-outline-variant p-md rounded-xl bg-surface-container-lowest text-left">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Lab Test Orders Volume</span>
                      <h4 className="text-lg font-black text-gray-800 font-mono mt-1">{activeForecast.labLoad} tests</h4>
                    </div>
                  </div>

                  {/* Medicines & Blood Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-lg border-t border-gray-100 pt-lg">
                    {/* Medicine Demand */}
                    <div className="space-y-sm">
                      <div className="flex items-center gap-xs text-[#00488d] font-bold text-xs">
                        <span className="material-symbols-outlined text-sm">pill</span>
                        <span>PROJECTED MEDICINE DEMAND</span>
                      </div>
                      <div className="space-y-xs max-h-48 overflow-y-auto pr-1">
                        {activeForecast.medicineDemand?.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No medicine allocations projected.</p>
                        ) : (
                          activeForecast.medicineDemand?.map((med: any) => (
                            <div key={med.medicineId} className="flex justify-between items-center p-md bg-gray-50 border border-gray-100 rounded-xl font-medium">
                              <span className="font-bold text-gray-700">{med.name}</span>
                              <span className="text-xs font-black text-[#00488d] font-mono">{med.quantity} units</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Blood Requirement */}
                    <div className="space-y-sm">
                      <div className="flex items-center gap-xs text-[#00488d] font-bold text-xs">
                        <span className="material-symbols-outlined text-sm">bloodtype</span>
                        <span>PROJECTED BLOOD BANK DEMAND</span>
                      </div>
                      <div className="grid grid-cols-2 gap-xs max-h-48 overflow-y-auto pr-1">
                        {activeForecast.bloodRequirement?.length === 0 ? (
                          <p className="text-xs text-gray-400 italic col-span-2">No blood unit requirements projected.</p>
                        ) : (
                          activeForecast.bloodRequirement?.map((blood: any) => (
                            <div key={blood.bloodGroup} className="flex justify-between items-center p-md bg-gray-50 border border-gray-100 rounded-xl font-medium">
                              <span className="font-bold text-gray-700 font-mono">{blood.bloodGroup}</span>
                              <span className="text-xs font-black text-red-600 font-mono">{blood.quantity} units</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
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

          {/* Diagnostic Availability Manager */}
          <section className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm p-lg">
            <div className="flex justify-between items-center mb-lg">
              <h3 className="font-title-lg text-title-lg font-bold text-on-surface flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary">biotech</span>
                Diagnostic Lab Status
              </h3>
              {isDiagUpdating && <Loader2 className="animate-spin text-primary w-4 h-4" />}
            </div>
            
            <div className="space-y-sm max-h-[480px] overflow-y-auto pr-1">
              {diagnosticsList.length === 0 ? (
                <div className="text-center py-4 text-on-surface-variant text-sm italic">
                  Initializing diagnostic registry...
                </div>
              ) : (
                diagnosticsList.map((d: any) => (
                  <div key={d.testType} className="border border-outline-variant p-md rounded-lg bg-surface-container-lowest flex flex-col gap-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-gray-800">{d.testType}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        d.status === 'AVAILABLE' ? 'bg-green-50 text-green-700' :
                        d.status === 'MAINTENANCE' ? 'bg-amber-50 text-amber-700' :
                        d.status === 'EXTERNAL_REFERRAL' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {d.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-12 gap-sm items-center mt-xs">
                      {/* Status Dropdown */}
                      <select
                        value={d.status}
                        onChange={(e) => handleUpdateDiagnostic(d.testType, e.target.value, d.cost)}
                        className="col-span-7 p-sm bg-surface border border-outline rounded-lg text-xs outline-none focus:border-primary"
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="UNAVAILABLE">Unavailable</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="EXTERNAL_REFERRAL">External Referral</option>
                      </select>

                      {/* Cost input */}
                      <div className="col-span-5 flex items-center gap-xs">
                        <span className="text-[10px] text-gray-400 font-bold">$</span>
                        <input
                          type="number"
                          value={d.cost}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            // Update local diagnosticsList cost immediately, save will happen when they blur or press enter
                            setDiagnosticsList(prev => prev.map(item => item.testType === d.testType ? { ...item, cost: val } : item));
                          }}
                          onBlur={(e) => handleUpdateDiagnostic(d.testType, d.status, parseFloat(e.target.value) || 0)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateDiagnostic(d.testType, d.status, parseFloat((e.target as HTMLInputElement).value) || 0);
                            }
                          }}
                          className="w-full p-sm bg-surface border border-outline rounded-lg text-xs text-right outline-none focus:border-primary font-mono font-bold"
                          placeholder="Cost"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
          </section>

          {/* AI Stock Projections & Forecaster */}
          <section className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm p-lg">
            <h3 className="font-title-lg text-title-lg font-bold text-on-surface mb-lg flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">online_prediction</span>
              AI Stock Projections
            </h3>

            {/* AI Warning Alerts Block */}
            {(() => {
              const warnings: string[] = [];
              aiStockData.forEach((item: any) => {
                const nowVal = new Date();
                if (item.quantity === 0) {
                  warnings.push(`🔴 Critical: ${item.name} is OUT OF STOCK.`);
                } else if (item.quantity <= item.minQuantity) {
                  warnings.push(`⚠️ Low: ${item.name} (${item.quantity} left, minimum ${item.minQuantity}).`);
                }
                if (item.expiryDate) {
                  const exp = new Date(item.expiryDate);
                  if (exp < nowVal) {
                    warnings.push(`🚫 Expired: ${item.name} (Batch: ${item.batchNumber || 'N/A'}) has expired.`);
                  } else if (exp.getTime() < nowVal.getTime() + 30 * 24 * 60 * 60 * 1000) {
                    warnings.push(`⏳ Expiring: ${item.name} expires in less than 30 days.`);
                  }
                }
              });

              if (warnings.length === 0) return null;
              return (
                <div className="bg-red-50 border border-red-100 rounded-xl p-md text-left space-y-xs text-xs text-red-700 mb-lg max-h-36 overflow-y-auto">
                  <p className="font-black tracking-wider uppercase text-[10px] text-red-500 flex items-center gap-xs">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    AI Inventory Alerts ({warnings.length})
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    {warnings.map((w, idx) => <li key={idx} className="font-medium">{w}</li>)}
                  </ul>
                </div>
              );
            })()}

            {/* Roster & Projections list */}
            <div className="space-y-sm max-h-[400px] overflow-y-auto pr-1">
              {aiStockData.length === 0 ? (
                <div className="text-center py-4 text-on-surface-variant text-sm italic">
                  No stock items monitored yet.
                </div>
              ) : (
                aiStockData.map((item: any) => {
                  const stockoutDate = item.predictedStockOutDate ? new Date(item.predictedStockOutDate) : null;
                  const daysToStockout = stockoutDate 
                    ? Math.max(0, Math.round((stockoutDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))) 
                    : null;
                  
                  return (
                    <div key={item.id} className="border border-outline-variant p-md rounded-lg bg-surface-container-lowest text-left flex flex-col gap-xs text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{item.category.replace('_', ' ')}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.quantity === 0 ? 'bg-red-100 text-red-800' :
                          item.quantity <= item.minQuantity ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {item.quantity} / {item.maxQuantity} {item.unit}
                        </span>
                      </div>

                      {/* AI Metrics block */}
                      <div className="grid grid-cols-2 gap-sm mt-xs border-t border-gray-50 pt-xs text-[10px] text-gray-500 font-medium">
                        <div>
                          <span>Daily Usage: </span>
                          <strong className="text-gray-700 font-mono">{item.dailyUsage || 0} {item.unit}/day</strong>
                        </div>
                        <div>
                          <span>Weekly: </span>
                          <strong className="text-gray-700 font-mono">{item.weeklyUsage || 0} {item.unit}</strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-sm text-[10px] text-gray-500 font-medium">
                        <div>
                          <span>Monthly: </span>
                          <strong className="text-gray-700 font-mono">{item.monthlyUsage || 0} {item.unit}</strong>
                        </div>
                        <div>
                          <span>Reorder Recommendation: </span>
                          <strong className={item.recommendedReorderQuantity > 0 ? "text-primary font-bold font-mono" : "text-green-600 font-bold"}>
                            {item.recommendedReorderQuantity > 0 ? `+${item.recommendedReorderQuantity} ${item.unit}` : 'Optimal'}
                          </strong>
                        </div>
                      </div>

                      <div className="mt-xs bg-slate-50 p-sm rounded border border-slate-100 flex justify-between items-center text-[10px]">
                        <span className="text-gray-400 font-bold uppercase tracking-wider">Projected Depletion</span>
                        <span className={`font-black ${
                          daysToStockout != null && daysToStockout <= 5 ? 'text-red-600 font-black animate-pulse' :
                          daysToStockout != null && daysToStockout <= 15 ? 'text-amber-500' : 'text-green-600'
                        }`}>
                          {daysToStockout != null ? `Stock-out in ${daysToStockout} days` : 'Stable (no depletion)'}
                        </span>
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
      ) : (
        /* Performance Dashboard View */
        <div className="space-y-xl">
          {perfLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-md">
              <Loader2 className="w-10 h-10 animate-spin text-[#00488d]" />
              <p className="text-sm font-bold text-on-surface-variant">Compiling performance analytics and district benchmarks...</p>
            </div>
          ) : !performanceData ? (
            <div className="bg-surface border border-outline-variant p-lg rounded-xl text-center italic text-on-surface-variant">
              No performance metrics compiled. Please try again.
            </div>
          ) : (
            <>
              {/* KPIs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-gutter">
                {renderPerformanceCard("Revenue", `$${performanceData.hospital.revenue.toLocaleString()}`, `$${performanceData.districtAverage.revenue.toLocaleString()}`, "payments", "higher-better", "$")}
                {renderPerformanceCard("Admissions", performanceData.hospital.admissions, performanceData.districtAverage.admissions, "patient_list", "higher-better")}
                {renderPerformanceCard("Discharges", performanceData.hospital.discharges, performanceData.districtAverage.discharges, "door_open", "higher-better")}
                {renderPerformanceCard("Satisfaction Rating", `${performanceData.hospital.satisfaction} / 5.0`, `${performanceData.districtAverage.satisfaction} / 5.0`, "thumb_up", "higher-better")}
                {renderPerformanceCard("Doctor Utilization", `${performanceData.hospital.doctorUtilization}%`, `${performanceData.districtAverage.doctorUtilization}%`, "monitoring", "higher-better")}
                {renderPerformanceCard("Medicine Consumed", performanceData.hospital.medicineConsumption, performanceData.districtAverage.medicineConsumption, "prescriptions", "higher-better")}
                {renderPerformanceCard("Lab Completed", performanceData.hospital.labPerformance, performanceData.districtAverage.labPerformance, "biotech", "higher-better")}
                {renderPerformanceCard("Avg Waiting Time", `${performanceData.hospital.waitingTime}m`, `${performanceData.districtAverage.waitingTime}m`, "schedule", "lower-better", "m")}
                {renderPerformanceCard("Active Emergencies", performanceData.hospital.emergencies, performanceData.districtAverage.emergencies, "emergency", "lower-better")}
                {renderPerformanceCard("Low Stock Alerts", performanceData.hospital.inventoryLowStock, performanceData.districtAverage.inventoryLowStock, "warning", "lower-better")}
              </div>

              {/* Trends charts section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mt-lg">
                {/* Chart 1: Revenue Comparison */}
                <div className="bg-surface border border-outline-variant p-lg rounded-2xl shadow-sm">
                  <h3 className="font-title-lg text-title-lg font-bold text-on-surface mb-md">6-Month Revenue Outlook ($)</h3>
                  <div className="w-full h-[220px]">
                    <svg viewBox="0 0 380 150" className="w-full h-full text-xs">
                      {/* Grid lines */}
                      <line x1="45" y1="15" x2="365" y2="15" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="45" y1="70" x2="365" y2="70" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="45" y1="125" x2="365" y2="125" stroke="#cbd5e1" />

                      {/* Line 1: Hospital (Solid primary blue) */}
                      <polyline
                        fill="none"
                        stroke="#00488d"
                        strokeWidth="2.5"
                        points={(() => {
                          const revs = performanceData.trends.hospital.revenue;
                          const max = Math.max(...revs, ...performanceData.trends.district.revenue);
                          const min = Math.min(...revs, ...performanceData.trends.district.revenue);
                          const pad = (max - min) * 0.1 || 1000;
                          const maxY = max + pad;
                          const minY = Math.max(0, min - pad);
                          return revs.map((val: number, idx: number) => {
                            const x = 45 + idx * (320 / 5);
                            const y = 15 + 110 - ((val - minY) / (maxY - minY || 1)) * 110;
                            return `${x},${y}`;
                          }).join(' ');
                        })()}
                      />

                      {/* Line 2: District average (Dashed violet-600) */}
                      <polyline
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        points={(() => {
                          const revs = performanceData.trends.district.revenue;
                          const max = Math.max(...performanceData.trends.hospital.revenue, ...revs);
                          const min = Math.min(...performanceData.trends.hospital.revenue, ...revs);
                          const pad = (max - min) * 0.1 || 1000;
                          const maxY = max + pad;
                          const minY = Math.max(0, min - pad);
                          return revs.map((val: number, idx: number) => {
                            const x = 45 + idx * (320 / 5);
                            const y = 15 + 110 - ((val - minY) / (maxY - minY || 1)) * 110;
                            return `${x},${y}`;
                          }).join(' ');
                        })()}
                      />

                      {/* Data Point Circles */}
                      {(() => {
                        const revs = performanceData.trends.hospital.revenue;
                        const max = Math.max(...revs, ...performanceData.trends.district.revenue);
                        const min = Math.min(...revs, ...performanceData.trends.district.revenue);
                        const pad = (max - min) * 0.1 || 1000;
                        const maxY = max + pad;
                        const minY = Math.max(0, min - pad);
                        return revs.map((val: number, idx: number) => {
                          const x = 45 + idx * (320 / 5);
                          const y = 15 + 110 - ((val - minY) / (maxY - minY || 1)) * 110;
                          return (
                            <g key={idx}>
                              <circle cx={x} cy={y} r="4" className="fill-[#00488d] stroke-white stroke-2" />
                              <text x={x} y={y - 8} textAnchor="middle" className="text-[8px] font-bold fill-gray-600 font-mono">
                                ${Math.round(val / 100) / 10}k
                              </text>
                            </g>
                          );
                        });
                      })()}

                      {/* X Labels */}
                      {performanceData.trends.months.map((m: string, idx: number) => (
                        <text key={idx} x={45 + idx * (320 / 5)} y="142" textAnchor="middle" className="fill-gray-500 font-semibold text-[9px]">
                          {m}
                        </text>
                      ))}
                    </svg>
                  </div>
                  <div className="flex justify-center gap-lg text-[10px] font-bold mt-sm">
                    <span className="flex items-center gap-xs"><span className="w-3 h-1 bg-[#00488d] inline-block"></span> Your Facility</span>
                    <span className="flex items-center gap-xs"><span className="w-3 h-1 bg-violet-600 stroke-dasharray inline-block border-t border-dashed"></span> District Average</span>
                  </div>
                </div>

                {/* Chart 2: Admissions vs Discharges */}
                <div className="bg-surface border border-outline-variant p-lg rounded-2xl shadow-sm">
                  <h3 className="font-title-lg text-title-lg font-bold text-on-surface mb-md">Admissions & Discharges Trends</h3>
                  <div className="w-full h-[220px]">
                    <svg viewBox="0 0 380 150" className="w-full h-full text-xs">
                      {/* Grid lines */}
                      <line x1="45" y1="15" x2="365" y2="15" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="45" y1="70" x2="365" y2="70" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="45" y1="125" x2="365" y2="125" stroke="#cbd5e1" />

                      {/* Admissions Line: Solid Blue */}
                      <polyline
                        fill="none"
                        stroke="#00488d"
                        strokeWidth="2.5"
                        points={(() => {
                          const vals = performanceData.trends.hospital.admissions;
                          const max = Math.max(...vals, ...performanceData.trends.district.admissions, ...performanceData.trends.hospital.discharges, ...performanceData.trends.district.discharges);
                          const min = Math.min(...vals, ...performanceData.trends.district.admissions, ...performanceData.trends.hospital.discharges, ...performanceData.trends.district.discharges);
                          const pad = (max - min) * 0.15 || 2;
                          const maxY = max + pad;
                          const minY = Math.max(0, min - pad);
                          return vals.map((val: number, idx: number) => {
                            const x = 45 + idx * (320 / 5);
                            const y = 15 + 110 - ((val - minY) / (maxY - minY || 1)) * 110;
                            return `${x},${y}`;
                          }).join(' ');
                        })()}
                      />

                      {/* Discharges Line: Solid Green */}
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        points={(() => {
                          const vals = performanceData.trends.hospital.discharges;
                          const max = Math.max(...performanceData.trends.hospital.admissions, ...performanceData.trends.district.admissions, ...vals, ...performanceData.trends.district.discharges);
                          const min = Math.min(...performanceData.trends.hospital.admissions, ...performanceData.trends.district.admissions, ...vals, ...performanceData.trends.district.discharges);
                          const pad = (max - min) * 0.15 || 2;
                          const maxY = max + pad;
                          const minY = Math.max(0, min - pad);
                          return vals.map((val: number, idx: number) => {
                            const x = 45 + idx * (320 / 5);
                            const y = 15 + 110 - ((val - minY) / (maxY - minY || 1)) * 110;
                            return `${x},${y}`;
                          }).join(' ');
                        })()}
                      />

                      {/* Circles for Admissions */}
                      {(() => {
                        const vals = performanceData.trends.hospital.admissions;
                        const max = Math.max(...vals, ...performanceData.trends.district.admissions, ...performanceData.trends.hospital.discharges, ...performanceData.trends.district.discharges);
                        const min = Math.min(...vals, ...performanceData.trends.district.admissions, ...performanceData.trends.hospital.discharges, ...performanceData.trends.district.discharges);
                        const pad = (max - min) * 0.15 || 2;
                        const maxY = max + pad;
                        const minY = Math.max(0, min - pad);
                        return vals.map((val: number, idx: number) => {
                          const x = 45 + idx * (320 / 5);
                          const y = 15 + 110 - ((val - minY) / (maxY - minY || 1)) * 110;
                          return <circle key={idx} cx={x} cy={y} r="3.5" className="fill-[#00488d] stroke-white stroke-2" />;
                        });
                      })()}

                      {/* Circles for Discharges */}
                      {(() => {
                        const vals = performanceData.trends.hospital.discharges;
                        const max = Math.max(...performanceData.trends.hospital.admissions, ...performanceData.trends.district.admissions, ...vals, ...performanceData.trends.district.discharges);
                        const min = Math.min(...performanceData.trends.hospital.admissions, ...performanceData.trends.district.admissions, ...vals, ...performanceData.trends.district.discharges);
                        const pad = (max - min) * 0.15 || 2;
                        const maxY = max + pad;
                        const minY = Math.max(0, min - pad);
                        return vals.map((val: number, idx: number) => {
                          const x = 45 + idx * (320 / 5);
                          const y = 15 + 110 - ((val - minY) / (maxY - minY || 1)) * 110;
                          return <circle key={idx} cx={x} cy={y} r="3.5" className="fill-[#10b981] stroke-white stroke-2" />;
                        });
                      })()}

                      {/* X Labels */}
                      {performanceData.trends.months.map((m: string, idx: number) => (
                        <text key={idx} x={45 + idx * (320 / 5)} y="142" textAnchor="middle" className="fill-gray-500 font-semibold text-[9px]">
                          {m}
                        </text>
                      ))}
                    </svg>
                  </div>
                  <div className="flex justify-center gap-lg text-[10px] font-bold mt-sm">
                    <span className="flex items-center gap-xs"><span className="w-3.5 h-1.5 bg-[#00488d] inline-block rounded"></span> Admissions (Hospital)</span>
                    <span className="flex items-center gap-xs"><span className="w-3.5 h-1.5 bg-[#10b981] inline-block rounded"></span> Discharges (Hospital)</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminOverview;
