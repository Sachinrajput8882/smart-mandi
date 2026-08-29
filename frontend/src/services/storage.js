// Persistent Client Storage for Real Manual Mandi Data & Communication Logs
// Ensures manual entries and status changes survive page refreshes, tab closures, and Vercel cold starts.

const STORAGE_KEYS = {
  MANUAL_FARMERS: 'mandi_manual_farmers',
  STATUS_OVERRIDES: 'mandi_status_overrides',
  COMMUNICATION_LOGS: 'mandi_communication_logs',
  DELETED_TOKENS: 'mandi_deleted_tokens'
};

const DUMMY_TOKENS = new Set(['TKN1011', 'TKN1012', 'TKN1013', 'TKN1014', 'TKN1015', 'TKN1016']);
const DUMMY_NAME_KEYWORDS = ['baldev', 'gurpreet', 'ram lal', 'shiv kumar', 'anita devi', 'jagdish prasad'];

function isDummyFarmer(farmer) {
  if (!farmer) return false;
  const token = farmer.token_id?.toUpperCase() || '';
  if (DUMMY_TOKENS.has(token)) return true;
  const name = (farmer.farmer_name || farmer.name || '').toLowerCase();
  return DUMMY_NAME_KEYWORDS.some(k => name.includes(k));
}

// Safe localStorage helpers
function getJson(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn(`Error reading localStorage key "${key}":`, e);
    return defaultValue;
  }
}

function setJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing localStorage key "${key}":`, e);
  }
}

export const storage = {
  // 1. Get all manually added farmers (cleanses any legacy dummy data)
  getManualFarmers() {
    const list = getJson(STORAGE_KEYS.MANUAL_FARMERS, []);
    const filtered = list.filter(f => !isDummyFarmer(f));
    if (filtered.length !== list.length) {
      setJson(STORAGE_KEYS.MANUAL_FARMERS, filtered);
    }
    return filtered;
  },

  // 2. Save a new manual farmer entry
  saveManualFarmer(farmer) {
    const list = this.getManualFarmers();
    // Prevent duplicate token_id
    const existingIdx = list.findIndex(f => f.token_id === farmer.token_id);
    const enriched = {
      ...farmer,
      gate_assigned: farmer.gate_assigned || 'Gate 1',
      vehicle_no: farmer.vehicle_no || '',
      shift: farmer.shift || 'shift_1_day',
      is_manual: true,
      updated_at: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      list[existingIdx] = enriched;
    } else {
      list.unshift(enriched);
    }
    setJson(STORAGE_KEYS.MANUAL_FARMERS, list);
    return enriched;
  },

  // 3. Save status override (e.g. called, processing, done, cancelled)
  saveStatusOverride(tokenId, newStatus) {
    const overrides = getJson(STORAGE_KEYS.STATUS_OVERRIDES, {});
    overrides[tokenId.toUpperCase()] = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };
    setJson(STORAGE_KEYS.STATUS_OVERRIDES, overrides);

    // Also update in manual list if present
    const list = this.getManualFarmers();
    const idx = list.findIndex(f => f.token_id.toUpperCase() === tokenId.toUpperCase());
    if (idx >= 0) {
      list[idx].status = newStatus;
      list[idx].updated_at = new Date().toISOString();
      setJson(STORAGE_KEYS.MANUAL_FARMERS, list);
    }
  },

  // 4. Delete / Remove a token locally
  deleteToken(tokenId) {
    const clean = tokenId.toUpperCase();
    const deleted = getJson(STORAGE_KEYS.DELETED_TOKENS, []);
    if (!deleted.includes(clean)) {
      deleted.push(clean);
      setJson(STORAGE_KEYS.DELETED_TOKENS, deleted);
    }

    const list = this.getManualFarmers().filter(f => f.token_id.toUpperCase() !== clean);
    setJson(STORAGE_KEYS.MANUAL_FARMERS, list);
  },

  // 5. Merge server queue with local manual data and status overrides
  mergeQueueWithLocalData(serverQueue = []) {
    const manualFarmers = this.getManualFarmers();
    const overrides = getJson(STORAGE_KEYS.STATUS_OVERRIDES, {});
    const deleted = getJson(STORAGE_KEYS.DELETED_TOKENS, []);

    // Filter out dummy tokens, dummy names, and locally deleted tokens
    let combined = [...serverQueue].filter(s => !isDummyFarmer(s) && !deleted.includes(s.token_id?.toUpperCase()));

    // Apply status overrides to server items
    combined = combined.map(item => {
      const override = overrides[item.token_id?.toUpperCase()];
      if (override) {
        return { ...item, status: override.status, updated_at: override.updated_at };
      }
      return item;
    });

    // Add any local manual farmers missing from the server
    const serverTokens = new Set(combined.map(s => s.token_id?.toUpperCase()));
    manualFarmers.forEach(manual => {
      const cleanToken = manual.token_id?.toUpperCase();
      if (!deleted.includes(cleanToken) && !serverTokens.has(cleanToken)) {
        const override = overrides[cleanToken];
        combined.push({
          ...manual,
          status: override ? override.status : manual.status
        });
      }
    });

    // Recompute waiting positions and estimated times
    let waitingIndex = 0;
    return combined.map(slot => {
      const status = (slot.status || 'waiting').toLowerCase();
      let position = null;
      let estimated_wait_minutes = 0;

      if (status === 'waiting') {
        waitingIndex++;
        position = waitingIndex;
        estimated_wait_minutes = position * 10;
      } else if (status === 'called') {
        position = 0;
        estimated_wait_minutes = 0;
      } else if (status === 'processing') {
        position = 0;
        estimated_wait_minutes = 5;
      } else if (status === 'payment_processing') {
        position = 0;
        estimated_wait_minutes = 0;
      }

      return {
        ...slot,
        position,
        estimated_wait_minutes
      };
    });
  },

  // 6. Log a call or message action for real farmer communication
  logCommunication(tokenId, type, details) {
    const logs = getJson(STORAGE_KEYS.COMMUNICATION_LOGS, {});
    const clean = tokenId.toUpperCase();
    if (!logs[clean]) logs[clean] = [];

    const entry = {
      id: Date.now(),
      type, // 'call' | 'sms' | 'whatsapp'
      details,
      timestamp: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      date: new Date().toLocaleDateString('en-IN')
    };

    logs[clean].unshift(entry);
    setJson(STORAGE_KEYS.COMMUNICATION_LOGS, logs);
    return entry;
  },

  // 7. Get communication history for a token
  getCommunicationLogs(tokenId) {
    const logs = getJson(STORAGE_KEYS.COMMUNICATION_LOGS, {});
    return logs[tokenId?.toUpperCase()] || [];
  }
};
