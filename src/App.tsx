import { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { CalendarView } from './components/CalendarView';
import { InsightsScreen } from './components/InsightsScreen';
import { usePeriodData } from './hooks/usePeriodData';
import { Moon, Sun, RefreshCw, AlertCircle, Database } from 'lucide-react';

type Screen = 'home' | 'history' | 'calendar' | 'insights';

function AppContent() {
  const [screen, setScreen] = useState<Screen>('home');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { entries, loading, error, activeEntry, startPeriod, endPeriod, updateEntry, deleteEntry, refetch } = usePeriodData();
  const { showToast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    document.documentElement.classList.toggle('light', !newMode);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-pink-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-3 border-pink-200 border-t-pink-500 rounded-full mx-auto mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading your data...</p>
        </div>
      </div>
    );
  }

  if (error === 'TABLE_NOT_FOUND') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-pink-50 dark:bg-gray-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-pink-100 dark:border-gray-700">
          <div className="text-center mb-4">
            <Database size={40} className="mx-auto text-pink-400 mb-3" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Database Setup Required</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            The required database tables don't exist yet. Please run the following SQL in your Supabase SQL Editor:
          </p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 overflow-auto max-h-64 mb-4">
            <pre className="text-[10px] text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
{`-- Create period_entries table
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

-- Create monthly_insights table
CREATE TABLE monthly_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  insight_json jsonb,
  generated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE period_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_insights ENABLE ROW LEVEL SECURITY;

-- Allow all operations for this private app
CREATE POLICY "Allow all for anon" ON period_entries
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON monthly_insights
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE period_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_insights;`}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-xl bg-pink-400 text-white font-medium text-sm"
          >
            I've run the SQL — Reload App
          </button>
        </div>
      </div>
    );
  }

  if (error && error !== 'TABLE_NOT_FOUND') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-pink-50 dark:bg-gray-950 p-6">
        <div className="max-w-sm w-full bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg text-center">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Connection Error</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-medium text-center py-2 px-4">
          ⚠️ You're offline. Changes will sync when you reconnect.
        </div>
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-pink-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <h1 className="text-base font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            🌸 Period Tracker
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Toggle dark mode"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-lg mx-auto">
        {screen === 'home' && (
          <HomeScreen
            activeEntry={activeEntry}
            entries={entries}
            onStartPeriod={startPeriod}
          />
        )}
        {screen === 'history' && (
          <HistoryScreen
            entries={entries}
            onEndPeriod={endPeriod}
            onUpdateEntry={updateEntry}
            onDeleteEntry={deleteEntry}
          />
        )}
        {screen === 'calendar' && (
          <CalendarView entries={entries} />
        )}
        {screen === 'insights' && (
          <InsightsScreen entries={entries} />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav current={screen} onChange={setScreen} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
