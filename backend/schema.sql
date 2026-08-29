-- ======================================================================
-- Smart Mandi Queue Management System - PostgreSQL & Supabase Schema
-- ======================================================================

-- 1. Create table for Mandi Queue Slots
CREATE TABLE IF NOT EXISTS queue_slots (
  id SERIAL PRIMARY KEY,
  token_id VARCHAR(50) UNIQUE NOT NULL,
  farmer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  crop_type VARCHAR(50) NOT NULL,
  quantity NUMERIC NOT NULL,
  preferred_date VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting', -- waiting, called, processing, done, cancelled
  gate_assigned VARCHAR(20) DEFAULT 'Gate 1',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes for efficient queue ordering and lookup
CREATE INDEX IF NOT EXISTS idx_queue_slots_status ON queue_slots(status);
CREATE INDEX IF NOT EXISTS idx_queue_slots_created_at ON queue_slots(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_slots_token_id ON queue_slots(token_id);

-- 3. Live Queue (Manual Entries Only)
