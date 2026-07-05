import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  getPatientProfile, 
  getAITimeline, 
  getLabReports, 
  getPatientQR 
} from '../../api/patient.api';
import { Loader2 } from 'lucide-react';

const MyRecords: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<{ summary: string, events: any[] }>({ summary: "", events: [] });
  const [labReportsList, setLabReportsList] = useState<any[]>([]);
  
  // QR Modal & Expiration State
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrTimestamp, setQrTimestamp] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [qrLoading, setQrLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  // Update current time to check QR expiration dynamically
  useEffect(() => {
    if (!qrTimestamp) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, [qrTimestamp]);

  const loadAllData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const prof = await getPatientProfile();
      setProfile(prof);

      const [timeline, labs, qrData] = await Promise.all([
        getAITimeline(prof.id).catch(() => ({ summary: "Timeline generation failed", events: [] })),
        getLabReports().catch(() => ({ reports: [] })),
        getPatientQR().catch(() => null)
      ]);

      setTimelineData(timeline);
      setLabReportsList(labs.reports || []);
      if (qrData) {
        setQrCodeData(qrData.qrCode);
        setQrTimestamp(Date.now());
        setCurrentTime(Date.now());
      }
    } catch (err: any) {
      console.error("MyRecords data load error", err);
      setErrorState(err.response?.data?.message || "Failed to establish secure link with clinical records database.");
    } finally {
      setLoading(false);
    }
  };

  const regenerateQR = async () => {
    setQrLoading(true);
    try {
      const qrData = await getPatientQR();
      if (qrData) {
        setQrCodeData(qrData.qrCode);
        setQrTimestamp(Date.now());
        setCurrentTime(Date.now());
      }
    } catch (err) {
      console.error("Failed to regenerate QR", err);
    } finally {
      setQrLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="record-card p-xl bg-error/5 border-error/20 text-center max-w-xl mx-auto my-12 text-on-surface">
        <span className="material-symbols-outlined text-error text-5xl mb-4 animate-bounce">warning</span>
        <h2 className="text-xl font-bold text-error mb-2">Clinical Data Connection Failure</h2>
        <p className="text-on-surface-variant mb-6">{errorState}</p>
        <button 
          onClick={loadAllData}
          className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:opacity-90 transition-all cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Filter timeline events in memory
  const timelineEvents = timelineData.events || [];
  const filteredEvents = timelineEvents.filter(ev => {
    const term = searchQuery.toLowerCase();
    const reasonMatch = ev.reason?.toLowerCase().includes(term);
    const testNameMatch = ev.testName?.toLowerCase().includes(term);
    const diagnosisMatch = ev.diagnosis?.toLowerCase().includes(term);
    const notesMatch = ev.notes?.toLowerCase().includes(term);
    return reasonMatch || testNameMatch || diagnosisMatch || notesMatch;
  });

  // Expiry check: 15 minutes = 900,000 milliseconds
  const isQrExpired = qrTimestamp ? (currentTime - qrTimestamp > 15 * 60 * 1000) : false;
  const qrTimeRemaining = qrTimestamp ? Math.max(0, 15 * 60 - Math.floor((currentTime - qrTimestamp) / 1000)) : 0;
  const qrMin = Math.floor(qrTimeRemaining / 60);
  const qrSec = qrTimeRemaining % 60;

  return (
    <div className="space-y-xl text-on-surface">
      
      {/* Patient Health Summary Header */}
      <section className="mb-xl">
        <div className="record-card p-lg flex flex-col md:flex-row gap-lg items-start md:items-center justify-between bg-gradient-to-r from-white to-surface-container-low">
          <div className="flex items-center gap-lg">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-sm overflow-hidden flex items-center justify-center bg-primary-container text-on-primary-container font-black text-xl">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-secondary rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>
            </div>
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">{user?.firstName} {user?.lastName}</h1>
              <div className="flex flex-wrap gap-md mt-xs font-label-md text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">cake</span> 
                  DOB: {profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : "--"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">fingerprint</span> 
                  ID: {profile?.id?.substring(0, 8) || "--"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">bloodtype</span> 
                  Type: {profile?.bloodGroup || "Pending"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-md w-full md:w-auto">
            <div className="flex-1 md:flex-none record-card bg-surface-container-lowest p-md border-primary/10 flex flex-col items-center min-w-[80px]">
              <span className="text-label-md text-on-surface-variant uppercase tracking-wider">Weight</span>
              <span className="text-title-lg font-bold text-primary">N/A</span>
            </div>
            <div className="flex-1 md:flex-none record-card bg-surface-container-lowest p-md border-primary/10 flex flex-col items-center min-w-[80px]">
              <span className="text-label-md text-on-surface-variant uppercase tracking-wider">Height</span>
              <span className="text-title-lg font-bold text-primary">N/A</span>
            </div>
            <div className="flex-1 md:flex-none record-card bg-surface-container-lowest p-md border-primary/10 flex flex-col items-center min-w-[80px]">
              <span className="text-label-md text-on-surface-variant uppercase tracking-wider">BMI</span>
              <span className="text-title-lg font-bold text-secondary">N/A</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-start">
        
        {/* Left Column: Primary Records & Timeline */}
        <div className="lg:col-span-8 space-y-xl">
          
          {/* Medical Timeline */}
          <section>
            <div className="flex items-center justify-between mb-md">
              <h2 className="font-title-lg text-title-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                Medical Timeline
              </h2>
              <div className="flex items-center gap-sm">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search records..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-surface border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all w-48 md:w-64"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[20px]">
                    search
                  </span>
                </div>
                <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant">filter_list</span>
                </button>
              </div>
            </div>

            <div className="space-y-md">
              {filteredEvents.length === 0 ? (
                <div className="record-card p-lg text-center text-gray-400">
                  {searchQuery ? "No matching records found." : "No clinical history timeline recorded on file."}
                </div>
              ) : (
                filteredEvents.map((event: any, i: number) => {
                  if (event.entryType === 'APPOINTMENT') {
                    return (
                      <div key={i} className="record-card p-md flex gap-lg bg-white">
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-10 h-10 rounded-full bg-primary-container/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined">stethoscope</span>
                          </div>
                          <div className="w-px h-full bg-outline-variant my-2"></div>
                        </div>
                        <div className="flex-grow pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-body-lg font-semibold">Consultation: {event.reason || "General Checkup"}</h3>
                              <p className="text-label-md text-on-surface-variant">
                                Dr. {event.doctor?.firstName || "Clinical"} {event.doctor?.lastName || "Staff"} • {formatDate(event.date)}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-medium uppercase">{event.status}</span>
                          </div>
                          <p className="mt-2 text-body-md text-on-surface leading-relaxed">
                            {event.notes || "Appointment scheduled successfully."}
                          </p>
                        </div>
                      </div>
                    );
                  } else if (event.entryType === 'LAB_ORDER') {
                    const labReport = labReportsList.find(rep => rep.labOrderId === event.id);
                    return (
                      <div key={i} className="record-card p-md flex gap-lg bg-surface-container-lowest">
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-10 h-10 rounded-full bg-secondary-container/20 text-secondary flex items-center justify-center">
                            <span className="material-symbols-outlined">biotech</span>
                          </div>
                          <div className="w-px h-full bg-outline-variant my-2"></div>
                        </div>
                        <div className="flex-grow pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-body-lg font-semibold">{event.testName || "Laboratory Analysis"}</h3>
                              <p className="text-label-md text-on-surface-variant">
                                LIS Lab Order • {formatDate(event.date)}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-medium">
                              {event.status}
                            </span>
                          </div>
                          {labReport?.aiSummary && (
                            <div className="mt-3 p-lg bg-primary-fixed/5 border border-primary-fixed rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                                <span className="text-label-lg font-bold text-primary uppercase tracking-tighter">AI Lab Report Summary</span>
                              </div>
                              <p className="text-body-md text-on-primary-fixed-variant leading-relaxed font-medium italic">
                                "{labReport.aiSummary}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={i} className="record-card p-md flex gap-lg bg-white">
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-10 h-10 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center">
                            <span className="material-symbols-outlined">clinical_notes</span>
                          </div>
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-body-lg font-semibold">{event.diagnosis || "Medical Record Update"}</h3>
                              <p className="text-label-md text-on-surface-variant">
                                Clinical Chart Record • {formatDate(event.date)}
                              </p>
                            </div>
                          </div>
                          <p className="mt-2 text-body-md text-on-surface-variant leading-relaxed">
                            {event.notes || "No clinical notes attached."}
                          </p>
                        </div>
                      </div>
                    );
                  }
                })
              )}
            </div>
          </section>

          {/* Medications Grid */}
          <section>
            <div className="flex items-center justify-between mb-md">
              <h2 className="font-title-lg text-title-lg flex items-center gap-2 font-semibold">
                <span className="material-symbols-outlined text-primary">medication</span>
                Current Medications
              </h2>
            </div>
            <div className="record-card p-lg text-center text-gray-400 bg-white">
              <span className="material-symbols-outlined text-4xl block mb-2">medication_liquid</span>
              No active prescriptions on file.
              <p className="text-[10px] text-gray-400/80 mt-1">Prescription tracking is unavailable in this clinical portal.</p>
            </div>
          </section>
        </div>

        {/* Right Column: Sidebar Modules */}
        <div className="lg:col-span-4 space-y-xl">
          
          {/* Rapid Access QR Code */}
          <section className="record-card bg-primary text-white p-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-white">emergency_home</span>
                <h2 className="font-label-lg font-bold uppercase tracking-widest">Medical ID Card</h2>
              </div>
              
              <div className="bg-white p-3 rounded-xl w-32 h-32 mx-auto shadow-lg mb-4 flex items-center justify-center text-on-surface">
                {qrLoading ? (
                  <Loader2 className="animate-spin text-primary" size={24} />
                ) : isQrExpired ? (
                  <div className="w-full h-full bg-slate-50 border border-error/20 p-2 rounded-lg flex flex-col items-center justify-center text-center gap-xs">
                    <span className="material-symbols-outlined text-error text-[20px]">gpp_maybe</span>
                    <button 
                      onClick={regenerateQR}
                      className="px-2 py-0.5 bg-primary text-white text-[9px] font-bold rounded hover:opacity-90 cursor-pointer"
                    >
                      Regenerate
                    </button>
                  </div>
                ) : qrCodeData ? (
                  <img className="w-full h-full object-contain" alt="Medical ID QR Code" src={qrCodeData} />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl">qr_code_2</span>
                  </div>
                )}
              </div>

              {!isQrExpired && qrTimestamp && (
                <p className="text-center text-[10px] font-bold opacity-80 animate-pulse mb-3">
                  Expires in: {qrMin}:{qrSec < 10 ? `0${qrSec}` : qrSec}
                </p>
              )}

              <p className="text-center text-label-md opacity-90 mb-2 px-4">
                Emergency responders can scan this to access your critical health data.
              </p>
            </div>
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          </section>

          {/* Diagnoses & Conditions */}
          <section className="record-card p-lg bg-white">
            <h2 className="font-title-lg text-on-surface mb-lg flex items-center gap-2 font-semibold">
              <span className="material-symbols-outlined text-primary">clinical_notes</span>
              Active Diagnoses
            </h2>
            <div className="text-center py-6 text-sm text-gray-400 italic">
              No active chronic conditions on file.
            </div>
          </section>

          {/* Allergies & Emergency Contact */}
          <section className="record-card p-lg border-2 border-error/20 bg-error/5">
            <h2 className="font-title-lg text-error mb-lg flex items-center gap-2 font-semibold">
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                warning
              </span>
              Critical Information
            </h2>
            <div className="space-y-lg">
              <div>
                <p className="text-label-md font-bold text-error uppercase tracking-wider mb-2">Allergies</p>
                <div className="text-sm text-gray-400 italic">
                  None recorded.
                </div>
              </div>
              <div>
                <p className="text-label-md font-bold text-error uppercase tracking-wider mb-2">Emergency Contact</p>
                <div className="p-md bg-white border border-error/10 rounded-lg text-on-surface">
                  <p className="font-body-lg font-bold text-on-surface">Secondary Medical Contact</p>
                  <p className="text-label-md text-on-surface-variant">Primary Registered Phone</p>
                  <p className="text-body-md font-medium text-primary mt-1">{profile?.phone || "N/A"}</p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default MyRecords;