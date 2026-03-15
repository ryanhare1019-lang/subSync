import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getRecommendations } from '@/lib/claude';
import { PROVIDER_IDS, getWatchProviders } from '@/lib/tmdb';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const API_KEY = process.env.TMDB_API_KEY;

// Video-only provider IDs (exclude music services)
const VIDEO_PROVIDER_IDS: Record<string, number> = Object.fromEntries(
  Object.entries(PROVIDER_IDS).filter(([name]) =>
    !['Spotify', 'Apple Music', 'Tidal'].includes(name)
  )
);

const GENRE_IDS: Record<string, number[]> = {
  'Action': [28, 10759], 'Adventure': [12], 'Animation': [16], 'Comedy': [35],
  'Crime': [80], 'Documentary': [99], 'Drama': [18], 'Fantasy': [14, 10765],
  'Horror': [27], 'Mystery': [9648], 'Romance': [10749], 'Sci-Fi': [878, 10765],
  'Thriller': [53], 'True Crime': [80, 99], 'Western': [37],
};

interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
}

type RawCandidate = TMDBItem & { _type: 'movie' | 'tv'; _source: string };

function extractJSON(text: string): string {
  // Strip markdown code fences
  let s = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  // Find the outermost JSON array
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  return s;
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
    results.push(...(d.results || []).slice(0, 12));
  }
  if (simRes.ok) {
    const d = await simRes.json();
    results.push(...(d.results || []).slice(0, 8));
  }
  return results;
}

