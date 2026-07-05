import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  getAppointments, 
  getDoctors, 
  createAppointment, 
  cancelAppointment 
} from '../../api/patient.api';
import { Loader2 } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location.state?.openBooking) {
      setIsBookingOpen(true);
    }
  }, [location.state]);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'COMPLETED' | 'CANCELLED'>('COMPLETED');

  // Booking Form State
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("09:00 AM");
  const [bookingReason, setBookingReason] = useState("Routine consultation");

  const [hospitalsList, setHospitalsList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");

  // Load hospitals when booking modal is opened
  useEffect(() => {
    if (isBookingOpen) {
      axiosInstance.get('/hospitals')
        .then(res => setHospitalsList(res.data.data || []))
        .catch(err => console.error("Failed to load hospitals list", err));
    }
  }, [isBookingOpen]);

  // Load departments when hospital changes
  useEffect(() => {
    if (selectedHospitalId) {
      axiosInstance.get(`/hospitals/${selectedHospitalId}/departments`)
        .then(res => setDepartmentsList(res.data.data || []))
        .catch(err => console.error("Failed to load departments list", err));
    } else {
      setDepartmentsList([]);
      setSelectedDepartmentId("");
    }
  }, [selectedHospitalId]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const [appts, docs] = await Promise.all([
        getAppointments(),
        getDoctors().catch(() => [])
      ]);
      setAppointmentsList(appts || []);
      setDoctorsList(docs || []);
    } catch (err: any) {
      console.error("Failed to load appointments/doctors", err);
      setErrorState(err.response?.data?.message || "Failed to establish secure link with appointments database.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await cancelAppointment(id);
      alert("Appointment cancelled successfully.");
      loadAllData();
    } catch (err: any) {
      alert("Failed to cancel: " + (err.response?.data?.message || err.message));
    }
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

      alert("Appointment scheduled successfully!");
      setIsBookingOpen(false);
      loadAllData();
    } catch (err: any) {
      alert("Booking failed: " + (err.response?.data?.message || err.message));
    } finally {
      setBookingLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
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

  const filteredDoctors = doctorsList.filter(d => {
    const matchHospital = selectedHospitalId ? d.department?.hospitalId === selectedHospitalId : true;
    const matchDept = selectedDepartmentId ? d.departmentId === selectedDepartmentId : true;
    const matchSpec = selectedSpecialization ? d.specialization === selectedSpecialization.toUpperCase() : true;
    return matchHospital && matchDept && matchSpec;
  });

  const upcomingAppts = appointmentsList.filter(a => a.status === 'SCHEDULED');
  const historyAppts = appointmentsList.filter(a => {
    if (activeHistoryTab === 'COMPLETED') {
      return a.status === 'COMPLETED' || a.status === 'NO_SHOW';
    } else {
      return a.status === 'CANCELLED';
    }
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

  return (
    <div className="space-y-xl text-on-surface">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-xl gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Appointment Management</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Review and schedule your clinical consultations.</p>
        </div>
        <button 
          onClick={() => setIsBookingOpen(true)}
          className="bg-primary text-on-primary font-label-lg text-label-lg px-lg py-md rounded-[4px] flex items-center gap-sm clinical-shadow hover:bg-primary-container transition-all active:scale-[0.98] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Book Appointment
        </button>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Left Column: Upcoming & History */}
        <div className="col-span-12 lg:col-span-8 space-y-xl">
          
          {/* Upcoming Appointments */}
          <section>
            <div className="flex items-center justify-between mb-md">
              <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Upcoming Appointments</h2>
              <span className="bg-primary-fixed text-on-primary-fixed-variant px-sm py-xs rounded-lg font-label-md text-label-md">
                {upcomingAppts.length} Scheduled
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              {upcomingAppts.length === 0 ? (
                <div className="md:col-span-2 record-card p-xl bg-white text-center text-gray-400">
                  <span className="material-symbols-outlined text-4xl block mb-2 text-slate-300">event_busy</span>
                  No upcoming appointments scheduled.
                  <button 
                    onClick={() => setIsBookingOpen(true)}
                    className="mt-4 mx-auto text-xs font-bold px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-1 hover:opacity-90 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Book New Appointment
                  </button>
                </div>
              ) : (
                upcomingAppts.map(appt => (
                  <div key={appt.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg clinical-shadow appointment-card transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-md">
                        <div className="flex items-center gap-md">
                          <div className="h-12 w-12 rounded-lg bg-surface-container overflow-hidden flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-3xl">person</span>
                          </div>
                          <div>
                            <h3 className="font-label-lg text-label-lg text-on-surface font-bold">
                              {appt.doctor ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}` : "Medical Practitioner"}
                            </h3>
                            <p className="font-label-md text-label-md text-on-surface-variant">
                              {appt.doctor?.specialization || "General Medicine"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-xs text-secondary">
                          <div className="w-2 h-2 rounded-full bg-secondary"></div>
                          <span className="font-label-md text-label-md font-bold uppercase tracking-wider">{appt.status}</span>
                        </div>
                      </div>
                      <div className="space-y-sm mb-lg">
                        <div className="flex items-center gap-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-[18px]">local_hospital</span>
                          <span className="font-body-md text-body-md">St. Mary's General Hospital</span>
                        </div>
                        <div className="flex items-center gap-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                          <span className="font-body-md text-body-md">
                            {formatDate(appt.appointmentDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-[18px]">schedule</span>
                          <span className="font-body-md text-body-md">
                            {formatTime(appt.appointmentDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-md pt-md border-t border-outline-variant">
                      <button 
                        onClick={() => {
                          setIsBookingOpen(true);
                          setSelectedDoctorId(appt.doctorId);
                        }}
                        className="flex-1 font-label-lg text-label-lg text-primary border border-primary py-sm rounded-lg hover:bg-primary-fixed transition-colors cursor-pointer"
                      >
                        Reschedule
                      </button>
                      <button 
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="flex-1 font-label-lg text-label-lg text-error border border-outline-variant py-sm rounded-lg hover:bg-error-container transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* History Section */}
          <section>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl clinical-shadow overflow-hidden">
              <div className="px-lg py-md border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
                <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Appointment History</h2>
                <div className="flex bg-surface-container-highest p-xs rounded-lg">
                  <button 
                    onClick={() => setActiveHistoryTab('COMPLETED')}
                    className={`px-lg py-xs font-label-md text-label-md rounded-md cursor-pointer ${activeHistoryTab === 'COMPLETED' ? 'bg-white text-primary font-bold shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                  >
                    Completed
                  </button>
                  <button 
                    onClick={() => setActiveHistoryTab('CANCELLED')}
                    className={`px-lg py-xs font-label-md text-label-md rounded-md cursor-pointer ${activeHistoryTab === 'CANCELLED' ? 'bg-white text-primary font-bold shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                  >
                    Cancelled
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low border-b border-outline-variant">
                    <tr>
                      <th className="px-lg py-md font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Date</th>
                      <th className="px-lg py-md font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Provider</th>
                      <th className="px-lg py-md font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Specialty</th>
                      <th className="px-lg py-md font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Outcome</th>
                      <th className="px-lg py-md"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {historyAppts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-lg py-md text-center text-gray-400 italic">
                          No history records matching tab state on file.
                        </td>
                      </tr>
                    ) : (
                      historyAppts.map(appt => (
                        <tr key={appt.id} className="hover:bg-surface-container transition-colors">
                          <td className="px-lg py-md">
                            <div className="font-label-lg text-label-lg text-on-surface">
                              {new Date(appt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="font-label-md text-label-md text-on-surface-variant">
                              {new Date(appt.appointmentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-lg py-md">
                            <div className="font-label-lg text-label-lg text-on-surface font-medium">
                              {appt.doctor ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}` : "Medical Personnel"}
                            </div>
                            <div className="font-label-md text-label-md text-on-surface-variant">St. Mary's General Hospital</div>
                          </td>
                          <td className="px-lg py-md font-label-md text-label-md text-on-surface-variant">
                            {appt.doctor?.specialization || "General Medicine"}
                          </td>
                          <td className="px-lg py-md">
                            <div className={`inline-flex items-center gap-xs px-sm py-xs rounded-full ${appt.status === 'CANCELLED' ? 'text-error bg-error-container/20' : 'text-secondary bg-secondary-container'}`}>
                              <span className="material-symbols-outlined text-[14px]">
                                {appt.status === 'CANCELLED' ? 'cancel' : 'check_circle'}
                              </span>
                              <span className="font-label-md text-label-md font-bold uppercase">{appt.status === 'CANCELLED' ? 'Cancelled' : 'Successful'}</span>
                            </div>
                          </td>
                          <td className="px-lg py-md text-right">
                            <button className="text-primary font-label-md text-label-md hover:underline cursor-pointer">View Notes</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Calendar & Filters */}
        <div className="col-span-12 lg:col-span-4 space-y-xl">
          {/* Mini Calendar */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg clinical-shadow">
            <div className="flex items-center justify-between mb-lg">
              <h3 className="font-label-lg text-label-lg font-bold text-on-surface">Schedule Overview</h3>
              <div className="flex gap-sm">
                <button className="p-xs hover:bg-surface-container rounded transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <button className="p-xs hover:bg-surface-container rounded transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>
            <div className="text-center font-label-md text-label-md mb-md font-medium text-on-surface">October 2024</div>
            <div className="grid grid-cols-7 gap-xs text-center">
              {["S", "M", "T", "W", "T", "F", "S"].map(d => (
                <span key={d} className="text-on-surface-variant font-label-md py-xs">{d}</span>
              ))}
              
              <span className="py-sm text-label-md text-outline-variant">26</span>
              <span className="py-sm text-label-md text-outline-variant">27</span>
              <span className="py-sm text-label-md text-outline-variant">28</span>
              <span className="py-sm text-label-md text-outline-variant">29</span>
              <span className="py-sm text-label-md text-outline-variant">30</span>
              
              {[...Array(23)].map((_, i) => (
                <span key={i} className="py-sm text-label-md text-on-surface font-medium hover:bg-surface-container-low rounded cursor-pointer">
                  {i + 1}
                </span>
              ))}
              
              <span className="py-sm text-label-md bg-primary text-on-primary rounded-full font-bold relative cursor-pointer">
                24
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
              </span>
              
              {[...Array(6)].map((_, i) => (
                <span key={i} className="py-sm text-label-md text-on-surface font-medium hover:bg-surface-container-low rounded cursor-pointer">
                  {i + 25}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Book Appointment Modal */}
      {isBookingOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-md text-on-surface">
          <div className="bg-white rounded-lg w-full max-w-md p-xl custom-shadow animate-in slide-in-from-bottom duration-300 relative text-on-surface">
            <div className="flex justify-between items-center mb-xl">
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Book Appointment</h2>
              <button 
                className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:bg-slate-100 p-1 rounded-full" 
                onClick={() => setIsBookingOpen(false)}
              >
                close
              </button>
            </div>
            <div className="space-y-lg">
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Select Hospital Facility</label>
                <select 
                  value={selectedHospitalId}
                  onChange={(e) => {
                    setSelectedHospitalId(e.target.value);
                    setSelectedDepartmentId("");
                    setSelectedDoctorId("");
                  }}
                  className="w-full border border-outline rounded p-md font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface bg-white"
                >
                  <option value="">Choose a hospital...</option>
                  {hospitalsList.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Select Department</label>
                <select 
                  value={selectedDepartmentId}
                  disabled={!selectedHospitalId}
                  onChange={(e) => {
                    setSelectedDepartmentId(e.target.value);
                    setSelectedDoctorId("");
                  }}
                  className="w-full border border-outline rounded p-md font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface bg-white disabled:opacity-50"
                >
                  <option value="">Choose a department...</option>
                  {departmentsList.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Filter by Specialization (Optional)</label>
                <select 
                  value={selectedSpecialization}
                  onChange={(e) => {
                    setSelectedSpecialization(e.target.value);
                    setSelectedDoctorId("");
                  }}
                  className="w-full border border-outline rounded p-md font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface bg-white"
                >
                  <option value="">Choose a specialization...</option>
                  <option value="Cardiology">General Cardiology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="General_Medicine">General Medicine</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Pediatrics">Pediatrics</option>
                </select>
              </div>

              <div className="space-y-sm">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Available Doctors</label>
                <div className="max-h-48 overflow-y-auto space-y-sm pr-2">
                  {filteredDoctors.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No active practitioners matching the chosen filters.</p>
                  ) : (
                    filteredDoctors.map(doc => (
                      <div 
                        key={doc.id}
                        onClick={() => setSelectedDoctorId(doc.id)}
                        className={`p-md border rounded-lg cursor-pointer transition-all flex justify-between items-center ${selectedDoctorId === doc.id ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary hover:bg-primary/5'}`}
                      >
                        <div>
                          <p className="font-label-lg text-label-lg font-bold text-on-surface">Dr. {doc.firstName} {doc.lastName}</p>
                          <p className="font-label-md text-label-md text-primary uppercase">{doc.specialization}</p>
                          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
                            {doc.department?.name || "General Department"}
                          </p>
                        </div>
                        {selectedDoctorId === doc.id && (
                          <span className="material-symbols-outlined text-primary">check_circle</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Preferred Date</label>
                <input 
                  type="date"
                  value={bookingDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full border border-outline rounded p-md font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface bg-white"
                />
              </div>

              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Preferred Time Slot</label>
                <div className="grid grid-cols-3 gap-sm">
                  {["09:00 AM", "11:00 AM", "02:00 PM", "04:15 PM"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBookingTime(t)}
                      className={`py-2 px-md border rounded-full font-label-md text-label-md transition-colors cursor-pointer text-center ${bookingTime === t ? 'border-primary bg-primary text-white' : 'border-primary text-primary hover:bg-primary/5'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Consultation Reason (Required)</label>
                <input 
                  type="text"
                  placeholder="Reason for booking..."
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  className="w-full border border-outline rounded p-md font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface bg-white"
                />
              </div>

              <button 
                onClick={handleBookAppointment}
                disabled={bookingLoading}
                className="w-full bg-primary text-on-primary py-lg rounded-lg font-label-lg text-label-lg shadow hover:opacity-90 transition-all flex items-center justify-center gap-sm disabled:opacity-50"
              >
                {bookingLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <span className="material-symbols-outlined">calendar_month</span>
                    Confirm Appointment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;