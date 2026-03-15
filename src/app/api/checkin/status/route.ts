import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

function todayUTC() {
  return new Date().toISOString().split('T')[0];
}

function tomorrowUTC() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = todayUTC();
  const tomorrow = tomorrowUTC();

  const [streakRes, todayActivityRes] = await Promise.all([
    supabase.from('checkin_streaks').select('*').eq('user_id', user.id).single(),
    supabase
      .from('activity_log')
      .select('service_name')
      .eq('user_id', user.id)
      .eq('source', 'checkin')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${tomorrow}T00:00:00Z`),
  ]);

  // Surface table-missing errors so the UI can show a helpful message
  if (streakRes.error && streakRes.error.code !== 'PGRST116') {
    console.error('[checkin/status] checkin_streaks error:', streakRes.error.message);
    return NextResponse.json({ error: streakRes.error.message, tables_missing: true }, { status: 500 });
  }
  if (todayActivityRes.error) {
    console.error('[checkin/status] activity_log error:', todayActivityRes.error.message);
    return NextResponse.json({ error: todayActivityRes.error.message, tables_missing: true }, { status: 500 });
  }

  const streak = streakRes.data;
  const todayServices = [...new Set((todayActivityRes.data || []).map(a => a.service_name))];

  // Use activity_log as the source of truth for "checked in today" —
  // this is resilient even if the streak row failed to save
  const checkedInToday =
    todayServices.length > 0 || streak?.last_checkin_date === today;

  // Streak broke if last check-in wasn't today or yesterday (and there was a prior streak)
  let brokStreak = false;
  if (streak?.last_checkin_date && !checkedInToday) {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    brokStreak = streak.last_checkin_date !== yesterdayStr && (streak.current_streak ?? 0) > 1;
  }

  return NextResponse.json({
    checked_in_today: checkedInToday,
    today_services: todayServices,
    current_streak: streak?.current_streak ?? 0,
    longest_streak: streak?.longest_streak ?? 0,
    broke_streak: brokStreak,
    previous_streak: brokStreak ? (streak?.current_streak ?? 0) : null,
  });
}
