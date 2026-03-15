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
  10402: 'Music',
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

// ── Provider helpers ──────────────────────────────────────────────────────────

function providerInfoByName(name: string): { color: string; abbrev: string } | null {
  const id = PROVIDER_IDS[name];
  if (!id) return null;
  const p = PROVIDER_MAP[id];
  return p ? { color: p.color, abbrev: p.abbrev } : null;
}

async function fetchWatchProvider(tmdbId: number, type: 'movie' | 'tv'): Promise<{ name: string; color: string; abbrev: string } | null> {
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
      if (info) return info;
    }
    return null;
  } catch { return null; }
}

async function enrichWithProviders(
  items: TMDBRaw[],
  defaultType: 'movie' | 'tv',
  limit = 30
): Promise<Map<number, { name: string; color: string; abbrev: string }>> {
  const map = new Map<number, { name: string; color: string; abbrev: string }>();
  await Promise.all(
    items.slice(0, limit).map(async (item) => {
      const t = (item.media_type === 'tv' ? 'tv' : defaultType);
      const info = await fetchWatchProvider(item.id, t);
      if (info) map.set(item.id, info);
    })
  );
  return map;
}

// ── Item mapping ─────────────────────────────────────────────────────────────

function mapItem(
  raw: TMDBRaw,
  mediaType: 'movie' | 'tv',
  service: string | null,
  onUserService: boolean,
  providerOverride?: { name: string; color: string; abbrev: string } | null
): BrowseRowItem {
  const year = ((mediaType === 'movie' ? raw.release_date : raw.first_air_date) || '').split('-')[0];
  const pinfo = providerOverride || (service ? providerInfoByName(service) : null);
  return {
    tmdb_id: raw.id,
    title: raw.title || raw.name || '',
    year: year ? parseInt(year) : null,
    poster_url: raw.poster_path ? `https://image.tmdb.org/t/p/w342${raw.poster_path}` : null,
    backdrop_url: raw.backdrop_path ? `https://image.tmdb.org/t/p/w780${raw.backdrop_path}` : null,
    media_type: mediaType,
    service: providerOverride?.name || service,
    service_color: pinfo?.color || null,
    service_abbrev: pinfo?.abbrev || null,
    vote_average: Math.round((raw.vote_average || 0) * 10) / 10,
    genres: (raw.genre_ids || []).slice(0, 3).map(id => TMDB_GENRE_NAMES[id]).filter(Boolean),
    overview: (raw.overview || '').slice(0, 280),
    on_user_service: onUserService,
  };
}

// ── TMDB fetchers ─────────────────────────────────────────────────────────────

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
  return ((await res.json()).results || []).slice(0, 20);
}

async function fetchSimilar(tmdbId: number, type: 'movie' | 'tv'): Promise<TMDBRaw[]> {
  if (!API_KEY) return [];
  const [recsRes, simRes] = await Promise.all([
    fetch(`${TMDB_BASE}/${type}/${tmdbId}/recommendations?api_key=${API_KEY}&language=en-US`, { next: { revalidate: 3600 } }),
    fetch(`${TMDB_BASE}/${type}/${tmdbId}/similar?api_key=${API_KEY}&language=en-US`, { next: { revalidate: 3600 } }),
  ]);
  const seen = new Set<number>();
  const results: TMDBRaw[] = [];
  for (const res of [recsRes, simRes]) {
    if (res.ok) {
      for (const r of ((await res.json()).results || []).slice(0, 15)) {
        if (!seen.has(r.id)) { seen.add(r.id); results.push(r); }
      }
    }
  }
  return results.slice(0, 20);
}

