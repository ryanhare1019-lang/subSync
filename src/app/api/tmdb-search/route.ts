import { NextRequest, NextResponse } from 'next/server';
import { searchTMDB } from '@/lib/tmdb';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q) return NextResponse.json([]);

  const results = await searchTMDB(q);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(results.slice(0, 20).map((r: any) => ({
    id: r.id,
    title: r.title,
    name: r.name,
    poster_path: r.poster_path ?? null,
    release_date: r.release_date,
    first_air_date: r.first_air_date,
    media_type: r.media_type,
    vote_average: r.vote_average ?? 0,
    overview: r.overview ?? '',
    genre_ids: r.genre_ids ?? [],
  })));
}
