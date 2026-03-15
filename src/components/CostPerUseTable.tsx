'use client';

interface CostPerUseRow {
  service_name: string;
  monthly_cost: number;
  activity_count: number;
  cost_per_use: number | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function ValueBadge({ costPerUse, count }: { costPerUse: number | null; count: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
        🔴 Unused
      </span>
    );
  }
  if (costPerUse === null) return null;
  if (costPerUse < 2) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
        🟢 Great value
      </span>
    );
  }
  if (costPerUse <= 5) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
        🟡 Fair value
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
      🔴 Low use
    </span>
  );
}

export function CostPerUseTable({ rows }: { rows: CostPerUseRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cost Per Use</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Ranked by value — how efficiently you're using each service</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-2.5">Service</th>
              <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2.5">Monthly</th>
              <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2.5">Uses</th>
              <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2.5">Per Use</th>
              <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-2.5">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {rows.map((row, i) => (
              <tr
                key={row.service_name}
                className={`transition-colors ${row.activity_count === 0 ? 'bg-red-50/40 dark:bg-red-500/5' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
              >
                <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    {row.service_name}
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-gray-600 dark:text-gray-300">{fmt(row.monthly_cost)}</td>
                <td className="px-3 py-3 text-right text-gray-600 dark:text-gray-300">{row.activity_count}</td>
                <td className="px-3 py-3 text-right font-medium text-gray-900 dark:text-white">
                  {row.cost_per_use !== null ? fmt(row.cost_per_use) : '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  <ValueBadge costPerUse={row.cost_per_use} count={row.activity_count} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Based on your check-ins and recommendation activity. Check in daily for more accurate results.
        </p>
      </div>
    </div>
  );
}
