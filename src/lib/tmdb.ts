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
};

// Maps taste quiz genre names to TMDB genre IDs, used to filter disliked genres
const GENRE_NAME_TO_TMDB_IDS: Record<string, number[]> = {
  'Action': [28, 10759],
  'Adventure': [12, 10759],
  'Animation': [16],
  'Anime': [16],
  'Comedy': [35],
  'Crime': [80],
  'Documentary': [99],
  'Drama': [18],
  'Fantasy': [14, 10765],
  'Horror': [27],
  'Mystery': [9648],
  'Reality': [10764],
  'Romance': [10749],
  'Sci-Fi': [878, 10765],
  'Thriller': [53],
  'True Crime': [80, 99],
  'Western': [37],
};

// Row IDs that correspond to specific genres (for string-matching disliked genres)
const ROW_ID_GENRE_MAP: Record<string, string[]> = {
  'action': ['Action'],
  'adventure': ['Adventure'],
  'animation': ['Animation'],
  'anime': ['Anime', 'Animation'],
  'shonen': ['Anime', 'Action'],
  'anime_romance': ['Anime', 'Romance'],
  'isekai': ['Anime', 'Fantasy'],
  'slice_life': ['Anime'],
  'anime_thriller': ['Anime'],
  'anime_film': ['Anime', 'Animation'],
  'comedy': ['Comedy'],
  'romcom': ['Comedy', 'Romance'],
  'dark_comedy': ['Comedy'],
  'action_comedy': ['Action', 'Comedy'],
  'crime': ['Crime'],
  'heist': ['Crime', 'Thriller'],
  'true_crime': ['Crime', 'Documentary'],
  'documentary': ['Documentary'],
  'nature': ['Documentary'],
  'nature_doc': ['Documentary'],
  'drama': ['Drama'],
  'period': ['Drama'],
  'legal': ['Crime', 'Drama'],
  'medical': ['Drama'],
  'political': ['Drama'],
  'comeddrama': ['Comedy', 'Drama'],
  'fantasy': ['Fantasy'],
  'fantasy_adv': ['Fantasy', 'Action'],
  'horror': ['Horror'],
  'edge': ['Horror', 'Thriller'],
  'mystery': ['Mystery'],
  'reality': ['Reality'],
  'competition': ['Reality'],
  'romance': ['Romance'],
  'cry': ['Romance', 'Drama'],
  'date': ['Romance', 'Comedy'],
  'scifi': ['Sci-Fi'],
  'sci_action': ['Sci-Fi', 'Action'],
  'sci_drama': ['Sci-Fi', 'Drama'],
  'thriller': ['Thriller'],
  'psychological': ['Thriller'],
  'spy': ['Action', 'Thriller'],
  'disaster': ['Action'],
  'western': ['Western'],
  'kdrama': ['K-Drama'],
  'kdrama_romance': ['K-Drama', 'Romance'],
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

// 55 movie rows
const MOVIE_ROW_DEFS: RowDef[] = [
  // Trending & new
  { id: 'trending', name: 'Trending Now' },
  { id: 'new_releases', name: 'New Releases', sortBy: 'primary_release_date.desc', extraParams: { 'primary_release_date.gte': '2024-01-01' } },
  { id: 'modern', name: 'Modern Hits', sortBy: 'popularity.desc', extraParams: { 'primary_release_date.gte': '2020-01-01' } },
  // Standard genres
  { id: 'action', name: 'Action', genreIds: [28] },
  { id: 'adventure', name: 'Adventure', genreIds: [12] },
  { id: 'comedy', name: 'Comedy', genreIds: [35] },
  { id: 'drama', name: 'Drama', genreIds: [18] },
  { id: 'thriller', name: 'Thriller', genreIds: [53] },
  { id: 'horror', name: 'Horror', genreIds: [27] },
  { id: 'scifi', name: 'Science Fiction', genreIds: [878] },
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
  { id: 'family', name: 'Family', genreIds: [10751] },
  // Quality picks
  { id: 'acclaimed', name: 'Critically Acclaimed', sortBy: 'vote_average.desc', extraParams: { 'vote_average.gte': '8.0', 'vote_count.gte': '1000' } },
  { id: 'hidden', name: 'Hidden Gems', sortBy: 'vote_average.desc', extraParams: { 'vote_average.gte': '7.5', 'vote_count.lte': '8000', 'vote_count.gte': '200' } },
  { id: 'award', name: 'Award Worthy', sortBy: 'vote_average.desc', extraParams: { 'vote_count.gte': '2000' } },
  // Eras
  { id: 'blast', name: 'Blast from the Past', extraParams: { 'primary_release_date.lte': '1989-12-31' } },
  { id: '90s', name: '90s Cinema', extraParams: { 'primary_release_date.gte': '1990-01-01', 'primary_release_date.lte': '1999-12-31' } },
  { id: '2000s', name: '2000s Nostalgia', extraParams: { 'primary_release_date.gte': '2000-01-01', 'primary_release_date.lte': '2009-12-31' } },
  { id: '2010s', name: '2010s Memories', extraParams: { 'primary_release_date.gte': '2010-01-01', 'primary_release_date.lte': '2019-12-31' } },
  // Mood / mashup
  { id: 'edge', name: 'Edge of Your Seat', genreIds: [53, 27] },
  { id: 'cry', name: 'A Good Cry', genreIds: [18, 10749] },
  { id: 'family_night', name: 'Family Night', genreIds: [16, 10751] },
  { id: 'true_crime', name: 'True Crime', genreIds: [80, 99] },
  { id: 'mind', name: 'Mind-Bending', genreIds: [878, 9648] },
  { id: 'laughs', name: 'Big Laughs', sortBy: 'vote_average.desc', genreIds: [35], extraParams: { 'vote_average.gte': '7.0' } },
  { id: 'date', name: 'Date Night', genreIds: [10749, 35] },
  { id: 'action_comedy', name: 'Action Comedy', genreIds: [28, 35] },
  { id: 'romcom', name: 'Romantic Comedy', genreIds: [10749, 35] },
  { id: 'dark_comedy', name: 'Dark Comedy', genreIds: [35, 53] },
  // Subgenres
  { id: 'superhero', name: 'Superhero Films', genreIds: [28, 12] },
  { id: 'spy', name: 'Spy & Espionage', genreIds: [28, 53] },
  { id: 'heist', name: 'Heist Films', genreIds: [80, 53] },
  { id: 'psychological', name: 'Psychological Thriller', genreIds: [53, 9648] },
  { id: 'disaster', name: 'Disaster Films', genreIds: [28, 878] },
  { id: 'sports', name: 'Sports Movies', genreIds: [28, 18] },
  { id: 'road_trip', name: 'Road Trip Adventures', genreIds: [12, 35] },
  { id: 'coming_age', name: 'Coming of Age', genreIds: [18, 35] },
  { id: 'period', name: 'Period Drama', genreIds: [18, 36] },
  { id: 'sci_action', name: 'Sci-Fi Action', genreIds: [878, 28] },
  { id: 'nature', name: 'Nature & Wildlife', genreIds: [99] },
  // International
  { id: 'anime_film', name: 'Anime Films', genreIds: [16], extraParams: { 'with_origin_country': 'JP' } },
  { id: 'spanish', name: 'Spanish Language', extraParams: { 'with_original_language': 'es' } },
  { id: 'french', name: 'French Cinema', extraParams: { 'with_original_language': 'fr' } },
  { id: 'korean', name: 'Korean Cinema', extraParams: { 'with_original_language': 'ko' } },
  { id: 'bollywood', name: 'Bollywood', extraParams: { 'with_original_language': 'hi' } },
  { id: 'british', name: 'British Films', extraParams: { 'with_origin_country': 'GB' } },
  { id: 'italian', name: 'Italian Cinema', extraParams: { 'with_original_language': 'it' } },
  { id: 'german', name: 'German Films', extraParams: { 'with_original_language': 'de' } },
];

// 54 TV rows
const TV_ROW_DEFS: RowDef[] = [
  // Trending & new
  { id: 'trending', name: 'Trending Now' },
  { id: 'new_series', name: 'New Series', sortBy: 'first_air_date.desc', extraParams: { 'first_air_date.gte': '2024-01-01' } },
  { id: 'fresh', name: 'Fresh Drops', sortBy: 'popularity.desc', extraParams: { 'first_air_date.gte': '2023-01-01' } },
  // Standard genres
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
  { id: 'horror', name: 'Horror', genreIds: [27] },
  { id: 'war_pol', name: 'War & Politics', genreIds: [10768] },
  { id: 'western', name: 'Western', genreIds: [37] },
  { id: 'talk', name: 'Talk Shows', genreIds: [10767] },
  // Quality
  { id: 'binge', name: 'Binge-Worthy', sortBy: 'vote_average.desc', extraParams: { 'vote_count.gte': '500' } },
  { id: 'acclaimed', name: 'Critically Acclaimed', sortBy: 'vote_average.desc', extraParams: { 'vote_average.gte': '8.0', 'vote_count.gte': '500' } },
  { id: 'hidden', name: 'Hidden Gems', sortBy: 'vote_average.desc', extraParams: { 'vote_average.gte': '7.5', 'vote_count.lte': '5000', 'vote_count.gte': '100' } },
  // Anime
  { id: 'anime', name: 'For Anime Lovers', genreIds: [16], extraParams: { 'with_origin_country': 'JP' } },
  { id: 'shonen', name: 'For Shonen Lovers', genreIds: [16, 10759], extraParams: { 'with_origin_country': 'JP' } },
  { id: 'anime_romance', name: 'Anime Romance', genreIds: [16, 10749], extraParams: { 'with_origin_country': 'JP' } },
  { id: 'isekai', name: 'Isekai & Fantasy Anime', genreIds: [16, 10765], extraParams: { 'with_origin_country': 'JP' } },
  { id: 'slice_life', name: 'Slice of Life', genreIds: [16, 35], extraParams: { 'with_origin_country': 'JP' } },
  { id: 'anime_thriller', name: 'Psychological Anime', genreIds: [16, 9648], extraParams: { 'with_origin_country': 'JP' } },
  // International
  { id: 'kdrama', name: 'K-Drama', extraParams: { 'with_origin_country': 'KR' } },
  { id: 'kdrama_romance', name: 'K-Drama Romance', genreIds: [10749, 18], extraParams: { 'with_origin_country': 'KR' } },
  { id: 'spanish', name: 'Spanish Series', extraParams: { 'with_original_language': 'es' } },
  { id: 'british', name: 'British Shows', extraParams: { 'with_origin_country': 'GB' } },
  { id: 'french', name: 'French Series', extraParams: { 'with_original_language': 'fr' } },
  { id: 'turkish', name: 'Turkish Series', extraParams: { 'with_original_language': 'tr' } },
  { id: 'bollywood_tv', name: 'Indian Series', extraParams: { 'with_origin_country': 'IN' } },
  // Eras
  { id: 'classics', name: 'Timeless Classics', sortBy: 'vote_average.desc', extraParams: { 'first_air_date.lte': '2010-12-31' } },
  { id: '2010s', name: '2010s TV Gold', extraParams: { 'first_air_date.gte': '2010-01-01', 'first_air_date.lte': '2019-12-31' } },
  // Mood / mashup
  { id: 'mood', name: 'Set the Mood', genreIds: [10749, 18] },
  { id: 'edge', name: 'Edge of Your Seat', genreIds: [9648, 10759] },
  { id: 'laugh', name: 'Laugh Out Loud', sortBy: 'vote_average.desc', genreIds: [35] },
  { id: 'cant_stop', name: "Can't Stop Watching", sortBy: 'popularity.desc', extraParams: { 'vote_count.gte': '200' } },
  { id: 'superhero', name: 'Superheroes & More', genreIds: [10759, 10765] },
  // Specific drama types
  { id: 'legal', name: 'Legal Drama', genreIds: [80, 18] },
  { id: 'medical', name: 'Medical Drama', genreIds: [18] },
  { id: 'political', name: 'Political Drama', genreIds: [10768, 18] },
  { id: 'period', name: 'Period Drama', genreIds: [18] },
  { id: 'comeddrama', name: 'Comedy-Drama', genreIds: [18, 35] },
  { id: 'true_crime', name: 'True Crime', genreIds: [80, 99] },
  { id: 'nature_doc', name: 'Nature Docs', genreIds: [99] },
  { id: 'competition', name: 'Reality Competition', genreIds: [10764] },
  { id: 'sports_drama', name: 'Sports Drama', genreIds: [18, 10759] },
  { id: 'fantasy_adv', name: 'Fantasy Adventure', genreIds: [10765, 10759] },
  { id: 'sci_drama', name: 'Science Fiction Drama', genreIds: [10765, 18] },
  { id: 'spy', name: 'Spy & Espionage', genreIds: [10759] },
  { id: 'psychological', name: 'Psychological Thriller', genreIds: [9648, 18] },
  { id: 'kids', name: 'Kids', genreIds: [10762] },
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
  return (data.results || []).slice(0, 40).map((r: Record<string, unknown>) =>
    mapResult(r, type, [serviceName])
  );
}

function isRowDisliked(row: RowDef, dislikedGenreIds: Set<number>): boolean {
  if (dislikedGenreIds.size === 0) return false;
  if (!row.genreIds || row.genreIds.length === 0) return false;
  // Skip the row if every one of its genre IDs is disliked
  return row.genreIds.every(id => dislikedGenreIds.has(id));
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
  sortBy = 'popularity.desc',
  dislikedGenres: string[] = [],
  offset = 0,
  limit = 15
): Promise<GenreRow[]> {
  const providers = serviceNames
    .map(n => ({ name: n, id: PROVIDER_IDS[n] }))
    .filter(p => p.id)
    .slice(0, 6); // cap at 6 providers
  if (providers.length === 0) return [];

  // Build set of disliked TMDB genre IDs
  const dislikedGenreIds = new Set<number>(
    dislikedGenres.flatMap(g => GENRE_NAME_TO_TMDB_IDS[g] || [])
  );

  // Also check row IDs against disliked genres by name
  const dislikedLower = new Set(dislikedGenres.map(g => g.toLowerCase()));

  const allRowDefs = (type === 'movie' ? MOVIE_ROW_DEFS : TV_ROW_DEFS).filter(row => {
    // Filter by genre IDs
    if (isRowDisliked(row, dislikedGenreIds)) return false;
    // Filter by row-level genre name mapping
    const rowGenres = ROW_ID_GENRE_MAP[row.id] || [];
    if (rowGenres.length > 0 && rowGenres.every(g => dislikedLower.has(g.toLowerCase()))) return false;
    return true;
  });

  const pageRowDefs = allRowDefs.slice(offset, offset + limit);

  const rows = await Promise.all(
    pageRowDefs.map(async (row) => {
      // Fetch per provider in parallel
      const perProvider = await Promise.all(
        providers.map(p => discoverForProvider(type, p.id, p.name, row, sortBy))
      );

      // Round-robin interleave so no single service dominates
      const seen = new Map<number, BrowseResult>();
      const maxLen = Math.max(...perProvider.map(r => r.length));
      for (let i = 0; i < maxLen; i++) {
        for (const results of perProvider) {
          const item = results[i];
          if (!item) continue;
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
        results: Array.from(seen.values()).slice(0, 40),
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
