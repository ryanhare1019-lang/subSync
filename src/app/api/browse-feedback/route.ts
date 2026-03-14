import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tmdb_id, media_type, title, poster_url, feedback } = await req.json();

  // Store as a recommendation record so it informs Claude's future picks
  const feedbackMap: Record<string, string> = {
    thumbs_up: 'loved',
    thumbs_down: 'not_interested',
    unsure: 'watched', // neutral signal
  };

  // Check if we already have this tmdb_id for this user
  const { data: existing } = await supabase
    .from('recommendations')
    .select('id')
    .eq('user_id', user.id)
    .eq('tmdb_id', tmdb_id)
    .maybeSingle();

  let error;
  if (existing) {
    ({ error } = await supabase
      .from('recommendations')
      .update({ user_feedback: feedbackMap[feedback] || null })
      .eq('id', existing.id));
  } else {
    ({ error } = await supabase.from('recommendations').insert({
      user_id: user.id,
      title,
      media_type,
      service_name: null,
      tmdb_id,
      poster_url: poster_url || null,
      ai_reason: 'Rated from browse page',
      user_feedback: feedbackMap[feedback] || null,
    }));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
