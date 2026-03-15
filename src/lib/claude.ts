import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function getRecommendations(prompt: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
  return content.text;
}

export function buildRecommendationPrompt({
  services,
  favoriteGenres,
  favoriteTitles,
  dislikedGenres,
  lovedRecs,
  rejectedRecs,
}: {
  services: string[];
  favoriteGenres: string[];
  favoriteTitles: Array<{ title: string; year: number | null }>;
  dislikedGenres: string[];
  lovedRecs: string[];
  rejectedRecs: string[];
}): string {
  const lovedSection = lovedRecs.length > 0
    ? `Titles they have explicitly LOVED (use these as your PRIMARY signal — find content with very similar vibes, themes, directors, or cast): ${lovedRecs.join(', ')}`
    : 'No loved titles yet.';

  const rejectedSection = rejectedRecs.length > 0
    ? `Titles they REJECTED (never recommend these or anything similar): ${rejectedRecs.join(', ')}`
    : '';

  return `You are a personalized media recommendation engine. Your #1 job is to find content the user will love based on their actual watch history and explicit feedback.

User profile:
- Active services: ${services.length > 0 ? services.join(', ') : 'None specified'}
- Favorite genres: ${favoriteGenres.length > 0 ? favoriteGenres.join(', ') : 'Not specified'}
- Favorite titles they listed: ${favoriteTitles.length > 0 ? favoriteTitles.map(t => `${t.title}${t.year ? ` (${t.year})` : ''}`).join(', ') : 'Not specified'}
- Genres to AVOID (never recommend these): ${dislikedGenres.length > 0 ? dislikedGenres.join(', ') : 'None'}
- ${lovedSection}
${rejectedSection ? `- ${rejectedSection}` : ''}

Instructions:
1. If they have loved titles, base at least 4 of your picks on the DNA of those loved titles (similar genre, tone, creator, cast, or themes).
2. Strictly avoid any genres listed in "Genres to AVOID".
3. Prioritize content on their active services. You may include 1-2 picks from other services if they are exceptional matches.
4. Do NOT recommend anything in the rejected list or anything very similar to it.
5. Vary the media type across picks (mix movies, TV shows — do not give all the same type).

Generate 6-8 recommendations. For each, write 1-2 sentences explaining exactly why THIS user would love it, referencing their loved titles or genres where relevant.

Respond ONLY with a JSON array, no other text. Each object: title (string), media_type ("movie" or "tv"), service (string), reason (string), year (number or null).`;
}
