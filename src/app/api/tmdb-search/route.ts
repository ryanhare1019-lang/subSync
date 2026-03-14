import { NextRequest, NextResponse } from 'next/server';
import { searchTMDB } from '@/lib/tmdb';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q) return NextResponse.json([]);

  const results = await searchTMDB(q);
  return NextResponse.json(
    results.slice(0, 8).map(r => ({
      id: r.id,
      title: r.media_type === 'movie' ? (r as { title: string }).title : (r as { name: string }).name,
      year: r.media_type === 'movie'
        ? (r as { release_date?: string }).release_date?.split('-')[0] || null
        : (r as { first_air_date?: string }).first_air_date?.split('-')[0] || null,
      media_type: r.media_type,
    }))
  );
}
