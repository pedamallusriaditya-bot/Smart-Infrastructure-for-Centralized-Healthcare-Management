import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPatientProfile } from '../../api/patient.api';
import { Activity, Calendar, Zap, Heart, QrCode, Beaker, Loader2 } from 'lucide-react';
import TopNavBar from '../../components/layout/TopNavBar';


const PatientOverview: React.FC = () => {
  const { user } = useAuth(); // GET THE LOGGED IN USER
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getPatientProfile();
        setProfile(data);
      } catch (err) {
        console.error("Failed to load clinical profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // --- LOGIC: HELPER CALCULATIONS ---
  const calculateAge = (dob: string) => {
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    const difference = Date.now() - birthDate.getTime();
    return Math.abs(new Date(difference).getUTCFullYear() - 1970);
  };

  const calculateBMI = (weight: number, height: number) => {
    if (!weight || !height) return "N/A";
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-12">
      <TopNavBar 
        userName={`${user?.firstName} ${user?.lastName}`} 
        userRole={`Patient ID: ${profile?.id.substring(0, 8)}`} 
      />

      <main className="max-w-7xl mx-auto px-8 pt-10 space-y-10">
        
        {/* WELCOME SECTION (DYNAMIC) */}
        <section className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
              Welcome back, <span className="text-[#00488d]">{user?.firstName}</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-4">
             <button className="flex items-center gap-2 px-8 py-3.5 bg-[#00488d] text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:brightness-110 transition-all">
                <Calendar size={18} /> Book Appointment
             </button>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-8">
          
          {/* STATS SECTION (DYNAMIC FROM DB) */}
          <div className="col-span-8 space-y-8">
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <Heart className="text-red-500 mb-4" />
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Blood Group</p>
                <p className="text-xl font-bold text-slate-800">{profile?.bloodGroup || "Pending"}</p>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <Activity className="text-blue-500 mb-4" />
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Calculated Age</p>
                <p className="text-xl font-bold text-slate-800">{calculateAge(profile?.dateOfBirth)} Years</p>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <Zap className="text-yellow-500 mb-4" />
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Current BMI</p>
                <p className="text-xl font-bold text-slate-800">{calculateBMI(profile?.weight, profile?.height)}</p>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <Activity className="text-green-500 mb-4" />
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Weight (KG)</p>
                <p className="text-xl font-bold text-slate-800">{profile?.weight || "0.0"} kg</p>
              </div>
            </div>

            {/* ... Rest of UI (Upcoming visit etc) remains same but with profile values ... */}
          </div>

          <div className="col-span-4 space-y-8">
             {/* THE REAL QR CODE PASS */}
             <div className="bg-[#00488d] p-8 rounded-[2.5rem] text-white text-center shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 opacity-60">Medical Pass ID</p>
                <div className="bg-white p-4 inline-block rounded-3xl mb-6 shadow-inner">
                   {/* In next step, we will call getPatientQR API to generate real QR here */}
                   <QrCode className="text-slate-900 w-32 h-32" />
                </div>
                <p className="text-xs font-medium text-blue-100">Scan for clinical profile: {user?.firstName} {user?.lastName}</p>
             </div>
          </div>
        </div>
      </main>

    </div>
  );
};

export default PatientOverview;