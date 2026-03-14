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
  return `You are a media recommendation engine for SubSync. The user has the following profile:

Active services: ${services.length > 0 ? services.join(', ') : 'None specified'}
Favorite genres: ${favoriteGenres.length > 0 ? favoriteGenres.join(', ') : 'Not specified'}
Favorite titles: ${favoriteTitles.length > 0 ? favoriteTitles.map(t => `${t.title}${t.year ? ` (${t.year})` : ''}`).join(', ') : 'Not specified'}
Disliked genres: ${dislikedGenres.length > 0 ? dislikedGenres.join(', ') : 'None'}
Previously recommended titles they LOVED: ${lovedRecs.length > 0 ? lovedRecs.join(', ') : 'None yet'}
Previously recommended titles they REJECTED: ${rejectedRecs.length > 0 ? rejectedRecs.join(', ') : 'None yet'}

Generate 5-8 personalized recommendations. Prioritize content available on their active services, but include 1-2 standout picks from other services if they're exceptionally strong matches. For each recommendation, explain in 1-2 sentences WHY this specific user would enjoy it based on their taste profile.

Respond ONLY with a JSON array, no other text. Each object should have: title (string), media_type (one of: movie/tv/music/podcast/book), service (string), reason (string), year (number or null).`;
}