async function fetchGenreRow(
  genreIds: number[],
  type: 'movie' | 'tv',
  sortBy = 'popularity.desc',
  extraParams: Record<string, string> = {},
  minVoteCount = 50
): Promise<TMDBRaw[]> {
  if (!API_KEY) return [];
  const base = new URLSearchParams({
    api_key: API_KEY,
    sort_by: sortBy,
    include_adult: 'false',
    'vote_count.gte': minVoteCount.toString(),
    language: 'en-US',
  });
  if (genreIds.length > 0) base.set('with_genres', genreIds.join(','));
  for (const [k, v] of Object.entries(extraParams)) base.set(k, v);

  const [r1, r2] = await Promise.all([
    fetch(`${TMDB_BASE}/discover/${type}?${base}`, { next: { revalidate: 3600 } }),
    fetch(`${TMDB_BASE}/discover/${type}?${base}&page=2`, { next: { revalidate: 3600 } }),
  ]);

  const seen = new Set<number>();
  const combined: TMDBRaw[] = [];
  for (const res of [r1, r2]) {
    if (res.ok) {
      for (const item of ((await res.json()).results || [])) {
        if (!seen.has(item.id)) { seen.add(item.id); combined.push({ ...item, media_type: item.media_type || type }); }
      }
    }
  }
  return combined.slice(0, 30);
}

function interleave(a: TMDBRaw[], b: TMDBRaw[], limit = 30): TMDBRaw[] {
  const seen = new Set<number>();
  const result: TMDBRaw[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max && result.length < limit; i++) {
    if (a[i] && !seen.has(a[i].id)) { seen.add(a[i].id); result.push(a[i]); }
    if (b[i] && !seen.has(b[i].id)) { seen.add(b[i].id); result.push(b[i]); }
  }
  return result;
}

// ── 50+ genre catalog for infinite scroll ────────────────────────────────────

interface GenreDef {
  id: string;
  title: string;
  movieGenreIds?: number[];
  tvGenreIds?: number[];
  sortBy?: string;
  extraParams?: Record<string, string>;
  minVoteCount?: number;
}

