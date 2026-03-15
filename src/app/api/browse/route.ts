import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { discoverByServices, discoverByGenres } from '@/lib/tmdb';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const type = (req.nextUrl.searchParams.get('type') || 'movie') as 'movie' | 'tv';
  const mode = req.nextUrl.searchParams.get('mode') || 'genres';
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const sortBy = req.nextUrl.searchParams.get('sort') || 'popularity.desc';
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '15');

  const [subsResult, tasteResult] = await Promise.all([
    supabase.from('subscriptions').select('service_name').eq('user_id', user.id),
    supabase.from('taste_profiles').select('disliked_genres').eq('user_id', user.id).maybeSingle(),
  ]);

  const serviceNames = (subsResult.data || []).map(s => s.service_name);
  const dislikedGenres: string[] = tasteResult.data?.disliked_genres || [];

  if (mode === 'genres') {
    const genres = await discoverByGenres(serviceNames, type, sortBy, dislikedGenres, offset, limit);
    return NextResponse.json({ genres, serviceNames });
  } else {
    const results = await discoverByServices(serviceNames, type, page, sortBy);
    return NextResponse.json({ results, serviceNames });
  }
}
