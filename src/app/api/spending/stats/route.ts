import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // Fetch all data in parallel
  const [subsRes, snapshotsRes, activityRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('service_name, monthly_cost, billing_cycle, service_type')
      .eq('user_id', user.id),
    supabase
      .from('spending_snapshots')
      .select('month, total_monthly, service_breakdown')
      .eq('user_id', user.id)
      .order('month', { ascending: false })
      .limit(13),
    supabase
      .from('activity_log')
      .select('service_name, activity_type, source, created_at')
      .eq('user_id', user.id)
      .gte('created_at', `${currentMonthStart}T00:00:00`),
  ]);

  const subs = subsRes.data || [];
  const snapshots = snapshotsRes.data || [];
  const activity = activityRes.data || [];

  // Current month totals
  const costPerService = subs.map(s => ({
    service_name: s.service_name,
    monthly_cost: s.billing_cycle === 'annual'
      ? Math.round((s.monthly_cost / 12) * 100) / 100
      : s.monthly_cost,
    billing_cycle: s.billing_cycle,
    service_type: s.service_type,
  }));

  const currentMonthTotal = costPerService.reduce((sum, s) => sum + s.monthly_cost, 0);
  const roundedTotal = Math.round(currentMonthTotal * 100) / 100;

  // Year total: annualize each subscription correctly
  const yearTotal = subs.reduce((sum, s) => {
    return sum + (s.billing_cycle === 'annual' ? s.monthly_cost : s.monthly_cost * 12);
  }, 0);

  // Previous month total from snapshots
  const prevSnapshot = snapshots.find(s => {
    const d = new Date(s.month);
    return d.getFullYear() === (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()) &&
      d.getMonth() === (now.getMonth() === 0 ? 11 : now.getMonth() - 1);
  });
  const previousMonthTotal = prevSnapshot?.total_monthly ?? null;
  const monthOverMonthChange = previousMonthTotal !== null
    ? Math.round(((roundedTotal - previousMonthTotal) / previousMonthTotal) * 100 * 10) / 10
    : null;

  // Cost-per-use: count activity_log entries per service this month
  const usageCounts: Record<string, number> = {};
  for (const row of activity) {
    usageCounts[row.service_name] = (usageCounts[row.service_name] ?? 0) + 1;
  }

  const costPerUse = costPerService.map(s => {
    const activity_count = usageCounts[s.service_name] ?? 0;
    return {
      service_name: s.service_name,
      monthly_cost: s.monthly_cost,
      activity_count,
      cost_per_use: activity_count > 0
        ? Math.round((s.monthly_cost / activity_count) * 100) / 100
        : null,
    };
  }).sort((a, b) => {
    // Unused services last, then sort by cost_per_use ascending
    if (a.cost_per_use === null && b.cost_per_use === null) return b.monthly_cost - a.monthly_cost;
    if (a.cost_per_use === null) return 1;
    if (b.cost_per_use === null) return -1;
    return a.cost_per_use - b.cost_per_use;
  });

  // Cost breakdown with percentages
  const costPerServiceWithPct = costPerService.map(s => ({
    ...s,
    percentage_of_total: roundedTotal > 0
      ? Math.round((s.monthly_cost / roundedTotal) * 1000) / 10
      : 0,
  }));

  // Spending history for chart (up to 12 months)
  const spendingHistory = snapshots
    .slice(0, 12)
    .map(s => ({
      month: s.month,
      total: Number(s.total_monthly),
    }))
    .reverse();

  // Most expensive service
  const mostExpensive = costPerService.reduce((max, s) =>
    s.monthly_cost > (max?.monthly_cost ?? 0) ? s : max, costPerService[0] ?? null
  );

  // Least used relative to cost (biggest waste)
  const leastUsed = costPerUse.find(s => s.cost_per_use === null) ??
    costPerUse.reduce((worst, s) => {
      if (!s.cost_per_use) return worst;
      if (!worst?.cost_per_use) return s;
      return s.cost_per_use > worst.cost_per_use ? s : worst;
    }, null as typeof costPerUse[0] | null);

  // Best value (lowest cost per use, must have at least 1 use)
  const bestValue = costPerUse
    .filter(s => s.cost_per_use !== null && s.cost_per_use > 0)
    .sort((a, b) => (a.cost_per_use ?? Infinity) - (b.cost_per_use ?? Infinity))[0] ?? null;

  return NextResponse.json({
    currentMonthTotal: roundedTotal,
    previousMonthTotal,
    monthOverMonthChange,
    yearTotal: Math.round(yearTotal * 100) / 100,
    costPerService: costPerServiceWithPct,
    costPerUse,
    spendingHistory,
    mostExpensive,
    leastUsed,
    bestValue,
    activeServiceCount: subs.length,
  });
}
