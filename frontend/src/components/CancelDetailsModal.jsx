import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Ban,
  User,
  Phone,
  Wheat,
  Scale,
  Truck,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  MessageCircle,
  RotateCcw,
  FileText,
  Lock,
  DoorOpen,
  PhoneCall
} from 'lucide-react';
import { calculateMspAmount, formatInr } from '../utils/paymentUtils';

const ADMIN_PHONE = '9105846785';

export const COMMON_CANCEL_REASONS = [
  'कागजात अपूर्ण / Missing Land or Aadhaar Documents',
  'फसल में नमी अधिक / High Moisture Content (Exceeds MSP Norms)',
  'वाहन या गेट विवरण बेमेल / Vehicle or Gate Mismatch',
  'किसान के स्वयं के अनुरोध पर / Cancelled at Farmer Request',
  'दैनिक कोटा 3000 क्विंटल समायोजन / Daily Quota Reallocation',
  'गुणवत्ता मानक अनुसार नहीं / Quality Not as per Mandi Standards'
];

export default function CancelDetailsModal({
  slot,
  isOpen,
  mode = 'confirm', // 'confirm' (action to cancel) or 'view' (inspect already cancelled)
  onClose,
  onConfirmCancel,
  onRestore
}) {
  if (!isOpen || !slot) return null;

  const [reason, setReason] = useState(slot.cancellation_reason || COMMON_CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cleanPhone = (slot.phone || '').replace(/\D/g, '').slice(-10);
  const finalReason = customReason.trim() ? customReason.trim() : reason;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirmCancel(slot.token_id, finalReason);
      onClose();
    } catch (err) {
      console.error('Cancellation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppAlert = () => {
    const text =
      `🌾 *स्मार्ट मंडी प्रशासन सूचना (Smart Mandi Officer Alert)*\n\n` +
      `आदरणीय ${slot.farmer_name} जी,\n` +
      `आपके टोकन *${slot.token_id}* (${slot.crop_type}, ${slot.quantity} क्विंटल) को मंडी प्रशासन द्वारा निरस्त (Cancel) कर दिया गया है।\n\n` +
      `📋 *रद्द करने का कारण:* ${slot.cancellation_reason || finalReason}\n` +
      `🚪 आवंटित गेट: ${slot.gate_assigned || 'Gate 1'}\n` +
      `🚛 वाहन संख्या: ${slot.vehicle_no || 'उपलब्ध नहीं'}\n\n` +
      `यह सूचना केवल आपके टोकन ट्रैकर और एडमिन डेस्क पर दर्ज है। अधिक सहायता हेतु मंडी अधिकारी से संपर्क करें: +91 ${ADMIN_PHONE}`;

    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 divide-y divide-slate-100">
        
        {/* Modal Header */}
        <div className={`p-6 flex items-start justify-between ${
          mode === 'confirm'
            ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white'
            : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white'
        } rounded-t-3xl`}>
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
              {mode === 'confirm' ? (
                <Ban className="w-6 h-6 text-white animate-pulse" />
              ) : (
                <FileText className="w-6 h-6 text-amber-300" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight">
                  {mode === 'confirm'
                    ? 'टोकन निरस्तीकरण (Cancel Farmer Token)'
                    : 'रद्द टोकन संपूर्ण विवरण (Cancelled Token Details)'}
                </h3>
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Admin Record
                </span>
              </div>
              <p className="text-xs text-rose-100/90 mt-0.5">
                {mode === 'confirm'
                  ? 'टोकन रद्द करने से पूर्व किसान एवं फसल का संपूर्ण विवरण जांचें'
                  : 'मंडी प्रशासन के लिए टोकन और रद्दीकरण का पूर्ण ब्यौरा'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Farmer & Token Full Details Grid */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Token Number / टोकन क्रमांक
                </span>
                <h4 className="text-2xl font-black font-mono text-slate-900 tracking-wider">
                  {slot.token_id}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Procurement Value (अनुमानित MSP)
                </span>
                <span className="text-base font-black font-mono text-emerald-700">
                  {formatInr(calculateMspAmount(slot.crop_type, slot.quantity))}
                </span>
              </div>
            </div>

            {/* Comprehensive Attributes Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
              <div className="flex items-center space-x-2.5 text-slate-700">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>किसान का नाम:</span>
                <strong className="text-slate-900 font-bold">{slot.farmer_name}</strong>
              </div>

              <div className="flex items-center space-x-2.5 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>मोबाइल नंबर:</span>
                <strong className="text-slate-900 font-mono font-bold">
                  {slot.phone ? `+91 ${slot.phone}` : 'दर्ज नहीं'}
                </strong>
              </div>

              <div className="flex items-center space-x-2.5 text-slate-700">
                <Wheat className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>फसल प्रकार:</span>
                <strong className="text-slate-900 font-bold">{slot.crop_type}</strong>
              </div>

              <div className="flex items-center space-x-2.5 text-slate-700">
                <Scale className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>मात्रा (Quantity):</span>
                <strong className="text-slate-900 font-bold">{slot.quantity} क्विंटल</strong>
              </div>

              <div className="flex items-center space-x-2.5 text-slate-700">
                <DoorOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>प्रवेश द्वार:</span>
                <strong className="text-slate-900 font-bold">{slot.gate_assigned || 'Gate 1'}</strong>
              </div>

              <div className="flex items-center space-x-2.5 text-slate-700">
                <Clock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span>मंडी शिफ्ट:</span>
                <strong className="text-slate-900 font-bold">
                  {slot.shift === 'shift_2_night' ? '🌙 Night Shift' : '🌅 Day Shift'}
                </strong>
              </div>

              <div className="flex items-center space-x-2.5 text-slate-700">
                <Truck className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>वाहन क्रमांक:</span>
                <strong className="text-slate-900 font-mono font-bold">
                  {slot.vehicle_no || 'N/A'}
                </strong>
              </div>

              <div className="flex items-center space-x-2.5 text-slate-700">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>पंजीकरण दिनांक:</span>
                <strong className="text-slate-900 font-bold">
                  {slot.preferred_date || (slot.created_at ? slot.created_at.split('T')[0] : 'Today')}
                </strong>
              </div>
            </div>
          </div>

          {/* If Mode is CONFIRM: Select/Enter Cancellation Reason */}
          {mode === 'confirm' ? (
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                रद्द करने का कारण चुनें (Select Reason for Cancellation):
              </label>

              <div className="space-y-2">
                {COMMON_CANCEL_REASONS.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setReason(r);
                      setCustomReason('');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-medium border transition flex items-center justify-between ${
                      reason === r && !customReason
                        ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{r}</span>
                    {reason === r && !customReason && (
                      <CheckCircle2 className="w-4 h-4 text-rose-600 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  या कोई अन्य विशिष्ट कारण लिखें (Custom Remarks):
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="उदा. किसान की सहमति से आगामी तारीख को पुनः स्लॉट दिया गया"
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Strict Privacy Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start space-x-2.5">
                <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">सख्त गोपनीयता (Strict Privacy Rule):</span>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    यह टोकन रद्द होते ही <strong>सार्वजनिक लाइव डिस्प्ले से तुरंत हट जाएगा</strong>। किसी भी अन्य व्यक्ति या किसान को यह नहीं दिखेगा। केवल <strong>मंडी अधिकारी (Admin Panel)</strong> और <strong>संबंधित किसान (Token Tracker)</strong> को ही इसका विवरण दिखेगा।
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Mode is VIEW: Show Recorded Cancellation Details */
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  दर्ज रद्दीकरण कारण (Recorded Cancellation Reason):
                </span>
                <p className="text-sm font-bold text-rose-900 bg-white p-3 rounded-xl border border-rose-200/70">
                  {slot.cancellation_reason || 'मंडी प्रशासन द्वारा रद्द किया गया (Administrative action)'}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>अंतिम अपडेट: {slot.updated_at ? new Date(slot.updated_at).toLocaleString() : 'Recent'}</span>
                  <span className="bg-rose-200/80 text-rose-800 font-bold px-2 py-0.5 rounded">🔒 Private Notice</span>
                </div>
              </div>

              {/* Direct Communication with Farmer */}
              {cleanPhone && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 text-xs text-emerald-900">
                    <MessageCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>किसान को सीधे सूचित करें: <strong>+91 {cleanPhone}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                      onClick={handleWhatsAppAlert}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp सूचना</span>
                    </button>
                    <a
                      href={`tel:${cleanPhone}`}
                      className="px-3.5 py-1.5 bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-slate-600" />
                      <span>कॉल करें</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 rounded-b-3xl flex flex-wrap items-center justify-between gap-3">
          {mode === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-xl transition"
              >
                रद्द न करें / वापस जाएं (Cancel)
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center space-x-2 disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'प्रक्रियाधीन...' : '❌ पुष्टि करें और टोकन रद्द करें (Confirm Cancel)'}
                </span>
              </button>
            </>
          ) : (
            <>
              {onRestore && (
                <button
                  type="button"
                  onClick={() => {
                    onRestore(slot.token_id);
                    onClose();
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>पुनः सक्रिय करें (Restore to Waiting)</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="ml-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                बंद करें (Close)
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
