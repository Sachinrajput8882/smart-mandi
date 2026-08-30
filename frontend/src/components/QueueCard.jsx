import React from 'react';
import {
  Clock,
  User,
  Wheat,
  Scale,
  ArrowRight,
  CheckCircle,
  Volume2,
  Phone,
  MessageCircle,
  PhoneCall,
  Truck,
  Trash2,
  CreditCard,
  ShieldCheck,
  Calendar,
  DoorOpen
} from 'lucide-react';
import { calculateMspAmount, formatInr } from '../utils/paymentUtils';

const ADMIN_PHONE = '9105846785';

export const STATUS_CONFIG = {
  waiting: {
    label: 'Waiting',
    labelHindi: 'प्रतीक्षारत',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    cardBorder: 'border-l-4 border-l-amber-400 border-slate-200',
    bgLight: 'bg-amber-50/40',
    iconColor: 'text-amber-600',
  },
  called: {
    label: 'Called',
    labelHindi: 'बुलाया गया',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 ring-2 ring-blue-400/30',
    cardBorder: 'border-l-4 border-l-blue-500 border-blue-200 shadow-md',
    bgLight: 'bg-blue-50/50',
    iconColor: 'text-blue-600',
  },
  processing: {
    label: 'Processing',
    labelHindi: 'प्रक्रियाधीन',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    cardBorder: 'border-l-4 border-l-orange-500 border-slate-200',
    bgLight: 'bg-orange-50/40',
    iconColor: 'text-orange-600',
  },
  payment_processing: {
    label: 'Payment Processing',
    labelHindi: 'भुगतान प्रक्रियाधीन',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300 ring-2 ring-indigo-400/30',
    cardBorder: 'border-l-4 border-l-indigo-600 border-indigo-200 shadow-sm',
    bgLight: 'bg-indigo-50/50',
    iconColor: 'text-indigo-600',
  },
  done: {
    label: 'Done',
    labelHindi: 'सम्पन्न',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    cardBorder: 'border-l-4 border-l-emerald-500 border-slate-200',
    bgLight: 'bg-emerald-50/30',
    iconColor: 'text-emerald-600',
  },
  cancelled: {
    label: 'Cancelled',
    labelHindi: 'रद्द',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    cardBorder: 'border-l-4 border-l-rose-500 border-rose-200 shadow-sm',
    bgLight: 'bg-rose-50/20',
    iconColor: 'text-rose-600',
  }
};

