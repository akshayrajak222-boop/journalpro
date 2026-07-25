-- Run this in your Supabase SQL Editor
-- It adds the missing columns to mt5_connections that cause the EA connection to fail to save.

ALTER TABLE mt5_connections 
ADD COLUMN IF NOT EXISTS history_months INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS initial_sync_done BOOLEAN DEFAULT false;
