import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().split('T')[0];

  const [streakRes, todayActivityRes] = await Promise.all([
    supabase.from('checkin_streaks').select('*').eq('user_id', user.id).single(),
    supabase
      .from('activity_log')
      .select('service_name')
      .eq('user_id', user.id)
      .eq('source', 'checkin')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`),
  ]);

  const streak = streakRes.data;
  const checkedInToday = streak?.last_checkin_date === today;
  const todayServices = [...new Set((todayActivityRes.data || []).map(a => a.service_name))];

  // Determine if user broke a streak (missed yesterday)
  let brokStreak = false;
  if (streak?.last_checkin_date && !checkedInToday) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
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
