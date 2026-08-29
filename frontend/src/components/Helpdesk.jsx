import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Phone,
  PhoneCall,
  HelpCircle,
  FileText,
  CheckCircle2,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  MessageSquare,
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building2,
  Sparkles,
  Sun,
  Moon,
  User,
  RotateCcw,
  Trash2,
  Filter,
  Check
} from 'lucide-react';

export default function Helpdesk({ onNavigateToBooking, onTrackToken, currentUser }) {
  const isAdmin = currentUser?.role === 'admin';

  // Grievance / Ticket Form State
  const [farmerName, setFarmerName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [tokenId, setTokenId] = useState('');
  const [category, setCategory] = useState('Weighbridge / Gate Delay');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Admin Desk State
  const [adminTicketFilter, setAdminTicketFilter] = useState('all'); // 'all' | 'pending' | 'resolved'
  const [resolvingNotes, setResolvingNotes] = useState({});
  const [showAdminLogForm, setShowAdminLogForm] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'farmer') {
      if (currentUser.name && !farmerName) setFarmerName(currentUser.name);
      if (currentUser.phone && !phone) setPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Local storage for tickets (starts clean with zero dummy tickets)
  const [tickets, setTickets] = useState(() => {
    try {
      const saved = localStorage.getItem('mandi_helpdesk_tickets');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      const cleaned = Array.isArray(parsed)
        ? parsed.filter(t => !t.id?.includes('HD-1011') && !t.farmerName?.includes('Baldev') && !t.farmerName?.includes('Gurpreet'))
        : [];
      if (cleaned.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
        localStorage.setItem('mandi_helpdesk_tickets', JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
    }
  });

  // Accordion FAQ State
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      q: 'टोकन कैसे बुक करें? / How do I book a token?',
      a: 'Go to the "Book Slot" tab, enter your name, mobile number, crop type (Wheat, Paddy, Mustard, Gram, etc.), total quantity in quintals, and your preferred arrival date. Click "Confirm & Generate Token" to receive your digital token and scannable QR code.'
    },
    {
      q: 'मंडी में MSP खरीद के लिए कौन से दस्तावेज जरूरी हैं? / Required Documents at Mandi Gate?',
      a: 'Please carry: (1) Valid Aadhaar Card, (2) Land Ownership Record / Girdawari (जमाबंदी/गिरदावरी), (3) Bank Passbook photocopy (active bank account linked with Aadhaar for direct DBT payment), and (4) Your digital Smart Mandi Token slip (printed or on your phone).'
    },
    {
      q: 'यदि मेरा टोकन पुकारा गया और मैं उपस्थित नहीं हुआ तो क्या होगा? / What if I miss my gate call?',
      a: 'Do not worry! Your token does not expire immediately. The Mandi Procurement Officer can re-call or re-prioritize your slot from the Officer Admin Desk without losing your registration.'
    },
    {
      q: 'प्रतीक्षा समय (Wait Time) कैसे तय होता है? / How is estimated wait time calculated?',
      a: 'The system dynamically multiplies your current position in the waiting queue by an average processing time of 10 minutes per vehicle (weighbridge, moisture sampling, and dock unloading).'
    },
    {
      q: 'फसल की नमी मानक (Moisture Limits) क्या हैं? / Crop Quality & Moisture Specifications?',
      a: 'As per Govt MSP Procurement Guidelines: Wheat (गेहूं) max 12% moisture, Paddy (धान) max 17% moisture, Mustard (सरसों) max 8% moisture. Excess moisture may require yard drying before weighbridge entry.'
    },
    {
      q: 'MSP का भुगतान कब और कैसे मिलता है? / When will I receive my payment?',
      a: 'Once weighing and moisture inspection are marked "Done" at the weighbridge, an automated Payment Advice Slip is generated. Funds are credited directly to your bank account via PFMS / DBT within 48 to 72 business hours.'
    },
    {
      q: 'मंडी में दो शिफ्ट का समय क्या है? / What are the Mandi 2-Shift Timings?',
      a: 'मंडी प्रतिदिन दो मुख्य शिफ्टों में संचालित होती है: पहली शिफ्ट (Shift 1: Day) सुबह 6:00 AM से 11:00 AM तक, और दूसरी शिफ्ट (Shift 2: Night/Evening) दोपहर 1:00 PM से रात 8:00 PM तक। सुबह 11:00 AM से दोपहर 1:00 PM तक तराजू/धर्मकांटा कैलिब्रेशन और भोजन अवकाश रहता है।'
    }
  ];

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!farmerName.trim() || !phone.trim() || !description.trim()) {
      alert('Please fill all required fields (Name, Phone, and Description).');
      return;
    }

    setIsSubmitting(true);
    const newId = `HD-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newTicket = {
      id: newId,
      farmerName: farmerName.trim(),
      phone: phone.trim(),
      tokenId: tokenId.trim().toUpperCase() || 'N/A',
      category,
      description: description.trim(),
      status: 'Open - Under Review',
      createdAt: `Today, ${timeStr}`
    };

    setTimeout(() => {
      const updatedTickets = [newTicket, ...tickets];
      setTickets(updatedTickets);
      try {
        localStorage.setItem('mandi_helpdesk_tickets', JSON.stringify(updatedTickets));
      } catch {}

      setSubmittedTicket(newTicket);
      setIsSubmitting(false);

      // Reset fields
      if (currentUser?.role !== 'farmer') {
        setFarmerName('');
        setPhone('');
      }
      setTokenId('');
      setDescription('');
    }, 600);
  };

  // Admin ticket resolution actions
  const handleSolveTicket = (ticketId) => {
    const note = resolvingNotes[ticketId]?.trim() || 'Issue inspected & resolved by Mandi Officer.';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: 'Resolved',
          resolutionNote: note,
          resolvedAt: `Today, ${timeStr}`
        };
      }
      return t;
    });

    setTickets(updated);
    try {
      localStorage.setItem('mandi_helpdesk_tickets', JSON.stringify(updated));
    } catch {}

    setResolvingNotes(prev => ({ ...prev, [ticketId]: '' }));
  };

  const handleReopenTicket = (ticketId) => {
    const updated = tickets.map(t => t.id === ticketId ? { ...t, status: 'Open - Under Review' } : t);
    setTickets(updated);
    try {
      localStorage.setItem('mandi_helpdesk_tickets', JSON.stringify(updated));
    } catch {}
  };

  const handleDeleteTicket = (ticketId) => {
    if (!window.confirm('Delete this complaint ticket?')) return;
    const updated = tickets.filter(t => t.id !== ticketId);
    setTickets(updated);
    try {
      localStorage.setItem('mandi_helpdesk_tickets', JSON.stringify(updated));
    } catch {}
  };

  // Filter tickets for Admin vs Farmer
  const farmerCleanPhone = (currentUser?.phone || '').replace(/\D/g, '').slice(-10);
  const farmerTickets = currentUser?.role === 'farmer' && farmerCleanPhone
    ? tickets.filter(t => (t.phone || '').replace(/\D/g, '').slice(-10) === farmerCleanPhone || t.farmerName.toLowerCase().includes((currentUser.name || '').toLowerCase()))
    : tickets;

  const openTicketsCount = tickets.filter(t => !t.status?.includes('Resolved')).length;
  const resolvedTicketsCount = tickets.filter(t => t.status?.includes('Resolved')).length;

  const displayedAdminTickets = tickets.filter(t => {
    if (adminTicketFilter === 'pending') return !t.status?.includes('Resolved');
    if (adminTicketFilter === 'resolved') return t.status?.includes('Resolved');
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Headphones className="w-3.5 h-3.5 text-emerald-400" />
            <span>24x7 Kisan Sahayata Kendra • किसान सहायता केंद्र</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Mandi Helpdesk & Grievance Cell
          </h1>
          <p className="mt-3 text-emerald-100 text-sm sm:text-base leading-relaxed">
            Need help with your token, vehicle gate assignment, moisture testing, or MSP payment slip?
            Reach out to our round-the-clock Mandi Support Staff or submit an instant assistance ticket below.
          </p>
        </div>
      </div>

      {/* Emergency Helplines & Contacts Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toll-Free Helpline</p>
              <h3 className="font-bold text-slate-900 text-sm">Kisan Call Centre</h3>
            </div>
          </div>
          <p className="text-xl font-mono font-black text-amber-600">1800-180-1551</p>
          <p className="text-xs text-slate-500 mt-1">All days 6:00 AM - 10:00 PM</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mandi Control Room</p>
              <h3 className="font-bold text-slate-900 text-sm">APMC Center Desk</h3>
            </div>
          </div>
          <p className="text-xl font-mono font-black text-emerald-600">1800-11-8882</p>
          <p className="text-xs text-slate-500 mt-1">Gate & weighbridge coordination</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Officer In-Charge</p>
              <h3 className="font-bold text-slate-900 text-sm">Procurement Inspector</h3>
            </div>
          </div>
          <a
            href="tel:9105846785"
            className="text-xl font-mono font-black text-blue-600 hover:text-blue-700 hover:underline block"
          >
            +91 91058-46785
          </a>
          <p className="text-xs text-slate-500 mt-1">Direct admin dispatch & WhatsApp desk</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Moisture Lab</p>
              <h3 className="font-bold text-slate-900 text-sm">Quality Assessment</h3>
            </div>
          </div>
          <p className="text-xl font-mono font-black text-teal-600">+91 98123-45678</p>
          <p className="text-xs text-slate-500 mt-1">Grading & sampling disputes</p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Submit Ticket Form */}
        {/* Left Column: Role-Based Content */}
        <div className="lg:col-span-7 space-y-6">
          {isAdmin ? (
            /* ============================================================
               ADMIN VIEW: OFFICER GRIEVANCE RESOLUTION COCKPIT
               ============================================================ */
            <div className="space-y-6">
              {/* Admin Desk Header Banner */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-indigo-600/30 text-indigo-400 rounded-2xl border border-indigo-500/40">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg sm:text-xl font-black tracking-tight">
                          Officer Grievance Resolution Desk
                        </h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-700 rounded-full">
                          अधिकारी केंद्र
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        किसान समस्याओं का त्वरित निवारण • Call, WhatsApp & Solve Complaints
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAdminLogForm(!showAdminLogForm)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <span>{showAdminLogForm ? '✕ Hide Form' : '+ Log Walk-in Complaint'}</span>
                  </button>
                </div>

                {/* Filter & Metric Pills */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setAdminTicketFilter('all')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition ${
                        adminTicketFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      All ({tickets.length})
                    </button>
                    <button
                      onClick={() => setAdminTicketFilter('pending')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
                        adminTicketFilter === 'pending'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-500/30 hover:bg-amber-900/60'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pending ({openTicketsCount})</span>
                    </button>
                    <button
                      onClick={() => setAdminTicketFilter('resolved')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
                        adminTicketFilter === 'resolved'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Resolved ({resolvedTicketsCount})</span>
                    </button>
                  </div>

                  <span className="text-slate-400 font-mono text-[11px]">
                    Admin Desk Active
                  </span>
                </div>
              </div>

              {/* Optional Admin Walk-in Ticket Form */}
              {showAdminLogForm && (
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>Log New Ticket on behalf of Farmer</span>
                  </h3>

                  <form onSubmit={handleSubmitTicket} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Farmer Name / किसान का नाम *
                        </label>
                        <input
                          type="text"
                          required
                          value={farmerName}
                          onChange={(e) => setFarmerName(e.target.value)}
                          placeholder="किसान का नाम दर्ज करें (Enter Name)"
                          className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mobile Number / मोबाइल नंबर *
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="10-digit mobile"
                          className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Token ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={tokenId}
                          onChange={(e) => setTokenId(e.target.value)}
                          placeholder="उदा. TKN1234 (वैकल्पिक)"
                          className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl font-mono uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Category / समस्या
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white"
                        >
                          <option value="Weighbridge / Gate Delay">Weighbridge / Gate Congestion</option>
                          <option value="Moisture / Quality Dispute">Moisture / Quality Inspection Dispute</option>
                          <option value="Token Lost / SMS Issue">Token Lost or No SMS Received</option>
                          <option value="MSP Payment Advice Slip">Payment Advice Slip Inquiries</option>
                          <option value="Document Verification">Aadhaar / Land Record Issue</option>
                          <option value="General Inquiry">Other General Inquiry</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Issue Description *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Provide details..."
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition"
                    >
                      {isSubmitting ? 'Logging Ticket...' : 'Register Complaint'}
                    </button>
                  </form>
                </div>
              )}

              {/* Admin Tickets Resolution Cards */}
              <div className="space-y-4">
                {displayedAdminTickets.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                    <h3 className="font-bold text-slate-800 text-base">No Tickets in this Category</h3>
                    <p className="text-xs text-slate-500 mt-1">All farmer grievances in this filter are cleared.</p>
                  </div>
                ) : (
                  displayedAdminTickets.map((t) => {
                    const isResolved = t.status?.includes('Resolved');
                    const cleanTPhone = (t.phone || '').replace(/\D/g, '').slice(-10);

                    return (
                      <div
                        key={t.id}
                        className={`bg-white rounded-3xl p-5 sm:p-6 shadow-sm border transition ${
                          isResolved ? 'border-slate-200 bg-slate-50/40' : 'border-amber-300 shadow-md ring-1 ring-amber-400/20'
                        }`}
                      >
                        {/* Card Top: ID, Status, Category, Time */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-black text-xs bg-slate-900 text-white px-2.5 py-1 rounded-md">
                              {t.id}
                            </span>
                            <span className="font-bold text-xs text-slate-800">
                              {t.category}
                            </span>
                            {t.tokenId && t.tokenId !== 'N/A' && (
                              <span className="text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                                Token: {t.tokenId}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}>
                              {isResolved ? '✓ Resolved' : '⏳ Pending Resolution'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {t.createdAt}
                            </span>
                          </div>
                        </div>

                        {/* Farmer Details & Issue Description */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 mb-3 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              <span>{t.farmerName}</span>
                            </span>
                            <span className="font-mono text-slate-600 font-semibold">
                              Ph: {t.phone || 'Not provided'}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">
                            {t.description}
                          </p>
                        </div>

                        {/* Officer Contact Bar to Farmer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 text-xs">
                          <span className="text-[11px] font-semibold text-slate-500">
                            Officer Quick Action to Farmer:
                          </span>
                          <div className="flex items-center space-x-2">
                            {cleanTPhone && (
                              <>
                                <a
                                  href={`tel:${cleanTPhone}`}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold flex items-center space-x-1 transition"
                                  title="Call Farmer directly"
                                >
                                  <PhoneCall className="w-3 h-3 text-blue-600" />
                                  <span>Call ({cleanTPhone})</span>
                                </a>
                                <a
                                  href={`https://wa.me/91${cleanTPhone}?text=${encodeURIComponent(`🌾 Smart Mandi Officer: Regarding your Helpdesk Ticket #${t.id} (${t.category}).`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold flex items-center space-x-1 transition"
                                >
                                  <MessageCircle className="w-3 h-3 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Officer Resolution Controls */}
                        {!isResolved ? (
                          <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                              Write Resolution Action & Solve / समाधान विवरण दर्ज करें:
                            </label>
                            <div className="flex flex-col sm:flex-row items-center gap-2">
                              <input
                                type="text"
                                value={resolvingNotes[t.id] || ''}
                                onChange={(e) => setResolvingNotes({ ...resolvingNotes, [t.id]: e.target.value })}
                                placeholder="e.g. Gate 1 weighbridge cleared / Moisture sample re-tested..."
                                className="flex-1 w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                              />
                              <button
                                onClick={() => handleSolveTicket(t.id)}
                                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition whitespace-nowrap"
                              >
                                <Check className="w-4 h-4" />
                                <span>✓ Mark as Solved</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900">
                            <div>
                              <p className="font-bold flex items-center space-x-1.5 text-emerald-950">
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                <span>Resolved: {t.resolutionNote || 'Inspected and cleared by Mandi Officer.'}</span>
                              </p>
                              {t.resolvedAt && (
                                <p className="text-[10px] text-emerald-700 mt-0.5 font-mono">
                                  Resolved at: {t.resolvedAt}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleReopenTicket(t.id)}
                                title="Re-open this complaint"
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold flex items-center space-x-1 text-[11px] transition"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-600" />
                                <span>Re-open</span>
                              </button>
                              <button
                                onClick={() => handleDeleteTicket(t.id)}
                                title="Delete ticket"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* ============================================================
               FARMER VIEW: FILL PROBLEM & VIEW LIVE STATUS
               ============================================================ */
            <div className="space-y-6">
              {/* Farmer Problem Submission Form Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Submit Your Mandi Grievance / अपनी समस्या दर्ज करें
                    </h2>
                    <p className="text-xs text-slate-500">
                      मंडी सहायता या शिकायत दर्ज करें • अधिकारी द्वारा त्वरित समाधान
                    </p>
                  </div>
                </div>

                {submittedTicket && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-emerald-900">
                          Ticket #{submittedTicket.id} दर्ज हो गया है!
                        </p>
                        <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                          {submittedTicket.status}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                        आपकी समस्या मंडी नियंत्रण कक्ष (Control Room) को भेज दी गई है। मंडी अधिकारी शीघ्र इसका समाधान करेंगे।
                      </p>
                      <button
                        onClick={() => setSubmittedTicket(null)}
                        className="text-xs font-semibold text-emerald-800 hover:underline mt-2 inline-block"
                      >
                        + एक और समस्या दर्ज करें
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        किसान का नाम (Farmer Name) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={farmerName}
                        onChange={(e) => setFarmerName(e.target.value)}
                        placeholder="किसान का नाम दर्ज करें (Enter Name)"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        मोबाइल नंबर (Mobile Number) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit phone number"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Token ID (यदि टोकन मिला हो)
                      </label>
                      <input
                        type="text"
                        value={tokenId}
                        onChange={(e) => setTokenId(e.target.value)}
                        placeholder="उदा. TKN1234 (वैकल्पिक)"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Category / समस्या का प्रकार <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      >
                        <option value="Weighbridge / Gate Delay">धर्मकांटा / गेट पर देरी (Weighbridge Delay)</option>
                        <option value="Moisture / Quality Dispute">नमी / गुणवत्ता जांच समस्या (Moisture Dispute)</option>
                        <option value="Token Lost / SMS Issue">टोकन खो गया या SMS नहीं मिला</option>
                        <option value="MSP Payment Advice Slip">MSP भुगतान / पेमेंट एडवाइस पूछताछ</option>
                        <option value="Document Verification">आधार / गिरदावरी सत्यापन समस्या</option>
                        <option value="General Inquiry">अन्य सामान्य पूछताछ (General Inquiry)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      अपनी समस्या का विवरण लिखें (Describe Your Issue) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="गाड़ी संख्या, गेट संख्या, या अपनी समस्या का स्पष्ट विवरण दें..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'शिकायत दर्ज की जा रही है...' : 'समस्या दर्ज करें (Submit Ticket)'}</span>
                  </button>
                </form>
              </div>

              {/* Farmer's Registered Tickets List */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-base">
                    आपकी दर्ज समस्याएं एवं समाधान स्थिति
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {farmerTickets.length} Ticket{farmerTickets.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {farmerTickets.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    आपने अभी तक कोई समस्या दर्ज नहीं की है। यदि मंडी में कोई परेशानी आए तो ऊपर दिए गए फॉर्म का उपयोग करें।
                  </p>
                ) : (
                  <div className="space-y-3">
                    {farmerTickets.map((t, idx) => {
                      const isResolved = t.status?.includes('Resolved');
                      return (
                        <div
                          key={t.id || idx}
                          className={`p-4 rounded-2xl border transition ${
                            isResolved ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md">
                                {t.id}
                              </span>
                              <span className="text-xs font-semibold text-slate-800">
                                {t.category}
                              </span>
                              {t.tokenId && t.tokenId !== 'N/A' && (
                                <span className="text-[11px] font-mono text-slate-500">
                                  ({t.tokenId})
                                </span>
                              )}
                            </div>

                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isResolved ? '✓ Resolved / समाधान संपन्न' : '⏳ Open - Under Review'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed mb-2">
                            {t.description}
                          </p>

                          {/* Resolution Note if Solved */}
                          {isResolved && (
                            <div className="p-2.5 bg-emerald-100/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 mb-1.5">
                              <p className="font-bold">
                                👨‍💼 अधिकारी समाधान संदेश: {t.resolutionNote || 'समस्या का निरीक्षण कर समाधान कर दिया गया है।'}
                              </p>
                              {t.resolvedAt && (
                                <p className="text-[10px] text-emerald-700 mt-0.5 font-mono">
                                  {t.resolvedAt}
                                </p>
                              )}
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400">
                            दर्ज समय: {t.createdAt}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Gate Guide & Mandi FAQ */}
        <div className="lg:col-span-5 space-y-6">
          {/* Mandi Operational Shifts & Timings Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-indigo-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <Clock className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Mandi Operational Shifts (शिफ्ट समय)</h3>
              </div>
              <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                2-Shift System
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Shift 1 Day */}
              <div className="p-3.5 bg-amber-950/40 rounded-2xl border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-300 flex items-center space-x-1.5">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Shift 1: Day (पहली शिफ्ट / दिन)</span>
                  </span>
                  <span className="font-mono font-bold text-amber-200 bg-amber-900/60 px-2 py-0.5 rounded">
                    06:00 AM – 11:00 AM
                  </span>
                </div>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  Morning auctions, heavy tractor weighings at Gate 1, and moisture sampling at Sheds A & B.
                </p>
              </div>

              {/* Maintenance Break */}
              <div className="p-2.5 bg-slate-800/60 rounded-xl border border-dashed border-slate-600 text-[11px] text-slate-300 flex items-center justify-between">
                <span>🍽️ Recess & Scale Zero-Calibration</span>
                <span className="font-mono text-slate-400">11:00 AM – 01:00 PM</span>
              </div>

              {/* Shift 2 Night */}
              <div className="p-3.5 bg-indigo-950/40 rounded-2xl border border-indigo-500/30">
                <div className="flex items-center justify-between">
                  <span className="font-black text-indigo-300 flex items-center space-x-1.5">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>Shift 2: Night (दूसरी शिफ्ट / रात)</span>
                  </span>
                  <span className="font-mono font-bold text-indigo-200 bg-indigo-900/60 px-2 py-0.5 rounded">
                    01:00 PM – 08:00 PM
                  </span>
                </div>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  Afternoon and evening lots, commercial vehicle entries at Gate 2 & 3, and final docket dispatch.
                </p>
              </div>
            </div>
          </div>

          {/* Gate Locator Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800">
            <div className="flex items-center space-x-2.5 mb-4">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-base">Mandi Yard & Gate Guide</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="font-bold text-emerald-400">Gate 1 (प्रवेश द्वार 1)</p>
                <p className="text-slate-300 mt-0.5">Heavy Vehicles, Tractors & High-Capacity Trolleys. Direct access to Main Weighbridge (धर्मकांटा 1 - 50MT).</p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="font-bold text-amber-400">Gate 2 (प्रवेश द्वार 2)</p>
                <p className="text-slate-300 mt-0.5">Commercial Pickups, Canters & Medium Commercial Carriers. Secondary Weighbridge (धर्मकांटा 2 - 30MT).</p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="font-bold text-purple-400">Gate 3 (प्रवेश द्वार 3)</p>
                <p className="text-slate-300 mt-0.5">Light Commercial Vehicles, Mini Trucks, Small Carriers & Grain Inspection Bay 3 (धर्मकांटा 3 / त्वरित जांच).</p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="font-bold text-blue-400">Shed A & B (जांच केंद्र)</p>
                <p className="text-slate-300 mt-0.5">Government Moisture Testing Lab & Grain Quality Sampling Inspection Bay.</p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="font-bold text-teal-400">Counter 3 & 4 (प्रशासनिक कक्ष)</p>
                <p className="text-slate-300 mt-0.5">Document Verification, Bank Account DBT Validation, and Payment Advice issuance.</p>
              </div>
            </div>
          </div>

          {/* Mandi FAQs */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200">
            <div className="flex items-center space-x-2.5 mb-5">
              <HelpCircle className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base text-slate-900">
                Frequently Asked Questions (FAQ)
              </h3>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="w-full p-3.5 text-left text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-between hover:bg-slate-50 transition"
                    >
                      <span className="pr-2">{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-600 leading-relaxed bg-slate-50/50 border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