const GENRE_CATALOG: GenreDef[] = [
  // Core genres (both movie & TV)
  { id: 'action', title: 'Action', movieGenreIds: [28], tvGenreIds: [10759] },
  { id: 'comedy', title: 'Comedy', movieGenreIds: [35], tvGenreIds: [35] },
  { id: 'drama', title: 'Drama', movieGenreIds: [18], tvGenreIds: [18] },
  { id: 'horror', title: 'Horror', movieGenreIds: [27], tvGenreIds: [27] },
  { id: 'thriller', title: 'Thriller', movieGenreIds: [53], tvGenreIds: [9648] },
  { id: 'scifi', title: 'Science Fiction', movieGenreIds: [878], tvGenreIds: [10765] },
  { id: 'fantasy', title: 'Fantasy', movieGenreIds: [14], tvGenreIds: [10765] },
  { id: 'mystery', title: 'Mystery', movieGenreIds: [9648], tvGenreIds: [9648] },
  { id: 'romance', title: 'Romance', movieGenreIds: [10749], tvGenreIds: [10749] },
  { id: 'animation', title: 'Animation', movieGenreIds: [16], tvGenreIds: [16] },
  { id: 'documentary', title: 'Documentary', movieGenreIds: [99], tvGenreIds: [99] },
  { id: 'crime', title: 'Crime', movieGenreIds: [80], tvGenreIds: [80] },
  { id: 'adventure', title: 'Adventure', movieGenreIds: [12], tvGenreIds: [10759] },
  { id: 'family', title: 'Family', movieGenreIds: [10751], tvGenreIds: [10751] },
  { id: 'history', title: 'Historical', movieGenreIds: [36], tvGenreIds: [36] },
  { id: 'war', title: 'War & Military', movieGenreIds: [10752], tvGenreIds: [10768] },
  { id: 'western', title: 'Western', movieGenreIds: [37], tvGenreIds: [37] },
  { id: 'music', title: 'Music & Musicals', movieGenreIds: [10402] },
  // Top rated
  { id: 'acclaimed', title: 'Critically Acclaimed', movieGenreIds: [], sortBy: 'vote_average.desc', extraParams: { 'vote_average.gte': '8.0', 'vote_count.gte': '1000' }, minVoteCount: 1000 },
  { id: 'hidden_gems', title: 'Hidden Gems', movieGenreIds: [], sortBy: 'vote_average.desc', extraParams: { 'vote_average.gte': '7.5', 'vote_count.lte': '8000', 'vote_count.gte': '200' } },
  { id: 'top_comedy', title: 'Best Comedies Ever', movieGenreIds: [35], sortBy: 'vote_average.desc', minVoteCount: 500 },
  { id: 'top_horror', title: 'Best Horror', movieGenreIds: [27], sortBy: 'vote_average.desc', minVoteCount: 300 },
  { id: 'top_scifi', title: 'Best Sci-Fi', movieGenreIds: [878], sortBy: 'vote_average.desc', minVoteCount: 500 },
  { id: 'top_action', title: 'Top Action Films', movieGenreIds: [28], sortBy: 'vote_average.desc', minVoteCount: 500 },
  { id: 'top_thriller', title: 'Best Thrillers', movieGenreIds: [53], sortBy: 'vote_average.desc', minVoteCount: 300 },
  { id: 'top_animation', title: 'Best Animated Films', movieGenreIds: [16], sortBy: 'vote_average.desc', minVoteCount: 300 },
  { id: 'top_docs', title: 'Award-Winning Docs', movieGenreIds: [99], sortBy: 'vote_average.desc', minVoteCount: 200 },
  // New releases
  { id: 'new_movies', title: 'New Movies', movieGenreIds: [], sortBy: 'primary_release_date.desc', extraParams: { 'primary_release_date.gte': new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0] } },
  { id: 'new_action', title: 'New Action Releases', movieGenreIds: [28], sortBy: 'primary_release_date.desc' },
  { id: 'new_horror', title: 'New Horror', movieGenreIds: [27], sortBy: 'primary_release_date.desc' },
  { id: 'new_comedy', title: 'New Comedies', movieGenreIds: [35], sortBy: 'primary_release_date.desc' },
  { id: 'new_drama', title: 'New Drama', movieGenreIds: [18], sortBy: 'primary_release_date.desc' },
  // Decades
  { id: '90s', title: '90s Cinema', movieGenreIds: [], extraParams: { 'primary_release_date.gte': '1990-01-01', 'primary_release_date.lte': '1999-12-31' } },
  { id: '2000s', title: '2000s Nostalgia', movieGenreIds: [], extraParams: { 'primary_release_date.gte': '2000-01-01', 'primary_release_date.lte': '2009-12-31' } },
  { id: '2010s', title: '2010s Hits', movieGenreIds: [], extraParams: { 'primary_release_date.gte': '2010-01-01', 'primary_release_date.lte': '2019-12-31' } },
  { id: 'classics', title: 'All-Time Classics', movieGenreIds: [], sortBy: 'vote_average.desc', extraParams: { 'primary_release_date.lte': '1999-12-31', 'vote_count.gte': '1000' } },
  // Mood & mashup
  { id: 'edge', title: 'Edge of Your Seat', movieGenreIds: [53, 27] },
  { id: 'cry', title: 'A Good Cry', movieGenreIds: [18, 10749] },
  { id: 'mind_bend', title: 'Mind-Bending', movieGenreIds: [878, 9648] },
  { id: 'dark_intense', title: 'Dark & Intense', movieGenreIds: [27, 53, 9648] },
  { id: 'feel_good', title: 'Feel-Good Films', movieGenreIds: [35, 10749] },
  { id: 'date_night', title: 'Date Night', movieGenreIds: [10749, 35] },
  { id: 'family_night', title: 'Family Night', movieGenreIds: [10751, 16] },
  { id: 'adrenaline', title: 'Adrenaline Rush', movieGenreIds: [28, 53, 12] },
  { id: 'cerebral', title: 'Cerebral Picks', movieGenreIds: [878, 9648, 18] },
  // Subgenres
  { id: 'superhero', title: 'Superhero Films', movieGenreIds: [28, 12] },
  { id: 'spy', title: 'Spy & Espionage', movieGenreIds: [28, 53] },
  { id: 'heist', title: 'Heist Films', movieGenreIds: [80, 53] },
  { id: 'psychological', title: 'Psychological Thriller', movieGenreIds: [53, 9648] },
  { id: 'sports', title: 'Sports Movies', movieGenreIds: [28, 18] },
  { id: 'coming_age', title: 'Coming of Age', movieGenreIds: [18, 35] },
  { id: 'period_drama', title: 'Period Drama', movieGenreIds: [18, 36] },
  { id: 'sci_action', title: 'Sci-Fi Action', movieGenreIds: [878, 28] },
  { id: 'romcom', title: 'Romantic Comedy', movieGenreIds: [10749, 35] },
  { id: 'dark_comedy', title: 'Dark Comedy', movieGenreIds: [35, 53] },
  { id: 'road_trip', title: 'Road Trip Adventures', movieGenreIds: [12, 35] },
  { id: 'true_crime', title: 'True Crime', movieGenreIds: [80, 99], tvGenreIds: [80, 99] },
  // International
  { id: 'anime', title: 'Anime', tvGenreIds: [16], extraParams: { 'with_origin_country': 'JP' } },
  { id: 'kdrama', title: 'K-Drama', tvGenreIds: [18], extraParams: { 'with_origin_country': 'KR' } },
  { id: 'anime_film', title: 'Anime Films', movieGenreIds: [16], extraParams: { 'with_origin_country': 'JP' } },
  { id: 'korean_cinema', title: 'Korean Cinema', movieGenreIds: [], extraParams: { 'with_original_language': 'ko' } },
  { id: 'spanish', title: 'Spanish Language', movieGenreIds: [], extraParams: { 'with_original_language': 'es' } },
  { id: 'french', title: 'French Cinema', movieGenreIds: [], extraParams: { 'with_original_language': 'fr' } },
  { id: 'bollywood', title: 'Bollywood', movieGenreIds: [], extraParams: { 'with_original_language': 'hi' } },
  { id: 'british', title: 'British Films', movieGenreIds: [], extraParams: { 'with_origin_country': 'GB' } },
  // TV-specific
  { id: 'reality_tv', title: 'Reality TV', tvGenreIds: [10764] },
  { id: 'binge_worthy', title: 'Binge-Worthy Series', tvGenreIds: [18, 9648], sortBy: 'vote_average.desc', minVoteCount: 200 },
  { id: 'legal_drama', title: 'Legal Drama', tvGenreIds: [80, 18] },
  { id: 'medical_drama', title: 'Medical Drama', tvGenreIds: [18] },
  { id: 'political', title: 'Political Drama', tvGenreIds: [10768, 18] },
  { id: 'fantasy_adv', title: 'Fantasy Adventure', tvGenreIds: [10765, 10759] },
  { id: 'scifi_drama', title: 'Sci-Fi Drama', tvGenreIds: [10765, 18] },
  { id: 'kids', title: 'Kids & Family', movieGenreIds: [10751], tvGenreIds: [10762] },
  { id: 'nature', title: 'Nature & Wildlife', movieGenreIds: [99], tvGenreIds: [99] },
  { id: 'disaster', title: 'Disaster Films', movieGenreIds: [28, 878] },
  { id: 'supernatural', title: 'Supernatural', movieGenreIds: [14, 27], tvGenreIds: [10765] },
];

