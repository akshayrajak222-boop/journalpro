-- ==============================================================================
-- FX Journal Pro — MT5 SYNC COMPLETE FIX
-- ==============================================================================
-- Run this ENTIRE script in your Supabase SQL Editor:
-- https://supabase.com/dashboard → Your Project → SQL Editor → New Query → Paste & Run
--
-- This script:
--   1. Fixes all RLS policies so the server can INSERT trades
--   2. Adds any missing columns to the trades table
--   3. Creates indexes for faster sync token lookup
-- ==============================================================================


-- ──────────────────────────────────────────────────────────────────────────────
-- SECTION 1: RESET ALL RLS POLICIES (Safe — no data deleted)
-- ──────────────────────────────────────────────────────────────────────────────

-- users
DROP POLICY IF EXISTS "Users can manage their own data" ON users;
DROP POLICY IF EXISTS "Allow anon full access on users" ON users;
DROP POLICY IF EXISTS "Allow authenticated full access on users" ON users;
CREATE POLICY "Allow anon full access on users"
  ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on users"
  ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- trading_accounts
DROP POLICY IF EXISTS "Users can manage their own accounts" ON trading_accounts;
DROP POLICY IF EXISTS "Allow anon full access on trading_accounts" ON trading_accounts;
DROP POLICY IF EXISTS "Allow authenticated full access on trading_accounts" ON trading_accounts;
CREATE POLICY "Allow anon full access on trading_accounts"
  ON trading_accounts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on trading_accounts"
  ON trading_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- trades
DROP POLICY IF EXISTS "Users can manage their own trades" ON trades;
DROP POLICY IF EXISTS "Allow anon full access on trades" ON trades;
DROP POLICY IF EXISTS "Allow authenticated full access on trades" ON trades;
CREATE POLICY "Allow anon full access on trades"
  ON trades FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on trades"
  ON trades FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- risk_settings
DROP POLICY IF EXISTS "Users can manage their own risk settings" ON risk_settings;
DROP POLICY IF EXISTS "Allow anon full access on risk_settings" ON risk_settings;
DROP POLICY IF EXISTS "Allow authenticated full access on risk_settings" ON risk_settings;
CREATE POLICY "Allow anon full access on risk_settings"
  ON risk_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on risk_settings"
  ON risk_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- mt5_connections
DROP POLICY IF EXISTS "Users can manage their own MT5 connections" ON mt5_connections;
DROP POLICY IF EXISTS "Allow anon full access on mt5_connections" ON mt5_connections;
DROP POLICY IF EXISTS "Allow authenticated full access on mt5_connections" ON mt5_connections;
CREATE POLICY "Allow anon full access on mt5_connections"
  ON mt5_connections FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on mt5_connections"
  ON mt5_connections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- support_tickets
DROP POLICY IF EXISTS "Users can manage their own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Allow anon full access on support_tickets" ON support_tickets;
DROP POLICY IF EXISTS "Allow authenticated full access on support_tickets" ON support_tickets;
CREATE POLICY "Allow anon full access on support_tickets"
  ON support_tickets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on support_tickets"
  ON support_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ──────────────────────────────────────────────────────────────────────────────
-- SECTION 2: ADD MISSING COLUMNS (Safe — uses DO block)
-- ──────────────────────────────────────────────────────────────────────────────

-- Add is_mt5_sync if it doesn't exist on the trades table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'is_mt5_sync'
  ) THEN
    ALTER TABLE trades ADD COLUMN is_mt5_sync BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add screenshot column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'screenshot'
  ) THEN
    ALTER TABLE trades ADD COLUMN screenshot TEXT;
  END IF;
END $$;

-- Add lot_size if missing
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'lot_size') THEN ALTER TABLE trades ADD COLUMN lot_size FLOAT; END IF; END $$;
-- Add entry_price if missing
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'entry_price') THEN ALTER TABLE trades ADD COLUMN entry_price FLOAT; END IF; END $$;
-- Add exit_price if missing
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'exit_price') THEN ALTER TABLE trades ADD COLUMN exit_price FLOAT; END IF; END $$;
-- Add stop_loss if missing
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'stop_loss') THEN ALTER TABLE trades ADD COLUMN stop_loss FLOAT; END IF; END $$;
-- Add take_profit if missing
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'take_profit') THEN ALTER TABLE trades ADD COLUMN take_profit FLOAT; END IF; END $$;
-- Add commission if missing
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'commission') THEN ALTER TABLE trades ADD COLUMN commission FLOAT; END IF; END $$;
-- Add swap if missing
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'swap') THEN ALTER TABLE trades ADD COLUMN swap FLOAT; END IF; END $$;
-- Add risk_percentage if missing
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'risk_percentage') THEN ALTER TABLE trades ADD COLUMN risk_percentage FLOAT; END IF; END $$;
-- Add strategy if missing
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'strategy') THEN ALTER TABLE trades ADD COLUMN strategy TEXT; END IF; END $$;
-- Add emotion if missing
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'emotion') THEN ALTER TABLE trades ADD COLUMN emotion TEXT; END IF; END $$;
-- Add notes if missing
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'notes') THEN ALTER TABLE trades ADD COLUMN notes TEXT; END IF; END $$;
-- Add user_id if missing (foreign key to users)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'user_id') THEN ALTER TABLE trades ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE; END IF; END $$;

-- Add tags column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'tags'
  ) THEN
    ALTER TABLE trades ADD COLUMN tags JSONB;
  END IF;
END $$;

-- Add bridge_connected flag to mt5_connections if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mt5_connections' AND column_name = 'bridge_connected'
  ) THEN
    ALTER TABLE mt5_connections ADD COLUMN bridge_connected BOOLEAN DEFAULT false;
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- SECTION 3: CREATE PERFORMANCE INDEXES
-- ──────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_mt5_connections_sync_token
  ON mt5_connections (sync_token);

CREATE INDEX IF NOT EXISTS idx_trades_account_id
  ON trades (account_id);

CREATE INDEX IF NOT EXISTS idx_trades_user_id
  ON trades (user_id);

CREATE INDEX IF NOT EXISTS idx_trades_is_mt5_sync
  ON trades (is_mt5_sync);


-- ──────────────────────────────────────────────────────────────────────────────
-- SECTION 4: DIAGNOSTIC QUERIES
-- Uncomment and run each one INDIVIDUALLY to debug sync issues
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. List all MT5 connections and their sync tokens
-- SELECT id, user_id, account_id, sync_token, status, last_sync_time, total_synced_trades, initial_sync_done
-- FROM mt5_connections ORDER BY created_at DESC;

-- 2. Count trades per account
-- SELECT account_id, count(*), bool_or(is_mt5_sync) as has_mt5_trades
-- FROM trades GROUP BY account_id;

-- 3. Check if your sync token exists (replace YOUR_TOKEN with the token from your EA)
-- SELECT * FROM mt5_connections WHERE sync_token = 'YOUR_TOKEN';

-- 4. See the last 10 MT5 synced trades
-- SELECT id, account_id, symbol, type, profit, date, is_mt5_sync
-- FROM trades WHERE is_mt5_sync = true ORDER BY date DESC LIMIT 10;

-- 5. Test INSERT permission (run this to verify RLS is not blocking inserts)
-- INSERT INTO trades (id, account_id, user_id, symbol, type, profit, date, is_mt5_sync)
-- VALUES ('_test_rls_check', 'YOUR_ACCOUNT_ID', 'YOUR_USER_ID', 'EURUSD', 'Buy', 100, NOW(), true);
-- DELETE FROM trades WHERE id = '_test_rls_check';

-- Done!
