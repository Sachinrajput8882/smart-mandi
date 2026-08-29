// Mandi Operational Shift Timings & Helpers
// Shift 1: Day (06:00 AM - 11:00 AM)
// Shift 2: Night / Evening (01:00 PM - 08:00 PM)

export const MANDI_SHIFTS = {
  shift_1_day: {
    id: 'shift_1_day',
    code: 'S1',
    name: 'Shift 1: Day',
    nameHindi: 'शिफ्ट 1: सुबह (Day)',
    timingLabel: '06:00 AM – 11:00 AM',
    timingShort: '6am – 11am',
    startHour: 6,
    startMinute: 0,
    endHour: 11,
    endMinute: 0,
    icon: 'Sun',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    pillClass: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    cardBorder: 'border-l-amber-500',
    description: 'First shift for early arrival morning trolleys & heavy harvesting deliveries.',
    descriptionHindi: 'सुबह की पहली पाली (6 से 11 बजे) - जल्दी आने वाले ट्रॉलियों व भारी वाहनों के लिए।'
  },
  shift_2_night: {
    id: 'shift_2_night',
    code: 'S2',
    name: 'Shift 2: Night',
    nameHindi: 'शिफ्ट 2: रात (Night)',
    timingLabel: '01:00 PM – 08:00 PM',
    timingShort: '1pm – 8pm',
    startHour: 13,
    startMinute: 0,
    endHour: 20,
    endMinute: 0,
    icon: 'Moon',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    pillClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100',
    cardBorder: 'border-l-indigo-500',
    description: 'Second shift for afternoon & evening procurement before night yard closure.',
    descriptionHindi: 'दोपहर एवं रात की दूसरी पाली (1 से 8 बजे) - सांध्य कालीन तुलाई एवं खरीद।'
  }
};

export const SHIFT_OPTIONS = [
  MANDI_SHIFTS.shift_1_day,
  MANDI_SHIFTS.shift_2_night
];

/**
 * Returns live shift status based on current system time or provided date
 */
export function getCurrentShiftInfo(now = new Date()) {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTotalMinutes = hours * 60 + minutes;

  const s1Start = 6 * 60;   // 06:00 AM
  const s1End = 11 * 60;    // 11:00 AM
  const s2Start = 13 * 60;  // 01:00 PM
  const s2End = 20 * 60;    // 08:00 PM

  if (currentTotalMinutes >= s1Start && currentTotalMinutes < s1End) {
    const diff = s1End - currentTotalMinutes;
    const hrsLeft = Math.floor(diff / 60);
    const minsLeft = diff % 60;
    return {
      status: 'active',
      shiftId: 'shift_1_day',
      shift: MANDI_SHIFTS.shift_1_day,
      label: 'Shift 1: Day Active',
      labelHindi: 'शिफ्ट 1 (सुबह) चालू है',
      hours: '06:00 AM – 11:00 AM',
      remainingText: hrsLeft > 0 ? `${hrsLeft}h ${minsLeft}m remaining` : `${minsLeft}m remaining`,
      isReceiving: true,
      badgeClass: 'bg-amber-500 text-white',
      borderClass: 'border-amber-400'
    };
  }

  if (currentTotalMinutes >= s1End && currentTotalMinutes < s2Start) {
    const diff = s2Start - currentTotalMinutes;
    const hrsLeft = Math.floor(diff / 60);
    const minsLeft = diff % 60;
    return {
      status: 'recess',
      shiftId: null,
      shift: null,
      label: 'Inter-Shift Recess / Break',
      labelHindi: 'मध्यांतर / लंच व रखरखाव',
      hours: '11:00 AM – 01:00 PM',
      remainingText: `Shift 2 starts in ${hrsLeft > 0 ? `${hrsLeft}h ` : ''}${minsLeft}m`,
      isReceiving: false,
      badgeClass: 'bg-slate-700 text-amber-300',
      borderClass: 'border-slate-600'
    };
  }

  if (currentTotalMinutes >= s2Start && currentTotalMinutes < s2End) {
    const diff = s2End - currentTotalMinutes;
    const hrsLeft = Math.floor(diff / 60);
    const minsLeft = diff % 60;
    return {
      status: 'active',
      shiftId: 'shift_2_night',
      shift: MANDI_SHIFTS.shift_2_night,
      label: 'Shift 2: Night Active',
      labelHindi: 'शिफ्ट 2 (रात) चालू है',
      hours: '01:00 PM – 08:00 PM',
      remainingText: hrsLeft > 0 ? `${hrsLeft}h ${minsLeft}m remaining` : `${minsLeft}m remaining`,
      isReceiving: true,
      badgeClass: 'bg-indigo-600 text-white',
      borderClass: 'border-indigo-500'
    };
  }

  // Night closed (20:00 - 06:00)
  return {
    status: 'closed',
    shiftId: null,
    shift: null,
    label: 'Mandi Closed (Night Recess)',
    labelHindi: 'मंडी बंद • सुबह 6:00 बजे खुलेगी',
    hours: '08:00 PM – 06:00 AM',
    remainingText: 'Gates open at 06:00 AM',
    isReceiving: false,
    badgeClass: 'bg-slate-800 text-slate-300',
    borderClass: 'border-slate-700'
  };
}

/**
 * Normalizes shift id to a standard Shift object
 */
export function normalizeShift(shiftId) {
  if (!shiftId) return MANDI_SHIFTS.shift_1_day;
  const lower = String(shiftId).toLowerCase();
  if (lower.includes('night') || lower.includes('2') || lower.includes('evening') || lower.includes('pm')) {
    return MANDI_SHIFTS.shift_2_night;
  }
  return MANDI_SHIFTS.shift_1_day;
}

/**
 * Returns formatted shift badge string
 */
export function getShiftBadgeLabel(shiftId) {
  const shift = normalizeShift(shiftId);
  return shift.id === 'shift_2_night' ? '🌙 Night (1pm-8pm)' : '🌅 Day (6am-11am)';
}
