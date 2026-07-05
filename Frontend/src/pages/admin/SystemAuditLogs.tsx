import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Loader2, History, AlertCircle } from 'lucide-react';

const SystemAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const response = await axiosInstance.get('/admin/audit');
      setLogs(response.data.data?.records || []);
    } catch (err: any) {
      console.error(err);
      setErrorState(err.response?.data?.message || "Failed to load audit registry.");
    } finally {
      setLoading(false);
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
          <h4 className="font-bold">Audit Access Interrupted</h4>
          <p className="text-sm mt-xs">{errorState}</p>
        </div>
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

      {/* Audit Logs Table */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low text-on-surface-variant text-label-lg font-bold uppercase">
            <tr>
              <th className="px-lg py-md">User Account</th>
              <th className="px-lg py-md">IP Address</th>
              <th className="px-lg py-md">Client Agent</th>
              <th className="px-lg py-md text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-lg py-8 text-center text-on-surface-variant">
                  No login history audit records found in database.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const time = new Date(log.createdAt).toLocaleString();
                return (
                  <tr key={log.id} className="hover:bg-surface-container-lowest transition-colors text-sm">
                    <td className="px-lg py-md">
                      <div className="flex flex-col">
                        <span className="font-bold">{log.user?.email || "Unknown User"}</span>
                        <span className="text-[10px] text-on-surface-variant font-mono">UID: {log.userId}</span>
                      </div>
                    </td>
                    <td className="px-lg py-md font-mono font-semibold text-on-surface-variant">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="px-lg py-md text-xs text-on-surface-variant max-w-xs truncate" title={log.userAgent}>
                      {log.userAgent || 'Clinical Client'}
                    </td>
                    <td className="px-lg py-md text-right font-medium text-on-surface-variant">
                      {time}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemAuditLogs;
