import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getRecommendations } from '@/lib/claude';
import { PROVIDER_IDS, getWatchProviders } from '@/lib/tmdb';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const API_KEY = process.env.TMDB_API_KEY;

interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  overview?: string;
}

interface Candidate {
  tmdb_id: number;
  title: string;
  media_type: 'movie' | 'tv';
  year: string | null;
  poster_url: string | null;
  rating: number;
  overview: string;
  available_on: string[];
  watch_link: string | null;
  source_title?: string; // what loved item triggered this
}

async function fetchTMDBRecs(tmdbId: number, type: 'movie' | 'tv'): Promise<TMDBItem[]> {
  if (!API_KEY) return [];
  const [recsRes, simRes] = await Promise.all([
    fetch(`${TMDB_BASE}/${type}/${tmdbId}/recommendations?api_key=${API_KEY}&language=en-US&page=1`),
    fetch(`${TMDB_BASE}/${type}/${tmdbId}/similar?api_key=${API_KEY}&language=en-US&page=1`),
  ]);
  const results: TMDBItem[] = [];
  if (recsRes.ok) {
    const d = await recsRes.json();
    results.push(...(d.results || []).slice(0, 10));
  }
  if (simRes.ok) {
    const d = await simRes.json();
    results.push(...(d.results || []).slice(0, 10));
  }
  return results;
}

