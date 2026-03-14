import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { discoverByServices, discoverByGenres } from '@/lib/tmdb';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const type = (req.nextUrl.searchParams.get('type') || 'movie') as 'movie' | 'tv';
  const mode = req.nextUrl.searchParams.get('mode') || 'genres'; // 'genres' | 'flat'
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const sortBy = req.nextUrl.searchParams.get('sort') || 'popularity.desc';

  const { data: subs } = await supabase.from('subscriptions').select('service_name').eq('user_id', user.id);
  const serviceNames = (subs || []).map(s => s.service_name);

  if (mode === 'genres') {
    const genres = await discoverByGenres(serviceNames, type, sortBy);
    return NextResponse.json({ genres, serviceNames });
  } else {
    const results = await discoverByServices(serviceNames, type, page, sortBy);
    return NextResponse.json({ results, serviceNames });
  }
}
