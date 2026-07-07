import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPatientProfile } from '../../api/patient.api';
import { 
  Calendar, Zap, FlaskConical, QrCode, 
  Pill, Stethoscope, Clock, Bell 
} from 'lucide-react';
import TopNavBar from '../../components/layout/TopNavBar';


const PatientOverview: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);


  useEffect(() => {
    getPatientProfile().then((data) => {
      // If your API returns data.data, use that
      setProfile(data.data || data);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <TopNavBar userName={user ? `${user.firstName || ''} ${user.lastName || ''}` : "Guest"} userRole="Patient Portal" />

      <main className="flex-grow w-full max-w-[1440px] mx-auto px-8 py-10 space-y-8">
        
        {/* Header */}
        <section>
          <h1 className="text-4xl font-bold text-[#191c1d]">Welcome back, {user?.firstName || 'User'}</h1>
          <p className="text-gray-500 font-medium mt-1">Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button className="flex items-center justify-center gap-3 bg-[#00488d] text-white py-6 rounded-2xl font-bold shadow-lg hover:brightness-110 transition-all">
            <Calendar size={20} /> Book Appointment
          </button>
          <button className="flex items-center justify-center gap-3 border border-[#00488d] text-[#00488d] py-6 rounded-2xl font-bold hover:bg-blue-50 transition-all">
            <FlaskConical size={20} /> Laboratory Results
          </button>
          <button className="flex items-center justify-center gap-3 border border-[#00488d] text-[#00488d] py-6 rounded-2xl font-bold hover:bg-blue-50 transition-all">
            <QrCode size={20} /> Medical QR
          </button>
        </section>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* Col 1: Health Summary */}
          <div className="col-span-12 md:col-span-4 bg-white border border-[#E0E0E0] p-8 rounded-3xl shadow-sm">
            <h2 className="text-xl font-bold mb-6">Health Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Blood Group", val: profile?.bloodGroup || "O+" },
                { label: "Age", val: `${profile?.age || 25} Yrs` },
                { label: "Height", val: `${profile?.height || 175} cm` },
                { label: "Weight", val: `${profile?.weight || 70} kg` },
                { label: "BMI", val: profile?.bmi || "22.5" },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-[#edeeef] rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-gray-500">{item.label}</p>
                  <p className="text-lg font-bold text-gray-800">{item.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2: Appointments & Insights */}
          <div className="col-span-12 md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border p-8 rounded-3xl">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Calendar size={20}/> Upcoming Appointment</h3>
              <p className="font-bold text-lg">{profile?.nextAppointment?.doctorName || "No Appointments"}</p>
              <p className="text-sm text-gray-500">{profile?.nextAppointment?.department}</p>
            </div>
            <div className="bg-white border p-8 rounded-3xl">
              <h3 className="font-bold mb-4">AI Health Insights</h3>
              <p className="text-sm text-gray-600">Respiratory metrics are optimal. Continue your current routine.</p>
            </div>
          </div>

          {/* Col 3: Lab Reports & Prescriptions */}
          <div className="col-span-12 md:col-span-6 bg-white border p-8 rounded-3xl">
            <h3 className="font-bold mb-4">Latest Lab Report</h3>
            <div className="flex justify-between p-4 bg-gray-50 rounded-xl">
              <span>CBC Test</span>
              <span className="text-green-600 font-bold">Normal</span>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 bg-white border p-8 rounded-3xl">
            <h3 className="font-bold mb-4">Active Prescriptions</h3>
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
              <Pill className="text-[#00488d]" />
              <div>
                <p className="font-bold">Amoxicillin 500mg</p>
                <p className="text-xs">3x daily • 7 days</p>
              </div>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
};
export default PatientOverview;