import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { service_name, activity_type, title, source = 'rec_feedback' } = await req.json();

  if (!service_name || !activity_type) {
    return NextResponse.json({ error: 'service_name and activity_type required' }, { status: 400 });
  }

  const { data, error } = await supabase.from('activity_log').insert({
    user_id: user.id,
    service_name,
    activity_type,
    source,
    title: title || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
