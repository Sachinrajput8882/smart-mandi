import React, { useState } from 'react';
import {
  UserPlus,
  User,
  Phone,
  Wheat,
  Scale,
  Calendar,
  Truck,
  MapPin,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { storage } from '../services/storage';

const CROP_OPTIONS = [
  { value: 'Wheat (गेहूं)', label: 'Wheat (गेहूं)', msp: '₹2,275 / Qtl' },
  { value: 'Paddy / Rice (धान)', label: 'Paddy / Rice (धान)', msp: '₹2,300 / Qtl' },
  { value: 'Mustard (सरसों)', label: 'Mustard (सरसों)', msp: '₹5,650 / Qtl' },
  { value: 'Gram / Chana (चना)', label: 'Gram / Chana (चना)', msp: '₹5,440 / Qtl' },
  { value: 'Cotton (कपास)', label: 'Cotton (कपास)', msp: '₹7,121 / Qtl' },
  { value: 'Maize (मक्का)', label: 'Maize (मक्का)', msp: '₹2,090 / Qtl' },
  { value: 'Soybean (सोयाबीन)', label: 'Soybean (सोयाबीन)', msp: '₹4,892 / Qtl' },
  { value: 'Bajra / Pearl Millet (बाजरा)', label: 'Bajra / Pearl Millet (बाजरा)', msp: '₹2,500 / Qtl' }
];

export default function AddFarmerModal({ isOpen, onClose, onFarmerAdded }) {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const [farmerName, setFarmerName] = useState('');
  const [phone, setPhone] = useState('');
  const [cropType, setCropType] = useState('Wheat (गेहूं)');
  const [quantity, setQuantity] = useState('');
  const [gateAssigned, setGateAssigned] = useState('Gate 1');
  const [vehicleNo, setVehicleNo] = useState('');
  const [shift, setShift] = useState('shift_1_day');
  const [preferredDate, setPreferredDate] = useState(todayStr);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!farmerName.trim()) {
      setError('Please enter farmer name (किसान का नाम दर्ज करें)');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number (सही 10 अंकों का फोन नंबर दर्ज करें)');
      return;
    }
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      setError('Please enter a valid quantity in quintals (मात्रा क्विंटल में दर्ज करें)');
      return;
    }

    // Check 3000 quintal daily quota
    const allLocal = storage.mergeQueueWithLocalData([]);
    const alreadyBooked = allLocal
      .filter(s => s.status !== 'cancelled' && s.preferred_date === preferredDate)
      .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);

    const reqQty = Number(quantity);
    if (alreadyBooked + reqQty > 3000) {
      const remaining = Math.max(0, 3000 - alreadyBooked);
      setError(`मंडी की दैनिक क्षमता (3000 क्विंटल) पूरी होने वाली है! ${preferredDate} के लिए केवल ${remaining} क्विंटल स्थान शेष है।`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const cleanPhone = phone.trim();
      const payload = {
        name: farmerName.trim(),
        farmer_name: farmerName.trim(),
        phone: cleanPhone,
        crop_type: cropType,
        quantity: Number(quantity),
        preferred_date: preferredDate,
        gate_assigned: gateAssigned,
        vehicle_no: vehicleNo.trim().toUpperCase(),
        shift: shift || 'shift_1_day',
        is_manual: true
      };

      // 1. Try to save to backend API
      let newSlot = null;
      try {
        const res = await api.bookSlot(payload);
        if (res && res.data) {
          newSlot = res.data;
        }
      } catch (err) {
        console.warn('Backend offline or error, creating offline persistent slot:', err);
      }

      // 2. If backend didn't return a slot, generate client persistent slot
      if (!newSlot) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        newSlot = {
          id: Date.now(),
          token_id: `TKN${randomNum}`,
          farmer_name: farmerName.trim(),
          phone: cleanPhone,
          crop_type: cropType,
          quantity: Number(quantity),
          preferred_date: preferredDate,
          status: 'waiting',
          gate_assigned: gateAssigned,
          vehicle_no: vehicleNo.trim().toUpperCase(),
          shift: shift || 'shift_1_day',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_manual: true
        };
      } else {
        newSlot.vehicle_no = vehicleNo.trim().toUpperCase();
        newSlot.gate_assigned = gateAssigned;
        newSlot.shift = shift || 'shift_1_day';
        newSlot.is_manual = true;
      }

      // 3. Save to localStorage persistent storage
      storage.saveManualFarmer(newSlot);

      // 4. Notify parent
      if (onFarmerAdded) {
        onFarmerAdded(newSlot);
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add manual farmer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Add Real Manual Farmer
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                Persistent Data
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              मैन्युअल किसान प्रविष्टि • Permanent spot registration (retained on refresh)
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Farmer Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Farmer Full Name / किसान का नाम <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={farmerName}
                onChange={(e) => {
                  setFarmerName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="किसान का नाम दर्ज करें (Enter Farmer Name)"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mobile Number / मोबाइल नंबर (For Call & SMS) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error) setError('');
                }}
                placeholder="10-digit mobile number (e.g. 9876543210)"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Crop & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Crop Type / फसल <span className="text-rose-500">*</span>
              </label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                {CROP_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label} ({c.msp})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quantity (Quintals) / मात्रा <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Scale className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.5"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. 85"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Gate & Vehicle Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gate Assignment / प्रवेश द्वार <span className="text-rose-500">*</span>
              </label>
              <select
                value={gateAssigned}
                onChange={(e) => setGateAssigned(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="Gate 1">Gate 1: Heavy Vehicles (Tractors & Trolleys - धर्मकांटा 1)</option>
                <option value="Gate 2">Gate 2: Commercial Pickups & Canters (धर्मकांटा 2)</option>
                <option value="Gate 3">Gate 3: Light Commercial & Small Carriers (धर्मकांटा 3)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vehicle / Trolley No (वाहन संख्या)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Truck className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  placeholder="e.g. PB-10-AB-1234"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* Shift Selection: Shift 1 (Day 6am-11am) vs Shift 2 (Night 1pm-8pm) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mandi Shift / मंडी शिफ्ट चयन <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShift('shift_1_day')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                  shift === 'shift_1_day'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-bold ring-2 ring-amber-400/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-base">🌅</span>
                <div>
                  <span className="block text-xs">Shift 1: Day</span>
                  <span className="block text-[10px] text-slate-500 font-mono">6:00 AM – 11:00 AM</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShift('shift_2_night')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                  shift === 'shift_2_night'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold ring-2 ring-indigo-400/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-base">🌙</span>
                <div>
                  <span className="block text-xs">Shift 2: Night</span>
                  <span className="block text-[10px] text-slate-500 font-mono">1:00 PM – 8:00 PM</span>
                </div>
              </button>
            </div>
          </div>

          {/* Submission Notice */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-[11px] text-emerald-800 leading-relaxed space-y-1">
            <p><span className="font-bold">🔒 Persistent Storage:</span> Real manual data entered here is stored permanently in your local browser cache and synced with the server (never disappears on refresh).</p>
            <p className="text-emerald-700 font-medium">📲 Upon saving, the Dispatch Desk opens immediately to transfer details to Admin Mobile (<strong>+91 91058 46785</strong>).</p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>{loading ? 'Saving Farmer...' : 'Save & Generate Token'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
