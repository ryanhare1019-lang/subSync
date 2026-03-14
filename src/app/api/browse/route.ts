import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { discoverByServices } from '@/lib/tmdb';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const type = (req.nextUrl.searchParams.get('type') || 'movie') as 'movie' | 'tv';
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('service_name')
    .eq('user_id', user.id);

  const serviceNames = (subs || []).map(s => s.service_name);
  const results = await discoverByServices(serviceNames, type, page);

  return NextResponse.json({ results, serviceNames });
}