const ROWS_PER_PAGE = 8;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bust = url.searchParams.get('bust') === '1';
  const page = parseInt(url.searchParams.get('page') || '1');
  const typeFilter = url.searchParams.get('type') as 'movie' | 'tv' | null;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Pages > 1 return only genre rows (no hero/special rows)
  if (page > 1) {
    const offset = (page - 1) * ROWS_PER_PAGE;
    const mt = typeFilter || 'movie';
    const genreDefs = GENRE_CATALOG.slice(offset, offset + ROWS_PER_PAGE);
    const hasMore = offset + ROWS_PER_PAGE < GENRE_CATALOG.length;

    const rows = (await Promise.all(
      genreDefs.map(async (def) => {
        const genreIds = mt === 'tv' ? (def.tvGenreIds || def.movieGenreIds || []) : (def.movieGenreIds || []);
        const raw = await fetchGenreRow(genreIds, mt, def.sortBy, def.extraParams, def.minVoteCount);
        if (raw.length === 0) return null;
        const provMap = await enrichWithProviders(raw, mt);
        return {
          id: def.id,
          title: def.title,
          items: raw
            .map(r => mapItem(r, mt, null, false, provMap.get(r.id) || null))
            .filter(i => i.title),
        };
      })
    )).filter((r): r is BrowseRow => r !== null && r.items.length > 0);

    return NextResponse.json({ hero: null, rows, hasMore, page });
  }

  // Page 1: check cache
  const cacheKey = `${user.id}:${typeFilter || 'all'}`;
  if (!bust) {
    const cached = CACHE.get(cacheKey);
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
  const likedItem = lovedItems[0];

  // Fetch data in parallel
  const [trendingRaw, serviceRowsRaw, similarRaw] = await Promise.all([
    fetchTrending(),
    Promise.all(
      videoServices.slice(0, 3).map(async (serviceName) => {
        const pid = PROVIDER_IDS[serviceName];
        if (!pid) return null;
        const [movies, shows] = await Promise.all([
          fetchNewOnService(pid, 'movie'),
          fetchNewOnService(pid, 'tv'),
        ]);
        return { serviceName, items: interleave(movies, shows, 25) };
      })
    ),
    likedItem
      ? fetchSimilar(likedItem.tmdb_id, likedItem.media_type as 'movie' | 'tv')
      : Promise.resolve([]),
  ]);

  // Enrich trending with provider info
  const trendingProviders = await enrichWithProviders(trendingRaw, 'movie', 20);

  // Build rows
  const rows: BrowseRow[] = [];

  // Trending (with service info)
  if (trendingRaw.length > 0) {
    rows.push({
      id: 'trending',
      title: 'Trending Now',
      items: trendingRaw
        .map(r => {
          const mt = (r.media_type || 'movie') as 'movie' | 'tv';
          return mapItem(r, mt, null, false, trendingProviders.get(r.id) || null);
        })
        .filter(i => i.title),
    });
  }

  // Because you liked
  if (similarRaw.length > 0 && likedItem) {
    const simProviders = await enrichWithProviders(similarRaw, likedItem.media_type as 'movie' | 'tv', 20);
    rows.push({
      id: 'because_you_liked',
      title: `Because you loved ${likedItem.title}`,
      items: similarRaw
        .map(r => mapItem(r, likedItem.media_type as 'movie' | 'tv', null, false, simProviders.get(r.id) || null))
        .filter(i => i.title),
    });
  }

  // New on each service
  const validServiceRows = (serviceRowsRaw.filter(Boolean) as Array<{ serviceName: string; items: TMDBRaw[] }>);
  for (const svcRow of validServiceRows) {
    if (svcRow.items.length > 0) {
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
  }

  // User favorite genre rows
  const favGenresToFetch = favGenres.slice(0, 2);
  const GENRE_IDS: Record<string, number[]> = {
    'Action': [28, 10759], 'Adventure': [12], 'Animation': [16], 'Comedy': [35],
    'Crime': [80], 'Documentary': [99], 'Drama': [18], 'Fantasy': [14, 10765],
    'Horror': [27], 'Mystery': [9648], 'Romance': [10749], 'Sci-Fi': [878, 10765],
    'Thriller': [53], 'True Crime': [80, 99], 'Western': [37], 'Anime': [16], 'K-Drama': [18],
  };
  for (const genre of favGenresToFetch) {
    const ids = GENRE_IDS[genre] || [];
    if (ids.length === 0) continue;
    const raw = await fetchGenreRow(ids, typeFilter || 'movie', 'vote_average.desc', {}, 200);
    if (raw.length === 0) continue;
    const provMap = await enrichWithProviders(raw, typeFilter || 'movie', 20);
    rows.push({
      id: `fav_${genre.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `Top ${genre} For You`,
      items: raw
        .map(r => mapItem(r, typeFilter || (r.media_type || 'movie') as 'movie' | 'tv', null, false, provMap.get(r.id) || null))
        .filter(i => i.title),
    });
  }

  // Vibe row
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
    const vibeRaw = await fetchGenreRow(vibeGenreIds, typeFilter || 'movie');
    if (vibeRaw.length > 0) {
      const provMap = await enrichWithProviders(vibeRaw, typeFilter || 'movie', 20);
      rows.push({
        id: `vibe_${vibeKey}`,
        title: `${VIBE_LABELS[vibeKey] || vibeKey} Picks For You`,
        items: vibeRaw
          .map(r => mapItem(r, (r.media_type || 'movie') as 'movie' | 'tv', null, false, provMap.get(r.id) || null))
          .filter(i => i.title),
      });
    }
  }

  // First 4 genre catalog rows
  const initialGenres = GENRE_CATALOG.slice(0, 4);
  await Promise.all(
    initialGenres.map(async (def) => {
      const mt = typeFilter || 'movie';
      const genreIds = mt === 'tv' ? (def.tvGenreIds || def.movieGenreIds || []) : (def.movieGenreIds || []);
      const raw = await fetchGenreRow(genreIds, mt, def.sortBy, def.extraParams, def.minVoteCount);
      if (raw.length === 0) return;
      const provMap = await enrichWithProviders(raw, mt, 20);
      rows.push({
        id: def.id,
        title: def.title,
        items: raw
          .map(r => mapItem(r, mt, null, false, provMap.get(r.id) || null))
          .filter(i => i.title),
      });
    })
  );

  // ── Hero: pick random from top 10 trending with backdrop ──────────────────
  const heroEligible = trendingRaw.filter(r => r.backdrop_path).slice(0, 10);
  const heroIndex = bust ? Math.floor(Math.random() * heroEligible.length) : 0;
  const heroRaw = heroEligible[heroIndex] || heroEligible[0];
  let hero: HeroItem | null = null;

  if (heroRaw) {
    const mt = (heroRaw.media_type || 'movie') as 'movie' | 'tv';
    const genres = (heroRaw.genre_ids || []).slice(0, 3).map(id => TMDB_GENRE_NAMES[id]).filter(Boolean);
    const heroProvider = trendingProviders.get(heroRaw.id) || await fetchWatchProvider(heroRaw.id, mt);

    let aiReason = `Trending this week${genres.length > 0 ? ` — a ${genres.slice(0, 2).join(' & ')} title` : ''} everyone is talking about.`;
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
      service: heroProvider?.name || null,
      service_color: heroProvider?.color || null,
      service_abbrev: heroProvider?.abbrev || null,
      vote_average: Math.round((heroRaw.vote_average || 0) * 10) / 10,
      genres,
      overview: (heroRaw.overview || '').slice(0, 300),
      on_user_service: heroProvider ? videoServices.includes(heroProvider.name) : false,
      ai_reason: aiReason,
      match_score: taste ? Math.round(78 + Math.random() * 17) : undefined,
    };
  }

  const response: BrowseRowsResponse = {
    hero,
    rows,
    hasMore: true, // Genre catalog has many more pages
    page: 1,
  };
  CACHE.set(cacheKey, { data: response, ts: Date.now() });
  return NextResponse.json(response);
}
