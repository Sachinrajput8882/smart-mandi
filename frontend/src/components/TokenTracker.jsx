import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import {
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CheckCircle,
  User,
  Wheat,
  Scale,
  Calendar,
  Bell,
  ArrowRight,
  Loader2,
  DoorOpen,
  Truck,
  PhoneCall,
  MessageCircle,
  ShieldCheck,
  CreditCard,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { STATUS_CONFIG } from './QueueCard';
import { calculateMspAmount, formatInr, getPaymentEta, getPaymentProcessingStages } from '../utils/paymentUtils';

const ADMIN_PHONE = '9105846785';

export default function TokenTracker({ initialToken, onNavigateToBooking }) {
  const [tokenInput, setTokenInput] = useState(initialToken || '');
  const [activeTokenData, setActiveTokenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTokenDetails = async (tokenToFind) => {
    if (!tokenToFind || !tokenToFind.trim()) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.getByToken(tokenToFind.trim());
      setActiveTokenData(res.data);
    } catch (err) {
      setError(err.message || 'Token not found. Please check your token number.');
      setActiveTokenData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      setTokenInput(initialToken);
      fetchTokenDetails(initialToken);
    }
  }, [initialToken]);

  // Periodic poll if tracking a specific token
  useEffect(() => {
    if (!activeTokenData || activeTokenData.status === 'done') return;

    const timer = setInterval(() => {
      fetchTokenDetails(activeTokenData.token_id);
    }, 5000);

    return () => clearInterval(timer);
  }, [activeTokenData]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      fetchTokenDetails(tokenInput.trim());
    }
  };

  const status = activeTokenData?.status?.toLowerCase() || 'waiting';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.waiting;
  const isNearTurn = status === 'waiting' && activeTokenData?.position && activeTokenData.position < 3;
  const isCalled = status === 'called';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200">
        <div className="text-center max-w-md mx-auto mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Track Farmer Token Status</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            टोकन की वास्तविक स्थिति और प्रतीक्षारत समय की जानकारी
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              placeholder="टोकन ID (उदा. TKN9745) या 10-अंकीय मोबाइल नंबर"
              className="block w-full pl-10 pr-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-slate-900 font-bold tracking-wider placeholder-slate-400 text-sm uppercase transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !tokenInput.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-6 py-3.5 rounded-xl shadow-md flex items-center space-x-2 text-sm transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Track</span>}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Token Details View */}
      {activeTokenData && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Notification Alerts Simulation Banner */}
          {isCalled && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 animate-pulse flex items-center space-x-3">
              <Bell className="w-6 h-6 flex-shrink-0 text-amber-300" />
              <div>
                <strong className="text-sm uppercase tracking-wider font-extrabold block">
                  📢 PROCEED TO MANDI GATE IMMEDIATELY!
                </strong>
                <p className="text-xs text-blue-100 mt-0.5">
                  Your token has been called to {activeTokenData.gate_assigned || 'Gate 1'}. Please enter with your vehicle for weighment.
                </p>
              </div>
            </div>
          )}

          {isNearTurn && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0 text-amber-100 animate-bounce" />
              <div>
                <strong className="text-sm uppercase tracking-wider font-bold block">
                  🚨 You are next, please move to mandi! (आपकी बारी निकट है)
                </strong>
                <p className="text-xs text-amber-100 mt-0.5">
                  Queue Position is #{activeTokenData.position}. Estimated arrival at gate in less than 20 minutes.
                </p>
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="bg-orange-600 text-white p-4 flex items-center space-x-3">
              <Clock className="w-6 h-6 flex-shrink-0 text-orange-200 animate-spin" />
              <div>
                <strong className="text-sm uppercase tracking-wider font-bold block">
                  ⚖️ Weighment & Quality Inspection In Progress
                </strong>
                <p className="text-xs text-orange-100 mt-0.5">
                  Your agricultural produce is being weighed on the electronic weighbridge.
                </p>
              </div>
            </div>
          )}

          {status === 'payment_processing' && (
            <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white p-4.5 flex items-center space-x-3.5 shadow-md">
              <div className="p-2.5 bg-white/10 rounded-2xl flex-shrink-0 border border-white/20">
                <CreditCard className="w-6 h-6 text-amber-300 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <strong className="text-sm uppercase tracking-wider font-extrabold block">
                    💳 PFMS / DBT Payment Processing Underway
                  </strong>
                  <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-bold">
                    {formatInr(calculateMspAmount(activeTokenData.crop_type, activeTokenData.quantity))}
                  </span>
                </div>
                <p className="text-xs text-indigo-100 mt-0.5">
                  Weighment approved! Mandi advice voucher generated. Bank transfer batching via PFMS in progress.
                </p>
              </div>
            </div>
          )}

          {status === 'done' && (
            <div className="bg-emerald-600 text-white p-4 flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-200" />
              <div>
                <strong className="text-sm uppercase tracking-wider font-bold block">
                  ✓ MSP Procurement Completed Successfully
                </strong>
                <p className="text-xs text-emerald-100 mt-0.5">
                  MSP procurement advice slip issued. Payment will be credited to your linked Aadhaar bank account via DBT.
                </p>
              </div>
            </div>
          )}

          {status === 'cancelled' && (
            <div className="bg-rose-600 text-white p-5 flex items-start space-x-3.5 shadow-lg">
              <AlertTriangle className="w-7 h-7 flex-shrink-0 text-amber-300 animate-pulse mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <strong className="text-base uppercase tracking-wider font-extrabold block">
                    ❌ आपका टोकन मंडी प्रशासन द्वारा रद्द कर दिया गया है
                  </strong>
                  <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-bold">
                    🔒 Private Notice
                  </span>
                </div>
                <p className="text-sm text-rose-100 mt-1 leading-relaxed">
                  यह टोकन मंडी प्रशासन द्वारा निरस्त (Cancel) कर दिया गया है। यह सूचना केवल आपको और मंडी अधिकारी को दिखाई दे रही है। सार्वजनिक लाइव सूची में यह किसी को नहीं दिखेगा।
                </p>
                {activeTokenData.cancellation_reason && (
                  <div className="mt-2.5 bg-black/20 p-2.5 rounded-xl border border-white/20 text-xs">
                    <span className="font-bold text-amber-200">रद्द करने का कारण: </span>
                    <span>{activeTokenData.cancellation_reason}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3">
                  {onNavigateToBooking && (
                    <button
                      onClick={() => onNavigateToBooking()}
                      className="bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition"
                    >
                      नया टोकन बुक करें
                    </button>
                  )}
                  <a
                    href={`https://wa.me/91${ADMIN_PHONE}?text=${encodeURIComponent(`नमस्ते मंडी प्रशासन, मेरा टोकन ${activeTokenData.token_id} (${activeTokenData.farmer_name}) रद्द हो गया है। कृपया सहायता करें।`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-rose-800/80 hover:bg-rose-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg border border-rose-400/40 transition flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>मंडी अधिकारी से संपर्क करें</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Token Header */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="text-center sm:text-left">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Token</span>
                <h3 className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-wider my-1">
                  {activeTokenData.token_id}
                </h3>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider mt-1 ${config.badgeClass}`}>
                  Status: {config.label} ({config.labelHindi})
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 justify-center sm:justify-start text-xs font-bold">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-700" />
                    <span>स्लॉट: {activeTokenData.preferred_date || 'Today'}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <Wheat className="w-3 h-3 text-amber-700" />
                    <span>{activeTokenData.crop_type} ({activeTokenData.quantity} Qtl)</span>
                  </span>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                <QRCodeSVG
                  value={JSON.stringify({
                    token: activeTokenData.token_id,
                    farmer: activeTokenData.farmer_name,
                    crop: activeTokenData.crop_type,
                    qty: activeTokenData.quantity
                  })}
                  size={100}
                />
              </div>
            </div>

            {/* Position & Wait time cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-center">
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                  Queue Position
                </span>
                <span className="text-3xl font-black font-mono text-slate-900 mt-1 block">
                  {status === 'waiting' ? `#${activeTokenData.position || 1}` : '—'}
                </span>
                <span className="text-[11px] text-amber-700 mt-1 block">
                  {status === 'waiting' ? 'Ahead in queue' : status.toUpperCase()}
                </span>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-center">
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                  Estimated Wait
                </span>
                <span className="text-3xl font-black font-mono text-emerald-700 mt-1 block">
                  {status === 'cancelled' ? '—' : status === 'done' ? '0m' : `${activeTokenData.estimated_wait_minutes || 0}m`}
                </span>
                <span className="text-[11px] text-emerald-600 mt-1 block">
                  {status === 'cancelled' ? 'Token Cancelled' : activeTokenData.position ? `${activeTokenData.position} × 10 min est.` : 'Immediate'}
                </span>
              </div>
            </div>

            {/* Farmer & Lot metadata */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs sm:text-sm">
              <div className="flex justify-between p-3.5">
                <span className="text-slate-500 flex items-center space-x-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Farmer Name</span>
                </span>
                <span className="font-bold text-slate-800">{activeTokenData.farmer_name}</span>
              </div>

              <div className="flex justify-between p-3.5 bg-blue-50/50">
                <span className="text-slate-600 flex items-center space-x-2 font-semibold">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>बुकिंग दिनांक (Booking Date)</span>
                </span>
                <span className="font-mono font-black text-blue-900 bg-white border border-blue-300 px-2 py-0.5 rounded shadow-2xs text-xs">
                  {activeTokenData.preferred_date || (activeTokenData.created_at ? activeTokenData.created_at.split('T')[0] : 'Today')}
                </span>
              </div>

              <div className="flex justify-between p-3.5">
                <span className="text-slate-500 flex items-center space-x-2">
                  <Wheat className="w-4 h-4 text-slate-400" />
                  <span>Crop Type</span>
                </span>
                <span className="font-bold text-slate-800">{activeTokenData.crop_type}</span>
              </div>

              <div className="flex justify-between p-3.5">
                <span className="text-slate-500 flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-slate-400" />
                  <span>Quantity</span>
                </span>
                <span className="font-bold text-slate-800 font-mono">{activeTokenData.quantity} Quintals</span>
              </div>

              <div className="flex justify-between p-3.5">
                <span className="text-slate-500 flex items-center space-x-2">
                  <DoorOpen className="w-4 h-4 text-slate-400" />
                  <span>Assigned Gate / प्रवेश द्वार</span>
                </span>
                <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md font-mono text-xs">
                  {activeTokenData.gate_assigned || 'Gate 1'}
                </span>
              </div>

              <div className="flex justify-between p-3.5">
                <span className="text-slate-500 flex items-center space-x-2">
                  {activeTokenData.shift === 'shift_2_night' ? (
                    <Moon className="w-4 h-4 text-indigo-500" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Mandi Shift / शिफ्ट समय</span>
                </span>
                <span className={`font-bold text-xs px-2.5 py-1 rounded-md flex items-center space-x-1 ${
                  activeTokenData.shift === 'shift_2_night'
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  <span>{activeTokenData.shift === 'shift_2_night' ? '🌙 Shift 2: Night (01:00 PM – 08:00 PM)' : '🌅 Shift 1: Day (06:00 AM – 11:00 AM)'}</span>
                </span>
              </div>

              {activeTokenData.vehicle_no && (
                <div className="flex justify-between p-3.5">
                  <span className="text-slate-500 flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <span>Vehicle / Trolley No</span>
                  </span>
                  <span className="font-bold text-slate-800 font-mono text-xs uppercase">
                    {activeTokenData.vehicle_no}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center p-3.5 bg-emerald-50/60">
                <span className="text-emerald-900 font-bold flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>बुकिंग दिनांक स्लॉट (Slot Date)</span>
                </span>
                <span className="font-extrabold text-emerald-950 font-mono text-xs bg-emerald-200/80 px-2.5 py-1 rounded-md border border-emerald-300">
                  {activeTokenData.preferred_date || 'Today'}
                </span>
              </div>
            </div>

            {/* Payment Processing Detail Section ("Payment kab milega" & "Is time kya processing chal rha hai") */}
            {(status === 'payment_processing' || status === 'done' || status === 'processing') && (() => {
              const stages = getPaymentProcessingStages(activeTokenData);
              const eta = getPaymentEta(activeTokenData);
              const totalPayout = calculateMspAmount(activeTokenData.crop_type, activeTokenData.quantity);

              return (
                <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-slate-50 rounded-2xl border border-indigo-200/90 p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-900 tracking-tight">
                          DBT Payment Tracking Desk (भुगतान स्थिति)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Direct Bank Transfer to Aadhaar-linked Bank Account
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">Total MSP Payout</span>
                      <span className="font-mono text-xl sm:text-2xl font-black text-indigo-900">
                        {formatInr(totalPayout)}
                      </span>
                    </div>
                  </div>

                  {/* Feature 1: Payment kab milega? */}
                  <div className="bg-white rounded-xl p-4 border border-indigo-100 shadow-xs space-y-2">
                    <div className="flex items-center space-x-2 text-indigo-950 font-bold text-sm">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                      </span>
                      <span>Payment kab milega? (भुगतान कब मिलेगा?)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-100/80">
                        <span className="text-[11px] text-slate-500 font-medium block">Expected Disbursement Window:</span>
                        <span className="text-sm font-extrabold text-indigo-950 block">
                          ⏱️ {eta.estimatedWindow} ({eta.estimatedWindowHindi})
                        </span>
                      </div>
                      <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100/80">
                        <span className="text-[11px] text-slate-500 font-medium block">Expected Credit Date & Time:</span>
                        <span className="text-sm font-extrabold text-emerald-950 font-mono block">
                          📅 {eta.expectedDate}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1">
                      💡 {eta.dbtNote} (PFMS Ref No: <b className="font-mono">{eta.batchId}</b>)
                    </p>
                  </div>

                  {/* Feature 2: Is time kya processing chal rha hai? */}
                  <div className="bg-white rounded-xl p-4 border border-indigo-100 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-950 font-bold text-sm flex items-center gap-2">
                        <span>🔄 Is time kya processing chal rha hai payment ka?</span>
                      </span>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded">
                        4-Stage PFMS Tracker
                      </span>
                    </div>

                    <div className="space-y-3 pt-1">
                      {stages.map((st) => (
                        <div
                          key={st.step}
                          className={`p-3 rounded-xl border transition flex items-start space-x-3 ${
                            st.status === 'completed'
                              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                              : st.status === 'in_progress'
                              ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 ring-2 ring-indigo-400/20'
                              : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                          }`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {st.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            ) : st.status === 'in_progress' ? (
                              <span className="flex h-5 w-5 relative items-center justify-center">
                                <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
                              </span>
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-400 font-mono">
                                {st.step}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm">
                                Step {st.step}: {st.title} ({st.titleHindi})
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                st.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : st.status === 'in_progress'
                                  ? 'bg-indigo-100 text-indigo-900 font-extrabold animate-pulse'
                                  : 'bg-slate-200 text-slate-600'
                              }`}>
                                {st.status === 'completed' ? '✓ Completed' : st.status === 'in_progress' ? '⚡ Active Now' : 'Pending'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {st.description}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                              {st.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Officer Admin Help & Dispatch Bar */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-950">Mandi Admin Officer & Kisan Helpdesk</p>
                  <p className="text-emerald-700">
                    Admin Helpline: <strong className="font-mono">+91 {ADMIN_PHONE}</strong> • Toll-Free Helpdesk: <strong className="font-mono">1800-11-8882</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto">
                <a
                  href={`tel:${ADMIN_PHONE}`}
                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center space-x-1 shadow-sm transition"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call Admin</span>
                </a>
                <a
                  href={`https://wa.me/91${ADMIN_PHONE}?text=${encodeURIComponent(`🌾 Inquiry regarding Token ${activeTokenData.token_id} for ${activeTokenData.farmer_name} at ${activeTokenData.gate_assigned || 'Gate 1'}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center space-x-1 shadow-sm transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href="tel:1800118882"
                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center space-x-1 shadow-sm transition"
                >
                  <span>Helpdesk</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
