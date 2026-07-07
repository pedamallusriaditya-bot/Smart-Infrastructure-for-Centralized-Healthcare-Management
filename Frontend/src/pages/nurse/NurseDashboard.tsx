import React, { useEffect, useState } from 'react';
import { 
  getNurseProfile, 
  getNursePatients, 
  getNursePrescriptions, 
  getMedicationHistory, 
  administerMedication, 
  recordVitalSigns, 
  updateNursingNotes 
} from '../../api/nurse.api';

const NurseDashboard: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [medHistory, setMedHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [administerModal, setAdministerModal] = useState<any>(null); // prescription and medicine to administer
  const [vitalsModal, setVitalsModal] = useState<any>(null); // patient to record vitals for
  const [noteModal, setNoteModal] = useState<any>(null); // patient to record nursing notes for

  // Form states
  const [vitalsForm, setVitalsForm] = useState({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: ''
  });
  const [nursingNote, setNursingNote] = useState('');
  const [administerForm, setAdministerForm] = useState({
    remarks: '',
    reaction: '',
    dose: '',
    route: 'ORAL'
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
      const profData = await getNurseProfile();
      setProfile(profData);
      
      const pts = await getNursePatients();
      setPatients(pts || []);

      const rx = await getNursePrescriptions();
      setPrescriptions(rx || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load console data.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = async (patient: any) => {
    setSelectedPatient(patient);
    try {
      const history = await getMedicationHistory(patient.id);
      setMedHistory(history || []);
    } catch (err) {
      console.error('Failed to load medication history', err);
    }
  };

  const handleAdminister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!administerModal) return;
    try {
      setFormSubmitting(true);
      setError('');
      await administerMedication({
        patientId: administerModal.patientId,
        prescriptionId: administerModal.prescriptionId,
        medicineId: administerModal.medicineId,
        dose: administerForm.dose || administerModal.dosage,
        route: administerForm.route,
        remarks: administerForm.remarks,
        reaction: administerForm.reaction
      });
      setSuccessMsg('Medication successfully administered.');
      setAdministerModal(null);
      setAdministerForm({ remarks: '', reaction: '', dose: '', route: 'ORAL' });
      await fetchData();
      if (selectedPatient) {
        await handlePatientSelect(selectedPatient);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to administer medication.');
    } finally {
      setFormSubmitting(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vitalsModal) return;
    try {
      setFormSubmitting(true);
      setError('');
      await recordVitalSigns({
        patientId: vitalsModal.id,
        ...vitalsForm
      });
      setSuccessMsg('Vitals registered successfully.');
      setVitalsModal(null);
      setVitalsForm({ bloodPressure: '', heartRate: '', temperature: '', respiratoryRate: '' });
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record vital signs.');
    } finally {
      setFormSubmitting(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleAddNursingNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteModal || !nursingNote.trim()) return;
    try {
      setFormSubmitting(true);
      setError('');
      await updateNursingNotes({
        patientId: noteModal.id,
        notes: nursingNote
      });
      setSuccessMsg('Nursing note added to care timeline.');
      setNoteModal(null);
      setNursingNote('');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to add nursing note.');
    } finally {
      setFormSubmitting(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const calculateAge = (dobString: string) => {
    if (!dobString) return 'N/A';
    const dob = new Date(dobString);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-secondary text-sm mt-md font-bold">Synchronizing Patient Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-xl">
      {/* Overview Header Card */}
      <div className="p-xl bg-gradient-to-r from-primary to-primary-container text-white rounded-2xl shadow-md flex justify-between items-center">
        <div>
          <h2 className="text-headline-md font-bold tracking-tight">Active Shift Observation Panel</h2>
          <p className="text-sm opacity-90 mt-xs font-medium">
            Assigned Ward: <span className="font-bold">{profile?.ward?.name || 'General Ward'}</span> | Staff ID: <span className="font-bold">{profile?.employeeId}</span>
          </p>
        </div>
        <div className="bg-white/10 px-lg py-sm rounded-lg backdrop-blur-sm border border-white/20 text-right">
          <span className="text-xs uppercase font-bold tracking-wider opacity-75">Assigned Facility</span>
          <p className="text-lg font-bold">{profile?.hospital?.name || 'Central Hospital'}</p>
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

      {/* Grid of Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-xl">
        
        {/* Left Col: Admitted Patients list */}
        <div className="xl:col-span-2 space-y-xl">
          <div className="bg-surface rounded-2xl border border-outline-variant p-xl shadow-sm">
            <div className="flex justify-between items-center mb-md border-b border-outline-variant pb-md">
              <span className="font-title-lg text-title-lg font-bold text-primary flex items-center gap-md">
                <span className="material-symbols-outlined text-xl">hotel</span>
                Ward Inpatients Registry ({patients.length})
              </span>
            </div>
            {patients.length === 0 ? (
              <div className="text-center py-xl text-on-surface-variant font-medium">
                No active patient admissions currently registered in this facility.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                      <th className="py-md">Patient</th>
                      <th>Room & Bed</th>
                      <th>Admitting Doctor</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((admission) => {
                      const pt = admission.patient;
                      const isSelected = selectedPatient?.id === pt.id;
                      return (
                        <tr 
                          key={admission.id} 
                          className={`border-b border-outline-variant/50 hover:bg-surface-container-lowest transition-colors cursor-pointer ${
                            isSelected ? 'bg-primary/5 font-bold' : ''
                          }`}
                          onClick={() => handlePatientSelect(pt)}
                        >
                          <td className="py-md flex flex-col">
                            <span className="font-body-md text-on-surface">{pt.firstName} {pt.lastName}</span>
                            <span className="text-xs text-on-surface-variant">Age: {calculateAge(pt.dateOfBirth)} | Gender: {pt.gender} | Blood: {pt.bloodGroup || 'Unknown'}</span>
                          </td>
                          <td className="font-body-md">
                            Room {admission.bed?.room?.roomNumber || 'N/A'} - Bed {admission.bed?.bedNumber || 'N/A'}
                          </td>
                          <td className="font-body-md text-on-surface-variant">
                            Dr. {admission.doctor?.firstName} {admission.doctor?.lastName}
                          </td>
                          <td className="text-right">
                            <div className="flex justify-end gap-sm" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => setVitalsModal(pt)}
                                className="px-sm py-1.5 rounded-lg border border-primary text-primary hover:bg-primary/5 text-xs font-bold flex items-center gap-xs cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">favorite</span>
                                Vitals
                              </button>
                              <button 
                                onClick={() => setNoteModal(pt)}
                                className="px-sm py-1.5 rounded-lg border border-outline text-on-surface-variant hover:bg-surface-container-low text-xs font-bold flex items-center gap-xs cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">edit_note</span>
                                Note
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Active Medication Schedule Queue */}
          <div className="bg-surface rounded-2xl border border-outline-variant p-xl shadow-sm">
            <div className="flex justify-between items-center mb-md border-b border-outline-variant pb-md">
              <span className="font-title-lg text-title-lg font-bold text-primary flex items-center gap-md">
                <span className="material-symbols-outlined text-xl">medication</span>
                Active Clinical Prescriptions Queue
              </span>
            </div>
            {prescriptions.length === 0 ? (
              <div className="text-center py-xl text-on-surface-variant font-medium">
                No active prescriptions due for administration.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                      <th className="py-md">Inpatient</th>
                      <th>Medicine Name</th>
                      <th>Frequency / Route</th>
                      <th>Next Due Time</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((rx) => {
                      const med = rx.medicines?.[0]?.medicine;
                      if (!med) return null;
                      return (
                        <tr key={rx.id} className="border-b border-outline-variant/50 hover:bg-surface-container-lowest transition-colors">
                          <td className="py-md font-body-md text-on-surface">
                            {rx.patient?.firstName} {rx.patient?.lastName}
                          </td>
                          <td className="font-body-md">
                            <div className="flex flex-col">
                              <span className="font-bold">{med.name}</span>
                              <span className="text-xs text-on-surface-variant">{rx.dosage}</span>
                            </div>
                          </td>
                          <td className="font-body-md text-on-surface-variant">
                            <span className="bg-secondary/10 text-secondary px-xs py-0.5 rounded text-xs font-bold uppercase tracking-wider mr-xs">
                              {rx.route}
                            </span>
                            {rx.frequency}
                          </td>
                          <td className="font-body-md text-xs text-on-surface-variant font-semibold">
                            {rx.nextDoseTime ? new Date(rx.nextDoseTime).toLocaleString() : 'As Needed'}
                          </td>
                          <td className="text-right">
                            <button 
                              onClick={() => {
                                setAdministerModal({
                                  prescriptionId: rx.id,
                                  patientId: rx.patientId,
                                  medicineId: med.id,
                                  medicineName: med.name,
                                  dosage: rx.dosage,
                                  route: rx.route
                                });
                                setAdministerForm(prev => ({
                                  ...prev,
                                  dose: rx.dosage,
                                  route: rx.route
                                }));
                              }}
                              className="px-md py-1.5 rounded-lg bg-primary text-white hover:bg-primary/95 text-xs font-bold flex items-center gap-xs cursor-pointer ml-auto"
                            >
                              <span className="material-symbols-outlined text-sm font-fill">check_circle</span>
                              Administer
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

        {/* Right Col: Patient History Details */}
        <div>
          <div className="bg-surface rounded-2xl border border-outline-variant p-xl shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-md border-b border-outline-variant pb-md shrink-0">
              <span className="font-title-lg text-title-lg font-bold text-primary flex items-center gap-md">
                <span className="material-symbols-outlined text-xl">history</span>
                Patient Administration Log (MAR)
              </span>
            </div>

            {selectedPatient ? (
              <div className="flex-grow flex flex-col overflow-hidden">
                <div className="p-md bg-surface-container-low rounded-xl mb-md shrink-0">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Viewing History For</span>
                  <p className="text-headline-sm font-bold text-primary mt-xxs">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                </div>

                <div className="flex-grow overflow-y-auto space-y-md pr-xs">
                  {medHistory.length === 0 ? (
                    <div className="text-center py-xl text-on-surface-variant font-medium">
                      No medication administrations logged yet.
                    </div>
                  ) : (
                    medHistory.map((record) => (
                      <div key={record.id} className="p-md bg-surface border border-outline-variant/60 rounded-xl space-y-xs relative hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start">
                          <span className="font-body-md font-bold text-on-surface">{record.medicine?.name}</span>
                          <span className="text-[10px] bg-green-50 text-green-800 border border-green-200 px-xs py-0.5 rounded font-bold uppercase tracking-wider">
                            {record.status}
                          </span>
                        </div>
                        <div className="text-xs text-on-surface-variant font-medium flex items-center gap-sm">
                          <span>Dose: <strong className="text-on-surface">{record.dose}</strong></span>
                          <span>Route: <strong className="text-on-surface">{record.route}</strong></span>
                        </div>
                        {record.batchNumber && (
                          <div className="text-xs text-on-surface-variant">
                            Batch: <span className="font-bold text-on-surface">{record.batchNumber}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-on-surface-variant border-t border-outline-variant/40 pt-xs mt-xs flex justify-between">
                          <span>Logged by: Nurse {record.nurse?.firstName} {record.nurse?.lastName}</span>
                          <span>{new Date(record.administeredAt).toLocaleString()}</span>
                        </div>
                        {record.reaction && (
                          <div className="mt-xs p-xs bg-error/10 text-error border border-error/20 rounded text-[11px] font-bold">
                            Adverse Reaction: {record.reaction}
                          </div>
                        )}
                        {record.remarks && (
                          <p className="text-[11px] text-on-surface-variant italic mt-xxs">Notes: "{record.remarks}"</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center py-xl text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl text-outline mb-md">person_search</span>
                Select a patient from the inpatients registry to load medication logs and MAR history.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: ADMINISTER MEDICATION */}
      {administerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-md backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl w-full max-w-md border border-outline-variant shadow-xl overflow-hidden flex flex-col animate-slide-up">
            <div className="p-xl bg-primary text-white flex justify-between items-center">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider opacity-75">Workstation Verification</span>
                <h3 className="text-title-lg font-bold">Verify & Administer Dose</h3>
              </div>
              <button 
                onClick={() => setAdministerModal(null)} 
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAdminister} className="p-xl space-y-md">
              <div className="p-md bg-surface-container-low rounded-xl border border-outline-variant/60">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Target Medicine</span>
                <p className="text-lg font-bold text-primary mt-xxs">{administerModal.medicineName}</p>
                <div className="mt-xs text-xs text-on-surface-variant font-medium flex justify-between">
                  <span>Prescribed Route: <strong>{administerModal.route}</strong></span>
                  <span>Prescribed Dose: <strong>{administerModal.dosage}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div className="flex flex-col gap-xxs">
                  <label className="text-xs font-bold text-on-surface">Dose to Give</label>
                  <input 
                    type="text" 
                    value={administerForm.dose}
                    onChange={(e) => setAdministerForm(prev => ({ ...prev, dose: e.target.value }))}
                    placeholder="e.g. 500mg" 
                    className="p-sm bg-surface border border-outline rounded-lg text-sm focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-xxs">
                  <label className="text-xs font-bold text-on-surface">Route Used</label>
                  <select 
                    value={administerForm.route}
                    onChange={(e) => setAdministerForm(prev => ({ ...prev, route: e.target.value }))}
                    className="p-sm bg-surface border border-outline rounded-lg text-sm focus:border-primary focus:outline-none"
                    required
                  >
                    <option value="ORAL">ORAL</option>
                    <option value="IV">IV</option>
                    <option value="IM">IM</option>
                    <option value="SC">SC</option>
                    <option value="TOPICAL">TOPICAL</option>
                    <option value="INHALATION">INHALATION</option>
                    <option value="SUBLINGUAL">SUBLINGUAL</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-xxs">
                <label className="text-xs font-bold text-on-surface">Nursing Remarks (Optional)</label>
                <input 
                  type="text" 
                  value={administerForm.remarks}
                  onChange={(e) => setAdministerForm(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="e.g. Taken with meals" 
                  className="p-sm bg-surface border border-outline rounded-lg text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-xxs">
                <label className="text-xs font-bold text-error">Adverse Reaction Details (Only if observed)</label>
                <input 
                  type="text" 
                  value={administerForm.reaction}
                  onChange={(e) => setAdministerForm(prev => ({ ...prev, reaction: e.target.value }))}
                  placeholder="e.g. Mild rash, nausea" 
                  className="p-sm bg-surface border border-error/50 rounded-lg text-sm text-error focus:border-error focus:outline-none bg-error/5"
                />
              </div>

              <div className="pt-md border-t border-outline-variant/60 flex justify-end gap-md">
                <button 
                  type="button"
                  onClick={() => setAdministerModal(null)}
                  className="px-md py-sm rounded-lg hover:bg-surface-container-low text-xs font-bold border border-outline cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={formSubmitting}
                  className="px-md py-sm bg-primary text-white rounded-lg hover:bg-primary/95 text-xs font-bold flex items-center gap-xs cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Logging...' : 'Confirm Administration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD VITAL SIGNS */}
      {vitalsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-md backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl w-full max-w-md border border-outline-variant shadow-xl overflow-hidden flex flex-col animate-slide-up">
            <div className="p-xl bg-primary text-white flex justify-between items-center">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider opacity-75">Clinical Record</span>
                <h3 className="text-title-lg font-bold">Record Vital Signs</h3>
              </div>
              <button 
                onClick={() => setVitalsModal(null)} 
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleRecordVitals} className="p-xl space-y-md">
              <p className="text-sm text-on-surface-variant font-medium">
                Logging vitals for: <strong className="text-on-surface">{vitalsModal.firstName} {vitalsModal.lastName}</strong>
              </p>

              <div className="grid grid-cols-2 gap-md">
                <div className="flex flex-col gap-xxs">
                  <label className="text-xs font-bold text-on-surface">Blood Pressure</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 120/80 mmHg" 
                    value={vitalsForm.bloodPressure}
                    onChange={(e) => setVitalsForm(prev => ({ ...prev, bloodPressure: e.target.value }))}
                    className="p-sm bg-surface border border-outline rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-xxs">
                  <label className="text-xs font-bold text-on-surface">Heart Rate (bpm)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 72" 
                    value={vitalsForm.heartRate}
                    onChange={(e) => setVitalsForm(prev => ({ ...prev, heartRate: e.target.value }))}
                    className="p-sm bg-surface border border-outline rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div className="flex flex-col gap-xxs">
                  <label className="text-xs font-bold text-on-surface">Temperature (°C)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="e.g. 36.8" 
                    value={vitalsForm.temperature}
                    onChange={(e) => setVitalsForm(prev => ({ ...prev, temperature: e.target.value }))}
                    className="p-sm bg-surface border border-outline rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-xxs">
                  <label className="text-xs font-bold text-on-surface">Respiratory Rate (/min)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 16" 
                    value={vitalsForm.respiratoryRate}
                    onChange={(e) => setVitalsForm(prev => ({ ...prev, respiratoryRate: e.target.value }))}
                    className="p-sm bg-surface border border-outline rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-md border-t border-outline-variant/60 flex justify-end gap-md">
                <button 
                  type="button"
                  onClick={() => setVitalsModal(null)}
                  className="px-md py-sm rounded-lg hover:bg-surface-container-low text-xs font-bold border border-outline cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={formSubmitting}
                  className="px-md py-sm bg-primary text-white rounded-lg hover:bg-primary/95 text-xs font-bold flex items-center gap-xs cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : 'Record Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NURSING NOTE */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-md backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl w-full max-w-md border border-outline-variant shadow-xl overflow-hidden flex flex-col animate-slide-up">
            <div className="p-xl bg-primary text-white flex justify-between items-center">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider opacity-75">Care Timeline</span>
                <h3 className="text-title-lg font-bold">Add Nursing Observation Note</h3>
              </div>
              <button 
                onClick={() => setNoteModal(null)} 
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddNursingNote} className="p-xl space-y-md">
              <p className="text-sm text-on-surface-variant font-medium">
                Logging observation for: <strong className="text-on-surface">{noteModal.firstName} {noteModal.lastName}</strong>
              </p>

              <div className="flex flex-col gap-xxs">
                <label className="text-xs font-bold text-on-surface">Clinical Notes & Observations</label>
                <textarea 
                  rows={4}
                  placeholder="Record nursing interventions, patient responses, level of consciousness, compliance, comfort details..." 
                  value={nursingNote}
                  onChange={(e) => setNursingNote(e.target.value)}
                  className="p-sm bg-surface border border-outline rounded-lg text-sm focus:border-primary focus:outline-none resize-none font-sans"
                  required
                />
              </div>

              <div className="pt-md border-t border-outline-variant/60 flex justify-end gap-md">
                <button 
                  type="button"
                  onClick={() => setNoteModal(null)}
                  className="px-md py-sm rounded-lg hover:bg-surface-container-low text-xs font-bold border border-outline cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={formSubmitting || !nursingNote.trim()}
                  className="px-md py-sm bg-primary text-white rounded-lg hover:bg-primary/95 text-xs font-bold flex items-center gap-xs cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Logging...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default NurseDashboard;
