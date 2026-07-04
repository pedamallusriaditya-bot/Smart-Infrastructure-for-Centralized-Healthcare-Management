import React, { useState, useEffect } from 'react';
import { X, MapPin, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { triggerEmergencySOS } from '../../api/emergency.api';

const EMERGENCY_REASONS = [
  "Chest Pain / Cardiac",
  "Difficulty Breathing",
  "Severe Bleeding",
  "Allergic Reaction",
  "Unconsciousness",
  "Severe Injury / Accident",
  "Stroke Symptoms",
  "Poisoning",
  "Seizure",
  "Other"
];

interface Props { isOpen: boolean; onClose: () => void; }

const EmergencySOSModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      navigator.geolocation.getCurrentPosition(
        // Change 'p' to 'pos' here
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.error("Location blocked")
      );
    }
  }, [isOpen]);

  const handleSend = async () => {
    setLoading(true);
    try {
      await triggerEmergencySOS({
        description: reason,
        latitude: location?.lat || 0,
        longitude: location?.lng || 0
      });
      setStep('success');
    } catch {
      alert("Pipeline failure. Dial local emergency number!");
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        {step === 'form' ? (
          <>
            <div className="bg-[#ba1a1a] p-8 text-white text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 animate-pulse" />
              <h2 className="text-2xl font-bold tracking-tight">EMERGENCY ASSISTANCE</h2>
              <p className="text-red-100 text-sm">Real-time GPS dispatch will be initiated</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-2">
                {EMERGENCY_REASONS.map(r => (
                  <label key={r} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${reason === r ? 'bg-red-50 border-red-500 ring-1 ring-red-500' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="reason" value={r} onChange={(e) => setReason(e.target.value)} className="text-red-600 focus:ring-red-500" />
                    <span className="text-sm font-semibold text-gray-700">{r}</span>
                  </label>
                ))}
              </div>
              <div className="p-4 bg-gray-100 rounded-2xl flex items-center gap-3">
                <MapPin className={location ? "text-green-600" : "text-blue-600 animate-bounce"} />
                <span className="text-xs font-bold text-gray-500">{location ? "Location Locked" : "Acquiring GPS Signal..."}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-4 font-bold text-gray-400">Cancel</button>
                <button onClick={handleSend} disabled={!reason || loading} className="flex-[2] py-4 bg-[#ba1a1a] text-white rounded-2xl font-bold shadow-lg shadow-red-200">
                  {loading ? <Loader2 className="animate-spin mx-auto" /> : "SEND ALERT"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center space-y-4">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Alert Dispatched</h2>
            <p className="text-gray-500">Hospital responders have received your coordinates.</p>
            <button onClick={onClose} className="w-full py-3 bg-[#00488d] text-white rounded-xl font-bold">Close</button>
          </div>
        )}
      </div>
    </div>
  );
};
export default EmergencySOSModal;