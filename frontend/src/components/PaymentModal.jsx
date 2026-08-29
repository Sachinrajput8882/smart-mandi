import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageCircle,
  Send,
  Building2,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Landmark,
  User,
  Wheat,
  Scale,
  PhoneCall,
  Headphones
} from 'lucide-react';
import {
  calculateMspAmount,
  formatInr,
  getPaymentEta,
  getPaymentProcessingStages
} from '../utils/paymentUtils';
import { storage } from '../services/storage';

const ADMIN_PHONE = '9105846785';
const HELPDESK_PHONE = '1800-11-8882';

export default function PaymentModal({
  slot,
  isOpen,
  onClose,
  isAdmin = false,
  onMarkDone
}) {
  if (!isOpen || !slot) return null;

  const [actionNotice, setActionNotice] = useState('');

  const totalAmount = calculateMspAmount(slot.crop_type, slot.quantity);
  const formattedAmount = formatInr(totalAmount);
  const eta = getPaymentEta(slot);
  const stages = getPaymentProcessingStages(slot);

  const cleanPhone = (slot.phone || '').replace(/\D/g, '').slice(-10);

  // Generate structured WhatsApp/SMS text for Payment Status
  const getPaymentMessageText = () => {
    return (
      `🌾 Smart Mandi - Live Payment Processing Update\n\n` +
      `📋 Token ID: ${slot.token_id}\n` +
      `👤 Farmer: ${slot.farmer_name}\n` +
      `🌾 Crop: ${slot.crop_type} (${slot.quantity} Qtl)\n` +
      `💰 Total MSP Payout: ${formattedAmount}\n\n` +
      `⏳ PAYMENT KAB MILEGA (भुगतान समय):\n` +
      `• ${eta.windowText}\n` +
      `• Expected: ${eta.expectedByText}\n` +
      `• Mode: Direct Benefit Transfer (DBT via Aadhaar Bridge)\n\n` +
      `🔄 IS TIME KYA PROCESSING CHAL RHA HAI:\n` +
      `• Step 1: Weighment & Moisture - Approved ✓\n` +
      `• Step 2: Mandi Voucher & Bill - Approved ✓\n` +
      `• Step 3: PFMS Treasury Batching - IN PROGRESS 🔄\n` +
      `• Step 4: DBT Bank Account Credit - Scheduled (24-48 hrs)\n\n` +
      `📞 Mandi Helpline Officer: +91 ${ADMIN_PHONE}`
    );
  };

  const handleSendFarmerWhatsApp = () => {
    if (!cleanPhone) return;
    const text = getPaymentMessageText();
    storage.logCommunication(
      slot.token_id,
      'whatsapp',
      `Sent Payment Processing Tracker (${formattedAmount}) to Farmer WhatsApp`
    );
    setActionNotice('💬 Opening WhatsApp to farmer with live payment tracker...');
    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendAdminWhatsApp = () => {
    const text = getPaymentMessageText();
    storage.logCommunication(
      slot.token_id,
      'whatsapp',
      `Forwarded Payment Processing Dossier (${formattedAmount}) to Admin WhatsApp (+91 ${ADMIN_PHONE})`
    );
    setActionNotice(`📲 Forwarding Payment Processing details to Admin WhatsApp (+91 ${ADMIN_PHONE})...`);
    window.open(`https://wa.me/91${ADMIN_PHONE}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendAdminSms = () => {
    const text = getPaymentMessageText();
    storage.logCommunication(
      slot.token_id,
      'sms',
      `Forwarded Payment Processing details to Admin SMS (+91 ${ADMIN_PHONE})`
    );
    setActionNotice(`📲 Opening SMS to Admin (+91 ${ADMIN_PHONE})...`);
    window.location.href = `sms:${ADMIN_PHONE}?body=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Payment Processing Tracker
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200">
                भुगतान ट्रैकर
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              MSP Procurement Payout & Direct Benefit Transfer (DBT) Status
            </p>
          </div>
        </div>

        {/* Hero Amount & Farmer Info Badge */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 mb-5 shadow-lg border border-indigo-500/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider block">
                Total MSP Procurement Amount (कुल भुगतान राशि)
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 my-1">
                {formattedAmount}
              </div>
              <p className="text-xs text-slate-300">
                {slot.quantity} Quintals × {slot.crop_type} Official MSP Rate
              </p>
            </div>

            <div className="text-right sm:border-l sm:border-slate-800 sm:pl-5">
              <span className="font-mono font-black text-sm text-indigo-200 bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-700/60 inline-block">
                {slot.token_id}
              </span>
              <p className="text-xs font-bold text-white mt-1.5">{slot.farmer_name}</p>
              {isAdmin ? (
                <p className="text-[11px] text-slate-400 font-mono">Ph: {slot.phone || 'No phone'}</p>
              ) : (
                <p className="text-[11px] text-emerald-300 font-medium">🔒 Phone: Protected</p>
              )}
              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-indigo-300 rounded">
                Gate: {slot.gate_assigned || 'Gate 1'}
              </span>
            </div>
          </div>
        </div>

        {actionNotice && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* 1. PAYMENT KAB MILEGA (WHEN WILL PAYMENT ARRIVE) */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="font-extrabold text-sm text-amber-950 uppercase tracking-wide">
                1. Payment Kab Milega? (भुगतान कब मिलेगा?)
              </h3>
            </div>
            <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
              24-48 Hours Window
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-amber-200/60">
              <span className="font-medium text-slate-600">Expected Disbursement (अपेक्षित समय):</span>
              <span className="font-bold font-mono text-slate-900 text-xs sm:text-sm text-right">
                {eta.expectedByText}
              </span>
            </div>

            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-amber-200/60">
              <span className="font-medium text-slate-600">Transfer Mode (माध्यम):</span>
              <span className="font-bold text-emerald-700 flex items-center space-x-1">
                <Landmark className="w-3.5 h-3.5" />
                <span>Direct Benefit Transfer (DBT)</span>
              </span>
            </div>

            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-amber-200/60">
              <span className="font-medium text-slate-600">Target Account:</span>
              <span className="font-bold text-slate-800 font-mono">
                Aadhaar-Linked Primary Bank Account
              </span>
            </div>

            <p className="text-[11px] text-amber-800 pt-1">
              💡 As per MSP procurement norms, payment advice files are batched daily and settled directly via the RBI / PFMS electronic clearing window.
            </p>
          </div>
        </div>

        {/* 2. IS TIME KYA PROCESSING CHAL RHA HAI (CURRENT ACTIVE STEP) */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                2. Is Time Kya Processing Chal Rha Hai? (वर्तमान स्थिति)
              </h3>
            </div>
            <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Live Stage Tracker
            </span>
          </div>

          {/* 4-Step Timeline */}
          <div className="space-y-3">
            {stages.map((st) => (
              <div
                key={st.step}
                className={`p-3 rounded-xl border transition ${
                  st.status === 'completed'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : st.status === 'in_progress'
                    ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400/20 shadow-sm'
                    : 'bg-white border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {st.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : st.status === 'in_progress' ? (
                      <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin flex-shrink-0"></div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0"></div>
                    )}
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">
                        {st.title} <span className="font-normal text-slate-500">({st.titleHindi})</span>
                      </h4>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      st.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : st.status === 'in_progress'
                        ? 'bg-indigo-600 text-white animate-pulse'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {st.timeBadge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 pl-6">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. CONTACT & PAYMENT INQUIRY (ADMIN DISPATCH vs KISAN HELPLINE) */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 mb-5 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-300">
                {isAdmin ? 'Share Payment Status via WhatsApp & SMS' : 'Payment Help & Mandi Inquiries'}
              </h4>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              Admin: +91 {ADMIN_PHONE}
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-3">
            {isAdmin
              ? `Send this exact payment ETA (${eta.windowText}) and live 4-step processing tracker to the farmer or Mandi Admin.`
              : `किसान भाई: भुगतान संबंधित किसी भी जानकारी के लिए सीधे मंडी अधिकारी (+91 ${ADMIN_PHONE}) या किसान हेल्पलाइन पर संपर्क करें।`}
          </p>

          {isAdmin ? (
            // ADMIN DISPATCH TOOLKIT
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {cleanPhone ? (
                <button
                  onClick={handleSendFarmerWhatsApp}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send to Farmer</span>
                </button>
              ) : (
                <div className="py-2.5 px-3 bg-slate-800 text-slate-500 rounded-xl text-xs text-center">
                  No farmer phone
                </div>
              )}

              <button
                onClick={handleSendAdminWhatsApp}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Admin WhatsApp</span>
              </button>

              <button
                onClick={handleSendAdminSms}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
              >
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Admin SMS</span>
              </button>
            </div>
          ) : (
            // KISAN CONTACT DESK: ONLY ADMIN NUMBER & HELPDESK VISIBLE
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <a
                href={`tel:${ADMIN_PHONE}`}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md transition"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Admin (+91 {ADMIN_PHONE})</span>
              </a>

              <button
                onClick={handleSendAdminWhatsApp}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Admin</span>
              </button>

              <a
                href={`tel:${HELPDESK_PHONE.replace(/-/g, '')}`}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
              >
                <Headphones className="w-4 h-4 text-amber-400" />
                <span>Helpdesk ({HELPDESK_PHONE})</span>
              </a>
            </div>
          )}
        </div>

        {/* Admin Action: Release Payment / Mark as Done */}
        {isAdmin && slot.status === 'payment_processing' && onMarkDone && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Officer Action: If bank credit confirmation is received:
            </p>
            <button
              onClick={() => {
                onMarkDone(slot.token_id);
                onClose();
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Payment Complete (Done)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
