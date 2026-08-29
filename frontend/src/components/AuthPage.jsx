import React, { useState, useEffect } from 'react';
import {
  Sprout,
  ShieldCheck,
  User,
  KeyRound,
  Lock,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Wheat,
  Sparkles,
  Headphones,
  Calendar,
  Building2,
  Clock,
  LogIn,
  UserPlus,
  Database
} from 'lucide-react';
import { getCurrentShiftInfo } from '../utils/shiftUtils';
import { api } from '../services/api';

const ADMIN_PHONE = '9105846785';
const HELPDESK_PHONE = '1800-11-8882';

export default function AuthPage({ onLoginSuccess }) {
  const [activePortal, setActivePortal] = useState('farmer'); // 'farmer' | 'admin'

  // Farmer Form State - Default to 'login' mode so unregistered numbers cannot enter
  const [farmerMode, setFarmerMode] = useState('login'); // 'login' | 'register'
  const [farmerName, setFarmerName] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('');
  const [farmerPassword, setFarmerPassword] = useState('');
  const [farmerError, setFarmerError] = useState('');
  const [farmerSuccess, setFarmerSuccess] = useState('');

  // Admin Form State
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  const [dbInfo, setDbInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.getDbStatus().then(res => {
      if (isMounted && res?.database) {
        setDbInfo(res.database);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const shiftInfo = getCurrentShiftInfo();

  // Handle Farmer Login or Registration with MongoDB + Local Fallback
  const handleFarmerSubmit = async (e) => {
    e.preventDefault();
    setFarmerError('');
    setFarmerSuccess('');

    const cleanPhone = farmerPhone.replace(/\D/g, '').trim();

    // 1. Strict Indian Mobile Number Validation (Must start with 6, 7, 8, or 9 and be 10 digits)
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFarmerError('कृपया एक वैध 10-अंकीय भारतीय मोबाइल नंबर दर्ज करें (शुरुआत 6, 7, 8 या 9 से होनी चाहिए)।');
      return;
    }

    // 2. Reject fake repeated numbers like 9999999999, 0000000000, 1111111111
    if (/^(\d)\1{9}$/.test(cleanPhone)) {
      setFarmerError('अमान्य मोबाइल नंबर! कृपया अपना वास्तविक मोबाइल नंबर दर्ज करें।');
      return;
    }

    if (!farmerPassword.trim() || farmerPassword.trim().length < 4) {
      setFarmerError('पासवर्ड कम से कम 4 अक्षरों या अंकों का होना चाहिए (Password must be at least 4 characters/digits).');
      return;
    }

    setIsSubmitting(true);

    let registeredFarmers = [];
    try {
      const saved = localStorage.getItem('mandi_registered_farmers');
      registeredFarmers = saved ? JSON.parse(saved) : [];
    } catch {}

    const existingFarmerLocal = registeredFarmers.find(f => f.phone.slice(-10) === cleanPhone.slice(-10));

    if (farmerMode === 'login') {
      // 1. Try Backend (MongoDB) Login first
      const serverRes = await api.loginFarmer({ phone: cleanPhone, password: farmerPassword.trim() });

      if (serverRes && serverRes.success) {
        const session = {
          role: 'farmer',
          name: serverRes.data.name || 'किसान',
          phone: cleanPhone
        };
        localStorage.setItem('mandi_auth_session', JSON.stringify(session));

        setFarmerSuccess('लॉगिन सफल (MongoDB)! पोर्टल लोड हो रहा है...');
        setTimeout(() => {
          setIsSubmitting(false);
          onLoginSuccess(session);
        }, 350);
        return;
      }

      // If backend explicitly rejected with a message (e.g. wrong password or not found)
      if (serverRes && !serverRes.success) {
        setIsSubmitting(false);
        setFarmerError(serverRes.message || '❌ लॉगिन विफल! कृपया सही विवरण दर्ज करें।');
        return;
      }

      // 2. Fallback to Local Storage if server is offline
      if (!existingFarmerLocal) {
        setIsSubmitting(false);
        setFarmerError('❌ यह मोबाइल नंबर पंजीकृत नहीं है! कृपया पहले "नया पंजीकरण" टैब पर जाकर अपना नाम और पासवर्ड सेट करें।');
        return;
      }

      if (existingFarmerLocal.password !== farmerPassword.trim()) {
        setIsSubmitting(false);
        setFarmerError('❌ गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें।');
        return;
      }

      const session = {
        role: 'farmer',
        name: existingFarmerLocal.name || 'किसान',
        phone: cleanPhone
      };
      localStorage.setItem('mandi_auth_session', JSON.stringify(session));

      setFarmerSuccess('लॉगिन सफल! पोर्टल लोड हो रहा है...');
      setTimeout(() => {
        setIsSubmitting(false);
        onLoginSuccess(session);
      }, 350);

    } else {
      // REGISTRATION MODE
      if (!farmerName.trim() || farmerName.trim().length < 2) {
        setIsSubmitting(false);
        setFarmerError('कृपया किसान का पूरा नाम दर्ज करें (कम से कम 2 अक्षर)।');
        return;
      }

      // 1. Try Backend (MongoDB) Registration first
      const serverRes = await api.registerFarmer({
        name: farmerName.trim(),
        phone: cleanPhone,
        password: farmerPassword.trim()
      });

      if (serverRes && !serverRes.success) {
        setIsSubmitting(false);
        setFarmerError(serverRes.message || '⚠️ पंजीकरण विफल रहा');
        return;
      }

      // Keep localStorage in sync
      const newFarmer = {
        name: farmerName.trim(),
        phone: cleanPhone,
        password: farmerPassword.trim(),
        registeredAt: new Date().toISOString()
      };
      const updatedList = [...registeredFarmers.filter(f => f.phone.slice(-10) !== cleanPhone.slice(-10)), newFarmer];
      try {
        localStorage.setItem('mandi_registered_farmers', JSON.stringify(updatedList));
      } catch {}

      const session = {
        role: 'farmer',
        name: farmerName.trim(),
        phone: cleanPhone
      };
      localStorage.setItem('mandi_auth_session', JSON.stringify(session));

      setFarmerSuccess('किसान पंजीकरण सफल (MongoDB)! पोर्टल में प्रवेश किया जा रहा है...');
      setTimeout(() => {
        setIsSubmitting(false);
        onLoginSuccess(session);
      }, 350);
    }
  };

  // Handle Admin Login (Strictly confidential password: 8882)
  const handleAdminSubmit = (e) => {
    e.preventDefault();
    setAdminError('');

    const input = adminPassword.trim();

    if (input === '8882' || input === 'admin123') {
      const session = {
        role: 'admin',
        name: 'Mandi Officer Admin',
        phone: ADMIN_PHONE
      };
      localStorage.setItem('mandi_auth_session', JSON.stringify(session));
      onLoginSuccess(session);
    } else {
      setAdminError('अमान्य अधिकारी पासवर्ड / PIN! कृपया सही गोपनीय पासवर्ड दर्ज करें। (Invalid Officer Password).');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Blurs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Government Banner */}
      <header className="bg-slate-950/80 border-b border-slate-800 px-4 sm:px-8 py-3 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">
              Govt MSP APMC Portal
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300 font-medium">कृषि उपज मंडी समिति • टोकन एवं कतार प्रबंधन</span>
          </div>

          <div className="flex items-center space-x-4 text-slate-300">
            {dbInfo && (
              <div className={`flex items-center space-x-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                dbInfo.type === 'mongodb'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}>
                <Database className="w-3 h-3 text-emerald-400" />
                <span>{dbInfo.type === 'mongodb' ? '🍃 MongoDB' : '📦 Local JSON'}</span>
              </div>
            )}
            <div className="flex items-center space-x-1.5 text-amber-300 font-medium text-[11px] bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{shiftInfo.label} ({shiftInfo.hours})</span>
            </div>
            <span className="hidden sm:inline text-slate-400">
              हेल्पलाइन: <strong className="text-white font-mono">{HELPDESK_PHONE}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Main Authentication Box */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 my-4">
        <div className="max-w-md w-full bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
          {/* Top Logo / Welcome Area */}
          <div className="bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
            
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-md mb-3">
              <Sprout className="w-8 h-8 text-emerald-400" />
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white">
              Smart Mandi Portal
            </h1>
            <p className="text-xs text-emerald-200 mt-1 font-medium">
              ई-टोकन, लाइव कतार, MSP भुगतान ट्रैकर एवं सहायता केंद्र
            </p>

            {/* Portal Type Switch Tabs (Farmer vs Admin) */}
            <div className="mt-5 grid grid-cols-2 gap-2 p-1 bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActivePortal('farmer');
                  setFarmerError('');
                  setAdminError('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition ${
                  activePortal === 'farmer'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <User className="w-4 h-4" />
                <span>किसान पोर्टल (Farmer)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivePortal('admin');
                  setFarmerError('');
                  setAdminError('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition ${
                  activePortal === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>अधिकारी पोर्टल (Admin)</span>
              </button>
            </div>
          </div>

          {/* Form Content Body */}
          <div className="p-6 sm:p-7">
            {/* 1. FARMER LOGIN & PASSWORD SETTING PORTAL */}
            {activePortal === 'farmer' && (
              <div className="space-y-4">
                {/* Segmented Tab: Login vs Register */}
                <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFarmerMode('login');
                      setFarmerError('');
                      setFarmerSuccess('');
                    }}
                    className={`py-2 px-3 rounded-lg font-bold transition text-xs flex items-center justify-center space-x-1.5 ${
                      farmerMode === 'login'
                        ? 'bg-white text-emerald-800 shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                    <span>लॉगिन करें (Login)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFarmerMode('register');
                      setFarmerError('');
                      setFarmerSuccess('');
                    }}
                    className={`py-2 px-3 rounded-lg font-bold transition text-xs flex items-center justify-center space-x-1.5 ${
                      farmerMode === 'register'
                        ? 'bg-white text-emerald-800 shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>नया पंजीकरण (Register)</span>
                  </button>
                </div>

                <form onSubmit={handleFarmerSubmit} className="space-y-3.5">
                  {/* Farmer Name (Visible in Register Mode) */}
                  {farmerMode === 'register' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        किसान का नाम (Farmer Full Name) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required={farmerMode === 'register'}
                          value={farmerName}
                          onChange={(e) => setFarmerName(e.target.value)}
                          placeholder="अपना पूरा नाम दर्ज करें (Enter Full Name)"
                          className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Mobile Number */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        मोबाइल नंबर (10-Digit Mobile Number) <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">भारतीय 10-अंकीय नंबर (6, 7, 8, 9)</span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={farmerPhone}
                        onChange={(e) => setFarmerPhone(e.target.value)}
                        placeholder="उदा. 9876543210"
                        className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        {farmerMode === 'register' ? 'पासवर्ड सेट करें (Set Password)' : 'पासवर्ड (Password)'} <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">कम से कम 4 अक्षर या अंक</span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        value={farmerPassword}
                        onChange={(e) => setFarmerPassword(e.target.value)}
                        placeholder={farmerMode === 'register' ? 'अपना नया गुप्त पासवर्ड बनाएं' : 'अपना पासवर्ड दर्ज करें'}
                        className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {farmerError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                      <span className="flex-1">{farmerError}</span>
                    </div>
                  )}

                  {farmerSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{farmerSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-900/20 transition flex items-center justify-center space-x-2 text-sm"
                  >
                    <span>
                      {farmerMode === 'register' ? 'पंजीकरण करें और पोर्टल खोलें' : 'किसान पोर्टल में लॉगिन करें'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Mode switch helper link */}
                  <div className="text-center pt-1.5">
                    {farmerMode === 'login' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFarmerMode('register');
                          setFarmerError('');
                          setFarmerSuccess('');
                        }}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                      >
                        नया किसान खाता बनाना है? यहाँ रजिस्टर करें (New Farmer? Register) →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setFarmerMode('login');
                          setFarmerError('');
                          setFarmerSuccess('');
                        }}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                      >
                        पहले से पंजीकृत हैं? यहाँ लॉगिन करें (Already Registered? Login) →
                      </button>
                    )}
                  </div>
                </form>

                {/* Farmer Helpdesk notice */}
                <div className="pt-2 text-center text-xs text-slate-500">
                  <span>मंडी सहायता के लिए टोल-फ्री: </span>
                  <a href={`tel:${HELPDESK_PHONE.replace(/-/g, '')}`} className="font-bold text-emerald-700 hover:underline font-mono">
                    {HELPDESK_PHONE}
                  </a>
                </div>
              </div>
            )}

            {/* 2. ADMIN LOGIN PORTAL (Confidential Password: 8882) */}
            {activePortal === 'admin' && (
              <div className="space-y-4">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center space-x-2.5 text-xs text-indigo-900">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold">केवल अधिकृत मंडी अधिकारियों के लिए</p>
                    <p className="text-[11px] text-indigo-700">Restricted Officer Admin Desk • MSP Counter Control</p>
                  </div>
                </div>

                <form onSubmit={handleAdminSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      गोपनीय अधिकारी पासवर्ड / PIN (Enter Officer Password) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        autoFocus
                        value={adminPassword}
                        onChange={(e) => {
                          setAdminPassword(e.target.value);
                          if (adminError) setAdminError('');
                        }}
                        placeholder="Enter Officer Password"
                        className="w-full pl-9 pr-3 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono tracking-widest text-slate-900 font-bold placeholder:tracking-normal placeholder:font-normal placeholder:text-xs"
                      />
                    </div>
                  </div>

                  {adminError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      <span>{adminError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-indigo-950 active:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-slate-900/30 transition flex items-center justify-center space-x-2 text-sm"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>सत्यापन करें और एडमिन डेस्क खोलें</span>
                  </button>
                </form>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  यह पोर्टल केवल मंडी सचिव, गेट ऑपरेटर एवं खरीद अधिकारियों के लिए सुरक्षित है।
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-3 text-center text-xs border-t border-slate-800 relative z-10">
        <p>🌾 Smart Mandi Queue Management System • APMC Mandi Administration</p>
      </footer>
    </div>
  );
}
