import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pxnaqqjhubraemjpoour.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bmFxcWpodWJyYWVtanBvb3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMzk0NDksImV4cCI6MjEwODkxNTQ0OX0.Sw5VKBLSTwC8drw3WgFo4IpH3xZ1uFhwgfXYHd5gacQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export type PeriodEntry = {
  id: string;
  start_datetime: string;
  end_datetime: string | null;
  status: 'active' | 'completed';
  flow: 'Light' | 'Medium' | 'Heavy' | null;
  symptoms: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  ended_by: string | null;
};

export type MonthlyInsight = {
  id: string;
  month: string;
  insight_json: Record<string, any>;
  generated_at: string;
};
