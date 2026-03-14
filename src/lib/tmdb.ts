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
const PROVIDER_IDS: Record<string, number> = {
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
}

// TMDB genre IDs
export const TMDB_MOVIE_GENRES = [
  { id: 28, name: 'Action' }, { id: 35, name: 'Comedy' }, { id: 18, name: 'Drama' },
  { id: 878, name: 'Sci-Fi' }, { id: 27, name: 'Horror' }, { id: 99, name: 'Documentary' },
  { id: 16, name: 'Animation' }, { id: 10749, name: 'Romance' }, { id: 53, name: 'Thriller' },
  { id: 14, name: 'Fantasy' },
];

export const TMDB_TV_GENRES = [
  { id: 10759, name: 'Action & Adventure' }, { id: 35, name: 'Comedy' }, { id: 18, name: 'Drama' },
  { id: 10765, name: 'Sci-Fi & Fantasy' }, { id: 27, name: 'Horror' }, { id: 99, name: 'Documentary' },
  { id: 16, name: 'Animation' }, { id: 9648, name: 'Mystery' }, { id: 10749, name: 'Romance' },
];

export interface GenreRow {
  id: number;
  name: string;
  results: BrowseResult[];
}

async function discoverPage(
  type: 'movie' | 'tv',
  providerIds: number[],
  genreId: number,
  sortBy: string
): Promise<BrowseResult[]> {
  if (!API_KEY || providerIds.length === 0) return [];
  const res = await fetch(
    `${TMDB_BASE}/discover/${type}?api_key=${API_KEY}&with_watch_providers=${providerIds.join('|')}&watch_region=US&with_genres=${genreId}&sort_by=${sortBy}&include_adult=false&vote_count.gte=50`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).slice(0, 12).map((r: Record<string, unknown>) => ({
    id: r.id as number,
    title: (type === 'movie' ? r.title : r.name) as string,
    poster_url: r.poster_path ? `${TMDB_IMAGE_BASE}${r.poster_path}` : null,
    media_type: type,
    year: (type === 'movie'
      ? (r.release_date as string)?.split('-')[0]
      : (r.first_air_date as string)?.split('-')[0]) ?? null,
    rating: Math.round((r.vote_average as number) * 10) / 10,
  }));
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
  return (data.results || []).map((r: Record<string, unknown>) => ({
    id: r.id as number,
    title: (type === 'movie' ? r.title : r.name) as string,
    poster_url: r.poster_path ? `${TMDB_IMAGE_BASE}${r.poster_path}` : null,
    media_type: type,
    year: (type === 'movie'
      ? (r.release_date as string)?.split('-')[0]
      : (r.first_air_date as string)?.split('-')[0]) ?? null,
    rating: Math.round((r.vote_average as number) * 10) / 10,
  }));
}

export async function discoverByGenres(
  serviceNames: string[],
  type: 'movie' | 'tv',
  sortBy = 'popularity.desc'
): Promise<GenreRow[]> {
  const providerIds = serviceNames.map(n => PROVIDER_IDS[n]).filter(Boolean);
  if (providerIds.length === 0) return [];

  const genres = type === 'movie' ? TMDB_MOVIE_GENRES : TMDB_TV_GENRES;
  // Fetch top 6 genres in parallel
  const rows = await Promise.all(
    genres.slice(0, 6).map(async g => ({
      id: g.id,
      name: g.name,
      results: await discoverPage(type, providerIds, g.id, sortBy),
    }))
  );
  return rows.filter(r => r.results.length > 0);
}

export async function getStreamingLink(tmdbId: number, type: 'movie' | 'tv'): Promise<Record<string, string>> {
  if (!API_KEY) return {};
  const res = await fetch(`${TMDB_BASE}/${type}/${tmdbId}/watch/providers?api_key=${API_KEY}`);
  if (!res.ok) return {};
  const data = await res.json();
  return data.results?.US?.link ? { tmdb: data.results.US.link } : {};
}
