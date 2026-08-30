import React, { useState, useEffect } from 'react';
import QueueCard from './QueueCard';
import ContactModal from './ContactModal';
import AddFarmerModal from './AddFarmerModal';
import PaymentModal from './PaymentModal';
import {
  Radio,
  RefreshCw,
  Volume2,
  VolumeX,
  AlertCircle,
  Filter,
  Sparkles,
  Megaphone,
  UserPlus,
  PhoneCall,
  CreditCard,
  Sun,
  Moon,
  Clock,
  ShieldCheck,
  Headphones,
  MessageCircle,
  Truck,
  Scale,
  Calendar
} from 'lucide-react';
import { getCurrentShiftInfo, MANDI_SHIFTS } from '../utils/shiftUtils';

const ADMIN_PHONE = '9105846785';
const HELPDESK_PHONE = '1800-11-8882';

export default function LiveQueue({
  queue,
  summary,
  loading,
  onRefresh,
  lastUpdated,
  onAnnounce
}) {
  const [filter, setFilter] = useState('all');
  const [gateFilter, setGateFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [countdown, setCountdown] = useState(4);

  // Communication, Payment & Add Farmer Modals
  const [contactSlot, setContactSlot] = useState(null);
  const [paymentModalSlot, setPaymentModalSlot] = useState(null);
  const [addFarmerOpen, setAddFarmerOpen] = useState(false);

  // Date-wise Quota Breakdown (Today + next 7 days)
  const todayStr = new Date().toISOString().split('T')[0];
  const dateBreakdown = (summary?.date_wise_breakdown && summary.date_wise_breakdown.length > 0)
    ? summary.date_wise_breakdown
    : (() => {
        const list = [];
        const today = new Date();
        for (let i = 0; i < 8; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          const dStr = d.toISOString().split('T')[0];
          const label = i === 0 ? 'Today (आज)' : i === 1 ? 'Tomorrow (कल)' : d.toLocaleDateString('hi-IN', { weekday: 'short', month: 'short', day: 'numeric' });
          const daySlots = (queue || []).filter(s => s.status !== 'cancelled' && (s.preferred_date === dStr || (!s.preferred_date && i === 0)));
          const booked = daySlots.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
          const remaining = Math.max(0, 3000 - booked);
          list.push({
            date: dStr,
            label,
            booked_quintals: booked,
            remaining_quintals: remaining,
            capacity: 3000,
            farmer_count: daySlots.length,
            percent: Math.min(100, Math.round((booked / 3000) * 100)),
            status: remaining <= 0 ? 'full' : remaining < 500 ? 'fast_filling' : 'available'
          });
        }
        return list;
      })();

  // Auto-refresh timer every 4 seconds
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onRefresh();
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, onRefresh]);

  const filteredQueue = queue.filter(item => {
    // PRIVACY RULE: Cancelled tokens are strictly hidden from public view!
    if (item.status === 'cancelled') return false;

    // Date Filter
    if (dateFilter !== 'all') {
      const itemDate = item.preferred_date || (item.created_at ? item.created_at.split('T')[0] : todayStr);
      if (itemDate !== dateFilter) {
        return false;
      }
    }

    // Gate Filter
    if (gateFilter !== 'all' && (item.gate_assigned || 'Gate 1') !== gateFilter) {
      return false;
    }
    // Shift Filter
    if (shiftFilter !== 'all' && (item.shift || 'shift_1_day') !== shiftFilter) {
      return false;
    }
    // Status / Real Filter
    if (filter === 'all') return true;
    if (filter === 'real') return Boolean(item.is_manual);
    return (item.status || 'waiting').toLowerCase() === filter.toLowerCase();
  });

  // Current active/called farmers for big TV board
  const currentlyCalled = queue.filter(item => item.status === 'called');
  const currentlyProcessing = queue.filter(item => item.status === 'processing');
  const currentlyPaymentProcessing = queue.filter(item => item.status === 'payment_processing');

  const realEntriesCount = queue.filter(item => item.is_manual).length;
  const gate1Count = queue.filter(item => (item.gate_assigned || 'Gate 1') === 'Gate 1').length;
  const gate2Count = queue.filter(item => item.gate_assigned === 'Gate 2').length;
  const gate3Count = queue.filter(item => item.gate_assigned === 'Gate 3').length;

  const shift1Count = queue.filter(item => (item.shift || 'shift_1_day') === 'shift_1_day').length;
  const shift2Count = queue.filter(item => item.shift === 'shift_2_night').length;
  const currentShiftInfo = getCurrentShiftInfo();

  // Daily 3000 Quintals Mandi Capacity & Vehicle Intake Metrics
  const activeToday = queue.filter(s => s.status !== 'cancelled' && (s.preferred_date === todayStr || (s.created_at && s.created_at.startsWith(todayStr))));
  const bookedQuintals = summary?.quintals_booked_today ?? activeToday.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
  const remainingQuintals = summary?.quintals_remaining_today ?? Math.max(0, 3000 - bookedQuintals);
  const percentFilled = Math.min(100, Math.round((bookedQuintals / 3000) * 100));
  const vehiclesCount = summary?.vehicles_arrived_today ?? activeToday.filter(s => s.vehicle_no && s.vehicle_no.trim().length > 0).length;

  return (
    <div className="space-y-8">
      {/* Live Mandi Big Display Screen (TV Board Style) */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center space-x-3">
              <span className="flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center space-x-2">
                  <span>Mandi Live Queue Display</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full">
                    सार्वजनिक प्रदर्शन
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Auto-syncing every 4 seconds • Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Just now'}
                </p>
              </div>
            </div>

            {/* Quick Actions Bar: Spot Registration & Refresh */}
            <div className="flex flex-wrap items-center gap-3">
              {/* SPOT REGISTRATION BUTTON */}
              <button
                onClick={() => setAddFarmerOpen(true)}
                className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/30 transition transform active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Spot Entry (नया किसान)</span>
              </button>

              <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                <span className="text-slate-400">Next sync in:</span>
                <span className="font-mono font-bold text-emerald-400 w-4 text-center">{countdown}s</span>
              </div>

              <button
                onClick={() => {
                  setCountdown(4);
                  onRefresh();
                }}
                disabled={loading}
                title="Refresh queue now"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Live Mandi Shift Operations Banner */}
          <div className="mt-5 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl border flex items-center justify-center ${
                currentShiftInfo.shiftId === 'shift_2_night'
                  ? 'bg-indigo-900/60 text-indigo-300 border-indigo-500/40'
                  : currentShiftInfo.shiftId === 'shift_1_day'
                  ? 'bg-amber-900/60 text-amber-300 border-amber-500/40'
                  : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}>
                {currentShiftInfo.shiftId === 'shift_2_night' ? (
                  <Moon className="w-5 h-5 animate-pulse" />
                ) : currentShiftInfo.shiftId === 'shift_1_day' ? (
                  <Sun className="w-5 h-5 text-amber-400 animate-pulse" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm text-white">
                    {currentShiftInfo.label} ({currentShiftInfo.hours})
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    currentShiftInfo.isReceiving
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {currentShiftInfo.isReceiving ? 'Weighbridges Open' : 'Gate Entry On Hold'}
                  </span>
                </div>
                <p className="text-slate-400 mt-0.5">
                  {currentShiftInfo.labelHindi} • {currentShiftInfo.remainingText} • Both 1st & 2nd Shift tokens accepted
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 font-mono text-[11px] bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700/60 flex-shrink-0">
              <span className="text-amber-300 font-bold">Shift 1 (Day): 6am-11am</span>
              <span className="text-slate-600">|</span>
              <span className="text-indigo-300 font-bold">Shift 2 (Night): 1pm-8pm</span>
            </div>
          </div>

          {/* 🌾 Live Mandi Daily Capacity & Vehicle Intake Widget (3000 Quintals Quota) */}
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-emerald-500/30 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-black tracking-wide text-white uppercase">
                      दैनिक मंडी आवक क्षमता (Daily Mandi Capacity)
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      अधिकतम 3,000 क्विंटल / दिन
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Mandi Daily Intake Cap • 3000 Quintals Max per Day
                  </p>
                </div>
              </div>

              {/* Quick Numbers */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 flex items-center space-x-1.5">
                  <span className="text-slate-400">कुल कोटा:</span>
                  <strong className="text-white font-mono">3,000 Qtl</strong>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 flex items-center space-x-1.5 text-emerald-300">
                  <span className="text-slate-400">आवक/बुक:</span>
                  <strong className="font-mono">{bookedQuintals} Qtl</strong>
                </div>

                <div className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 ${
                  remainingQuintals > 500
                    ? 'bg-slate-950/80 border-emerald-500/50 text-emerald-400'
                    : remainingQuintals > 0
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                    : 'bg-rose-950/80 border-rose-500/70 text-rose-300'
                }`}>
                  <span className="text-slate-400">शेष कोटा:</span>
                  <strong className="font-mono font-extrabold">{remainingQuintals} Qtl</strong>
                </div>

                {/* Total Vehicles Arrived */}
                <div className="px-3 py-1.5 rounded-xl bg-indigo-950/70 border border-indigo-500/40 flex items-center space-x-1.5 text-indigo-300">
                  <Truck className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-slate-400">कुल वाहन:</span>
                  <strong className="font-mono text-white">{vehiclesCount} वाहन</strong>
                </div>
              </div>
            </div>

            {/* Progress Bar & Status Line */}
            <div className="mt-3">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-medium text-[11px] flex items-center gap-1.5">
                  <span>कोटा भरा: <strong>{percentFilled}%</strong> ({bookedQuintals} / 3000 Qtl)</span>
                  {remainingQuintals === 0 && (
                    <span className="text-rose-400 font-bold bg-rose-950/80 px-2 py-0.2 rounded-md border border-rose-700/60">
                      🚫 आज का कोटा पूरा (Mandi Full)
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {remainingQuintals > 0 ? `स्थान उपलब्ध: ${remainingQuintals} क्विंटल` : 'स्लॉट फुल'}
                </span>
              </div>

              <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percentFilled >= 100
                      ? 'bg-rose-500 shadow-md shadow-rose-500/50'
                      : percentFilled >= 75
                      ? 'bg-amber-500 shadow-md shadow-amber-500/50'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{ width: `${percentFilled}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 📅 Multi-Day Quota & Booking Status (Today + 7 Days) for All Farmers */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  📅 आगामी 7 दिनों का मंडी कोटा व बुकिंग स्थिति (Upcoming Mandi Booking Quota)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {dateFilter === 'all' ? 'सभी दिन प्रदर्शित' : `फ़िल्टर: ${dateFilter}`} • तारीख पर क्लिक करके फ़िल्टर करें
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {dateBreakdown.map(day => {
                const isSelected = dateFilter === day.date;
                const isFull = day.remaining_quintals <= 0;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setDateFilter(prev => prev === day.date ? 'all' : day.date)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-950/90 border-emerald-400 ring-2 ring-emerald-500/50 shadow-lg'
                        : isFull
                        ? 'bg-slate-900/60 border-slate-800 opacity-70 hover:opacity-100 hover:border-rose-900'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white truncate">{day.label}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                        isFull
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : day.status === 'fast_filling'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {isFull ? 'फुल' : `${day.remaining_quintals}Q`}
                      </span>
                    </div>

                    <div className="mt-1 text-[10px] text-slate-400 flex justify-between font-mono">
                      <span>{day.date.slice(5)}</span>
                      <span className="text-emerald-300 font-bold">{day.booked_quintals} Q</span>
                    </div>

                    <div className="mt-1.5 w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                      <div
                        className={`h-full ${
                          isFull ? 'bg-rose-500' : day.percent >= 75 ? 'bg-amber-500' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${day.percent}%` }}
                      />
                    </div>

                    <div className="mt-1 text-[9px] text-slate-400 flex justify-between pt-0.5">
                      <span>{day.farmer_count} किसान</span>
                      <span className="font-mono">{day.percent}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hero "NOW SERVING / CALLED" Banner */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Called section */}
            <div className="bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-600/40 rounded-2xl p-5 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Megaphone className="w-5 h-5 text-blue-400 animate-bounce" />
                  <span className="text-sm font-extrabold uppercase tracking-wider text-blue-300">
                    Now Calling / प्रवेश करें
                  </span>
                </div>
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                  {currentlyCalled.length} at Gate
                </span>
              </div>

              {currentlyCalled.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  No tokens called to gate currently. Next tractor will be called shortly.
                </div>
              ) : (
                <div className="space-y-2">
                  {currentlyCalled.map(slot => (
                    <div
                      key={slot.token_id}
                      className="bg-blue-900/40 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-xl text-white">{slot.token_id}</span>
                          <span className="text-xs font-bold text-blue-200">{slot.farmer_name}</span>
                          {slot.is_manual && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-500/30 text-purple-200 rounded">
                              Real
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-blue-300 font-mono mt-0.5">
                          {slot.crop_type} • {slot.quantity} Qtl • Gate: {slot.gate_assigned || 'Gate 1'}
                          {slot.vehicle_no && ` • ${slot.vehicle_no}`}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {onAnnounce && (
                          <button
                            onClick={() => onAnnounce(slot)}
                            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-sm"
                            title="Speak Hindi/English Mandi Announcement"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* In Progress section */}
            <div className="bg-gradient-to-br from-orange-950/60 to-slate-900 border border-orange-600/40 rounded-2xl p-5 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse"></span>
                  <span className="text-sm font-extrabold uppercase tracking-wider text-orange-300">
                    Weighing & Quality Inspection
                  </span>
                </div>
                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-bold">
                  {currentlyProcessing.length} Active
                </span>
              </div>

              {currentlyProcessing.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  Weighbridge is clear.
                </div>
              ) : (
                <div className="space-y-2">
                  {currentlyProcessing.map(slot => (
                    <div
                      key={slot.token_id}
                      className="bg-orange-900/40 border border-orange-500/30 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-xl text-white">{slot.token_id}</span>
                          <span className="text-xs font-bold text-orange-200">{slot.farmer_name}</span>
                        </div>
                        <p className="text-xs text-orange-300 font-mono mt-0.5">
                          {slot.crop_type} • {slot.quantity} Qtl
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <p className="text-slate-400 text-xs">Total Tokens</p>
              <p className="text-2xl font-black font-mono text-white">{queue.length}</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <p className="text-amber-400 text-xs">Waiting in Line</p>
              <p className="text-2xl font-black font-mono text-amber-400">{summary?.waiting || 0}</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <p className="text-blue-400 text-xs">Called to Gate</p>
              <p className="text-2xl font-black font-mono text-blue-400">{summary?.called || 0}</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <p className="text-indigo-400 text-xs">PFMS Payment</p>
              <p className="text-2xl font-black font-mono text-indigo-400">{summary?.payment_processing || currentlyPaymentProcessing.length}</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <p className="text-emerald-400 text-xs">Procurement Done</p>
              <p className="text-2xl font-black font-mono text-emerald-400">{summary?.done || 0}</p>
            </div>
          </div>

          {/* Kisan Official Helpline & Admin Support Bar (Farmer Visible Numbers) */}
          <div className="mt-5 p-3.5 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/70 rounded-2xl border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-white">किसान सहायता एवं संपर्क (Official Mandi Desk): </span>
                <span className="text-emerald-300 font-mono font-bold">Admin: +91 {ADMIN_PHONE}</span>
                <span className="text-slate-400 mx-2">•</span>
                <span className="text-amber-300 font-mono font-bold">Toll-Free Helpdesk: {HELPDESK_PHONE}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href={`tel:${ADMIN_PHONE}`}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center space-x-1.5 transition text-xs shadow-sm"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Admin (+91 {ADMIN_PHONE})</span>
              </a>
              <a
                href={`https://wa.me/91${ADMIN_PHONE}?text=${encodeURIComponent('🌾 Namaste Mandi Officer, I am a farmer requesting assistance with my token.')}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center space-x-1.5 transition text-xs shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Admin</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Real Entries Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Tokens ({queue.length})
          </button>
          <button
            onClick={() => setFilter('waiting')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'waiting' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Waiting ({summary?.waiting || 0})
          </button>
          <button
            onClick={() => setFilter('called')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'called' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Called ({summary?.called || 0})
          </button>
          <button
            onClick={() => setFilter('processing')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'processing' ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Processing ({summary?.processing || 0})
          </button>
          <button
            onClick={() => setFilter('payment_processing')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
              filter === 'payment_processing' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-600'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payment ({summary?.payment_processing || currentlyPaymentProcessing.length})</span>
          </button>
          <button
            onClick={() => setFilter('done')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'done' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Done ({summary?.done || 0})
          </button>
          <button
            onClick={() => setFilter(filter === 'real' ? 'all' : 'real')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1 ${
              filter === 'real' ? 'bg-purple-600 text-white' : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real Entries ({realEntriesCount})</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Admin Phone: <strong className="font-mono text-slate-800">+91 91058 46785</strong></span>
        </div>
      </div>

      {/* Date Filter Bar / दिनांक फ़िल्टर (Public View) */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100/90 p-2.5 rounded-2xl border border-slate-200 text-xs">
        <span className="font-bold text-slate-700 px-2 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>Date Filter / दिनांक:</span>
        </span>
        <button
          onClick={() => setDateFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition ${
            dateFilter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
          }`}
        >
          सभी तारीखें (All Dates)
        </button>
        {dateBreakdown.map(d => (
          <button
            key={d.date}
            onClick={() => setDateFilter(d.date)}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
              dateFilter === d.date
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/30'
                : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200'
            }`}
          >
            <span>{d.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              dateFilter === d.date ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {d.booked_quintals} Q
            </span>
          </button>
        ))}
      </div>

      {/* 3 Gates Selector Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 p-2 rounded-2xl border border-slate-200 text-xs">
        <span className="font-bold text-slate-600 px-2 uppercase tracking-wider text-[11px]">
          Gate View / प्रवेश द्वार:
        </span>
        <button
          onClick={() => setGateFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition ${
            gateFilter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
          }`}
        >
          All 3 Gates ({queue.length})
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
          <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-mono">{gate1Count}</span>
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
          <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-mono">{gate2Count}</span>
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
          <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-mono">{gate3Count}</span>
        </button>
      </div>

      {/* 2 Shifts Selector Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100/90 p-2 rounded-2xl border border-slate-200 text-xs">
        <span className="font-bold text-slate-600 px-2 uppercase tracking-wider text-[11px]">
          Shift View / शिफ्ट चयन:
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
          <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-mono">{shift1Count}</span>
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
          <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-mono">{shift2Count}</span>
        </button>
      </div>

      {/* Queue Cards Grid */}
      {filteredQueue.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No tokens found in this view</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click <strong>+ Spot Entry</strong> above to register an arriving farmer trolley, or select a different filter tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQueue.map(slot => (
            <QueueCard
              key={slot.id || slot.token_id}
              slot={slot}
              isAdmin={false}
              onAnnounce={onAnnounce}
              onOpenContact={(s) => setContactSlot(s)}
              onOpenPayment={(s) => setPaymentModalSlot(s)}
            />
          ))}
        </div>
      )}

      {/* Spot Registration Modal */}
      <AddFarmerModal
        isOpen={addFarmerOpen}
        onClose={() => setAddFarmerOpen(false)}
        onFarmerAdded={(newFarmer) => {
          onRefresh();
          setContactSlot(newFarmer);
        }}
      />

      {/* Farmer Communication Modal */}
      <ContactModal
        slot={contactSlot}
        isOpen={Boolean(contactSlot)}
        onClose={() => setContactSlot(null)}
      />

      {/* Payment Processing Modal (Payment kab milega & live stages) */}
      <PaymentModal
        slot={paymentModalSlot}
        isOpen={Boolean(paymentModalSlot)}
        onClose={() => setPaymentModalSlot(null)}
      />
    </div>
  );
}
