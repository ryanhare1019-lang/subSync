import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getRecommendations } from '@/lib/claude';
import { PROVIDER_IDS, getWatchProviders } from '@/lib/tmdb';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const API_KEY = process.env.TMDB_API_KEY;

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

const TMDB_GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
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
  genre_ids?: number[];
}

async function fetchCredits(tmdbId: number, type: 'movie' | 'tv'): Promise<string[]> {
  if (!API_KEY) return [];
  const res = await fetch(`${TMDB_BASE}/${type}/${tmdbId}/credits?api_key=${API_KEY}&language=en-US`);
  if (!res.ok) return [];
  const data = await res.json();
  const cast: Array<{ name: string; order: number }> = data.cast || [];
  return cast.sort((a, b) => a.order - b.order).slice(0, 3).map(c => c.name);
}

function buildFallbackReason(item: TMDBItem, type: 'movie' | 'tv', stars: string[]): string {
  const genreNames = (item.genre_ids || []).slice(0, 2).map(id => TMDB_GENRE_NAMES[id]).filter(Boolean);
  const genrePart = genreNames.length > 0 ? genreNames.join('/') + ' ' : '';
  const starPart = stars.length > 0 ? ` starring ${stars.slice(0, 2).join(' and ')}` : '';
  const rating = item.vote_average ? ` — rated ${Math.round(item.vote_average * 10) / 10}/10` : '';
  return `A ${genrePart}${type}${starPart}${rating} that matches your taste profile.`;
}

type RawCandidate = TMDBItem & { _type: 'movie' | 'tv'; _source: string };

function extractJSON(text: string): string {
  let s = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);
  return s;
}

/** Detect whether the user primarily watches movies, TV, or both */
function detectPreferredTypes(
  lovedItems: Array<{ media_type: string }>,
  allPrevRecs: Array<{ media_type?: string }>,
  allBrowseFeedback: Array<{ media_type?: string }>
): ('movie' | 'tv')[] {
  let movies = 0, tv = 0;
  const count = (type: string | undefined) => {
    if (type === 'movie') movies++;
    else if (type === 'tv') tv++;
  };
  lovedItems.forEach(i => count(i.media_type));
  allPrevRecs.forEach(i => count(i.media_type));
  allBrowseFeedback.forEach(i => count(i.media_type));

  const total = movies + tv;
  if (total === 0) return ['movie', 'tv'];
  if (movies / total >= 0.8) return ['movie'];
  if (tv / total >= 0.8) return ['tv'];
  return ['movie', 'tv'];
}

async function fetchTMDBRecs(tmdbId: number, type: 'movie' | 'tv', cap = 6): Promise<TMDBItem[]> {
  if (!API_KEY) return [];
  const [recsRes, simRes] = await Promise.all([
    fetch(`${TMDB_BASE}/${type}/${tmdbId}/recommendations?api_key=${API_KEY}&language=en-US&page=1`),
    fetch(`${TMDB_BASE}/${type}/${tmdbId}/similar?api_key=${API_KEY}&language=en-US&page=1`),
  ]);
  const results: TMDBItem[] = [];
  if (recsRes.ok) results.push(...((await recsRes.json()).results || []).slice(0, cap));
  if (simRes.ok) results.push(...((await simRes.json()).results || []).slice(0, Math.floor(cap / 2)));
  return results;
}

async function discoverByGenreIds(
  genreIds: number[],
  type: 'movie' | 'tv',
  providerIds: number[],
  excludeGenreIds: number[] = []
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
  if (providerIds.length > 0) {
    params.set('with_watch_providers', providerIds.join('|'));
    params.set('watch_region', 'US');
  }
  if (excludeGenreIds.length > 0) {
    params.set('without_genres', excludeGenreIds.join(','));
  }
  const res = await fetch(`${TMDB_BASE}/discover/${type}?${params}`);
  if (!res.ok) return [];
  return ((await res.json()).results || []).slice(0, 15);
}

