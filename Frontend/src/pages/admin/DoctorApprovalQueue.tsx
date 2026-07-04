import React, { useEffect, useState } from 'react';
import { getPendingDoctors, reviewDoctor } from '../../api/admin.api';
import { User, CheckCircle, XCircle, Clock, BadgeCheck } from 'lucide-react';
import TopNavBar from '../../components/layout/TopNavBar';
import AdminSidebar from '../../components/layout/AdminSidebar';

const DoctorApprovalQueue: React.FC = () => {
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const data = await getPendingDoctors();
      setPendingDocs(data);
    } catch (err) {
      console.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await reviewDoctor(id, status);
      // Remove from list locally for instant UI feedback
      setPendingDocs(pendingDocs.filter(doc => doc.id !== id));
    } catch (err) {
      alert("Action failed. Check permissions.");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="ml-64 flex-1">
        <TopNavBar userName="Admin Office" userRole="SYSTEM_ADMIN" />
        
        <div className="p-10 max-w-5xl">
          <header className="mb-10">
             <div className="flex items-center gap-3 text-[#00488d] mb-2">
               <BadgeCheck className="w-8 h-8" />
               <h1 className="text-3xl font-black tracking-tight">Clinical Credentialing</h1>
             </div>
             <p className="text-gray-500">Verify medical licenses and designate doctors to hospital departments.</p>
          </header>

          {loading ? (
            <div className="flex justify-center py-20"><Clock className="animate-spin text-blue-800" /></div>
          ) : pendingDocs.length === 0 ? (
            <div className="bg-white border p-12 rounded-3xl text-center">
              <p className="font-bold text-gray-400 text-lg uppercase tracking-widest">Queue is Clear</p>
              <p className="text-sm text-gray-400">No practitioners currently awaiting verification.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingDocs.map((doc) => (
                <div key={doc.id} className="bg-white border border-gray-200 p-6 rounded-2xl flex items-center justify-between shadow-sm hover:border-blue-300 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-[#00488d]">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">Dr. {doc.firstName} {doc.lastName}</h3>
                      <div className="flex gap-4 mt-1">
                         <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                            {doc.specialization}
                         </span>
                         <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-black">
                            LIC: {doc.licenseNumber}
                         </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleReview(doc.id, 'REJECTED')}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Reject Application"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => handleReview(doc.id, 'APPROVED')}
                      className="px-6 py-3 bg-[#00488d] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#00366d] shadow-lg shadow-blue-100"
                    >
                      <CheckCircle className="w-4 h-4" /> Designate Doctor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DoctorApprovalQueue;