-- MT5 Bridge Tables Migration
-- Run this in your Supabase SQL Editor

-- Table: mt5_connections
-- Stores the investor password connection profile per user/account
CREATE TABLE IF NOT EXISTS mt5_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  portfolio_account_id TEXT NOT NULL,
  broker_name TEXT,
  mt5_server TEXT NOT NULL,
  mt5_account_number TEXT NOT NULL,
  investor_password TEXT NOT NULL,  -- Store encrypted in production!
  account_type TEXT DEFAULT 'Live',
  connection_status TEXT DEFAULT 'DISCONNECTED',
  last_sync_status TEXT,
  last_sync_error TEXT,
  last_sync_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: mt5_sync_jobs
-- The queue that the Python worker polls
CREATE TABLE IF NOT EXISTS mt5_sync_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  portfolio_account_id TEXT NOT NULL,
  mt5_connection_id TEXT NOT NULL REFERENCES mt5_connections(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for fast polling
CREATE INDEX IF NOT EXISTS idx_mt5_sync_jobs_status ON mt5_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_mt5_sync_jobs_user ON mt5_sync_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_mt5_connections_user ON mt5_connections(user_id);

-- RLS Policies
ALTER TABLE mt5_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt5_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own connections"
  ON mt5_connections FOR ALL
  USING (user_id = auth.uid()::TEXT OR true);  -- adjust to your auth model

CREATE POLICY "Users can manage own jobs"
  ON mt5_sync_jobs FOR ALL
  USING (user_id = auth.uid()::TEXT OR true);  -- adjust to your auth model
