-- ==============================================================================
-- QUICK-FIX: Update RLS Policies (No data loss - safe to run on existing DB)
-- ==============================================================================
-- Run this in your Supabase SQL Editor → https://supabase.com/dashboard
-- Project: nezbikvhycsqnhyrbmua → SQL Editor → New Query → Paste & Run
--
-- WHY: The server uses the anon/publishable Supabase key WITHOUT Supabase Auth JWT.
-- This means auth.uid() is always NULL, so old policies blocked ALL server operations.
-- New policies allow the 'anon' role full access. User isolation is enforced
-- by the server via x-auth-user-id / x-auth-email headers (app-level auth).

-- ── users ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage their own data" ON users;
DROP POLICY IF EXISTS "Allow anon full access on users" ON users;
DROP POLICY IF EXISTS "Allow authenticated full access on users" ON users;

CREATE POLICY "Allow anon full access on users"
  ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on users"
  ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── trading_accounts ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage their own accounts" ON trading_accounts;
DROP POLICY IF EXISTS "Allow anon full access on trading_accounts" ON trading_accounts;
DROP POLICY IF EXISTS "Allow authenticated full access on trading_accounts" ON trading_accounts;

CREATE POLICY "Allow anon full access on trading_accounts"
  ON trading_accounts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on trading_accounts"
  ON trading_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── trades ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage their own trades" ON trades;
DROP POLICY IF EXISTS "Allow anon full access on trades" ON trades;
DROP POLICY IF EXISTS "Allow authenticated full access on trades" ON trades;

CREATE POLICY "Allow anon full access on trades"
  ON trades FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on trades"
  ON trades FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── risk_settings ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage their own risk settings" ON risk_settings;
DROP POLICY IF EXISTS "Allow anon full access on risk_settings" ON risk_settings;
DROP POLICY IF EXISTS "Allow authenticated full access on risk_settings" ON risk_settings;

CREATE POLICY "Allow anon full access on risk_settings"
  ON risk_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on risk_settings"
  ON risk_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── support_tickets ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage their own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Allow anon full access on support_tickets" ON support_tickets;
DROP POLICY IF EXISTS "Allow authenticated full access on support_tickets" ON support_tickets;

CREATE POLICY "Allow anon full access on support_tickets"
  ON support_tickets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on support_tickets"
  ON support_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── mt5_connections ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage their own MT5 connections" ON mt5_connections;
DROP POLICY IF EXISTS "Allow anon full access on mt5_connections" ON mt5_connections;
DROP POLICY IF EXISTS "Allow authenticated full access on mt5_connections" ON mt5_connections;

CREATE POLICY "Allow anon full access on mt5_connections"
  ON mt5_connections FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on mt5_connections"
  ON mt5_connections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Done! Now run your app and test account/trade creation.
