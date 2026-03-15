'use client';

import { TrendingUp, TrendingDown, Minus, DollarSign, Calendar, Layers, Zap } from 'lucide-react';

interface SpendingStats {
  currentMonthTotal: number;
  previousMonthTotal: number | null;
  monthOverMonthChange: number | null;
  yearTotal: number;
  activeServiceCount: number;
  bestValue: { service_name: string; cost_per_use: number } | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  badge?: { text: string; positive: boolean };
}

function StatCard({ label, value, sub, icon, badge }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-all hover:scale-[1.01]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none mb-1">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {badge && (
          <span className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md ${
            badge.positive
              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
              : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10'
          }`}>
            {badge.positive ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
            {badge.text}
          </span>
        )}
        {sub && <span className="text-xs text-gray-500 dark:text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}

export function SpendingStatCards({ stats }: { stats: SpendingStats }) {
  const change = stats.monthOverMonthChange;
  const changeAbs = change !== null ? Math.abs(change) : null;
  const prevDiff = stats.previousMonthTotal !== null
    ? Math.abs(stats.currentMonthTotal - stats.previousMonthTotal)
    : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatCard
        label="Monthly Total"
        value={fmt(stats.currentMonthTotal)}
        icon={<DollarSign size={14} />}
        badge={changeAbs !== null && prevDiff !== null ? {
          text: `${change! < 0 ? '↓' : '↑'} ${fmt(prevDiff)}`,
          positive: change! <= 0,
        } : undefined}
        sub={changeAbs === null ? 'from last month' : undefined}
      />
      <StatCard
        label="Annual Projection"
        value={fmt(stats.yearTotal)}
        icon={<Calendar size={14} />}
        sub="projected"
      />
      <StatCard
        label="Active Services"
        value={`${stats.activeServiceCount}`}
        icon={<Layers size={14} />}
        sub={stats.activeServiceCount === 1 ? 'service' : 'services'}
      />
      <StatCard
        label="Best Value"
        icon={<Zap size={14} />}
        value={stats.bestValue ? `${fmt(stats.bestValue.cost_per_use)}/use` : '—'}
        sub={stats.bestValue?.service_name ?? 'No activity yet'}
      />
    </div>
  );
}
