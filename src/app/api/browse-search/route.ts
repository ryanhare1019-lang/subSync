import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { searchTMDB, getWatchProviders, PROVIDER_IDS } from '@/lib/tmdb';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

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
      };
    })
  );

  return NextResponse.json(enriched);
}
