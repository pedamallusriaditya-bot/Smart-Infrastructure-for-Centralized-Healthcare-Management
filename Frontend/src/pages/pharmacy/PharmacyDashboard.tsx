import React, { useEffect, useState } from 'react';
import { 
  getPharmacistProfile, 
  getPharmacyInventory, 
  getPharmacySummary, 
  getPrescriptionsQueue, 
  dispensePrescription, 
  cancelPrescription, 
  receiveMedicineStock 
} from '../../api/pharmacy.api';

const PharmacyDashboard: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [dispenseModal, setDispenseModal] = useState<any>(null);
  const [restockModal, setRestockModal] = useState<any>(null);

  // Form states
  const [restockForm, setRestockForm] = useState({
    quantity: '',
    batchNumber: '',
    expiryDate: ''
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const prof = await getPharmacistProfile();
      setProfile(prof);

      if (prof.hospitalId) {
        const [inv, sum, rx] = await Promise.all([
          getPharmacyInventory(),
          getPharmacySummary(),
          getPrescriptionsQueue()
        ]);
        setInventory(inv || []);
        setSummary(sum || null);
        setPrescriptions(rx || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load pharmacy hub.');
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async (prescriptionId: string) => {
    if (!window.confirm('Are you sure you want to dispense this prescription? This will deduct the required items from the pharmacy inventory.')) return;
    try {
      setFormSubmitting(true);
      setError('');
      await dispensePrescription({ prescriptionId });
      setSuccessMsg('Prescription successfully dispensed.');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to dispense prescription.');
    } finally {
      setFormSubmitting(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleCancelPrescription = async (prescriptionId: string) => {
    if (!window.confirm('Are you sure you want to cancel this prescription? This will mark the prescription as cancelled.')) return;
    try {
      setFormSubmitting(true);
      setError('');
      await cancelPrescription(prescriptionId);
      setSuccessMsg('Prescription cancelled successfully.');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to cancel prescription.');
    } finally {
      setFormSubmitting(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModal) return;
    try {
      setFormSubmitting(true);
      setError('');
      await receiveMedicineStock({
        itemId: restockModal.id,
        quantity: parseInt(restockForm.quantity, 10),
        batchNumber: restockForm.batchNumber || undefined,
        expiryDate: restockForm.expiryDate || undefined
      });
      setSuccessMsg(`Restocked ${restockModal.name} successfully.`);
      setRestockModal(null);
      setRestockForm({ quantity: '', batchNumber: '', expiryDate: '' });
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to restock inventory.');
    } finally {
      setFormSubmitting(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ADEQUATE':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'LOW_STOCK':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'CRITICAL':
        return 'bg-red-50 text-red-800 border-red-200 font-bold';
      case 'OUT_OF_STOCK':
        return 'bg-error/10 text-error border-error/20 font-bold';
      default:
        return 'bg-surface-container text-on-surface-variant border-outline';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-secondary text-sm mt-md font-bold">Connecting Pharmacy Database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-xl">
      {/* Pharmacy Profile Summary Header */}
      <div className="p-xl bg-gradient-to-r from-primary to-primary-container text-white rounded-2xl shadow-md flex justify-between items-center">
        <div>
          <h2 className="text-headline-md font-bold tracking-tight">Clinical Dispensing Command</h2>
          <p className="text-sm opacity-90 mt-xs font-medium">
            Pharmacist: <span className="font-bold">{profile?.firstName} {profile?.lastName}</span> | License ID: <span className="font-bold">{profile?.licenseId}</span>
          </p>
        </div>
        <div className="bg-white/10 px-lg py-sm rounded-lg backdrop-blur-sm border border-white/20 text-right">
          <span className="text-xs uppercase font-bold tracking-wider opacity-75">Pharmacy Hub</span>
          <p className="text-lg font-bold">{profile?.hospital?.name || 'Central Hospital Pharmacy'}</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-md bg-green-50 text-green-800 rounded-xl border border-green-200 flex items-center gap-md">
          <span className="material-symbols-outlined text-green-600 font-fill">check_circle</span>
          <span className="font-bold text-sm">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-md bg-error/10 text-error rounded-xl border border-error/20 flex items-center gap-md">
          <span className="material-symbols-outlined text-error font-fill">error</span>
          <span className="font-bold text-sm">{error}</span>
        </div>
      )}

      {/* Stats row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-md">
          <div className="p-md bg-surface border border-outline-variant/60 rounded-xl text-center shadow-sm">
            <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider block">Total Medicines</span>
            <p className="text-headline-md font-bold text-primary mt-xxs">{summary.totalMedicines}</p>
          </div>
          <div className="p-md bg-surface border border-outline-variant/60 rounded-xl text-center shadow-sm">
            <span className="text-xs text-amber-600 font-bold uppercase tracking-wider block">Low Stock</span>
            <p className="text-headline-md font-bold text-amber-600 mt-xxs">{summary.lowStock}</p>
          </div>
          <div className="p-md bg-surface border border-outline-variant/60 rounded-xl text-center shadow-sm">
            <span className="text-xs text-red-600 font-bold uppercase tracking-wider block">Critical</span>
            <p className="text-headline-md font-bold text-red-600 mt-xxs">{summary.critical}</p>
          </div>
          <div className="p-md bg-surface border border-outline-variant/60 rounded-xl text-center shadow-sm">
            <span className="text-xs text-error font-bold uppercase tracking-wider block font-bold">Out of Stock</span>
            <p className="text-headline-md font-bold text-error mt-xxs">{summary.outOfStock}</p>
          </div>
          <div className="p-md bg-surface border border-outline-variant/60 rounded-xl text-center shadow-sm">
            <span className="text-xs text-secondary font-bold uppercase tracking-wider block font-bold">Soon Expiring</span>
            <p className="text-headline-md font-bold text-secondary mt-xxs">{summary.expiringSoon}</p>
          </div>
          <div className="p-md bg-surface border border-outline-variant/60 rounded-xl text-center shadow-sm">
            <span className="text-xs text-error font-bold uppercase tracking-wider block font-bold">Expired</span>
            <p className="text-headline-md font-bold text-error mt-xxs">{summary.expired}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Left Prescriptions Queue, Right Inventory Stock */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-xl">
        
        {/* Prescriptions Queue (Dispensing Console) */}
        <div className="xl:col-span-1 space-y-xl">
          <div className="bg-surface rounded-2xl border border-outline-variant p-xl shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-md border-b border-outline-variant pb-md shrink-0">
              <span className="font-title-lg text-title-lg font-bold text-primary flex items-center gap-md">
                <span className="material-symbols-outlined text-xl">assignment</span>
                Prescriptions Queue ({prescriptions.length})
              </span>
            </div>

            <div className="flex-grow overflow-y-auto space-y-md pr-xs">
              {prescriptions.length === 0 ? (
                <div className="text-center py-xl text-on-surface-variant font-medium">
                  No active clinical prescription requests in queue.
                </div>
              ) : (
                prescriptions.map((rx) => {
                  const isPending = rx.status === 'PENDING' || rx.status === 'PARTIALLY_DISPENSED';
                  return (
                    <div key={rx.id} className="p-md bg-surface border border-outline-variant/60 rounded-xl space-y-xs relative hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Patient</span>
                          <span className="font-body-md font-bold text-on-surface">{rx.patient?.firstName} {rx.patient?.lastName}</span>
                        </div>
                        <span className={`text-[10px] border px-xs py-0.5 rounded font-bold uppercase tracking-wider ${
                          isPending ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-green-50 text-green-800 border-green-200'
                        }`}>
                          {rx.status}
                        </span>
                      </div>

                      <div className="border-t border-b border-outline-variant/40 py-xs my-xs space-y-xxs">
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Prescribed Medicines</span>
                        {rx.medicines?.map((pm: any) => (
                          <div key={pm.id} className="flex justify-between text-xs font-semibold">
                            <span className="text-on-surface">{pm.medicine?.name}</span>
                            <span className="text-on-surface-variant">Qty: {pm.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="text-[10px] text-on-surface-variant flex justify-between items-center mb-xs">
                        <span>By: Dr. {rx.doctor?.firstName} {rx.doctor?.lastName}</span>
                        <span>{new Date(rx.createdAt).toLocaleDateString()}</span>
                      </div>

                      {isPending && (
                        <div className="flex gap-sm border-t border-outline-variant/30 pt-xs mt-xs">
                          <button
                            onClick={() => handleDispense(rx.id)}
                            disabled={formSubmitting}
                            className="flex-grow px-sm py-1.5 rounded bg-primary text-white hover:bg-primary/95 text-xs font-bold flex items-center justify-center gap-xs cursor-pointer disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-sm font-fill">check_circle</span>
                            Dispense
                          </button>
                          <button
                            onClick={() => handleCancelPrescription(rx.id)}
                            disabled={formSubmitting}
                            className="px-sm py-1.5 rounded border border-error/50 text-error hover:bg-error/5 text-xs font-bold flex items-center justify-center gap-xs cursor-pointer disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-sm">cancel</span>
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Pharmacy Inventory Registry */}
        <div className="xl:col-span-2 space-y-xl">
          <div className="bg-surface rounded-2xl border border-outline-variant p-xl shadow-sm">
            <div className="flex justify-between items-center mb-md border-b border-outline-variant pb-md">
              <span className="font-title-lg text-title-lg font-bold text-primary flex items-center gap-md">
                <span className="material-symbols-outlined text-xl">inventory_2</span>
                Pharmacy Inventory Stock Registry ({inventory.length})
              </span>
            </div>

            {inventory.length === 0 ? (
              <div className="text-center py-xl text-on-surface-variant font-medium">
                No pharmacy inventory records found for this facility.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                      <th className="py-md">Medicine Name</th>
                      <th>Category</th>
                      <th>Batch Number</th>
                      <th>Qty Available</th>
                      <th>Min/Max Limit</th>
                      <th>Expiry Date</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => {
                      const isExpired = item.expiryDate ? new Date(item.expiryDate) < new Date() : false;
                      return (
                        <tr key={item.id} className="border-b border-outline-variant/50 hover:bg-surface-container-lowest transition-colors">
                          <td className="py-md font-body-md font-bold text-on-surface">
                            {item.name}
                          </td>
                          <td className="font-body-md text-xs text-on-surface-variant uppercase tracking-wider">
                            {item.category}
                          </td>
                          <td className="font-body-md text-xs text-on-surface-variant font-mono">
                            {item.batchNumber || 'N/A'}
                          </td>
                          <td className="font-body-md font-semibold">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="font-body-md text-xs text-on-surface-variant">
                            {item.minQuantity} / {item.maxQuantity}
                          </td>
                          <td className="font-body-md text-xs text-on-surface-variant font-semibold">
                            {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                            {isExpired && (
                              <span className="ml-xs bg-error/15 text-error px-xs py-0.5 rounded text-[10px] font-bold">
                                EXPIRED
                              </span>
                            )}
                          </td>
                          <td className="font-body-md">
                            <span className={`text-[10px] border px-xs py-0.5 rounded font-bold uppercase tracking-wider ${getStatusBadge(item.status)}`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="text-right">
                            <button
                              onClick={() => {
                                setRestockModal(item);
                                setRestockForm({
                                  quantity: '',
                                  batchNumber: item.batchNumber || '',
                                  expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : ''
                                });
                              }}
                              className="px-sm py-1 rounded bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90 text-xs font-bold flex items-center justify-center gap-xs cursor-pointer ml-auto"
                            >
                              <span className="material-symbols-outlined text-sm">add_box</span>
                              Restock
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: RESTOCK INVENTORY ITEM */}
      {restockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-md backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl w-full max-w-md border border-outline-variant shadow-xl overflow-hidden flex flex-col animate-slide-up">
            <div className="p-xl bg-primary text-white flex justify-between items-center">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider opacity-75">Inventory Operations</span>
                <h3 className="text-title-lg font-bold">Receive Medicine Stock</h3>
              </div>
              <button 
                onClick={() => setRestockModal(null)} 
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleRestock} className="p-xl space-y-md">
              <div className="p-md bg-surface-container-low rounded-xl border border-outline-variant/60">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Item Selected</span>
                <p className="text-lg font-bold text-primary mt-xxs">{restockModal.name}</p>
                <div className="mt-xs text-xs text-on-surface-variant font-medium">
                  Current Stock: <strong>{restockModal.quantity} {restockModal.unit}</strong>
                </div>
              </div>

              <div className="flex flex-col gap-xxs">
                <label className="text-xs font-bold text-on-surface">Quantity to Add</label>
                <input 
                  type="number" 
                  min="1"
                  placeholder="e.g. 100" 
                  value={restockForm.quantity}
                  onChange={(e) => setRestockForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="p-sm bg-surface border border-outline rounded-lg text-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div className="flex flex-col gap-xxs">
                  <label className="text-xs font-bold text-on-surface">Batch Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. B-99801" 
                    value={restockForm.batchNumber}
                    onChange={(e) => setRestockForm(prev => ({ ...prev, batchNumber: e.target.value }))}
                    className="p-sm bg-surface border border-outline rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-xxs">
                  <label className="text-xs font-bold text-on-surface">Expiry Date</label>
                  <input 
                    type="date" 
                    value={restockForm.expiryDate}
                    onChange={(e) => setRestockForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="p-sm bg-surface border border-outline rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-md border-t border-outline-variant/60 flex justify-end gap-md">
                <button 
                  type="button"
                  onClick={() => setRestockModal(null)}
                  className="px-md py-sm rounded-lg hover:bg-surface-container-low text-xs font-bold border border-outline cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={formSubmitting || !restockForm.quantity}
                  className="px-md py-sm bg-primary text-white rounded-lg hover:bg-primary/95 text-xs font-bold flex items-center gap-xs cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Receiving...' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PharmacyDashboard;
