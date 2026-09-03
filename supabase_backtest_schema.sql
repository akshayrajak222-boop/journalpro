-- ==============================================================================
-- SUPABASE BACKTEST RELATIONAL SCHEMA MIGRATION SCRIPT
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: backtest_sessions
CREATE TABLE IF NOT EXISTS backtest_sessions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '1d',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  starting_balance FLOAT NOT NULL,
  settings JSONB,
  results JSONB,
  equity_curve JSONB,
  status TEXT DEFAULT 'draft',
  strategy_name TEXT DEFAULT 'manual',
  strategy_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE backtest_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own sessions" ON backtest_sessions
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Auth users see own sessions" ON backtest_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Table: backtest_trades
CREATE TABLE IF NOT EXISTS backtest_trades (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  session_id TEXT REFERENCES backtest_sessions(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  trade_number INTEGER,
  entry_time TIMESTAMPTZ,
  exit_time TIMESTAMPTZ,
  symbol TEXT,
  direction TEXT,
  entry_price FLOAT,
  exit_price FLOAT,
  stop_loss FLOAT,
  take_profit FLOAT,
  lot_size FLOAT,
  risk_amount FLOAT,
  profit FLOAT,
  commission FLOAT,
  spread_cost FLOAT,
  slippage_cost FLOAT,
  result TEXT,
  r_multiple FLOAT,
  balance_after FLOAT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE backtest_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own trades" ON backtest_trades
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Auth users see own trades" ON backtest_trades
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
