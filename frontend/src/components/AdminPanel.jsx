import React, { useState } from 'react';
import QueueCard from './QueueCard';
import ContactModal from './ContactModal';
import AddFarmerModal from './AddFarmerModal';
import PaymentModal from './PaymentModal';
import { api } from '../services/api';
import {
  ShieldCheck,
  PhoneCall,
  Play,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Users,
  Scale,
  ArrowRight,
  Loader2,
  Lock,
  Unlock,
  LogOut,
  KeyRound,
  UserPlus,
  Sparkles,
  Filter,
  MessageCircle,
  Send,
  CreditCard
} from 'lucide-react';

export default function AdminPanel({
  queue,
  summary,
  onRefresh,
  onUpdateStatus,
  onCallNext,
  onDeleteSlot
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('mandi_admin_authenticated') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [callingNext, setCallingNext] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [resetting, setResetting] = useState(false);

  // New real manual data, payment & communication state
  const [addFarmerOpen, setAddFarmerOpen] = useState(false);
  const [contactSlot, setContactSlot] = useState(null);
  const [paymentModalSlot, setPaymentModalSlot] = useState(null);
  const [realOnlyFilter, setRealOnlyFilter] = useState(false);
  const [gateFilter, setGateFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');

  const handleLogin = (e) => {
    e?.preventDefault();
    if (pinInput === '8882' || pinInput === 'admin123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('mandi_admin_authenticated', 'true');
      setPinError('');
      setPinInput('');
    } else {
      setPinError('Invalid Officer PIN. Access denied.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('mandi_admin_authenticated');
  };

  const handleCallNextFarmer = async () => {
    try {
      setCallingNext(true);
      setActionMessage(null);
      const res = await onCallNext();
      if (res && res.data) {
        setActionMessage({
          type: 'success',
          text: `Token ${res.data.token_id} (${res.data.farmer_name}) called to Mandi ${res.data.gate_assigned || 'Gate 1'}!`
        });
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'No waiting farmers in queue.'
      });
    } finally {
      setCallingNext(false);
    }
  };

  const handleSendSummaryToAdmin = () => {
    const waitingList = queue.filter(s => s.status === 'waiting');
    const calledList = queue.filter(s => s.status === 'called');
    const processingList = queue.filter(s => s.status === 'processing');
    const paymentList = queue.filter(s => s.status === 'payment_processing');
    const s1Count = queue.filter(s => (s.shift || 'shift_1_day') === 'shift_1_day').length;
    const s2Count = queue.filter(s => s.shift === 'shift_2_night').length;

    const text = 
      `🌾 Smart Mandi - Live Queue Briefing for Officer Admin (+91 91058 46785)\n\n` +
      `📊 Summary:\n` +
      `• Total Active: ${queue.length}\n` +
      `• Waiting in Line: ${waitingList.length}\n` +
      `• Called to Gate: ${calledList.length}\n` +
      `• Weighbridge Processing: ${processingList.length}\n` +
      `• Payment Processing (PFMS): ${paymentList.length}\n\n` +
      `⏰ 2-Shift Operations:\n` +
      `• Shift 1 (Day 6am-11am): ${s1Count} tokens\n` +
      `• Shift 2 (Night 1pm-8pm): ${s2Count} tokens\n\n` +
      `🚪 3-Gate Breakdown:\n` +
      `• Gate 1 (Heavy Tractors): ${queue.filter(s => (s.gate_assigned || 'Gate 1') === 'Gate 1').length}\n` +
      `• Gate 2 (Commercial Pickups): ${queue.filter(s => s.gate_assigned === 'Gate 2').length}\n` +
      `• Gate 3 (Light Carriers): ${queue.filter(s => s.gate_assigned === 'Gate 3').length}\n\n` +
      `👉 Arriving Farmers List to Contact:\n` +
      waitingList.slice(0, 4).map((w, i) => `${i+1}. ${w.token_id} - ${w.farmer_name} (${w.shift === 'shift_2_night' ? 'Night' : 'Day'}) - Ph: ${w.phone || 'N/A'} - Gate: ${w.gate_assigned || 'Gate 1'}`).join('\n');

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/919105846785?text=${encoded}`, '_blank');
  };

  const handleResetSeed = async () => {
    if (!window.confirm('Reset queue with demo test data? Your manual farmer entries in local storage will still be preserved.')) {
      return;
    }
    try {
      setResetting(true);
      await api.resetSeed();
      await onRefresh();
      setActionMessage({
        type: 'success',
        text: 'Queue reset successfully. All manual entries remain safely preserved.'
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: 'Failed to reset: ' + err.message
      });
    } finally {
      setResetting(false);
    }
  };

  const handleFarmerAdded = (newFarmer) => {
    onRefresh();
    setActionMessage({
      type: 'success',
      text: `Manual farmer ${newFarmer.farmer_name} (Token ${newFarmer.token_id}) added successfully! Data is permanently saved.`
    });
    // Prompt to contact farmer / dispatch to admin
    setContactSlot(newFarmer);
  };

  // Filter queue by Real Only, Gate Filter, and Shift Filter
  let displayedQueue = queue;
  if (realOnlyFilter) {
    displayedQueue = displayedQueue.filter(item => item.is_manual);
  }
  if (gateFilter !== 'all') {
    displayedQueue = displayedQueue.filter(item => (item.gate_assigned || 'Gate 1') === gateFilter);
  }
  if (shiftFilter !== 'all') {
    displayedQueue = displayedQueue.filter(item => (item.shift || 'shift_1_day') === shiftFilter);
  }

  const waitingFarmers = displayedQueue.filter(item => item.status === 'waiting');
  const calledFarmers = displayedQueue.filter(item => item.status === 'called');
  const processingFarmers = displayedQueue.filter(item => item.status === 'processing');
  const paymentProcessingFarmers = displayedQueue.filter(item => item.status === 'payment_processing');
  const doneFarmers = displayedQueue.filter(item => item.status === 'done');

  // If not authenticated, render secure officer login gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12">
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-slate-900 text-emerald-400 rounded-2xl flex items-center justify-center shadow-lg border border-slate-700">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Officer Admin Access
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              सुरक्षित अधिकारी नियंत्रण कक्ष • MSP Counter Dispatch
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-left text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Enter Officer PIN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError('');
                  }}
                  placeholder="Enter 4-digit Officer PIN"
                  autoFocus
                  className="block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-center tracking-widest text-slate-900 font-bold placeholder:tracking-normal placeholder:font-normal placeholder:text-xs"
                />
              </div>
            </div>

            {pinError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Admin Desk</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Officer Control Cockpit */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Procurement Officer Admin Desk
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-900 text-emerald-300 border border-emerald-700">
                  Officer Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                APMC Weighbridge, Real Farmer Spot Registration & Dispatch Console
              </p>
              <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-300">
                <span className="text-slate-400">Admin Calling & SMS Mobile:</span>
                <a
                  href="tel:9105846785"
                  className="font-mono font-bold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center space-x-1"
                  title="Click to call Admin Mobile"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>+91 91058 46785</span>
                </a>
                <span className="text-slate-600">•</span>
                <a
                  href="https://wa.me/919105846785"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline text-[11px] font-semibold"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* ADMIN CALLING PHONE BADGE */}
            <a
              href="tel:9105846785"
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/70 rounded-xl text-xs font-mono font-bold transition"
              title="Admin Mobile: 9105846785"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span>9105846785</span>
            </a>

            {/* SEND QUEUE BRIEFING TO ADMIN */}
            <button
              onClick={handleSendSummaryToAdmin}
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-900/30"
              title="Forward live queue status and waiting list to Admin Phone (9105846785)"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>📲 Dispatch to Admin (9105846785)</span>
            </button>

            {/* ADD MANUAL FARMER BUTTON */}
            <button
              onClick={() => setAddFarmerOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-900/40 transition transform active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Manual Farmer (नया किसान)</span>
            </button>

            {/* TOGGLE REAL MANUAL ONLY */}
            <button
              onClick={() => setRealOnlyFilter(!realOnlyFilter)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                realOnlyFilter
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{realOnlyFilter ? 'Real Entries Only' : 'Filter Real'}</span>
            </button>

            {/* Demo Reset */}
            <button
              onClick={handleResetSeed}
              disabled={resetting}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs border border-slate-700 transition"
              title="Reset sample seed data (manual entries preserved)"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-xl text-xs border border-rose-800/60 transition"
              title="Lock Admin Desk"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock</span>
            </button>
          </div>
        </div>

        {/* Action Message Banner */}
        {actionMessage && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-xs flex items-center space-x-2.5 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-600 text-rose-200'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Primary Admin Dispatch Buttons - 4 Stage Workflow */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Button 1: Call Next Farmer */}
          <button
            onClick={handleCallNextFarmer}
            disabled={callingNext || waitingFarmers.length === 0}
            className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white p-4 rounded-2xl font-bold flex flex-col items-center justify-center space-y-1 shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-2">
              {callingNext ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <PhoneCall className="w-5 h-5" />
              )}
              <span className="text-base">1. Call Farmer</span>
            </div>
            <span className="text-[11px] text-blue-200 font-normal">
              {waitingFarmers.length > 0
                ? `Advances ${waitingFarmers[0].token_id} to Called`
                : 'No farmers waiting'}
            </span>
          </button>

          {/* Button 2: Mark as Processing */}
          <button
            onClick={() => {
              if (calledFarmers.length > 0) {
                onUpdateStatus(calledFarmers[0].token_id, 'processing');
                setActionMessage({
                  type: 'success',
                  text: `Token ${calledFarmers[0].token_id} is now on the weighbridge (Processing).`
                });
              }
            }}
            disabled={calledFarmers.length === 0}
            className="bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white p-4 rounded-2xl font-bold flex flex-col items-center justify-center space-y-1 shadow-lg shadow-orange-600/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-2">
              <Scale className="w-5 h-5" />
              <span className="text-base">2. Mark Processing</span>
            </div>
            <span className="text-[11px] text-orange-200 font-normal">
              {calledFarmers.length > 0
                ? `Advance ${calledFarmers[0].token_id} to Weighbridge`
                : 'No farmer called yet'}
            </span>
          </button>

          {/* Button 3: Mark Payment Processing */}
          <button
            onClick={() => {
              if (processingFarmers.length > 0) {
                const target = processingFarmers[0];
                onUpdateStatus(target.token_id, 'payment_processing');
                setPaymentModalSlot({ ...target, status: 'payment_processing' });
                setActionMessage({
                  type: 'success',
                  text: `Token ${target.token_id} moved to Payment Processing (PFMS / DBT Stage)!`
                });
              }
            }}
            disabled={processingFarmers.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white p-4 rounded-2xl font-bold flex flex-col items-center justify-center space-y-1 shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span className="text-base">3. Payment Processing</span>
            </div>
            <span className="text-[11px] text-indigo-200 font-normal">
              {processingFarmers.length > 0
                ? `Advance ${processingFarmers[0].token_id} to PFMS/DBT`
                : 'No farmer on weighbridge'}
            </span>
          </button>

          {/* Button 4: Mark as Done */}
          <button
            onClick={() => {
              const target = paymentProcessingFarmers.length > 0 ? paymentProcessingFarmers[0] : processingFarmers[0];
              if (target) {
                onUpdateStatus(target.token_id, 'done');
                setActionMessage({
                  type: 'success',
                  text: `Token ${target.token_id} payment released & procurement completed!`
                });
              }
            }}
            disabled={paymentProcessingFarmers.length === 0 && processingFarmers.length === 0}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white p-4 rounded-2xl font-bold flex flex-col items-center justify-center space-y-1 shadow-lg shadow-emerald-600/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-base">4. Mark Done</span>
            </div>
            <span className="text-[11px] text-emerald-200 font-normal">
              {paymentProcessingFarmers.length > 0
                ? `Release Payment for ${paymentProcessingFarmers[0].token_id}`
                : processingFarmers.length > 0
                ? `Complete ${processingFarmers[0].token_id}`
                : 'No active payment'}
            </span>
          </button>
        </div>
      </div>

      {/* Admin Queue Management Pipeline */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span>Procurement Pipeline Operations</span>
            <span className="text-xs px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded-full font-semibold">
              {displayedQueue.length} Slot{displayedQueue.length !== 1 ? 's' : ''}
              {realOnlyFilter && ' (Real Only)'}
            </span>
          </h3>
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <span>💡 Click <strong>WhatsApp/SMS</strong> or <strong>Call</strong> on any card to reach farmer or dispatch to Admin</span>
          </div>
        </div>

        {/* 3 Gates Filter Bar for Admin */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 text-xs">
          <span className="font-bold text-slate-600 px-2 uppercase tracking-wider text-[11px]">
            Filter by Gate / प्रवेश द्वार:
          </span>
          <button
            onClick={() => setGateFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              gateFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
            }`}
          >
            All Gates ({queue.length})
          </button>
          <button
            onClick={() => setGateFilter('Gate 1')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
              gateFilter === 'Gate 1'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-blue-800 hover:bg-blue-50 border border-blue-200'
            }`}
          >
            <span>Gate 1 (Heavy Tractors)</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-mono">
              {queue.filter(s => (s.gate_assigned || 'Gate 1') === 'Gate 1').length}
            </span>
          </button>
          <button
            onClick={() => setGateFilter('Gate 2')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
              gateFilter === 'Gate 2'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <span>Gate 2 (Commercial Pickups)</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-mono">
              {queue.filter(s => s.gate_assigned === 'Gate 2').length}
            </span>
          </button>
          <button
            onClick={() => setGateFilter('Gate 3')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
              gateFilter === 'Gate 3'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
            }`}
          >
            <span>Gate 3 (Light Carriers / Bay 3)</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-mono">
              {queue.filter(s => s.gate_assigned === 'Gate 3').length}
            </span>
          </button>
        </div>

        {/* 2 Shifts Filter Bar for Admin */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 text-xs">
          <span className="font-bold text-slate-600 px-2 uppercase tracking-wider text-[11px]">
            Filter by Shift / शिफ्ट:
          </span>
          <button
            onClick={() => setShiftFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              shiftFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
            }`}
          >
            All Shifts ({queue.length})
          </button>
          <button
            onClick={() => setShiftFilter('shift_1_day')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
              shiftFilter === 'shift_1_day'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <span>🌅 Shift 1: Day (6:00 AM – 11:00 AM)</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-mono">
              {queue.filter(s => (s.shift || 'shift_1_day') === 'shift_1_day').length}
            </span>
          </button>
          <button
            onClick={() => setShiftFilter('shift_2_night')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
              shiftFilter === 'shift_2_night'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-indigo-900 hover:bg-indigo-50 border border-indigo-200'
            }`}
          >
            <span>🌙 Shift 2: Night (1:00 PM – 8:00 PM)</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-mono">
              {queue.filter(s => s.shift === 'shift_2_night').length}
            </span>
          </button>
        </div>

        {/* 5 Pipeline Columns: Waiting, Called, Processing, Payment Processing, Done */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* 1. Waiting Column */}
          <div className="space-y-3">
            <div className="bg-amber-100/70 border border-amber-300/80 px-3 py-2 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                1. Waiting ({waitingFarmers.length})
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            {waitingFarmers.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center bg-white rounded-xl border border-slate-200">
                No waiting farmers
              </p>
            ) : (
              waitingFarmers.map(slot => (
                <QueueCard
                  key={slot.token_id}
                  slot={slot}
                  isAdmin={true}
                  onUpdateStatus={onUpdateStatus}
                  onOpenContact={(s) => setContactSlot(s)}
                  onOpenPayment={(s) => setPaymentModalSlot(s)}
                  onDeleteSlot={onDeleteSlot}
                />
              ))
            )}
          </div>

          {/* 2. Called Column */}
          <div className="space-y-3">
            <div className="bg-blue-100/70 border border-blue-300/80 px-3 py-2 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                2. Called ({calledFarmers.length})
              </span>
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            {calledFarmers.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center bg-white rounded-xl border border-slate-200">
                No farmers called
              </p>
            ) : (
              calledFarmers.map(slot => (
                <QueueCard
                  key={slot.token_id}
                  slot={slot}
                  isAdmin={true}
                  onUpdateStatus={onUpdateStatus}
                  onOpenContact={(s) => setContactSlot(s)}
                  onOpenPayment={(s) => setPaymentModalSlot(s)}
                  onDeleteSlot={onDeleteSlot}
                />
              ))
            )}
          </div>

          {/* 3. Processing Column */}
          <div className="space-y-3">
            <div className="bg-orange-100/70 border border-orange-300/80 px-3 py-2 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-900">
                3. Processing ({processingFarmers.length})
              </span>
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            </div>
            {processingFarmers.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center bg-white rounded-xl border border-slate-200">
                No active weighing
              </p>
            ) : (
              processingFarmers.map(slot => (
                <QueueCard
                  key={slot.token_id}
                  slot={slot}
                  isAdmin={true}
                  onUpdateStatus={onUpdateStatus}
                  onOpenContact={(s) => setContactSlot(s)}
                  onOpenPayment={(s) => setPaymentModalSlot(s)}
                  onDeleteSlot={onDeleteSlot}
                />
              ))
            )}
          </div>

          {/* 4. Payment Processing Column */}
          <div className="space-y-3">
            <div className="bg-indigo-100/80 border border-indigo-300 px-3 py-2 rounded-xl flex items-center justify-between shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                4. Payment ({paymentProcessingFarmers.length})
              </span>
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
            </div>
            {paymentProcessingFarmers.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center bg-white rounded-xl border border-slate-200">
                No pending PFMS payments
              </p>
            ) : (
              paymentProcessingFarmers.map(slot => (
                <QueueCard
                  key={slot.token_id}
                  slot={slot}
                  isAdmin={true}
                  onUpdateStatus={onUpdateStatus}
                  onOpenContact={(s) => setContactSlot(s)}
                  onOpenPayment={(s) => setPaymentModalSlot(s)}
                  onDeleteSlot={onDeleteSlot}
                />
              ))
            )}
          </div>

          {/* 5. Done Column */}
          <div className="space-y-3">
            <div className="bg-emerald-100/70 border border-emerald-300/80 px-3 py-2 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                5. Done ({doneFarmers.length})
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            {doneFarmers.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center bg-white rounded-xl border border-slate-200">
                None completed yet
              </p>
            ) : (
              doneFarmers.slice(0, 8).map(slot => (
                <QueueCard
                  key={slot.token_id}
                  slot={slot}
                  isAdmin={true}
                  onUpdateStatus={onUpdateStatus}
                  onOpenContact={(s) => setContactSlot(s)}
                  onOpenPayment={(s) => setPaymentModalSlot(s)}
                  onDeleteSlot={onDeleteSlot}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Manual Farmer Modal */}
      <AddFarmerModal
        isOpen={addFarmerOpen}
        onClose={() => setAddFarmerOpen(false)}
        onFarmerAdded={handleFarmerAdded}
      />

      {/* Farmer Contact & Dispatch Modal */}
      <ContactModal
        slot={contactSlot}
        isOpen={Boolean(contactSlot)}
        onClose={() => setContactSlot(null)}
        isAdmin={true}
      />

      {/* Payment Processing Modal (Payment kab milega & live stages) */}
      <PaymentModal
        slot={paymentModalSlot}
        isOpen={Boolean(paymentModalSlot)}
        onClose={() => setPaymentModalSlot(null)}
        isAdmin={true}
        onMarkDone={(tid) => {
          onUpdateStatus(tid, 'done');
          setPaymentModalSlot(null);
          setActionMessage({
            type: 'success',
            text: `Token ${tid} payment release confirmed & marked Done!`
          });
        }}
      />
    </div>
  );
}
