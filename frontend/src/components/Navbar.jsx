import React, { useState, useEffect } from 'react';
import { Sprout, Clock, BarChart3, ShieldCheck, Users, Ticket, Radio, Headphones, Sun, Moon, LogOut, User, Database } from 'lucide-react';
import { getCurrentShiftInfo } from '../utils/shiftUtils';
import { api } from '../services/api';

export default function Navbar({ activeTab, setActiveTab, onOpenAnalytics, queueSummary, currentUser, onLogout }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dbInfo, setDbInfo] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    api.getDbStatus().then(res => {
      if (res?.database) setDbInfo(res.database);
    }).catch(() => {});
    return () => clearInterval(timer);
  }, []);

  const shiftInfo = getCurrentShiftInfo(currentTime);

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top Govt / Mandi Notice Bar with Live Shift Status */}
      <div className="bg-emerald-800 text-emerald-50 px-4 py-1.5 text-xs flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center space-x-2 flex-wrap gap-1">
          <span className="bg-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">MSP APMC</span>
          
          {/* Live Shift Pill */}
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/90 text-amber-300 border border-emerald-600 shadow-xs">
            {shiftInfo.shiftId === 'shift_2_night' ? (
              <Moon className="w-3 h-3 text-indigo-300" />
            ) : shiftInfo.shiftId === 'shift_1_day' ? (
              <Sun className="w-3 h-3 text-amber-400" />
            ) : (
              <Clock className="w-3 h-3 text-amber-300" />
            )}
            <span>{shiftInfo.label}</span>
            <span className="text-emerald-300 font-mono text-[10px]">({shiftInfo.hours})</span>
          </div>

          {/* Database Status Badge */}
          {dbInfo && (
            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              dbInfo.type === 'mongodb'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-500/60'
                : 'bg-emerald-950/70 text-slate-200 border-emerald-700'
            }`}>
              <Database className="w-2.5 h-2.5 text-emerald-400" />
              <span>{dbInfo.type === 'mongodb' ? '🍃 MongoDB' : '📦 Local JSON'}</span>
            </span>
          )}

          <span className="hidden lg:inline text-emerald-200 text-[11px]">• 3 Gates Operational</span>
        </div>
        <div className="flex items-center space-x-3 sm:space-x-4">
          <a
            href="tel:9105846785"
            className="flex items-center space-x-1 font-mono font-bold text-emerald-200 hover:text-white transition"
            title="Call Mandi Admin Officer"
          >
            <span>Admin: <strong>+91 91058 46785</strong></span>
          </a>
          <div className="hidden md:flex items-center space-x-1 text-emerald-200">
            <Clock className="w-3.5 h-3.5 text-emerald-300" />
            <span className="font-mono">{formattedDate} | {formattedTime}</span>
          </div>
          <button 
            onClick={onOpenAnalytics}
            className="flex items-center space-x-1 text-emerald-200 hover:text-white underline text-xs transition"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Mandi Stats</span>
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('live')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">Smart Mandi</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 mr-1 bg-emerald-500 rounded-full animate-ping"></span>
                  Live Queue
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                स्मार्ट कृषि मंडी टोकन एवं कतार प्रबंधन प्रणाली
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'live'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Radio className={`w-4 h-4 ${activeTab === 'live' ? 'text-emerald-600 animate-pulse' : ''}`} />
              <span>Live Queue</span>
              {queueSummary && queueSummary.waiting > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[11px] bg-amber-100 text-amber-800 rounded-full font-bold">
                  {queueSummary.waiting}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('book')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'book'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>Book Slot</span>
            </button>

            <button
              onClick={() => setActiveTab('track')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'track'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Track Token</span>
              <span className="sm:hidden">Track</span>
            </button>

            <button
              onClick={() => setActiveTab('help')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'help'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Headphones className="w-4 h-4" />
              <span className="hidden sm:inline">Helpdesk</span>
              <span className="sm:hidden">Help</span>
            </button>

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === 'admin'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Desk</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            {currentUser?.role === 'admin' ? (
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900 text-amber-300 rounded-lg text-xs font-bold border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Officer Desk</span>
              </div>
            ) : currentUser?.role === 'farmer' ? (
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold max-w-[150px]">
                <User className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="truncate">{currentUser.name || 'किसान'}</span>
              </div>
            ) : null}

            {onLogout && (
              <button
                onClick={onLogout}
                title="Logout / बाहर निकलें"
                className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">लॉगआउट</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
