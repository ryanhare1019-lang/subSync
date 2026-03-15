import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { services, replace = false } = await req.json() as { services: string[]; replace?: boolean };
  if (!Array.isArray(services) || services.length === 0) {
    return NextResponse.json({ error: 'services array required' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];

  if (replace) {
    // Delete all of today's check-in entries and re-insert the new set
    await supabase
      .from('activity_log')
      .delete()
      .eq('user_id', user.id)
      .eq('source', 'checkin')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);
  }

  // Insert activity_log rows for each service
  await supabase.from('activity_log').insert(
    services.map(service_name => ({
      user_id: user.id,
      service_name,
      activity_type: 'checkin',
      source: 'checkin',
    }))
  );

  // Fetch current streak record
  const { data: streakData } = await supabase
    .from('checkin_streaks')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let current_streak = 1;
  let longest_streak = 1;

  if (streakData) {
    const last = streakData.last_checkin_date;
    current_streak = streakData.current_streak ?? 0;
    longest_streak = streakData.longest_streak ?? 0;

    if (last === today) {
      // Already checked in today — no streak change, just log activities
      return NextResponse.json({
        current_streak,
        longest_streak,
        services_logged: services.length,
        already_checked_in: true,
      });
    } else if (last === yesterdayStr) {
      current_streak = current_streak + 1;
    } else {
      current_streak = 1;
    }

    if (current_streak > longest_streak) longest_streak = current_streak;

    await supabase.from('checkin_streaks').update({
      current_streak,
      longest_streak,
      last_checkin_date: today,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);
  } else {
    // First check-in ever
    await supabase.from('checkin_streaks').insert({
      user_id: user.id,
      current_streak: 1,
      longest_streak: 1,
      last_checkin_date: today,
    });
    current_streak = 1;
    longest_streak = 1;
  }

  return NextResponse.json({
    current_streak,
    longest_streak,
    services_logged: services.length,
    already_checked_in: false,
  });
}
