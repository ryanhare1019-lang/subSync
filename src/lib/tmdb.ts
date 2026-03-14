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

export async function discoverByServices(
  serviceNames: string[],
  type: 'movie' | 'tv',
  page = 1
): Promise<BrowseResult[]> {
  if (!API_KEY) return [];
  const providerIds = serviceNames
    .map(n => PROVIDER_IDS[n])
    .filter(Boolean);
  if (providerIds.length === 0) return [];

  const res = await fetch(
    `${TMDB_BASE}/discover/${type}?api_key=${API_KEY}&with_watch_providers=${providerIds.join('|')}&watch_region=US&sort_by=popularity.desc&page=${page}&include_adult=false`
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
