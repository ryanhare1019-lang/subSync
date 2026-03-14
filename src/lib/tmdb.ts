const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const API_KEY = process.env.TMDB_API_KEY;

interface TMDBMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  media_type?: string;
}

interface TMDBShow {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string;
  media_type?: string;
}

type TMDBResult = (TMDBMovie | TMDBShow) & { media_type: string };

export async function searchTMDB(query: string): Promise<TMDBResult[]> {
  if (!API_KEY) return [];
  const res = await fetch(
    `${TMDB_BASE}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).filter((r: TMDBResult) =>
    r.media_type === 'movie' || r.media_type === 'tv'
  );
}

export async function findTMDBEntry(
  title: string,
  mediaType: 'movie' | 'tv' | string,
  year?: number | null
): Promise<{ id: number; poster_url: string | null } | null> {
  if (!API_KEY) return null;

  const type = mediaType === 'tv' ? 'tv' : 'movie';
  const yearParam = year ? `&year=${year}` : '';
  const res = await fetch(
    `${TMDB_BASE}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(title)}${yearParam}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const result = data.results?.[0];
  if (!result) return null;

  return {
    id: result.id,
    poster_url: result.poster_path ? `${TMDB_IMAGE_BASE}${result.poster_path}` : null,
  };
}

export function getPosterUrl(path: string | null): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}${path}`;
}

// TMDB provider IDs for common services
export const PROVIDER_IDS: Record<string, number> = {
  'Netflix': 8,
  'Hulu': 15,
  'Disney+': 337,
  'HBO Max': 1899,
  'Amazon Prime': 9,
  'Apple TV+': 350,
  'Peacock': 386,
  'Paramount+': 531,
  'Crunchyroll': 283,
  'YouTube Premium': 188,
};

export interface BrowseResult {
  id: number;
  title: string;
  poster_url: string | null;
  media_type: 'movie' | 'tv';
  year: string | null;
  rating: number;
  services: string[];
}

export interface GenreRow {
  id: string | number;
  name: string;
  results: BrowseResult[];
}

interface RowDef {
  id: string;
  name: string;
  genreIds?: number[];
  sortBy?: string;
  extraParams?: Record<string, string>;
}

const MOVIE_ROW_DEFS: RowDef[] = [
  { id: 'trending', name: 'Trending Now' },
  { id: 'action', name: 'Action', genreIds: [28] },
  { id: 'comedy', name: 'Comedy', genreIds: [35] },
  { id: 'drama', name: 'Drama', genreIds: [18] },
  { id: 'thriller', name: 'Thriller', genreIds: [53] },
  { id: 'horror', name: 'Horror', genreIds: [27] },
  { id: 'scifi', name: 'Sci-Fi', genreIds: [878] },
  { id: 'romance', name: 'Romance', genreIds: [10749] },
  { id: 'documentary', name: 'Documentary', genreIds: [99] },
  { id: 'animation', name: 'Animation', genreIds: [16] },
  { id: 'fantasy', name: 'Fantasy', genreIds: [14] },
  { id: 'mystery', name: 'Mystery', genreIds: [9648] },
  { id: 'crime', name: 'Crime', genreIds: [80] },
  { id: 'western', name: 'Western', genreIds: [37] },
  { id: 'war', name: 'War & Military', genreIds: [10752] },
  { id: 'history', name: 'Historical', genreIds: [36] },
  { id: 'musical', name: 'Music & Musicals', genreIds: [10402] },
  { id: 'acclaimed', name: 'Critically Acclaimed', sortBy: 'vote_average.desc', extraParams: { 'vote_average.gte': '8.0', 'vote_count.gte': '1000' } },
  { id: 'hidden', name: 'Hidden Gems', sortBy: 'vote_average.desc', extraParams: { 'vote_average.gte': '7.5', 'vote_count.lte': '8000', 'vote_count.gte': '200' } },
  { id: 'blast', name: 'Blast from the Past', extraParams: { 'primary_release_date.lte': '1999-12-31' } },
  { id: '2000s', name: '2000s Nostalgia', extraParams: { 'primary_release_date.gte': '2000-01-01', 'primary_release_date.lte': '2009-12-31' } },
  { id: 'modern', name: 'Modern Hits', sortBy: 'popularity.desc', extraParams: { 'primary_release_date.gte': '2020-01-01' } },
  { id: 'edge', name: 'Edge of Your Seat', genreIds: [53, 27] },
  { id: 'cry', name: 'A Good Cry', genreIds: [18, 10749] },
  { id: 'family', name: 'Family Night', genreIds: [16, 10751] },
  { id: 'true_crime', name: 'True Crime', genreIds: [80, 99] },
  { id: 'mind', name: 'Mind-Bending', genreIds: [878, 9648] },
  { id: 'laughs', name: 'Big Laughs', sortBy: 'vote_average.desc', genreIds: [35], extraParams: { 'vote_average.gte': '7.0' } },
  { id: 'date', name: 'Date Night', genreIds: [10749, 35] },
  { id: 'award', name: 'Award Worthy', sortBy: 'vote_average.desc', extraParams: { 'vote_count.gte': '2000' } },
];

const TV_ROW_DEFS: RowDef[] = [
  { id: 'trending', name: 'Trending Now' },
  { id: 'drama', name: 'Drama', genreIds: [18] },
  { id: 'comedy', name: 'Comedy', genreIds: [35] },
  { id: 'action', name: 'Action & Adventure', genreIds: [10759] },
  { id: 'scifi', name: 'Sci-Fi & Fantasy', genreIds: [10765] },
  { id: 'crime', name: 'Crime & Thriller', genreIds: [80, 9648] },
  { id: 'documentary', name: 'Documentary', genreIds: [99] },
  { id: 'animation', name: 'Animation', genreIds: [16] },
  { id: 'reality', name: 'Reality TV', genreIds: [10764] },
  { id: 'mystery', name: 'Mystery', genreIds: [9648] },
  { id: 'romance', name: 'Romance', genreIds: [10749] },
  { id: 'family', name: 'Family', genreIds: [10751] },
  { id: 'binge', name: 'Binge-Worthy', sortBy: 'vote_average.desc', extraParams: { 'vote_count.gte': '500' } },
  { id: 'acclaimed', name: 'Critically Acclaimed', sortBy: 'vote_average.desc', extraParams: { 'vote_average.gte': '8.0', 'vote_count.gte': '500' } },
  { id: 'hidden', name: 'Hidden Gems', sortBy: 'vote_average.desc', extraParams: { 'vote_average.gte': '7.5', 'vote_count.lte': '5000', 'vote_count.gte': '100' } },
  { id: 'anime', name: 'For Anime Lovers', genreIds: [16], extraParams: { 'with_origin_country': 'JP' } },
  { id: 'shonen', name: 'For Shonen Lovers', genreIds: [16, 10759], extraParams: { 'with_origin_country': 'JP' } },
  { id: 'kdrama', name: 'K-Drama', extraParams: { 'with_origin_country': 'KR' } },
  { id: 'fresh', name: 'Fresh Drops', sortBy: 'popularity.desc', extraParams: { 'first_air_date.gte': '2023-01-01' } },
  { id: 'classics', name: 'Timeless Classics', sortBy: 'vote_average.desc', extraParams: { 'first_air_date.lte': '2010-12-31' } },
  { id: 'mood', name: 'Set the Mood', genreIds: [10749, 18] },
  { id: 'edge', name: 'Edge of Your Seat', genreIds: [9648, 10759] },
  { id: 'laugh', name: 'Laugh Out Loud', sortBy: 'vote_average.desc', genreIds: [35] },
  { id: 'cant_stop', name: "Can't Stop Watching", sortBy: 'popularity.desc', extraParams: { 'vote_count.gte': '200' } },
  { id: 'superhero', name: 'Superheroes & More', genreIds: [10759, 10765] },
  { id: 'western', name: 'Western', genreIds: [37] },
];

function mapResult(r: Record<string, unknown>, type: 'movie' | 'tv', services: string[]): BrowseResult {
  return {
    id: r.id as number,
    title: (type === 'movie' ? r.title : r.name) as string,
    poster_url: r.poster_path ? `${TMDB_IMAGE_BASE}${r.poster_path}` : null,
    media_type: type,
    year: (type === 'movie'
      ? (r.release_date as string)?.split('-')[0]
      : (r.first_air_date as string)?.split('-')[0]) ?? null,
    rating: Math.round((r.vote_average as number) * 10) / 10,
    services,
  };
}

async function discoverForProvider(
  type: 'movie' | 'tv',
  providerId: number,
  serviceName: string,
  row: RowDef,
  globalSortBy: string
): Promise<BrowseResult[]> {
  if (!API_KEY) return [];
  const params = new URLSearchParams({
    api_key: API_KEY,
    with_watch_providers: providerId.toString(),
    watch_region: 'US',
    sort_by: row.sortBy || globalSortBy,
    include_adult: 'false',
    'vote_count.gte': '20',
  });
  if (row.genreIds?.length) params.set('with_genres', row.genreIds.join('|'));
  for (const [k, v] of Object.entries(row.extraParams || {})) params.set(k, v);

  const res = await fetch(`${TMDB_BASE}/discover/${type}?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).slice(0, 15).map((r: Record<string, unknown>) =>
    mapResult(r, type, [serviceName])
  );
}

