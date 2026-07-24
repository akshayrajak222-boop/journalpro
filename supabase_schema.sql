-- ==============================================================================
-- SUPABASE RELATIONAL SCHEMA MIGRATION SCRIPT
-- ==============================================================================
-- Run this entire script in your Supabase SQL Editor.
-- It creates isolated tables for your app and enforces Row Level Security.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  experience TEXT,
  trading_style TEXT,
  main_markets JSONB,
  onboarding_completed BOOLEAN DEFAULT false,
  is_pro BOOLEAN DEFAULT false,
  is_email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own data" ON users FOR ALL USING (auth.uid()::text = id);

-- Table: trading_accounts
CREATE TABLE IF NOT EXISTS trading_accounts (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  broker TEXT,
  platform TEXT,
  account_type TEXT,
  currency TEXT,
  starting_balance FLOAT,
  current_balance FLOAT,
  equity FLOAT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own accounts" ON trading_accounts FOR ALL USING (auth.uid()::text = user_id);

-- Table: trades
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  account_id TEXT REFERENCES trading_accounts(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMPTZ,
  symbol TEXT,
  type TEXT,
  lot_size FLOAT,
  entry_price FLOAT,
  exit_price FLOAT,
  stop_loss FLOAT,
  take_profit FLOAT,
  profit FLOAT,
  commission FLOAT,
  swap FLOAT,
  risk_percentage FLOAT,
  strategy TEXT,
  emotion TEXT,
  notes TEXT,
  screenshot TEXT,
  tags JSONB,
  is_mt5_sync BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own trades" ON trades FOR ALL USING (auth.uid()::text = user_id);

-- Table: risk_settings
CREATE TABLE IF NOT EXISTS risk_settings (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  account_id TEXT REFERENCES trading_accounts(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  risk_per_trade_limit FLOAT,
  daily_loss_limit FLOAT,
  weekly_loss_limit FLOAT,
  max_drawdown_limit FLOAT,
  discipline_enabled BOOLEAN,
  max_trades_per_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE risk_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own risk settings" ON risk_settings FOR ALL USING (auth.uid()::text = user_id);

-- Table: support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT,
  title TEXT,
  description TEXT,
  status TEXT,
  category TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tickets" ON support_tickets FOR ALL USING (auth.uid()::text = user_id);

-- Table: mt5_connections
CREATE TABLE IF NOT EXISTS mt5_connections (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES trading_accounts(id) ON DELETE CASCADE,
  broker_name TEXT,
  status TEXT,
  last_sync_time TIMESTAMPTZ,
  sync_token TEXT,
  total_synced_trades INTEGER DEFAULT 0,
  login_number TEXT,
  broker_server TEXT,
  is_investor_sync BOOLEAN,
  auto_sync BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mt5_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own MT5 connections" ON mt5_connections FOR ALL USING (auth.uid()::text = user_id);

-- Table: announcements (Public readable)
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT,
  content TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Announcements are readable by everyone" ON announcements FOR SELECT USING (true);
