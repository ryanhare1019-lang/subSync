import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

function todayUTC() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD in UTC
}

function tomorrowUTC() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { services, replace = false } = await req.json() as { services: string[]; replace?: boolean };
  if (!Array.isArray(services) || services.length === 0) {
    return NextResponse.json({ error: 'services array required' }, { status: 400 });
  }

  const today = todayUTC();
  const tomorrow = tomorrowUTC();

  if (replace) {
    await supabase
      .from('activity_log')
      .delete()
      .eq('user_id', user.id)
      .eq('source', 'checkin')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${tomorrow}T00:00:00Z`);
  }

  // Insert activity_log rows — surface error if tables don't exist
  const { error: insertError } = await supabase.from('activity_log').insert(
    services.map(service_name => ({
      user_id: user.id,
      service_name,
      activity_type: 'checkin',
      source: 'checkin',
    }))
  );

  if (insertError) {
    console.error('[checkin] activity_log insert failed:', insertError.message);
    return NextResponse.json(
      { error: `Database error: ${insertError.message}. Have you run the spending dashboard migrations in Supabase?` },
      { status: 500 }
    );
  }

  // Fetch current streak record
  const { data: streakData, error: streakReadError } = await supabase
    .from('checkin_streaks')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (streakReadError && streakReadError.code !== 'PGRST116') {
    // PGRST116 = "no rows returned" — that's fine for a first-time user
    console.error('[checkin] checkin_streaks read failed:', streakReadError.message);
    return NextResponse.json(
      { error: `Database error: ${streakReadError.message}. Have you run the spending dashboard migrations?` },
      { status: 500 }
    );
  }

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let current_streak = 1;
  let longest_streak = 1;

  if (streakData) {
    const last = streakData.last_checkin_date;
    current_streak = streakData.current_streak ?? 0;
    longest_streak = streakData.longest_streak ?? 0;

    if (last === today) {
      // Already checked in today (e.g. re-editing) — streak unchanged
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

    const { error: updateError } = await supabase.from('checkin_streaks').update({
      current_streak,
      longest_streak,
      last_checkin_date: today,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);

    if (updateError) console.error('[checkin] streak update failed:', updateError.message);
  } else {
    // First check-in ever
    const { error: createError } = await supabase.from('checkin_streaks').insert({
      user_id: user.id,
      current_streak: 1,
      longest_streak: 1,
      last_checkin_date: today,
    });
    if (createError) console.error('[checkin] streak insert failed:', createError.message);
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
