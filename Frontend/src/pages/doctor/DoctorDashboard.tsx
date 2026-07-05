import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { Loader2 } from 'lucide-react';

const DoctorDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isOnDuty, setIsOnDuty] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const [profileRes, apptsRes] = await Promise.all([
        axiosInstance.get('/doctors/profile'),
        axiosInstance.get('/appointments').catch(() => ({ data: { data: [] } }))
      ]);
      setDoctorProfile(profileRes.data.data);
      setAppointments(apptsRes.data.data || []);
    } catch (err: any) {
      console.error("Doctor dashboard loading error", err);
      setErrorState(err.response?.data?.message || "Failed to establish secure link with clinical records database.");
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyBadge = (reason: string) => {
    const term = reason.toLowerCase();
    if (term.includes('urgent') || term.includes('ecg') || term.includes('severe') || term.includes('pain') || term.includes('shortness')) {
      return (
        <span className="px-sm py-1 bg-error-container text-on-error-container rounded-full text-label-md font-bold">
          • Urgent
        </span>
      );
    }
    return (
      <span className="px-sm py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-md font-bold">
        Routine
      </span>
    );
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-primary">
        <Loader2 className="animate-spin w-12 h-12" />
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-xl bg-background text-on-surface text-center">
        <span className="material-symbols-outlined text-error text-5xl mb-4 animate-bounce">warning</span>
        <h2 className="text-xl font-bold text-error mb-2">Clinical Data Connection Failure</h2>
        <p className="text-on-surface-variant mb-6">{errorState}</p>
        <button 
          onClick={loadDashboardData}
          className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:opacity-90 transition-all cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const doctorLastName = doctorProfile?.lastName || "Practitioner";
  const doctorInitials = doctorProfile?.lastName?.[0] || "D";
  const deptName = doctorProfile?.department?.name || "General Medicine";

  // Filter scheduled appointments for queue
  const scheduledQueue = appointments.filter((a: any) => a.status === 'SCHEDULED');
  const finishedQueue = appointments.filter((a: any) => a.status === 'COMPLETED');

  return (
    <div className="bg-background text-on-surface font-body-lg min-h-screen flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <header className="bg-surface border-b border-outline-variant flex justify-between items-center w-full px-margin-desktop h-16 sticky top-0 z-50">
        <div className="flex items-center gap-md">
          <span className="font-headline-lg text-headline-lg font-bold text-primary">CareHive</span>
          <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded font-label-md text-label-md font-black uppercase tracking-wider">
            {deptName}
          </span>
        </div>
        <div className="flex items-center gap-lg">
          <div className="hidden md:flex gap-md items-center">
            <span className="material-symbols-outlined text-primary cursor-pointer hover:bg-surface-container-high p-sm rounded-full transition-colors">help_outline</span>
            <span className="material-symbols-outlined text-primary cursor-pointer hover:bg-surface-container-high p-sm rounded-full transition-colors">dark_mode</span>
          </div>
          <div className="flex items-center gap-sm bg-surface-container-low px-sm py-xs rounded-lg border border-outline-variant">
            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-sm">
              {doctorInitials}
            </div>
            <span className="text-label-lg font-bold text-on-surface">Dr. {doctorLastName}</span>
          </div>
        </div>
      </header>

      <main className="flex-grow px-margin-desktop py-lg max-w-[1440px] mx-auto w-full">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-xl gap-gutter">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Welcome back, Dr. {doctorLastName}</h1>
            <p className="text-on-surface-variant font-body-md">Clinical Overview &amp; Health Diagnostics ({deptName})</p>
          </div>
          <div className="flex items-center gap-md">
            <div className="flex bg-surface-container-high p-1 rounded-lg border border-outline-variant shadow-sm">
              <button 
                onClick={() => setIsOnDuty(true)}
                className={`px-lg py-sm text-label-lg font-bold transition-all rounded cursor-pointer ${isOnDuty ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                On Duty
              </button>
              <button 
                onClick={() => setIsOnDuty(false)}
                className={`px-lg py-sm text-label-lg font-bold transition-all rounded cursor-pointer ${!isOnDuty ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Off Duty
              </button>
            </div>
            <button className="bg-primary text-on-primary px-lg py-sm rounded shadow-md hover:bg-primary-container transition-all flex items-center gap-sm cursor-pointer">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
              <span className="font-label-lg">Create New Lab Request</span>
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-xl">
          {/* Today's Patients */}
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-sm">
              <span className="text-label-md text-on-surface-variant uppercase tracking-wider">Today's Patients</span>
              <span className="material-symbols-outlined text-primary-container">groups</span>
            </div>
            <div className="text-headline-lg font-bold text-primary mb-xs">{scheduledQueue.length}</div>
            <div className="flex items-center gap-xs text-secondary text-label-md">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>12% increase from yesterday</span>
            </div>
          </div>
          {/* Pending Lab Reviews */}
          <div className="bg-surface-container-lowest border-l-4 border-l-secondary border border-outline-variant p-lg rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-sm">
              <span className="text-label-md text-secondary uppercase tracking-wider">Pending Lab Reviews</span>
              <span className="material-symbols-outlined text-secondary">biotech</span>
            </div>
            <div className="text-headline-lg font-bold text-on-surface mb-xs">0</div>
            <div className="flex items-center gap-xs text-on-surface-variant text-label-md">
              <span>Priority reviews identified</span>
            </div>
          </div>
          {/* Emergency Cases */}
          <div className="bg-error-container border border-error p-lg rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-sm">
              <span className="text-label-md text-on-error-container uppercase tracking-wider font-bold">Emergency Cases</span>
              <span className="material-symbols-outlined text-error">emergency</span>
            </div>
            <div className="text-headline-lg font-bold text-on-error-container mb-xs">0</div>
            <div className="flex items-center gap-xs text-error font-bold text-label-md">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>No emergencies active</span>
            </div>
          </div>
          {/* Avg. Consultation */}
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-sm">
              <span className="text-label-md text-on-surface-variant uppercase tracking-wider">Avg. Consultation</span>
              <span className="material-symbols-outlined text-tertiary">timer</span>
            </div>
            <div className="text-headline-lg font-bold text-on-surface mb-xs">12m</div>
            <div className="flex items-center gap-xs text-primary-container text-label-md">
              <span className="material-symbols-outlined text-sm">show_chart</span>
              <span>Optimization target: 15m</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          {/* Left/Center Column */}
          <div className="lg:col-span-8 space-y-xl">
            {/* Patient Queue */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
              <div className="bg-primary text-on-primary px-lg py-md flex justify-between items-center">
                <h2 className="font-title-lg text-title-lg">Patient Queue ({deptName})</h2>
                <span className="text-label-md bg-on-primary/10 px-sm py-xs rounded">Live Updates</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low text-on-surface-variant text-label-lg uppercase">
                    <tr>
                      <th className="px-lg py-md font-bold">Patient Name</th>
                      <th className="px-lg py-md font-bold">Time</th>
                      <th className="px-lg py-md font-bold">Reason</th>
                      <th className="px-lg py-md font-bold">Urgency</th>
                      <th className="px-lg py-md font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {scheduledQueue.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-lg py-8 text-center text-gray-400">
                          No scheduled consultations in queue.
                        </td>
                      </tr>
                    ) : (
                      scheduledQueue.map((appt) => {
                        const time = new Date(appt.appointmentDate).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        const name = appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : "Registered Patient";
                        return (
                          <tr key={appt.id} className="hover:bg-surface-container-low transition-colors group">
                            <td className="px-lg py-lg font-bold text-on-surface">{name}</td>
                            <td className="px-lg py-lg text-on-surface-variant">{time}</td>
                            <td className="px-lg py-lg text-on-surface-variant">{appt.reason}</td>
                            <td className="px-lg py-lg">{getUrgencyBadge(appt.reason)}</td>
                            <td className="px-lg py-lg text-right">
                              <button className="bg-primary text-on-primary px-md py-xs rounded text-label-lg font-bold shadow hover:bg-primary-container transition-all cursor-pointer">
                                Start Consult
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {/* Historical Queue */}
                    {finishedQueue.map((appt) => {
                      const time = new Date(appt.appointmentDate).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      const name = appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : "Registered Patient";
                      return (
                        <tr key={appt.id} className="hover:bg-surface-container-low transition-colors group opacity-55">
                          <td className="px-lg py-lg font-bold text-on-surface">{name}</td>
                          <td className="px-lg py-lg text-on-surface-variant">{time}</td>
                          <td className="px-lg py-lg text-on-surface-variant">{appt.reason}</td>
                          <td className="px-lg py-lg">
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                              <span className="text-label-md font-bold text-secondary">Completed</span>
                            </div>
                          </td>
                          <td className="px-lg py-lg text-right">
                            <button className="border border-outline text-on-surface-variant px-md py-xs rounded text-label-lg font-bold cursor-default" disabled>
                              View Summary
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Urgent Lab Reviews */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
              <div className="bg-primary text-on-primary px-lg py-md flex justify-between items-center">
                <h2 className="font-title-lg text-title-lg">Urgent Lab Reviews</h2>
                <span className="material-symbols-outlined">notification_important</span>
              </div>
              <div className="p-lg space-y-md">
                <div className="text-center py-6 text-gray-400">
                  No pending critical lab orders require physician sign-off.
                </div>
              </div>
            </section>
          </div>

          {/* Right Column (Sidebar) */}
          <aside className="lg:col-span-4 space-y-xl">
            {/* Upcoming Schedule */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
              <div className="bg-primary text-on-primary px-lg py-md">
                <h2 className="font-title-lg text-title-lg">Upcoming Schedule</h2>
              </div>
              <div className="p-lg space-y-md">
                {scheduledQueue.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No scheduled tasks on clinical calendar.
                  </div>
                ) : (
                  scheduledQueue.slice(0, 3).map((appt) => {
                    const timeStr = new Date(appt.appointmentDate).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    });
                    const [hrs, mins] = timeStr.split(':');
                    const isPm = parseInt(hrs) >= 12;
                    return (
                      <div key={appt.id} className="flex gap-md border-b border-outline-variant pb-md last:border-0 last:pb-0">
                        <div className="text-center min-w-[50px]">
                          <div className="text-label-md text-primary font-bold uppercase">{hrs}:{mins}</div>
                          <div className="text-label-md text-on-surface-variant">{isPm ? 'PM' : 'AM'}</div>
                        </div>
                        <div>
                          <h4 className="font-bold text-on-surface">Consultation: {appt.reason}</h4>
                          <p className="text-label-md text-on-surface-variant">Patient: {appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName[0]}.` : "CareHive Patient"}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Wellness Tracker */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm p-lg">
              <h2 className="font-title-lg text-title-lg text-on-surface mb-lg">Wellness Tracker</h2>
              <div className="flex flex-col items-center">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle className="text-surface-container-high" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="12"></circle>
                    <circle className="text-primary-container circular-progress" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeDasharray="440" strokeDashoffset="110" strokeLinecap="round" strokeWidth="12"></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-headline-lg font-bold text-on-surface">75%</span>
                    <span className="text-label-md text-on-surface-variant">Efficiency</span>
                  </div>
                </div>
                <div className="mt-lg w-full">
                  <div className="flex justify-between text-label-md text-on-surface-variant mb-xs">
                    <span>Shift Intensity</span>
                    <span className="font-bold text-primary">Moderate</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-2/3"></div>
                  </div>
                  <p className="mt-md text-label-md text-on-surface-variant italic text-center">
                    "Optimal focus levels detected. Recommend a 5min breather after next consult."
                  </p>
                </div>
              </div>
            </section>

            {/* Logout / Exit */}
            <button 
              onClick={logout}
              className="w-full py-3 border border-error text-error rounded-lg font-bold text-sm hover:bg-error/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined">logout</span>
              Disconnect from CareHive
            </button>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-outline-variant flex flex-col md:flex-row justify-between items-center w-full px-margin-desktop py-lg mt-auto gap-md">
        <div className="flex flex-col md:flex-row items-center gap-md">
          <span className="font-label-lg text-label-lg font-bold text-on-surface">CareHive Clinical Systems</span>
          <span className="text-label-md text-on-surface-variant">© 2026 CareHive Clinical Systems. All rights reserved.</span>
        </div>
        <div className="flex gap-lg">
          <a className="text-label-md text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy Policy</a>
          <a className="text-label-md text-on-surface-variant hover:text-primary transition-colors" href="#">Terms of Service</a>
          <a className="text-label-md text-on-surface-variant hover:text-primary transition-colors underline" href="#">Support</a>
        </div>
      </footer>
    </div>
  );
};

export default DoctorDashboard;
