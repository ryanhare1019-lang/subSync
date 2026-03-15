import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { PROVIDER_IDS } from '@/lib/tmdb';

const TMDB_BASE = 'https://api.themoviedb.org/3';

// Direct search URLs for each streaming service (avoids JustWatch middleman)
const SERVICE_SEARCH_URLS: Record<number, (title: string) => string> = {
  8: (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  15: (t) => `https://www.hulu.com/search?q=${encodeURIComponent(t)}`,
  337: (t) => `https://www.disneyplus.com/search/${encodeURIComponent(t)}`,
  1899: (t) => `https://www.max.com/search?q=${encodeURIComponent(t)}`,
  9: (t) => `https://www.amazon.com/s?k=${encodeURIComponent(t)}&i=instant-video`,
  350: (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}`,
  386: (t) => `https://www.peacocktv.com/watch/asset/movies/search?q=${encodeURIComponent(t)}`,
  531: (t) => `https://www.paramountplus.com/search/${encodeURIComponent(t)}/`,
  283: (t) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,
  188: (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(t)}`,
};

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  const type = req.nextUrl.searchParams.get('type') as 'movie' | 'tv' | null;
  // Optional: service hint from the browse page (faster, no extra API call needed)
  const serviceHint = req.nextUrl.searchParams.get('service');
  if (!id || !type) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const API_KEY = process.env.TMDB_API_KEY;
  if (!API_KEY) return NextResponse.json({ link: null });

  // Fetch title in parallel with watch providers
  const [detailRes, provRes] = await Promise.all([
    fetch(`${TMDB_BASE}/${type}/${id}?api_key=${API_KEY}`),
    fetch(`${TMDB_BASE}/${type}/${id}/watch/providers?api_key=${API_KEY}`),
  ]);

  const detail = detailRes.ok ? await detailRes.json() : null;
  const title = detail ? (type === 'movie' ? detail.title : detail.name) : '';

  // If caller gave us a service hint, use it directly
  if (serviceHint) {
    const providerId = PROVIDER_IDS[serviceHint];
    if (providerId && SERVICE_SEARCH_URLS[providerId]) {
      return NextResponse.json({ link: SERVICE_SEARCH_URLS[providerId](title) });
    }
  }

  if (!provRes.ok) return NextResponse.json({ link: null });
  const provData = await provRes.json();
  const us = provData.results?.US;
  const flatrate: { provider_id: number }[] = us?.flatrate || [];

  // Try each provider with a direct search URL
  for (const p of flatrate) {
    const urlFn = SERVICE_SEARCH_URLS[p.provider_id];
    if (urlFn) {
      return NextResponse.json({ link: urlFn(title) });
    }
  }

  // Last resort: JustWatch aggregator link from TMDB
  if (us?.link) return NextResponse.json({ link: us.link });

  return NextResponse.json({ link: null });
}
