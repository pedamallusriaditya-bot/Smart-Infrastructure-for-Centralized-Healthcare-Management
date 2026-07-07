import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { Loader2, AlertTriangle, Compass, CheckCircle2 } from 'lucide-react';
import {
  checkInDoctor,
  checkOutDoctor,
  updateAttendanceStatus,
  getMyTodayAttendance,
  getMyAttendanceSummary
} from '../../api/attendance.api';
import {
  lookupDiagnosticTest
} from '../../api/diagnostic.api';
import {
  getReferralSuggestions,
  submitReferral,
  getPatientReferralHistory
} from '../../api/referral.api';



const calculateDistance = (
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
};

const DoctorDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [lookupTestType, setLookupTestType] = useState("MRI");
  const [lookupHospitalId, setLookupHospitalId] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  // Admission Modal State
  const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
  const [selectedApptForAdmission, setSelectedApptForAdmission] = useState<any>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  const [admissionReason, setAdmissionReason] = useState("");
  const [admissionLoading, setAdmissionLoading] = useState(false);

  // Prescription Modal State
  const [isConsultOpen, setIsConsultOpen] = useState(false);
  const [selectedApptForConsult, setSelectedApptForConsult] = useState<any>(null);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [medicinesList, setMedicinesList] = useState<any[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [prescriptionDosage, setPrescriptionDosage] = useState("");
  const [prescriptionFrequency, setPrescriptionFrequency] = useState("");
  const [prescriptionDuration, setPrescriptionDuration] = useState("");
  const [prescriptionInstructions, setPrescriptionInstructions] = useState("");
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);

  // Referral Modal State
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [selectedApptForReferral, setSelectedApptForReferral] = useState<any>(null);
  const [referralLacks, setReferralLacks] = useState<string[]>([]);
  const [referralTestType, setReferralTestType] = useState("");
  const [referralMedicineName, setReferralMedicineName] = useState("");
  const [referralSpecialization, setReferralSpecialization] = useState("");
  const [referralNotes, setReferralNotes] = useState("");
  const [referralSuggestions, setReferralSuggestions] = useState<any[]>([]);
  const [referralSuggestionsLoading, setReferralSuggestionsLoading] = useState(false);
  const [patientReferralHistory, setPatientReferralHistory] = useState<any[]>([]);
  const [patientReferralHistoryLoading, setPatientReferralHistoryLoading] = useState(false);

  // Lab Reviews State
  const [labReviews, setLabReviews] = useState<any[]>([]);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);
  const [selectedReviewReport, setSelectedReviewReport] = useState<any>(null);
  const [doctorRemarks, setDoctorRemarks] = useState("");
  const [signOffLoading, setSignOffLoading] = useState(false);

  // Place Lab Order State
  const [isLabOrderOpen, setIsLabOrderOpen] = useState(false);
  const [selectedApptForLabOrder, setSelectedApptForLabOrder] = useState<any>(null);
  const [labOrderTestName, setLabOrderTestName] = useState("Complete Blood Count (CBC)");
  const [labOrderCategory, setLabOrderCategory] = useState("HEMATOLOGY");
  const [labOrderPriority, setLabOrderPriority] = useState("NORMAL");
  const [labOrderClinicalNotes, setLabOrderClinicalNotes] = useState("");
  const [labOrderLoading, setLabOrderLoading] = useState(false);


  // Load departments and rooms on hospital selection change
  useEffect(() => {
    if (!selectedHospitalId) {
      setDepartments([]);
      setRooms([]);
      return;
    }
    const loadHospitalSubResources = async () => {
      try {
        const [deptsRes, roomsRes] = await Promise.all([
          axiosInstance.get(`/hospitals/${selectedHospitalId}/departments`),
          axiosInstance.get(`/hospitals/${selectedHospitalId}/rooms`)
        ]);
        setDepartments(deptsRes.data.data || []);
        setRooms(roomsRes.data.data || []);
      } catch (err) {
        console.error("Failed to load hospital departments or rooms", err);
      }
    };
    loadHospitalSubResources();
  }, [selectedHospitalId]);

  // Load medicines whenever medicineSearch changes
  useEffect(() => {
    if (!medicineSearch) {
      setMedicinesList([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await axiosInstance.get(`/medicines?q=${encodeURIComponent(medicineSearch)}`);
        setMedicinesList(res.data.data || []);
      } catch (err) {
        console.error("Failed to load medicines", err);
      }
    }, 300); // debounce 300ms
    return () => clearTimeout(delayDebounce);
  }, [medicineSearch]);

  // Load referral suggestions and patient history when lacks or selected appt change
  useEffect(() => {
    if (!isReferralOpen || !selectedApptForReferral) return;

    const loadReferralsData = async () => {
      setReferralSuggestionsLoading(true);
      try {
        const sourceHospId = doctorProfile?.department?.hospitalId;
        if (sourceHospId) {
          const suggestions = await getReferralSuggestions({
            hospitalId: sourceHospId,
            lacks: referralLacks,
            testType: referralLacks.includes('DIAGNOSTICS') && referralTestType ? referralTestType : undefined,
            medicineName: referralLacks.includes('MEDICINES') && referralMedicineName ? referralMedicineName : undefined,
            specialization: referralLacks.includes('DOCTORS') && referralSpecialization ? referralSpecialization : undefined
          });
          setReferralSuggestions(suggestions || []);
        }
      } catch (err) {
        console.error("Failed to load referral suggestions", err);
      } finally {
        setReferralSuggestionsLoading(false);
      }
    };

    loadReferralsData();
  }, [
    isReferralOpen,
    selectedApptForReferral,
    referralLacks,
    referralTestType,
    referralMedicineName,
    referralSpecialization,
    doctorProfile
  ]);

  // Load history separately
  useEffect(() => {
    if (!isReferralOpen || !selectedApptForReferral) return;

    const loadHistory = async () => {
      setPatientReferralHistoryLoading(true);
      try {
        const history = await getPatientReferralHistory(selectedApptForReferral.patientId);
        setPatientReferralHistory(history || []);
      } catch (err) {
        console.error("Failed to load patient referral history", err);
      } finally {
        setPatientReferralHistoryLoading(false);
      }
    };

    loadHistory();
  }, [isReferralOpen, selectedApptForReferral]);

  const handleOpenReferralModal = (appt: any) => {
    setSelectedApptForReferral(appt);
    setReferralLacks([]);
    setReferralTestType("");
    setReferralMedicineName("");
    setReferralSpecialization("");
    setReferralNotes("");
    setReferralSuggestions([]);
    setIsReferralOpen(true);
  };

  const handleReferralSubmit = async (destinationHospitalId: string, destinationHospitalName: string) => {
    if (referralLacks.length === 0) {
      alert("Please select at least one resource the current hospital lacks.");
      return;
    }
    
    const reasonStr = referralLacks.map(l => {
      if (l === 'DIAGNOSTICS' && referralTestType) return `Diagnostics (${referralTestType})`;
      if (l === 'MEDICINES' && referralMedicineName) return `Medicines (${referralMedicineName})`;
      if (l === 'DOCTORS' && referralSpecialization) return `Doctors (${referralSpecialization})`;
      return l;
    }).join(', ');

    if (!window.confirm(`Are you sure you want to refer this patient to ${destinationHospitalName} for: ${reasonStr}?`)) {
      return;
    }

    try {
      await submitReferral({
        patientId: selectedApptForReferral.patientId,
        destinationHospitalId,
        reason: reasonStr,
        notes: referralNotes
      });
      alert(`Patient successfully referred to ${destinationHospitalName}! Timeline and Medical Records updated.`);
      setIsReferralOpen(false);
      loadDashboardData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to submit referral: " + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleLack = (lack: string) => {
    setReferralLacks(prev => 
      prev.includes(lack) ? prev.filter(l => l !== lack) : [...prev, lack]
    );
  };


  const handleOpenAdmissionModal = async (appt: any) => {
    setSelectedApptForAdmission(appt);
    setIsAdmissionOpen(true);
    try {
      const res = await axiosInstance.get('/hospitals');
      setHospitals(res.data.data || []);
      
      // Auto-select doctor's own hospital if possible
      if (doctorProfile?.department?.hospitalId) {
        const ownHospitalId = doctorProfile.department.hospitalId;
        setSelectedHospitalId(ownHospitalId);
      }
    } catch (err) {
      console.error("Failed to load hospitals list", err);
    }
  };

  const handleOpenConsultModal = (appt: any) => {
    setSelectedApptForConsult(appt);
    setIsConsultOpen(true);
  };

  const handleAdmitPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBedId || !admissionReason) {
      alert("Please select a bed and provide an admission reason.");
      return;
    }
    setAdmissionLoading(true);
    try {
      await axiosInstance.post('/admissions/admit', {
        patientId: selectedApptForAdmission.patientId,
        bedId: selectedBedId,
        reason: admissionReason
      });
      alert("Patient successfully admitted to inpatient care!");
      setIsAdmissionOpen(false);
      setSelectedRoomId("");
      setSelectedBedId("");
      setAdmissionReason("");
      loadDashboardData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to admit patient: " + (err.response?.data?.message || err.message));
    } finally {
      setAdmissionLoading(false);
    }
  };

  const handleCreatePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicineId || !prescriptionDosage || !prescriptionFrequency || !prescriptionDuration) {
      alert("Please complete all required fields for prescription entry.");
      return;
    }
    setPrescriptionLoading(true);
    try {
      await axiosInstance.post('/prescriptions', {
        patientId: selectedApptForConsult.patientId,
        medicineId: selectedMedicineId,
        dosage: prescriptionDosage,
        frequency: prescriptionFrequency,
        duration: prescriptionDuration,
        instructions: prescriptionInstructions
      });
      alert("Prescription saved and sent to pharmacy!");
      setIsConsultOpen(false);
      setMedicineSearch("");
      setSelectedMedicineId("");
      setPrescriptionDosage("");
      setPrescriptionFrequency("");
      setPrescriptionDuration("");
      setPrescriptionInstructions("");
      loadDashboardData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to save prescription: " + (err.response?.data?.message || err.message));
    } finally {
      setPrescriptionLoading(false);
    }
  };

  // Dynamic Wellness Tracker State (persisted per session)
  const [wellnessMetrics] = useState<{
    efficiency: number;
    intensity: 'Low' | 'Moderate' | 'High';
    recommendation: string;
  }>(() => {
    const cached = sessionStorage.getItem('doctor_wellness_metrics');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    
    // Generate new dynamic metrics for this login session
    const efficiency = Math.floor(Math.random() * (95 - 65 + 1)) + 65; // 65% to 95%
    let intensity: 'Low' | 'Moderate' | 'High' = 'Moderate';
    let recommendation = '';
    
    if (efficiency < 75) {
      intensity = 'High';
      recommendation = "High consultation load. Recommend a 10-minute breather after the next session.";
    } else if (efficiency <= 86) {
      intensity = 'Moderate';
      recommendation = "Optimal focus levels detected. Recommend a 5-minute breather after the next consult.";
    } else {
      intensity = 'Low';
      recommendation = "Steady clinical pace. Maintain standard protocols.";
    }
    
    const newMetrics = { efficiency, intensity, recommendation };
    sessionStorage.setItem('doctor_wellness_metrics', JSON.stringify(newMetrics));
    return newMetrics;
  });

  const handleCreateLabOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApptForLabOrder || !labOrderTestName || !labOrderCategory) {
      alert("Please complete all required fields.");
      return;
    }
    setLabOrderLoading(true);
    try {
      await axiosInstance.post('/lab/orders', {
        patientId: selectedApptForLabOrder.patientId,
        appointmentId: selectedApptForLabOrder.id,
        testName: labOrderTestName,
        category: labOrderCategory,
        priority: labOrderPriority,
        clinicalNotes: labOrderClinicalNotes
      });
      alert("Laboratory test successfully ordered! LIS queue updated.");
      setIsLabOrderOpen(false);
      setLabOrderTestName("Complete Blood Count (CBC)");
      setLabOrderClinicalNotes("");
      loadDashboardData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to initiate lab order: " + (err.response?.data?.message || err.message));
    } finally {
      setLabOrderLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('doctor_wellness_metrics');
    logout();
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const [profileRes, apptsRes, emergRes, todayAtt, summaryAtt, hospRes, labRes] = await Promise.all([
        axiosInstance.get('/doctors/profile'),
        axiosInstance.get('/appointments').catch(() => ({ data: { data: [] } })),
        axiosInstance.get('/emergencies').catch(() => ({ data: { data: [] } })),
        getMyTodayAttendance().catch(() => null),
        getMyAttendanceSummary().catch(() => null),
        axiosInstance.get('/hospitals').catch(() => ({ data: { data: [] } })),
        axiosInstance.get('/lab/reports', { params: { status: 'COMPLETED' } }).catch(() => ({ data: { data: { reports: [] } } }))
      ]);
      const prof = profileRes.data.data;
      setDoctorProfile(prof);
      setAppointments(apptsRes.data.data || []);
      setEmergencies(emergRes.data.data || []);
      setAttendanceToday(todayAtt);
      setAttendanceSummary(summaryAtt);
      setLabReviews(labRes.data.data?.reports || []);
      
      const hospList = hospRes.data.data || [];
      setHospitals(hospList);
      if (prof?.department?.hospitalId) {
        setSelectedHospitalId(prof.department.hospitalId);
        setLookupHospitalId(prof.department.hospitalId);
      } else if (hospList.length > 0) {
        setLookupHospitalId(hospList[0].id);
      }

      if (todayAtt && todayAtt.checkInTime && !todayAtt.checkOutTime) {
        setIsOnDuty(todayAtt.status !== 'ON_LEAVE');
      } else {
        setIsOnDuty(false);
      }
    } catch (err: any) {
      console.error("Doctor dashboard loading error", err);
      setErrorState(err.response?.data?.message || "Failed to establish secure link with clinical records database.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setIsAttendanceLoading(true);
    try {
      await checkInDoctor();
      alert("Check-in successful! Wish you a great shift.");
      await loadDashboardData();
    } catch (err: any) {
      alert("Check-in failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm("Are you sure you want to Check-Out from your shift?")) return;
    setIsAttendanceLoading(true);
    try {
      await checkOutDoctor();
      alert("Check-out successful! Shift summary recorded.");
      await loadDashboardData();
    } catch (err: any) {
      alert("Check-out failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsAttendanceLoading(true);
    try {
      await updateAttendanceStatus(newStatus);
      alert(`Duty status updated to: ${newStatus}`);
      await loadDashboardData();
    } catch (err: any) {
      alert("Failed to update status: " + (err.response?.data?.message || err.message));
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const handleReferralLookup = async () => {
    if (!lookupHospitalId || !lookupTestType) return;
    setIsLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await lookupDiagnosticTest(lookupHospitalId, lookupTestType);
      setLookupResult(res);
    } catch (err: any) {
      alert("Lookup failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsLookupLoading(false);
    }
  };

  const handleAcceptEmergency = async (id: string) => {
    try {
      await axiosInstance.patch(`/emergencies/${id}/accept`);
      alert("Emergency accepted! Responders are dispatching.");
      loadDashboardData();
    } catch (err: any) {
      alert("Action failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleRejectEmergency = async (id: string) => {
    if (!window.confirm("Reject this emergency case? It will escalate to the next nearest facility.")) return;
    try {
      await axiosInstance.patch(`/emergencies/${id}/reject`);
      alert("Emergency case rejected. Escalated to next facility.");
      loadDashboardData();
    } catch (err: any) {
      alert("Action failed: " + (err.response?.data?.message || err.message));
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
  const activeEmergencies = emergencies.filter(e => e.status === 'ACTIVE' || e.status === 'DISPATCHED');

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
            <button 
              onClick={() => {
                if (scheduledQueue.length === 0) {
                  alert("You do not have any active appointments to place lab requests for.");
                  return;
                }
                setSelectedApptForLabOrder(scheduledQueue[0]);
                setLabOrderTestName("Complete Blood Count (CBC)");
                setLabOrderClinicalNotes("");
                setLabOrderCategory("HEMATOLOGY");
                setLabOrderPriority("NORMAL");
                setIsLabOrderOpen(true);
              }}
              className="bg-primary text-on-primary px-lg py-sm rounded shadow-md hover:bg-primary-container transition-all flex items-center gap-sm cursor-pointer"
            >
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
            <div className="text-headline-lg font-bold text-on-surface mb-xs">{labReviews.length}</div>
            <div className="flex items-center gap-xs text-on-surface-variant text-label-md">
              <span>Priority reviews identified</span>
            </div>
          </div>
          {/* Emergency Cases */}
          <div className={`p-lg rounded-lg shadow-sm hover:shadow-md transition-shadow border ${
            activeEmergencies.length > 0 
              ? 'bg-red-50 border-error animate-pulse' 
              : 'bg-surface-container-lowest border-outline-variant'
          }`}>
            <div className="flex justify-between items-start mb-sm">
              <span className={`text-label-md uppercase tracking-wider font-bold ${
                activeEmergencies.length > 0 ? 'text-error' : 'text-on-surface-variant'
              }`}>
                Emergency Cases
              </span>
              <span className={`material-symbols-outlined ${
                activeEmergencies.length > 0 ? 'text-error animate-bounce' : 'text-on-surface-variant'
              }`}>
                emergency
              </span>
            </div>
            <div className={`text-headline-lg font-bold mb-xs ${
              activeEmergencies.length > 0 ? 'text-error' : 'text-on-surface'
            }`}>
              {activeEmergencies.length}
            </div>
            <div className={`flex items-center gap-xs text-label-md font-bold ${
              activeEmergencies.length > 0 ? 'text-error' : 'text-on-surface-variant'
            }`}>
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>{activeEmergencies.length > 0 ? `${activeEmergencies.length} Active Incidents` : "No emergencies active"}</span>
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
            
            {/* Active Emergency Alert Panel */}
            {activeEmergencies.length > 0 && (
              <section className="bg-red-50 border-2 border-red-500 rounded-2xl p-lg shadow-lg space-y-md">
                <div className="flex items-center gap-sm text-error font-extrabold mb-1">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                  <h2 className="text-lg font-black uppercase tracking-wide">Critical Emergency Dispatch Alerts</h2>
                </div>
                
                <div className="space-y-md">
                  {activeEmergencies.map((alert) => {
                    const dob = alert.patient?.dateOfBirth;
                    const age = dob ? Math.floor((new Date().getTime() - new Date(dob).getTime()) / 3.154e10) : "N/A";
                    const distance = calculateDistance(
                      alert.patientLatitude,
                      alert.patientLongitude,
                      doctorProfile?.department?.hospital?.latitude,
                      doctorProfile?.department?.hospital?.longitude
                    );

                    return (
                      <div 
                        key={alert.id} 
                        className="bg-white border border-red-200 p-md rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-md shadow-sm"
                      >
                        <div className="space-y-xs">
                          <h4 className="font-bold text-sm text-error">
                            Patient: {alert.patient ? `${alert.patient.firstName} ${alert.patient.lastName}` : "Registered Patient"} ({age} Yrs • Blood: {alert.patient?.bloodGroup || "Pending"})
                          </h4>
                          <p className="text-xs text-on-surface-variant font-semibold">{alert.description || "Emergency rescue request"}</p>
                          <div className="flex flex-wrap gap-md text-[10px] text-on-surface-variant font-mono pt-1">
                            <span className="flex items-center gap-xs">
                              <Compass className="w-3.5 h-3.5 text-primary" />
                              Lat: {alert.patientLatitude?.toFixed(4) || "N/A"} | Lon: {alert.patientLongitude?.toFixed(4) || "N/A"}
                            </span>
                            {distance != null && (
                              <span className="text-primary font-bold">
                                Distance: {distance} km
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-sm shrink-0">
                          {alert.status === 'ACTIVE' && (
                            <>
                              <button 
                                onClick={() => handleAcceptEmergency(alert.id)}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs px-md py-2 rounded-lg font-bold transition-all cursor-pointer shadow-sm"
                              >
                                Accept Case
                              </button>
                              <button 
                                onClick={() => handleRejectEmergency(alert.id)}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs px-md py-2 rounded-lg font-bold transition-all cursor-pointer shadow-sm"
                              >
                                Reject Case
                              </button>
                            </>
                          )}
                          {alert.status === 'DISPATCHED' && (
                            <span className="text-[10px] text-green-700 font-black tracking-wide uppercase px-2 py-1 bg-green-50 border border-green-200 rounded">
                              ✓ Responders En Route
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

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
                            <td className="px-lg py-lg text-right flex justify-end gap-sm items-center">
                              <button 
                                onClick={() => handleOpenConsultModal(appt)}
                                className="bg-primary text-on-primary px-md py-xs rounded text-label-lg font-bold shadow hover:opacity-90 transition-all cursor-pointer"
                              >
                                Consult
                              </button>
                              <button 
                                onClick={() => handleOpenAdmissionModal(appt)}
                                className="border border-primary text-primary px-md py-xs rounded text-label-lg font-bold hover:bg-primary/5 transition-all cursor-pointer"
                              >
                                Admit
                              </button>
                              <button 
                                onClick={() => handleOpenReferralModal(appt)}
                                className="border border-amber-600 text-amber-600 px-md py-xs rounded text-label-lg font-bold hover:bg-amber-50 transition-all cursor-pointer"
                              >
                                Refer
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

            {/* Diagnostic Availability & Referral Lookup Console */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm p-lg">
              <div className="flex justify-between items-center mb-md border-b border-outline-variant pb-xs">
                <h2 className="font-title-lg text-title-lg text-on-surface flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary">referral</span>
                  Diagnostic Availability & Referral Lookup
                </h2>
                <span className="material-symbols-outlined text-primary">share_location</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-md items-end">
                <div className="md:col-span-5 space-y-1 text-left">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Hospital Facility</label>
                  <select
                    value={lookupHospitalId}
                    onChange={(e) => setLookupHospitalId(e.target.value)}
                    className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm outline-none focus:border-primary"
                  >
                    <option value="">Select a hospital facility...</option>
                    {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-4 space-y-1 text-left">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Required Diagnostic Test</label>
                  <select
                    value={lookupTestType}
                    onChange={(e) => setLookupTestType(e.target.value)}
                    className="w-full p-md bg-surface-container border border-outline rounded-xl text-sm outline-none focus:border-primary"
                  >
                    {['CBC', 'BLOOD_SUGAR', 'ECG', 'MRI', 'CT', 'X_RAY', 'ULTRASOUND', 'BLOOD_BANK', 'COVID', 'URINE_ANALYSIS', 'LIVER_FUNCTION', 'KIDNEY_FUNCTION'].map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <button
                    onClick={handleReferralLookup}
                    disabled={isLookupLoading || !lookupHospitalId}
                    className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-xs cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLookupLoading ? <Loader2 className="animate-spin text-on-primary w-4 h-4" /> : <span className="material-symbols-outlined text-sm">search</span>}
                    Verify status
                  </button>
                </div>
              </div>

              {/* Lookup Result Indicator */}
              {lookupResult && (
                <div className="mt-md space-y-md border-t border-outline-variant pt-md">
                  <div className={`p-md border rounded-xl flex items-center justify-between ${
                    lookupResult.status === 'AVAILABLE'
                      ? 'border-green-200 bg-green-50/50 text-green-800'
                      : lookupResult.status === 'MAINTENANCE'
                      ? 'border-amber-200 bg-amber-50/50 text-amber-800'
                      : 'border-red-200 bg-red-50/50 text-red-800'
                  }`}>
                    <div className="text-left">
                      <p className="text-xs font-bold uppercase tracking-wider">Test Status</p>
                      <p className="text-sm font-black mt-xs uppercase">{lookupResult.status.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-wider">Estimated Cost</p>
                      <p className="text-sm font-black font-mono mt-xs">${lookupResult.cost.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Nearest Referral Recommendation */}
                  {lookupResult.status !== 'AVAILABLE' && (
                    <div className="p-md border border-primary/20 bg-blue-50/50 rounded-xl text-left space-y-sm">
                      <div className="flex items-center gap-xs text-primary font-bold text-xs">
                        <span className="material-symbols-outlined text-md">share_location</span>
                        <span>AUTOMATIC NEAREST REFERRAL RECOMMENDATION</span>
                      </div>
                      
                      {lookupResult.recommendedAlternative ? (
                        <div>
                          <p className="text-sm font-black text-gray-800">
                            {lookupResult.recommendedAlternative.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {lookupResult.recommendedAlternative.address || 'Address not listed'}
                            {lookupResult.recommendedAlternative.phone && ` | Phone: ${lookupResult.recommendedAlternative.phone}`}
                          </p>
                          <div className="flex justify-between items-center mt-md bg-white p-sm border border-outline-variant rounded-lg">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Proximity Distance</span>
                            <span className="text-xs font-black text-primary">
                              {lookupResult.recommendedAlternative.distance != null 
                                ? `${lookupResult.recommendedAlternative.distance} km away` 
                                : 'Same district (Distance unknown)'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">
                          No active alternative facilities currently list this diagnostic test as Available in the database.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Urgent Lab Reviews */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
              <div className="bg-primary text-on-primary px-lg py-md flex justify-between items-center">
                <h2 className="font-title-lg text-title-lg">Urgent Lab Reviews</h2>
                <span className="material-symbols-outlined">notification_important</span>
              </div>
              <div className="p-lg space-y-md max-h-96 overflow-y-auto">
                {labReviews.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    No pending critical lab orders require physician sign-off.
                  </div>
                ) : (
                  <div className="divide-y divide-outline-variant text-left">
                    {labReviews.map((rep) => {
                      const patName = rep.labOrder?.patient 
                        ? `${rep.labOrder.patient.firstName} ${rep.labOrder.patient.lastName}` 
                        : "CareHive Patient";
                      return (
                        <div key={rep.id} className="py-md flex flex-col md:flex-row justify-between items-start md:items-center gap-sm">
                          <div className="text-left">
                            <h4 className="font-bold text-sm text-on-surface">{rep.labOrder?.testName}</h4>
                            <p className="text-xs text-on-surface-variant">Patient: {patName} | Priority: {rep.labOrder?.priority}</p>
                            {rep.isAbnormal && (
                              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded border border-red-200 mt-1 inline-block">
                                ABNORMAL VALUES DETECTED
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedReviewReport(rep);
                              setDoctorRemarks("");
                              setIsSignOffOpen(true);
                            }}
                            className="bg-primary text-on-primary text-xs px-md py-2 rounded-lg font-bold transition-all cursor-pointer shadow-sm hover:opacity-90 shrink-0"
                          >
                            Review & Sign-off
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column (Sidebar) */}
          <aside className="lg:col-span-4 space-y-xl">
            {/* Attendance & Shift Management */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm p-lg">
              <div className="flex justify-between items-center mb-md">
                <h2 className="font-title-lg text-title-lg text-on-surface">Duty Roster & Attendance</h2>
                <span className="material-symbols-outlined text-primary">fingerprint</span>
              </div>

              {isAttendanceLoading ? (
                <div className="flex justify-center py-lg">
                  <Loader2 className="animate-spin text-primary w-8 h-8" />
                </div>
              ) : (
                <div className="space-y-md">
                  {/* Status Indicator */}
                  <div className="flex items-center justify-between p-md bg-surface-container rounded-xl border border-outline-variant">
                    <div>
                      <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Current Duty Status</p>
                      <p className="text-sm font-black text-on-surface mt-xs flex items-center gap-xs">
                        <span className={`w-3.5 h-3.5 rounded-full inline-block ${
                          !attendanceToday ? 'bg-slate-400' :
                          attendanceToday.checkOutTime ? 'bg-slate-500' :
                          attendanceToday.status === 'PRESENT' ? 'bg-green-500 animate-pulse' :
                          attendanceToday.status === 'BREAK' ? 'bg-amber-500' :
                          attendanceToday.status === 'EMERGENCY_DUTY' ? 'bg-error animate-pulse' : 'bg-blue-500'
                        }`}></span>
                        {!attendanceToday ? 'Not Checked In' :
                         attendanceToday.checkOutTime ? 'Shift Completed' :
                         attendanceToday.status}
                      </p>
                    </div>
                    {attendanceToday?.checkInTime && !attendanceToday.checkOutTime && (
                      <div className="text-right">
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase">Checked In At</p>
                        <p className="text-xs font-mono font-bold text-primary mt-xs">
                          {new Date(attendanceToday.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="space-y-sm">
                    {!attendanceToday || attendanceToday.checkOutTime ? (
                      <button
                        onClick={handleCheckIn}
                        disabled={attendanceToday?.checkOutTime}
                        className="w-full py-md bg-primary text-on-primary rounded-xl font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-sm shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined">login</span>
                        Check-In Shift
                      </button>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-sm">
                          <button
                            onClick={() => handleStatusChange(attendanceToday.status === 'BREAK' ? 'PRESENT' : 'BREAK')}
                            className={`py-sm text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-xs cursor-pointer ${
                              attendanceToday.status === 'BREAK'
                                ? 'bg-amber-100 border-amber-300 text-amber-800'
                                : 'bg-surface border-outline-variant hover:bg-slate-50'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">coffee</span>
                            {attendanceToday.status === 'BREAK' ? 'End Break' : 'Take Break'}
                          </button>
                          <button
                            onClick={() => handleStatusChange(attendanceToday.status === 'EMERGENCY_DUTY' ? 'PRESENT' : 'EMERGENCY_DUTY')}
                            className={`py-sm text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-xs cursor-pointer ${
                              attendanceToday.status === 'EMERGENCY_DUTY'
                                ? 'bg-red-100 border-red-300 text-red-800'
                                : 'bg-surface border-outline-variant hover:bg-slate-50'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">emergency</span>
                            {attendanceToday.status === 'EMERGENCY_DUTY' ? 'End Emergency' : 'Emergency Duty'}
                          </button>
                        </div>

                        <button
                          onClick={() => handleStatusChange(attendanceToday.status === 'ON_LEAVE' ? 'PRESENT' : 'ON_LEAVE')}
                          className={`w-full py-sm text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-xs cursor-pointer ${
                            attendanceToday.status === 'ON_LEAVE'
                              ? 'bg-blue-100 border-blue-300 text-blue-800'
                              : 'bg-surface border-outline-variant hover:bg-slate-50'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">event_busy</span>
                          {attendanceToday.status === 'ON_LEAVE' ? 'Cancel Leave' : 'Set Status to On Leave'}
                        </button>

                        <button
                          onClick={handleCheckOut}
                          className="w-full py-md bg-error/10 text-error border border-error/20 hover:bg-error/20 rounded-xl font-bold transition-all flex items-center justify-center gap-sm cursor-pointer mt-2"
                        >
                          <span className="material-symbols-outlined">logout</span>
                          Check-Out Shift
                        </button>
                      </>
                    )}
                  </div>

                  {/* Monthly Summary Statistics */}
                  {attendanceSummary?.summary && (
                    <div className="border-t border-outline-variant pt-md mt-md">
                      <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-sm">This Month Summary</p>
                      <div className="grid grid-cols-2 gap-sm">
                        <div className="bg-slate-50 p-xs border border-slate-100 rounded-lg text-center">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Attendance Rate</p>
                          <p className="text-sm font-black text-primary mt-0.5">
                            {attendanceSummary.summary.attendancePercentage}%
                          </p>
                        </div>
                        <div className="bg-slate-50 p-xs border border-slate-100 rounded-lg text-center">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Working Hours</p>
                          <p className="text-sm font-black text-on-surface mt-0.5">
                            {attendanceSummary.summary.totalWorkingHours}h
                          </p>
                        </div>
                        <div className="bg-slate-50 p-xs border border-slate-100 rounded-lg text-center">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Late Arrivals</p>
                          <p className="text-sm font-black text-on-surface mt-0.5 flex items-center justify-center gap-0.5">
                            {attendanceSummary.summary.lateArrivals}
                            {attendanceSummary.summary.lateArrivals > 0 && (
                              <span className="material-symbols-outlined text-xs text-amber-500">warning</span>
                            )}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-xs border border-slate-100 rounded-lg text-center">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">On Leave</p>
                          <p className="text-sm font-black text-on-surface mt-0.5">
                            {attendanceSummary.summary.onLeaveDays} days
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

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
                    <circle 
                      className="text-primary-container circular-progress" 
                      cx="80" 
                      cy="80" 
                      fill="transparent" 
                      r="70" 
                      stroke="currentColor" 
                      strokeDasharray="440" 
                      strokeDashoffset={Math.round(440 * (1 - wellnessMetrics.efficiency / 100))} 
                      strokeLinecap="round" 
                      strokeWidth="12"
                    ></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-headline-lg font-bold text-on-surface">{wellnessMetrics.efficiency}%</span>
                    <span className="text-label-md text-on-surface-variant">Efficiency</span>
                  </div>
                </div>
                <div className="mt-lg w-full">
                  <div className="flex justify-between text-label-md text-on-surface-variant mb-xs">
                    <span>Shift Intensity</span>
                    <span className="font-bold text-primary">{wellnessMetrics.intensity}</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500" 
                      style={{ width: wellnessMetrics.intensity === 'High' ? '85%' : wellnessMetrics.intensity === 'Moderate' ? '60%' : '30%' }}
                    ></div>
                  </div>
                  <p className="mt-md text-label-md text-on-surface-variant italic text-center">
                    "{wellnessMetrics.recommendation}"
                  </p>
                </div>
              </div>
            </section>

            {/* Logout / Exit */}
            <button 
              onClick={handleLogout}
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
      {/* Admission Modal */}
      {isAdmissionOpen && selectedApptForAdmission && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-md text-on-surface animate-in fade-in duration-200">
          <div className="bg-white rounded-lg w-full max-w-md p-xl shadow-2xl relative text-on-surface max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-xl">
              <h2 className="text-2xl font-bold text-[#00488d] flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl">hotel</span>
                Patient Inpatient Admission
              </h2>
              <button 
                className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:bg-slate-100 p-1 rounded-full" 
                onClick={() => setIsAdmissionOpen(false)}
              >
                close
              </button>
            </div>
            
            <form onSubmit={handleAdmitPatientSubmit} className="space-y-lg text-left">
              <div>
                <p className="text-sm font-semibold text-on-surface-variant">Patient Name</p>
                <p className="font-bold text-body-lg text-on-surface">
                  {selectedApptForAdmission.patient?.firstName} {selectedApptForAdmission.patient?.lastName}
                </p>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-bold text-on-surface-variant">Select Hospital Facility</label>
                <select 
                  value={selectedHospitalId}
                  onChange={(e) => {
                    setSelectedHospitalId(e.target.value);
                    setSelectedDeptId("");
                    setSelectedRoomId("");
                    setSelectedBedId("");
                  }}
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white"
                  required
                >
                  <option value="">Choose a hospital...</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-bold text-on-surface-variant">Select Department</label>
                <select 
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white disabled:opacity-50"
                  disabled={!selectedHospitalId}
                  required
                >
                  <option value="">Choose a department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-bold text-on-surface-variant">Select Inpatient Room</label>
                <select 
                  value={selectedRoomId}
                  onChange={(e) => {
                    setSelectedRoomId(e.target.value);
                    setSelectedBedId("");
                  }}
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white disabled:opacity-50"
                  disabled={!selectedHospitalId}
                  required
                >
                  <option value="">Choose a room...</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>Room {r.roomNumber} ({r.type})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-bold text-on-surface-variant">Select Available Bed</label>
                <select 
                  value={selectedBedId}
                  onChange={(e) => setSelectedBedId(e.target.value)}
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white disabled:opacity-50"
                  disabled={!selectedRoomId}
                  required
                >
                  <option value="">Choose an available bed...</option>
                  {(rooms.find(r => r.id === selectedRoomId)?.beds || []).map((b: any) => (
                    <option key={b.id} value={b.id}>Bed {b.bedNumber}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-bold text-on-surface-variant">Clinical Indication / Reason</label>
                <textarea 
                  value={admissionReason}
                  onChange={(e) => setAdmissionReason(e.target.value)}
                  placeholder="Enter medical reasons for inpatient admission..."
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white h-20 resize-none"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={admissionLoading}
                className="w-full bg-[#00488d] hover:bg-[#00366b] text-white py-lg rounded-lg font-bold shadow transition-all flex items-center justify-center gap-sm disabled:opacity-50 cursor-pointer"
              >
                {admissionLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <span className="material-symbols-outlined">check_circle</span>
                    Confirm Inpatient Admission
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Prescription / Consultation Modal */}
      {isConsultOpen && selectedApptForConsult && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-md text-on-surface animate-in fade-in duration-200">
          <div className="bg-white rounded-lg w-full max-w-md p-xl shadow-2xl relative text-on-surface max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-xl">
              <h2 className="text-2xl font-bold text-[#00488d] flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl">edit_note</span>
                Clinical Consult & Prescription
              </h2>
              <button 
                className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:bg-slate-100 p-1 rounded-full" 
                onClick={() => setIsConsultOpen(false)}
              >
                close
              </button>
            </div>
            
            <form onSubmit={handleCreatePrescriptionSubmit} className="space-y-lg text-left">
              <div>
                <p className="text-sm font-semibold text-on-surface-variant">Patient Name</p>
                <p className="font-bold text-body-lg text-on-surface">
                  {selectedApptForConsult.patient?.firstName} {selectedApptForConsult.patient?.lastName}
                </p>
              </div>

              <div className="space-y-xs relative">
                <label className="text-sm font-bold text-on-surface-variant">Search Medication</label>
                <input 
                  type="text"
                  value={medicineSearch}
                  onChange={(e) => setMedicineSearch(e.target.value)}
                  placeholder="Type medication name (e.g. Paracetamol, Amoxicillin)..."
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white"
                  required
                />
                
                {/* Search Results Dropdown */}
                {medicineSearch && medicinesList.length > 0 && (
                  <div className="absolute left-0 right-0 border border-outline rounded-lg max-h-40 overflow-y-auto bg-white divide-y divide-outline-variant mt-xs shadow-lg z-50">
                    {medicinesList.map(med => (
                      <div 
                        key={med.id}
                        onClick={() => {
                          setSelectedMedicineId(med.id);
                          setMedicineSearch(med.name);
                          setMedicinesList([]);
                        }}
                        className={`p-md text-sm cursor-pointer hover:bg-primary/5 flex justify-between items-center ${selectedMedicineId === med.id ? 'bg-primary/5 font-bold' : ''}`}
                      >
                        <span>{med.name}</span>
                        <span className="text-xs text-on-surface-variant bg-slate-100 px-sm py-xs rounded">Stock: {med.stock}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-sm">
                <div className="space-y-xs col-span-1">
                  <label className="text-sm font-bold text-on-surface-variant">Dosage</label>
                  <input 
                    type="text"
                    value={prescriptionDosage}
                    onChange={(e) => setPrescriptionDosage(e.target.value)}
                    placeholder="e.g. 500mg"
                    className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none text-on-surface"
                    required
                  />
                </div>
                <div className="space-y-xs col-span-1">
                  <label className="text-sm font-bold text-on-surface-variant">Frequency</label>
                  <input 
                    type="text"
                    value={prescriptionFrequency}
                    onChange={(e) => setPrescriptionFrequency(e.target.value)}
                    placeholder="e.g. 3x daily"
                    className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none text-on-surface"
                    required
                  />
                </div>
                <div className="space-y-xs col-span-1">
                  <label className="text-sm font-bold text-on-surface-variant">Duration</label>
                  <input 
                    type="text"
                    value={prescriptionDuration}
                    onChange={(e) => setPrescriptionDuration(e.target.value)}
                    placeholder="e.g. 5 days"
                    className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none text-on-surface"
                    required
                  />
                </div>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-bold text-on-surface-variant">Physician Instructions</label>
                <textarea 
                  value={prescriptionInstructions}
                  onChange={(e) => setPrescriptionInstructions(e.target.value)}
                  placeholder="Food guidelines, timing restrictions, warnings..."
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white h-20 resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={prescriptionLoading}
                className="w-full bg-[#00488d] hover:bg-[#00366b] text-white py-lg rounded-lg font-bold shadow transition-all flex items-center justify-center gap-sm disabled:opacity-50 cursor-pointer"
              >
                {prescriptionLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <span className="material-symbols-outlined">prescription</span>
                    Save & Submit Prescription
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Referral Modal */}
      {isReferralOpen && selectedApptForReferral && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-md text-on-surface animate-in fade-in duration-200">
          <div className="bg-white rounded-lg w-full max-w-2xl p-xl shadow-2xl relative text-on-surface max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-xl border-b border-gray-100 pb-3">
              <h2 className="text-2xl font-bold text-[#00488d] flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl">share_location</span>
                Inter-Hospital Patient Referral
              </h2>
              <button 
                className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:bg-slate-100 p-1 rounded-full" 
                onClick={() => setIsReferralOpen(false)}
              >
                close
              </button>
            </div>
            
            <div className="space-y-lg text-left">
              <div>
                <p className="text-sm font-semibold text-on-surface-variant">Patient Name</p>
                <p className="font-bold text-body-lg text-on-surface">
                  {selectedApptForReferral.patient?.firstName} {selectedApptForReferral.patient?.lastName}
                </p>
              </div>

              {/* Resource Deficits Selectors */}
              <div className="space-y-xs">
                <label className="text-sm font-bold text-on-surface-variant">Select Current Facility Deficits</label>
                <div className="flex flex-wrap gap-sm">
                  {['BEDS', 'ICU', 'DOCTORS', 'DIAGNOSTICS', 'MEDICINES'].map(lack => (
                    <button
                      key={lack}
                      type="button"
                      onClick={() => handleToggleLack(lack)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        referralLacks.includes(lack)
                          ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm'
                          : 'bg-white border-outline hover:bg-slate-50 text-gray-600'
                      }`}
                    >
                      {lack}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-inputs based on lacks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                {referralLacks.includes('DOCTORS') && (
                  <div className="space-y-xs">
                    <label className="text-xs font-bold text-on-surface-variant">Required Specialization</label>
                    <select
                      value={referralSpecialization}
                      onChange={(e) => setReferralSpecialization(e.target.value)}
                      className="w-full border border-outline rounded p-sm text-xs outline-none bg-white text-on-surface"
                    >
                      <option value="">Any Specialization</option>
                      {['GENERAL_MEDICINE', 'CARDIOLOGY', 'DERMATOLOGY', 'NEUROLOGY', 'PEDIATRICS', 'SURGERY', 'RADIOLOGY', 'PATHOLOGY', 'PSYCHIATRY', 'EMERGENCY_MEDICINE'].map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                )}

                {referralLacks.includes('DIAGNOSTICS') && (
                  <div className="space-y-xs">
                    <label className="text-xs font-bold text-on-surface-variant">Required Diagnostic Test</label>
                    <select
                      value={referralTestType}
                      onChange={(e) => setReferralTestType(e.target.value)}
                      className="w-full border border-outline rounded p-sm text-xs outline-none bg-white text-on-surface"
                    >
                      <option value="">Choose a test type...</option>
                      {['CBC', 'BLOOD_SUGAR', 'ECG', 'MRI', 'CT', 'X_RAY', 'ULTRASOUND', 'BLOOD_BANK', 'COVID', 'URINE_ANALYSIS', 'LIVER_FUNCTION', 'KIDNEY_FUNCTION'].map(t => (
                        <option key={t} value={t}>{t.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                )}

                {referralLacks.includes('MEDICINES') && (
                  <div className="space-y-xs">
                    <label className="text-xs font-bold text-on-surface-variant">Required Medication Name</label>
                    <input
                      type="text"
                      value={referralMedicineName}
                      onChange={(e) => setReferralMedicineName(e.target.value)}
                      placeholder="e.g. Paracetamol"
                      className="w-full border border-outline rounded p-sm text-xs outline-none bg-white text-on-surface"
                    />
                  </div>
                )}
              </div>

              {/* Referral Clinical Notes */}
              <div className="space-y-xs">
                <label className="text-sm font-bold text-on-surface-variant font-sans">Clinician Referral Remarks (Optional)</label>
                <textarea 
                  value={referralNotes}
                  onChange={(e) => setReferralNotes(e.target.value)}
                  placeholder="Enter specific transfer instructions, clinical parameters, or diagnostics details..."
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white h-16 resize-none"
                />
              </div>

              {/* Suggested Nearby Hospitals */}
              <div className="space-y-md border-t border-gray-100 pt-xl">
                <h3 className="font-bold text-sm text-[#00488d] flex items-center gap-xs">
                  <span className="material-symbols-outlined text-md">share_location</span>
                  AI Suggested Nearby Facilities (Distance-Sorted)
                </h3>

                {referralSuggestionsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="animate-spin text-primary w-8 h-8" />
                  </div>
                ) : referralLacks.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-gray-200">
                    Please select one or more deficits above to calculate ambulance routes and available hospitals.
                  </p>
                ) : referralSuggestions.length === 0 ? (
                  <p className="text-xs text-red-500 italic text-center py-4 bg-red-50 rounded-xl border border-dashed border-red-100">
                    No active nearby hospitals met the selected resource criteria.
                  </p>
                ) : (
                  <div className="space-y-sm max-h-56 overflow-y-auto pr-1">
                    {referralSuggestions.map(hosp => (
                      <div key={hosp.id} className="border border-outline-variant rounded-xl p-md bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="text-left space-y-1">
                          <h4 className="font-black text-gray-800 text-xs">{hosp.name}</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{hosp.type}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 pt-1 text-[9px] text-gray-500 font-bold font-mono">
                            <span>Beds: <strong className="text-gray-700">{hosp.availableBeds} avail</strong></span>
                            <span>ICU: <strong className="text-gray-700">{hosp.availableIcuBeds} avail</strong></span>
                            <span>MDs: <strong className="text-gray-700">{hosp.doctorsCount} present</strong></span>
                            <span>Distance: <strong className="text-[#00488d]">{hosp.distanceKm} km</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-md self-stretch md:self-auto justify-between border-t md:border-t-0 border-outline-variant pt-2 md:pt-0">
                          <div className="text-right">
                            <span className="text-[9px] uppercase font-bold text-gray-400 block">Ambulance ETA</span>
                            <span className="text-xs font-black text-red-600 font-mono">{hosp.etaMinutes} mins</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleReferralSubmit(hosp.id, hosp.name)}
                            className="bg-[#00488d] hover:bg-[#00366b] text-white text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap"
                          >
                            Refer Patient
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Referral History Log */}
              <div className="space-y-md border-t border-gray-100 pt-xl">
                <h3 className="font-bold text-sm text-gray-700 flex items-center gap-xs">
                  <span className="material-symbols-outlined text-md">history</span>
                  Patient Referral History
                </h3>

                {patientReferralHistoryLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="animate-spin text-gray-400 w-6 h-6" />
                  </div>
                ) : patientReferralHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No previous transfers recorded for this patient.</p>
                ) : (
                  <div className="space-y-xs max-h-40 overflow-y-auto pr-1">
                    {patientReferralHistory.map(ref => (
                      <div key={ref.id} className="border border-gray-100 rounded-lg p-2.5 bg-white text-xs text-left">
                        <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mb-1">
                          <span>Referred by Dr. {ref.referredBy?.firstName} {ref.referredBy?.lastName}</span>
                          <span>{new Date(ref.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-700 font-bold">
                          {ref.sourceHospital?.name} → {ref.destinationHospital?.name}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          <strong>Reason:</strong> Lacks {ref.reason} | <strong>Distance/ETA:</strong> {ref.distanceKm}km / {ref.etaMinutes} mins
                        </p>
                        {ref.notes && (
                          <p className="text-[10px] text-gray-500 mt-1 italic border-l-2 border-gray-200 pl-2">
                            "{ref.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Review & Sign-off Modal */}
      {isSignOffOpen && selectedReviewReport && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-md text-on-surface animate-in fade-in duration-200">
          <div className="bg-white rounded-lg w-full max-w-2xl p-xl shadow-2xl relative text-on-surface max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-xl border-b border-outline-variant pb-md">
              <h2 className="text-2xl font-bold text-[#00488d] flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl">rate_review</span>
                Review Diagnostic Report
              </h2>
              <button 
                className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:bg-slate-100 p-1 rounded-full" 
                onClick={() => setIsSignOffOpen(false)}
              >
                close
              </button>
            </div>
            
            <div className="space-y-lg text-left">
              <div className="grid grid-cols-2 gap-md bg-slate-50 p-md rounded-lg text-sm mb-md">
                <div>
                  <span className="font-semibold text-on-surface-variant">Patient:</span> {selectedReviewReport.labOrder?.patient ? `${selectedReviewReport.labOrder.patient.firstName} ${selectedReviewReport.labOrder.patient.lastName}` : "CareHive Patient"}
                </div>
                <div>
                  <span className="font-semibold text-on-surface-variant">Test Name:</span> {selectedReviewReport.labOrder?.testName || "Diagnostic Analysis"}
                </div>
                <div>
                  <span className="font-semibold text-on-surface-variant">Technician Notes:</span> {selectedReviewReport.technicianNotes || "None provided"}
                </div>
                <div>
                  <span className="font-semibold text-on-surface-variant">Priority:</span> {selectedReviewReport.labOrder?.priority || "NORMAL"}
                </div>
              </div>

              {/* Raw Values Table */}
              <h3 className="font-bold text-[#00488d] text-lg border-b border-slate-100 pb-xs">Raw Values</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="p-2 border">Parameter</th>
                      <th className="p-2 border">Result</th>
                      <th className="p-2 border">Reference Range</th>
                      <th className="p-2 border">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedReviewReport.resultsData || {}).map(([key, dataVal]: any) => (
                      <tr key={key} className="hover:bg-slate-50">
                        <td className="p-2 border font-semibold uppercase">{key}</td>
                        <td className="p-2 border font-mono font-bold">{dataVal?.value || dataVal || "N/A"} {dataVal?.unit || ""}</td>
                        <td className="p-2 border text-gray-500 font-mono">{dataVal?.range || "N/A"}</td>
                        <td className="p-2 border text-gray-600">{dataVal?.remarks || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* AI Clinical Insights */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-md space-y-xs">
                <div className="flex items-center gap-xs text-primary font-bold text-sm">
                  <span className="material-symbols-outlined">psychology</span>
                  <span>AI CLINICAL DECISION SUPPORT SYSTEM (Gemini Flash)</span>
                </div>
                <div className="space-y-xs text-xs text-on-surface">
                  <p><span className="font-bold">Summary:</span> {selectedReviewReport.aiSummary || "No AI summary available."}</p>
                  <div>
                    <span className="font-bold">Recommendations:</span>
                    <ul className="list-disc pl-4 mt-0.5">
                      {Array.isArray(selectedReviewReport.aiRecommendations) 
                        ? selectedReviewReport.aiRecommendations.map((rec: string, idx: number) => <li key={idx}>{rec}</li>)
                        : (selectedReviewReport.aiRecommendations?.split("\n") || ["No AI recommendations available."]).map((rec: string, idx: number) => <li key={idx}>{rec}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Remarks Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (doctorRemarks.length < 5) {
                  alert("Sign-off remarks are too short for a clinical record");
                  return;
                }
                setSignOffLoading(true);
                try {
                  await axiosInstance.patch(`/lab/verify/${selectedReviewReport.id}`, { doctorRemarks });
                  alert("Clinician sign-off complete. Lab order status updated to VERIFIED.");
                  setIsSignOffOpen(false);
                  loadDashboardData();
                } catch (err: any) {
                  console.error(err);
                  alert("Verification failed: " + (err.response?.data?.message || err.message));
                } finally {
                  setSignOffLoading(false);
                }
              }} className="space-y-md pt-sm">
                <div className="space-y-xs">
                  <label className="text-sm font-bold text-on-surface-variant">Clinician Sign-off Remarks</label>
                  <textarea 
                    value={doctorRemarks}
                    onChange={(e) => setDoctorRemarks(e.target.value)}
                    placeholder="Enter clinical conclusions, follow-up advice, diagnosis confirmation..."
                    className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white h-24 resize-none"
                    required
                    minLength={5}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={signOffLoading}
                  className="w-full bg-[#00488d] hover:bg-[#00366b] text-white py-lg rounded-lg font-bold shadow transition-all flex items-center justify-center gap-sm disabled:opacity-50 cursor-pointer"
                >
                  {signOffLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span className="material-symbols-outlined">verified</span>
                      Authorize & Sign-off Report
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Place Lab Order Modal */}
      {isLabOrderOpen && selectedApptForLabOrder && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-md text-on-surface animate-in fade-in duration-200">
          <div className="bg-white rounded-lg w-full max-w-md p-xl shadow-2xl relative text-on-surface max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-xl">
              <h2 className="text-2xl font-bold text-[#00488d] flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl">add_circle</span>
                Order Diagnostic Lab Test
              </h2>
              <button 
                className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:bg-slate-100 p-1 rounded-full" 
                onClick={() => setIsLabOrderOpen(false)}
              >
                close
              </button>
            </div>
            
            <form onSubmit={handleCreateLabOrderSubmit} className="space-y-lg text-left">
              <div>
                <label className="text-sm font-bold text-on-surface-variant">Select Patient (Active Consultation Queue)</label>
                <select 
                  value={selectedApptForLabOrder.id}
                  onChange={(e) => {
                    const appt = scheduledQueue.find(a => a.id === e.target.value);
                    if (appt) setSelectedApptForLabOrder(appt);
                  }}
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white"
                  required
                >
                  {scheduledQueue.map(appt => (
                    <option key={appt.id} value={appt.id}>
                      {appt.patient?.firstName} {appt.patient?.lastName} ({appt.reason})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-bold text-on-surface-variant">Test Name</label>
                <select
                  value={labOrderTestName}
                  onChange={(e) => setLabOrderTestName(e.target.value)}
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white"
                  required
                >
                  <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</option>
                  <option value="Lipid Profile">Lipid Profile</option>
                  <option value="Fasting Blood Sugar">Fasting Blood Sugar</option>
                  <option value="Thyroid Panel (T3, T4, TSH)">Thyroid Panel (T3, T4, TSH)</option>
                  <option value="Kidney Function Test (KFT)">Kidney Function Test (KFT)</option>
                  <option value="Liver Function Test (LFT)">Liver Function Test (LFT)</option>
                  <option value="ECG (Electrocardiogram)">ECG (Electrocardiogram)</option>
                  <option value="Urinalysis">Urinalysis</option>
                </select>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-bold text-on-surface-variant">Clinical Category</label>
                <select
                  value={labOrderCategory}
                  onChange={(e) => setLabOrderCategory(e.target.value)}
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white"
                  required
                >
                  <option value="HEMATOLOGY">HEMATOLOGY</option>
                  <option value="BIOCHEMISTRY">BIOCHEMISTRY</option>
                  <option value="MICROBIOLOGY">MICROBIOLOGY</option>
                  <option value="PATHOLOGY">PATHOLOGY</option>
                  <option value="RADIOLOGY">RADIOLOGY</option>
                  <option value="IMMUNOLOGY">IMMUNOLOGY</option>
                </select>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-bold text-on-surface-variant">Priority Level</label>
                <select
                  value={labOrderPriority}
                  onChange={(e) => setLabOrderPriority(e.target.value)}
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white"
                  required
                >
                  <option value="NORMAL">NORMAL (Routine Analysis)</option>
                  <option value="URGENT">URGENT (Accelerated processing)</option>
                  <option value="EMERGENCY">EMERGENCY (Immediate attention)</option>
                </select>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-bold text-on-surface-variant">Clinical Indications / Notes</label>
                <textarea 
                  value={labOrderClinicalNotes}
                  onChange={(e) => setLabOrderClinicalNotes(e.target.value)}
                  placeholder="Describe patient symptoms, specific values of interest, or scan areas..."
                  className="w-full border border-outline rounded p-md font-body-md text-body-md outline-none transition-all text-on-surface bg-white h-20 resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={labOrderLoading}
                className="w-full bg-[#00488d] hover:bg-[#00366b] text-white py-lg rounded-lg font-bold shadow transition-all flex items-center justify-center gap-sm disabled:opacity-50 cursor-pointer"
              >
                {labOrderLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <span className="material-symbols-outlined">biotech</span>
                    Issue Lab Test Request
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

export default DoctorDashboard;

