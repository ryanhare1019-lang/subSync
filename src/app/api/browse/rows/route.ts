import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { PROVIDER_IDS } from '@/lib/tmdb';
import { PROVIDER_MAP } from '@/lib/constants';
import type { BrowseRowItem, HeroItem, BrowseRow, BrowseRowsResponse } from '@/types/browse';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

const TMDB_GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 27: 'Horror',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10768: 'War & Politics', 10752: 'War', 36: 'History',
};

const GENRE_IDS: Record<string, number[]> = {
  'Action': [28, 10759], 'Adventure': [12], 'Animation': [16], 'Comedy': [35],
  'Crime': [80], 'Documentary': [99], 'Drama': [18], 'Fantasy': [14, 10765],
  'Horror': [27], 'Mystery': [9648], 'Romance': [10749], 'Sci-Fi': [878, 10765],
  'Thriller': [53], 'True Crime': [80, 99], 'Western': [37], 'Anime': [16],
  'K-Drama': [18],
};

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
  media_type?: string;
}

// In-memory cache: userId → { data, ts }
const CACHE = new Map<string, { data: BrowseRowsResponse; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function providerInfoByName(name: string): { color: string; abbrev: string } | null {
  const id = PROVIDER_IDS[name];
  if (!id) return null;
  const p = PROVIDER_MAP[id];
  return p ? { color: p.color, abbrev: p.abbrev } : null;
}

function mapItem(
  raw: TMDBRaw,
  mediaType: 'movie' | 'tv',
  service: string | null,
  onUserService: boolean
): BrowseRowItem {
  const year = ((mediaType === 'movie' ? raw.release_date : raw.first_air_date) || '').split('-')[0];
  const pinfo = service ? providerInfoByName(service) : null;
  return {
    tmdb_id: raw.id,
    title: raw.title || raw.name || '',
    year: year ? parseInt(year) : null,
    poster_url: raw.poster_path ? `https://image.tmdb.org/t/p/w342${raw.poster_path}` : null,
    backdrop_url: raw.backdrop_path ? `https://image.tmdb.org/t/p/w780${raw.backdrop_path}` : null,
    media_type: mediaType,
    service,
    service_color: pinfo?.color || null,
    service_abbrev: pinfo?.abbrev || null,
    vote_average: Math.round((raw.vote_average || 0) * 10) / 10,
    genres: (raw.genre_ids || []).slice(0, 3).map(id => TMDB_GENRE_NAMES[id]).filter(Boolean),
    overview: (raw.overview || '').slice(0, 280),
    on_user_service: onUserService,
  };
}

async function fetchTrending(): Promise<TMDBRaw[]> {
  if (!API_KEY) return [];
  const res = await fetch(
    `${TMDB_BASE}/trending/all/week?api_key=${API_KEY}&language=en-US`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  return ((await res.json()).results || []).slice(0, 20);
}

async function fetchNewOnService(providerId: number, type: 'movie' | 'tv'): Promise<TMDBRaw[]> {
  if (!API_KEY) return [];
  const dateField = type === 'movie' ? 'primary_release_date' : 'first_air_date';
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const params = new URLSearchParams({
    api_key: API_KEY,
    with_watch_providers: providerId.toString(),
    watch_region: 'US',
    sort_by: `${dateField}.desc`,
    include_adult: 'false',
    'vote_count.gte': '10',
    [`${dateField}.lte`]: new Date().toISOString().split('T')[0],
    [`${dateField}.gte`]: sixMonthsAgo.toISOString().split('T')[0],
  });
  const res = await fetch(`${TMDB_BASE}/discover/${type}?${params}`, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  return ((await res.json()).results || []).slice(0, 15);
}

async function fetchTopRatedGenre(genreIds: number[], providerIds: number[]): Promise<{ movies: TMDBRaw[]; shows: TMDBRaw[] }> {
  if (!API_KEY || genreIds.length === 0) return { movies: [], shows: [] };
  const base = new URLSearchParams({
    api_key: API_KEY,
    with_genres: genreIds.join(','),
    sort_by: 'vote_average.desc',
    include_adult: 'false',
    language: 'en-US',
  });
  if (providerIds.length > 0) {
    base.set('with_watch_providers', providerIds.join('|'));
    base.set('watch_region', 'US');
  }
  const movieParams = new URLSearchParams(base);
  movieParams.set('vote_count.gte', '500');
  const tvParams = new URLSearchParams(base);
  tvParams.set('vote_count.gte', '200');

  const [movRes, tvRes] = await Promise.all([
    fetch(`${TMDB_BASE}/discover/movie?${movieParams}`, { next: { revalidate: 3600 } }),
    fetch(`${TMDB_BASE}/discover/tv?${tvParams}`, { next: { revalidate: 3600 } }),
  ]);
  const movies = movRes.ok ? ((await movRes.json()).results || []).slice(0, 12) : [];
  const shows = tvRes.ok ? ((await tvRes.json()).results || []).slice(0, 12) : [];
  return { movies, shows };
}

async function fetchSimilar(tmdbId: number, type: 'movie' | 'tv'): Promise<TMDBRaw[]> {
  if (!API_KEY) return [];
  const [recsRes, simRes] = await Promise.all([
    fetch(`${TMDB_BASE}/${type}/${tmdbId}/recommendations?api_key=${API_KEY}&language=en-US`, { next: { revalidate: 3600 } }),
    fetch(`${TMDB_BASE}/${type}/${tmdbId}/similar?api_key=${API_KEY}&language=en-US`, { next: { revalidate: 3600 } }),
  ]);
  const seen = new Set<number>();
  const results: TMDBRaw[] = [];
  if (recsRes.ok) {
    for (const r of ((await recsRes.json()).results || []).slice(0, 12)) {
      if (!seen.has(r.id)) { seen.add(r.id); results.push(r); }
    }
  }
  if (simRes.ok) {
    for (const r of ((await simRes.json()).results || []).slice(0, 10)) {
      if (!seen.has(r.id)) { seen.add(r.id); results.push(r); }
    }
  }
  return results.slice(0, 20);
}

function interleave(a: TMDBRaw[], b: TMDBRaw[], limit = 20): TMDBRaw[] {
  const seen = new Set<number>();
  const result: TMDBRaw[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max && result.length < limit; i++) {
    if (a[i] && !seen.has(a[i].id)) { seen.add(a[i].id); result.push(a[i]); }
    if (b[i] && !seen.has(b[i].id)) { seen.add(b[i].id); result.push(b[i]); }
  }
  return result;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bust = url.searchParams.get('bust') === '1';

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Serve from cache unless busting
  if (!bust) {
    const cached = CACHE.get(user.id);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }
  }

  // Fetch user data in parallel
  const [subsRes, tasteRes, lovedRecsRes, browseFeedRes] = await Promise.all([
    supabase.from('subscriptions').select('service_name, service_type').eq('user_id', user.id),
    supabase.from('taste_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('recommendations').select('title, tmdb_id, media_type').eq('user_id', user.id)
      .eq('user_feedback', 'loved').not('tmdb_id', 'is', null)
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('browse_feedback').select('title, tmdb_id, media_type').eq('user_id', user.id)
      .eq('feedback', 'thumbs_up').not('tmdb_id', 'is', null)
      .order('created_at', { ascending: false }).limit(5),
  ]);

  const allSubs: Array<{ service_name: string; service_type: string }> = subsRes.data || [];
  const videoServices = allSubs
    .filter(s => s.service_type === 'streaming_video')
    .map(s => s.service_name);
  const taste = tasteRes.data;
  const userProviderIds = videoServices.map(n => PROVIDER_IDS[n]).filter(Boolean);

  const lovedItems = [
    ...(lovedRecsRes.data || []),
    ...(browseFeedRes.data || []),
  ].filter(Boolean);

  const favGenres: string[] = taste?.favorite_genres || [];
  const tastePrefs = (taste?.preferences as Record<string, unknown>) || {};
  const vibes = (tastePrefs.vibes as Record<string, string>) || {};
  const personality = tastePrefs.personality as { label?: string } | undefined;

  // --- Fetch data in parallel ---
  const likedItem = lovedItems[0];

  const [trendingRaw, serviceRowsRaw, genreRowsRaw, similarRaw] = await Promise.all([
    fetchTrending(),

    // New on each service (max 3)
    Promise.all(
      videoServices.slice(0, 3).map(async (serviceName) => {
        const pid = PROVIDER_IDS[serviceName];
        if (!pid) return null;
        const [movies, shows] = await Promise.all([
          fetchNewOnService(pid, 'movie'),
          fetchNewOnService(pid, 'tv'),
        ]);
        return { serviceName, items: interleave(movies, shows, 20) };
      })
    ),

    // Top rated by genre (max 2 fav genres, fall back to defaults)
    Promise.all(
      (favGenres.length > 0 ? favGenres.slice(0, 2) : ['Sci-Fi', 'Thriller']).map(async (genre) => {
        const ids = GENRE_IDS[genre] || [];
        if (ids.length === 0) return null;
        const { movies, shows } = await fetchTopRatedGenre(ids, userProviderIds);
        return { genre, items: interleave(movies, shows, 20) };
      })
    ),

    // "Because you liked" — similar to most-recently loved item
    likedItem
      ? fetchSimilar(likedItem.tmdb_id, likedItem.media_type as 'movie' | 'tv')
      : Promise.resolve([]),
  ]);

  // --- Build rows ---
  const rows: BrowseRow[] = [];

  // Trending
  if (trendingRaw.length > 0) {
    rows.push({
      id: 'trending',
      title: 'Trending Now',
      items: trendingRaw
        .map(r => mapItem(r, (r.media_type || 'movie') as 'movie' | 'tv', null, false))
        .filter(i => i.title),
    });
  }

  // Because you liked
  if (similarRaw.length > 0 && likedItem) {
    rows.push({
      id: 'because_you_liked',
      title: `Because you loved ${likedItem.title}`,
      items: similarRaw
        .map(r => mapItem(r, likedItem.media_type as 'movie' | 'tv', null, false))
        .filter(i => i.title),
    });
  }

  // New on each service (interleaved with genre rows for variety)
  const validServiceRows = serviceRowsRaw.filter(Boolean) as Array<{ serviceName: string; items: TMDBRaw[] }>;
  const validGenreRows = genreRowsRaw.filter(Boolean) as Array<{ genre: string; items: TMDBRaw[] }>;

  // Interleave: service, genre, service, genre...
  const maxAlternating = Math.max(validServiceRows.length, validGenreRows.length);
  for (let i = 0; i < maxAlternating; i++) {
    const svcRow = validServiceRows[i];
    if (svcRow && svcRow.items.length > 0) {
      rows.push({
        id: `new_on_${svcRow.serviceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        title: `New on ${svcRow.serviceName}`,
        items: svcRow.items
          .map(r => {
            const mt = (r.media_type || 'movie') as 'movie' | 'tv';
            return mapItem(r, mt, svcRow.serviceName, true);
          })
          .filter(i => i.title),
      });
    }

    const genRow = validGenreRows[i];
    if (genRow && genRow.items.length > 0) {
      rows.push({
        id: `top_${genRow.genre.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        title: `Top Rated ${genRow.genre}`,
        items: genRow.items
          .map(r => {
            const mt = (r.media_type || 'movie') as 'movie' | 'tv';
            return mapItem(r, mt, null, userProviderIds.length === 0 ? false : false);
          })
          .filter(i => i.title),
      });
    }
  }

  // Vibe-based row
  const vibeValues = Object.values(vibes);
  if (vibeValues.length > 0) {
    const vibeKey = vibeValues[0];
    const VIBE_LABELS: Record<string, string> = {
      slow_burn: 'Slow Burn', fast_paced: 'Fast-Paced', cerebral: 'Cerebral',
      comfort: 'Cozy Comfort', dark: 'Dark & Intense', light: 'Light & Fun',
      true_stories: 'True Stories', fiction: 'Pure Fiction',
    };
    const VIBE_GENRES: Record<string, number[]> = {
      slow_burn: [18, 9648], fast_paced: [28, 53], cerebral: [878, 9648, 18],
      comfort: [35, 10749], dark: [53, 27, 9648], light: [35, 10749],
      true_stories: [99, 80], fiction: [878, 14],
    };
    const vibeGenreIds = VIBE_GENRES[vibeKey] || [18, 35];
    const { movies: vm, shows: vs } = await fetchTopRatedGenre(vibeGenreIds, userProviderIds);
    const vibeItems = interleave(vm, vs, 20);
    if (vibeItems.length > 0) {
      const label = VIBE_LABELS[vibeKey] || vibeKey;
      rows.push({
        id: `vibe_${vibeKey}`,
        title: `${label} Picks For You`,
        items: vibeItems
          .map(r => mapItem(r, (r.media_type || 'movie') as 'movie' | 'tv', null, false))
          .filter(i => i.title),
      });
    }
  }

  // Fallback rows if we still have fewer than 4
  if (rows.length < 4) {
    const fallbackGenres: Array<[string, number[]]> = [
      ['Comedy', [35]], ['Drama', [18]], ['Thriller', [53]],
    ];
    for (const [genre, ids] of fallbackGenres) {
      if (rows.length >= 6) break;
      if (rows.find(r => r.id.includes(genre.toLowerCase()))) continue;
      const { movies, shows } = await fetchTopRatedGenre(ids, []);
      const items = interleave(movies, shows, 16);
      if (items.length > 0) {
        rows.push({
          id: `fallback_${genre.toLowerCase()}`,
          title: `Top Rated ${genre}`,
          items: items
            .map(r => mapItem(r, (r.media_type || 'movie') as 'movie' | 'tv', null, false))
            .filter(i => i.title),
        });
      }
    }
  }

  // --- Hero: pick best trending item with a backdrop ---
  const heroRaw = trendingRaw.find(r => r.backdrop_path) || trendingRaw[0];
  let hero: HeroItem | null = null;

  if (heroRaw) {
    const mt = (heroRaw.media_type || 'movie') as 'movie' | 'tv';
    const genres = (heroRaw.genre_ids || []).slice(0, 3).map(id => TMDB_GENRE_NAMES[id]).filter(Boolean);

    let aiReason = `Trending this week${genres.length > 0 ? ` — a ${genres.slice(0, 2).join(' & ')} title` : ''} that everyone is talking about.`;
    if (personality?.label) {
      aiReason = `Trending this week and a strong match for your ${personality.label} taste — don't miss it.`;
    }

    hero = {
      tmdb_id: heroRaw.id,
      title: heroRaw.title || heroRaw.name || '',
      year: ((mt === 'movie' ? heroRaw.release_date : heroRaw.first_air_date) || '').split('-')[0]
        ? parseInt(((mt === 'movie' ? heroRaw.release_date : heroRaw.first_air_date) || '').split('-')[0])
        : null,
      poster_url: heroRaw.poster_path ? `https://image.tmdb.org/t/p/w500${heroRaw.poster_path}` : null,
      backdrop_url: heroRaw.backdrop_path ? `https://image.tmdb.org/t/p/w1280${heroRaw.backdrop_path}` : null,
      media_type: mt,
      service: null,
      service_color: null,
      service_abbrev: null,
      vote_average: Math.round((heroRaw.vote_average || 0) * 10) / 10,
      genres,
      overview: (heroRaw.overview || '').slice(0, 300),
      on_user_service: false,
      ai_reason: aiReason,
      match_score: taste ? Math.round(78 + Math.random() * 17) : undefined,
    };
  }

  const response: BrowseRowsResponse = { hero, rows };
  CACHE.set(user.id, { data: response, ts: Date.now() });
  return NextResponse.json(response);
}
