const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const QueueSlot = require('../models/QueueSlot');
const Farmer = require('../models/Farmer');

const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const DATA_DIR = isVercel
  ? path.join('/tmp', 'data')
  : path.join(__dirname, '..', '..', 'data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'mandi_queue.json');
const LOCAL_FARMERS_PATH = path.join(DATA_DIR, 'mandi_farmers.json');

let useMongo = false;
let usePostgres = false;
let pgPool = null;

// Initialize Database connection:
// 1. MongoDB (Beginner-Friendly via Mongoose)
// 2. PostgreSQL (Optional Cloud/Local SQL)
// 3. Local Persistent JSON Store (Fail-safe Fallback)
async function initDb() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  // 1. Try MongoDB first (Primary Beginner-Friendly Database)
  if (mongoUri) {
    try {
      if (mongoose.connection.readyState === 1) {
        useMongo = true;
        return;
      }
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 8000,
        tlsAllowInvalidCertificates: true,
      });
      useMongo = true;
      console.log(`🍃 Connected to MongoDB successfully [Database: ${mongoose.connection.name || 'smart_mandi'}]`);
      return;
    } catch (err) {
      console.warn('⚠️ MongoDB connection failed, falling back to next store:', err.message);
      useMongo = false;
    }
  }

  // 2. Try PostgreSQL (if DATABASE_URL is provided)
  if (process.env.DATABASE_URL) {
    try {
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL.includes('supabase')
          ? { rejectUnauthorized: false }
          : false,
      });

      // Test connection
      await pgPool.query('SELECT NOW()');
      usePostgres = true;
      console.log('✅ Connected to PostgreSQL / Supabase successfully.');

      // Ensure table exists
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS queue_slots (
          id SERIAL PRIMARY KEY,
          token_id VARCHAR(50) UNIQUE NOT NULL,
          farmer_name VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          crop_type VARCHAR(50) NOT NULL,
          quantity NUMERIC NOT NULL,
          preferred_date VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'waiting',
          gate_assigned VARCHAR(20) DEFAULT 'Gate 1',
          vehicle_no VARCHAR(50),
          shift VARCHAR(50) DEFAULT 'shift_1_day',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
      return;
    } catch (err) {
      console.warn('⚠️ PostgreSQL connection failed, falling back to local persistent store:', err.message);
      usePostgres = false;
    }
  }

  // 3. Fallback to local persistent JSON store (Zero configuration required)
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const initialData = getSampleSeedData();
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
    console.log('📦 Local Mandi database initialized with clean queue.');
  } else {
    console.log('📦 Using local persistent store at:', LOCAL_DB_PATH);
  }

  if (!fs.existsSync(LOCAL_FARMERS_PATH)) {
    fs.writeFileSync(LOCAL_FARMERS_PATH, JSON.stringify([], null, 2), 'utf-8');
  }
}

// Helpers for Local JSON store
function readLocalData() {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) return [];
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local queue db:', err);
    return [];
  }
}

function writeLocalData(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local queue db:', err);
  }
}

