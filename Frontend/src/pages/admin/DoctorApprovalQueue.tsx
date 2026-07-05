import React, { useEffect, useState } from 'react';
import { getPendingDoctors, reviewDoctor } from '../../api/admin.api';
import { User, CheckCircle, XCircle, Clock, BadgeCheck } from 'lucide-react';

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
      alert(`Practitioner application updated to ${status}.`);
    } catch (err) {
      alert("Action failed. Check permissions.");
    }
  };

  return (
    <div className="max-w-5xl space-y-xl font-sans text-on-surface">
      <header className="mb-8">
        <div className="flex items-center gap-3 text-[#00488d] mb-2">
          <BadgeCheck className="w-8 h-8" />
          <h1 className="text-3xl font-black tracking-tight">Clinical Credentialing Queue</h1>
        </div>
        <p className="text-on-surface-variant text-body-md">Verify medical licenses and designate doctors to hospital departments.</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Clock className="animate-spin text-primary w-10 h-10" /></div>
      ) : pendingDocs.length === 0 ? (
        <div className="bg-surface border border-outline-variant p-12 rounded-2xl text-center">
          <p className="font-bold text-on-surface-variant text-lg uppercase tracking-widest">Queue is Clear</p>
          <p className="text-sm text-on-surface-variant mt-sm">No practitioners currently awaiting verification.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingDocs.map((doc) => (
            <div key={doc.id} className="bg-surface border border-outline-variant p-6 rounded-2xl flex items-center justify-between shadow-sm hover:border-primary transition-all">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-surface-container-low rounded-full flex items-center justify-center text-primary">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-on-surface">Dr. {doc.firstName} {doc.lastName}</h3>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                      {doc.specialization}
                    </span>
                    <span className="text-[10px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded font-black">
                      LIC: {doc.licenseNumber}
                    </span>
                    <span className="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded font-black uppercase">
                      Dept: {doc.department?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleReview(doc.id, 'REJECTED')}
                  className="p-3 text-error hover:bg-error/5 rounded-xl transition-all cursor-pointer" title="Reject Application"
                >
                  <XCircle className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => handleReview(doc.id, 'APPROVED')}
                  className="px-6 py-3 bg-[#00488d] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#00366d] shadow-lg shadow-blue-100 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" /> Designate Doctor
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorApprovalQueue;