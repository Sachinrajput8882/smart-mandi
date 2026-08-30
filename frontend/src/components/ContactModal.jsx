import React, { useState } from 'react';
import {
  Phone,
  PhoneCall,
  MessageSquare,
  Send,
  X,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { storage } from '../services/storage';
import { calculateMspAmount, formatInr } from '../utils/paymentUtils';

const ADMIN_PHONE = '9105846785';

export default function ContactModal({ slot, isOpen, onClose, onStatusUpdate, isAdmin = false }) {
  if (!isOpen || !slot) return null;

  const cleanPhone = (slot.phone || '').replace(/\D/g, '').slice(-10);
  const hasValidPhone = cleanPhone.length >= 10;

  // Communication logs
  const [logs, setLogs] = useState(() => storage.getCommunicationLogs(slot.token_id));
  const [actionSuccess, setActionSuccess] = useState('');

  // Default templates with Mandi Admin contact, Gate 1/2/3, and Payment Processing included
  const templates = [
    {
      id: 'gate_call',
      title: '📢 Gate Call (प्रवेश सूचना)',
      text: `🌾 Smart Mandi Alert: Respected ${slot.farmer_name}, your Token ${slot.token_id} has been CALLED to ${slot.gate_assigned || 'Gate 1'} (Weighbridge). Please bring your vehicle/trolley ${slot.vehicle_no ? `(${slot.vehicle_no}) ` : ''}to the gate immediately.\n\nOfficer Control Desk Helpline: +91 9105846785.`
    },
    {
      id: 'queue_pos',
      title: '⏳ Queue Status (कतार स्थिति)',
      text: `🌾 Smart Mandi Update: Respected ${slot.farmer_name}, your Token ${slot.token_id} for ${slot.gate_assigned || 'Gate 1'} is currently at Position #${slot.position || 1} in the waiting queue. Estimated wait time: ~${slot.estimated_wait_minutes || 10} minutes.\n\nMandi Admin Helpline: +91 9105846785.`
    },
    {
      id: 'processing',
      title: '⚖️ Weighbridge Inspection (तौल एवं जांच)',
      text: `🌾 Smart Mandi Alert: Respected ${slot.farmer_name}, Token ${slot.token_id} is currently being weighed and sampled for moisture inspection at ${slot.gate_assigned || 'Gate 1'}.\n\nOfficer Contact: +91 9105846785.`
    },
    {
      id: 'payment_processing',
      title: '💳 Payment Processing (भुगतान प्रक्रिया)',
      text: `🌾 Smart Mandi Alert: Respected ${slot.farmer_name}, Token ${slot.token_id} weighment is complete! MSP payout of ${formatInr(calculateMspAmount(slot.crop_type, slot.quantity))} is in Payment Processing via PFMS/DBT. Payment kab milega: Expected within 24 to 48 hours directly into your Aadhaar-linked bank account.\n\nMandi Admin Helpline: +91 9105846785.`
    },
    {
      id: 'done',
      title: '✅ Procurement Complete (खरीद संपन्न)',
      text: `🌾 Smart Mandi Confirmation: Respected ${slot.farmer_name}, MSP procurement for Token ${slot.token_id} (${slot.quantity} Qtl ${slot.crop_type}) at ${slot.gate_assigned || 'Gate 1'} is complete. Payment advice slip has been generated for direct DBT bank transfer.\n\nMandi Helpdesk Officer: +91 9105846785.`
    }
  ];

  const [selectedTemplate, setSelectedTemplate] = useState(
    slot.status === 'called' ? templates[0].text :
    slot.status === 'processing' ? templates[2].text :
    slot.status === 'payment_processing' ? templates[3].text :
    slot.status === 'done' ? templates[4].text :
    templates[1].text
  );

  const [customMessage, setCustomMessage] = useState(selectedTemplate);

  const handleTemplateChange = (text) => {
    setSelectedTemplate(text);
    setCustomMessage(text);
  };

  // Farmer direct actions
  const handleCall = () => {
    if (!hasValidPhone) return;
    const entry = storage.logCommunication(slot.token_id, 'call', 'Direct Phone Call placed by Mandi Officer');
    setLogs([entry, ...logs]);
    setActionSuccess('📞 Calling farmer... Dialing system opened.');
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleWhatsApp = () => {
    if (!hasValidPhone) return;
    const entry = storage.logCommunication(slot.token_id, 'whatsapp', customMessage);
    setLogs([entry, ...logs]);
    setActionSuccess('💬 WhatsApp chat opened with pre-filled message.');
    const encoded = encodeURIComponent(customMessage);
    const waUrl = `https://wa.me/91${cleanPhone}?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const handleSms = () => {
    if (!hasValidPhone) return;
    const entry = storage.logCommunication(slot.token_id, 'sms', customMessage);
    setLogs([entry, ...logs]);
    setActionSuccess('✉️ Native SMS app opened.');
    const encoded = encodeURIComponent(customMessage);
    window.location.href = `sms:${cleanPhone}?body=${encoded}`;
  };

  // Build comprehensive farmer details text to transfer to Admin Mobile 9105846785
  const getAdminDispatchText = () => {
    return (
      `🌾 Smart Mandi - Farmer Details & Call/Message Transfer\n\n` +
      `📋 Token ID: ${slot.token_id}\n` +
      `👤 Farmer Name: ${slot.farmer_name}\n` +
      `📞 Farmer Mobile: ${cleanPhone || 'Not provided'}\n` +
      `🌾 Crop: ${slot.crop_type}\n` +
      `⚖️ Quantity: ${slot.quantity} Qtl\n` +
      `🚪 Gate: ${slot.gate_assigned || 'Gate 1'}\n` +
      `🚛 Vehicle No: ${slot.vehicle_no || 'N/A'}\n` +
      `⏳ Queue Status: ${(slot.status || 'waiting').toUpperCase()} (Pos #${slot.position || 1})\n` +
      `📅 Date: ${slot.preferred_date || 'Today'}\n\n` +
      `💬 Mandi Dispatch Note:\n${customMessage}\n\n` +
      `👉 Admin Quick Action: Call farmer: tel:${cleanPhone} or WhatsApp: https://wa.me/91${cleanPhone}`
    );
  };

  // Transfer actions to Admin Mobile (9105846785)
  const handleTransferToAdminWhatsApp = () => {
    const text = getAdminDispatchText();
    const entry = storage.logCommunication(
      slot.token_id,
      'whatsapp',
      `Transferred farmer details to Admin WhatsApp (+91 ${ADMIN_PHONE})`
    );
    setLogs([entry, ...logs]);
    setActionSuccess(`📲 Forwarding details to Admin WhatsApp (+91 ${ADMIN_PHONE})...`);
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/91${ADMIN_PHONE}?text=${encoded}`, '_blank');
  };

  const handleTransferToAdminSms = () => {
    const text = getAdminDispatchText();
    const entry = storage.logCommunication(
      slot.token_id,
      'sms',
      `Transferred farmer details to Admin SMS (+91 ${ADMIN_PHONE})`
    );
    setLogs([entry, ...logs]);
    setActionSuccess(`📲 Forwarding details to Admin SMS (+91 ${ADMIN_PHONE})...`);
    const encoded = encodeURIComponent(text);
    window.location.href = `sms:${ADMIN_PHONE}?body=${encoded}`;
  };

  const handleCallAdmin = () => {
    const entry = storage.logCommunication(
      slot.token_id,
      'call',
      `Placed call to Mandi Admin (+91 ${ADMIN_PHONE})`
    );
    setLogs([entry, ...logs]);
    setActionSuccess(`📞 Calling Mandi Admin (+91 ${ADMIN_PHONE})...`);
    window.location.href = `tel:${ADMIN_PHONE}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start space-x-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Farmer Dispatch & Contact Desk
              </h2>
              {slot.is_manual && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                  Real Entry
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct Phone Call, WhatsApp & SMS Dispatch System • किसान संचार केंद्र
            </p>
          </div>
        </div>

        {/* Farmer Info Badge */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-sm">
              <User className="w-4 h-4 text-emerald-600" />
              <span>{slot.farmer_name}</span>
            </div>
            <p className="text-slate-500 font-mono mt-0.5">
              Phone:{' '}
              {isAdmin ? (
                <span className="font-bold text-slate-800">{slot.phone || 'Not provided'}</span>
              ) : (
                <span className="font-bold text-emerald-700">🔒 Protected (Admin Only)</span>
              )}
              {slot.vehicle_no && <span> • Vehicle: {slot.vehicle_no}</span>}
            </p>
            <p className="text-slate-600 font-medium mt-1 flex items-center gap-1 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span>बुकिंग दिनांक: <strong className="font-mono text-blue-950 font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">{slot.preferred_date || (slot.created_at ? slot.created_at.split('T')[0] : 'Today')}</strong></span>
            </p>
          </div>

          <div className="text-right">
            <span className="font-mono font-black text-sm text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
              {slot.token_id}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              {slot.crop_type} ({slot.quantity} Qtl)
            </p>
          </div>
        </div>

        {/* Admin Sender Contact Info */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 mb-4 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="font-bold text-emerald-950">Admin Calling & Messaging Mobile: </span>
              <a href={`tel:${ADMIN_PHONE}`} className="font-mono font-black text-emerald-800 hover:underline">
                +91 {ADMIN_PHONE}
              </a>
            </div>
          </div>
          <span className="text-[10px] font-semibold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
            Officer Helpline
          </span>
        </div>

        {/* Action Status Notice */}
        {actionSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Direct Farmer Actions (ONLY ADMIN HAS CALL/SMS AUTHORITY) */}
        {!isAdmin ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl mb-4 text-xs text-slate-700 space-y-2">
            <p className="font-bold text-emerald-950 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>किसान सूचना (Farmer Notice):</span>
            </p>
            <p className="text-slate-600 leading-relaxed">
              किसान को कॉल या संदेश भेजने का अधिकार केवल अधिकृत मंडी अधिकारी (Admin) के पास है। 
              यदि आपको कोई सहायता चाहिए तो नीचे दिए गए नंबरों से सीधे मंडी अधिकारी या हेल्पडेस्क से संपर्क करें।
            </p>
            <div className="pt-2 flex flex-wrap gap-2">
              <a
                href={`tel:${ADMIN_PHONE}`}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center space-x-1 shadow-sm"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Admin (+91 {ADMIN_PHONE})</span>
              </a>
              <a
                href={`tel:1800118882`}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center space-x-1 shadow-sm"
              >
                <span>Toll-Free Helpdesk: 1800-11-8882</span>
              </a>
            </div>
          </div>
        ) : !hasValidPhone ? (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 mb-4 flex items-center space-x-2">
            <span>⚠️ Note: Valid farmer phone not provided for direct dial. You can still transfer the entry details to Admin below.</span>
          </div>
        ) : (
          <>
            {/* Quick Action Dial / Message Farmer Buttons */}
            <div className="space-y-1.5 mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Direct Action to Farmer / किसान से संपर्क
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* Call Button */}
                <button
                  onClick={handleCall}
                  className="p-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl font-bold flex flex-col items-center justify-center space-y-1 shadow-sm transition"
                >
                  <Phone className="w-5 h-5" />
                  <span className="text-xs">Call Farmer</span>
                </button>

                {/* WhatsApp Button */}
                <button
                  onClick={handleWhatsApp}
                  className="p-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-bold flex flex-col items-center justify-center space-y-1 shadow-sm transition"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-xs">Farmer WhatsApp</span>
                </button>

                {/* SMS Button */}
                <button
                  onClick={handleSms}
                  className="p-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-2xl font-bold flex flex-col items-center justify-center space-y-1 shadow-sm transition"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-xs">Farmer SMS</span>
                </button>
              </div>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5 mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Notification Template / संदेश प्रारूप
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateChange(t.text)}
                    className={`text-left p-2.5 rounded-xl border text-xs font-semibold transition ${
                      selectedTemplate === t.text
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Message Box */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Message Preview / Editable Text (संदेश संपादन)
              </label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-sans leading-relaxed text-slate-800"
              ></textarea>
            </div>
          </>
        )}

        {/* 2. TRANSFER MESSAGE & FARMER DETAILS TO ADMIN MOBILE (9105846785) */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 mb-5 border border-indigo-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-emerald-300">
                Transfer Details to Admin Phone (9105846785)
              </span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 px-2.5 py-0.5 rounded-full">
              एडमिन प्रेषण
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            किसान का संपूर्ण विवरण (टोकन <strong>{slot.token_id}</strong>, नाम <strong>{slot.farmer_name}</strong>, फोन, गेट <strong>{slot.gate_assigned || 'Gate 1'}</strong>, वाहन <strong>{slot.vehicle_no || 'N/A'}</strong>) सीधे एडमिन मोबाइल <strong>+91 91058 46785</strong> पर भेजें ताकि एडमिन किसान को कॉल या मैसेज कर सकें।
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={handleTransferToAdminWhatsApp}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-900/30 transition transform active:scale-95"
              title="Send full farmer dossier to Admin WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Admin WhatsApp</span>
            </button>

            <button
              onClick={handleTransferToAdminSms}
              className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-900/30 transition transform active:scale-95"
              title="Send SMS to Admin Mobile"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Admin SMS</span>
            </button>

            <button
              onClick={handleCallAdmin}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 border border-slate-600 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition transform active:scale-95"
              title="Direct call to Admin 9105846785"
            >
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>Call Admin</span>
            </button>
          </div>
        </div>

        {/* Communication History Log */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Communication History for {slot.token_id}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {logs.length} logged
            </span>
          </div>

          {logs.length === 0 ? (
            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl text-center">
              No calls or messages logged for this farmer yet.
            </p>
          ) : (
            <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                      log.type === 'call' ? 'bg-blue-100 text-blue-800' :
                      log.type === 'whatsapp' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {log.type}
                    </span>
                    <span className="text-slate-700 font-medium truncate max-w-[260px]">
                      {log.details}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                    {log.timestamp}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
