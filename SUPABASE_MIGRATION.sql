-- ============================================================
-- PERIOD TRACKER - CLEAN DATABASE SETUP
-- Drops existing tables and recreates them fresh
-- ============================================================

-- Remove existing triggers first
DROP TRIGGER IF EXISTS update_period_entries_updated_at ON period_entries;
DROP TRIGGER IF EXISTS update_monthly_insights_updated_at ON monthly_insights;

-- Drop existing tables
DROP TABLE IF EXISTS period_entries CASCADE;
DROP TABLE IF EXISTS monthly_insights CASCADE;

-- Drop the helper function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 1. Create period_entries table
CREATE TABLE period_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz,
  status text DEFAULT 'active',
  flow text,
  symptoms text[],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ended_by timestamptz
);

-- 2. Create monthly_insights table
CREATE TABLE monthly_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL UNIQUE,
  insight_json jsonb,
  generated_at timestamptz DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_period_entries_status ON period_entries(status);
CREATE INDEX idx_period_entries_start ON period_entries(start_datetime DESC);
CREATE INDEX idx_monthly_insights_month ON monthly_insights(month);

-- 4. Enable RLS
ALTER TABLE period_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_insights ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "allow_select_period_entries" ON period_entries FOR SELECT USING (true);
CREATE POLICY "allow_insert_period_entries" ON period_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_period_entries" ON period_entries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_period_entries" ON period_entries FOR DELETE USING (true);

CREATE POLICY "allow_select_monthly_insights" ON monthly_insights FOR SELECT USING (true);
CREATE POLICY "allow_insert_monthly_insights" ON monthly_insights FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_monthly_insights" ON monthly_insights FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_monthly_insights" ON monthly_insights FOR DELETE USING (true);

-- 6. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE period_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_insights;

-- 7. Auto-update trigger function
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_period_entries_updated_at
  BEFORE UPDATE ON period_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_insights_updated_at
  BEFORE UPDATE ON monthly_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DONE! Database is ready.
-- ============================================================