async function discoverByGenreIds(
  genreIds: number[],
  type: 'movie' | 'tv',
  providerIds: number[]
): Promise<TMDBItem[]> {
  if (!API_KEY || providerIds.length === 0) return [];
  const params = new URLSearchParams({
    api_key: API_KEY,
    with_genres: genreIds.join(','),
    with_watch_providers: providerIds.join('|'),
    watch_region: 'US',
    sort_by: 'vote_average.desc',
    'vote_count.gte': '200',
    include_adult: 'false',
  });
  const res = await fetch(`${TMDB_BASE}/discover/${type}?${params}`);
  if (!res.ok) return [];
  const d = await res.json();
  return (d.results || []).slice(0, 20);
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  return NextResponse.json(data || []);
}

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch all user context in parallel
  const [subsRes, tasteRes, lovedRecsRes, browseFeedRes, prevRecsRes] = await Promise.all([
    supabase.from('subscriptions').select('service_name').eq('user_id', user.id),
    supabase.from('taste_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('recommendations')
      .select('title, tmdb_id, media_type')
      .eq('user_id', user.id)
      .eq('user_feedback', 'loved')
      .not('tmdb_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('browse_feedback')
      .select('title, tmdb_id, media_type')
      .eq('user_id', user.id)
      .eq('feedback', 'thumbs_up')
      .not('tmdb_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('recommendations')
      .select('tmdb_id, title, user_feedback')
      .eq('user_id', user.id)
      .limit(100),
  ]);

  const services = (subsRes.data || []).map((s: { service_name: string }) => s.service_name);
  const taste = tasteRes.data;
  const userProviderIds = services.map((n: string) => PROVIDER_IDS[n]).filter(Boolean) as number[];

  // Combine loved signals from both tables, deduplicate by tmdb_id
  const lovedMap = new Map<number, { title: string; tmdb_id: number; media_type: string }>();
  for (const item of [...(lovedRecsRes.data || []), ...(browseFeedRes.data || [])]) {
    if (item.tmdb_id && !lovedMap.has(item.tmdb_id)) lovedMap.set(item.tmdb_id, item);
  }
  const lovedItems = Array.from(lovedMap.values());

  // Track already-seen tmdb_ids and rejected titles to avoid repeats
  const seenTmdbIds = new Set<number>(
    (prevRecsRes.data || []).filter((r: { tmdb_id: number | null }) => r.tmdb_id).map((r: { tmdb_id: number }) => r.tmdb_id)
  );
  const rejectedTitles = new Set<string>(
    (prevRecsRes.data || [])
      .filter((r: { user_feedback: string | null }) => r.user_feedback === 'not_interested')
      .map((r: { title: string }) => r.title.toLowerCase())
  );

  // --- Step 1: Gather TMDB candidates from loved items ---
  const rawCandidates: Array<TMDBItem & { _type: 'movie' | 'tv'; _source: string }> = [];

  for (const loved of lovedItems.slice(0, 6)) {
    const type = loved.media_type as 'movie' | 'tv';
    const items = await fetchTMDBRecs(loved.tmdb_id, type);
    for (const item of items) {
      rawCandidates.push({ ...item, _type: type, _source: loved.title });
    }
  }

  // --- Step 2: If fewer than 15 candidates, supplement with genre-based discovery ---
  if (rawCandidates.length < 15 && taste) {
    const GENRE_IDS: Record<string, number[]> = {
      'Action': [28, 10759], 'Adventure': [12], 'Animation': [16], 'Comedy': [35],
      'Crime': [80], 'Documentary': [99], 'Drama': [18], 'Fantasy': [14, 10765],
      'Horror': [27], 'Mystery': [9648], 'Romance': [10749], 'Sci-Fi': [878, 10765],
      'Thriller': [53], 'K-Drama': [], 'True Crime': [80, 99], 'Western': [37],
    };
    const favoriteGenreIds = (taste.favorite_genres || []).flatMap((g: string) => GENRE_IDS[g] || []);
    if (favoriteGenreIds.length > 0) {
      const [movieItems, tvItems] = await Promise.all([
        discoverByGenreIds(favoriteGenreIds, 'movie', userProviderIds),
        discoverByGenreIds(favoriteGenreIds, 'tv', userProviderIds),
      ]);
      for (const item of movieItems) rawCandidates.push({ ...item, _type: 'movie', _source: 'your taste profile' });
      for (const item of tvItems) rawCandidates.push({ ...item, _type: 'tv', _source: 'your taste profile' });
    }
  }

  // --- Step 3: Deduplicate and filter out already-seen/rejected ---
  const seen = new Set<number>();
  const filtered = rawCandidates.filter(item => {
    if (!item.id || seen.has(item.id)) return false;
    if (seenTmdbIds.has(item.id)) return false;
    const title = (item.title || item.name || '').toLowerCase();
    if (rejectedTitles.has(title)) return false;
    seen.add(item.id);
    return true;
  });

  if (filtered.length === 0) {
    return NextResponse.json({ error: 'Not enough data yet — love some content in Browse to improve picks!' }, { status: 400 });
  }

  // --- Step 4: Check watch providers (parallel, capped at 30) ---
  const withProviders = await Promise.all(
    filtered.slice(0, 30).map(async (item) => {
      const { providerIds, link } = await getWatchProviders(item.id, item._type);
      const availableOn = services.filter((s: string) => {
        const pid = PROVIDER_IDS[s];
        return pid && providerIds.includes(pid);
      });
      return { item, availableOn, watchLink: link };
    })
  );

  // Prioritize titles on user's services
  withProviders.sort((a, b) => b.availableOn.length - a.availableOn.length);

  // Build candidate list for Claude
  const candidateList = withProviders.slice(0, 20).map(({ item, availableOn }) => ({
    tmdb_id: item.id,
    title: item.title || item.name || '',
    year: (item.release_date || item.first_air_date || '').split('-')[0] || null,
    media_type: item._type,
    rating: Math.round((item.vote_average || 0) * 10) / 10,
    overview: (item.overview || '').slice(0, 200),
    available_on: availableOn,
    because_of: item._source,
  }));

  // --- Step 5: Claude picks best 8 and writes personal reasons ---
  const lovedTitles = lovedItems.map(i => i.title);
  const favTitles = ((taste?.favorite_titles || []) as Array<{ title: string; year: number | null }>)
    .map(t => t.title);

  const prompt = `You are a personalized media recommendation engine. Select the 8 best picks for this user from the verified candidates below and explain WHY each one fits them specifically.

User's signal (what they've loved):
${lovedTitles.length > 0 ? lovedTitles.join(', ') : 'No loved titles yet'}
${favTitles.length > 0 ? `Favorite titles from their profile: ${favTitles.join(', ')}` : ''}
${taste?.favorite_genres?.length > 0 ? `Favorite genres: ${(taste.favorite_genres as string[]).join(', ')}` : ''}
${taste?.disliked_genres?.length > 0 ? `Genres to avoid: ${(taste.disliked_genres as string[]).join(', ')}` : ''}

Verified candidates (real titles confirmed on streaming):
${candidateList.map((c, i) => `${i + 1}. [id:${c.tmdb_id}] "${c.title}" (${c.year}, ${c.media_type}, ⭐${c.rating}) — on: ${c.available_on.join(', ') || 'not on their services'} — because of: ${c.because_of}
   Overview: ${c.overview}`).join('\n')}

Rules:
- Prefer titles available on their services
- Avoid titles in disliked genres
- Write 1-2 sentence reasons referencing their specific loved content or genres
- Pick a mix of movies and TV shows
- Do NOT invent or modify any title — only use the exact candidates above

Respond ONLY with a JSON array, no other text:
[{"tmdb_id": number, "reason": "string"}, ...]`;

  let pickedIds: Array<{ tmdb_id: number; reason: string }> = [];
  try {
    const raw = await getRecommendations(prompt);
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    pickedIds = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }

  // --- Step 6: Map Claude picks back to full candidate data ---
  const candidateMap = new Map(withProviders.map(({ item, availableOn, watchLink }) => [
    item.id,
    { item, availableOn, watchLink },
  ]));

  const enriched = pickedIds
    .map(pick => {
      const found = candidateMap.get(pick.tmdb_id);
      if (!found) return null;
      const { item, availableOn, watchLink } = found;
      return {
        user_id: user.id,
        title: item.title || item.name || '',
        media_type: item._type,
        service_name: availableOn[0] || null,
        tmdb_id: item.id,
        poster_url: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
        ai_reason: pick.reason,
        user_feedback: null,
        available_on: availableOn,
        watch_link: watchLink,
      };
    })
    .filter(Boolean);

  if (enriched.length === 0) {
    return NextResponse.json({ error: 'Could not match recommendations to verified titles' }, { status: 500 });
  }

  const { data: saved, error } = await supabase
    .from('recommendations')
    .insert(enriched)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(saved);
}

export async function PATCH(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, user_feedback } = await req.json();
  const { data, error } = await supabase
    .from('recommendations')
    .update({ user_feedback })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
