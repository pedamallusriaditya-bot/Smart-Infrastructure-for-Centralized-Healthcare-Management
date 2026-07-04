import React, { useState } from 'react';

const Dashboard = () => {
  // Mock data from the Stitch HTML
  const patient = {
    name: "John Doe",
    bloodGroup: "O+",
    age: "35",
    height: "175 cm",
    weight: "70 kg",
    bmi: "22.9",
  };

  const appointment = {
    doctorName: "Dr. Sarah Chen",
    department: "Cardiology",
    hospital: "Central General Hospital",
    date: "Today",
    time: "10:30 AM",
    status: "Confirmed",
  };

  const doctor = {
    photo: "https://via.placeholder.com/150",
    name: "Dr. Sarah Chen",
    specialization: "Cardiologist",
    department: "Cardiology",
    hospital: "Central General Hospital",
  };

  // Modal states
  const [bookingModal, setBookingModal] = useState(false);
  const [qrModal, setQRModal] = useState(false);
  const [labModal, setLabModal] = useState(false);
  const [emergencyModal, setEmergencyModal] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);

  // Modal handlers
  const openModal = () => setBookingModal(true);
  const closeModal = () => setBookingModal(false);
  const openQRModal = () => setQRModal(true);
  const closeQRModal = () => setQRModal(false);
  const openLabModal = () => setLabModal(true);
  const closeLabModal = () => setLabModal(false);
  const openEmergencyModal = () => {
    setEmergencyModal(true);
    // Simulate location detection after 2 seconds
    setTimeout(() => {
      setLocationDetected(true);
    }, 2000);
  };
  const closeEmergencyModal = () => {
    setEmergencyModal(false);
    setLocationDetected(false);
  };

  return (
    <>
      {/* Tailwind config script from Stitch HTML - not needed as we use PostCSS */}
      {/* We'll include the custom styles from the <style> tag in the Stitch HTML */}
      <style>
        {`
          body { font-family: 'Inter', sans-serif; }
          .fade-in { opacity: 0; transform: translateY(10px); animation: fadeIn 0.6s ease-out forwards; }
          @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } }
          .stagger-1 { animation-delay: 0.1s; }
          .stagger-2 { animation-delay: 0.2s; }
          .stagger-3 { animation-delay: 0.3s; }
          .stagger-4 { animation-delay: 0.4s; }
          .stagger-5 { animation-delay: 0.5s; }

          .custom-shadow { box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.05); }
          .card-border { border: 1px solid #E0E0E0; }

          .activity-line::before {
              content: '';
              position: absolute;
              left: 7px;
              top: 24px;
              bottom: 0;
              width: 2px;
              background: #E1E3E4;
          }
          .activity-line:last-child::before { display: none; }
        `}
      </style>

      {/* TopAppBar */}
      <header className="bg-surface dark:bg-[#d9dadb] border-b border-[#c2c6d4] dark:border-[#c2c6d4] flex justify-between items-center w-full px-6 md:px-8 h-16 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="font-headline-lg text-headline-lg font-bold text-primary dark:text-[#a8c8ff]">CareHive</span>
        </div>
        <nav className="hidden md:flex gap-4 items-center">
          <a
            className="text-primary font-bold font-title-lg text-title-lg bg-[#e7e8e9] px-3 py-1 rounded"
            href="#"
          >
            Dashboard
          </a>
          <a
            className="text-on-surface-variant font-title-lg text-title-lg hover:bg-[#e7e8e9] transition-colors px-3 py-1 rounded"
            href="#"
          >
            Logout
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <button
            className="material-symbols-outlined text-primary cursor-pointer active:opacity-80 p-2 rounded-full hover:bg-[#e7e8e9] transition-colors"
            onClick={() => alert('Help clicked')}
          >
            help_outline
          </button>
          <button
            className="material-symbols-outlined text-primary cursor-pointer active:opacity-80 p-2 rounded-full hover:bg-[#e7e8e9] transition-colors"
            onClick={() => document.documentElement.classList.toggle('dark')}
          >
            dark_mode
          </button>
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
            {patient.name.charAt(0)}{patient.name.split(' ')[1]?.charAt(0) ?? ''}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-4 md:px-8 py-8">
        {/* Header Section */}
        <section className="fade-in stagger-1">
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
            Welcome back, {patient.name}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-xs">
            Today is {appointment.date}
          </p>
        </section>

        {/* Quick Actions (Mobile First) */}
        <section className="fade-in stagger-2 grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            className="flex items-center justify-center gap-2 bg-primary text-on-primary py-3 px-5 rounded-lg font-label-md text-label-md shadow-md hover:opacity-90 transition-all cursor-pointer"
            onClick={openModal}
          >
            <span className="material-symbols-outlined">calendar_today</span>
            Book Appointment
          </button>
          <button
            className="flex items-center justify-center gap-2 bg-error text-on-error py-3 px-5 rounded-lg font-label-md text-label-md shadow-md hover:opacity-90 transition-all cursor-pointer"
            onClick={openEmergencyModal}
          >
            <span className="material-symbols-outlined">emergency_share</span>
            SOS / Emergency
          </button>
          <button
            className="flex items-center justify-center gap-2 border border-primary text-primary py-3 px-5 rounded-lg font-label-md text-label-md hover:bg-primary/5 transition-all cursor-pointer"
            onClick={openLabModal}
          >
            <span className="material-symbols-outlined">science</span>
            Laboratory Results
          </button>
          <button
            className="flex items-center justify-center gap-2 border border-primary text-primary py-3 px-5 rounded-lg font-label-md text-label-md hover:bg-primary/5 transition-all cursor-pointer"
            onClick={openQRModal}
          >
            <span className="material-symbols-outlined">qr_code_2</span>
            Medical QR
          </button>
        </section>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Row 2: 3-column layout */}
          {/* Health Summary */}
          <div className="md:col-span-4 fade-in stagger-3 bg-white card-border custom-shadow p-[20px] rounded-lg flex flex-col justify-between">
            <div>
              <h2 className="font-title-lg text-title-lg text-on-surface mb-3">Health Summary</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-surface-container rounded-lg flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Blood Group</span>
                  <span className="font-title-lg text-title-lg text-primary">{patient.bloodGroup}</span>
                </div>
                <div className="p-3 bg-surface-container rounded-lg flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Age</span>
                  <span className="font-title-lg text-title-lg text-on-surface">{patient.age}</span>
                </div>
                <div className="p-3 bg-surface-container rounded-lg flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Height</span>
                  <span className="font-body-lg text-body-lg text-on-surface">{patient.height}</span>
                </div>
                <div className="p-3 bg-surface-container rounded-lg flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Weight</span>
                  <span className="font-body-lg text-body-lg text-on-surface">{patient.weight}</span>
                </div>
                <div className="p-3 bg-surface-container rounded-lg flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">BMI</span>
                  <span className="font-body-lg text-body-lg text-on-surface">{patient.bmi}</span>
                </div>
                <div className="p-3 bg-surface-container rounded-lg flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Emergency Status</span>
                  <span className="font-body-lg text-body-lg text-on-surface">Waiting for Response</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Appointment */}
          <div className="md:col-span-4 fade-in stagger-4 bg-white card-border custom-shadow p-[20px] rounded-lg flex flex-col">
            <div className="flex items-center gap-2 mb-3 text-primary">
              <span className="material-symbols-outlined">event</span>
              <h2 className="font-title-lg text-title-lg text-on-surface">Upcoming Appointment</h2>
            </div>
            <div className="flex-grow space-y-2 mb-5">
              <p className="font-label-md text-label-md text-on-surface">{appointment.doctorName}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {appointment.department} • {appointment.hospital}
              </p>
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-body-sm">calendar_month</span>
                <span className="font-body-sm">{appointment.date} at {appointment.time}</span>
              </div>
              <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded text-label-md uppercase">{appointment.status}</span>
            </div>
            <button
              className="w-full text-center py-2 border-t border-[#c2c6d4] text-primary font-label-md text-label-md hover:bg-[#f3f4f5] transition-colors cursor-pointer"
            >
              View Appointment
            </button>
          </div>

          {/* AI Health Insights */}
          <div className="md:col-span-4 fade-in stagger-5 bg-white card-border custom-shadow p-[20px] rounded-lg overflow-hidden relative group">
            <div className="relative z-10 flex flex-col h-full">
              <h3 className="font-title-lg text-title-lg mb-2 text-on-surface">AI Health Insights</h3>
              <div className="space-y-3 flex-grow">
                <div>
                  <p className="font-label-md text-on-surface-variant uppercase">Health Summary</p>
                  <p className="font-body-sm text-on-surface">Respiratory metrics showing positive trends.</p>
                </div>
                <div>
                  <p className="font-label-md text-on-surface-variant uppercase">Risk Level</p>
                  <p className="font-body-sm text-secondary font-bold">LOW</p>
                </div>
                <div>
                  <p className="font-label-md text-on-surface-variant uppercase">Preventive Suggestions</p>
                  <p className="font-body-sm text-on-surface">Maintain daily walking routine.</p>
                </div>
              </div>
              <button
                className="mt-4 w-full text-center py-2 border-t border-[#c2c6d4] text-primary font-label-md text-label-md hover:bg-[#f3f4f5] transition-colors cursor-pointer"
              >
                View Detailed Analysis
              </button>
            </div>
            <span
              className="material-symbols-outlined absolute -right-1 -bottom-1 text-[96px] text-primary opacity-10 group-hover:rotate-12 transition-transform"
            >
              insights
            </span>
          </div>

          {/* Row 3: Full-width Medical Timeline */}
          <div className="md:col-span-6 bg-white card-border custom-shadow p-[20px] rounded-lg flex flex-col">
            <h2 className="font-title-lg text-title-lg text-on-surface mb-3">Latest Laboratory Report</h2>
            <div className="flex-grow space-y-3 mb-5">
              <div className="flex justify-between border-b border-[#c2c6d4] pb-2">
                <span className="text-body-sm text-on-surface-variant">Test Name</span>
                <span className="text-body-sm font-bold">Complete Blood Count</span>
              </div>
              <div className="flex justify-between border-b border-[#c2c6d4] pb-2">
                <span className="text-body-sm text-on-surface-variant">Report Date</span>
                <span className="text-body-sm">Oct 24, 2024</span>
              </div>
              <div className="flex justify-between border-b border-[#c2c6d4] pb-2">
                <span className="text-body-sm text-on-surface-variant">AI Analysis</span>
                <span className="text-body-sm text-secondary">Completed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body-sm text-on-surface-variant">Overall Result</span>
                <span className="text-body-sm font-bold text-primary">Normal</span>
              </div>
            </div>
            <div className="flex gap-3 border-t border-[#c2c6d4] pt-3">
              <button
                className="flex-grow text-center py-2 text-primary font-label-md hover:bg-[#f3f4f5] transition-colors"
              >
                View Report
              </button>
              <button
                className="flex-grow text-center py-2 text-primary font-label-md hover:bg-[#f3f4f5] transition-colors"
              >
                Download PDF
              </button>
            </div>
          </div>

          <div className="md:col-span-6 bg-white card-border custom-shadow p-[20px] rounded-lg flex flex-col">
            <h2 className="font-title-lg text-title-lg text-on-surface mb-3">Current Prescription</h2>
            <div className="flex-grow space-y-3 mb-5">
              <div className="p-3 bg-surface-container rounded-lg">
                <p className="font-label-md text-on-surface">Amoxicillin 500mg</p>
                <p className="text-body-sm text-on-surface-variant">1 capsule • 3 times daily • 7 days</p>
              </div>
              <div className="p-3 bg-surface-container rounded-lg">
                <p className="font-label-md text-on-surface">Lisinopril 10mg</p>
                <p className="text-body-sm text-on-surface-variant">1 tablet • Once daily • Ongoing</p>
              </div>
            </div>
            <button
              className="w-full text-center py-2 border-t border-[#c2c6d4] text-primary font-label-md text-label-md hover:bg-[#f3f4f5] transition-colors cursor-pointer"
            >
              View Full Prescription
            </button>
          </div>

          {/* Row 4: Assigned Doctor & Medical Timeline */}
          <div className="md:col-span-6 bg-white card-border custom-shadow p-[20px] rounded-lg flex flex-col">
            <h2 className="font-title-lg text-title-lg text-on-surface mb-3">Assigned Doctor</h2>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden flex items-center justify-center">
                <img
                  src={doctor.photo}
                  alt={doctor.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-title-lg text-on-surface">{doctor.name}</p>
                <p className="text-primary font-label-md">{doctor.specialization}</p>
                <p className="text-body-sm text-on-surface-variant">
                  {doctor.department} • {doctor.hospital}
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-3 border-t border-[#c2c6d4]">
              <button
                className="flex-grow text-center py-2 text-primary font-label-md hover:bg-[#f3f4f5] transition-colors"
              >
                View Profile
              </button>
              <button
                className="flex-grow text-center py-2 text-primary font-label-md hover:bg-[#f3f4f5] transition-colors"
              >
                Book Follow-up
              </button>
            </div>
          </div>

          <div className="md:col-span-6 bg-white card-border custom-shadow p-[20px] rounded-lg flex flex-col">
            <h2 className="font-title-lg text-title-lg text-on-surface mb-3">Medical Timeline</h2>
            <div className="space-y-0">
              <div className="relative activity-line pb-3 flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0 z-10"></div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface">Consultation: General Checkup</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Today • General Hospital</p>
                </div>
              </div>
              <div className="relative activity-line pb-3 flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-[#e1e3e4] mt-1.5 shrink-0 z-10"></div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface">Prescription Updated: Amoxicillin</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Yesterday • Dr. Sarah Chen</p>
                </div>
              </div>
              <div className="relative activity-line pb-3 flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-[#e1e3e4] mt-1.5 shrink-0 z-10"></div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface">Lab Report: CBC Results</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">2 days ago • BioPath Labs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 5: Notifications (wide) & Quick Access (full-width) */}
          <div className="md:col-span-8 bg-white card-border custom-shadow p-[20px] rounded-lg">
            <h2 className="font-title-lg text-title-lg text-on-surface mb-4">Notifications</h2>
            <div className="space-y-3">
              <div className="flex gap-2 p-3 hover:bg-[#f3f4f5] rounded transition-colors">
                <span className="material-symbols-outlined text-primary">event</span>
                <p className="text-body-sm">Appointment tomorrow at 10:00 AM</p>
              </div>
              <div className="flex gap-2 p-3 hover:bg-[#f3f4f5] rounded transition-colors">
                <span className="material-symbols-outlined text-secondary">science</span>
                <p className="text-body-sm">New lab report available for download</p>
              </div>
              <div className="flex gap-2 p-3 hover:bg-[#f3f4f5] rounded transition-colors">
                <span className="material-symbols-outlined text-primary">medication</span>
                <p className="text-body-sm">Prescription updated by Dr. Chen</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 bg-white card-border custom-shadow p-[20px] rounded-lg">
            <h2 className="font-title-lg text-title-lg text-on-surface mb-3">Quick Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="bg-white card-border p-3 rounded-lg text-center hover:border-primary cursor-pointer transition-all">
                <span className="material-symbols-outlined text-primary mb-1">folder_shared</span>
                <p className="text-label-md">Medical Records</p>
              </div>
              <div className="bg-white card-border p-3 rounded-lg text-center hover:border-primary cursor-pointer transition-all">
                <span className="material-symbols-outlined text-primary mb-1">history</span>
                <p className="text-label-md">Appointment History</p>
              </div>
              <div className="bg-white card-border p-3 rounded-lg text-center hover:border-primary cursor-pointer transition-all">
                <span className="material-symbols-outlined text-primary mb-1">biotech</span>
                <p className="text-label-md">Lab Reports</p>
              </div>
              <div className="bg-white card-border p-3 rounded-lg text-center hover:border-primary cursor-pointer transition-all">
                <span className="material-symbols-outlined text-primary mb-1">emergency</span>
                <p className="text-label-md">Emergency History</p>
              </div>
              <div className="bg-white card-border p-3 rounded-lg text-center hover:border-primary cursor-pointer transition-all">
                <span className="material-symbols-outlined text-primary mb-1">person</span>
                <p className="text-label-md">Profile</p>
              </div>
              <div className="bg-white card-border p-3 rounded-lg text-center hover:border-primary cursor-pointer transition-all">
                <span className="material-symbols-outlined text-primary mb-1">logout</span>
                <p className="text-label-md">Logout</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Booking Modal */}
      <div
        className={`fixed inset-0 bg-black/50 z-[100] items-center justify-center p-4 ${bookingModal ? 'flex' : 'hidden'}`}
        id="bookingModal"
      >
        <div
          className="bg-white rounded-lg w-full max-w-md p-[20px] custom-shadow animate-in slide-in-from-bottom duration-300"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Book Appointment</h2>
            <button
              className="material-symbols-outlined text-on-surface-variant cursor-pointer"
              onClick={closeModal}
            >
              close
            </button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant">Select Specialization</label>
              <select
                className="w-full border border-outline rounded p-3 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              >
                <option value="">Choose a specialization...</option>
                <option value="cardiology">General Cardiology</option>
                <option value="neurology">Neurology</option>
                <option value="dermatology">Dermatology</option>
                <option value="pediatrics">Pediatrics</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="font-label-md text-label-md text-on-surface-variant">Available Doctors</label>
              <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                {/* Doctor Card 1 */}
                <div
                  className="p-3 border border-outline-variant rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group border-primary bg-primary/5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-label-md text-label-md text-on-surface group-hover:text-primary">Dr. Sarah Chen</p>
                      <p className="font-label-sm text-label-sm text-primary">Cardiology</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Central General Hospital</p>
                    </div>
                    <span
                      className="material-symbols-outlined text-primary group-hover:opacity-100 transition-opacity"
                    >
                      check_circle
                    </span>
                  </div>
                </div>
                {/* Doctor Card 2 */}
                <div
                  className="p-3 border border-outline-variant rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-label-md text-label-md text-on-surface group-hover:text-primary">Dr. Marcus Thorne</p>
                      <p className="font-label-sm text-label-sm text-primary">Cardiology</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">City Medical Center</p>
                    </div>
                    <span
                      className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      check_circle
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2 animate-in fade-in">
              <label className="font-label-md text-label-md text-on-surface-variant">Available Time Slots</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className="py-1 px-3 border border-primary text-primary rounded-full font-label-sm text-label-sm hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  09:00 AM
                </button>
                <button
                  className="py-1 px-3 border border-outline-variant text-on-surface-variant rounded-full font-label-sm text-label-sm opacity-50 cursor-not-allowed"
                  disabled
                >
                  10:30 AM
                </button>
                <button
                  className="py-1 px-3 border border-primary text-primary rounded-full font-label-sm text-label-sm hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  11:00 AM
                </button>
                <button
                  className="py-1 px-3 border border-primary text-primary rounded-full font-label-sm text-label-sm hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  02:00 PM
                </button>
                <button
                  className="py-1 px-3 border border-outline-variant text-on-surface-variant rounded-full font-label-sm text-label-sm opacity-50 cursor-not-allowed"
                  disabled
                >
                  03:30 PM
                </button>
                <button
                  className="py-1 px-3 border border-primary text-primary rounded-full font-label-sm text-label-sm hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  04:15 PM
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-label-md text-label-md text-on-surface-variant">Preferred Date</label>
              <input
                className="w-full border border-outline rounded p-3 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                type="date"
              />
            </div>
            <button
              className="w-full bg-primary text-on-primary py-3 rounded-lg font-label-md text-label-md shadow hover:opacity-90 transition-all flex items-center justify-center gap-2"
              onClick={closeModal}
            >
              <span className="material-symbols-outlined">calendar_month</span>
              Confirm Appointment
            </button>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      <div
        className={`fixed inset-0 bg-black/50 z-[100] items-center justify-center p-4 ${qrModal ? 'flex' : 'hidden'}`}
        id="qrModal"
      >
        <div
          className="bg-white rounded-lg w-full max-w-md p-[20px] custom-shadow animate-in slide-in-from-bottom duration-300 relative"
        >
          <button
            className="material-symbols-outlined absolute right-2 top-2 text-on-surface-variant cursor-pointer"
            onClick={closeQRModal}
          >
            close
          </button>
          <div className="flex flex-col items-center gap-4">
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface text-center">Medical QR ID</h2>
            <div
              className="w-20 h-20 bg-white p-0.5 border-2 border-primary rounded-lg overflow-hidden"
            >
              <img
                alt="Medical QR Code"
                className="w-full h-full object-contain"
                src="https://via.placeholder.com/150"
              />
            </div>
            <div className="w-full space-y-2 bg-surface-container p-3 rounded-lg">
              <div className="flex justify-between">
                <span className="text-label-sm text-on-surface-variant uppercase">Patient</span>
                <span className="text-label-md font-bold text-on-surface">John Doe</span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-sm text-on-surface-variant uppercase">Blood Group</span>
                <span className="text-label-md font-bold text-error">O+</span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-sm text-on-surface-variant uppercase">Emergency Contact</span>
                <span className="text-label-md font-bold text-on-surface">+1 555-0199</span>
              </div>
            </div>
            <p className="text-center text-body-sm text-on-surface-variant px-3">
              Scan this code at any CareHive certified clinic to share your medical history securely.
            </p>
            <button
              className="w-full bg-primary text-on-primary py-3 rounded-lg font-label-md text-label-md shadow hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">download</span>Download QR Code
            </button>
          </div>
        </div>
      </div>

      {/* Lab Modal */}
      <div
        className={`fixed inset-0 bg-black/50 z-[100] items-center justify-center p-4 ${labModal ? 'flex' : 'hidden'}`}
        id="labModal"
      >
        <div
          className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col custom-shadow animate-in slide-in-from-bottom duration-300 overflow-hidden"
        >
          <div
            className="flex justify-between items-start p-4 border-b border-[#c2c6d4]"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">science</span>
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Lab Results Detail</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-0.5 text-primary font-label-sm hover:bg-primary/5 px-2 py-1 rounded"
              >
                <span className="material-symbols-outlined">picture_as_pdf</span>Export PDF
              </button>
              <button
                className="material-symbols-outlined text-on-surface-variant cursor-pointer"
                onClick={closeLabModal}
              >
                close
              </button>
            </div>
          </div>
          <div className="flex border-b border-[#c2c6d4] px-4">
            <button
              className="px-4 py-2 border-b-2 border-primary text-primary font-label-sm"
            >
              Overview
            </button>
            <button
              className="px-4 py-2 text-on-surface-variant font-label-sm hover:bg-[#f3f4f5]"
            >
              Historical Trends
            </button>
            <button
              className="px-4 py-2 text_on-surface-variant font-label-sm hover:bg-[#f3f4f5]"
            >
              AI Interpretation
            </button>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-5">
            <section>
              <h3 className="font-title-lg text-title-lg mb-3">Current Results</h3>
              <table
                className="w-full text-left border-collapse"
              >
                <thead className="bg-surface-container">
                  <tr className="text-label-sm text-on-surface-variant uppercase">
                    <th className="p-3">Test Name</th>
                    <th className="p-3">Result</th>
                    <th className="p-3">Reference Range</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-body-sm">
                  <tr className="border-b border-[#c2c6d4]">
                    <td className="p-3">Glucose (Fasting)</td>
                    <td className="p-3 font-bold text-error">110 mg/dL</td>
                    <td className="p-3">70 - 99 mg/dL</td>
                    <td className="p-3"><span className="bg-error/10 text-error px-2 py-0.5 rounded text-label-sm">ABNORMAL</span></td>
                  </tr>
                  <tr className="border-b border-[#c2c6d4]">
                    <td className="p-3">Hemoglobin A1c</td>
                    <td className="p-3 font-bold">5.4%</td>
                    <td className="p-3">4.0 - 5.6%</td>
                    <td className="p-3"><span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded text-label-sm">NORMAL</span></td>
                  </tr>
                  <tr className="border-b border-[#c2c6d4]">
                    <td className="p-3">Total Cholesterol</td>
                    <td className="p-3 font-bold">185 mg/dL</td>
                    <td className="p-3">200 mg/dL</td>
                    <td className="p-3"><span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded text-label-sm">NORMAL</span></td>
                  </tr>
                </tbody>
              </table>
            </section>
            <section>
              <h3 className="font-title-lg title-lg mb-3">AI Interpretation</h3>
              <div
                className="p-4 bg-primary/5 rounded-lg border border-primary/20"
              >
                <p className="text-body-sm text-on-surface mb-2">
                  Your fasting glucose levels are slightly elevated compared to your previous baseline. This may be due to recent dietary changes or stress levels.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    className="p-3 bg-white rounded border border-error/30 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-error">warning</span>
                    <div>
                      <p className="text-label-sm text-on-surface-variant uppercase">Flagged Value</p>
                      <p className="text-body-sm font-bold text-error">Glucose: 110 mg/dL</p>
                    </div>
                  </div>
                  <div
                    className="p-3 bg-white rounded border border-[#c2c6d4] flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-primary">info</span>
                    <div>
                      <p className="text-label-sm text-on-surface-variant uppercase">Recommendation</p>
                      <p className="text-body-sm">Monitor carbohydrate intake</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Emergency Modal */}
      <div
        className={`fixed inset-0 bg-black/50 z-[100] items-center justify-center p-4 ${emergencyModal ? 'flex' : 'hidden'}`}
        id="emergencyModal"
      >
        <div
          className="bg-white rounded-lg w-full max-w-md p-[20px] custom-shadow animate-in slide-in-from-bottom duration-300 relative"
          id="emergencyModalContent"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Emergency Assistance</h2>
              <p className="text-body-sm text-on-surface-variant">
                Provide a few details before sending your emergency request.
              </p>
            </div>
            <button
              className="material-symbols-outlined text-on-surface-variant cursor-pointer"
              onClick={closeEmergencyModal}
            >
              close
            </button>
          </div>
          <div className="space-y-4" id="emergencyForm">
            <div className="space-y-2">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase">Emergency Reason</label>
              <div className="grid grid-cols-1 gap-2">
                <label
                  className="flex items-center gap-2 p-3 border border-[#c2c6d4] rounded-lg cursor-pointer hover:bg-[#f3f4f5]"
                >
                  <input
                    className="w-4 h-4 text-error focus:ring-error"
                    name="reason"
                    type="radio"
                    value="Chest Pain"
                  />
                  <span className="text-body-sm">Chest Pain</span>
                </label>
                <label
                  className="flex items-center gap-2 p-3 border border-[#c2c6d4] rounded-lg cursor-pointer hover:bg-[#f3f4f5]"
                >
                  <input
                    className="w-4 h-4 text-error focus:ring-error"
                    name="reason"
                    type="radio"
                    value="Difficulty Breathing"
                  />
                  <span className="text-body-sm">Difficulty Breathing</span>
                </label>
                <label
                  className="flex items-center gap-2 p-3 border border-[#c2c6d4] rounded-lg cursor-pointer hover:bg-[#f3f4f5]"
                >
                  <input
                    className="w-4 h-4 text-error focus:ring-error"
                    name="reason"
                    type="radio"
                    value="Accident / Injury"
                  />
                  <span className="text-body-sm">Accident / Injury</span>
                </label>
                <label
                  className="flex items-center gap-2 p-3 border border-[#c2c6d4] rounded-lg cursor-pointer hover:bg-[#f3f4f5]"
                >
                  <input
                    className="w-4 h-4 text-error focus:ring-error"
                    name="reason"
                    type="radio"
                    value="Other"
                  />
                  <span className="text-body-sm">Other</span>
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase">Additional Description (Optional)</label>
              <textarea
                className="w-full border border-outline rounded p-3 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all h-10"
                placeholder="Describe your emergency or provide any additional information."
              />
            </div>
            <div className="p-3 bg-surface-container rounded-lg flex items-center gap-2">
              <span
                className="material-symbols-outlined text-primary animate-pulse"
              >
                location_on
              </span>
              <div>
                <p className="text-label-sm font-bold text-primary">
                  {locationDetected ? 'Location detected successfully.' : 'Detecting your location...'}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  {locationDetected
                    ? 'Your current location has been detected on this device.'
                    : 'Your current location is being detected on this device.'}
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-3">
              <button
                className="flex-grow py-1 border border-[#c2c6d4] rounded font-label-sm text-on-surface-variant hover:bg-[#f3f4f5] transition-colors"
                onClick={closeEmergencyModal}
              >
                Cancel
              </button>
              <button
                className="flex-grow py-1 bg-error text-on-error rounded font-label-md shadow hover:opacity-90 transition-all"
                onClick={closeEmergencyModal}
              >
                Send Emergency Alert
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;