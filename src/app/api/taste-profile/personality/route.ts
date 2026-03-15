import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
}

const VIBE_LABELS: Record<string, string> = {
  slow_burn: 'slow burn', fast_paced: 'fast-paced',
  comfort: 'comfort watch', cerebral: 'cerebral',
  true_stories: 'true stories', fiction: 'pure fiction',
  light: 'light & funny', dark: 'dark & intense',
  solo: 'solo viewing', social: 'group watch',
  binge: 'binge-worthy', savor: 'one at a time',
};

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('taste_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'No taste profile found' }, { status: 404 });

  const prefs = (profile.preferences as Record<string, unknown>) || {};
  const vibes = (prefs.vibes as Record<string, string>) || {};
  const dealbreakers = (prefs.dealbreakers as string[]) || [];

  const vibeDescription = Object.entries(vibes)
    .map(([, v]) => VIBE_LABELS[v] ?? v)
    .join(', ');

  const prompt = `You are a witty entertainment personality generator for SubSync, a subscription streaming app.

Based on this user's taste profile, generate a fun, memorable personality label and description.

Their data:
- Favorite genres: ${(profile.favorite_genres as string[] || []).join(', ') || 'not set'}
- Favorite titles: ${((profile.favorite_titles as Array<{ title: string }>) || []).map(t => t.title).join(', ') || 'not set'}
- Disliked genres: ${(profile.disliked_genres as string[] || []).join(', ') || 'none'}
- Vibe preferences: ${vibeDescription || 'not set'}
- Dealbreakers: ${dealbreakers.join(', ') || 'none'}

Rules:
- The label should be 2-4 words, catchy, and slightly playful (like a Buzzfeed quiz result). Examples: "The Prestige Snob", "The Cozy Rewatcher", "The Chaos Goblin", "The Documentary Junkie", "The Anime Architect", "The True Crime Addict", "The Comfort Binger", "The Plot Twist Hunter", "The Cinematic Loner", "The Weekend Warrior"
- The description should be 1-2 sentences that feel personal and a little funny — like a friend roasting you affectionately
- Also return the user's top 3 vibe words based on their preferences
- Tone: warm, witty, not cringey. Think Spotify Wrapped energy.

Respond ONLY with JSON:
{"label":"string","description":"string","top_vibes":["string","string","string"]}`;

  let personality: { label: string; description: string; top_vibes: string[] };

  try {
    const msg = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    personality = JSON.parse(extractJSON(text));
  } catch (err) {
    console.error('[personality] Claude error:', err);
    // Fallback personality
    personality = {
      label: 'The Taste Curator',
      description: "You know exactly what you like and you're not afraid to show it.",
      top_vibes: Object.values(vibes).slice(0, 3).map(v => VIBE_LABELS[v] ?? v),
    };
  }

  // Save personality back into preferences
  const updatedPrefs = { ...prefs, personality };
  const { error } = await supabase
    .from('taste_profiles')
    .update({ preferences: updatedPrefs, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);

  if (error) console.error('[personality] save error:', error.message);

  return NextResponse.json({ personality });
}
