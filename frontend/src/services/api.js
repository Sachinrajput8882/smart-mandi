import { storage } from './storage';

const API_BASE = '/api';

export const api = {
  // 1. POST /book - create booking with instant persistent client save
  async bookSlot(bookingData) {
    try {
      const res = await fetch(`${API_BASE}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to book slot');

      if (json.data) {
        storage.saveManualFarmer({
          ...json.data,
          phone: bookingData.phone || json.data.phone,
          vehicle_no: bookingData.vehicle_no || '',
          gate_assigned: json.data.gate_assigned || bookingData.gate_assigned || 'Gate 1',
          is_manual: true
        });
      }
      return json;
    } catch (err) {
      console.warn('Network call failed, falling back to local persistent store:', err);
      // Generate client-side persistent booking
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const offlineSlot = {
        id: Date.now(),
        token_id: `TKN${randomNum}`,
        farmer_name: bookingData.name || bookingData.farmer_name,
        phone: bookingData.phone || '',
        crop_type: bookingData.crop_type,
        quantity: Number(bookingData.quantity),
        preferred_date: bookingData.preferred_date || new Date().toISOString().split('T')[0],
        status: 'waiting',
        gate_assigned: bookingData.gate_assigned || 'Gate 1',
        vehicle_no: bookingData.vehicle_no || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_manual: true
      };
      storage.saveManualFarmer(offlineSlot);
      return { success: true, data: offlineSlot };
    }
  },

  // 2. GET /queue - get all slots merged with local persistent manual data
  async getQueue(role = '') {
    try {
      const url = role ? `${API_BASE}/queue?role=${encodeURIComponent(role)}` : `${API_BASE}/queue`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to fetch queue');

      // Merge server queue with locally saved manual entries & status overrides
      const mergedQueue = storage.mergeQueueWithLocalData(json.queue || []);
      const today = new Date().toISOString().split('T')[0];
      const activeToday = mergedQueue.filter(s => s.status !== 'cancelled' && (s.preferred_date === today || (s.created_at && s.created_at.startsWith(today))));
      const quintalsBookedToday = activeToday.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
      const vehiclesToday = activeToday.filter(s => s.vehicle_no && s.vehicle_no.trim()).length;

      const summary = {
        total: mergedQueue.length,
        waiting: mergedQueue.filter(s => s.status === 'waiting').length,
        called: mergedQueue.filter(s => s.status === 'called').length,
        processing: mergedQueue.filter(s => s.status === 'processing').length,
        payment_processing: mergedQueue.filter(s => s.status === 'payment_processing').length,
        done: mergedQueue.filter(s => s.status === 'done').length,
        cancelled: mergedQueue.filter(s => s.status === 'cancelled').length,
        daily_capacity_limit: 3000,
        quintals_booked_today: json.summary?.quintals_booked_today ?? quintalsBookedToday,
        quintals_remaining_today: json.summary?.quintals_remaining_today ?? Math.max(0, 3000 - quintalsBookedToday),
        capacity_percentage: json.summary?.capacity_percentage ?? Math.min(100, Math.round((quintalsBookedToday / 3000) * 100)),
        vehicles_arrived_today: json.summary?.vehicles_arrived_today ?? vehiclesToday
      };

      return {
        success: true,
        summary,
        queue: mergedQueue
      };
    } catch (err) {
      console.warn('Server queue fetch failed, using local persistent store:', err);
      const mergedQueue = storage.mergeQueueWithLocalData([]);
      const today = new Date().toISOString().split('T')[0];
      const activeToday = mergedQueue.filter(s => s.status !== 'cancelled' && (s.preferred_date === today || (s.created_at && s.created_at.startsWith(today))));
      const quintalsBookedToday = activeToday.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
      const vehiclesToday = activeToday.filter(s => s.vehicle_no && s.vehicle_no.trim()).length;

      const summary = {
        total: mergedQueue.length,
        waiting: mergedQueue.filter(s => s.status === 'waiting').length,
        called: mergedQueue.filter(s => s.status === 'called').length,
        processing: mergedQueue.filter(s => s.status === 'processing').length,
        payment_processing: mergedQueue.filter(s => s.status === 'payment_processing').length,
        done: mergedQueue.filter(s => s.status === 'done').length,
        cancelled: mergedQueue.filter(s => s.status === 'cancelled').length,
        daily_capacity_limit: 3000,
        quintals_booked_today: quintalsBookedToday,
        quintals_remaining_today: Math.max(0, 3000 - quintalsBookedToday),
        capacity_percentage: Math.min(100, Math.round((quintalsBookedToday / 3000) * 100)),
        vehicles_arrived_today: vehiclesToday
      };
      return {
        success: true,
        summary,
        queue: mergedQueue
      };
    }
  },

  // 3. PUT /next - call next farmer (optionally for a specific date)
  async callNext(targetDate = '') {
    const body = targetDate && targetDate !== 'all' ? JSON.stringify({ date: targetDate }) : undefined;
    const res = await fetch(`${API_BASE}/next`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to call next farmer');
    if (json.data?.token_id) {
      storage.saveStatusOverride(json.data.token_id, 'called');
    }
    return json;
  },

  // 4. PUT /update-status - update status with persistent override and optional cancellation reason
  async updateStatus(tokenId, status, reason = '') {
    // Save to local storage first so status is never lost on refresh
    storage.saveStatusOverride(tokenId, status);

    try {
      const res = await fetch(`${API_BASE}/update-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_id: tokenId, status, cancellation_reason: reason })
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn('Server status update failed, local override applied:', err);
      return { success: true, data: { token_id: tokenId, status, cancellation_reason: reason } };
    }
  },

  // 4b. PUT /change-gate - Admin change farmer gate
  async changeGate(tokenId, newGate) {
    try {
      const res = await fetch(`${API_BASE}/change-gate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_id: tokenId, gate_assigned: newGate })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to change gate');
      return json;
    } catch (err) {
      console.warn('Server change gate failed:', err);
      return { success: true, data: { token_id: tokenId, gate_assigned: newGate } };
    }
  },

  // 4c. POST /rebalance-gates - Dynamically balance gates (>3 waiting)
  async rebalanceGates() {
    try {
      const res = await fetch(`${API_BASE}/rebalance-gates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to rebalance gates');
      return json;
    } catch (err) {
      console.warn('Server rebalance gates failed:', err);
      return { success: false, message: err.message };
    }
  },

  // 5. GET /queue/:tokenId - get single token info
  async getByToken(tokenId) {
    try {
      const res = await fetch(`${API_BASE}/queue/${tokenId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to fetch token');
      return json;
    } catch (err) {
      const all = storage.mergeQueueWithLocalData([]);
      const found = all.find(s => s.token_id?.toUpperCase() === tokenId?.toUpperCase());
      if (found) return { success: true, data: found };
      throw err;
    }
  },

  // 6. DELETE /queue/:tokenId - delete slot locally and on server
  async deleteSlot(tokenId) {
    storage.deleteToken(tokenId);
    try {
      await fetch(`${API_BASE}/queue/${tokenId}`, { method: 'DELETE' });
    } catch (e) {
      // offline delete already handled
    }
    return { success: true };
  },

  // 7. GET /analytics - get mandi procurement stats
  async getAnalytics() {
    const res = await fetch(`${API_BASE}/analytics`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch analytics');
    return json;
  },

  // 8. POST /reset-seed - reset demo data
  async resetSeed() {
    const res = await fetch(`${API_BASE}/reset-seed`, {
      method: 'POST'
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to reset queue');
    return json;
  },

  // 9. POST /auth/register - Register farmer account in MongoDB
  async registerFarmer(farmerData) {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(farmerData)
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn('Auth register network call failed, will use local storage fallback:', err);
      return null;
    }
  },

  // 10. POST /auth/login - Farmer login via MongoDB
  async loginFarmer(credentials) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn('Auth login network call failed, will use local storage fallback:', err);
      return null;
    }
  },

  // 11. GET /status - Check active database (MongoDB / PostgreSQL / Local JSON)
  async getDbStatus() {
    try {
      const res = await fetch(`${API_BASE}/status`);
      const json = await res.json();
      return json;
    } catch (err) {
      return null;
    }
  }
};
