import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { Loader2 } from 'lucide-react';

const LISDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [reportsList, setReportsList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadLabData();
  }, []);

  const loadLabData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const hospitalId = localStorage.getItem('hospitalId');
      const response = await axiosInstance.get('/lab/reports', {
        params: { hospitalId }
      });
      setReportsList(response.data.data.reports || []);
    } catch (err: any) {
      console.error(err);
      setErrorState(err.response?.data?.message || "Failed to establish secure link with Laboratory Information System.");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const p = priority.toUpperCase();
    if (p === 'HIGH' || p === 'STAT' || p === 'CRITICAL') {
      return (
        <span className="px-sm py-1 bg-error-container text-on-error-container rounded-lg font-label-md text-label-md border border-error/20 inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span> STAT
        </span>
      );
    } else if (p === 'URGENT') {
      return (
        <span className="px-sm py-1 bg-tertiary-container text-on-tertiary-container rounded-lg font-label-md text-label-md border border-tertiary/20 inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-tertiary"></span> Urgent
        </span>
      );
    }
    return (
      <span className="px-sm py-1 bg-secondary-container text-on-secondary-container rounded-lg font-label-md text-label-md border border-secondary/20 inline-flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-secondary"></span> Routine
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
        <h2 className="text-xl font-bold text-error mb-2">LIS Connection Failure</h2>
        <p className="text-on-surface-variant mb-6">{errorState}</p>
        <button 
          onClick={loadLabData}
          className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:opacity-90 transition-all cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Filter reports list based on search bar
  const filteredReports = reportsList.filter(rep => {
    const term = searchQuery.toLowerCase();
    const patientName = rep.labOrder?.patient ? `${rep.labOrder.patient.firstName} ${rep.labOrder.patient.lastName}`.toLowerCase() : "";
    const testName = rep.labOrder?.testName?.toLowerCase() || "";
    const doctorName = rep.labOrder?.doctor ? `${rep.labOrder.doctor.firstName} ${rep.labOrder.doctor.lastName}`.toLowerCase() : "";
    return patientName.includes(term) || testName.includes(term) || doctorName.includes(term);
  });

  const pendingTestsCount = reportsList.filter(r => r.labOrder?.status === 'ORDERED' || r.labOrder?.status === 'PROCESSING').length;
  const criticalCount = reportsList.filter(r => r.isAbnormal).length;
  const activeSamplesCount = reportsList.filter(r => r.labOrder?.status === 'PROCESSING').length;

  return (
    <div className="bg-background text-on-surface flex h-screen overflow-hidden font-sans">
      
      {/* SideNavBar */}
      <aside className="w-64 h-screen bg-surface border-r border-outline-variant flex flex-col shrink-0">
        <div className="p-lg flex flex-col gap-xs">
          <div className="flex items-center gap-md">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-title-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                science
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-display-lg text-title-lg font-bold text-primary leading-tight">CareHive</span>
              <span className="font-label-md text-label-md text-on-surface-variant font-bold">Lab Technician</span>
            </div>
          </div>
        </div>

        <nav className="flex-grow px-md py-lg flex flex-col gap-sm">
          <a href="#" className="flex items-center gap-md px-md py-3 bg-primary text-on-primary rounded-lg transition-all shadow-sm">
            <span className="material-symbols-outlined">groups</span>
            <span className="font-label-lg text-label-lg font-bold">Lab Orders</span>
          </a>
          
          <button 
            onClick={logout}
            className="flex items-center gap-md px-md py-3 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all text-left w-full cursor-pointer"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-lg text-label-lg font-bold">Logout</span>
          </button>
        </nav>

        <div className="p-lg border-t border-outline-variant flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <div className="flex items-center gap-sm text-primary">
              <span className="material-symbols-outlined text-title-lg">hub</span>
              <span className="font-title-lg text-body-lg font-bold">CareHive LIS</span>
            </div>
            <span className="text-[10px] text-on-surface-variant font-medium">AI-Powered Diagnostics</span>
          </div>
          <div className="flex flex-col text-[10px] text-on-surface-variant">
            <span>© 2026 CareHive Systems</span>
            <span>All rights reserved.</span>
          </div>
        </div>
      </aside>

      <div className="flex-grow flex flex-col overflow-hidden">
        
        {/* TopNavBar */}
        <header className="flex justify-between items-center w-full px-margin-desktop h-16 bg-surface border-b border-outline-variant shadow-sm shrink-0">
          <div className="flex items-center gap-xl">
            <span className="font-display-lg text-headline-lg-mobile font-extrabold text-primary">CareHive</span>
            <div className="relative w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-container-high border-none rounded-full font-body-md text-body-md focus:ring-2 focus:ring-primary outline-none" 
                placeholder="Search samples, patients, or tests..." 
              />
            </div>
          </div>
          <div className="flex items-center gap-md">
            <button className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            </button>
            <button className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">settings</span>
            </button>
            <div className="w-10 h-10 rounded-full border border-outline-variant bg-surface-container-low flex items-center justify-center font-bold text-sm text-primary">
              TECH
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow overflow-y-auto p-margin-desktop bg-background flex flex-col gap-lg">
          {/* Top Row: KPI Cards */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
            <div className="bg-surface p-lg rounded-lg border border-outline-variant shadow-sm flex flex-col gap-xs">
              <div className="flex justify-between items-center">
                <span className="font-label-lg text-label-lg text-on-surface-variant">Pending Tests</span>
                <span className="material-symbols-outlined text-primary">pending_actions</span>
              </div>
              <span className="font-headline-lg text-headline-lg text-primary">{pendingTestsCount}</span>
              <span className="font-label-md text-label-md text-secondary">Awaiting result input</span>
            </div>
            
            <div className="bg-surface p-lg rounded-lg border border-outline-variant shadow-sm flex flex-col gap-xs">
              <div className="flex justify-between items-center">
                <span className="font-label-lg text-label-lg text-on-surface-variant">Critical Results</span>
                <span className="material-symbols-outlined text-error">priority_high</span>
              </div>
              <span className="font-headline-lg text-headline-lg text-error">{criticalCount}</span>
              <span className="font-label-md text-label-md text-error">Requires immediate action</span>
            </div>
            
            <div className="bg-surface p-lg rounded-lg border border-outline-variant shadow-sm flex flex-col gap-xs">
              <div className="flex justify-between items-center">
                <span className="font-label-lg text-label-lg text-on-surface-variant">Active Samples</span>
                <span className="material-symbols-outlined text-tertiary">science</span>
              </div>
              <span className="font-headline-lg text-headline-lg text-tertiary">{activeSamplesCount}</span>
              <span className="font-label-md text-label-md text-on-surface-variant">Processing in centrifuge</span>
            </div>
            
            <div className="bg-surface p-lg rounded-lg border border-outline-variant shadow-sm flex flex-col gap-xs">
              <div className="flex justify-between items-center">
                <span className="font-label-lg text-label-lg text-on-surface-variant">Equipment Status</span>
                <span className="material-symbols-outlined text-secondary">check_circle</span>
              </div>
              <span className="font-headline-lg text-headline-lg text-secondary">94%</span>
              <span className="font-label-md text-label-md text-on-surface-variant">Centrifuges online</span>
            </div>
          </section>

          {/* Main Layout: Table + Sidebar */}
          <div className="grid grid-cols-12 gap-lg flex-grow h-full min-h-0">
            {/* Main Section: Pending Requests Table */}
            <section className="col-span-12 lg:col-span-8 bg-surface rounded-lg border border-outline-variant shadow-sm overflow-hidden flex flex-col">
              <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
                <h2 className="font-title-lg text-title-lg font-bold text-on-surface">Pending Requests</h2>
                <div className="flex gap-sm">
                  <button className="px-md py-xs font-label-lg text-label-lg border border-outline-variant rounded-full hover:bg-surface-container-low transition-colors">Filter</button>
                </div>
              </div>
              
              <div className="flex-grow overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-surface-container-low">
                    <tr>
                      <th className="px-lg py-md font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">Patient</th>
                      <th className="px-lg py-md font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">Doctor</th>
                      <th className="px-lg py-md font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">Test Type</th>
                      <th className="px-lg py-md font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">Priority</th>
                      <th className="px-lg py-md font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">Requested</th>
                      <th className="px-lg py-md font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider border-b border-outline-wider border-b border-outline-variant">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-lg py-8 text-center text-gray-400">
                          No pending diagnostic test requests found.
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map(rep => {
                        const patName = rep.labOrder?.patient ? `${rep.labOrder.patient.firstName} ${rep.labOrder.patient.lastName}` : "CareHive Patient";
                        const docName = rep.labOrder?.doctor ? `Dr. ${rep.labOrder.doctor.firstName} ${rep.labOrder.doctor.lastName}` : "Staff Doctor";
                        const testName = rep.labOrder?.testName || "Diagnostic Analysis";
                        const priority = rep.labOrder?.priority || "ROUTINE";
                        const requestTime = new Date(rep.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <tr key={rep.id} className="hover:bg-surface-container-lowest transition-colors">
                            <td className="px-lg py-md">
                              <div className="flex flex-col">
                                <span className="font-body-lg text-body-lg font-semibold">{patName}</span>
                                <span className="font-label-md text-label-md text-on-surface-variant">ID: {rep.labOrder?.patientId?.substring(0, 8) || "N/A"}</span>
                              </div>
                            </td>
                            <td className="px-lg py-md font-body-md text-body-md">{docName}</td>
                            <td className="px-lg py-md font-body-md text-body-md">{testName}</td>
                            <td className="px-lg py-md">{getPriorityBadge(priority)}</td>
                            <td className="px-lg py-md font-body-md text-body-md">{requestTime}</td>
                            <td className="px-lg py-md">
                              <button className="px-lg py-xs bg-primary text-on-primary rounded font-label-lg text-label-lg hover:bg-primary-container transition-colors cursor-pointer">
                                Start Test
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Right Sidebar Sections */}
            <aside className="col-span-12 lg:col-span-4 flex flex-col gap-lg min-h-0 overflow-y-auto pr-xs">
              {/* Analytics: Tests Per Day */}
              <section className="bg-surface p-lg rounded-lg border border-outline-variant shadow-sm">
                <div className="flex justify-between items-center mb-md">
                  <h3 className="font-label-lg text-label-lg font-bold text-on-surface">Tests Throughput</h3>
                  <span className="font-label-md text-label-md text-on-surface-variant">Last 7 Days</span>
                </div>
                <div className="h-32 w-full flex items-end gap-2 relative">
                  <svg className="w-full h-full" viewBox="0 0 200 60">
                    <path className="chart-line stroke-[#00488d]" d="M0 50 Q 33 45, 66 30 T 132 40 T 200 10" fill="none" strokeWidth="2"></path>
                    <circle cx="200" cy="10" fill="#00488d" r="3"></circle>
                  </svg>
                </div>
                <div className="flex justify-between mt-xs px-1 text-[10px] text-on-surface-variant font-medium">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </section>

              {/* Equipment Status Grid */}
              <section className="bg-surface p-lg rounded-lg border border-outline-variant shadow-sm">
                <h3 className="font-label-lg text-label-lg font-bold text-on-surface mb-md">Equipment Status</h3>
                <div className="grid grid-cols-2 gap-sm">
                  <div className="p-sm bg-surface-container-low rounded-lg border border-outline-variant flex items-center gap-sm">
                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md font-bold">Hematology Analyzer</span>
                      <span className="text-[10px] text-on-surface-variant">Online - Idle</span>
                    </div>
                  </div>
                  <div className="p-sm bg-surface-container-low rounded-lg border border-outline-variant flex items-center gap-sm">
                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md font-bold">Centrifuge X1</span>
                      <span className="text-[10px] text-on-surface-variant">Online - Running</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Critical Results Panel */}
              <section className="bg-error-container/10 p-lg rounded-lg border-2 border-error/20 shadow-sm flex flex-col gap-md">
                <div className="flex items-center gap-sm text-error font-semibold">
                  <span className="material-symbols-outlined">warning</span>
                  <h3 className="font-label-lg text-label-lg font-bold">Urgent Flags</h3>
                </div>
                <div className="flex flex-col gap-sm text-on-surface">
                  {criticalCount === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-400 italic">
                      No abnormal lab readings detected.
                    </div>
                  ) : (
                    reportsList.filter(r => r.isAbnormal).slice(0, 2).map(rep => {
                      const abnormalVal = rep.resultsData?.glucose || rep.resultsData?.["Glucose (Fasting)"] || "Abnormal";
                      const abnormalLabel = "Glucose (Fasting)";
                      const patName = rep.labOrder?.patient ? `${rep.labOrder.patient.firstName} ${rep.labOrder.patient.lastName}` : "CareHive Patient";

                      return (
                        <div key={rep.id} className="p-md bg-white border-l-4 border-error rounded shadow-sm flex flex-col gap-xs">
                          <div className="flex justify-between items-start">
                            <span className="font-body-md text-body-md font-bold">{abnormalLabel}</span>
                            <span className="font-label-lg text-label-lg text-error font-bold">{abnormalVal}</span>
                          </div>
                          <span className="font-label-md text-label-md text-on-surface-variant">Patient: {patName}</span>
                          <button className="mt-xs w-full py-2 bg-error text-on-error rounded font-label-lg text-label-lg hover:opacity-90 transition-opacity cursor-pointer">
                            Notify Attending Doctor
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>

    </div>
  );
};

export default LISDashboard;
