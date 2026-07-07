import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Loader2, History, AlertCircle, Filter } from 'lucide-react';

const SystemAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Filter States
  const [filterHospital, setFilterHospital] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterAction, setFilterAction] = useState("");
  
  const [hospitalsList, setHospitalsList] = useState<any[]>([]);

  useEffect(() => {
    loadHospitals();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [filterHospital, filterRole, filterEntity, filterDate, filterAction]);

  const loadHospitals = async () => {
    try {
      const res = await axiosInstance.get('/hospitals');
      setHospitalsList(res.data.data || []);
    } catch (err) {
      console.error("Failed to load hospital list", err);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const response = await axiosInstance.get('/admin/audit', {
        params: {
          hospitalId: filterHospital || undefined,
          role: filterRole || undefined,
          entity: filterEntity || undefined,
          date: filterDate || undefined,
          action: filterAction || undefined
        }
      });
      setLogs(response.data.data?.records || []);
    } catch (err: any) {
      console.error(err);
      setErrorState(err.response?.data?.message || "Failed to load audit registry.");
    } finally {
      setLoading(false);
    }
  };

  const renderJsonSummary = (data: any) => {
    if (!data) return <span className="text-gray-400 font-normal">N/A</span>;
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return (
      <span className="font-mono text-[10px] max-w-[150px] truncate block hover:text-primary cursor-help" title={str}>
        {str}
      </span>
    );
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-xl font-sans text-on-surface">
      <header className="mb-8">
        <div className="flex items-center gap-3 text-[#00488d] mb-2">
          <History className="w-8 h-8" />
          <h1 className="text-3xl font-black tracking-tight">System Audit Trail</h1>
        </div>
        <p className="text-on-surface-variant text-body-md">Detailed system login sessions and event logs for hospital compliance auditing.</p>
      </header>

      {/* Filter Toolbar */}
      <section className="bg-slate-50 border border-outline-variant p-lg rounded-xl grid grid-cols-1 md:grid-cols-5 gap-md">
        <div className="space-y-xs">
          <label className="text-xs font-bold text-on-surface-variant">Hospital Facility</label>
          <select 
            value={filterHospital}
            onChange={(e) => setFilterHospital(e.target.value)}
            className="w-full border border-outline rounded p-sm text-sm outline-none text-on-surface bg-white"
          >
            <option value="">All Facilities</option>
            {hospitalsList.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-xs">
          <label className="text-xs font-bold text-on-surface-variant">User Role</label>
          <select 
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full border border-outline rounded p-sm text-sm outline-none text-on-surface bg-white"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="DOCTOR">Doctor</option>
            <option value="PATIENT">Patient</option>
            <option value="LAB_TECHNICIAN">Lab Technician</option>
          </select>
        </div>

        <div className="space-y-xs">
          <label className="text-xs font-bold text-on-surface-variant">Entity Type</label>
          <input 
            type="text" 
            placeholder="e.g. Appointment, Admission" 
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="w-full border border-outline rounded p-sm text-sm outline-none text-on-surface bg-white"
          />
        </div>

        <div className="space-y-xs">
          <label className="text-xs font-bold text-on-surface-variant">Action Type</label>
          <input 
            type="text" 
            placeholder="e.g. CREATE, VERIFY" 
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full border border-outline rounded p-sm text-sm outline-none text-on-surface bg-white"
          />
        </div>

        <div className="space-y-xs">
          <label className="text-xs font-bold text-on-surface-variant">Event Date</label>
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full border border-outline rounded p-sm text-sm outline-none text-on-surface bg-white"
          />
        </div>
      </section>

      {errorState && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-lg text-red-700 flex gap-md">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <div>
            <h4 className="font-bold">Audit Access Interrupted</h4>
            <p className="text-sm mt-xs">{errorState}</p>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-surface-container-low text-on-surface-variant text-label-lg font-bold uppercase border-b border-outline-variant">
              <tr>
                <th className="px-lg py-md text-xs">Timestamp</th>
                <th className="px-lg py-md text-xs">User / Role</th>
                <th className="px-lg py-md text-xs">Hospital Context</th>
                <th className="px-lg py-md text-xs">Entity / Action</th>
                <th className="px-lg py-md text-xs">Old Value</th>
                <th className="px-lg py-md text-xs">New Value</th>
                <th className="px-lg py-md text-xs text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-lg py-8 text-center text-on-surface-variant">
                    <Loader2 className="animate-spin w-6 h-6 inline mr-2 text-primary" /> Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-lg py-8 text-center text-on-surface-variant font-medium">
                    No compliance logs match the chosen filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const time = new Date(log.createdAt).toLocaleString();
                  const roleName = log.user?.role?.name || "Global";
                  const hospitalName = log.user?.admin?.hospital?.name || log.user?.doctor?.department?.hospital?.name || "Global / CareHive System";
                  
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors text-xs">
                      <td className="px-lg py-md font-mono text-gray-500 whitespace-nowrap">
                        {time}
                      </td>
                      <td className="px-lg py-md">
                        <div className="flex flex-col">
                          <span className="font-bold">{log.user?.email || "System Daemon"}</span>
                          <span className="text-[10px] text-primary uppercase font-bold">{roleName}</span>
                        </div>
                      </td>
                      <td className="px-lg py-md text-on-surface-variant font-semibold">
                        {hospitalName}
                      </td>
                      <td className="px-lg py-md">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-700">{log.entity}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-lg py-md">
                        {renderJsonSummary(log.oldData)}
                      </td>
                      <td className="px-lg py-md">
                        {renderJsonSummary(log.newData)}
                      </td>
                      <td className="px-lg py-md text-right font-mono font-medium text-on-surface-variant">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemAuditLogs;
