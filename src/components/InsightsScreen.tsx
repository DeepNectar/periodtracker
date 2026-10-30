import { PeriodEntry } from '../lib/supabase';
import { useMonthlyInsights } from '../hooks/usePeriodData';
import { format, parseISO } from 'date-fns';
import { TrendingUp, Calendar, Heart, Brain, Sparkles } from 'lucide-react';

type Props = {
  entries: PeriodEntry[];
};

export function InsightsScreen({ entries }: Props) {
  const { insight, loading } = useMonthlyInsights(entries);
  const data = insight?.insight_json;

  if (loading) {
    return (
      <div className="px-4 pb-24 pt-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Insights</h1>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full" />
        </div>
      </div>
    );
  }

  if (!data || entries.length === 0) {
    return (
      <div className="px-4 pb-24 pt-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Insights</h1>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-6xl mb-4">🔮</div>
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">No Insights Yet</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 text-center max-w-[250px]">
            Track a few cycles to unlock personalized insights and predictions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-6">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Insights</h1>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
        Auto-generated for {insight?.month ? format(parseISO(insight.month + '-01'), 'MMMM yyyy') : 'this month'}
      </p>

      {/* Personalized Message */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-100 dark:border-purple-900/30 mb-4">
        <div className="flex items-start gap-3">
          <Sparkles size={20} className="text-purple-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            {data.message}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
          <Calendar size={18} className="text-pink-400 mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.avgCycleLength || '—'}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Avg Cycle Length (days)</p>
        </div>
        <div className="rounded-2xl p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
          <Heart size={18} className="text-rose-400 mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.avgPeriodDuration || '—'}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Avg Period Duration (days)</p>
        </div>
      </div>

      {/* Next Predictions */}
      {data.nextPredictions && data.nextPredictions.length > 0 && (
        <div className="rounded-2xl p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Calendar size={14} className="text-pink-400" /> Next Predicted Periods
          </h3>
          <div className="space-y-2">
            {data.nextPredictions.map((pred: string, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-pink-50 dark:bg-pink-950/20">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {i === 0 ? 'Next' : i === 1 ? 'Following' : 'After that'}
                </span>
                <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">
                  {format(parseISO(pred), 'd MMM yyyy')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend */}
      {data.trend && (
        <div className="rounded-2xl p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
            <TrendingUp size={14} className="text-purple-400" /> Cycle Trend
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">{data.trend}</p>
        </div>
      )}

      {/* Common Symptoms */}
      {data.commonSymptoms && data.commonSymptoms.length > 0 && (
        <div className="rounded-2xl p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Brain size={14} className="text-purple-400" /> Most Common Symptoms
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.commonSymptoms.map((s: string) => (
              <span key={s} className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="mt-6 text-center">
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          Insights auto-regenerate monthly based on your tracked data.
        </p>
      </div>
    </div>
  );
}