async function searchAndSeed(title: string): Promise<{ tmdbId: number; type: 'movie' | 'tv' } | null> {
  if (!API_KEY) return null;
  const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(title)}&language=en-US`);
  if (!res.ok) return null;
  const top = ((await res.json()).results || []).find(
    (r: { media_type: string }) => r.media_type === 'movie' || r.media_type === 'tv'
  );
  if (!top) return null;
  return { tmdbId: top.id, type: top.media_type as 'movie' | 'tv' };
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

  // Fetch all user signals in parallel
  const [subsRes, tasteRes, lovedRecsRes, browseFeedRes, prevRecsRes, allBrowseFeedRes] = await Promise.all([
    supabase.from('subscriptions').select('service_name').eq('user_id', user.id),
    supabase.from('taste_profiles').select('*').eq('user_id', user.id).single(),
    // Loved items from discover tab
    supabase.from('recommendations')
      .select('title, tmdb_id, media_type')
      .eq('user_id', user.id).eq('user_feedback', 'loved')
      .not('tmdb_id', 'is', null).order('created_at', { ascending: false }).limit(10),
    // Thumbs-up from browse tab
    supabase.from('browse_feedback')
      .select('title, tmdb_id, media_type')
      .eq('user_id', user.id).eq('feedback', 'thumbs_up')
      .not('tmdb_id', 'is', null).order('created_at', { ascending: false }).limit(10),
    // All previous recs (for seen-dedup + media type counting)
    supabase.from('recommendations')
      .select('tmdb_id, title, media_type, user_feedback')
      .eq('user_id', user.id).limit(100),
    // All browse feedback (for media type counting)
    supabase.from('browse_feedback')
      .select('media_type')
      .eq('user_id', user.id).limit(200),
  ]);

  const services: string[] = (subsRes.data || []).map((s: { service_name: string }) => s.service_name);
  const taste = tasteRes.data;
  const videoServices = services.filter(n => VIDEO_PROVIDER_IDS[n]);
  const userProviderIds = videoServices.map(n => VIDEO_PROVIDER_IDS[n]);

  // Deduplicate loved items from both tables
  const lovedMap = new Map<number, { title: string; tmdb_id: number; media_type: string }>();
  for (const item of [...(lovedRecsRes.data || []), ...(browseFeedRes.data || [])]) {
    if (item.tmdb_id && !lovedMap.has(item.tmdb_id)) lovedMap.set(item.tmdb_id, item);
  }
  const lovedItems = Array.from(lovedMap.values());

  // --- Detect preferred media type ---
  const preferredTypes = detectPreferredTypes(
    lovedItems,
    prevRecsRes.data || [],
    allBrowseFeedRes.data || []
  );

  // Seen + rejected filters
  const seenTmdbIds = new Set<number>(
    (prevRecsRes.data || []).filter((r: { tmdb_id: number | null }) => r.tmdb_id)
      .map((r: { tmdb_id: number }) => r.tmdb_id)
  );
  const rejectedTitles = new Set<string>(
    (prevRecsRes.data || [])
      .filter((r: { user_feedback: string | null }) => r.user_feedback === 'not_interested')
      .map((r: { title: string }) => r.title.toLowerCase())
  );

  // Disliked genre IDs for server-side filtering
  const dislikedGenreIds = [
    ...new Set(
      ((taste?.disliked_genres as string[]) || []).flatMap(g => GENRE_IDS[g] || [])
    )
  ];

  const rawCandidates: RawCandidate[] = [];

  // --- Step 1: Seed from loved items (capped per source for diversity) ---
  for (const loved of lovedItems.slice(0, 8)) {
    const type = loved.media_type as 'movie' | 'tv';
    if (!preferredTypes.includes(type)) continue;
    const items = await fetchTMDBRecs(loved.tmdb_id, type, 5); // cap 5 per loved item
    for (const item of items) rawCandidates.push({ ...item, _type: type, _source: loved.title });
  }

  // --- Step 2: Always seed from taste profile favorite titles ---
  const profileTitles: Array<{ title: string }> = taste?.favorite_titles || [];
  const profileSeeds = profileTitles.slice(0, 4);
  await Promise.all(
    profileSeeds.map(async (fav) => {
      const found = await searchAndSeed(fav.title);
      if (!found) return;
      if (!preferredTypes.includes(found.type)) return;
      const items = await fetchTMDBRecs(found.tmdbId, found.type, 4);
      for (const item of items) rawCandidates.push({ ...item, _type: found.type, _source: fav.title });
    })
  );

  // --- Step 3: Genre-based discovery for each preferred type ---
  const favGenres: string[] = taste?.favorite_genres || [];
  const genresToUse = favGenres.length > 0 ? favGenres : ['Drama', 'Comedy', 'Action', 'Thriller'];

  // Split genres into groups so we get variety across different genres
  const genreGroups = genresToUse.map(g => ({ name: g, ids: GENRE_IDS[g] || [] })).filter(g => g.ids.length > 0);

  await Promise.all(
    preferredTypes.flatMap(type =>
      genreGroups.slice(0, 4).map(async (group) => {
        const items = await discoverByGenreIds(group.ids, type, userProviderIds, dislikedGenreIds);
        for (const item of items) rawCandidates.push({ ...item, _type: type, _source: `${group.name} picks` });
      })
    )
  );

  // --- Step 4: Deduplicate and filter ---
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
      { error: 'Set up your taste profile and love some titles in Browse — your picks will appear here.' },
      { status: 400 }
    );
  }

  // All project video service names (supported by the app)
  const ALL_PROJECT_SERVICES = Object.keys(VIDEO_PROVIDER_IDS);

  // --- Step 5: Check watch providers (parallel, capped at 35) ---
  const withProviders = await Promise.all(
    filtered.slice(0, 35).map(async (item) => {
      try {
        const { providerIds, link } = await getWatchProviders(item.id, item._type);
        // Services the user owns that have this title
        const availableOn = services.filter((s: string) => {
          const pid = VIDEO_PROVIDER_IDS[s];
          return pid && providerIds.includes(pid);
        });
        // All project services (owned or not) that have this title
        const projectServicesAvailable = ALL_PROJECT_SERVICES.filter(s => {
          const pid = VIDEO_PROVIDER_IDS[s];
          return pid && providerIds.includes(pid);
        });
        return { item, availableOn, projectServicesAvailable, watchLink: link };
      } catch {
        return { item, availableOn: [] as string[], projectServicesAvailable: [] as string[], watchLink: null };
      }
    })
  );

  // Split into owned-service titles vs unowned-but-project-service titles
  // Exclude anything on no known project service entirely
  const onUserServices = withProviders
    .filter(w => w.availableOn.length > 0)
    .sort((a, b) => (b.item.vote_average || 0) - (a.item.vote_average || 0));

  const onProjectOnly = withProviders
    .filter(w => w.availableOn.length === 0 && w.projectServicesAvailable.length > 0)
    .sort((a, b) => (b.item.vote_average || 0) - (a.item.vote_average || 0));

  // 75% from user's services, 25% from project services they don't own
  const userSlots = 18;
  const projectSlots = 6;
  const orderedCandidates = [
    ...onUserServices.slice(0, userSlots),
    ...onProjectOnly.slice(0, projectSlots),
  ];

  // If user owns nothing on any service, fall back to showing project services only
  const finalCandidates = orderedCandidates.length > 0 ? orderedCandidates : withProviders.slice(0, 24);

  // Build candidateMap from full set for later mapping
  const candidateMap = new Map(withProviders.map(({ item, availableOn, projectServicesAvailable, watchLink }) => [
    item.id, { item, availableOn, projectServicesAvailable, watchLink },
  ]));

  const candidateList = finalCandidates.slice(0, 24).map(({ item, availableOn, projectServicesAvailable }) => ({
    tmdb_id: item.id,
    title: item.title || item.name || '',
    year: (item.release_date || item.first_air_date || '').split('-')[0] || null,
    media_type: item._type,
    rating: Math.round((item.vote_average || 0) * 10) / 10,
    genres: (item.genre_ids || []).slice(0, 3).map(id => TMDB_GENRE_NAMES[id]).filter(Boolean),
    overview: (item.overview || '').slice(0, 160),
    available_on: availableOn,
    // Show whichever service has it (user's first, then project services)
    display_services: availableOn.length > 0 ? availableOn : projectServicesAvailable,
    user_owned: availableOn.length > 0,
    because_of: item._source,
  }));

  // --- Step 6: Claude picks best 8 with diversity rules ---
  const lovedTitles = lovedItems.map(i => i.title);
  const favTitles = profileTitles.map(t => t.title);
  const mediaRule = preferredTypes.length === 1
    ? `ONLY recommend ${preferredTypes[0]} — the user exclusively interacts with this type.`
    : 'Mix movies and TV shows.';

  const prompt = `You are a personalized media recommendation engine. Pick the 8 best matches from the verified candidates below.

