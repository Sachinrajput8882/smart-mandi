import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import LiveQueue from './components/LiveQueue';
import BookingForm from './components/BookingForm';
import TokenReceipt from './components/TokenReceipt';
import TokenTracker from './components/TokenTracker';
import AdminPanel from './components/AdminPanel';
import AnalyticsModal from './components/AnalyticsModal';
import Helpdesk from './components/Helpdesk';
import AuthPage from './components/AuthPage';
import { api } from './services/api';
import { AlertTriangle, Bell, ArrowRight, X, Volume2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mandi_auth_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'book' | 'receipt' | 'track' | 'help' | 'admin'
  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState({ total: 0, waiting: 0, called: 0, processing: 0, done: 0 });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [lastBookedSlot, setLastBookedSlot] = useState(null);
  const [trackTokenId, setTrackTokenId] = useState('');
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [myActiveToken, setMyActiveToken] = useState(() => {
    const saved = localStorage.getItem('mandi_active_token');
    const dummyTokens = ['TKN1011', 'TKN1012', 'TKN1013', 'TKN1014', 'TKN1015', 'TKN1016'];
    if (saved && dummyTokens.includes(saved.toUpperCase())) {
      localStorage.removeItem('mandi_active_token');
      return '';
    }
    return saved || '';
  });
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user?.role === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('live');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mandi_auth_session');
    setCurrentUser(null);
    setActiveTab('live');
  };

  // Audio speech synthesis announcement for Indian Mandi
  const handleAnnounce = useCallback((slot) => {
    if (!slot || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const message = `Attention please. Token ${slot.token_id.split('').join(' ')}, ${slot.farmer_name}, please proceed to ${slot.gate_assigned || 'Gate 1'}.`;
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis unavailable:', e);
    }
  }, []);

  // Fetch full queue (HTTP fallback & manual refresh)
  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const role = currentUser?.role === 'admin' ? 'admin' : '';
      const res = await api.getQueue(role);
      setQueue(res.queue || []);
      setSummary(res.summary || { total: 0, waiting: 0, called: 0, processing: 0, done: 0 });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching queue:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Real-time Server-Sent Events (SSE) listener
  useEffect(() => {
    fetchQueue();

    let eventSource;
    try {
      eventSource = new EventSource('/api/queue/stream');

      eventSource.addEventListener('init', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.queue) setQueue(data.queue);
          if (data.summary) setSummary(data.summary);
          setLastUpdated(new Date());
        } catch (err) {}
      });

      eventSource.addEventListener('queue_update', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.queue) setQueue(data.queue);
          if (data.summary) setSummary(data.summary);
          if (data.calledSlot) {
            handleAnnounce(data.calledSlot);
          }
          setLastUpdated(new Date());
        } catch (err) {}
      });

      eventSource.onerror = () => {
        // SSE disconnected, fallback continues via auto-poll in LiveQueue
      };
    } catch (err) {
      console.warn('EventSource initialization failed:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [fetchQueue, handleAnnounce]);

  // Booking success handler
  const handleBookingSuccess = (newSlot) => {
    setLastBookedSlot(newSlot);
    if (newSlot?.token_id) {
      setMyActiveToken(newSlot.token_id);
      localStorage.setItem('mandi_active_token', newSlot.token_id);
      setBannerDismissed(false);
    }
    setActiveTab('receipt');
    fetchQueue();
  };

  // Switch to tracker for specific token
  const handleTrackToken = (tokenId) => {
    setTrackTokenId(tokenId);
    if (tokenId) {
      setMyActiveToken(tokenId);
      localStorage.setItem('mandi_active_token', tokenId);
      setBannerDismissed(false);
    }
    setActiveTab('track');
  };

  // Admin action: Call Next
  const handleCallNext = async () => {
    const res = await api.callNext();
    if (res && res.data) {
      handleAnnounce(res.data);
    }
    await fetchQueue();
    return res;
  };

  // Admin action: Update status
  const handleUpdateStatus = async (tokenId, status, reason = '') => {
    const res = await api.updateStatus(tokenId, status, reason);
    if (status === 'called' && res && res.data) {
      handleAnnounce(res.data);
    }
    await fetchQueue();
  };

  // Admin action: Delete slot
  const handleDeleteSlot = async (tokenId) => {
    await api.deleteSlot(tokenId);
    await fetchQueue();
  };

  // Admin action: Change farmer gate
  const handleChangeGate = async (tokenId, newGate) => {
    const res = await api.changeGate(tokenId, newGate);
    await fetchQueue();
    return res;
  };

  // Admin action: Rebalance waiting gates (>3 waiting)
  const handleRebalanceGates = async () => {
    const res = await api.rebalanceGates();
    await fetchQueue();
    return res;
  };

  // Current active tracked slot for global notification simulation
  const mySlot = queue.find(s => s.token_id === myActiveToken);
  const isMySlotCalled = mySlot && mySlot.status === 'called';
  const isMySlotNear = mySlot && mySlot.status === 'waiting' && mySlot.position !== null && mySlot.position < 3;

  // If user is not logged in, render the AuthPage first
  if (!currentUser) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAnalytics={() => setAnalyticsOpen(true)}
        queueSummary={summary}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Global Notification Simulation Banner (Triggers when Position < 3 or Called) */}
      {!bannerDismissed && mySlot && (isMySlotCalled || isMySlotNear) && (
        <div className={`w-full py-3 px-4 sm:px-6 shadow-md transition-all duration-300 ${
          isMySlotCalled 
            ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white animate-pulse' 
            : 'bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-white'
        }`}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              {isMySlotCalled ? (
                <Bell className="w-5 h-5 text-amber-300 animate-bounce flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-100 animate-bounce flex-shrink-0" />
              )}
              <div className="text-xs sm:text-sm">
                {isMySlotCalled ? (
                  <span>
                    <strong className="font-extrabold uppercase tracking-wide">📢 MANDI ENTRY ALERT:</strong> Token <strong>{mySlot.token_id}</strong> ({mySlot.farmer_name}) called! Please proceed to <strong>{mySlot.gate_assigned || 'Gate 1'}</strong> immediately.
                  </span>
                ) : (
                  <span>
                    <strong className="font-extrabold uppercase tracking-wide">🚨 YOU ARE NEXT, PLEASE MOVE TO MANDI!</strong> Token <strong>{mySlot.token_id}</strong> is at Position <strong>#{mySlot.position}</strong> in queue (Est. wait: {mySlot.estimated_wait_minutes} mins).
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => handleTrackToken(mySlot.token_id)}
                className="text-xs font-bold px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center space-x-1"
              >
                <span>View Token Tracker</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                title="Dismiss banner"
                className="p-1 hover:bg-white/20 rounded-md transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'live' && (
          <LiveQueue
            queue={queue}
            summary={summary}
            loading={loading}
            onRefresh={fetchQueue}
            lastUpdated={lastUpdated}
            onAnnounce={handleAnnounce}
          />
        )}

        {activeTab === 'book' && (
          <BookingForm
            onBookingSuccess={handleBookingSuccess}
            currentUser={currentUser}
            queue={queue}
            summary={summary}
          />
        )}

        {activeTab === 'receipt' && (
          <TokenReceipt
            tokenData={lastBookedSlot}
            onTrackToken={handleTrackToken}
            onBookAnother={() => setActiveTab('book')}
          />
        )}

        {activeTab === 'track' && (
          <TokenTracker
            initialToken={trackTokenId}
            onNavigateToBooking={() => setActiveTab('book')}
          />
        )}

        {activeTab === 'help' && (
          <Helpdesk
            onNavigateToBooking={() => setActiveTab('book')}
            onTrackToken={handleTrackToken}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'admin' && (
          currentUser?.role === 'admin' ? (
            <AdminPanel
              queue={queue}
              summary={summary}
              onRefresh={fetchQueue}
              onUpdateStatus={handleUpdateStatus}
              onCallNext={handleCallNext}
              onChangeGate={handleChangeGate}
              onRebalanceGates={handleRebalanceGates}
              onDeleteSlot={handleDeleteSlot}
            />
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-700 font-bold mb-2">Access Restricted</p>
              <p className="text-sm text-slate-500 mb-4">Admin Desk is only accessible to authorized Mandi Officers.</p>
              <button onClick={() => setActiveTab('live')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs">Return to Live Queue</button>
            </div>
          )
        )}
      </main>

      {/* Analytics Modal */}
      <AnalyticsModal
        isOpen={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            🌾 Smart Mandi Queue & Token Management Platform
          </p>
          <p>
            Designed for MSP Procurement Centers & APMC Mandis • Automated waiting time calculation & real-time gate notifications
          </p>
        </div>
      </footer>
    </div>
  );
}
