import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getRedistributionStatus,
  generateRecommendations,
  getTransfersList,
  approveTransfer,
  rejectTransfer
} from '../../api/redistribution.api';
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  Zap,
  Building2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  HelpCircle,
  Truck,
  Users,
  Database,
  Search,
  Check,
  X,
  FileText
} from 'lucide-react';

const ResourceRedistribution: React.FC = () => {
  const navigate = useNavigate();
  const [hospitalsStatus, setHospitalsStatus] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Rejection modal states
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Tab states
  const [activeSubTab, setActiveSubTab] = useState<'RECOMMENDATIONS' | 'HISTORY'>('RECOMMENDATIONS');
  const [resourceFilter, setResourceFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const [statusData, transfersData] = await Promise.all([
        getRedistributionStatus(),
        getTransfersList()
      ]);
      setHospitalsStatus(statusData || []);
      setTransfers(transfersData || []);
    } catch (err: any) {
      console.error(err);
      setErrorState(err.response?.data?.message || "Failed to load logistics datasets.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    setGenerating(true);
    setErrorState(null);
    try {
      const recommendations = await generateRecommendations();
      alert(`AI Resource Redistribution Analysis Complete: Generated ${recommendations.length} new recommendations.`);
      // Refresh list
      const transfersData = await getTransfersList();
      setTransfers(transfersData || []);
    } catch (err: any) {
      console.error(err);
      alert("AI Analysis failed: " + (err.response?.data?.message || err.message));
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to approve and execute the transfer of "${name}"?`)) return;
    setActionLoading(true);
    try {
      await approveTransfer(id);
      alert("Transfer approved and registered successfully in the system audit logs.");
      // Refresh status matrix and history list
      const [statusData, transfersData] = await Promise.all([
        getRedistributionStatus(),
        getTransfersList()
      ]);
      setHospitalsStatus(statusData || []);
      setTransfers(transfersData || []);
    } catch (err: any) {
      console.error(err);
      alert("Approval execution failed: " + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (id: string) => {
    setSelectedTransferId(id);
    setRejectionReason('');
    setIsRejectOpen(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransferId || !rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      await rejectTransfer(selectedTransferId, rejectionReason);
      alert("Recommendation rejected and archived.");
      setIsRejectOpen(false);
      // Refresh
      const transfersData = await getTransfersList();
      setTransfers(transfersData || []);
    } catch (err: any) {
      console.error(err);
      alert("Rejection failed: " + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityBadge = (hospital: any) => {
    const isBedShortage = hospital.beds.available <= 2;
    const isMedicineShortage = hospital.inventory.some((i: any) => i.quantity <= i.minQuantity);
    const isLabOverload = hospital.pendingLabs > 12;
    const isEmergencyOverload = hospital.activeEmergencies > 2;

    if (isBedShortage || isEmergencyOverload) {
      return (
        <span className="flex items-center gap-1 text-[10px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-bold">
          <AlertTriangle className="w-3 h-3" /> Critical Status
        </span>
      );
    } else if (isMedicineShortage || isLabOverload) {
      return (
        <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
          <AlertTriangle className="w-3 h-3" /> Imbalanced
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold">
        <CheckCircle2 className="w-3 h-3" /> Optimal
      </span>
    );
  };

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'MEDICINE':
        return <span className="material-symbols-outlined text-purple-600 bg-purple-50 p-2 rounded-xl text-lg font-bold">pill</span>;
      case 'BLOOD':
        return <span className="material-symbols-outlined text-red-600 bg-red-50 p-2 rounded-xl text-lg font-bold">bloodtype</span>;
      case 'DOCTOR':
        return <span className="material-symbols-outlined text-blue-600 bg-blue-50 p-2 rounded-xl text-lg font-bold">medical_services</span>;
      case 'NURSE':
        return <span className="material-symbols-outlined text-cyan-600 bg-cyan-50 p-2 rounded-xl text-lg font-bold">face</span>;
      case 'AMBULANCE':
        return <span className="material-symbols-outlined text-orange-600 bg-orange-50 p-2 rounded-xl text-lg font-bold">airport_shuttle</span>;
      case 'EQUIPMENT':
      default:
        return <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-2 rounded-xl text-lg font-bold">hardware</span>;
    }
  };

  const filteredTransfers = transfers.filter(t => {
    if (activeSubTab === 'RECOMMENDATIONS' && t.status !== 'PENDING') return false;
    if (activeSubTab === 'HISTORY' && t.status === 'PENDING') return false;
    if (resourceFilter !== 'ALL' && t.resourceType !== resourceFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-on-surface p-6">
      
      {/* Back to Platform supervision */}
      <header className="max-w-7xl mx-auto w-full mb-6">
        <Link 
          to="/app-admin/dashboard" 
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#00488d] hover:underline mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Platform Supervision
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2">
              AI Resource Redistribution
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Compare regional resources, identify critical shortages, and approve AI-driven transfer recommendations.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchInitialData}
              className="bg-white border border-gray-200 text-gray-700 font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
            <button
              onClick={handleGenerateAI}
              disabled={generating}
              className="bg-gradient-to-r from-[#00488d] to-[#005fb8] text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all relative overflow-hidden group"
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" /> Analyzing Regional Hubs...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 animate-pulse text-yellow-300" />
                  <span>Run AI Optimization</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex h-[50vh] items-center justify-center flex-grow">
          <div className="text-center space-y-4">
            <Loader2 className="animate-spin w-12 h-12 text-[#00488d] mx-auto" />
            <p className="text-gray-500 font-medium">Gathering clinical and logistics datasets...</p>
          </div>
        </div>
      ) : errorState ? (
        <div className="max-w-7xl mx-auto w-full p-4 bg-red-50 text-red-700 font-bold rounded-xl border border-red-100 mb-6">
          {errorState}
        </div>
      ) : (
        <div className="max-w-7xl mx-auto w-full space-y-8">

          {/* Hospital Resource Comparison Matrix */}
          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#00488d]" />
                <h2 className="font-black text-xl text-gray-800 tracking-tight">Hospital Resource Matrix</h2>
              </div>
              <span className="text-xs text-gray-400 font-semibold">Comparing {hospitalsStatus.length} Active Facilities</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hospitalsStatus.map((hospital, index) => {
                const bedOccupancyRate = Math.round((hospital.beds.occupied / hospital.beds.total) * 100) || 0;

                return (
                  <div key={hospital.id} className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      {/* Name and badge */}
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div>
                          <h3 className="font-extrabold text-lg text-gray-800">{hospital.name}</h3>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cupertino District</span>
                        </div>
                        {getSeverityBadge(hospital)}
                      </div>

                      {/* Stat Grid */}
                      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                          <p className="text-[10px] uppercase font-extrabold text-gray-400">Available Beds</p>
                          <p className="text-lg font-black text-gray-800 mt-1">{hospital.beds.available} / {hospital.beds.total}</p>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${bedOccupancyRate > 90 ? 'bg-red-500' : bedOccupancyRate > 70 ? 'bg-amber-500' : 'bg-green-500'}`} 
                              style={{ width: `${bedOccupancyRate}%` }}
                            />
                          </div>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                          <p className="text-[10px] uppercase font-extrabold text-gray-400">Staff On Duty</p>
                          <p className="text-lg font-black text-gray-800 mt-1">
                            {hospital.doctors.reduce((sum: number, d: any) => sum + d.count, 0)} Doc | {hospital.nurses.totalCount} Nur
                          </p>
                          <span className="text-[9px] text-gray-400 font-bold block mt-1">Active Medical Staff</span>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                          <p className="text-[10px] uppercase font-extrabold text-gray-400">Ambulances</p>
                          <p className="text-lg font-black text-gray-800 mt-1">{hospital.ambulances}</p>
                          <span className="text-[9px] text-gray-400 font-bold block mt-1">Emergency Fleet</span>
                        </div>
                      </div>

                      {/* Load Status Indicator */}
                      <div className="grid grid-cols-2 gap-4 mb-4 text-xs font-semibold text-gray-600">
                        <div className="flex justify-between items-center border border-gray-100 rounded-lg px-3 py-2 bg-gray-50/50">
                          <span>Pending Lab Orders:</span>
                          <span className={`px-2 py-0.5 rounded font-black ${hospital.pendingLabs > 12 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}`}>
                            {hospital.pendingLabs}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border border-gray-100 rounded-lg px-3 py-2 bg-gray-50/50">
                          <span>Active Emergencies:</span>
                          <span className={`px-2 py-0.5 rounded font-black ${hospital.activeEmergencies > 2 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
                            {hospital.activeEmergencies}
                          </span>
                        </div>
                      </div>

                      {/* Inventory Stock list (Preview) */}
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Inventory Stock Status</h4>
                        <div className="space-y-1.5">
                          {hospital.inventory.map((item: any, idx: number) => {
                            const isLow = item.quantity <= item.minQuantity;
                            return (
                              <div key={idx} className="flex justify-between items-center text-xs border border-gray-50/50 p-2 rounded-lg hover:bg-gray-50/20">
                                <span className="font-semibold text-gray-700">{item.name} <span className="text-[10px] text-gray-400">({item.category})</span></span>
                                <span className={`font-black px-2 py-0.5 rounded ${isLow ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                  {item.quantity} units {isLow && "(Low)"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Transfers Navigation Tabs & Action Center */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Content Area (Tab Selector & Transfers List) */}
            <div className="lg:col-span-12 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveSubTab('RECOMMENDATIONS')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeSubTab === 'RECOMMENDATIONS' ? 'border-[#00488d] text-[#00488d]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    AI Redistribution Plans
                  </button>
                  <button
                    onClick={() => setActiveSubTab('HISTORY')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeSubTab === 'HISTORY' ? 'border-[#00488d] text-[#00488d]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    Logistics Transfer History
                  </button>
                </div>

                {/* Filter controls */}
                <div className="flex gap-2">
                  {['ALL', 'MEDICINE', 'BLOOD', 'DOCTOR', 'NURSE', 'AMBULANCE', 'EQUIPMENT'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setResourceFilter(type)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${resourceFilter === type ? 'bg-[#00488d] text-white border-[#00488d]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTransfers.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-bold">No transfers or recommendations found matching the filter criteria.</p>
                  <p className="text-xs text-gray-400 mt-1">Run AI Optimization to compare hospitals and discover potential transfer options.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTransfers.map((transfer) => (
                    <div 
                      key={transfer.id}
                      className={`border rounded-xl p-5 hover:shadow-sm transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${transfer.status === 'COMPLETED' ? 'border-green-100 bg-green-50/10' : transfer.status === 'REJECTED' ? 'border-red-100 bg-red-50/10' : 'border-gray-100 bg-white'}`}
                    >
                      {/* Left: Info */}
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          {getResourceTypeIcon(transfer.resourceType)}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm text-gray-800">
                              Transfer {transfer.quantity} {transfer.resourceName}
                            </span>
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-black uppercase">
                              {transfer.resourceType}
                            </span>
                            {transfer.status === 'COMPLETED' && (
                              <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold">
                                Completed
                              </span>
                            )}
                            {transfer.status === 'REJECTED' && (
                              <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-bold">
                                Rejected
                              </span>
                            )}
                          </div>
                          
                          {/* Route information */}
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 font-semibold">
                            <span className="text-gray-700 font-black">{transfer.sourceHospital.name}</span>
                            <span className="text-[#00488d] font-bold">➔</span>
                            <span className="text-gray-700 font-black">{transfer.destinationHospital.name}</span>
                          </div>

                          {/* Reason */}
                          <p className="text-xs text-gray-500 mt-2 bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                            <span className="font-extrabold text-gray-700 block mb-0.5">AI Analysis Reason:</span>
                            {transfer.reason}
                          </p>

                          {/* Rejection comment */}
                          {transfer.status === 'REJECTED' && transfer.rejectionReason && (
                            <p className="text-xs text-red-700 mt-2 bg-red-50 border border-red-100 rounded-lg p-2.5">
                              <span className="font-extrabold block mb-0.5">Rejection Reason:</span>
                              {transfer.rejectionReason}
                            </p>
                          )}

                          {/* Meta: Admin email and date */}
                          <div className="flex gap-4 text-[10px] text-gray-400 font-bold uppercase mt-2.5">
                            <span>Created: {new Date(transfer.createdAt).toLocaleString()}</span>
                            {transfer.approvedBy && (
                              <span>Authorized By: {transfer.approvedBy.email}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      {transfer.status === 'PENDING' && (
                        <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto">
                          <button
                            onClick={() => handleApprove(transfer.id, `${transfer.quantity} ${transfer.resourceName}`)}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 bg-[#00488d] hover:bg-[#00366b] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm cursor-pointer disabled:opacity-50 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve Transfer
                          </button>
                          <button
                            onClick={() => handleOpenReject(transfer.id)}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 transition-all"
                          >
                            <X className="w-3.5 h-3.5" /> Decline Option
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </section>

        </div>
      )}

      {/* Decline Reason Modal */}
      {isRejectOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-black text-gray-800">Decline Recommendation</h3>
            <p className="text-xs text-gray-500 mt-1">Specify a reason for declining this redistribution suggestion.</p>
            <form onSubmit={handleRejectSubmit} className="mt-4">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="E.g., Logistics constraints, manual redistribution already scheduled, or local override."
                required
                className="w-full min-h-[100px] border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:border-[#00488d]"
              />
              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-2 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  Decline and Archive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ResourceRedistribution;