USER SIGNALS:
- Loved content: ${lovedTitles.length > 0 ? lovedTitles.join(', ') : 'none yet'}
- Taste profile favorites: ${favTitles.length > 0 ? favTitles.join(', ') : 'none'}
- Favorite genres: ${favGenres.join(', ') || 'not set'}
- Genres to AVOID: ${((taste?.disliked_genres as string[]) || []).join(', ') || 'none'}
- Media preference: ${preferredTypes.join(' and ')} (detected from interaction history)

CANDIDATES:
${candidateList.map((c, i) =>
  `${i + 1}. id=${c.tmdb_id} | "${c.title}" (${c.year}, ${c.media_type}, ⭐${c.rating}) | genres: ${c.genres.join(', ') || 'unknown'} | services: ${c.display_services.join(', ') || 'none'}${!c.user_owned && c.display_services.length > 0 ? ' (not subscribed)' : ''} | source: ${c.because_of}\n   ${c.overview}`
).join('\n')}

RULES:
- ${mediaRule}
- Prefer titles available on user's services
- Pick from at least 3 different genre vibes (no 8 thrillers, vary the mood)
- Avoid disliked genres strictly
- Write 1-2 sentence reasons that connect to their loved/favorite content
- Only use exact candidates above — do not invent titles

Return ONLY a JSON array:
[{"tmdb_id":number,"reason":"string"},...]`;

  let pickedIds: Array<{ tmdb_id: number; reason: string }> = [];
  try {
    const raw = await getRecommendations(prompt);
    const cleaned = extractJSON(raw);
    pickedIds = JSON.parse(cleaned);
    if (!Array.isArray(pickedIds)) throw new Error('Not an array');
  } catch (err) {
    console.error('Claude parse error:', err);
    // Fetch credits for top 8 candidates so fallback reasons are informative
    const fallbackCandidates = candidateList.slice(0, 8);
    const fallbackCredits = await Promise.all(
      fallbackCandidates.map(c => fetchCredits(c.tmdb_id, c.media_type))
    );
    pickedIds = fallbackCandidates.map((c, i) => ({
      tmdb_id: c.tmdb_id,
      reason: buildFallbackReason(
        withProviders.find(w => w.item.id === c.tmdb_id)?.item || { id: c.tmdb_id },
        c.media_type,
        fallbackCredits[i]
      ),
    }));
  }

  // --- Step 7: Map picks to full data ---
  const enriched = pickedIds
    .map(pick => {
      const found = candidateMap.get(pick.tmdb_id);
      if (!found) return null;
      const { item, availableOn, projectServicesAvailable } = found;
      const displayServices = availableOn.length > 0 ? availableOn : projectServicesAvailable;
      return {
        user_id: user.id,
        title: item.title || item.name || '',
        media_type: item._type,
        service_name: displayServices[0] || null,
        tmdb_id: item.id,
        poster_url: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
        ai_reason: pick.reason,
        user_feedback: null,
        _display_services: displayServices,
        _user_owned: availableOn.length > 0,
        _watch_link: found.watchLink,
      };
    })
    .filter(Boolean);

  if (enriched.length === 0) {
    return NextResponse.json({ error: 'Could not match picks — try refreshing.' }, { status: 500 });
  }

  // Strip temp fields before inserting into DB
  const toInsert = enriched.map((r) => {
    const rec = r as Record<string, unknown>;
    const { _display_services, _user_owned, _watch_link, ...dbFields } = rec;
    void _display_services; void _user_owned; void _watch_link;
    return dbFields;
  });

  const { data: saved, error } = await supabase
    .from('recommendations')
    .insert(toInsert)
    .select();

  if (error) {
    console.error('Supabase insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Re-attach display info in-memory for the response
  const withExtra = (saved || []).map((rec: Record<string, unknown>) => {
    const original = (enriched as Record<string, unknown>[]).find(e => (e as Record<string, unknown>).tmdb_id === rec.tmdb_id);
    return {
      ...rec,
      available_on: (original as Record<string, unknown>)?._display_services || [],
      watch_link: (original as Record<string, unknown>)?._watch_link || null,
      user_owned_service: (original as Record<string, unknown>)?._user_owned ?? true,
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

  // Auto-log activity for loved/watched feedback
  if ((user_feedback === 'loved' || user_feedback === 'watched') && data?.service_name) {
    await supabase.from('activity_log').insert({
      user_id: user.id,
      service_name: data.service_name,
      activity_type: user_feedback === 'loved' ? 'saved' : 'watched',
      source: 'rec_feedback',
      title: data.title || null,
    });
  }

  return NextResponse.json(data);
}