export async function discoverByServices(
  serviceNames: string[],
  type: 'movie' | 'tv',
  page = 1,
  sortBy = 'popularity.desc'
): Promise<BrowseResult[]> {
  if (!API_KEY) return [];
  const providerIds = serviceNames.map(n => PROVIDER_IDS[n]).filter(Boolean);
  if (providerIds.length === 0) return [];

  const res = await fetch(
    `${TMDB_BASE}/discover/${type}?api_key=${API_KEY}&with_watch_providers=${providerIds.join('|')}&watch_region=US&sort_by=${sortBy}&page=${page}&include_adult=false&vote_count.gte=20`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((r: Record<string, unknown>) =>
    mapResult(r, type, serviceNames)
  );
}

export async function discoverByGenres(
  serviceNames: string[],
  type: 'movie' | 'tv',
  sortBy = 'popularity.desc'
): Promise<GenreRow[]> {
  const providers = serviceNames
    .map(n => ({ name: n, id: PROVIDER_IDS[n] }))
    .filter(p => p.id)
    .slice(0, 5); // cap at 5 providers to limit API call volume
  if (providers.length === 0) return [];

  const rowDefs = type === 'movie' ? MOVIE_ROW_DEFS : TV_ROW_DEFS;

  const rows = await Promise.all(
    rowDefs.map(async (row) => {
      const perProvider = await Promise.all(
        providers.map(p => discoverForProvider(type, p.id, p.name, row, sortBy))
      );

      // Merge, deduplicate by ID, collect all services per movie
      const seen = new Map<number, BrowseResult>();
      for (const results of perProvider) {
        for (const item of results) {
          if (seen.has(item.id)) {
            const existing = seen.get(item.id)!;
            for (const svc of item.services) {
              if (!existing.services.includes(svc)) existing.services.push(svc);
            }
          } else {
            seen.set(item.id, { ...item, services: [...item.services] });
          }
        }
      }

      return {
        id: row.id,
        name: row.name,
        results: Array.from(seen.values()).slice(0, 20),
      };
    })
  );

  return rows.filter(r => r.results.length > 0);
}

export async function getWatchProviders(
  tmdbId: number,
  type: 'movie' | 'tv'
): Promise<{ link: string | null; providerIds: number[] }> {
  if (!API_KEY) return { link: null, providerIds: [] };
  const res = await fetch(`${TMDB_BASE}/${type}/${tmdbId}/watch/providers?api_key=${API_KEY}`);
  if (!res.ok) return { link: null, providerIds: [] };
  const data = await res.json();
  const us = data.results?.US;
  const flatrate: { provider_id: number }[] = us?.flatrate || [];
  return {
    link: us?.link || null,
    providerIds: flatrate.map(p => p.provider_id),
  };
}