async function discoverByGenreIds(
  genreIds: number[],
  type: 'movie' | 'tv',
  providerIds: number[]
): Promise<TMDBItem[]> {
  if (!API_KEY || genreIds.length === 0) return [];
  const params = new URLSearchParams({
    api_key: API_KEY,
    with_genres: genreIds.join(','),
    sort_by: 'vote_average.desc',
    'vote_count.gte': '300',
    include_adult: 'false',
    language: 'en-US',
  });
  // Only filter by providers if user has some; otherwise show anything
  if (providerIds.length > 0) {
    params.set('with_watch_providers', providerIds.join('|'));
    params.set('watch_region', 'US');
  }
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

  const services: string[] = (subsRes.data || []).map((s: { service_name: string }) => s.service_name);
  const taste = tasteRes.data;
  const videoServices = services.filter(n => VIDEO_PROVIDER_IDS[n]);
  const userProviderIds = videoServices.map(n => VIDEO_PROVIDER_IDS[n]);

  // Combine loved signals from both tables, deduplicate by tmdb_id
  const lovedMap = new Map<number, { title: string; tmdb_id: number; media_type: string }>();
  for (const item of [...(lovedRecsRes.data || []), ...(browseFeedRes.data || [])]) {
    if (item.tmdb_id && !lovedMap.has(item.tmdb_id)) lovedMap.set(item.tmdb_id, item);
  }
  const lovedItems = Array.from(lovedMap.values());

  const seenTmdbIds = new Set<number>(
    (prevRecsRes.data || []).filter((r: { tmdb_id: number | null }) => r.tmdb_id).map((r: { tmdb_id: number }) => r.tmdb_id)
  );
  const rejectedTitles = new Set<string>(
    (prevRecsRes.data || [])
      .filter((r: { user_feedback: string | null }) => r.user_feedback === 'not_interested')
      .map((r: { title: string }) => r.title.toLowerCase())
  );

  // --- Step 1: TMDB recs from loved items ---
  const rawCandidates: RawCandidate[] = [];
  for (const loved of lovedItems.slice(0, 6)) {
    const type = loved.media_type as 'movie' | 'tv';
    const items = await fetchTMDBRecs(loved.tmdb_id, type);
    for (const item of items) rawCandidates.push({ ...item, _type: type, _source: loved.title });
  }

  // --- Step 2: Supplement with genre-based discovery ---
  if (rawCandidates.length < 20) {
    const favGenres: string[] = taste?.favorite_genres || [];
    const profileTitles: Array<{ title: string }> = taste?.favorite_titles || [];

    // Use favorite genres, or fall back to popular drama/comedy if none set
    const genresToUse = favGenres.length > 0 ? favGenres : ['Drama', 'Comedy', 'Action'];
    const genreIdList = [...new Set(genresToUse.flatMap(g => GENRE_IDS[g] || []))];

    if (genreIdList.length > 0) {
      const [movieItems, tvItems] = await Promise.all([
        discoverByGenreIds(genreIdList, 'movie', userProviderIds),
        discoverByGenreIds(genreIdList, 'tv', userProviderIds),
      ]);
      for (const item of movieItems) rawCandidates.push({ ...item, _type: 'movie', _source: 'your taste profile' });
      for (const item of tvItems) rawCandidates.push({ ...item, _type: 'tv', _source: 'your taste profile' });
    }

    // If still nothing, try popular titles from taste profile favorites via TMDB search
    if (rawCandidates.length === 0 && profileTitles.length > 0) {
      for (const fav of profileTitles.slice(0, 3)) {
        const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(fav.title)}`);
        if (!res.ok) continue;
        const d = await res.json();
        const top = (d.results || []).find((r: { media_type: string }) => r.media_type === 'movie' || r.media_type === 'tv');
        if (!top) continue;
        const type = top.media_type as 'movie' | 'tv';
        const items = await fetchTMDBRecs(top.id, type);
        for (const item of items) rawCandidates.push({ ...item, _type: type, _source: fav.title });
      }
    }
  }

  // --- Step 3: Deduplicate and filter ---
  const deduped = new Set<number>();
  const filtered = rawCandidates.filter(item => {
    if (!item.id || deduped.has(item.id)) return false;
    if (seenTmdbIds.has(item.id)) return false;
    const title = (item.title || item.name || '').toLowerCase();
    if (rejectedTitles.has(title)) return false;
    deduped.add(item.id);
    return true;
  });

  if (filtered.length === 0) {
    return NextResponse.json(
      { error: 'Add subscriptions and set up your taste profile, then love some titles in Browse — your picks will appear here.' },
      { status: 400 }
    );
  }

  // --- Step 4: Check watch providers (parallel, capped at 30) ---
  const withProviders = await Promise.all(
    filtered.slice(0, 30).map(async (item) => {
      try {
        const { providerIds, link } = await getWatchProviders(item.id, item._type);
        const availableOn = services.filter((s: string) => {
          const pid = VIDEO_PROVIDER_IDS[s];
          return pid && providerIds.includes(pid);
        });
        return { item, availableOn, watchLink: link };
      } catch {
        return { item, availableOn: [] as string[], watchLink: null };
      }
    })
  );

  // Prioritize titles on user's services
  withProviders.sort((a, b) => b.availableOn.length - a.availableOn.length);

  const candidateList = withProviders.slice(0, 20).map(({ item, availableOn }) => ({
    tmdb_id: item.id,
    title: item.title || item.name || '',
    year: (item.release_date || item.first_air_date || '').split('-')[0] || null,
    media_type: item._type,
    rating: Math.round((item.vote_average || 0) * 10) / 10,
    overview: (item.overview || '').slice(0, 180),
    available_on: availableOn,
    because_of: item._source,
  }));

  // --- Step 5: Claude picks best 8 ---
  const lovedTitles = lovedItems.map(i => i.title);
  const favTitles = ((taste?.favorite_titles || []) as Array<{ title: string }>).map(t => t.title);

  const prompt = `You are a personalized media recommendation engine. Pick the 8 best matches for this user from the verified candidates and explain why each fits them.

User loved: ${lovedTitles.length > 0 ? lovedTitles.join(', ') : 'nothing yet'}
Taste profile favorites: ${favTitles.length > 0 ? favTitles.join(', ') : 'none'}
Favorite genres: ${(taste?.favorite_genres as string[] || []).join(', ') || 'none'}
Genres to avoid: ${(taste?.disliked_genres as string[] || []).join(', ') || 'none'}

Candidates:
${candidateList.map((c, i) =>
  `${i + 1}. id=${c.tmdb_id} | "${c.title}" (${c.year}, ${c.media_type}, ⭐${c.rating}) | on: ${c.available_on.join(', ') || 'unknown'} | via: ${c.because_of} | ${c.overview}`
).join('\n')}

Rules: prefer titles on user's services, avoid disliked genres, reference loved content in reasons, mix movies and TV.
Return ONLY a JSON array — no prose, no markdown:
[{"tmdb_id":number,"reason":"string"},...]`;

  const candidateMap = new Map(withProviders.map(({ item, availableOn, watchLink }) => [
    item.id, { item, availableOn, watchLink },
  ]));

  let pickedIds: Array<{ tmdb_id: number; reason: string }> = [];
  try {
    const raw = await getRecommendations(prompt);
    const cleaned = extractJSON(raw);
    pickedIds = JSON.parse(cleaned);
    if (!Array.isArray(pickedIds)) throw new Error('Not an array');
  } catch (err) {
    console.error('Claude parse error:', err);
    // Fallback: use top 8 candidates with a generic reason
    pickedIds = candidateList.slice(0, 8).map(c => ({
      tmdb_id: c.tmdb_id,
      reason: `Highly rated ${c.media_type} that matches your taste profile.`,
    }));
  }

  // --- Step 6: Map picks to full data ---
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
      };
    })
    .filter(Boolean);

  if (enriched.length === 0) {
    return NextResponse.json({ error: 'Could not match picks — try refreshing.' }, { status: 500 });
  }

  const { data: saved, error } = await supabase
    .from('recommendations')
    .insert(enriched)
    .select();

  if (error) {
    console.error('Supabase insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach available_on + watch_link to returned data (in-memory, not stored)
  const withExtra = (saved || []).map((rec: Record<string, unknown>) => {
    const found = candidateMap.get(rec.tmdb_id as number);
    return {
      ...rec,
      available_on: found?.availableOn || [],
      watch_link: found?.watchLink || null,
    };
  });

  return NextResponse.json(withExtra);
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
