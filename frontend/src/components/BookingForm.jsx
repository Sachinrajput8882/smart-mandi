import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import {
  User,
  Phone,
  Wheat,
  Scale,
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Truck,
  DoorOpen,
  ShieldCheck,
  Sun,
  Moon,
  Clock
} from 'lucide-react';
import { MANDI_SHIFTS } from '../utils/shiftUtils';

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

export default function BookingForm({ onBookingSuccess, currentUser }) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: (currentUser && currentUser.role === 'farmer' && currentUser.name) ? currentUser.name : '',
    phone: (currentUser && currentUser.role === 'farmer' && currentUser.phone) ? currentUser.phone : '',
    crop_type: 'Wheat (गेहूं)',
    quantity: '',
    preferred_date: todayStr,
    gate_assigned: 'Gate 1',
    vehicle_no: '',
    shift: 'shift_1_day'
  });

  useEffect(() => {
    if (currentUser && currentUser.role === 'farmer') {
      setFormData(prev => ({
        ...prev,
        name: prev.name || currentUser.name || '',
        phone: prev.phone || currentUser.phone || ''
      }));
    }
  }, [currentUser]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter farmer name (किसान का नाम दर्ज करें)');
      return;
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      setError('Please enter a valid quantity in quintals (मात्रा क्विंटल में दर्ज करें)');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await api.bookSlot({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        crop_type: formData.crop_type,
        quantity: Number(formData.quantity),
        preferred_date: formData.preferred_date,
        gate_assigned: formData.gate_assigned || 'Gate 1',
        vehicle_no: formData.vehicle_no ? formData.vehicle_no.trim().toUpperCase() : '',
        shift: formData.shift || 'shift_1_day'
      });

      // Celebration effect
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore confetti errors
      }

      onBookingSuccess(res.data);
    } catch (err) {
      setError(err.message || 'Unable to book slot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCropObj = CROP_OPTIONS.find(c => c.value === formData.crop_type) || CROP_OPTIONS[0];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-6 py-8 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <Wheat className="w-8 h-8 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Farmer Slot Booking</h2>
              <p className="text-emerald-100 text-sm mt-0.5">
                किसान स्लॉट बुकिंग एवं ई-टोकन जनरेशन
              </p>
            </div>
          </div>
          <p className="text-xs text-emerald-200/90 mt-4 border-t border-emerald-500/30 pt-3">
            Book your MSP procurement slot in advance to avoid long waiting lines. Receive an instant queue token with live gate tracking.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Farmer Full Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Farmer Full Name / किसान का पूरा नाम <span className="text-rose-500">*</span>
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="किसान का नाम दर्ज करें (Enter Farmer Name)"
                required
                className="block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder-slate-400 text-sm transition"
              />
            </div>
          </div>

          {/* Mobile Number & Preferred Date (2-column on sm) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Mobile Number / मोबाइल नंबर (For SMS)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  className="block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder-slate-400 text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Preferred Date / आगमन की तारीख <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <input
                  type="date"
                  name="preferred_date"
                  value={formData.preferred_date}
                  min={todayStr}
                  onChange={handleChange}
                  required
                  className="block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 text-sm transition"
                />
              </div>
            </div>
          </div>

          {/* Crop Selection & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Crop Type / फसल का प्रकार <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-sm">
                <select
                  name="crop_type"
                  value={formData.crop_type}
                  onChange={handleChange}
                  className="block w-full pl-4 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 text-sm transition bg-white"
                >
                  {CROP_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-1.5 flex items-center text-xs text-emerald-700 font-medium">
                <span>Official MSP: {selectedCropObj.msp}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Quantity / मात्रा (in Quintals / क्विंटल) <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Scale className="w-5 h-5" />
                </div>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="e.g. 50"
                  min="1"
                  max="1000"
                  step="0.5"
                  required
                  className="block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder-slate-400 text-sm transition"
                />
              </div>
              <div className="mt-1.5 text-xs text-slate-500">
                1 Quintal = 100 kg (१ क्विंटल = १०० किग्रा)
              </div>
            </div>
          </div>

          {/* Gate Assignment (3 Gates) & Vehicle Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Gate Selection / प्रवेश द्वार <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <select
                  name="gate_assigned"
                  value={formData.gate_assigned}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 text-sm transition bg-white"
                >
                  <option value="Gate 1">Gate 1: Heavy Tractors & Trolleys (धर्मकांटा 1)</option>
                  <option value="Gate 2">Gate 2: Pickups & Canters (धर्मकांटा 2)</option>
                  <option value="Gate 3">Gate 3: Light Commercial & Small Carriers (द्वार 3)</option>
                </select>
              </div>
              <div className="mt-1.5 text-xs text-slate-500">
                Choose the gate matching your vehicle type
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Vehicle / Trolley No (वाहन संख्या)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Truck className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="vehicle_no"
                  value={formData.vehicle_no}
                  onChange={handleChange}
                  placeholder="e.g. PB-10-TR-4521"
                  className="block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder-slate-400 text-sm transition font-mono uppercase"
                />
              </div>
              <div className="mt-1.5 text-xs text-slate-500">
                Optional vehicle license plate or trolley ID
              </div>
            </div>
          </div>

          {/* Two Shift Mandi Timing Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Mandi Shift Timing / मंडी शिफ्ट चयन <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shift 1: Day */}
              <label
                onClick={() => setFormData(prev => ({ ...prev, shift: 'shift_1_day' }))}
                className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex items-start space-x-3.5 ${
                  formData.shift === 'shift_1_day'
                    ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-400/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="shift"
                  value="shift_1_day"
                  checked={formData.shift === 'shift_1_day'}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-500" />
                      Shift 1: Day (सुबह)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      6:00 AM – 11:00 AM
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    First shift for morning arrivals & early harvesting deliveries.
                  </p>
                </div>
              </label>

              {/* Shift 2: Night / Evening */}
              <label
                onClick={() => setFormData(prev => ({ ...prev, shift: 'shift_2_night' }))}
                className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex items-start space-x-3.5 ${
                  formData.shift === 'shift_2_night'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-400/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="shift"
                  value="shift_2_night"
                  checked={formData.shift === 'shift_2_night'}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Moon className="w-4 h-4 text-indigo-600" />
                      Shift 2: Night (शाम/रात)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300">
                      1:00 PM – 8:00 PM
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Second shift for afternoon & evening weighbridge deliveries.
                  </p>
                </div>
              </label>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
              <span>☕ Inter-shift recess: <b>11:00 AM – 1:00 PM</b></span>
              <span>🚪 Gates close at 8:00 PM</span>
            </div>
          </div>

          {/* Info Card with Admin Contact Guarantee */}
          <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-200/60 space-y-1.5 text-xs text-emerald-900">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Automated Queue Token Allocation across 3 Gates</p>
                <p className="text-emerald-700 mt-0.5">
                  Upon submission, a unique Token ID (e.g. <code>TKN1234</code>) will be generated and assigned to your designated Mandi Gate with live tracking.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-1 border-t border-emerald-200/50 text-[11px] text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Admin Mobile for Direct Helpline & WhatsApp: <strong>+91 91058 46785</strong></span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 text-base transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Token... (टोकन जनरेट हो रहा है)</span>
              </>
            ) : (
              <>
                <span>Generate Token & Book Slot (टोकन प्राप्त करें)</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
