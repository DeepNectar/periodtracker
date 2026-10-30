-- ═══════════════════════════════════════════════════════════
-- PERIOD TRACKER - SUPABASE DATABASE MIGRATION
-- Run this SQL in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Create period_entries table
CREATE TABLE IF NOT EXISTS period_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  flow text CHECK (flow IN ('Light', 'Medium', 'Heavy')),
  symptoms text[],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ended_by timestamptz
);

-- 2. Create monthly_insights table
CREATE TABLE IF NOT EXISTS monthly_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  insight_json jsonb,
  generated_at timestamptz DEFAULT now(),
  UNIQUE(month)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_period_entries_status ON period_entries(status);
CREATE INDEX IF NOT EXISTS idx_period_entries_start ON period_entries(start_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_insights_month ON monthly_insights(month);

-- 4. Enable Row Level Security
ALTER TABLE period_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_insights ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Allow all operations for this private app
-- (Since this is a single-user private app with anon key only)
DROP POLICY IF EXISTS "Allow all read period_entries" ON period_entries;
DROP POLICY IF EXISTS "Allow all insert period_entries" ON period_entries;
DROP POLICY IF EXISTS "Allow all update period_entries" ON period_entries;
DROP POLICY IF EXISTS "Allow all delete period_entries" ON period_entries;

CREATE POLICY "Allow all read period_entries" ON period_entries
  FOR SELECT USING (true);

CREATE POLICY "Allow all insert period_entries" ON period_entries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all update period_entries" ON period_entries
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all delete period_entries" ON period_entries
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow all read monthly_insights" ON monthly_insights;
DROP POLICY IF EXISTS "Allow all insert monthly_insights" ON monthly_insights;
DROP POLICY IF EXISTS "Allow all update monthly_insights" ON monthly_insights;
DROP POLICY IF EXISTS "Allow all delete monthly_insights" ON monthly_insights;

CREATE POLICY "Allow all read monthly_insights" ON monthly_insights
  FOR SELECT USING (true);

CREATE POLICY "Allow all insert monthly_insights" ON monthly_insights
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all update monthly_insights" ON monthly_insights
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all delete monthly_insights" ON monthly_insights
  FOR DELETE USING (true);

-- 6. Enable Realtime for both tables
-- This allows the app to receive live updates across devices
ALTER PUBLICATION supabase_realtime ADD TABLE period_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_insights;

-- 7. Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_period_entries_updated_at ON period_entries;
CREATE TRIGGER update_period_entries_updated_at
  BEFORE UPDATE ON period_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════
-- DONE! Your Period Tracker database is ready.
-- The app will now sync data across all your devices in real-time.
-- ═══════════════════════════════════════════════════════════
