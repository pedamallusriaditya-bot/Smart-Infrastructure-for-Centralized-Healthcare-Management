import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { 
  Loader2, 
  Building2, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

const PendingHospitals: React.FC = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Rejection modal state
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED'>('PENDING_APPROVAL');

  useEffect(() => {
    loadHospitals();
  }, [activeTab]);

  const loadHospitals = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const response = await axiosInstance.get('/app-admin/hospitals', {
        params: { status: activeTab }
      });
      setHospitals(response.data.data || []);
    } catch (err: any) {
      console.error(err);
      setErrorState(err.response?.data?.message || "Failed to load hospital registrations.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to approve "${name}" hospital registration and activate their administrator account?`)) return;
    setActionLoading(true);
    try {
      await axiosInstance.post(`/app-admin/hospitals/${id}/approve`);
      alert(`Hospital "${name}" has been successfully approved and activated.`);
      loadHospitals();
    } catch (err: any) {
      console.error(err);
      alert("Approval failed: " + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to suspend "${name}"? This will deactivate all associated administrator accounts.`)) return;
    setActionLoading(true);
    try {
      await axiosInstance.post(`/app-admin/hospitals/${id}/suspend`);
      alert(`Hospital "${name}" has been suspended.`);
      loadHospitals();
    } catch (err: any) {
      console.error(err);
      alert("Suspension failed: " + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to activate "${name}"? This will reactivate associated administrator accounts.`)) return;
    setActionLoading(true);
    try {
      await axiosInstance.post(`/app-admin/hospitals/${id}/activate`);
      alert(`Hospital "${name}" has been activated.`);
      loadHospitals();
    } catch (err: any) {
      console.error(err);
      alert("Activation failed: " + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (id: string) => {
    setSelectedHospitalId(id);
    setRejectionReason("");
    setIsRejectOpen(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospitalId || !rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      await axiosInstance.post(`/app-admin/hospitals/${selectedHospitalId}/reject`, {
        rejectionReason
      });
      alert("Hospital registration rejected.");
      setIsRejectOpen(false);
      loadHospitals();
    } catch (err: any) {
      console.error(err);
      alert("Rejection failed: " + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-on-surface p-6">
      
      {/* Header */}
      <header className="max-w-7xl mx-auto w-full mb-6">
        <Link 
          to="/app-admin/dashboard" 
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#00488d] hover:underline mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to District Command Center
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">Manage District Facilities</h1>
            <p className="text-sm text-gray-500 mt-1">Review registrations, activate clinics, or suspend facilities within the District Health Jurisdiction.</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto w-full mb-6 border-b border-gray-200 flex gap-4">
        <button 
          onClick={() => setActiveTab('PENDING_APPROVAL')}
          className={`pb-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === 'PENDING_APPROVAL' ? 'border-[#00488d] text-[#00488d]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Pending Approval ({activeTab === 'PENDING_APPROVAL' ? hospitals.length : 'Pending'})
        </button>
        <button 
          onClick={() => setActiveTab('ACTIVE')}
          className={`pb-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === 'ACTIVE' ? 'border-[#00488d] text-[#00488d]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Active / Operating Facilities
        </button>
        <button 
          onClick={() => setActiveTab('REJECTED')}
          className={`pb-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === 'REJECTED' ? 'border-[#00488d] text-[#00488d]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Suspended / Rejected Requests
        </button>
      </div>

      {/* Hospital List Container */}
      <main className="max-w-7xl mx-auto w-full flex-grow">
        {loading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="animate-spin w-10 h-10 text-[#00488d]" />
          </div>
        ) : errorState ? (
          <div className="p-4 bg-red-50 text-red-700 font-bold rounded-xl border border-red-100">{errorState}</div>
        ) : hospitals.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium text-lg">No hospital registrations found in this category.</p>
            <p className="text-xs text-gray-400 mt-1">Pending registrations will show here for district review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hospitals.map((h) => {
              const admin = h.admins?.[0];
              const regDate = new Date(h.createdAt).toLocaleDateString();
              
              return (
                <div key={h.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    {/* Header Info */}
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div>
                        <h2 className="text-lg font-black text-gray-800">{h.name}</h2>
                        <span className="inline-block mt-1 px-2.5 py-1 bg-blue-50 text-[#00488d] rounded-md font-bold text-[10px] uppercase">
                          {h.type || 'PHC'}
                        </span>
                      </div>
                      
                      {/* Status label */}
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                        h.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                        h.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {h.status === 'REJECTED' ? 'SUSPENDED/REJECTED' : h.status}
                      </span>
                    </div>

                    {/* Details section */}
                    <div className="space-y-2.5 text-xs text-gray-500 border-t border-gray-100 pt-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span>{h.address}, {h.district}, {h.state} - {h.pincode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>Facility Phone: {h.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>Registered On: {regDate}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[10px] text-gray-400">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>Lat: {h.latitude?.toFixed(4)}, Lon: {h.longitude?.toFixed(4)}</span>
                      </div>
                    </div>

                    {/* Admin section */}
                    {admin && (
                      <div className="mt-4 bg-gray-50 p-3 rounded-xl space-y-2 border border-gray-100 text-xs text-gray-600">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Assigned Administrator</p>
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-bold text-gray-700">{admin.firstName} {admin.lastName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span>{admin.user?.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{admin.mobileNumber || 'N/A'}</span>
                        </div>
                      </div>
                    )}

                    {/* Rejection reason details */}
                    {h.status === 'REJECTED' && h.rejectionReason && (
                      <div className="mt-4 bg-red-50 p-3 rounded-xl border border-red-100 text-xs text-red-700">
                        <p className="font-bold">Rejection Reason:</p>
                        <p className="mt-1 font-medium italic">"{h.rejectionReason}"</p>
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  {h.status === 'PENDING_APPROVAL' && (
                    <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handleApprove(h.id, h.name)}
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button 
                        onClick={() => handleOpenReject(h.id)}
                        disabled={actionLoading}
                        className="border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  )}

                  {h.status === 'ACTIVE' && (
                    <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1">
                      <button 
                        onClick={() => handleSuspend(h.id, h.name)}
                        disabled={actionLoading}
                        className="bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Suspend Hospital
                      </button>
                    </div>
                  )}

                  {h.status === 'REJECTED' && (
                    <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1">
                      <button 
                        onClick={() => handleActivate(h.id, h.name)}
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Activate / Reinstate Hospital
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Rejection comments modal */}
      {isRejectOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 text-on-surface animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Rejection Reason</h3>
            <p className="text-xs text-gray-400 mb-4">State the reason why this hospital registration cannot be approved.</p>
            
            <form onSubmit={handleRejectSubmit} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">Reason / Remarks</label>
                <textarea 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Duplicate registration or incomplete credentials verification."
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none bg-white text-on-surface h-24 resize-none"
                  required
                />
              </div>
              
              <div className="flex gap-4">
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="flex-grow bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold shadow transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer"
                >
                  Confirm Rejection
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsRejectOpen(false)}
                  className="px-6 border border-gray-200 text-gray-500 hover:bg-gray-50 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingHospitals;
