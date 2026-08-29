import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  Clock,
  Printer,
  ArrowRight,
  User,
  Wheat,
  Scale,
  Calendar,
  AlertCircle,
  MessageCircle,
  MessageSquare,
  Send,
  Truck,
  DoorOpen,
  Sun,
  Moon
} from 'lucide-react';

const ADMIN_PHONE = '9105846785';

export default function TokenReceipt({ tokenData, onTrackToken, onBookAnother }) {
  if (!tokenData) return null;

  const {
    token_id,
    farmer_name,
    phone,
    vehicle_no,
    crop_type,
    quantity,
    preferred_date,
    status = 'waiting',
    position = 1,
    estimated_wait_minutes = 10,
    gate_assigned = 'Gate 1',
    shift = 'shift_1_day'
  } = tokenData;

  const [forwardNotice, setForwardNotice] = useState('');

  const handlePrint = () => {
    window.print();
  };

  const getAdminForwardText = () => {
    return (
      `🌾 Smart Mandi - New Farmer Token Alert\n\n` +
      `📋 Token ID: ${token_id}\n` +
      `👤 Farmer Name: ${farmer_name}\n` +
      `📞 Farmer Phone: ${phone || 'Not provided'}\n` +
      `🌾 Crop: ${crop_type}\n` +
      `⚖️ Quantity: ${quantity} Quintals\n` +
      `🚪 Gate Assigned: ${gate_assigned}\n` +
      `⏰ Shift: ${tokenData.shift === 'shift_2_night' ? 'Shift 2 (Night: 1:00 PM - 8:00 PM)' : 'Shift 1 (Day: 6:00 AM - 11:00 AM)'}\n` +
      `🚛 Vehicle No: ${vehicle_no || 'N/A'}\n` +
      `📅 Preferred Date: ${preferred_date}\n` +
      `⏳ Queue Position: #${position || 1} (~${estimated_wait_minutes} mins wait)\n\n` +
      `👉 Mandi Officer Quick Action: Call: tel:${phone || ''} | WhatsApp: https://wa.me/91${(phone || '').replace(/\D/g, '').slice(-10)}`
    );
  };

  const handleSendToAdminWhatsApp = () => {
    const text = getAdminForwardText();
    const encoded = encodeURIComponent(text);
    setForwardNotice('Opening WhatsApp to Mandi Admin (+91 91058 46785)...');
    window.open(`https://wa.me/91${ADMIN_PHONE}?text=${encoded}`, '_blank');
  };

  const handleSendToAdminSms = () => {
    const text = getAdminForwardText();
    const encoded = encodeURIComponent(text);
    setForwardNotice('Opening SMS to Mandi Admin (+91 91058 46785)...');
    window.location.href = `sms:${ADMIN_PHONE}?body=${encoded}`;
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Success banner */}
      <div className="bg-emerald-500 text-white p-4 rounded-t-2xl flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-100" />
          <span className="font-bold text-sm sm:text-base">Slot Confirmed & Token Generated!</span>
        </div>
        <span className="text-xs bg-emerald-700/60 px-2.5 py-1 rounded-full font-mono">
          {new Date().toLocaleDateString('en-IN')}
        </span>
      </div>

      {/* Main Receipt Card */}
      <div className="bg-white border-x border-b border-slate-200 rounded-b-2xl shadow-xl p-6 sm:p-8 space-y-6 print:border-none print:shadow-none">
        
        {/* Token Number Hero Display */}
        <div className="text-center bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900 uppercase tracking-wide">
              {status}
            </span>
          </div>

          <p className="text-xs font-bold text-amber-800 uppercase tracking-widest">Digital Queue Token</p>
          <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-wider my-2 text-emerald-800">
            {token_id}
          </div>
          <p className="text-xs text-slate-500">Mandi Procurement Counter • {gate_assigned}</p>

          {/* Queue Position & Estimated Wait Badge */}
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-amber-200/60">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Queue Position: <strong className="text-slate-900 font-mono text-sm">#{position || 1}</strong></span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Est. Wait: <strong className="font-mono text-sm">{estimated_wait_minutes} mins</strong></span>
            </div>
          </div>
        </div>

        {/* QR Code and Instructions */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-200 flex-shrink-0">
            <QRCodeSVG 
              value={JSON.stringify({ token: token_id, farmer: farmer_name, crop: crop_type, qty: quantity })} 
              size={110} 
              level="M"
            />
          </div>
          <div className="text-center sm:text-left text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800 text-sm">Scan at Mandi Entry Gate</p>
            <p>Show this digital QR token at the security barrier and weighbridge checkpost upon arrival.</p>
            <p className="text-emerald-700 font-medium">Estimated wait formula: {position || 1} × 10 minutes</p>
          </div>
        </div>

        {/* Farmer & Booking Details Grid */}
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 text-xs sm:text-sm">
          <div className="flex items-center justify-between p-3">
            <span className="text-slate-500 flex items-center space-x-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <span>Farmer Name</span>
            </span>
            <span className="font-bold text-slate-900">{farmer_name}</span>
          </div>

          <div className="flex items-center justify-between p-3">
            <span className="text-slate-500 flex items-center space-x-1.5">
              <Wheat className="w-4 h-4 text-slate-400" />
              <span>Crop Type</span>
            </span>
            <span className="font-bold text-slate-900">{crop_type}</span>
          </div>

          <div className="flex items-center justify-between p-3">
            <span className="text-slate-500 flex items-center space-x-1.5">
              <Scale className="w-4 h-4 text-slate-400" />
              <span>Quantity</span>
            </span>
            <span className="font-bold text-slate-900">{quantity} Quintals (क्विंटल)</span>
          </div>

          <div className="flex items-center justify-between p-3">
            <span className="text-slate-500 flex items-center space-x-1.5">
              <DoorOpen className="w-4 h-4 text-slate-400" />
              <span>Assigned Gate / प्रवेश द्वार</span>
            </span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md font-mono text-xs">
              {gate_assigned || 'Gate 1'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3">
            <span className="text-slate-500 flex items-center space-x-1.5">
              {shift === 'shift_2_night' ? (
                <Moon className="w-4 h-4 text-indigo-500" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              <span>Mandi Shift / शिफ्ट समय</span>
            </span>
            <span className={`font-bold text-xs px-2.5 py-1 rounded-md flex items-center space-x-1 ${
              shift === 'shift_2_night'
                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              <span>{shift === 'shift_2_night' ? '🌙 Shift 2 (Night: 1:00 PM – 8:00 PM)' : '🌅 Shift 1 (Day: 6:00 AM – 11:00 AM)'}</span>
            </span>
          </div>

          {vehicle_no && (
            <div className="flex items-center justify-between p-3">
              <span className="text-slate-500 flex items-center space-x-1.5">
                <Truck className="w-4 h-4 text-slate-400" />
                <span>Vehicle / Trolley No</span>
              </span>
              <span className="font-bold text-slate-900 font-mono text-xs uppercase">{vehicle_no}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-3">
            <span className="text-slate-500 flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Preferred Date</span>
            </span>
            <span className="font-bold text-slate-900 font-mono">{preferred_date}</span>
          </div>
        </div>

        {/* Status Notice */}
        {forwardNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{forwardNotice}</span>
          </div>
        )}

        {/* Direct Dispatch / Transfer to Admin Phone 9105846785 Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-500/40 shadow-lg print:hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-emerald-300">
                Transfer Token to Admin Mobile (9105846785)
              </span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full">
              Officer Helpline
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            किसान का टोकन एवं विवरण सीधे मंडी अधिकारी के फोन (<strong>+91 91058 46785</strong>) पर भेजें ताकि अधिकारी आपको गेट प्रवेश के लिए कॉल या संदेश भेज सकें।
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handleSendToAdminWhatsApp}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-900/30 transition transform active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Forward to Admin WhatsApp</span>
            </button>

            <button
              onClick={handleSendToAdminSms}
              className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-900/30 transition transform active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Forward to Admin SMS</span>
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>🎧 Mandi APMC Toll-Free Helpdesk:</span>
            <a href="tel:1800118882" className="font-mono font-bold text-amber-300 hover:underline">
              1800-11-8882
            </a>
          </div>
        </div>

        {/* SMS Notification Simulation Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start space-x-2.5 text-xs text-blue-900">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Official SMS Dispatch (Sender Admin: +91 91058 46785):</span>
            <p className="mt-0.5 text-blue-700">
              "SmartMandi: Token {token_id} issued for {farmer_name}. Current position: #{position}. When position &lt; 3, you will receive an alert from Officer (+91 9105846785) to enter {gate_assigned || 'Gate 1'}."
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 print:hidden">
          <button
            onClick={() => onTrackToken(token_id)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 text-sm shadow-md transition"
          >
            <span>Track Live Status (लाइव स्थिति देखें)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl flex items-center justify-center space-x-2 text-sm transition"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Slip</span>
          </button>
        </div>

        <div className="text-center print:hidden">
          <button
            onClick={onBookAnother}
            className="text-xs text-slate-500 hover:text-emerald-700 font-medium underline"
          >
            ← Book another slot for different farmer or crop
          </button>
        </div>
      </div>
    </div>
  );
}
