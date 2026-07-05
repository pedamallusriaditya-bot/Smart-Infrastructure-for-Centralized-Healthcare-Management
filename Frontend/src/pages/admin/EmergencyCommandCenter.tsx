import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Loader2, Radio, Compass, CheckCircle2, ShieldAlert } from 'lucide-react';

const EmergencyCommandCenter: React.FC = () => {
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    loadEmergencies();
  }, []);

  const loadEmergencies = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const response = await axiosInstance.get('/emergencies');
      setEmergencies(response.data.data || []);
    } catch (err: any) {
      console.error(err);
      setErrorState(err.response?.data?.message || "Failed to establish link with emergency services registry.");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    if (!window.confirm("Mark this incident as RESOLVED?")) return;
    try {
      await axiosInstance.patch(`/emergencies/${id}/resolve`);
      alert("Incident successfully resolved.");
      loadEmergencies();
    } catch (err: any) {
      alert("Action failed: " + (err.response?.data?.message || err.message));
    }
  };

  const activeAlerts = emergencies.filter(e => e.status === 'ACTIVE');
  const pastAlerts = emergencies.filter(e => e.status === 'RESOLVED');

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
          <h4 className="font-bold">System Connection Interrupted</h4>
          <p className="text-sm mt-xs">{errorState}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl font-sans text-on-surface">
      
      {/* Active Incidents listing */}
      <section className="lg:col-span-8 space-y-xl">
        <header className="mb-4">
          <div className="flex items-center gap-3 text-error mb-2 font-black uppercase tracking-wider">
            <Radio className="w-6 h-6 animate-pulse" />
            <span>Emergency Command Center</span>
          </div>
          <p className="text-on-surface-variant text-body-md">Real-time incident response routing, active GPS telemetry, and clinical dispatch controls.</p>
        </header>

        <div className="space-y-md">
          <h3 className="font-title-md text-title-md font-bold flex items-center gap-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-error animate-ping"></span>
            <span>Active Incidents ({activeAlerts.length})</span>
          </h3>

          {activeAlerts.length === 0 ? (
            <div className="bg-surface border border-outline-variant p-10 rounded-2xl text-center text-on-surface-variant font-semibold">
              🎉 No active emergency calls. All clear.
            </div>
          ) : (
            activeAlerts.map(alert => (
              <div 
                key={alert.id} 
                className="bg-white border-2 border-error p-lg rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-md shadow-lg shadow-red-50 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="space-y-xs">
                  <h4 className="font-title-md text-body-lg font-bold text-error">Patient: {alert.patient ? `${alert.patient.firstName} ${alert.patient.lastName}` : "Registered Patient"}</h4>
                  <p className="text-sm font-semibold text-on-surface-variant">{alert.description || "No description provided."}</p>
                  <div className="flex gap-md text-xs text-on-surface-variant pt-xs font-mono">
                    <span className="flex items-center gap-xs"><Compass className="w-4 h-4 text-primary" /> Lat: 37.4275° N | Lon: 122.1697° W</span>
                    <span>Received: {new Date(alert.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleResolve(alert.id)}
                  className="bg-error text-white px-lg py-sm rounded-xl font-bold hover:bg-error-container hover:text-on-error-container transition-all flex items-center gap-sm shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Resolve Incident</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Historical/Resolved */}
        <div className="space-y-md pt-lg">
          <h3 className="font-title-md text-title-md font-bold text-on-surface-variant">Resolved History ({pastAlerts.length})</h3>
          <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-on-surface-variant text-label-lg font-bold uppercase">
                <tr>
                  <th className="px-lg py-md">Patient Info</th>
                  <th className="px-lg py-md">Reason</th>
                  <th className="px-lg py-md text-right">Resolved Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-sm">
                {pastAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-lg py-8 text-center text-on-surface-variant">
                      No resolved incidents on record.
                    </td>
                  </tr>
                ) : (
                  pastAlerts.map(alert => (
                    <tr key={alert.id} className="hover:bg-surface-container-lowest transition-colors opacity-60">
                      <td className="px-lg py-md font-bold">
                        {alert.patient ? `${alert.patient.firstName} ${alert.patient.lastName}` : "Registered Patient"}
                      </td>
                      <td className="px-lg py-md text-on-surface-variant">{alert.description}</td>
                      <td className="px-lg py-md text-right text-on-surface-variant font-medium">
                        {new Date(alert.updatedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Right Sidebar map simulator */}
      <aside className="lg:col-span-4 space-y-xl">
        <section className="bg-surface border border-outline-variant p-lg rounded-xl shadow-sm flex flex-col gap-md">
          <h3 className="font-label-lg text-label-lg font-bold text-on-surface">Emergency Response Map</h3>
          <div className="h-64 bg-surface-container-high rounded-xl border border-outline-variant relative flex items-center justify-center overflow-hidden">
            {/* Simulation map grid */}
            <div className="absolute inset-0 bg-blue-50/50 flex items-center justify-center opacity-85">
              <div className="w-64 h-64 border border-dashed border-primary/20 rounded-full animate-ping duration-1000 absolute"></div>
              <div className="w-40 h-40 border border-dashed border-primary/30 rounded-full animate-ping duration-1500 absolute"></div>
              <div className="w-16 h-16 bg-primary/10 border border-primary rounded-full absolute flex items-center justify-center text-primary font-bold">HQ</div>
            </div>
            {activeAlerts.map((e, idx) => (
              <div 
                key={e.id} 
                className="w-4 h-4 bg-error rounded-full absolute animate-ping flex items-center justify-center"
                style={{ top: `${30 + idx * 25}%`, left: `${20 + idx * 30}%` }}
              >
                <div className="w-2.5 h-2.5 bg-error rounded-full"></div>
              </div>
            ))}
          </div>
          <span className="text-[10px] text-on-surface-variant text-center font-medium italic">
            Visualizing dispatch responder paths in 2-mile radius
          </span>
        </section>
      </aside>

    </div>
  );
};

export default EmergencyCommandCenter;
