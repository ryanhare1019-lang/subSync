import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tmdb_id, title, media_type, feedback } = await req.json();
  if (!tmdb_id || !title || !media_type || !feedback) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { error } = await supabase.from('browse_feedback').upsert(
    { user_id: user.id, tmdb_id, title, media_type, feedback },
    { onConflict: 'user_id,tmdb_id,media_type' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
