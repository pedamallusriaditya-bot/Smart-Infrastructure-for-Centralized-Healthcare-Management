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

  // Report Submission States
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  
  const [glucoseVal, setGlucoseVal] = useState("110");
  const [glucoseRemarks, setGlucoseRemarks] = useState("");
  const [cholesterolVal, setCholesterolVal] = useState("190");
  const [cholesterolRemarks, setCholesterolRemarks] = useState("");
  const [hemoglobinVal, setHemoglobinVal] = useState("14.5");
  const [hemoglobinRemarks, setHemoglobinRemarks] = useState("");
  const [bpVal, setBpVal] = useState("120/80");
  const [bpRemarks, setBpRemarks] = useState("");
  const [plateletsVal, setPlateletsVal] = useState("250000");
  const [plateletsRemarks, setPlateletsRemarks] = useState("");
  const [wbcVal, setWbcVal] = useState("7500");
  const [wbcRemarks, setWbcRemarks] = useState("");
  const [rbcVal, setRbcVal] = useState("4.8");
  const [rbcRemarks, setRbcRemarks] = useState("");
  const [esrVal, setEsrVal] = useState("12");
  const [esrRemarks, setEsrRemarks] = useState("");

  const [customParams, setCustomParams] = useState<any[]>([]);
  const [newParamName, setNewParamName] = useState("");
  const [newParamVal, setNewParamVal] = useState("");
  const [newParamUnit, setNewParamUnit] = useState("");
  const [newParamRange, setNewParamRange] = useState("");
  const [newParamRemarks, setNewParamRemarks] = useState("");

  const [techNotes, setTechNotes] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleAddCustomParam = () => {
    if (!newParamName || !newParamVal) return;
    setCustomParams([...customParams, {
      name: newParamName,
      value: newParamVal,
      unit: newParamUnit,
      range: newParamRange,
      remarks: newParamRemarks
    }]);
    setNewParamName("");
    setNewParamVal("");
    setNewParamUnit("");
    setNewParamRange("");
    setNewParamRemarks("");
  };

  const handleRemoveCustomParam = (index: number) => {
    setCustomParams(customParams.filter((_, i) => i !== index));
  };

  const handleOpenSubmitModal = (rep: any) => {
    setSelectedReport(rep);
    setIsSubmitOpen(true);
  };

  const handleLabReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setSubmitLoading(true);

    const resultsData: Record<string, any> = {
      glucose: { value: glucoseVal, unit: "mg/dL", range: "70-100", remarks: glucoseRemarks || "Normal" },
      cholesterol: { value: cholesterolVal, unit: "mg/dL", range: "<200", remarks: cholesterolRemarks || "Normal" },
      hemoglobin: { value: hemoglobinVal, unit: "g/dL", range: "13.8-17.2", remarks: hemoglobinRemarks || "Normal" },
      bloodPressure: { value: bpVal, unit: "mmHg", range: "<120/80", remarks: bpRemarks || "Normal" },
      plateletCount: { value: plateletsVal, unit: "mcL", range: "150000-450000", remarks: plateletsRemarks || "Normal" },
      wbc: { value: wbcVal, unit: "mcL", range: "4500-11000", remarks: wbcRemarks || "Normal" },
      rbc: { value: rbcVal, unit: "million/mcL", range: "4.5-5.9", remarks: rbcRemarks || "Normal" },
      esr: { value: esrVal, unit: "mm/hr", range: "0-15", remarks: esrRemarks || "Normal" }
    };

    customParams.forEach(p => {
      resultsData[p.name.toLowerCase().replace(/[^a-z0-9]/g, "")] = {
        value: p.value,
        unit: p.unit,
        range: p.range,
        remarks: p.remarks || "Normal"
      };
    });

    const sampleId = `SMP-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      await axiosInstance.post(`/lab/reports/${selectedReport.labOrderId}`, {
        resultsData,
        sampleId,
        technicianNotes: techNotes,
        fileUrl: "https://carehive.med/reports/sample-report.pdf",
        attachments: []
      });
      alert(`Diagnostic report submitted successfully! Generated Sample ID: ${sampleId}`);
      setIsSubmitOpen(false);
      setTechNotes("");
      setCustomParams([]);
      loadLabData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to submit laboratory report: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitLoading(false);
    }
  };

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
                              {rep.labOrder?.status === 'ORDERED' || rep.labOrder?.status === 'PROCESSING' ? (
                                <button 
                                  onClick={() => handleOpenSubmitModal(rep)}
                                  className="px-lg py-xs bg-primary text-on-primary rounded font-label-lg text-label-lg hover:opacity-90 transition-all cursor-pointer shadow-sm"
                                >
                                  Start Test
                                </button>
                              ) : (
                                <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 font-bold inline-flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">check_circle</span>
                                  Completed
                                </span>
                              )}
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

      {/* Lab Report Submission Modal */}
      {isSubmitOpen && selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-md text-on-surface animate-in fade-in duration-200">
          <div className="bg-white rounded-lg w-full max-w-2xl p-xl shadow-2xl relative text-on-surface max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-xl border-b border-outline-variant pb-md">
              <h2 className="text-2xl font-bold text-[#00488d] flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl">science</span>
                Input Diagnostic Results
              </h2>
              <button 
                className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:bg-slate-100 p-1 rounded-full" 
                onClick={() => setIsSubmitOpen(false)}
              >
                close
              </button>
            </div>
            
            <form onSubmit={handleLabReportSubmit} className="space-y-lg text-left">
              <div className="grid grid-cols-2 gap-md bg-slate-50 p-md rounded-lg text-sm mb-md">
                <div>
                  <span className="font-semibold text-on-surface-variant">Patient:</span> {selectedReport.labOrder?.patient ? `${selectedReport.labOrder.patient.firstName} ${selectedReport.labOrder.patient.lastName}` : "CareHive Patient"}
                </div>
                <div>
                  <span className="font-semibold text-on-surface-variant">Requested Test:</span> {selectedReport.labOrder?.testName || "Diagnostic Analysis"}
                </div>
                <div>
                  <span className="font-semibold text-on-surface-variant">Ordering Physician:</span> {selectedReport.labOrder?.doctor ? `Dr. ${selectedReport.labOrder.doctor.firstName} ${selectedReport.labOrder.doctor.lastName}` : "Staff Doctor"}
                </div>
                <div>
                  <span className="font-semibold text-on-surface-variant">Priority:</span> {selectedReport.labOrder?.priority || "ROUTINE"}
                </div>
              </div>

              <h3 className="font-bold text-[#00488d] text-lg border-b border-slate-100 pb-xs">Standard Diagnostic Parameters</h3>
              
              <div className="grid grid-cols-2 gap-lg">
                {/* Glucose */}
                <div className="space-y-xs">
                  <label className="text-sm font-bold text-on-surface-variant flex justify-between">
                    <span>Glucose (Fasting)</span>
                    <span className="text-xs text-gray-400 font-normal">mg/dL [70 - 100]</span>
                  </label>
                  <input type="text" value={glucoseVal} onChange={(e) => setGlucoseVal(e.target.value)} className="w-full border border-outline rounded p-sm text-sm outline-none text-on-surface bg-white" required />
                  <input type="text" value={glucoseRemarks} onChange={(e) => setGlucoseRemarks(e.target.value)} placeholder="Remarks (e.g. Normal)" className="w-full border border-outline rounded p-xs text-xs outline-none text-on-surface bg-white" />
                </div>

                {/* Cholesterol */}
                <div className="space-y-xs">
                  <label className="text-sm font-bold text-on-surface-variant flex justify-between">
                    <span>Total Cholesterol</span>
                    <span className="text-xs text-gray-400 font-normal">mg/dL [&lt; 200]</span>
                  </label>
                  <input type="text" value={cholesterolVal} onChange={(e) => setCholesterolVal(e.target.value)} className="w-full border border-outline rounded p-sm text-sm outline-none text-on-surface bg-white" required />
                  <input type="text" value={cholesterolRemarks} onChange={(e) => setCholesterolRemarks(e.target.value)} placeholder="Remarks" className="w-full border border-outline rounded p-xs text-xs outline-none text-on-surface bg-white" />
                </div>

                {/* Hemoglobin */}
                <div className="space-y-xs">
                  <label className="text-sm font-bold text-on-surface-variant flex justify-between">
                    <span>Hemoglobin</span>
                    <span className="text-xs text-gray-400 font-normal">g/dL [13.8 - 17.2]</span>
                  </label>
                  <input type="text" value={hemoglobinVal} onChange={(e) => setHemoglobinVal(e.target.value)} className="w-full border border-outline rounded p-sm text-sm outline-none text-on-surface bg-white" required />
                  <input type="text" value={hemoglobinRemarks} onChange={(e) => setHemoglobinRemarks(e.target.value)} placeholder="Remarks" className="w-full border border-outline rounded p-xs text-xs outline-none text-on-surface bg-white" />
                </div>

                {/* Blood Pressure */}
                <div className="space-y-xs">
                  <label className="text-sm font-bold text-on-surface-variant flex justify-between">
                    <span>Blood Pressure</span>
                    <span className="text-xs text-gray-400 font-normal">mmHg [&lt; 120/80]</span>
                  </label>
                  <input type="text" value={bpVal} onChange={(e) => setBpVal(e.target.value)} className="w-full border border-outline rounded p-sm text-sm outline-none text-on-surface bg-white" required />
                  <input type="text" value={bpRemarks} onChange={(e) => setBpRemarks(e.target.value)} placeholder="Remarks" className="w-full border border-outline rounded p-xs text-xs outline-none text-on-surface bg-white" />
                </div>

                {/* Platelets */}
                <div className="space-y-xs">
                  <label className="text-sm font-bold text-on-surface-variant flex justify-between">
                    <span>Platelet Count</span>
                    <span className="text-xs text-gray-400 font-normal">mcL [150k - 450k]</span>
                  </label>
                  <input type="text" value={plateletsVal} onChange={(e) => setPlateletsVal(e.target.value)} className="w-full border border-outline rounded p-sm text-sm outline-none text-on-surface bg-white" required />
                  <input type="text" value={plateletsRemarks} onChange={(e) => setPlateletsRemarks(e.target.value)} placeholder="Remarks" className="w-full border border-outline rounded p-xs text-xs outline-none text-on-surface bg-white" />
                </div>

                {/* WBC */}
                <div className="space-y-xs">
                  <label className="text-sm font-bold text-on-surface-variant flex justify-between">
                    <span>WBC Count</span>
                    <span className="text-xs text-gray-400 font-normal">mcL [4.5k - 11k]</span>
                  </label>
                  <input type="text" value={wbcVal} onChange={(e) => setWbcVal(e.target.value)} className="w-full border border-outline rounded p-sm text-sm outline-none text-on-surface bg-white" required />
                  <input type="text" value={wbcRemarks} onChange={(e) => setWbcRemarks(e.target.value)} placeholder="Remarks" className="w-full border border-outline rounded p-xs text-xs outline-none text-on-surface bg-white" />
                </div>

                {/* RBC */}
                <div className="space-y-xs">
                  <label className="text-sm font-bold text-on-surface-variant flex justify-between">
                    <span>RBC Count</span>
                    <span className="text-xs text-gray-400 font-normal">million/mcL [4.5 - 5.9]</span>
                  </label>
                  <input type="text" value={rbcVal} onChange={(e) => setRbcVal(e.target.value)} className="w-full border border-outline rounded p-sm text-sm outline-none text-on-surface bg-white" required />
                  <input type="text" value={rbcRemarks} onChange={(e) => setRbcRemarks(e.target.value)} placeholder="Remarks" className="w-full border border-outline rounded p-xs text-xs outline-none text-on-surface bg-white" />
                </div>

                {/* ESR */}
                <div className="space-y-xs">
                  <label className="text-sm font-bold text-on-surface-variant flex justify-between">
                    <span>ESR (Sed Rate)</span>
                    <span className="text-xs text-gray-400 font-normal">mm/hr [0 - 15]</span>
                  </label>
                  <input type="text" value={esrVal} onChange={(e) => setEsrVal(e.target.value)} className="w-full border border-outline rounded p-sm text-sm outline-none text-on-surface bg-white" required />
                  <input type="text" value={esrRemarks} onChange={(e) => setEsrRemarks(e.target.value)} placeholder="Remarks" className="w-full border border-outline rounded p-xs text-xs outline-none text-on-surface bg-white" />
                </div>
              </div>

              {/* Custom Parameters Section */}
              <h3 className="font-bold text-[#00488d] text-lg border-b border-slate-100 pt-md pb-xs">Custom Diagnostic Parameters</h3>
              
              {customParams.length > 0 && (
                <div className="bg-slate-50 p-sm rounded-lg divide-y divide-outline-variant text-xs">
                  {customParams.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center py-xs font-mono">
                      <span>{p.name}: {p.value} {p.unit} ({p.range}) - {p.remarks}</span>
                      <button type="button" onClick={() => handleRemoveCustomParam(idx)} className="text-red-600 hover:text-red-800 font-bold px-1">Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-5 gap-xs items-end">
                <div className="col-span-1 space-y-1">
                  <span className="text-[10px] font-bold text-on-surface-variant">Name</span>
                  <input type="text" placeholder="e.g. Sodium" value={newParamName} onChange={(e) => setNewParamName(e.target.value)} className="w-full border border-outline rounded p-xs text-xs bg-white text-on-surface" />
                </div>
                <div className="col-span-1 space-y-1">
                  <span className="text-[10px] font-bold text-on-surface-variant">Value</span>
                  <input type="text" placeholder="e.g. 140" value={newParamVal} onChange={(e) => setNewParamVal(e.target.value)} className="w-full border border-outline rounded p-xs text-xs bg-white text-on-surface" />
                </div>
                <div className="col-span-1 space-y-1">
                  <span className="text-[10px] font-bold text-on-surface-variant">Unit</span>
                  <input type="text" placeholder="e.g. mEq/L" value={newParamUnit} onChange={(e) => setNewParamUnit(e.target.value)} className="w-full border border-outline rounded p-xs text-xs bg-white text-on-surface" />
                </div>
                <div className="col-span-1 space-y-1">
                  <span className="text-[10px] font-bold text-on-surface-variant">Range</span>
                  <input type="text" placeholder="e.g. 135-145" value={newParamRange} onChange={(e) => setNewParamRange(e.target.value)} className="w-full border border-outline rounded p-xs text-xs bg-white text-on-surface" />
                </div>
                <button type="button" onClick={handleAddCustomParam} className="col-span-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-on-surface rounded text-xs font-bold transition-colors cursor-pointer text-center">
                  Add Param
                </button>
              </div>

              <div className="space-y-xs pt-md">
                <label className="text-sm font-bold text-on-surface-variant">Technician Notes</label>
                <textarea 
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  placeholder="Centrifuge observations, sample quality details..."
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white h-20 resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={submitLoading}
                className="w-full bg-[#00488d] hover:bg-[#00366b] text-white py-lg rounded-lg font-bold shadow transition-all flex items-center justify-center gap-sm disabled:opacity-50 cursor-pointer"
              >
                {submitLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <span className="material-symbols-outlined">publish</span>
                    Submit Laboratory Report
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LISDashboard;
