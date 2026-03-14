import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getRecommendations, buildRecommendationPrompt } from '@/lib/claude';
import { findTMDBEntry } from '@/lib/tmdb';
import { AIRecommendation } from '@/types';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json(data || []);
}

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch user data in parallel
  const [subsResult, tasteResult, prevRecsResult] = await Promise.all([
    supabase.from('subscriptions').select('service_name').eq('user_id', user.id),
    supabase.from('taste_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('recommendations')
      .select('title, user_feedback')
      .eq('user_id', user.id)
      .not('user_feedback', 'is', null),
  ]);

  const services = (subsResult.data || []).map(s => s.service_name);
  const taste = tasteResult.data;
  const prevRecs = prevRecsResult.data || [];

  const lovedRecs = prevRecs.filter(r => r.user_feedback === 'loved').map(r => r.title);
  const rejectedRecs = prevRecs.filter(r => r.user_feedback === 'not_interested').map(r => r.title);

  const prompt = buildRecommendationPrompt({
    services,
    favoriteGenres: taste?.favorite_genres || [],
    favoriteTitles: (taste?.favorite_titles || []) as Array<{ title: string; year: number | null }>,
    dislikedGenres: taste?.disliked_genres || [],
    lovedRecs,
    rejectedRecs,
  });

  let aiRecs: AIRecommendation[] = [];
  try {
    const raw = await getRecommendations(prompt);
    // Strip markdown code fences if Claude wraps JSON
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    aiRecs = JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Claude response:', err);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }

  // Enrich with TMDB data
  const enriched = await Promise.all(
    aiRecs.map(async (rec) => {
      let tmdbId: number | null = null;
      let posterUrl: string | null = null;

      if (rec.media_type === 'movie' || rec.media_type === 'tv') {
        try {
          const tmdb = await findTMDBEntry(rec.title, rec.media_type, rec.year);
          if (tmdb) {
            tmdbId = tmdb.id;
            posterUrl = tmdb.poster_url;
          }
        } catch {
          // TMDB lookup failed, continue without poster
        }
      }

      return {
        user_id: user.id,
        title: rec.title,
        media_type: rec.media_type,
        service_name: rec.service,
        tmdb_id: tmdbId,
        poster_url: posterUrl,
        ai_reason: rec.reason,
        user_feedback: null,
      };
    })
  );

  // Save to DB
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
