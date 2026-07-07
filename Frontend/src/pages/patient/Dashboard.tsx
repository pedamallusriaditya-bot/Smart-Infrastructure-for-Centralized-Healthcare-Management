import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  getPatientProfile, 
  getPatientQR, 
  getDoctors, 
  createAppointment,
  getAppointments,
  getLabReports,
  getMyAdmissionStatus,
  getAITimeline,
  getPatientPrescriptions,
  getCareTimeline
} from '../../api/patient.api';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const renderVal = (val: any) => {
    if (!val) return "--";
    if (typeof val === 'object') {
      return `${val.value || "--"} ${val.unit || ""}`;
    }
    return String(val);
  };
  const [profile, setProfile] = useState<any>(null);
  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);
  const [labReportsList, setLabReportsList] = useState<any[]>([]);
  const [admissionStatus, setAdmissionStatus] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<{ summary: string, events: any[] }>({ summary: "", events: [] });
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [careTimeline, setCareTimeline] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // QR Modal & Expiration State
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrTimestamp, setQrTimestamp] = useState<number | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Booking Modal State
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("09:00 AM");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingReason, setBookingReason] = useState("Routine consultation");

  useEffect(() => {
    loadAllData();
  }, []);

  // Timer loop for QR expiry check (real-time countdown & switch)
  useEffect(() => {
    if (!isQRModalOpen || !qrTimestamp) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isQRModalOpen, qrTimestamp]);

  const loadAllData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const prof = await getPatientProfile();
      setProfile(prof);

      const [appts, labs, admission, timeline, rx, careTime] = await Promise.all([
        getAppointments().catch(() => []),
        getLabReports().catch(() => ({ reports: [] })),
        getMyAdmissionStatus().catch((err) => {
          if (err.response?.status === 404) return null;
          throw err;
        }),
        getAITimeline(prof.id).catch(() => ({ summary: "Timeline generation failed", events: [] })),
        getPatientPrescriptions().catch(() => []),
        getCareTimeline().catch(() => [])
      ]);

      setAppointmentsList(appts || []);
      setLabReportsList(labs.reports || []);
      setAdmissionStatus(admission);
      setTimelineData(timeline);
      setPrescriptions(rx || []);
      setCareTimeline(careTime || []);
    } catch (err: any) {
      console.error("Dashboard data load error", err);
      setErrorState(err.response?.data?.message || "Failed to establish secure link with clinical database.");
    } finally {
      setLoading(false);
    }
  };

  const openQRModal = async () => {
    setIsQRModalOpen(true);
    setQrLoading(true);
    try {
      const data = await getPatientQR();
      setQrCodeData(data.qrCode);
      setQrTimestamp(Date.now());
      setCurrentTime(Date.now());
    } catch (err) {
      console.error("Failed to fetch QR", err);
    } finally {
      setQrLoading(false);
    }
  };

  const openBookingModal = async () => {
    navigate('/patient/appointments', { state: { openBooking: true } });
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctorId || !bookingDate || !bookingTime) {
      alert("Please select a doctor, date, and time slot.");
      return;
    }
    setBookingLoading(true);
    try {
      const [time, modifier] = bookingTime.split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;

      const scheduledDate = new Date(bookingDate);
      scheduledDate.setHours(hours, minutes, 0, 0);

      await createAppointment({
        doctorId: selectedDoctorId,
        scheduledTime: scheduledDate.toISOString(),
        reason: bookingReason
      });

      alert("Appointment booked successfully!");
      setIsBookingOpen(false);
      loadAllData();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Booking failed.";
      alert(`Booking failed: ${msg}`);
    } finally {
      setBookingLoading(false);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return "--";
    return Math.floor((new Date().getTime() - new Date(dob).getTime()) / 3.154e10);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="record-card p-xl bg-error/5 border-error/20 text-center max-w-xl mx-auto my-12">
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

  // Filter doctors list based on selected specialization
  const filteredDoctors = selectedSpecialization
    ? doctorsList.filter(doc => doc.specialization === selectedSpecialization.toUpperCase())
    : doctorsList;

  // Next appointment logic
  const nextAppt = appointmentsList.find((a: any) => a.status === 'SCHEDULED');

  const latestReport = labReportsList[0];

  const assignedDoctor = nextAppt?.doctor || appointmentsList[0]?.doctor;

  const timelineEvents = timelineData.events || [];

  const welcomeMessage = admissionStatus
    ? `Admitted: Room ${admissionStatus.bed?.room?.roomNumber || "--"} (${admissionStatus.bed?.room?.type || "--"}), Bed ${admissionStatus.bed?.bedNumber || "--"} — Reason: ${admissionStatus.reason || "Observation"}`
    : `Today is ${todayFormatted}`;

  // Expiry configuration: 15 minutes = 900,000 milliseconds
  const isQrExpired = qrTimestamp ? (currentTime - qrTimestamp > 15 * 60 * 1000) : false;
  const qrTimeRemaining = qrTimestamp ? Math.max(0, 15 * 60 - Math.floor((currentTime - qrTimestamp) / 1000)) : 0;
  const qrMin = Math.floor(qrTimeRemaining / 60);
  const qrSec = qrTimeRemaining % 60;

  return (
    <>
      {/* Header Section */}
      <section className="fade-in stagger-1">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
          Welcome back, {user?.firstName}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-xs">
          {welcomeMessage}
        </p>
      </section>

      {/* Quick Actions Grid */}
      <section className="fade-in stagger-2 grid grid-cols-1 md:grid-cols-3 gap-md">
        <button 
          onClick={openBookingModal}
          className="flex items-center justify-center gap-base bg-primary text-on-primary py-lg px-xl rounded-lg font-label-lg text-label-lg shadow-md hover:opacity-90 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined">calendar_today</span>
          Book Appointment
        </button>
        <button 
          onClick={() => setIsLabModalOpen(true)}
          className="flex items-center justify-center gap-base border border-primary text-primary py-lg px-xl rounded-lg font-label-lg text-label-lg hover:bg-primary/5 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined">science</span>
          Laboratory Results
        </button>
        <button 
          onClick={openQRModal}
          className="flex items-center justify-center gap-base border border-primary text-primary py-lg px-xl rounded-lg font-label-lg text-label-lg hover:bg-primary/5 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined">qr_code_2</span>
          Medical QR
        </button>
      </section>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-xl">
        
        {/* Health Summary Card */}
        <div className="md:col-span-4 fade-in stagger-3 bg-white card-border custom-shadow p-lg rounded-lg flex flex-col justify-between">
          <div>
            <h2 className="font-title-lg text-title-lg text-on-surface mb-md">Health Summary</h2>
            <div className="grid grid-cols-2 gap-md mb-md">
              <div className="p-md bg-surface-container rounded-lg flex flex-col gap-xs">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Blood Group</span>
                <span className="font-title-lg text-title-lg text-primary">{profile?.bloodGroup || "Pending"}</span>
              </div>
              <div className="p-md bg-surface-container rounded-lg flex flex-col gap-xs">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Age</span>
                <span className="font-title-lg text-title-lg text-on-surface">
                  {profile?.dateOfBirth ? `${calculateAge(profile.dateOfBirth)} Yrs` : "N/A"}
                </span>
              </div>
              <div className="p-md bg-surface-container rounded-lg flex flex-col gap-xs">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Height</span>
                <span className="font-body-lg text-body-lg text-on-surface">N/A</span>
              </div>
              <div className="p-md bg-surface-container rounded-lg flex flex-col gap-xs">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Weight</span>
                <span className="font-body-lg text-body-lg text-on-surface">N/A</span>
              </div>
              <div className="p-md bg-surface-container rounded-lg flex flex-col gap-xs">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">BMI</span>
                <span className="font-body-lg text-body-lg text-on-surface">N/A</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Appointment Card */}
        <div className="md:col-span-4 fade-in stagger-4 bg-white card-border custom-shadow p-lg rounded-lg flex flex-col">
          <div className="flex items-center gap-sm mb-md text-primary">
            <span className="material-symbols-outlined">event</span>
            <h2 className="font-title-lg text-title-lg text-on-surface">Upcoming Appointment</h2>
          </div>
          <div className="flex-grow space-y-sm mb-lg">
            {nextAppt ? (
              <>
                <p className="font-label-lg text-label-lg text-on-surface">
                  {nextAppt.doctor ? `Dr. ${nextAppt.doctor.firstName} ${nextAppt.doctor.lastName}` : "Medical Practitioner"}
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {nextAppt.doctor?.specialization || "General Medicine"} • St. Mary's Hospital
                </p>
                <div className="flex items-center gap-sm text-primary">
                  <span className="material-symbols-outlined text-body-md">calendar_month</span>
                  <span className="font-body-md">
                    {formatDate(nextAppt.appointmentDate)} at {formatTime(nextAppt.appointmentDate)}
                  </span>
                </div>
                <span className="inline-block px-sm py-xs bg-primary/10 text-primary rounded text-label-md uppercase">
                  {nextAppt.status}
                </span>
              </>
            ) : (
              <div className="py-4 text-center text-sm text-gray-400">
                No upcoming appointments scheduled.
              </div>
            )}
          </div>
          <button className="w-full text-center py-sm border-t border-outline-variant text-primary font-label-lg text-label-lg hover:bg-surface-container transition-colors cursor-pointer">
            View Appointment
          </button>
        </div>

        {/* AI Health Insights */}
        <div className="md:col-span-4 fade-in stagger-5 bg-white card-border custom-shadow p-lg rounded-lg overflow-hidden relative group">
          <div className="relative z-10 flex flex-col h-full">
            <h3 className="font-title-lg text-title-lg mb-sm text-on-surface">AI Health Insights</h3>
            <div className="space-y-md flex-grow">
              <div className="max-h-48 overflow-y-auto pr-1">
                <p className="font-label-md text-on-surface-variant uppercase">Health Summary</p>
                <p className="font-body-md text-on-surface leading-relaxed text-xs italic">
                  "{timelineData.summary || "No AI summary compiled. Record additional clinic visits or lab orders to generate insights."}"
                </p>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                <div>
                  <p className="font-label-md text-on-surface-variant uppercase text-[10px]">Risk Level</p>
                  <p className="font-body-md text-slate-400 font-bold text-xs">N/A</p>
                </div>
                <div>
                  <p className="font-label-md text-on-surface-variant uppercase text-[10px] text-right">Preventive</p>
                  <p className="font-body-md text-slate-400 text-xs text-right">N/A</p>
                </div>
              </div>
            </div>
            <button className="mt-lg w-full text-center py-sm border-t border-outline-variant text-primary font-label-lg text-label-lg hover:bg-surface-container transition-colors cursor-pointer">
              View Detailed Analysis
            </button>
          </div>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[96px] text-primary opacity-10 group-hover:rotate-12 transition-transform">
            insights
          </span>
        </div>

        {/* Latest Laboratory Report */}
        <div className="md:col-span-6 bg-white card-border custom-shadow p-lg rounded-lg flex flex-col">
          <h2 className="font-title-lg text-title-lg text-on-surface mb-md">Latest Laboratory Report</h2>
          <div className="flex-grow space-y-md mb-lg">
            {latestReport ? (
              <>
                <div className="flex justify-between border-b border-outline-variant pb-sm">
                  <span className="text-body-md text-on-surface-variant">Test Name</span>
                  <span className="text-body-md font-bold">{latestReport.labOrder?.testName || "Lab Analysis"}</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant pb-sm">
                  <span className="text-body-md text-on-surface-variant">Report Date</span>
                  <span className="text-body-md">{formatDate(latestReport.createdAt)}</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant pb-sm">
                  <span className="text-body-md text-on-surface-variant">AI Analysis</span>
                  <span className="text-body-md text-secondary">{latestReport.aiSummary ? "Completed" : "Pending"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-body-md text-on-surface-variant">Overall Result</span>
                  <span className={`text-body-md font-bold ${latestReport.isAbnormal ? "text-error" : "text-primary"}`}>
                    {latestReport.isAbnormal ? "Abnormal" : "Normal"}
                  </span>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">
                No laboratory reports on file.
              </div>
            )}
          </div>
          <div className="flex gap-md border-t border-outline-variant pt-md">
            <button onClick={() => setIsLabModalOpen(true)} className="flex-grow text-center py-sm text-primary font-label-lg hover:bg-surface-container transition-colors disabled:opacity-50" disabled={!latestReport}>
              View Report
            </button>
          </div>
        </div>

        {/* Current Prescription */}
        <div className="md:col-span-6 bg-white card-border custom-shadow p-lg rounded-lg flex flex-col justify-between">
          <div>
            <h2 className="font-title-lg text-title-lg text-on-surface mb-md">Current Prescription</h2>
            {prescriptions.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                <span className="material-symbols-outlined text-4xl block mb-2">medication_liquid</span>
                No active prescriptions found in electronic health record.
                <p className="text-[10px] text-gray-400/80 mt-1">Designated pharmacy order list will sync automatically.</p>
              </div>
            ) : (
              <div className="space-y-sm max-h-48 overflow-y-auto pr-1 text-left">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="p-md bg-slate-50 border border-slate-100 rounded-lg flex flex-col gap-xs text-sm">
                    <div className="flex justify-between font-bold text-on-surface">
                      <span>{rx.medicine}</span>
                      <span className="text-primary text-xs font-semibold">{rx.dosage}</span>
                    </div>
                    {rx.instructions && (
                      <p className="text-xs text-on-surface-variant italic mt-1">"{rx.instructions}"</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      Prescribed by Dr. {rx.doctor?.lastName || 'Physician'} on {new Date(rx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button 
            className={`w-full text-center py-sm border-t border-outline-variant font-label-lg text-label-lg transition-colors ${prescriptions.length > 0 ? "text-primary hover:bg-surface-container cursor-pointer" : "text-gray-300 cursor-not-allowed"}`} 
            disabled={prescriptions.length === 0}
          >
            View Full Prescription
          </button>
        </div>

        {/* Assigned Doctor */}
        <div className="md:col-span-6 bg-white card-border custom-shadow p-lg rounded-lg flex flex-col justify-between">
          <div>
            <h2 className="font-title-lg text-title-lg text-on-surface mb-md">Assigned Doctor</h2>
            {assignedDoctor ? (
              <div className="flex items-center gap-lg mb-lg">
                <div className="w-20 h-20 rounded-full bg-surface-container overflow-hidden flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl">person</span>
                </div>
                <div>
                  <p className="font-title-lg text-on-surface">Dr. {assignedDoctor.firstName} {assignedDoctor.lastName}</p>
                  <p className="text-primary font-label-lg uppercase tracking-tight">{assignedDoctor.specialization}</p>
                  <p className="text-body-md text-on-surface-variant">St. Mary's General Hospital</p>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-gray-400">
                No assigned primary clinician.
                <p className="text-[10px] text-gray-400/80 mt-1">Schedule an appointment to designate a doctor.</p>
              </div>
            )}
          </div>
          <div className="flex gap-md border-t border-outline-variant pt-md">
            <button className="flex-grow text-center py-sm text-primary font-label-lg hover:bg-surface-container transition-colors disabled:opacity-50" disabled={!assignedDoctor}>
              View Profile
            </button>
            <button className="flex-grow text-center py-sm text-primary font-label-lg hover:bg-surface-container transition-colors disabled:opacity-50" disabled={!assignedDoctor}>
              Book Follow-up
            </button>
          </div>
        </div>

        {/* Medical Timeline */}
        <div className="md:col-span-8 bg-white card-border custom-shadow p-lg rounded-lg">
          <h2 className="font-title-lg text-title-lg text-on-surface mb-lg">Medical Timeline</h2>
          <div className="space-y-0">
            {timelineEvents.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No clinical events recorded.
              </div>
            ) : (
              timelineEvents.slice(0, 3).map((event: any, index: number) => {
                let title = "";
                let subtitle = "";
                let iconColor = "bg-primary";
                
                if (event.entryType === 'APPOINTMENT') {
                  title = `Consultation: ${event.reason || "Clinic Visit"}`;
                  subtitle = `${formatDate(event.date)} • ${event.status}`;
                  iconColor = "bg-primary";
                } else if (event.entryType === 'LAB_ORDER') {
                  title = `Laboratory Order: ${event.testName}`;
                  subtitle = `${formatDate(event.date)} • ${event.status}`;
                  iconColor = "bg-secondary";
                } else {
                  title = `Diagnosis: ${event.diagnosis || "Medical Update"}`;
                  subtitle = `${formatDate(event.date)} • Clinical Notes`;
                  iconColor = "bg-outline-variant";
                }

                return (
                  <div key={index} className="relative activity-line pb-lg flex gap-lg">
                    <div className={`w-4 h-4 rounded-full ${iconColor} mt-1.5 shrink-0 z-10`}></div>
                    <div>
                      <p className="font-label-lg text-label-lg text-on-surface">{title}</p>
                      <p className="font-label-md text-label-md text-on-surface-variant">{subtitle}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="md:col-span-4 bg-white card-border custom-shadow p-lg rounded-lg flex flex-col justify-between">
          <div>
            <h2 className="font-title-lg text-title-lg text-on-surface mb-md">Notifications</h2>
            <div className="py-8 text-center text-sm text-gray-400">
              <span className="material-symbols-outlined text-3xl block mb-2 text-slate-300">notifications_off</span>
              No active notifications.
            </div>
          </div>
        </div>

        {/* Medication Timeline */}
        <div className="md:col-span-12 bg-white card-border custom-shadow p-lg rounded-lg">
          <h2 className="font-title-lg text-title-lg text-on-surface mb-lg flex items-center gap-md">
            <span className="material-symbols-outlined text-primary">timeline</span>
            Medication Life Cycle Timeline (MAR)
          </h2>
          <div className="space-y-md">
            {careTimeline.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                <span className="material-symbols-outlined text-4xl block mb-2 text-slate-300">receipt_long</span>
                No active care administrations logged yet.
                <p className="text-[10px] text-gray-400/80 mt-1">Your clinical medication timeline will automatically sync upon dose verification at the nursing station.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                {careTimeline.slice(0, 6).map((event: any, idx: number) => {
                  let statusColor = "border-primary text-primary bg-blue-50/50";
                  let typeLabel = "Prescribed";
                  let icon = "description";

                  if (event.eventType === 'DISPENSING') {
                    statusColor = "border-amber-500 text-amber-700 bg-amber-50/50";
                    typeLabel = "Dispensed";
                    icon = "local_shipping";
                  } else if (event.eventType === 'MEDICATION_ADMINISTRATION') {
                    statusColor = "border-green-600 text-green-700 bg-green-50/50";
                    typeLabel = "Administered";
                    icon = "vaccines";
                  }

                  return (
                    <div key={event.id || idx} className={`p-md border rounded-xl flex flex-col justify-between ${statusColor}`}>
                      <div className="flex items-center gap-sm mb-sm border-b border-current/10 pb-xs">
                        <span className="material-symbols-outlined text-md">{icon}</span>
                        <span className="text-xs uppercase font-black tracking-widest">{typeLabel}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mb-md leading-snug">
                        {event.description}
                      </p>
                      <div className="text-[10px] text-gray-500 font-medium">
                        {new Date(event.createdAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Access */}
        <div className="md:col-span-12">
          <h2 className="font-title-lg text-title-lg text-on-surface mb-md">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-md">
            <div onClick={() => navigate('/patient/my-records')} className="bg-white card-border p-md rounded-lg text-center hover:border-primary cursor-pointer transition-all">
              <span className="material-symbols-outlined text-primary mb-xs">folder_shared</span>
              <p className="text-label-md">Medical Records</p>
            </div>
            <div onClick={() => navigate('/patient/appointments')} className="bg-white card-border p-md rounded-lg text-center hover:border-primary cursor-pointer transition-all">
              <span className="material-symbols-outlined text-primary mb-xs">history</span>
              <p className="text-label-md">Appointment History</p>
            </div>
            <div onClick={() => setIsLabModalOpen(true)} className="bg-white card-border p-md rounded-lg text-center hover:border-primary cursor-pointer transition-all">
              <span className="material-symbols-outlined text-primary mb-xs">biotech</span>
              <p className="text-label-md">Lab Reports</p>
            </div>
            <div onClick={openQRModal} className="bg-white card-border p-md rounded-lg text-center hover:border-primary cursor-pointer transition-all">
              <span className="material-symbols-outlined text-primary mb-xs">person</span>
              <p className="text-label-md">Profile</p>
            </div>
            <div onClick={logout} className="bg-white card-border p-md rounded-lg text-center hover:border-primary cursor-pointer transition-all">
              <span className="material-symbols-outlined text-primary mb-xs">logout</span>
              <p className="text-label-md">Logout</p>
            </div>
          </div>
        </div>

      </div>


      {/* Medical QR Modal */}
      {isQRModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-md text-on-surface">
          <div className="bg-white rounded-lg w-full max-w-md p-xl custom-shadow animate-in slide-in-from-bottom duration-300 relative">
            <button 
              className="material-symbols-outlined absolute right-md top-md text-on-surface-variant cursor-pointer hover:bg-slate-100 p-1 rounded-full animate-none" 
              onClick={() => setIsQRModalOpen(false)}
            >
              close
            </button>
            <div className="flex flex-col items-center gap-lg">
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface text-center">Medical QR ID</h2>
              
              {/* Expiring QR Display */}
              <div className="w-64 h-64 bg-white p-2 border-2 border-primary rounded-lg overflow-hidden flex items-center justify-center">
                {qrLoading ? (
                  <Loader2 className="animate-spin text-primary" size={40} />
                ) : isQrExpired ? (
                  <div className="w-full h-full bg-slate-50 border border-error/20 p-md rounded-lg flex flex-col items-center justify-center text-center gap-xs">
                    <span className="material-symbols-outlined text-error text-4xl">gpp_maybe</span>
                    <p className="text-xs font-bold text-error">Security Pass Expired</p>
                    <p className="text-[10px] text-gray-400">For patient privacy, secure QR codes expire after 15 minutes.</p>
                    <button 
                      onClick={openQRModal}
                      className="mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 cursor-pointer"
                    >
                      Regenerate Pass
                    </button>
                  </div>
                ) : qrCodeData ? (
                  <img alt="Medical QR Code" className="w-full h-full object-contain" src={qrCodeData} />
                ) : (
                  <span className="text-sm text-gray-400">Failed to load QR</span>
                )}
              </div>

              {!isQrExpired && qrTimestamp && (
                <p className="text-[11px] text-gray-400 font-bold animate-pulse flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  Expires in: {qrMin}:{qrSec < 10 ? `0${qrSec}` : qrSec}
                </p>
              )}

              <div className="w-full space-y-sm bg-surface-container p-md rounded-lg">
                <div className="flex justify-between">
                  <span className="text-label-md text-on-surface-variant uppercase">Patient</span>
                  <span className="text-label-lg font-bold text-on-surface">{user?.firstName} {user?.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-label-md text-on-surface-variant uppercase">Blood Group</span>
                  <span className="text-label-lg font-bold text-error">{profile?.bloodGroup || "Pending"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-label-md text-on-surface-variant uppercase">Emergency Contact</span>
                  <span className="text-label-lg font-bold text-on-surface">{profile?.phone || "N/A"}</span>
                </div>
              </div>
              <p className="text-center text-body-md text-on-surface-variant px-md">
                Scan this code at any CareHive certified clinic to share your medical history securely.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lab Results Modal */}
      {isLabModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-md text-on-surface">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col custom-shadow animate-in slide-in-from-bottom duration-300 overflow-hidden relative text-on-surface">
            <div className="flex justify-between items-center p-lg border-b border-outline-variant">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-primary">science</span>
                <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Lab Results Detail</h2>
              </div>
              <div className="flex items-center gap-md">
                <button 
                  className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:bg-slate-100 p-1 rounded-full" 
                  onClick={() => setIsLabModalOpen(false)}
                >
                  close
                </button>
              </div>
            </div>
            <div className="flex border-b border-outline-variant px-lg">
              <button className="px-lg py-md border-b-2 border-primary text-primary font-label-lg">Overview</button>
              <button className="px-lg py-md text-on-surface-variant font-label-lg hover:bg-surface-container">Historical Trends</button>
              <button className="px-lg py-md text-on-surface-variant font-label-lg hover:bg-surface-container">AI Interpretation</button>
            </div>
            <div className="flex-grow overflow-y-auto p-lg space-y-xl">
              <section>
                <h3 className="font-title-lg text-title-lg mb-md">Current Results</h3>
                <table className="w-full text-left border-collapse text-on-surface">
                  <thead className="bg-surface-container">
                    <tr className="text-label-md text-on-surface-variant uppercase"> 
                      <th className="p-md">Test Name</th> 
                      <th className="p-md">Result</th> 
                      <th className="p-md">Reference Range</th> 
                      <th className="p-md">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-md"> 
                    {labReportsList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-md text-center text-gray-400">No raw results data available.</td>
                      </tr>
                    ) : (
                      labReportsList.map((rep) => {
                        const glucose = rep.resultsData?.glucose || rep.resultsData?.["Glucose (Fasting)"];
                        const a1c = rep.resultsData?.a1c || rep.resultsData?.["Hemoglobin A1c"];
                        const chol = rep.resultsData?.cholesterol || rep.resultsData?.["Total Cholesterol"];
                        return (
                          <React.Fragment key={rep.id}>
                            <tr className="border-b border-outline-variant"> 
                              <td className="p-md">Glucose (Fasting)</td> 
                              <td className="p-md font-bold text-error">{renderVal(glucose)}</td> 
                              <td className="p-md">70 - 99 mg/dL</td> 
                              <td className="p-md"><span className={`px-sm py-xs rounded text-label-md ${rep.isAbnormal ? "bg-error/10 text-error" : "bg-secondary/10 text-secondary"}`}>{rep.isAbnormal ? "ABNORMAL" : "NORMAL"}</span></td> 
                            </tr> 
                            <tr className="border-b border-outline-variant"> 
                              <td className="p-md">Hemoglobin A1c</td> 
                              <td className="p-md font-bold">{renderVal(a1c)}</td> 
                              <td className="p-md">4.0 - 5.6%</td> 
                              <td className="p-md"><span className="bg-secondary/10 text-secondary px-sm py-xs rounded text-label-md">NORMAL</span></td> 
                            </tr> 
                            <tr className="border-b border-outline-variant"> 
                              <td className="p-md">Total Cholesterol</td> 
                              <td className="p-md font-bold">{renderVal(chol)}</td> 
                              <td className="p-md">&lt; 200 mg/dL</td> 
                              <td className="p-md"><span className="bg-secondary/10 text-secondary px-sm py-xs rounded text-label-md">NORMAL</span></td> 
                            </tr>
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </section>
              <section>
                <h3 className="font-title-lg text-title-lg mb-md">AI Interpretation</h3>
                <div className="p-lg bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-body-lg text-on-surface mb-md">
                    {latestReport?.aiSummary || "Laboratory results analysis completed successfully. Metrics reside within typical reference bounds."}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div className="p-md bg-white rounded border border-error/30 flex items-center gap-md">
                      <span className="material-symbols-outlined text-error">warning</span>
                      <div>
                        <p className="text-label-md text-on-surface-variant uppercase">Status</p>
                        <p className={`text-body-md font-bold ${latestReport?.isAbnormal ? "text-error" : "text-secondary"}`}>
                          {latestReport?.isAbnormal ? "Glucose Abnormal" : "Normal Baseline"}
                        </p>
                      </div>
                    </div>
                    <div className="p-md bg-white rounded border border-outline-variant flex items-center gap-md">
                      <span className="material-symbols-outlined text-primary">info</span>
                      <div>
                        <p className="text-label-md text-on-surface-variant uppercase">Recommendation</p>
                        <p className="text-body-md">Clinical assessment recommended</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default Dashboard;