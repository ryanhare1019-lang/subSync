import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { PROVIDER_IDS } from '@/lib/tmdb';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const API_KEY = process.env.TMDB_API_KEY;
  if (!API_KEY) return NextResponse.json(null);

  const [lovedResult, subsResult] = await Promise.all([
    supabase.from('recommendations').select('title, tmdb_id, media_type').eq('user_id', user.id).eq('user_feedback', 'loved').not('tmdb_id', 'is', null).limit(20),
    supabase.from('subscriptions').select('service_name').eq('user_id', user.id),
  ]);

  const loved = lovedResult.data || [];
  if (loved.length === 0) return NextResponse.json(null);

  const source = loved[Math.floor(Math.random() * loved.length)];
  const serviceNames = (subsResult.data || []).map((s: { service_name: string }) => s.service_name);
  const providerIds = serviceNames.map((n: string) => PROVIDER_IDS[n]).filter(Boolean);

  // Get genre IDs for the loved movie
  const type = (source.media_type === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv';
  const detailRes = await fetch(`${TMDB_BASE}/${type}/${source.tmdb_id}?api_key=${API_KEY}`);
  if (!detailRes.ok) return NextResponse.json(null);
  const detail = await detailRes.json();
  const genreIds: number[] = (detail.genres || []).map((g: { id: number }) => g.id);

  if (genreIds.length === 0 || providerIds.length === 0) return NextResponse.json(null);

  // Discover similar content on user's services
  const params = new URLSearchParams({
    api_key: API_KEY,
    with_watch_providers: providerIds.join('|'),
    watch_region: 'US',
    with_genres: genreIds.slice(0, 2).join('|'),
    sort_by: 'vote_average.desc',
    include_adult: 'false',
    'vote_count.gte': '100',
  });

  const discoverRes = await fetch(`${TMDB_BASE}/discover/${type}?${params}`);
  if (!discoverRes.ok) return NextResponse.json(null);
  const discoverData = await discoverRes.json();

  const results = (discoverData.results || [])
    .filter((r: { id: number }) => r.id !== source.tmdb_id)
    .slice(0, 12)
    .map((r: Record<string, unknown>) => ({
      id: r.id as number,
      title: (type === 'movie' ? r.title : r.name) as string,
      poster_url: r.poster_path ? `${TMDB_IMAGE_BASE}${r.poster_path}` : null,
      media_type: type,
      year: (type === 'movie' ? (r.release_date as string)?.split('-')[0] : (r.first_air_date as string)?.split('-')[0]) ?? null,
      rating: Math.round((r.vote_average as number) * 10) / 10,
      services: serviceNames.filter((n: string) => providerIds.includes(PROVIDER_IDS[n])),
    }));

  return NextResponse.json({ source: { title: source.title, tmdb_id: source.tmdb_id, media_type: source.media_type }, recommendations: results });
}
