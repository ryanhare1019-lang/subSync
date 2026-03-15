'use client';

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { SERVICE_COLORS } from '@/lib/constants';

const DEFAULT_COLOR = '#279AF1';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

interface ServiceCost {
  service_name: string;
  monthly_cost: number;
  percentage_of_total: number;
}

interface SpendingPoint {
  month: string; // YYYY-MM-DD
  total: number;
}

// ── Donut Chart ───────────────────────────────────────────────────────────────

interface DonutProps {
  data: ServiceCost[];
  totalMonthly: number;
}

export function SpendingDonut({ data, totalMonthly }: DonutProps) {
  if (data.length === 0) return null;

  const chartData = data.map(s => ({
    name: s.service_name,
    value: s.monthly_cost,
    color: SERVICE_COLORS[s.service_name] ?? DEFAULT_COLOR,
    pct: s.percentage_of_total,
  }));

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Spending Breakdown</h3>

      <div className="relative" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [fmt(Number(v)), 'Monthly']}
              contentStyle={{
                backgroundColor: 'var(--color-gray-900, #1c1b1e)',
                border: '1px solid var(--color-gray-700, #3b3e44)',
                borderRadius: 8,
                fontSize: 12,
                color: '#fff',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(totalMonthly)}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">/month</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-1.5">
        {chartData.map(item => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <span>{item.pct}%</span>
              <span className="font-medium text-gray-900 dark:text-white">{fmt(item.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Area (History) Chart ──────────────────────────────────────────────────────

interface HistoryProps {
  data: SpendingPoint[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(dateStr: string) {
  const d = new Date(dateStr);
  return MONTH_LABELS[d.getUTCMonth()];
}

export function SpendingHistory({ data }: HistoryProps) {
  const chartData = data.map(d => ({ month: monthLabel(d.month), total: d.total }));

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Spending Over Time</h3>

      {chartData.length < 2 ? (
        <div className="flex items-center justify-center h-[200px] text-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Your spending trends will appear here</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">after your first month of tracking</p>
          </div>
        </div>
      ) : (
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#279AF1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#279AF1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8a8d96' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8a8d96' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip
                formatter={(v) => [fmt(Number(v)), 'Total']}
                contentStyle={{
                  backgroundColor: 'var(--color-gray-900, #1c1b1e)',
                  border: '1px solid var(--color-gray-700, #3b3e44)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#fff',
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#279AF1"
                strokeWidth={2}
                fill="url(#spendGrad)"
                dot={{ r: 3, fill: '#279AF1', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
