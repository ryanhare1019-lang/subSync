import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('service_name, monthly_cost, billing_cycle')
    .eq('user_id', user.id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ message: 'No subscriptions to snapshot' });
  }

  const service_breakdown = subs.map(s => ({
    service_name: s.service_name,
    cost: s.billing_cycle === 'annual' ? s.monthly_cost / 12 : s.monthly_cost,
  }));

  const total_monthly = service_breakdown.reduce((sum, s) => sum + s.cost, 0);

  const { data, error } = await supabase
    .from('spending_snapshots')
    .upsert({
      user_id: user.id,
      month: currentMonth,
      total_monthly: Math.round(total_monthly * 100) / 100,
      service_breakdown,
    }, { onConflict: 'user_id,month' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
