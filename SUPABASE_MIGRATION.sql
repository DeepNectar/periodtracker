-- ============================================================
-- PERIOD TRACKER - SUPABASE DATABASE MIGRATION
-- Run this entire SQL in your Supabase SQL Editor
-- ============================================================

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
  month text NOT NULL UNIQUE,
  insight_json jsonb,
  generated_at timestamptz DEFAULT now()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_period_entries_status ON period_entries(status);
CREATE INDEX IF NOT EXISTS idx_period_entries_start ON period_entries(start_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_insights_month ON monthly_insights(month);

-- 4. Enable Row Level Security
ALTER TABLE period_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_insights ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Allow all operations for this private app
DROP POLICY IF EXISTS "allow_select_period_entries" ON period_entries;
DROP POLICY IF EXISTS "allow_insert_period_entries" ON period_entries;
DROP POLICY IF EXISTS "allow_update_period_entries" ON period_entries;
DROP POLICY IF EXISTS "allow_delete_period_entries" ON period_entries;

CREATE POLICY "allow_select_period_entries" ON period_entries
  FOR SELECT USING (true);

CREATE POLICY "allow_insert_period_entries" ON period_entries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_update_period_entries" ON period_entries
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "allow_delete_period_entries" ON period_entries
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "allow_select_monthly_insights" ON monthly_insights;
DROP POLICY IF EXISTS "allow_insert_monthly_insights" ON monthly_insights;
DROP POLICY IF EXISTS "allow_update_monthly_insights" ON monthly_insights;
DROP POLICY IF EXISTS "allow_delete_monthly_insights" ON monthly_insights;

CREATE POLICY "allow_select_monthly_insights" ON monthly_insights
  FOR SELECT USING (true);

CREATE POLICY "allow_insert_monthly_insights" ON monthly_insights
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_update_monthly_insights" ON monthly_insights
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "allow_delete_monthly_insights" ON monthly_insights
  FOR DELETE USING (true);

-- 6. Enable Realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE period_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_insights;

-- 7. Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_period_entries_updated_at ON period_entries;
CREATE TRIGGER update_period_entries_updated_at
  BEFORE UPDATE ON period_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_insights_updated_at ON monthly_insights;
CREATE TRIGGER update_monthly_insights_updated_at
  BEFORE UPDATE ON monthly_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DONE! Your Period Tracker database is ready.
-- ============================================================
