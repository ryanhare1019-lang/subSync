import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { searchTMDB, getWatchProviders, PROVIDER_IDS } from '@/lib/tmdb';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const API_KEY = process.env.TMDB_API_KEY;

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.trim().length < 2) return NextResponse.json([]);

  const [tmdbResults, subsResult] = await Promise.all([
    searchTMDB(q),
    supabase.from('subscriptions').select('service_name').eq('user_id', user.id),
  ]);

  const serviceNames = (subsResult.data || []).map(s => s.service_name);
  const userProviderIds = new Set(
    serviceNames.map(n => PROVIDER_IDS[n]).filter(Boolean)
  );

  const top = tmdbResults.slice(0, 8);

  const enriched = await Promise.all(
    top.map(async (r) => {
      const type = r.media_type as 'movie' | 'tv';
      const title = type === 'movie'
        ? (r as { title: string }).title
        : (r as { name: string }).name;
      const year = type === 'movie'
        ? (r as { release_date?: string }).release_date?.split('-')[0] || null
        : (r as { first_air_date?: string }).first_air_date?.split('-')[0] || null;
      const poster_path = (r as { poster_path?: string | null }).poster_path;

      const { link, providerIds } = await getWatchProviders(r.id, type);

      const available_on = serviceNames.filter(name => {
        const pid = PROVIDER_IDS[name];
        return pid && providerIds.includes(pid);
      });

      return {
        id: r.id,
        title,
        year,
        media_type: type,
        poster_url: poster_path ? `${TMDB_IMAGE_BASE}${poster_path}` : null,
        available_on,
        watch_link: link,
        is_similar_suggestion: false,
      };
    })
  );

  // If fewer than 3 results OR top result title doesn't closely match query,
  // also fetch similar content from TMDB recommendations for the top result
  const topResult = enriched[0];
  const shouldFetchSimilar =
    enriched.length < 3 ||
    (topResult && !topResult.title.toLowerCase().includes(q.toLowerCase()));

  if (shouldFetchSimilar && topResult && API_KEY) {
    try {
      const type = topResult.media_type as 'movie' | 'tv';
      const recsRes = await fetch(
        `${TMDB_BASE}/${type}/${topResult.id}/recommendations?api_key=${API_KEY}&language=en-US&page=1`
      );
      if (recsRes.ok) {
        const recsData = await recsRes.json();
        const existingIds = new Set(enriched.map(r => r.id));

        const similar = await Promise.all(
          (recsData.results || []).slice(0, 5).map(async (r: Record<string, unknown>) => {
            if (existingIds.has(r.id as number)) return null;
            const rType = type;
            const rTitle = (rType === 'movie' ? r.title : r.name) as string;
            const rYear = (rType === 'movie'
              ? (r.release_date as string)?.split('-')[0]
              : (r.first_air_date as string)?.split('-')[0]) ?? null;
            const posterPath = r.poster_path as string | null;

            const { link: rLink, providerIds: rProviderIds } = await getWatchProviders(r.id as number, rType);
            const available_on = serviceNames.filter(name => {
              const pid = PROVIDER_IDS[name];
              return pid && rProviderIds.includes(pid);
            });

            return {
              id: r.id as number,
              title: rTitle,
              year: rYear,
              media_type: rType,
              poster_url: posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : null,
              available_on,
              watch_link: rLink,
              is_similar_suggestion: true,
            };
          })
        );

        const validSimilar = similar.filter(Boolean) as typeof enriched;
        return NextResponse.json([...enriched, ...validSimilar]);
      }
    } catch {
      // Ignore errors from recommendations fetch
    }
  }

  // Suppress unused variable warning
  void userProviderIds;

  return NextResponse.json(enriched);
}