function readLocalFarmers() {
  try {
    if (!fs.existsSync(LOCAL_FARMERS_PATH)) return [];
    const raw = fs.readFileSync(LOCAL_FARMERS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local farmers db:', err);
    return [];
  }
}

function writeLocalFarmers(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(LOCAL_FARMERS_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local farmers db:', err);
  }
}

function generateTokenId() {
  const prefix = 'TKN';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomNum}`;
}

// Real Manual Mandi Data Mode - Initial queue starts clean with zero dummy data
function getSampleSeedData() {
  return [];
}

// Public DB API
const db = {
  getDbInfo() {
    if (useMongo) {
      return {
        type: 'mongodb',
        connected: mongoose.connection.readyState === 1,
        databaseName: mongoose.connection.name || 'smart_mandi',
        host: mongoose.connection.host || 'remote'
      };
    }
    if (usePostgres) {
      return {
        type: 'postgresql',
        connected: true
      };
    }
    return {
      type: 'local_json',
      connected: true,
      filePath: LOCAL_DB_PATH
    };
  },

  async getAll() {
    if (useMongo) {
      const slots = await QueueSlot.find().sort({ created_at: 1, _id: 1 }).lean();
      return slots.map(s => ({
        ...s,
        id: s._id ? s._id.toString() : s.id,
        created_at: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
        updated_at: s.updated_at ? new Date(s.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (usePostgres) {
      const res = await pgPool.query('SELECT * FROM queue_slots ORDER BY id ASC');
      return res.rows;
    }

    return readLocalData();
  },

  async getByToken(tokenId) {
    if (!tokenId) return null;
    const cleanToken = tokenId.trim().toUpperCase();

    if (useMongo) {
      const slot = await QueueSlot.findOne({ token_id: cleanToken }).lean();
      if (!slot) return null;
      return {
        ...slot,
        id: slot._id ? slot._id.toString() : slot.id,
        created_at: slot.created_at ? new Date(slot.created_at).toISOString() : new Date().toISOString(),
        updated_at: slot.updated_at ? new Date(slot.updated_at).toISOString() : new Date().toISOString()
      };
    }

    if (usePostgres) {
      const res = await pgPool.query('SELECT * FROM queue_slots WHERE UPPER(token_id) = $1', [cleanToken]);
      return res.rows[0] || null;
    }

    const data = readLocalData();
    return data.find(item => item.token_id && item.token_id.toUpperCase() === cleanToken) || null;
  },

  async createBooking({ farmerName, phone, cropType, quantity, preferredDate, gateAssigned, vehicleNo, shift }) {
    let tokenId = generateTokenId();
    // Ensure uniqueness
    while (await this.getByToken(tokenId)) {
      tokenId = generateTokenId();
    }

    const now = new Date().toISOString();
    const cleanPhone = phone ? phone.trim() : '';
    const assignedGate = gateAssigned || 'Gate 1';
    const vehicle = vehicleNo ? vehicleNo.trim().toUpperCase() : '';
    const assignedShift = shift || 'shift_1_day';

    if (useMongo) {
      const newSlot = await QueueSlot.create({
        token_id: tokenId,
        farmer_name: farmerName,
        phone: cleanPhone,
        crop_type: cropType,
        quantity: Number(quantity),
        preferred_date: preferredDate,
        status: 'waiting',
        gate_assigned: assignedGate,
        vehicle_no: vehicle,
        shift: assignedShift
      });
      const obj = newSlot.toJSON();
      return {
        ...obj,
        created_at: obj.created_at ? new Date(obj.created_at).toISOString() : now,
        updated_at: obj.updated_at ? new Date(obj.updated_at).toISOString() : now
      };
    }

    if (usePostgres) {
      const res = await pgPool.query(
        `INSERT INTO queue_slots 
          (token_id, farmer_name, phone, crop_type, quantity, preferred_date, status, gate_assigned, vehicle_no, shift, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'waiting', $7, $8, $9, $10, $10)
         RETURNING *`,
        [tokenId, farmerName, cleanPhone, cropType, Number(quantity), preferredDate, assignedGate, vehicle, assignedShift, now]
      );
      return res.rows[0];
    }

    const data = readLocalData();
    const newEntry = {
      id: data.length > 0 ? Math.max(...data.map(d => d.id || 0)) + 1 : 1,
      token_id: tokenId,
      farmer_name: farmerName,
      phone: cleanPhone,
      crop_type: cropType,
      quantity: Number(quantity),
      preferred_date: preferredDate,
      status: 'waiting',
      gate_assigned: assignedGate,
      vehicle_no: vehicle,
      shift: assignedShift,
      created_at: now,
      updated_at: now
    };
    data.push(newEntry);
    writeLocalData(data);
    return newEntry;
  },

  async updateStatus(tokenId, newStatus, cancellationReason = '') {
    const validStatuses = ['waiting', 'called', 'processing', 'payment_processing', 'done', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const cleanToken = tokenId.trim().toUpperCase();
    const now = new Date().toISOString();

    if (useMongo) {
      const updatePayload = { status: newStatus, updated_at: now };
      if (cancellationReason) {
        updatePayload.cancellation_reason = cancellationReason.trim();
      }
      const updated = await QueueSlot.findOneAndUpdate(
        { token_id: cleanToken },
        updatePayload,
        { new: true }
      ).lean();
      if (!updated) return null;
      return {
        ...updated,
        id: updated._id ? updated._id.toString() : updated.id,
        created_at: updated.created_at ? new Date(updated.created_at).toISOString() : now,
        updated_at: updated.updated_at ? new Date(updated.updated_at).toISOString() : now
      };
    }

    if (usePostgres) {
      const res = await pgPool.query(
        `UPDATE queue_slots 
         SET status = $1, updated_at = $2 
         WHERE UPPER(token_id) = $3 
         RETURNING *`,
        [newStatus, now, cleanToken]
      );
      return res.rows[0] || null;
    }

    const data = readLocalData();
    const item = data.find(d => d.token_id && d.token_id.toUpperCase() === cleanToken);
    if (!item) return null;
    item.status = newStatus;
    if (cancellationReason) {
      item.cancellation_reason = cancellationReason.trim();
    }
    item.updated_at = now;
    writeLocalData(data);
    return item;
  },

  async updateGate(tokenId, newGate) {
    const validGates = ['Gate 1', 'Gate 2', 'Gate 3'];
    if (!validGates.includes(newGate)) {
      throw new Error(`Invalid gate: ${newGate}`);
    }

    const cleanToken = tokenId.trim().toUpperCase();
    const now = new Date().toISOString();

    if (useMongo) {
      const updated = await QueueSlot.findOneAndUpdate(
        { token_id: cleanToken },
        { gate_assigned: newGate, updated_at: now },
        { new: true }
      ).lean();
      if (!updated) return null;
      return {
        ...updated,
        id: updated._id ? updated._id.toString() : updated.id,
        created_at: updated.created_at ? new Date(updated.created_at).toISOString() : now,
        updated_at: updated.updated_at ? new Date(updated.updated_at).toISOString() : now
      };
    }

    if (usePostgres) {
      const res = await pgPool.query(
        `UPDATE queue_slots 
         SET gate_assigned = $1, updated_at = $2 
         WHERE UPPER(token_id) = $3 
         RETURNING *`,
        [newGate, now, cleanToken]
      );
      return res.rows[0] || null;
    }

    const data = readLocalData();
    const item = data.find(d => d.token_id && d.token_id.toUpperCase() === cleanToken);
    if (!item) return null;
    item.gate_assigned = newGate;
    item.updated_at = now;
    writeLocalData(data);
    return item;
  },

  async callNextWaiting(targetDate = null) {
    const now = new Date().toISOString();

    if (useMongo) {
      const query = { status: 'waiting' };
      if (targetDate && targetDate !== 'all') {
        query.preferred_date = targetDate;
      }
      const nextItem = await QueueSlot.findOneAndUpdate(
        query,
        { status: 'called' },
        { sort: { created_at: 1, _id: 1 }, new: true }
      ).lean();
      if (!nextItem) return null;
      return {
        ...nextItem,
        id: nextItem._id ? nextItem._id.toString() : nextItem.id,
        created_at: nextItem.created_at ? new Date(nextItem.created_at).toISOString() : now,
        updated_at: nextItem.updated_at ? new Date(nextItem.updated_at).toISOString() : now
      };
    }

    if (usePostgres) {
      let queryStr = `SELECT * FROM queue_slots WHERE status = 'waiting'`;
      const queryParams = [];
      if (targetDate && targetDate !== 'all') {
        queryParams.push(targetDate);
        queryStr += ` AND preferred_date = $1`;
      }
      queryStr += ` ORDER BY id ASC LIMIT 1`;

      const findRes = await pgPool.query(queryStr, queryParams);
      if (findRes.rows.length === 0) return null;

      const nextItem = findRes.rows[0];
      const updateRes = await pgPool.query(
        `UPDATE queue_slots 
         SET status = 'called', updated_at = $1 
         WHERE id = $2 
         RETURNING *`,
        [now, nextItem.id]
      );
      return updateRes.rows[0];
    }

    const data = readLocalData();
    const nextItem = data.find(d => {
      if (d.status !== 'waiting') return false;
      if (targetDate && targetDate !== 'all') {
        return d.preferred_date === targetDate;
      }
      return true;
    });
    if (!nextItem) return null;

    nextItem.status = 'called';
    nextItem.updated_at = now;
    writeLocalData(data);
    return nextItem;
  },

  async resetSeed() {
    const seed = getSampleSeedData();

    if (useMongo) {
      await QueueSlot.deleteMany({});
      return [];
    }

    if (usePostgres) {
      await pgPool.query('TRUNCATE TABLE queue_slots RESTART IDENTITY');
      return [];
    }

    writeLocalData(seed);
    return seed;
  },

  async deleteSlot(tokenId) {
    if (!tokenId) return false;
    const cleanToken = tokenId.trim().toUpperCase();

    if (useMongo) {
      const res = await QueueSlot.deleteOne({ token_id: cleanToken });
      return res.deletedCount > 0;
    }

    if (usePostgres) {
      await pgPool.query('DELETE FROM queue_slots WHERE UPPER(token_id) = $1', [cleanToken]);
      return true;
    }

    const data = readLocalData();
    const filtered = data.filter(item => item.token_id && item.token_id.toUpperCase() !== cleanToken);
    writeLocalData(filtered);
    return true;
  },

  // Farmer Authentication Methods
  async findFarmerByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (useMongo) {
      const farmer = await Farmer.findOne({ phone: cleanPhone }).lean();
      if (!farmer) return null;
      return {
        ...farmer,
        id: farmer._id ? farmer._id.toString() : farmer.id
      };
    }

    const farmers = readLocalFarmers();
    return farmers.find(f => f.phone.replace(/\D/g, '').slice(-10) === cleanPhone) || null;
  },

  async registerFarmer({ name, phone, password }) {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (useMongo) {
      const existing = await Farmer.findOne({ phone: cleanPhone });
      if (existing) {
        throw new Error('यह मोबाइल नंबर पहले से पंजीकृत है (Phone already registered)');
      }
      const farmer = await Farmer.create({
        name: name.trim(),
        phone: cleanPhone,
        password: password.trim()
      });
      return farmer.toJSON();
    }

    const farmers = readLocalFarmers();
    const existing = farmers.find(f => f.phone.replace(/\D/g, '').slice(-10) === cleanPhone);
    if (existing) {
      throw new Error('यह मोबाइल नंबर पहले से पंजीकृत है (Phone already registered)');
    }

    const newFarmer = {
      id: farmers.length > 0 ? Math.max(...farmers.map(f => f.id || 0)) + 1 : 1,
      name: name.trim(),
      phone: cleanPhone,
      password: password.trim(),
      created_at: new Date().toISOString()
    };
    farmers.push(newFarmer);
    writeLocalFarmers(farmers);
    return newFarmer;
  }
};

module.exports = { initDb, db };
