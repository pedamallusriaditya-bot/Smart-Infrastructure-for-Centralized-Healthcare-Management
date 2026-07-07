import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import {
  getDistrictAttendanceSummary,
  getDistrictHospitalsStats
} from '../../api/attendance.api';
import {
  getDistrictComparison
} from '../../api/diagnostic.api';
import {
  getFootfallAnalytics
} from '../../api/analytics.api';
import {
  getDistrictStockComparison
} from '../../api/inventory-ai.api';
import {
  getDistrictDemandComparison
} from '../../api/demand.api';
import {
  getHospitalPerformance,
  getNotifications,
  markNotificationAsRead
} from '../../api/performance.api';
import {
  getAmbulances,
  updateAmbulanceStatus,
  updateAmbulanceFuel,
  updateAmbulanceLocation
} from '../../api/ambulance.api';
import {
  getSurveillanceStatus,
  getSurveillanceTrends,
  triggerSurveillanceCheck
} from '../../api/disease-surveillance.api';

import { 
  Loader2, 
  Building2, 
  Users, 
  ShieldAlert, 
  BedDouble, 
  Activity, 
  ClipboardList, 
  Warehouse, 
  FileText,
  MapPin,
  TrendingUp,
  LogOut,
  Sparkles,
  Bell,
  Award,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';


const AppAdminDashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'supervision' | 'command_center'>('supervision');
  const [commandSubTab, setCommandSubTab] = useState<'map' | 'scorecards' | 'charts' | 'ai_alerts'>('map');
  const [stats, setStats] = useState<any>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
  const [attendanceHospitals, setAttendanceHospitals] = useState<any[]>([]);
    const [diagnosticComparison, setDiagnosticComparison] = useState<any[]>([]);
  const [footfallData, setFootfallData] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('hourly');
  const [aiDistrictStock, setAiDistrictStock] = useState<any[]>([]);
  const [aiDistrictDemand, setAiDistrictDemand] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [aiDetailsOpen, setAiDetailsOpen] = useState<Record<string, boolean>>({});
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [ambulancesLoading, setAmbulancesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Disease Surveillance States
  const [surveillanceData, setSurveillanceData] = useState<any>(null);
  const [surveillanceTrends, setSurveillanceTrends] = useState<any>(null);
  const [selectedHeatmapDistrict, setSelectedHeatmapDistrict] = useState<string | null>(null);
  const [manualChecking, setManualChecking] = useState(false);


  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const [statsRes, attSummary, attHospitals, diagComp, footfall, distStock, distDemand, perfData, notifs, ambList, survStatus, survTrends] = await Promise.all([
        axiosInstance.get('/app-admin/dashboard/stats'),
        getDistrictAttendanceSummary().catch(() => null),
        getDistrictHospitalsStats().catch(() => []),
        getDistrictComparison().catch(() => []),
        getFootfallAnalytics().catch(() => null),
        getDistrictStockComparison().catch(() => []),
        getDistrictDemandComparison().catch(() => []),
        getHospitalPerformance().catch(() => []),
        getNotifications().catch(() => []),
        getAmbulances().catch(() => []),
        getSurveillanceStatus().catch(() => null),
        getSurveillanceTrends().catch(() => null)
      ]);
      setStats(statsRes.data.data);
      setAttendanceSummary(attSummary);
      setAttendanceHospitals(attHospitals || []);
      setDiagnosticComparison(diagComp || []);
      setFootfallData(footfall);
      setAiDistrictStock(distStock || []);
      setAiDistrictDemand(distDemand || []);
      setPerformanceData(perfData || []);
      setNotifications(notifs || []);
      setAmbulances(ambList || []);
      setSurveillanceData(survStatus);
      setSurveillanceTrends(survTrends);
    } catch (err: any) {
      console.error(err);
      setErrorState(err.response?.data?.message || "Failed to load platform analytics.");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSurveillance = async () => {
    setManualChecking(true);
    try {
      const alerts = await triggerSurveillanceCheck();
      alert(`Surveillance scan complete! Detected ${alerts.length} active outbreaks. Notification dispatches created for District Administrators.`);
      await loadStats();
    } catch (err: any) {
      console.error(err);
      alert("Failed to run manual surveillance check: " + (err.response?.data?.message || err.message));
    } finally {
      setManualChecking(false);
    }
  };

  const handleAmbulanceStatusChange = async (id: string, status: string) => {
    try {
      await updateAmbulanceStatus(id, status);
      setAmbulances(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      console.error("Failed to update ambulance status", err);
      alert("Failed to update status.");
    }
  };

  const handleAmbulanceFuelChange = async (id: string, newFuel: number) => {
    if (newFuel < 0 || newFuel > 100) return;
    try {
      await updateAmbulanceFuel(id, newFuel);
      setAmbulances(prev => prev.map(a => a.id === id ? { ...a, fuelLevel: newFuel } : a));
    } catch (err) {
      console.error("Failed to update ambulance fuel", err);
    }
  };

  const handleSimulateTelemetry = async (amb: any) => {
    // Slightly offset coordinates to simulate a moving vehicle
    const latOffset = (Math.random() - 0.5) * 0.005;
    const lonOffset = (Math.random() - 0.5) * 0.005;
    const newLat = amb.latitude + latOffset;
    const newLon = amb.longitude + lonOffset;
    
    // Consume a little bit of fuel (randomly 1-3%)
    const newFuel = Math.max(0, Math.round(amb.fuelLevel - (Math.random() * 2 + 1)));

    try {
      await Promise.all([
        updateAmbulanceLocation(amb.id, newLat, newLon),
        updateAmbulanceFuel(amb.id, newFuel)
      ]);
      
      setAmbulances(prev => prev.map(a => a.id === amb.id ? { 
        ...a, 
        latitude: newLat, 
        longitude: newLon,
        fuelLevel: newFuel
      } : a));
    } catch (err) {
      console.error("Failed to simulate telemetry", err);
    }
  };


  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const toggleAIDetails = (hospitalId: string) => {
    setAiDetailsOpen(prev => ({ ...prev, [hospitalId]: !prev[hospitalId] }));
  };


  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin w-12 h-12 text-[#00488d] mx-auto" />
          <p className="text-gray-500 font-medium">Establishing secure link with platform controller...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-on-surface">
      {/* Navbar Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00488d] rounded-xl flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined font-fill text-xl">gavel</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-[#00488d] tracking-tighter">CareHive District Administration</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">District Head Office Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-gray-500 hover:text-[#00488d] hover:bg-gray-100 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-gray-200 bg-white shadow-sm"
            >
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center border border-white animate-pulse">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden text-left flex flex-col max-h-96">
                <div className="bg-[#00488d] text-white px-4 py-3 flex justify-between items-center">
                  <span className="font-bold text-xs">District Alert Logs</span>
                  <span className="text-[10px] uppercase font-bold text-blue-200">
                    {notifications.filter(n => !n.read).length} Unread
                  </span>
                </div>
                <div className="divide-y divide-gray-150 overflow-y-auto flex-grow max-h-72">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400 italic">
                      No supervision alerts recorded.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`p-3 text-xs transition-colors hover:bg-slate-50 flex flex-col gap-1.5 ${
                          !notif.read ? 'bg-blue-50/40 border-l-2 border-red-500' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-gray-800">{notif.title}</span>
                          <span className="text-[9px] text-gray-400 font-bold whitespace-nowrap">
                            {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-gray-600 leading-snug">{notif.message}</p>
                        {!notif.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="text-[9px] text-[#00488d] hover:underline font-black self-end cursor-pointer"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <span className="text-xs bg-blue-50 text-[#00488d] border border-blue-100 px-3 py-1.5 rounded-full font-bold">
            Head Office: {user?.email}
          </span>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>

      </header>

      {/* Main Container */}
      <div className="flex-grow flex p-6 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Main Content Area */}
        <main className="flex-grow space-y-6">
          {/* Headline and pending trigger banner */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-800">
                {activeTab === 'supervision' ? 'Platform Supervision Hub' : 'District Command Center'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {activeTab === 'supervision' 
                  ? 'Supervise clinical operations, hospital registrations, and district health statistics.'
                  : 'Real-time health intelligence dashboard, district telemetry maps, resource logistics, and hospital performance scorecards.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link 
                to="/app-admin/pending"
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-sm px-6 py-3 rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                <Building2 className="w-4 h-4 text-gray-500" />
                Manage Registrations ({stats?.hospitalCounts?.pending || 0} Pending)
              </Link>
              <Link 
                to="/app-admin/redistribution"
                className="bg-[#00488d] hover:bg-[#00366b] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm font-bold">sync_alt</span>
                Resource Redistribution
              </Link>
            </div>
          </div>

          {/* Tab Selector Button Group */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 select-none w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('supervision')}
              className={`px-5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'supervision' 
                  ? 'bg-[#00488d] text-white shadow-xs font-black' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Supervision Hub
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('command_center')}
              className={`px-5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'command_center' 
                  ? 'bg-[#00488d] text-white shadow-xs font-black' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              District Command Center
            </button>
          </div>

          {activeTab === 'supervision' ? (
            <div className="space-y-6">

          {/* Key Platform Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#00488d] flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Hospitals Registered</p>
                <h3 className="text-2xl font-black text-gray-800 mt-0.5">{stats?.hospitalCounts?.total || 0}</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  <span className="text-green-600 font-bold">{stats?.hospitalCounts?.active || 0} Active</span> | 
                  <span className="text-amber-500 font-bold"> {stats?.hospitalCounts?.pending || 0} Pending</span>
                </p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Supervised Staff</p>
                <h3 className="text-2xl font-black text-gray-800 mt-0.5">{stats?.doctorCount || 0} Doctors</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Active across {stats?.hospitalCounts?.active || 0} approved facilities</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <BedDouble className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Inpatient Beds</p>
                <h3 className="text-2xl font-black text-gray-800 mt-0.5">{stats?.bedStats?.total || 0} Total Beds</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  <span className="text-red-500 font-bold">{stats?.bedStats?.occupied || 0} Occupied</span> | 
                  <span className="text-green-600 font-bold"> {stats?.bedStats?.available || 0} Available</span>
                </p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Emergency Cases</p>
                <h3 className="text-2xl font-black text-gray-800 mt-0.5">{stats?.emergency?.active || 0} Incident Alerts</h3>
                <p className="text-[10px] text-red-500 font-bold mt-0.5">Assigned to emergency responders</p>
              </div>
            </div>
          </div>

          {/* AI PERFORMANCE SCORECARD & RANKINGS */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-[#00488d]">
                <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
                <div>
                  <h3 className="font-bold text-lg text-gray-800">AI Facility Performance Scorecard & Rankings</h3>
                  <p className="text-xs text-gray-500 font-medium">District facility audit scores calibrated using real-time service metrics and clinical workloads</p>
                </div>
              </div>
              <button
                onClick={loadStats}
                className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                Refresh Scoring
              </button>
            </div>

            <div className="space-y-4">
              {performanceData.length === 0 ? (
                <div className="text-center py-8 text-gray-400 italic text-xs">
                  No active facility scoring telemetry loaded.
                </div>
              ) : (
                performanceData.map((item, index) => {
                  const rankColors = ['bg-amber-100 text-amber-800 border-amber-200', 'bg-slate-100 text-slate-700 border-slate-200', 'bg-orange-100 text-orange-800 border-orange-200'];
                  const scoreColors = 
                    item.category === 'Excellent' ? 'text-green-600 bg-green-50 border-green-200' :
                    item.category === 'Good' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                    item.category === 'Average' ? 'text-indigo-600 bg-indigo-50 border-indigo-200' :
                    item.category === 'Needs Attention' ? 'text-orange-600 bg-orange-50 border-orange-200' :
                    'text-red-600 bg-red-50 border-red-200';
                  
                  return (
                    <div key={item.hospitalId} className="border border-gray-150 rounded-2xl p-5 bg-slate-50/50 flex flex-col gap-4">
                      
                      {/* Title & Rank Header */}
                      <div className="flex flex-wrap justify-between items-center gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm border font-mono ${
                            index < 3 ? rankColors[index] : 'bg-white text-gray-500 border-gray-200'
                          }`}>
                            #{index + 1}
                          </span>
                          <div>
                            <h4 className="font-black text-gray-800 text-sm">{item.hospitalName}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{item.district} District</p>
                          </div>
                        </div>

                        {/* Overall score status */}
                        <div className="flex items-center gap-3">
                          <span className={`px-3.5 py-1 rounded-full text-xs font-black border ${scoreColors}`}>
                            {item.category} ({item.score}/100)
                          </span>
                          <button
                            onClick={() => toggleAIDetails(item.hospitalId)}
                            className="flex items-center gap-1 text-xs font-black text-[#00488d] hover:underline cursor-pointer"
                          >
                            <span>AI Analysis</span>
                            {aiDetailsOpen[item.hospitalId] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Performance Sub-Metrics Progress Bars */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-gray-150 p-4 rounded-xl shadow-2xs">
                        
                        {/* Medicine Availability */}
                        <div className="space-y-1.5 text-left">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500">
                            <span>Meds Availability</span>
                            <span className="font-mono text-gray-700">{item.medicineAvailability.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full rounded-full" style={{ width: `${item.medicineAvailability}%` }}></div>
                          </div>
                        </div>

                        {/* Doctor Attendance */}
                        <div className="space-y-1.5 text-left">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500">
                            <span>Doc Attendance</span>
                            <span className="font-mono text-gray-700">{item.doctorAttendance.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${item.doctorAttendance}%` }}></div>
                          </div>
                        </div>

                        {/* Patient Waiting Time */}
                        <div className="space-y-1.5 text-left">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500">
                            <span>Avg Wait Time</span>
                            <span className="font-mono text-gray-700">{item.waitingTime}m</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-orange-400 h-full rounded-full" style={{ width: `${Math.min(100, (item.waitingTime / 120) * 100)}%` }}></div>
                          </div>
                        </div>

                        {/* Emergency Response */}
                        <div className="space-y-1.5 text-left">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500">
                            <span>ER Response</span>
                            <span className="font-mono text-gray-700">{item.emergencyResponse.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-red-500 h-full rounded-full" style={{ width: `${item.emergencyResponse}%` }}></div>
                          </div>
                        </div>

                        {/* Bed Occupancy */}
                        <div className="space-y-1.5 text-left">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500">
                            <span>Bed Occupancy</span>
                            <span className="font-mono text-gray-700">{item.bedOccupancy.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${item.bedOccupancy}%` }}></div>
                          </div>
                        </div>

                        {/* Lab Availability */}
                        <div className="space-y-1.5 text-left">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500">
                            <span>Lab Availability</span>
                            <span className="font-mono text-gray-700">{item.labAvailability.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-teal-500 h-full rounded-full" style={{ width: `${item.labAvailability}%` }}></div>
                          </div>
                        </div>

                        {/* Inventory Health */}
                        <div className="space-y-1.5 text-left">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500">
                            <span>Inventory Health</span>
                            <span className="font-mono text-gray-700">{item.inventoryHealth.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${item.inventoryHealth}%` }}></div>
                          </div>
                        </div>

                        {/* Patient Footfall */}
                        <div className="space-y-1.5 text-left">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500">
                            <span>Patient Footfall</span>
                            <span className="font-mono text-gray-700 font-bold">{item.patientFootfall} visits</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-slate-400 h-full rounded-full" style={{ width: `${Math.min(100, (item.patientFootfall / 500) * 100)}%` }}></div>
                          </div>
                        </div>

                      </div>

                      {/* Expandable AI Diagnostic Analysis details */}
                      {aiDetailsOpen[item.hospitalId] && (
                        <div className="bg-white border border-amber-100 p-5 rounded-xl text-left space-y-4 shadow-sm animate-fadeIn">
                          
                          {/* Summary text */}
                          <div>
                            <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
                              AI Diagnostic Summary
                            </h5>
                            <p className="text-xs text-gray-700 leading-relaxed font-medium">
                              {item.aiSummary}
                            </p>
                          </div>

                          {/* Actionable recommendations */}
                          <div className="border-t border-gray-100 pt-3">
                            <h5 className="text-[10px] font-black text-[#00488d] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              Actionable Intervention Protocols
                            </h5>
                            <ul className="space-y-2">
                              {item.recommendations?.map((rec: string, rIdx: number) => (
                                <li key={rIdx} className="text-xs text-gray-600 flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#00488d] mt-1.5 shrink-0"></span>
                                  <span className="leading-snug">{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Low score warning banner */}
                          {item.score < 55 && (
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex gap-2.5 text-red-700">
                              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                              <div className="text-[10px]">
                                <span className="font-bold">Automated Escalation Logged:</span> This facility's score falls below the threshold safety benchmark of 55. Real-time alert dispatches have been registered in the District Head Office system.
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* DISTRICT AMBULANCE TELEMETRY & DISPATCH CONTROL CENTER */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-[#00488d]">
                <span className="material-symbols-outlined text-2xl text-red-500 font-fill animate-pulse">emergency</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">District Ambulance Telemetry & Command Center</h3>
                  <p className="text-xs text-gray-500 font-medium">Real-time driver statuses, fuel health level monitors, telemetry tracking, and dispatch control logs</p>
                </div>
              </div>
              <button
                onClick={loadStats}
                className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                Refresh Fleet
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 font-bold uppercase border-b border-gray-200">
                    <th className="px-4 py-3">Vehicle / Driver</th>
                    <th className="px-4 py-3">Availability Status</th>
                    <th className="px-4 py-3">Linked Facility</th>
                    <th className="px-4 py-3">Fuel Status</th>
                    <th className="px-4 py-3">Position Telemetry</th>
                    <th className="px-4 py-3">Emergency Case Assignment</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ambulances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400 italic">No ambulances tracking on radar.</td>
                    </tr>
                  ) : (
                    ambulances.map((amb) => {
                      const fuelColor = 
                        amb.fuelLevel > 50 ? 'bg-green-500' :
                        amb.fuelLevel > 20 ? 'bg-amber-500' : 'bg-red-500 animate-pulse';

                      const statusColors = 
                        amb.status === 'AVAILABLE' ? 'text-green-600 bg-green-50 border-green-200' :
                        amb.status === 'DISPATCHED' ? 'text-red-600 bg-red-50 border-red-200 animate-pulse' :
                        amb.status === 'MAINTENANCE' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                        'text-gray-500 bg-gray-50 border-gray-200';

                      return (
                        <tr key={amb.id} className="hover:bg-slate-50 transition-colors">
                          {/* Vehicle / Driver */}
                          <td className="px-4 py-4 text-left">
                            <p className="font-bold text-gray-800">{amb.vehicleNumber}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {amb.driverName} | {amb.driverPhone}
                            </p>
                          </td>
                          
                          {/* Status Badge */}
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${statusColors}`}>
                              {amb.status}
                            </span>
                          </td>

                          {/* Hospital Name */}
                          <td className="px-4 py-4 text-gray-600 font-medium">
                            {amb.hospital?.name || 'N/A'}
                          </td>

                          {/* Fuel Level */}
                          <td className="px-4 py-4 w-32">
                            <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                              <span>Fuel Level</span>
                              <span className="font-mono">{amb.fuelLevel}%</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
                              <div className={`h-full rounded-full transition-all ${fuelColor}`} style={{ width: `${amb.fuelLevel}%` }}></div>
                            </div>
                          </td>

                          {/* GPS Telemetry coordinates */}
                          <td className="px-4 py-4 font-mono text-[10px] text-gray-500 text-left">
                            <p>Lat: {amb.latitude.toFixed(5)}</p>
                            <p>Lon: {amb.longitude.toFixed(5)}</p>
                          </td>

                          {/* Active Emergency Case */}
                          <td className="px-4 py-4 text-left max-w-xs">
                            {amb.status === 'DISPATCHED' && amb.activeEmergency ? (
                              <div className="p-2 border border-red-100 bg-red-50/50 rounded-lg text-[10px] space-y-1">
                                <p className="font-bold text-red-800 uppercase flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-xs">warning</span>
                                  En Route (ETA: {amb.etaMinutes || 15} mins)
                                </p>
                                <p className="text-gray-600 line-clamp-1"><strong>Case:</strong> {amb.activeEmergency.description || 'Medical Call'}</p>
                                <p className="text-gray-500"><strong>Patient:</strong> {amb.activeEmergency.patient?.firstName} {amb.activeEmergency.patient?.lastName}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-[10px]">No active dispatch</span>
                            )}
                          </td>

                          {/* Status and Telemetry Actions */}
                          <td className="px-4 py-4 text-right space-y-1">
                            <div className="flex justify-end gap-1.5">
                              {/* Simulate telemtry button */}
                              <button
                                onClick={() => handleSimulateTelemetry(amb)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1 rounded border border-slate-200 transition-all cursor-pointer"
                                title="Simulate GPS telemetry coordinates & fuel consumption"
                              >
                                Ping GPS
                              </button>
                              
                              {/* Status override actions */}
                              <select
                                value={amb.status}
                                onChange={(e) => handleAmbulanceStatusChange(amb.id, e.target.value)}
                                className="border border-gray-200 rounded px-1 py-0.5 text-[10px] font-bold bg-white text-gray-700 cursor-pointer focus:outline-none"
                              >
                                <option value="AVAILABLE">Available</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="OFF_DUTY">Off Duty</option>
                              </select>
                            </div>
                            
                            {/* Fuel refuel control */}
                            {amb.fuelLevel < 30 && (
                              <button
                                onClick={() => handleAmbulanceFuelChange(amb.id, 100)}
                                className="text-[9px] text-[#00488d] hover:underline font-black block text-right w-full cursor-pointer"
                              >
                                ⚡ Refuel Tank
                              </button>
                            )}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* District Summary & Maps Coordinates */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* District Statistics / Heat map counts */}
            <div className="md:col-span-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4 text-[#00488d]">
                <TrendingUp className="w-5 h-5" />
                <h3 className="font-bold text-lg text-gray-800">District Registration Distribution</h3>
              </div>
              <div className="flex-grow space-y-3 max-h-60 overflow-y-auto pr-1">
                {stats?.districtStats?.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-8">No facilities registered in any districts.</p>
                ) : (
                  stats?.districtStats?.map((d: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="font-bold text-sm text-gray-700">{d.district}</span>
                      <span className="text-xs bg-[#00488d] text-white font-bold px-3 py-1 rounded-full">{d.count} Hospitals</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Alerts / Low Inventory Alerts list */}
            <div className="md:col-span-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4 text-red-600">
                <ShieldAlert className="w-5 h-5 animate-bounce" />
                <h3 className="font-bold text-lg text-gray-800">Low Stock & Inventory Alerts</h3>
              </div>
              <div className="flex-grow flex flex-col justify-between">
                <div>
                  <p className="text-sm text-gray-500">System detected inventory anomalies across district storage hubs.</p>
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 text-red-700 mt-4">
                    <Warehouse className="w-6 h-6 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">Critical Low Stocks ({stats?.inventory?.lowStock || 0} Alerts)</h4>
                      <p className="text-xs mt-1">Medical storage supplies dropping below minimum safety stock levels.</p>
                    </div>
                  </div>
                </div>
                <Link 
                  to="/app-admin/redistribution"
                  className="w-full text-center py-2.5 mt-6 border-t border-gray-100 text-sm font-bold text-[#00488d] hover:bg-blue-50 transition-colors rounded-b-xl block"
                >
                  Supervise Supply Chains
                </Link>
              </div>
            </div>
          </div>

          {/* Active map coordinates list */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-[#00488d]">
              <MapPin className="w-5 h-5" />
              <h3 className="font-bold text-lg text-gray-800">Approved Geolocation Facilities</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 font-bold uppercase border-b border-gray-200">
                    <th className="px-4 py-3">Facility Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3 text-right">Coordinates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats?.mapCoordinates?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-400 italic">No geo-tagged facilities approved yet.</td>
                    </tr>
                  ) : (
                    stats?.mapCoordinates?.map((coord: any) => (
                      <tr key={coord.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-gray-700">{coord.name}</td>
                        <td className="px-4 py-3 text-gray-500 font-medium">{coord.type || 'N/A'}</td>
                        <td className="px-4 py-3 text-gray-500 font-medium">{coord.district || 'N/A'}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-400">Lat: {coord.latitude?.toFixed(4)}, Lon: {coord.longitude?.toFixed(4)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* District Attendance Command Center */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 text-[#00488d]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">fingerprint</span>
                <h3 className="font-bold text-lg text-gray-800">District Doctor Attendance & Duty Roster</h3>
              </div>
              {attendanceSummary && (
                <div className="flex gap-4 text-xs font-bold text-gray-500">
                  <span>Present today: <strong className="text-green-600">{attendanceSummary.presentToday}</strong></span>
                  <span>On Break: <strong className="text-amber-500">{attendanceSummary.breakToday}</strong></span>
                  <span>On Leave: <strong className="text-blue-600">{attendanceSummary.leaveToday}</strong></span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 font-bold uppercase border-b border-gray-200">
                    <th className="px-4 py-3">Hospital Facility</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3">Clinicians Count</th>
                    <th className="px-4 py-3">Present Today</th>
                    <th className="px-4 py-3 text-right">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendanceHospitals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400 italic">No attendance rosters detected.</td>
                    </tr>
                  ) : (
                    attendanceHospitals.map((h: any) => (
                      <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-gray-700">{h.name}</td>
                        <td className="px-4 py-3 text-gray-500 font-medium">{h.district}</td>
                        <td className="px-4 py-3 text-gray-500 font-medium">{h.cliniciansCount}</td>
                        <td className="px-4 py-3 text-green-600 font-bold">{h.presentTodayCount}</td>
                        <td className="px-4 py-3 text-right font-black text-[#00488d]">{h.attendanceRate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* District Diagnostics Comparison Matrix */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-[#00488d]">
              <span className="material-symbols-outlined text-2xl">grid_view</span>
              <h3 className="font-bold text-lg text-gray-800">District Diagnostics Availability Matrix</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 font-bold uppercase border-b border-gray-200">
                    <th className="px-3 py-3 text-xs">Hospital</th>
                    <th className="px-3 py-3 text-xs">District</th>
                    {['CBC', 'Sugar', 'ECG', 'MRI', 'CT', 'X-Ray', 'Ultrasound', 'Blood', 'COVID', 'Urine', 'Liver', 'Kidney'].map(h => (
                      <th key={h} className="px-2 py-3 text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {diagnosticComparison.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="text-center py-8 text-gray-400 italic">No facility diagnostic telemetry resolved.</td>
                    </tr>
                  ) : (
                    diagnosticComparison.map((hospital: any) => (
                      <tr key={hospital.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 font-bold text-gray-700 text-xs">{hospital.name}</td>
                        <td className="px-3 py-3 text-gray-500 text-xs">{hospital.district}</td>
                        {hospital.diagnostics?.map((d: any) => {
                          const dotColor = 
                            d.status === 'AVAILABLE' ? 'text-green-500' :
                            d.status === 'MAINTENANCE' ? 'text-amber-500' :
                            d.status === 'EXTERNAL_REFERRAL' ? 'text-blue-500' : 'text-red-500';
                          return (
                            <td key={d.testType} className="px-2 py-3 text-center">
                              <span className={`inline-flex flex-col items-center justify-center font-bold`}>
                                <span className={`${dotColor} text-sm leading-none`}>●</span>
                                <span className="text-[8px] text-gray-400 tracking-tight" style={{ fontSize: '7px' }}>
                                  {d.status === 'EXTERNAL_REFERRAL' ? 'REF' : d.status.slice(0, 3)}
                                </span>
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Legend indicators */}
            <div className="flex gap-md text-[10px] text-gray-500 font-bold mt-sm border-t border-gray-100 pt-sm">
              <div className="flex items-center gap-xs"><span className="text-green-500 text-xs">●</span> Available</div>
              <div className="flex items-center gap-xs"><span className="text-red-500 text-xs">●</span> Unavailable</div>
              <div className="flex items-center gap-xs"><span className="text-amber-500 text-xs">●</span> Maintenance</div>
              <div className="flex items-center gap-xs"><span className="text-blue-500 text-xs">●</span> External Referral</div>
            </div>
          </div>

          {/* AI Stock Monitoring & Projections */}
          {aiDistrictStock.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-md">
              <div className="flex items-center gap-2 mb-4 text-[#00488d] border-b border-gray-100 pb-xs">
                <span className="material-symbols-outlined text-2xl">online_prediction</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">District AI Stock Monitoring & Projections</h3>
                  <p className="text-xs text-gray-500 font-medium">Real-time facility supply safety metrics, stockouts forecasts, and reorder alerts</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {aiDistrictStock.map((h: any) => (
                  <div key={h.hospitalId} className="border border-outline-variant rounded-xl p-md bg-slate-50 flex flex-col justify-between text-left text-xs gap-xs">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-black text-gray-800 text-sm leading-tight">{h.hospitalName}</h4>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{h.district} District</p>
                        </div>
                        <span className="text-[10px] bg-blue-150 text-[#00488d] font-bold px-2 py-0.5 rounded-full font-mono">
                          {h.totalItems} Items
                        </span>
                      </div>

                      {/* Stock alerts breakdown */}
                      <div className="grid grid-cols-4 gap-xs mt-md">
                        <div className="bg-red-50 border border-red-100 p-1.5 rounded-lg text-center">
                          <p className="text-[8px] text-red-500 font-black uppercase leading-none">Critical</p>
                          <p className="text-xs font-black text-red-700 mt-1 font-mono">{h.alerts.critical}</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 p-1.5 rounded-lg text-center">
                          <p className="text-[8px] text-amber-500 font-black uppercase leading-none">Low</p>
                          <p className="text-xs font-black text-amber-700 mt-1 font-mono">{h.alerts.lowStock}</p>
                        </div>
                        <div className="bg-red-100 border border-red-200 p-1.5 rounded-lg text-center">
                          <p className="text-[8px] text-red-800 font-black uppercase leading-none">Expired</p>
                          <p className="text-xs font-black text-red-900 mt-1 font-mono">{h.alerts.expired}</p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-100 p-1.5 rounded-lg text-center">
                          <p className="text-[8px] text-yellow-600 font-black uppercase leading-none">Expiring</p>
                          <p className="text-xs font-black text-yellow-700 mt-1 font-mono">{h.alerts.expiringSoon}</p>
                        </div>
                      </div>
                    </div>

                    {/* Category quantities counts breakdown */}
                    <div className="border-t border-gray-150 pt-xs mt-xs text-[9px] text-gray-500 space-y-[2px]">
                      <div className="flex justify-between">
                        <span>Medicines & Vaccines:</span>
                        <strong className="text-gray-700 font-mono">Med: {h.categoryCounts.MEDICINE} | Vac: {h.categoryCounts.VACCINE}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Equipment & Consumables:</span>
                        <strong className="text-gray-700 font-mono">Equip: {h.categoryCounts.EQUIPMENT} | Cons: {h.categoryCounts.CONSUMABLE}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Blood Units & Oxygen:</span>
                        <strong className="text-gray-700 font-mono">Blood: {h.categoryCounts.BLOOD_UNIT} | Oxy: {h.categoryCounts.OXYGEN}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* District AI Demand Projections */}
          {aiDistrictDemand.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-md">
              <div className="flex items-center gap-2 mb-4 text-[#00488d] border-b border-gray-100 pb-xs">
                <span className="material-symbols-outlined text-2xl">insights</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">District AI Demand Projections (30-Day Outlook)</h3>
                  <p className="text-xs text-gray-500 font-medium">Predicted clinical staffing quotas, bed occupancy allocations, and lab loading thresholds</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {aiDistrictDemand.map((h: any) => {
                  const f = h.forecast30;
                  if (!f) {
                    return (
                      <div key={h.hospitalId} className="border border-outline-variant rounded-xl p-md bg-slate-50 flex flex-col justify-between text-left text-xs text-gray-400 italic">
                        No active forecasting logs recorded for {h.hospitalName}.
                      </div>
                    );
                  }
                  
                  return (
                    <div key={h.hospitalId} className="border border-outline-variant rounded-xl p-md bg-slate-50 flex flex-col justify-between text-left text-xs gap-xs">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-gray-800 text-sm leading-tight">{h.hospitalName}</h4>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{h.district} District</p>
                          </div>
                          <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full font-mono">
                            {f.confidenceRate}% Conf.
                          </span>
                        </div>

                        {/* Forecast demand grid */}
                        <div className="grid grid-cols-2 gap-sm mt-md">
                          <div className="bg-white border border-gray-150 p-2 rounded-lg text-left">
                            <span className="text-[9px] text-gray-400 font-bold uppercase">Beds Demand</span>
                            <p className="text-sm font-black text-gray-800 mt-0.5 font-mono">{f.bedDemand} beds</p>
                          </div>
                          <div className="bg-white border border-gray-150 p-2 rounded-lg text-left">
                            <span className="text-[9px] text-gray-400 font-bold uppercase">Lab Loads</span>
                            <p className="text-sm font-black text-gray-800 mt-0.5 font-mono">{f.labLoad} tests</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-sm mt-xs">
                          <div className="bg-white border border-gray-150 p-2 rounded-lg text-left">
                            <span className="text-[9px] text-gray-400 font-bold uppercase">Doctors Required</span>
                            <p className="text-sm font-black text-gray-800 mt-0.5 font-mono">{f.doctorRequirement} MDs</p>
                          </div>
                          <div className="bg-white border border-gray-150 p-2 rounded-lg text-left">
                            <span className="text-[9px] text-gray-400 font-bold uppercase">Nurses Required</span>
                            <p className="text-sm font-black text-gray-800 mt-0.5 font-mono">{f.nurseRequirement} RNs</p>
                          </div>
                        </div>
                      </div>

                      {/* Summary text */}
                      <p className="text-[9px] text-gray-400 font-bold mt-sm text-center">
                        Calculated from historical admissions, triage metrics, and ER logs.
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Disease Surveillance & Outbreak Center */}
          {surveillanceData && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Heading */}
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-sm gap-md">
                <div className="flex items-center gap-2 text-[#00488d]">
                  <span className="material-symbols-outlined text-2xl text-red-500 font-fill animate-pulse">shield_alert</span>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">District Disease Surveillance & Outbreak Command Center</h3>
                    <p className="text-xs text-gray-500 font-medium">Real-time disease tracking, outbreak alerts, and district trend reports</p>
                  </div>
                </div>
                
                <button
                  onClick={handleTriggerSurveillance}
                  disabled={manualChecking}
                  className="flex items-center gap-1.5 border border-[#00488d] hover:bg-blue-50 text-[#00488d] disabled:opacity-50 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${manualChecking ? 'animate-spin' : ''}`} />
                  {manualChecking ? 'Scanning...' : 'Trigger Scan Now'}
                </button>
              </div>

              {/* Disease Summary KPI Row */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-md">
                {surveillanceData.diseaseMetrics?.map((m: any) => {
                  const statusColors = 
                    m.status === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-700' :
                    m.status === 'WARNING' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-slate-50 border-gray-100 text-gray-700';
                  
                  const spikeText = m.percentageIncrease >= 0 ? `+${m.percentageIncrease}%` : `${m.percentageIncrease}%`;
                  const trendColor = m.percentageIncrease > 0 ? 'text-red-500 font-bold' : m.percentageIncrease < 0 ? 'text-green-500 font-bold' : 'text-gray-400 font-medium';

                  return (
                    <div key={m.disease} className={`border rounded-xl p-3 text-left space-y-1 ${statusColors}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">{m.disease}</span>
                      <h4 className="text-xl font-black font-mono leading-none">{m.currentCases} <span className="text-xs font-normal opacity-70">cases</span></h4>
                      <div className="flex justify-between text-[9px] mt-1 pt-1 border-t border-black/5">
                        <span className="opacity-60">Prev: {m.previousCases}</span>
                        <span className={trendColor}>{spikeText}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Alerts & Heatmap Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
                
                {/* Outbreak Alerts List */}
                <div className="lg:col-span-4 bg-gray-50 border border-gray-150 p-4 rounded-xl flex flex-col justify-between">
                  <div className="text-left mb-3">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Outbreak Warning Flags</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Automated containment logs triggered by sudden case spikes</p>
                  </div>
                  
                  <div className="flex-grow space-y-3 max-h-[280px] overflow-y-auto pr-1">
                    {surveillanceData.alerts?.length === 0 ? (
                      <div className="bg-green-50 border border-green-200 p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-2 h-full">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                        <h5 className="font-bold text-xs text-green-800">All Districts Secure</h5>
                        <p className="text-[10px] text-green-700/80">No abnormal transmission rates detected this week.</p>
                      </div>
                    ) : (
                      surveillanceData.alerts?.map((a: any) => {
                        const alertColor = a.severity === 'CRITICAL' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800';
                        return (
                          <div key={a.id} className={`border p-3 rounded-xl text-left space-y-2 relative shadow-xs ${alertColor}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-black text-xs uppercase flex items-center gap-1">
                                  <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${a.severity === 'CRITICAL' ? 'text-red-600 animate-pulse' : 'text-amber-600'}`} />
                                  {a.disease} Spike detected
                                </h5>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{a.district} District</p>
                              </div>
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase leading-none ${
                                a.severity === 'CRITICAL' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
                              }`}>
                                {a.severity}
                              </span>
                            </div>
                            <p className="text-[10px] font-medium leading-relaxed">
                              Cases reached <strong>{a.currentCases}</strong> this week compared to <strong>{a.previousCases}</strong> cases in the previous week (+{a.percentageIncrease}%). Immediate clinical protocols are logged in system.
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* District Heatmap Map */}
                <div className="lg:col-span-8 bg-gray-50 border border-gray-150 p-4 rounded-xl flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">District Concentration Heatmap</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Density index. Click on a district node to view case logs</p>
                    </div>
                    {selectedHeatmapDistrict && (
                      <button 
                        onClick={() => setSelectedHeatmapDistrict(null)}
                        className="text-[9px] font-bold text-red-600 hover:underline bg-white px-2 py-1 rounded border border-gray-250 cursor-pointer"
                      >
                        Reset Selection
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-md items-center">
                    
                    {/* SVG Map Rendering */}
                    <div className="md:col-span-8 flex justify-center bg-white border border-gray-100 rounded-xl p-2 relative shadow-2xs">
                      <svg className="w-full h-64 overflow-visible" viewBox="0 0 500 300">
                        {/* Background mesh grid */}
                        <defs>
                          <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                          </pattern>
                        </defs>
                        <rect width="500" height="300" fill="url(#gridPattern)" rx="8" />

                        {/* District connections representing health network */}
                        <line x1="80" y1="60" x2="160" y2="100" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="160" y1="100" x2="240" y2="140" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="240" y1="140" x2="200" y2="220" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="240" y1="140" x2="320" y2="180" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="320" y1="180" x2="420" y2="240" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="200" y1="220" x2="320" y2="180" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

                        {/* District Nodes */}
                        {(() => {
                          const districtCoords = [
                            { name: 'Palo Alto', x: 80, y: 60 },
                            { name: 'Mountain View', x: 160, y: 100 },
                            { name: 'Sunnyvale', x: 240, y: 140 },
                            { name: 'Cupertino', x: 200, y: 220 },
                            { name: 'Santa Clara', x: 320, y: 180 },
                            { name: 'San Jose', x: 420, y: 240 }
                          ];

                          return districtCoords.map(d => {
                            // Compute active count for this district
                            const points = surveillanceData.heatmap?.filter((h: any) => h.district.toLowerCase() === d.name.toLowerCase()) || [];
                            const totalCases = points.reduce((sum: number, p: any) => sum + p.count, 0);

                            // Compute size and color based on cases
                            const radius = Math.min(30, Math.max(12, 12 + totalCases * 1.2));
                            const severityColor = 
                              totalCases === 0 ? '#10b981' : // Green
                              totalCases < 8 ? '#f59e0b' :  // Amber
                              totalCases < 18 ? '#f97316' : // Orange
                              '#ef4444';                    // Red

                            const isSelected = selectedHeatmapDistrict?.toLowerCase() === d.name.toLowerCase();

                            return (
                              <g 
                                key={d.name} 
                                className="cursor-pointer group"
                                onClick={() => setSelectedHeatmapDistrict(d.name)}
                              >
                                {/* Glow under ring */}
                                <circle 
                                  cx={d.x} 
                                  cy={d.y} 
                                  r={radius + 4} 
                                  fill={severityColor} 
                                  opacity={isSelected ? "0.35" : "0.1"} 
                                  className="transition-all duration-300 group-hover:opacity-30" 
                                />
                                
                                {/* Inner node */}
                                <circle 
                                  cx={d.x} 
                                  cy={d.y} 
                                  r={radius} 
                                  fill={severityColor} 
                                  stroke="#ffffff" 
                                  strokeWidth={isSelected ? "3" : "1.5"} 
                                  className="transition-all duration-300 shadow-sm" 
                                />

                                {/* Label */}
                                <text 
                                  x={d.x} 
                                  y={d.y - radius - 6} 
                                  textAnchor="middle" 
                                  className={`text-[9px] font-black tracking-tight transition-all duration-300 ${
                                    isSelected ? 'fill-blue-900 scale-105' : 'fill-gray-500'
                                  }`}
                                >
                                  {d.name} ({totalCases})
                                </text>
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    </div>

                    {/* District Details Sidebar */}
                    <div className="md:col-span-4 text-left border border-gray-150 bg-white p-4 rounded-xl h-full flex flex-col justify-between">
                      {(() => {
                        const targetDistrict = selectedHeatmapDistrict || 'Cupertino';
                        const points = surveillanceData.heatmap?.filter((h: any) => h.district.toLowerCase() === targetDistrict.toLowerCase()) || [];
                        const hospitalStats: Record<string, Record<string, number>> = {};
                        const diseaseTotals: Record<string, number> = {};

                        let districtTotal = 0;

                        points.forEach((p: any) => {
                          districtTotal += p.count;
                          if (!hospitalStats[p.hospitalName]) {
                            hospitalStats[p.hospitalName] = {};
                          }
                          hospitalStats[p.hospitalName][p.disease] = p.count;
                          diseaseTotals[p.disease] = (diseaseTotals[p.disease] || 0) + p.count;
                        });

                        return (
                          <div className="space-y-sm">
                            <div>
                              <h5 className="font-black text-sm text-gray-800 uppercase flex items-center gap-1 leading-none">
                                <span className="material-symbols-outlined text-md text-blue-800">map</span>
                                {targetDistrict} District
                              </h5>
                              <p className="text-[10px] text-gray-400 mt-1">Total active diagnoses: <strong>{districtTotal} cases</strong></p>
                            </div>

                            <div className="border-t border-gray-100 pt-sm space-y-xs">
                              <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400 block">Disease Distribution</span>
                              {Object.keys(diseaseTotals).length === 0 ? (
                                <p className="text-[10px] text-gray-400 italic">No tracked diseases recorded here.</p>
                              ) : (
                                Object.entries(diseaseTotals).map(([dis, cnt]) => (
                                  <div key={dis} className="flex justify-between items-center text-[10px] font-medium border-b border-gray-50 pb-0.5">
                                    <span className="text-gray-600">{dis}:</span>
                                    <strong className="text-gray-800 font-mono">{cnt} cases</strong>
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="border-t border-gray-100 pt-sm space-y-xs">
                              <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400 block">Facilities Breakdown</span>
                              <div className="max-h-[100px] overflow-y-auto space-y-1">
                                {Object.keys(hospitalStats).length === 0 ? (
                                  <p className="text-[10px] text-gray-400 italic">No hospital statistics compiled.</p>
                                ) : (
                                  Object.entries(hospitalStats).map(([hospName, statsObj]) => {
                                    const total = Object.values(statsObj).reduce((a, b) => a + b, 0);
                                    return (
                                      <div key={hospName} className="text-[10px] leading-tight">
                                        <p className="font-bold text-gray-700 line-clamp-1">{hospName}: <span className="font-mono text-blue-900 font-black">{total} cases</span></p>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                </div>

              </div>

              {/* Disease Trend Projections Chart */}
              {surveillanceTrends && (
                <div className="bg-gray-50 border border-gray-150 p-5 rounded-2xl flex flex-col">
                  <div className="text-left mb-4">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Disease Transmission Trend Report (12-Week Outlook)</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Combined weekly patient longitudinal diagnoses tracker across all healthcare sectors</p>
                  </div>

                  {(() => {
                    const labels = surveillanceTrends.labels || [];
                    const datasets = surveillanceTrends.trends || {};
                    const diseases = Object.keys(datasets);
                    
                    const strokeColors: Record<string, string> = {
                      Dengue: '#f59e0b',
                      Malaria: '#ea580c',
                      COVID: '#dc2626',
                      Typhoid: '#0d9488',
                      Tuberculosis: '#7c3aed',
                      Influenza: '#2563eb'
                    };

                    // Compute max val
                    let maxVal = 1;
                    diseases.forEach(d => {
                      const vals = datasets[d] || [];
                      const m = Math.max(...vals, 1);
                      if (m > maxVal) maxVal = m;
                    });

                    const viewW = 800;
                    const viewH = 250;
                    const padL = 40;
                    const padR = 100;
                    const padT = 20;
                    const padB = 40;

                    const graphW = viewW - padL - padR;
                    const graphH = viewH - padT - padB;

                    return (
                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[650px] relative">
                          <svg className="w-full h-64 overflow-visible" viewBox={`0 0 ${viewW} ${viewH}`}>
                            {/* Y-axis grids */}
                            {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                              const y = viewH - padB - p * graphH;
                              return (
                                <g key={idx}>
                                  <line x1={padL} y1={y} x2={viewW - padR} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                                  <text x={padL - 10} y={y + 4} textAnchor="end" className="fill-gray-400 font-mono text-[9px] font-bold">
                                    {Math.round(p * maxVal)}
                                  </text>
                                </g>
                              );
                            })}

                            {/* X-axis labels */}
                            {labels.map((lbl: string, idx: number) => {
                              const x = padL + (labels.length > 1 ? (idx / (labels.length - 1)) * graphW : graphW / 2);
                              return (
                                <text key={idx} x={x} y={viewH - 15} textAnchor="middle" className="fill-gray-400 font-bold text-[8px]">
                                  {lbl}
                                </text>
                              );
                            })}

                            {/* Render lines */}
                            {diseases.map((d: string) => {
                              const vals = datasets[d] || [];
                              const coords = vals.map((v: number, idx: number) => {
                                const x = padL + (vals.length > 1 ? (idx / (vals.length - 1)) * graphW : graphW / 2);
                                const y = viewH - padB - (v / maxVal) * graphH;
                                return { x, y, val: v };
                              });

                              const linePath = coords.length > 0
                                ? `M ${coords[0].x} ${coords[0].y} ` + coords.slice(1).map((c: any) => `L ${c.x} ${c.y}`).join(' ')
                                : '';

                              const finalCoord = coords[coords.length - 1];

                              return (
                                <g key={d} className="group">
                                  {/* Hover line shadow */}
                                  {linePath && (
                                    <path 
                                      d={linePath} 
                                      fill="none" 
                                      stroke={strokeColors[d]} 
                                      strokeWidth="5" 
                                      opacity="0" 
                                      className="transition-all duration-200 group-hover:opacity-10 pointer-events-none" 
                                    />
                                  )}
                                  
                                  {/* Line stroke */}
                                  {linePath && (
                                    <path 
                                      d={linePath} 
                                      fill="none" 
                                      stroke={strokeColors[d]} 
                                      strokeWidth="2.5" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round" 
                                    />
                                  )}

                                  {/* Render points */}
                                  {coords.map((c: any, idx: number) => (
                                    <g key={idx} className="cursor-pointer">
                                      <circle 
                                        cx={c.x} 
                                        cy={c.y} 
                                        r="3.5" 
                                        fill="#ffffff" 
                                        stroke={strokeColors[d]} 
                                        strokeWidth="2" 
                                        className="transition-all hover:r-5" 
                                      />
                                      {/* Mini hovering tooltip */}
                                      <title>{`${d}: ${c.val} cases`}</title>
                                    </g>
                                  ))}

                                  {/* Floating labels at line ends */}
                                  {finalCoord && (
                                    <text 
                                      x={finalCoord.x + 8} 
                                      y={finalCoord.y + 3} 
                                      className="text-[9px] font-black transition-all group-hover:font-black"
                                      fill={strokeColors[d]}
                                    >
                                      {d}
                                    </text>
                                  )}
                                </g>
                              );
                            })}
                          </svg>

                          {/* Legend Row */}
                          <div className="flex flex-wrap justify-center gap-md text-[10px] font-bold mt-sm border-t border-gray-150 pt-sm">
                            {diseases.map(d => (
                              <div key={d} className="flex items-center gap-xs">
                                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: strokeColors[d] }}></span>
                                <span className="text-gray-600 font-bold">{d}</span>
                              </div>
                            ))}
                          </div>

                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          )}

          {/* Patient Footfall Analytics Command Console */}
          {footfallData && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-lg">
              
              {/* Heading section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-sm gap-md">
                <div className="flex items-center gap-2 text-[#00488d]">
                  <span className="material-symbols-outlined text-2xl">insights</span>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">District Patient Footfall & Queue Telemetry</h3>
                    <p className="text-xs text-gray-500 font-medium">Real-time clinical footfall projections & volume distribution metrics</p>
                  </div>
                </div>
                
                {/* Timeframe Toggles */}
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-150 text-xs font-bold text-gray-500 max-w-fit">
                  {(['hourly', 'daily', 'weekly', 'monthly', 'yearly'] as const).map(tf => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                        timeframe === tf ? 'bg-white text-[#00488d] shadow-xs border border-gray-200' : 'hover:text-[#00488d]'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Analytics KPI Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-left">
                  <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Outpatient Department (OPD)</span>
                  <h4 className="text-2xl font-black text-blue-800 mt-1 font-mono">{footfallData.summary.totalOPD}</h4>
                  <p className="text-[10px] text-gray-500 mt-1 font-medium">Clinician appointments logged</p>
                </div>
                <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl text-left">
                  <span className="text-[10px] text-purple-500 font-bold uppercase tracking-wider">Inpatient Admissions (IP)</span>
                  <h4 className="text-2xl font-black text-purple-800 mt-1 font-mono">{footfallData.summary.totalIP}</h4>
                  <p className="text-[10px] text-gray-500 mt-1 font-medium">Bed occupancy registrations</p>
                </div>
                <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl text-left">
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Emergency Visits</span>
                  <h4 className="text-2xl font-black text-red-800 mt-1 font-mono">{footfallData.summary.totalEmergency}</h4>
                  <p className="text-[10px] text-gray-500 mt-1 font-medium">ER responder alerts resolved</p>
                </div>
                <div className="bg-teal-50/50 border border-teal-100 p-4 rounded-xl text-left">
                  <span className="text-[10px] text-teal-500 font-bold uppercase tracking-wider">Total Combined Footfall</span>
                  <h4 className="text-2xl font-black text-teal-800 mt-1 font-mono">{footfallData.summary.totalVisits}</h4>
                  <p className="text-[10px] text-gray-500 mt-1 font-medium">Active logs across platforms</p>
                </div>
              </div>

              {/* Predicted Busy Hours */}
              <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-xl text-left flex flex-col md:flex-row md:items-center justify-between gap-sm">
                <div>
                  <h4 className="font-bold text-sm text-amber-800 flex items-center gap-xs">
                    <span className="material-symbols-outlined text-md">trending_up</span>
                    AI Predicted Busy Hours (Based on Roster Load Logs)
                  </h4>
                  <p className="text-xs text-amber-700/80 mt-1 font-medium">
                    The platform predicts peak load spikes. Schedule shifts and deploy resources proactively to prevent wait times.
                  </p>
                </div>
                <div className="flex gap-sm">
                  {footfallData.busyHoursPrediction.map((p: any, idx: number) => (
                    <div key={idx} className="bg-white px-3 py-1.5 border border-amber-100 rounded-lg text-center font-bold text-amber-800 text-xs shadow-xs font-mono">
                      {p.window}
                    </div>
                  ))}
                </div>
              </div>

              {/* Graph & Heatmap Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
                
                {/* SVG Graph Renderer */}
                <div className="lg:col-span-8 bg-gray-50 border border-gray-150 p-5 rounded-2xl flex flex-col">
                  <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-sm text-left">
                    {timeframe} Footfall Distribution Trend
                  </h4>
                  
                  {(() => {
                    const activeSeries = footfallData.timeSeries[timeframe] || [];
                    const maxVal = Math.max(...activeSeries.map((s: any) => s.count), 1);
                    const viewW = 600;
                    const viewH = 220;
                    const padL = 40;
                    const padR = 20;
                    const padT = 20;
                    const padB = 40;
                    
                    const graphW = viewW - padL - padR;
                    const graphH = viewH - padT - padB;
                    
                    // Generate coordinates
                    const coords = activeSeries.map((s: any, idx: number) => {
                      const x = padL + (activeSeries.length > 1 ? (idx / (activeSeries.length - 1)) * graphW : graphW / 2);
                      const y = viewH - padB - (s.count / maxVal) * graphH;
                      return { x, y, label: s.label, count: s.count };
                    });
                    
                    // Construct SVG Path
                    const linePath = coords.length > 0
                      ? `M ${coords[0].x} ${coords[0].y} ` + coords.slice(1).map((c: any) => `L ${c.x} ${c.y}`).join(' ')
                      : '';
                      
                    const areaPath = coords.length > 0
                      ? `${linePath} L ${coords[coords.length - 1].x} ${viewH - padB} L ${coords[0].x} ${viewH - padB} Z`
                      : '';
                      
                    return (
                      <div className="flex-grow flex flex-col justify-between">
                        <svg className="w-full h-48 mt-4 overflow-visible" viewBox={`0 0 ${viewW} ${viewH}`}>
                          {/* Y-axis grids */}
                          {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                            const y = viewH - padB - p * graphH;
                            return (
                              <g key={idx}>
                                <line x1={padL} y1={y} x2={viewW - padR} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                                <text x={padL - 10} y={y + 4} textAnchor="end" className="fill-gray-400 font-mono text-[9px] font-bold">
                                  {Math.round(p * maxVal)}
                                </text>
                              </g>
                            );
                          })}
                          
                          {/* Area shading */}
                          {areaPath && <path d={areaPath} fill="url(#areaGrad)" opacity="0.15" />}
                          
                          {/* Line stroke */}
                          {linePath && <path d={linePath} fill="none" stroke="#00488d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
                          
                          {/* Data points & tooltips */}
                          {coords.map((c: any, idx: number) => (
                            <g key={idx} className="group cursor-pointer">
                              <circle cx={c.x} cy={c.y} r="4.5" fill="#ffffff" stroke="#00488d" strokeWidth="2.5" className="transition-all hover:r-6" />
                              
                              {/* Floating tooltip */}
                              <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-150">
                                <rect x={c.x - 30} y={c.y - 32} width="60" height="20" rx="6" fill="#1e293b" />
                                <text x={c.x} y={c.y - 19} textAnchor="middle" fill="#ffffff" className="font-mono text-[9px] font-bold">
                                  {c.count} vsts
                                </text>
                              </g>
                              
                              {/* X labels (draw selectively if crowded) */}
                              {(activeSeries.length < 15 || idx % Math.round(activeSeries.length / 8) === 0) && (
                                <text x={c.x} y={viewH - 15} textAnchor="middle" className="fill-gray-400 font-bold text-[8px] tracking-tight">
                                  {c.label}
                                </text>
                              )}
                            </g>
                          ))}
                          
                          {/* SVG Gradients definitions */}
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#00488d" />
                              <stop offset="100%" stopColor="#00488d" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    );
                  })()}
                </div>

                {/* Heatmap Section */}
                <div className="lg:col-span-4 bg-gray-50 border border-gray-150 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Weekly Heatmap Matrix</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Visits density by day index (rows) and hour block (columns)</p>
                  </div>
                  
                  {(() => {
                    const heatmap = footfallData.heatmap || [];
                    const maxHeatCount = Math.max(...heatmap.map((h: any) => h.count), 1);
                    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    
                    return (
                      <div className="my-sm overflow-x-auto">
                        <div className="min-w-[280px] space-y-1">
                          {/* Grid cells */}
                          {dayLabels.map((lbl, dIdx) => (
                            <div key={lbl} className="flex items-center gap-xs">
                              <span className="w-6 text-[9px] font-black text-gray-400 text-left uppercase leading-none">{lbl}</span>
                              <div className="flex-grow grid grid-cols-24 gap-[2px]">
                                {Array.from({ length: 24 }).map((_, hIdx) => {
                                  const cellData = heatmap.find((h: any) => h.day === dIdx && h.hour === hIdx);
                                  const cellCount = cellData?.count || 0;
                                  const density = cellCount / maxHeatCount;
                                  
                                  return (
                                    <div
                                      key={hIdx}
                                      title={`${lbl} at ${String(hIdx).padStart(2, '0')}:00 - Count: ${cellCount}`}
                                      className="aspect-square rounded-[1.5px] transition-all hover:scale-125 cursor-help"
                                      style={{
                                        backgroundColor: cellCount === 0 ? '#f1f5f9' : '#00488d',
                                        opacity: cellCount === 0 ? 1 : Math.max(0.15, density)
                                      }}
                                    ></div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          
                          {/* Heatmap Legend */}
                          <div className="flex justify-between items-center text-[8px] text-gray-400 font-bold pt-xs">
                            <span>00:00 (12 AM)</span>
                            <div className="flex items-center gap-[2px]">
                              <span>Low</span>
                              <div className="w-8 h-1.5 bg-[#00488d] opacity-30 rounded-[1px]"></div>
                              <div className="w-8 h-1.5 bg-[#00488d] opacity-100 rounded-[1px]"></div>
                              <span>High</span>
                            </div>
                            <span>23:00 (11 PM)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Breakdowns Row (Hospital, Department, Doctor) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-lg border-t border-gray-100 pt-lg">
                
                {/* Hospital-wise Footfall Breakdowns */}
                <div className="space-y-sm text-left">
                  <div className="flex items-center gap-xs text-[#00488d] font-bold text-xs">
                    <span className="material-symbols-outlined text-sm">hospitals</span>
                    <span>HOSPITAL DISTRIBUTION</span>
                  </div>
                  <div className="space-y-xs max-h-48 overflow-y-auto pr-1">
                    {footfallData.breakdowns.hospital.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No facility logs recorded.</p>
                    ) : (
                      footfallData.breakdowns.hospital.map((h: any) => (
                        <div key={h.id} className="flex justify-between items-center p-md bg-gray-50 border border-gray-100 rounded-xl">
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-gray-700">{h.name}</span>
                            <span className="text-[9px] text-gray-400 font-bold font-mono">
                              OPD: {h.opd} | IP: {h.ip} | ER: {h.emergency}
                            </span>
                          </div>
                          <span className="text-xs font-black text-[#00488d] font-mono">{h.count} visits</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Department-wise Breakdowns */}
                <div className="space-y-sm text-left">
                  <div className="flex items-center gap-xs text-[#00488d] font-bold text-xs">
                    <span className="material-symbols-outlined text-sm">dashboard</span>
                    <span>DEPARTMENT BREAKDOWN</span>
                  </div>
                  <div className="space-y-xs max-h-48 overflow-y-auto pr-1">
                    {footfallData.breakdowns.department.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No department metrics logged.</p>
                    ) : (
                      footfallData.breakdowns.department.map((d: any) => (
                        <div key={d.name} className="flex justify-between items-center p-md bg-gray-50 border border-gray-100 rounded-xl">
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-gray-700">{d.name}</span>
                            <span className="text-[9px] text-gray-400 font-bold font-mono">
                              OPD: {d.opd} | IP: {d.ip} | ER: {d.emergency}
                            </span>
                          </div>
                          <span className="text-xs font-black text-[#00488d] font-mono">{d.count} logs</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Doctor-wise Breakdowns */}
                <div className="space-y-sm text-left">
                  <div className="flex items-center gap-xs text-[#00488d] font-bold text-xs">
                    <span className="material-symbols-outlined text-sm">stethoscope</span>
                    <span>PEAK LOAD CLINICIANS (OPD)</span>
                  </div>
                  <div className="space-y-xs max-h-48 overflow-y-auto pr-1">
                    {footfallData.breakdowns.doctor.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No practitioner queues recorded.</p>
                    ) : (
                      footfallData.breakdowns.doctor.map((doc: any) => (
                        <div key={doc.name} className="flex justify-between items-center p-md bg-gray-50 border border-gray-100 rounded-xl">
                          <span className="font-bold text-xs text-gray-700">{doc.name}</span>
                          <span className="text-xs bg-[#00488d]/10 text-[#00488d] font-bold px-2 py-0.5 rounded-full font-mono">
                            {doc.count} appointments
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
          ) : (
            /* Command Center Dashboard Content */
            <div className="space-y-6">
              {/* KPIs Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Hospitals Registry (Total, Pending, Active, Suspended) */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs text-left">
                  <div className="flex justify-between items-center text-gray-400 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Hospitals Registry</span>
                    <Building2 className="text-[#00488d] w-5 h-5" />
                  </div>
                  <h4 className="text-2xl font-black text-gray-800">Total: {stats?.hospitalCounts?.total || 0}</h4>
                  <div className="grid grid-cols-3 gap-1.5 text-[9px] font-black mt-3">
                    <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-center border border-green-100">
                      Active: {stats?.hospitalCounts?.active || 0}
                    </span>
                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-center border border-amber-100">
                      Pending: {stats?.hospitalCounts?.pending || 0}
                    </span>
                    <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded text-center border border-red-100">
                      Suspended: {stats?.hospitalCounts?.rejected || 0}
                    </span>
                  </div>
                </div>

                {/* 2. Clinical Workforce (Doctors, Nurses, Pharmacists, Lab Techs) */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs text-left">
                  <div className="flex justify-between items-center text-gray-400 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Workforce Roster</span>
                    <Users className="text-[#00488d] w-5 h-5" />
                  </div>
                  <h4 className="text-2xl font-black text-gray-800">Staff: {(stats?.doctorCount || 0) + (stats?.nurseCount || 0) + (stats?.pharmacistCount || 0) + (stats?.labTechnicianCount || 0)}</h4>
                  <div className="grid grid-cols-2 gap-1.5 text-[9px] font-black mt-2">
                    <span className="text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded">MDs: {stats?.doctorCount || 0} ({stats?.presentDoctorsCount || 0} Present)</span>
                    <span className="text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded">RNs: {stats?.nurseCount || 0}</span>
                    <span className="text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded">RPhs: {stats?.pharmacistCount || 0}</span>
                    <span className="text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded">MLTs: {stats?.labTechnicianCount || 0}</span>
                  </div>
                </div>

                {/* 3. Patient Capacity (Total Patients, Admissions, Emergencies Today) */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs text-left">
                  <div className="flex justify-between items-center text-gray-400 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Patient Capacity</span>
                    <Activity className="text-[#00488d] w-5 h-5" />
                  </div>
                  <h4 className="text-2xl font-black text-gray-800">Patients: {stats?.patientCount || 0}</h4>
                  <div className="grid grid-cols-2 gap-1.5 text-[9px] font-black mt-3">
                    <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">Admissions: {stats?.admissions?.total || 0}</span>
                    <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded">Emergencies: {stats?.emergency?.active || 0} Today</span>
                  </div>
                </div>

                {/* 4. Bed Occupancy (Total, Occupied, Available Beds) */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs text-left">
                  <div className="flex justify-between items-center text-gray-400 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Bed Allocations</span>
                    <BedDouble className="text-[#00488d] w-5 h-5" />
                  </div>
                  <h4 className="text-2xl font-black text-gray-800">
                    Beds: {stats?.bedStats?.total || 0}
                  </h4>
                  <div className="grid grid-cols-2 gap-1.5 text-[9px] font-black mt-3">
                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Occupied: {stats?.bedStats?.occupied || 0}</span>
                    <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded">Available: {stats?.bedStats?.available || 0}</span>
                  </div>
                </div>

                {/* 5. Inventory & Shortages (Total Medicines, Low Stock, Low Stock Hospitals) */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs text-left">
                  <div className="flex justify-between items-center text-gray-400 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Logistics & Supply</span>
                    <Warehouse className="text-[#00488d] w-5 h-5" />
                  </div>
                  <h4 className="text-2xl font-black text-gray-800">Meds: {stats?.inventory?.totalMedicines || 0}</h4>
                  <div className="grid grid-cols-2 gap-1.5 text-[9px] font-black mt-3">
                    <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded">Low Stock: {stats?.inventory?.lowStock || 0} items</span>
                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Low Stock clinics: {stats?.inventory?.lowStockHospitalsCount || 0}</span>
                  </div>
                </div>

                {/* 6. District Health Alerts (AI Alerts, Outbreak / Disease Alerts, Rankings Summary) */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs text-left">
                  <div className="flex justify-between items-center text-gray-400 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Intelligence & Alerts</span>
                    <ShieldAlert className="text-red-500 w-5 h-5 font-fill" />
                  </div>
                  <h4 className="text-2xl font-black text-amber-600">Proposals: {stats?.resourceTransfersCount || 0}</h4>
                  <div className="grid grid-cols-2 gap-1.5 text-[9px] font-black mt-3">
                    <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded">Outbreaks: {stats?.outbreakAlertsCount || 0} warning</span>
                    <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">Top Rank: {stats?.hospitalRankings?.[0]?.hospitalName || 'None'}</span>
                  </div>
                </div>

              </div>

              {/* Sub-tab selection menu */}
              <div className="flex border-b border-gray-200 gap-4 mb-6 select-none">
                <button
                  onClick={() => setCommandSubTab('map')}
                  className={`pb-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                    commandSubTab === 'map' ? 'border-[#00488d] text-[#00488d] font-black' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  District Map & Fleet Telemetry
                </button>
                <button
                  onClick={() => setCommandSubTab('scorecards')}
                  className={`pb-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                    commandSubTab === 'scorecards' ? 'border-[#00488d] text-[#00488d] font-black' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Hospital Performance Scorecards
                </button>
                <button
                  onClick={() => setCommandSubTab('charts')}
                  className={`pb-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                    commandSubTab === 'charts' ? 'border-[#00488d] text-[#00488d] font-black' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Advanced Health Analytics
                </button>
                <button
                  onClick={() => setCommandSubTab('ai_alerts')}
                  className={`pb-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    commandSubTab === 'ai_alerts' ? 'border-[#00488d] text-[#00488d] font-black' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  AI Roster & Shortage Alerts
                </button>
              </div>

              {commandSubTab === 'map' && (
                /* Map & District Distribution Grid */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Telemetry map */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 border-b border-gray-150 pb-3 mb-4 text-[#00488d] text-left">
                      <span className="material-symbols-outlined">map</span>
                      <div>
                        <h3 className="font-bold text-sm text-gray-800">District Telemetry Map</h3>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase">Real-time GPS coordinates of active hospitals</p>
                      </div>
                    </div>
                    
                    <div className="w-full h-[240px] bg-slate-50 border border-gray-100 rounded-xl relative flex items-center justify-center overflow-hidden">
                      <svg viewBox="0 0 380 180" className="w-full h-full">
                        <path d="M 0,30 L 380,30 M 0,60 L 380,60 M 0,90 L 380,90 M 0,120 L 380,120 M 0,150 L 380,150" stroke="#f1f5f9" strokeWidth="1" />
                        <path d="M 60,0 L 60,180 M 120,0 L 120,180 M 180,0 L 180,180 M 240,0 L 240,180 M 300,0 L 300,180" stroke="#f1f5f9" strokeWidth="1" />
                        
                        {stats?.mapCoordinates?.length === 0 ? (
                          <text x="190" y="90" textAnchor="middle" className="fill-gray-400 text-xs italic">No hospital telemetry online.</text>
                        ) : (
                          (() => {
                            const coords = stats?.mapCoordinates || [];
                            const lats = coords.map((c: any) => c.latitude).filter((l: any) => l != null);
                            const lons = coords.map((c: any) => c.longitude).filter((l: any) => l != null);
                            
                            const maxLat = lats.length > 0 ? Math.max(...lats) : 37.5;
                            const minLat = lats.length > 0 ? Math.min(...lats) : 37.2;
                            const maxLon = lons.length > 0 ? Math.max(...lons) : -121.8;
                            const minLon = lons.length > 0 ? Math.min(...lons) : -122.2;
                            
                            const latDiff = maxLat - minLat || 0.1;
                            const lonDiff = maxLon - minLon || 0.1;

                            return coords.map((c: any, idx: number) => {
                              const pctX = (c.longitude - minLon) / lonDiff;
                              const pctY = (c.latitude - minLat) / latDiff;
                              const x = 50 + pctX * 280;
                              const y = 140 - pctY * 100;

                              return (
                                <g key={c.id}>
                                  <circle cx={x} cy={y} r="6" className="fill-[#00488d] stroke-white stroke-2 animate-pulse" />
                                  <circle cx={x} cy={y} r="3" className="fill-amber-400" />
                                  <text x={x} y={y - 8} textAnchor="middle" className="text-[7px] font-black fill-gray-700 font-sans">
                                    {c.name}
                                  </text>
                                </g>
                              );
                            });
                          })()
                        )}
                      </svg>
                    </div>
                  </div>

                  {/* District Distribution Bar Chart */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 border-b border-gray-150 pb-3 mb-4 text-[#00488d] text-left">
                      <span className="material-symbols-outlined">bar_chart</span>
                      <div>
                        <h3 className="font-bold text-sm text-gray-800">Regional Distribution</h3>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase">Active clinics count grouped by District</p>
                      </div>
                    </div>

                    <div className="w-full h-[240px] flex flex-col justify-center space-y-4">
                      {stats?.districtStats?.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center">No active hospital distributions logs.</p>
                      ) : (
                        stats?.districtStats?.map((d: any, idx: number) => {
                          const totalCounts = stats?.districtStats?.reduce((acc: number, item: any) => acc + item.count, 0) || 1;
                          const barWidthPct = Math.round((d.count / totalCounts) * 100);
                          return (
                            <div key={idx} className="space-y-1.5 text-left">
                              <div className="flex justify-between text-xs font-bold">
                                <span className="text-gray-700">{d.district}</span>
                                <span className="text-primary font-mono">{d.count} clinics</span>
                              </div>
                              <div className="w-full bg-slate-50 border border-slate-100 h-6 rounded-lg overflow-hidden flex items-center">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#00488d] to-violet-600 rounded-r-lg transition-all duration-500" 
                                  style={{ width: `${barWidthPct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              )}

              {commandSubTab === 'scorecards' && (
                /* Hospital performance rankings table */
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-[#00488d] border-b border-gray-150 pb-3 text-left">
                    <span className="material-symbols-outlined font-fill text-amber-500">award</span>
                    <div>
                      <h3 className="font-bold text-sm text-gray-800">Hospital Performance Scorecards</h3>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase">Audit rankings calculated from live workloads and attendance rates</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 font-bold uppercase border-b border-gray-200">
                          <th className="px-4 py-3">Rank</th>
                          <th className="px-4 py-3">Facility Name</th>
                          <th className="px-4 py-3">District</th>
                          <th className="px-4 py-3">Computed Index</th>
                          <th className="px-4 py-3">Audit Category</th>
                          <th className="px-4 py-3">Key Bottlenecks / AI Summary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stats?.hospitalRankings?.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-gray-400 italic">No facility rankings calculated.</td>
                          </tr>
                        ) : (
                          stats?.hospitalRankings?.map((item: any, index: number) => {
                            const rankPills = ['bg-amber-100 text-amber-800 border-amber-200', 'bg-slate-100 text-slate-700 border-slate-200', 'bg-orange-100 text-orange-800 border-orange-200'];
                            const categoryColors = 
                              item.category === 'Excellent' ? 'text-green-600 bg-green-50 border-green-200' :
                              item.category === 'Good' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                              item.category === 'Average' ? 'text-indigo-600 bg-indigo-50 border-indigo-200' :
                              item.category === 'Needs Attention' ? 'text-orange-600 bg-orange-50 border-orange-200' :
                              'text-red-600 bg-red-50 border-red-200';

                            return (
                              <tr key={item.hospitalId} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-4 font-mono font-bold">
                                  <span className={`px-2 py-0.5 border rounded-lg ${index < 3 ? rankPills[index] : 'bg-white text-gray-500 border-gray-250'}`}>
                                    #{index + 1}
                                  </span>
                                </td>
                                <td className="px-4 py-4 font-bold text-gray-800">{item.hospitalName}</td>
                                <td className="px-4 py-4 font-medium text-gray-500">{item.district}</td>
                                <td className="px-4 py-4 font-mono font-bold text-primary">{item.score}/100</td>
                                <td className="px-4 py-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase ${categoryColors}`}>
                                    {item.category}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-gray-600 leading-relaxed font-medium max-w-md">{item.aiSummary}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {commandSubTab === 'charts' && (
                /* Charts Grid: patient footfall, doc attendance, bed occupancy, meds availability, emergency trends, performance score, admissions, discharges, lab workload */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(() => {
                    // Create monthly curves incorporating live database metrics at the end index
                    const footfallVal = stats?.patientCount || 280;
                    const attendanceVal = stats?.presentDoctorsCount ? Math.round((stats.presentDoctorsCount / (stats.doctorCount || 1)) * 100) : 89;
                    const occupancyVal = stats?.bedStats?.total ? Math.round((stats.bedStats.occupied / stats.bedStats.total) * 100) : 78;
                    const emergencyVal = stats?.emergency?.active || 14;
                    const admissionsVal = stats?.admissions?.total || 95;
                    const labVal = 340;

                    const dataset = [
                      { month: 'Jan', footfall: 120, attendance: 85, occupancy: 65, meds: 90, emergency: 12, admissions: 45, discharges: 40, lab: 180 },
                      { month: 'Feb', footfall: 150, attendance: 88, occupancy: 70, meds: 88, emergency: 15, admissions: 50, discharges: 47, lab: 220 },
                      { month: 'Mar', footfall: 180, attendance: 90, occupancy: 75, meds: 85, emergency: 18, admissions: 62, discharges: 58, lab: 260 },
                      { month: 'Apr', footfall: 210, attendance: 87, occupancy: 82, meds: 82, emergency: 22, admissions: 75, discharges: 70, lab: 310 },
                      { month: 'May', footfall: 240, attendance: 92, occupancy: 80, meds: 87, emergency: 19, admissions: 80, discharges: 76, lab: 290 },
                      { month: 'Jun', footfall: footfallVal, attendance: attendanceVal, occupancy: occupancyVal, meds: 92, emergency: emergencyVal, admissions: admissionsVal, discharges: 88, lab: labVal }
                    ];

                    const drawSVGLineChart = (title: string, dataKey: string, strokeColor: string, suffix: string = "") => {
                      const width = 380;
                      const height = 150;
                      const padding = 25;
                      const points = dataset.map((d: any, idx: number) => {
                        const val = d[dataKey] || 0;
                        const maxVal = Math.max(...dataset.map((i: any) => i[dataKey] || 1), 1);
                        const x = padding + (idx / (dataset.length - 1)) * (width - 2 * padding);
                        const y = height - padding - (val / maxVal) * (height - 2 * padding);
                        return { x, y, label: d.month, val };
                      });

                      const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                      return (
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                          <div className="text-left mb-2">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h4>
                          </div>
                          <div className="w-full h-[160px] bg-slate-50 rounded-xl relative flex items-center justify-center overflow-hidden">
                            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                              {/* Background gridlines */}
                              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1.5" />
                              <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1.5" />
                              
                              {/* Trend Line Path */}
                              <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
                              
                              {/* Points & Labels */}
                              {points.map((p, idx) => (
                                <g key={idx}>
                                  <circle cx={p.x} cy={p.y} r="4" fill={strokeColor} stroke="white" strokeWidth="1.5" />
                                  <text x={p.x} y={height - 8} textAnchor="middle" className="text-[8px] font-bold fill-gray-400">{p.label}</text>
                                  <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[8px] font-black fill-gray-700">{p.val}{suffix}</text>
                                </g>
                              ))}
                            </svg>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <>
                        {drawSVGLineChart("Patient Footfall Trends", "footfall", "#2563eb", " visits")}
                        {drawSVGLineChart("Doctor Attendance Rates", "attendance", "#0d9488", "%")}
                        {drawSVGLineChart("Bed Occupancy Indexes", "occupancy", "#7c3aed", "%")}
                        {drawSVGLineChart("Medicine Availability Indices", "meds", "#16a34a", "%")}
                        {drawSVGLineChart("Emergency Case Dispatches", "emergency", "#dc2626", " calls")}
                        {drawSVGLineChart("Clinical Admissions Rates", "admissions", "#ea580c", " admissions")}
                        {drawSVGLineChart("Clinical Discharges Rates", "discharges", "#2563eb", " cases")}
                        {drawSVGLineChart("Lab Diagnostics Workloads", "lab", "#4f46e5", " tests")}
                      </>
                    );
                  })()}
                </div>
              )}

              {commandSubTab === 'ai_alerts' && (
                /* AI Alerts checklists dashboard */
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 text-left">
                  <div className="flex items-center gap-2 text-[#00488d] border-b border-gray-150 pb-3">
                    <span className="material-symbols-outlined font-fill text-amber-500 animate-pulse">crisis_alert</span>
                    <div>
                      <h3 className="font-bold text-sm text-gray-800">Operational AI Alerts & Shortage Monitors</h3>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase">Jurisdictional facility audits generated by clinical threshold checks</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(() => {
                      const rankings = stats?.hospitalRankings || [];
                      const alertsList: Array<{ type: string; hospital: string; message: string; severity: 'critical' | 'warning' }> = [];

                      rankings.forEach((h: any) => {
                        if (h.medicineAvailability < 75) {
                          alertsList.push({
                            type: 'Medicine Shortage',
                            hospital: h.hospitalName,
                            message: `Medicine stock levels are critically low at ${h.medicineAvailability.toFixed(0)}%. Initiate redistribution transfers immediately.`,
                            severity: 'critical'
                          });
                        }
                        if (h.doctorAttendance < 75) {
                          alertsList.push({
                            type: 'Low Doctor Attendance',
                            hospital: h.hospitalName,
                            message: `Clinician attendance rate is down to ${h.doctorAttendance.toFixed(0)}%. Roster review required.`,
                            severity: 'warning'
                          });
                        }
                        if (h.bedOccupancy > 80) {
                          alertsList.push({
                            type: 'High Patient Ward Load',
                            hospital: h.hospitalName,
                            message: `ICU and ward bed occupancy is currently critical at ${h.bedOccupancy.toFixed(0)}%. Low reserves remaining.`,
                            severity: 'critical'
                          });
                        }
                        if (h.waitingTime > 45) {
                          alertsList.push({
                            type: 'Excessive Waiting Queue Times',
                            hospital: h.hospitalName,
                            message: `Outpatient consultation wait times average ${h.waitingTime} minutes. Secondary triage offloading recommended.`,
                            severity: 'warning'
                          });
                        }
                        if (h.score < 55) {
                          alertsList.push({
                            type: 'District Intervention Recommended',
                            hospital: h.hospitalName,
                            message: `Facility composite audit index is critical at ${h.score}/100. Operational audit recommended.`,
                            severity: 'critical'
                          });
                        }
                      });

                      if (alertsList.length === 0) {
                        return (
                          <div className="text-center py-10 text-gray-400 italic text-sm">
                            🎉 No clinical anomalies or shortages detected across district hospitals.
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {alertsList.map((alert, idx) => {
                            const isCritical = alert.severity === 'critical';
                            return (
                              <div 
                                key={idx} 
                                className={`p-4 rounded-xl border flex gap-3 text-xs leading-relaxed transition-colors ${
                                  isCritical 
                                    ? 'bg-red-50/50 border-red-200 text-red-800' 
                                    : 'bg-amber-50/40 border-amber-200 text-amber-800'
                                }`}
                              >
                                <span className="material-symbols-outlined text-lg shrink-0 mt-0.5 animate-pulse">
                                  {isCritical ? 'error' : 'warning'}
                                </span>
                                <div>
                                  <p className="font-black uppercase tracking-wider text-[10px] mb-1">
                                    {alert.type} | {alert.hospital}
                                  </p>
                                  <p className="font-medium text-gray-700">{alert.message}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AppAdminDashboard;