export default function QueueCard({
  slot,
  isAdmin = false,
  onUpdateStatus,
  onCallNext,
  onAnnounce,
  onOpenContact,
  onOpenPayment,
  onOpenCancel,
  onChangeGate,
  onDeleteSlot
}) {
  const status = (slot.status || 'waiting').toLowerCase();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.waiting;
  const hasPhone = Boolean(slot.phone && slot.phone.trim());

  const handleStatusChange = (newStatus, reason = '') => {
    if (onUpdateStatus) {
      onUpdateStatus(slot.token_id, newStatus, reason);
    }
  };

  return (
    <div className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:shadow-md ${config.cardBorder}`}>
      {/* Top Header: Token ID, Real Entry Badge & Status */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-lg sm:text-xl font-extrabold text-slate-900 tracking-wider">
            {slot.token_id}
          </span>
          {status === 'called' && (
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
            </span>
          )}
          {slot.is_manual && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-md">
              Real Entry
            </span>
          )}
        </div>

        {/* Color Coded Status Badge & Audio Announcement */}
        <div className="flex items-center space-x-1.5">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${config.badgeClass}`}>
            {config.label}
          </span>
          {onAnnounce && status === 'called' && (
            <button
              onClick={() => onAnnounce(slot)}
              title="Speak announcement"
              className="p-1 rounded-md text-blue-600 hover:bg-blue-100 transition"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Farmer Name, Phone & Details */}
      <div className="space-y-1.5 text-xs sm:text-sm">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold truncate">
            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="truncate">{slot.farmer_name}</span>
          </div>
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {/* Mandi Shift Badge */}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
              slot.shift === 'shift_2_night'
                ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`} title={slot.shift === 'shift_2_night' ? 'Shift 2: Night (1:00 PM - 8:00 PM)' : 'Shift 1: Day (6:00 AM - 11:00 AM)'}>
              {slot.shift === 'shift_2_night' ? '🌙 Night' : '🌅 Day'}
            </span>

            {isAdmin && onChangeGate ? (
              <div className="flex items-center space-x-1" title="Click to reassign Gate for this farmer">
                <select
                  value={slot.gate_assigned || 'Gate 1'}
                  onChange={(e) => onChangeGate(slot.token_id, e.target.value)}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-slate-300 bg-white text-slate-800 cursor-pointer hover:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="Gate 1">🚪 Gate 1 (Heavy)</option>
                  <option value="Gate 2">🚪 Gate 2 (Commercial)</option>
                  <option value="Gate 3">🚪 Gate 3 (Light)</option>
                </select>
              </div>
            ) : (
              slot.gate_assigned && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  slot.gate_assigned === 'Gate 1'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : slot.gate_assigned === 'Gate 2'
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-purple-50 text-purple-900 border-purple-200'
                }`}>
                  🚪 {slot.gate_assigned}
                </span>
              )
            )}
          </div>
        </div>

        {/* Phone Number & Vehicle No */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          {isAdmin ? (
            <div className="flex items-center space-x-1.5 font-mono">
              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>{slot.phone || 'No phone'}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Admin: <strong className="font-mono font-bold">+91 {ADMIN_PHONE}</strong></span>
              <span className="text-[9px] font-bold text-slate-400 bg-white px-1 py-0.2 rounded border border-slate-200 ml-1">🔒 Protected</span>
            </div>
          )}

          {slot.vehicle_no && (
            <div className="flex items-center space-x-1 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
              <Truck className="w-3 h-3 text-slate-500" />
              <span>{slot.vehicle_no}</span>
            </div>
          )}
        </div>

        {/* Crop & Quantity */}
        <div className="flex items-center justify-between text-slate-600 text-xs pt-1">
          <div className="flex items-center space-x-1.5">
            <Wheat className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>{slot.crop_type}</span>
          </div>
          <div className="flex items-center space-x-1 font-mono font-medium text-slate-700">
            <Scale className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>{slot.quantity} Qtl</span>
          </div>
        </div>

        {/* Farmer Scheduled Booking Date */}
        <div className="flex items-center justify-between text-slate-600 text-xs pt-1.5 border-t border-slate-100">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span className="text-slate-500 font-medium">बुकिंग दिनांक:</span>
            <strong className="text-slate-900 font-mono font-bold bg-blue-50 text-blue-900 border border-blue-200/70 px-1.5 py-0.2 rounded text-[11px]">
              {slot.preferred_date || (slot.created_at ? slot.created_at.split('T')[0] : 'Today')}
            </strong>
          </div>
          {slot.shift && (
            <span className="text-[10px] text-slate-400 font-medium">
              {slot.shift === 'shift_2_night' ? '1:00 PM – 8:00 PM' : '6:00 AM – 11:00 AM'}
            </span>
          )}
        </div>
      </div>

      {/* Position & Estimated Wait Info */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        {status === 'waiting' ? (
          <>
            <div className="flex items-center space-x-1 text-slate-700">
              <span className="font-medium text-slate-500">Position:</span>
              <span className="font-mono font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                #{slot.position || 1}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-slate-600 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>~{slot.estimated_wait_minutes || 10} mins wait</span>
            </div>
          </>
        ) : status === 'called' ? (
          <div className="w-full flex items-center justify-between text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg font-medium">
            <span>📢 Called to {slot.gate_assigned || 'Gate 1'}</span>
            <span className="font-bold">PROCEED NOW</span>
          </div>
        ) : status === 'processing' ? (
          <div className="w-full flex items-center justify-between text-orange-800 bg-orange-50 px-2.5 py-1.5 rounded-lg font-medium">
            <span>⚖️ Weighing & Inspection</span>
            <span className="font-mono text-xs">{slot.gate_assigned || 'Gate 1'}</span>
          </div>
        ) : status === 'payment_processing' ? (
          <button
            onClick={() => onOpenPayment && onOpenPayment(slot)}
            className="w-full text-left bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/90 hover:border-indigo-400 p-2 rounded-xl transition group shadow-xs"
            title="Click to see: Payment kab milega & live processing stage"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                PFMS / DBT Processing
              </span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded text-[11px]">
                {formatInr(calculateMspAmount(slot.crop_type, slot.quantity))}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 flex items-center justify-between">
              <span>⏱️ Kab milega: <strong className="text-indigo-900">24-48 hrs</strong></span>
              <span className="text-indigo-600 group-hover:text-indigo-800 font-semibold flex items-center text-[11px]">
                Check Status →
              </span>
            </div>
          </button>
        ) : status === 'cancelled' ? (
          <div className="w-full bg-rose-50 border border-rose-200/90 p-2.5 rounded-xl space-y-1 text-xs">
            <div className="flex items-center justify-between text-rose-900 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="text-rose-600">❌</span>
                रद्द टोकन (Cancelled Slot)
              </span>
              <span className="text-[10px] bg-rose-200/90 text-rose-800 px-1.5 py-0.2 rounded font-mono font-bold">
                🔒 Private
              </span>
            </div>
            {slot.cancellation_reason ? (
              <p className="text-slate-700 text-[11px] bg-white p-1.5 rounded border border-rose-100 leading-snug">
                <span className="font-semibold text-rose-700">कारण: </span>
                {slot.cancellation_reason}
              </p>
            ) : (
              <p className="text-slate-500 text-[11px] italic">
                कारण: प्रशासनिक कारणों से रद्द
              </p>
            )}
          </div>
        ) : (
          <div className="w-full flex items-center justify-between text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              Procurement & Payment Completed
            </span>
            {onOpenPayment && (
              <button
                onClick={() => onOpenPayment(slot)}
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                ₹ Slip
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Bar: Admin Authority vs Farmer Contact Helpdesk */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
        {isAdmin ? (
          // ONLY ADMIN HAS AUTHORITY TO CALL/MESSAGE FARMER
          <>
            {hasPhone ? (
              <>
                <button
                  onClick={() => onOpenContact && onOpenContact(slot)}
                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 font-bold py-1.5 px-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 border border-emerald-200 transition"
                  title="Call farmer or forward details to Admin Mobile 9105846785"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Contact Farmer</span>
                </button>

                <a
                  href={`tel:${slot.phone}`}
                  className="bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-800 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 border border-blue-200 transition"
                  title={`Direct call to farmer (${slot.phone})`}
                >
                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                  <span>Call</span>
                </a>
              </>
            ) : (
              <button
                onClick={() => onOpenContact && onOpenContact(slot)}
                className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold py-1.5 px-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 border border-indigo-200 transition"
                title="Forward details to Admin Mobile 9105846785"
              >
                <span>📲 Dispatch Notes</span>
              </button>
            )}
          </>
        ) : (
          // KISAN VIEW: CAN ONLY CALL / MESSAGE MANDI ADMIN (+91 91058 46785) OR HELPDESK
          <>
            <a
              href={`tel:${ADMIN_PHONE}`}
              className="flex-1 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 font-bold py-1.5 px-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 border border-emerald-200 transition"
              title={`Call Mandi Officer Admin (+91 ${ADMIN_PHONE})`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
              <span>Call Admin</span>
            </a>

            <a
              href={`https://wa.me/91${ADMIN_PHONE}?text=${encodeURIComponent(`🌾 Namaste Mandi Officer, regarding Token ${slot.token_id} (${slot.farmer_name}, ${slot.crop_type}) at ${slot.gate_assigned || 'Gate 1'}.`)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 shadow-sm transition"
              title={`WhatsApp Mandi Officer Admin (+91 ${ADMIN_PHONE})`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </>
        )}

        {/* Payment Processing Info Button */}
        {onOpenPayment && (status === 'processing' || status === 'payment_processing' || status === 'done') && (
          <button
            onClick={() => onOpenPayment(slot)}
            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-200 transition"
            title="View Payment kab milega & PFMS stages"
          >
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Payment</span>
          </button>
        )}

        {isAdmin && onDeleteSlot && (
          <button
            onClick={() => onDeleteSlot(slot.token_id)}
            title="Delete this token"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Admin Quick Action Controls */}
      {isAdmin && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2">
          {status === 'waiting' && (
            <button
              onClick={() => handleStatusChange('called')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center space-x-1 transition shadow-sm"
            >
              <span>Call Farmer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {status === 'called' && (
            <button
              onClick={() => handleStatusChange('processing')}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center space-x-1 transition shadow-sm"
            >
              <span>Mark as Processing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {status === 'processing' && (
            <button
              onClick={() => handleStatusChange('payment_processing')}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center space-x-1 transition shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Mark Payment Processing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {status === 'payment_processing' && (
            <button
              onClick={() => handleStatusChange('done')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center space-x-1 transition shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Mark as Done (Payment Released)</span>
            </button>
          )}

          {status !== 'done' && status !== 'cancelled' && (
            <button
              onClick={() => {
                if (onOpenCancel) {
                  onOpenCancel(slot, 'confirm');
                } else {
                  const ok = window.confirm(`⚠️ क्या आप टोकन ${slot.token_id} (${slot.farmer_name}) को रद्द करना चाहते हैं?\n\nयह टोकन सार्वजनिक डिस्प्ले से हट जाएगा और केवल किसान और एडमिन को दिखेगा।`);
                  if (ok) handleStatusChange('cancelled');
                }
              }}
              title="Cancel farmer token (Admin action)"
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
            >
              <span>❌ रद्द करें (Cancel)</span>
            </button>
          )}

          {status === 'cancelled' && (
            <div className="flex items-center justify-between gap-2 w-full">
              {onOpenCancel && (
                <button
                  onClick={() => onOpenCancel(slot, 'view')}
                  className="flex-1 py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
                  title="View full farmer & cancellation details"
                >
                  <span>📋 रद्द विवरण देखें</span>
                </button>
              )}
              <button
                onClick={() => handleStatusChange('waiting')}
                title="Restore token to waiting queue"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
              >
                <span>पुनः सक्रिय (Restore)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
