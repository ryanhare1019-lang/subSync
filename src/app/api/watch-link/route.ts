import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const TMDB_BASE = 'https://api.themoviedb.org/3';

// Maps service names to the URL prefix used in TMDB's JustWatch links
// TMDB returns a JustWatch link; we map provider IDs back to direct service URLs
const PROVIDER_DEEP_LINKS: Record<number, string> = {
  8: 'https://www.netflix.com/search?q=',       // Netflix
  15: 'https://www.hulu.com/search?q=',          // Hulu
  337: 'https://www.disneyplus.com/search/',      // Disney+
  1899: 'https://www.max.com/search?q=',          // HBO Max
  9: 'https://www.amazon.com/s?k=',              // Amazon Prime
  350: 'https://tv.apple.com/search?term=',      // Apple TV+
  386: 'https://www.peacocktv.com/search?q=',    // Peacock
  531: 'https://www.paramountplus.com/search/',  // Paramount+
  283: 'https://www.crunchyroll.com/search?q=',  // Crunchyroll
  188: 'https://www.youtube.com/results?search_query=', // YouTube Premium
};

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  const type = req.nextUrl.searchParams.get('type') as 'movie' | 'tv' | null;
  if (!id || !type) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const API_KEY = process.env.TMDB_API_KEY;
  if (!API_KEY) return NextResponse.json({ link: null });

  // Get title for search fallback
  const detailRes = await fetch(`${TMDB_BASE}/${type}/${id}?api_key=${API_KEY}`);
  const detail = detailRes.ok ? await detailRes.json() : null;
  const title = detail ? (type === 'movie' ? detail.title : detail.name) : '';

  // Get watch providers
  const provRes = await fetch(`${TMDB_BASE}/${type}/${id}/watch/providers?api_key=${API_KEY}`);
  if (!provRes.ok) return NextResponse.json({ link: null });
  const provData = await provRes.json();
  const us = provData.results?.US;

  // TMDB provides a JustWatch aggregator link — use it as the primary link
  if (us?.link) {
    return NextResponse.json({ link: us.link });
  }

  // Fallback: find the first flatrate provider we have a deep link for
  const flatrate: { provider_id: number }[] = us?.flatrate || [];
  for (const p of flatrate) {
    const base = PROVIDER_DEEP_LINKS[p.provider_id];
    if (base) {
      return NextResponse.json({ link: base + encodeURIComponent(title) });
    }
  }

  return NextResponse.json({ link: null });
}
