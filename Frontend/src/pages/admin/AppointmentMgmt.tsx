import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Loader2, Calendar, Check, X, ShieldAlert } from 'lucide-react';

const AppointmentMgmt: React.FC = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const response = await axiosInstance.get('/appointments');
      setAppointments(response.data.data || []);
    } catch (err: any) {
      console.error(err);
      setErrorState(err.response?.data?.message || "Failed to load clinical appointments.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: string) => {
    if (!window.confirm(`Update appointment status to ${nextStatus}?`)) return;
    try {
      await axiosInstance.patch(`/appointments/${id}/status`, { status: nextStatus });
      alert("Appointment status updated successfully.");
      loadAppointments();
    } catch (err: any) {
      alert("Failed to update status: " + (err.response?.data?.message || err.message));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-teal-50 text-teal-700 border border-teal-200';
      case 'SCHEDULED': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'COMPLETED': return 'bg-gray-100 text-gray-700 border border-gray-200';
      case 'CANCELLED': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-lg text-red-700 flex gap-md">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <div>
          <h4 className="font-bold">Database Error</h4>
          <p className="text-sm mt-xs">{errorState}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-xl font-sans text-on-surface">
      <header className="mb-8">
        <div className="flex items-center gap-3 text-[#00488d] mb-2">
          <Calendar className="w-8 h-8" />
          <h1 className="text-3xl font-black tracking-tight">Clinical Bookings Manager</h1>
        </div>
        <p className="text-on-surface-variant text-body-md">Review patient reservations, verify clinical slot availability, and update statuses.</p>
      </header>

      {/* Table */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low text-on-surface-variant text-label-lg font-bold uppercase">
            <tr>
              <th className="px-lg py-md">Patient</th>
              <th className="px-lg py-md">Assigned Practitioner</th>
              <th className="px-lg py-md">Time & Date</th>
              <th className="px-lg py-md">Reason</th>
              <th className="px-lg py-md">Status</th>
              <th className="px-lg py-md text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-lg py-8 text-center text-on-surface-variant">
                  No appointments registered.
                </td>
              </tr>
            ) : (
              appointments.map((appt) => {
                const patName = appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : "CareHive Patient";
                const docName = appt.doctor ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}` : "Registered Practitioner";
                const date = new Date(appt.appointmentDate).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric'
                });
                const time = new Date(appt.appointmentDate).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit'
                });

                return (
                  <tr key={appt.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-lg py-md">
                      <div className="flex flex-col">
                        <span className="font-bold">{patName}</span>
                        <span className="text-[10px] text-on-surface-variant">ID: {appt.patientId?.substring(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-lg py-md">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{docName}</span>
                        <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">{appt.doctor?.specialization}</span>
                      </div>
                    </td>
                    <td className="px-lg py-md">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{date}</span>
                        <span className="text-xs text-on-surface-variant">{time}</span>
                      </div>
                    </td>
                    <td className="px-lg py-md font-body-md text-on-surface-variant">{appt.reason}</td>
                    <td className="px-lg py-md">
                      <span className={`px-sm py-1 rounded text-xs font-black uppercase ${getStatusColor(appt.status)}`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-lg py-md text-right">
                      {appt.status === 'SCHEDULED' && (
                        <div className="flex justify-end gap-sm">
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'COMPLETED')}
                            className="bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded text-xs font-bold hover:bg-teal-100 transition-colors cursor-pointer"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'CANCELLED')}
                            className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AppointmentMgmt;
