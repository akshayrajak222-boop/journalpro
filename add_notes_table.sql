-- Table: notes
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  date TIMESTAMPTZ,
  folder TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_trash BOOLEAN DEFAULT false,
  linked_trade_id TEXT REFERENCES trades(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access on notes" ON notes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on notes" ON notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
