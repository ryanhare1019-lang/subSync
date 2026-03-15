import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { PROVIDER_MAP } from '@/lib/constants';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

interface TMDBRaw {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
  genre_ids?: number[];
}

interface SwiperItem {
  tmdb_id: number;
  title: string;
  year: number | null;
  media_type: 'movie' | 'tv';
  poster_url: string | null;
  overview: string;
  vote_average: number;
  service: string | null;
  service_color: string | null;
}

async function fetchWatchProvider(tmdbId: number, type: 'movie' | 'tv'): Promise<{ name: string; color: string } | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(
      `${TMDB_BASE}/${type}/${tmdbId}/watch/providers?api_key=${API_KEY}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const us = data.results?.US;
    if (!us) return null;
    const providers = [...(us.flatrate || []), ...(us.free || [])];
    for (const p of providers) {
      const info = PROVIDER_MAP[p.provider_id];
      if (info) return { name: info.name, color: info.color };
    }
    return null;
  } catch { return null; }
}

// Curated pages for high quality swiper content
const SWIPER_PAGES = [
  { genre: 28, type: 'movie' as const, sort: 'popularity.desc' },
  { genre: 18, type: 'movie' as const, sort: 'vote_average.desc' },
  { genre: 27, type: 'movie' as const, sort: 'popularity.desc' },
  { genre: 878, type: 'movie' as const, sort: 'popularity.desc' },
  { genre: 35, type: 'movie' as const, sort: 'vote_average.desc' },
  { genre: 53, type: 'movie' as const, sort: 'popularity.desc' },
  { genre: 18, type: 'tv' as const, sort: 'vote_average.desc' },
  { genre: 10765, type: 'tv' as const, sort: 'popularity.desc' },
  { genre: 80, type: 'movie' as const, sort: 'popularity.desc' },
  { genre: 14, type: 'movie' as const, sort: 'popularity.desc' },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get already-voted items to exclude
  const [feedbackRes, recsRes] = await Promise.all([
    supabase.from('browse_feedback').select('tmdb_id').eq('user_id', user.id),
    supabase.from('recommendations').select('tmdb_id').eq('user_id', user.id).not('tmdb_id', 'is', null),
  ]);
  const seenIds = new Set<number>([
    ...((feedbackRes.data || []).map(r => r.tmdb_id).filter(Boolean)),
    ...((recsRes.data || []).map(r => r.tmdb_id).filter(Boolean)),
  ]);

  if (!API_KEY) return NextResponse.json({ items: [] });

  // Pick a rotation of genre pages based on current page
  const pageDefs = SWIPER_PAGES.slice(0, 3); // Fetch 3 genre pools in parallel
  const offset = (page - 1) % SWIPER_PAGES.length;
  const rotatedDefs = [...SWIPER_PAGES.slice(offset), ...SWIPER_PAGES.slice(0, offset)].slice(0, 3);

  const pools = await Promise.all(
    rotatedDefs.map(async (def) => {
      const params = new URLSearchParams({
        api_key: API_KEY,
        sort_by: def.sort,
        with_genres: def.genre.toString(),
        include_adult: 'false',
        'vote_count.gte': '100',
        'vote_average.gte': '6.5',
        page: Math.ceil(page / SWIPER_PAGES.length).toString(),
      });
      const res = await fetch(`${TMDB_BASE}/discover/${def.type}?${params}`, { next: { revalidate: 3600 } });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map((r: TMDBRaw) => ({ raw: r, type: def.type }));
    })
  );

  // Flatten, deduplicate, filter seen
  const seen = new Set<number>();
  const candidates: Array<{ raw: TMDBRaw; type: 'movie' | 'tv' }> = [];
  for (const pool of pools) {
    for (const item of pool) {
      if (!seen.has(item.raw.id) && !seenIds.has(item.raw.id)) {
        seen.add(item.raw.id);
        candidates.push(item);
      }
    }
  }

  // Shuffle for variety
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // Fetch providers for first 20 candidates
  const batch = candidates.slice(0, 20);
  const withProviders = await Promise.all(
    batch.map(async ({ raw, type }) => {
      const year = ((type === 'movie' ? raw.release_date : raw.first_air_date) || '').split('-')[0];
      const provider = await fetchWatchProvider(raw.id, type);
      const item: SwiperItem = {
        tmdb_id: raw.id,
        title: raw.title || raw.name || '',
        year: year ? parseInt(year) : null,
        media_type: type,
        poster_url: raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : null,
        overview: (raw.overview || '').slice(0, 400),
        vote_average: Math.round((raw.vote_average || 0) * 10) / 10,
        service: provider?.name || null,
        service_color: provider?.color || null,
      };
      return item;
    })
  );

  const items = withProviders.filter(i => i.title && i.poster_url);
  return NextResponse.json({ items, hasMore: candidates.length > 20 });
}
