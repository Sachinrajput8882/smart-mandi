// Payment utility functions for Smart Mandi
// Handles MSP price calculation, "Payment kab milega" (Payout ETA),
// and "Is time kya processing chal rha hai" (Live 4-step PFMS/DBT stage tracker)

export const MSP_RATES = {
  'Wheat (गेहूं)': 2275,
  'Paddy (धान)': 2300,
  'Paddy / Rice (धान)': 2300,
  'Mustard (सरसों)': 5650,
  'Gram / Chana (चना)': 5440,
  'Gram (चना)': 5440,
  'Cotton (कपास)': 7121,
  'Maize (मक्का)': 2090,
  'Soybean (सोयाबीन)': 4892,
  'Bajra / Pearl Millet (बाजरा)': 2500,
  'Bajra (बाजरा)': 2500,
};

// Calculate total MSP Payout (₹)
export function calculateMspAmount(cropType, quantity) {
  if (!quantity || isNaN(quantity) || Number(quantity) <= 0) return 0;
  const cleanCrop = Object.keys(MSP_RATES).find(
    k => k.toLowerCase() === (cropType || '').toLowerCase() || cropType?.includes(k.split(' ')[0])
  );
  const rate = cleanCrop ? MSP_RATES[cleanCrop] : 2275;
  return Math.round(Number(quantity) * rate);
}

// Format number in Indian Rupee format (e.g., ₹1,93,375)
export function formatInr(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

// "Payment kab milega" (Payout ETA Timeline)
export function getPaymentEta(slot) {
  const baseDate = slot?.created_at ? new Date(slot.created_at) : new Date();
  // Govt MSP DBT standard: 24 to 48 business hours
  const minEta = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
  const maxEta = new Date(baseDate.getTime() + 48 * 60 * 60 * 1000);

  const formatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };

  return {
    windowText: 'Within 24 to 48 Hours (24 से 48 घंटे के भीतर)',
    expectedByText: `By ${maxEta.toLocaleDateString('en-IN', formatOptions)}`,
    guaranteeText: 'Direct Benefit Transfer (DBT) directly into farmer Aadhaar-linked Bank Account',
    payoutBankNotice: 'Aadhaar Payment Bridge (PFMS / PFMS-DBT)',
    hoursRemainingText: '~24 to 36 hrs'
  };
}

// "Is time kya processing chal rha hai" (Live 4-Step PFMS/DBT Stage Tracker)
export function getPaymentProcessingStages(slot) {
  const totalAmount = calculateMspAmount(slot?.crop_type, slot?.quantity);
  const formattedAmount = formatInr(totalAmount);

  // 4 Standard Government APMC MSP Procurement Stages
  return [
    {
      step: 1,
      id: 'weighment_approved',
      title: 'Weighbridge & Quality Clearance',
      titleHindi: 'तौल एवं नमी गुणवत्ता पर्ची जारी',
      desc: 'Electronic weighment certificate and moisture test under 12% approved.',
      status: 'completed', // completed
      timeBadge: 'Step 1: Done ✓'
    },
    {
      step: 2,
      id: 'voucher_generated',
      title: 'Mandi Procurement Digital Voucher',
      titleHindi: 'मंडी खरीद वाउचर एवं बिल जनरेशन',
      desc: `Procurement advice slip generated for ${formattedAmount} (${slot?.quantity || 0} Qtl). Mandi Secretary approved.`,
      status: 'completed', // completed
      timeBadge: 'Step 2: Approved ✓'
    },
    {
      step: 3,
      id: 'pfms_batching',
      title: 'PFMS Treasury File Batching',
      titleHindi: 'पीएफएमएस ट्रेजरी फाइल अपलोड एवं सत्यापन',
      desc: 'Digital file batched with Treasury PFMS system for Aadhaar Payment Bridge routing.',
      status: slot?.status === 'done' ? 'completed' : 'in_progress', // Active in payment_processing
      timeBadge: slot?.status === 'done' ? 'Step 3: Cleared ✓' : 'Step 3: In Progress 🔄'
    },
    {
      step: 4,
      id: 'dbt_bank_credit',
      title: 'DBT Bank Account Direct Credit',
      titleHindi: 'बैंक खाता राशि अंतरण (DBT)',
      desc: `Final release of ${formattedAmount} into farmer savings account linked with Aadhaar.`,
      status: slot?.status === 'done' ? 'completed' : 'pending',
      timeBadge: slot?.status === 'done' ? 'Step 4: Credited ✓' : 'Step 4: Scheduled (24-48 hrs) ⏳'
    }
  ];
}
