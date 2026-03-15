import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

async function refreshSpotifyToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get stored Spotify tokens
  const { data: profile } = await supabase
    .from('profiles')
    .select('spotify_access_token, spotify_refresh_token')
    .eq('id', user.id)
    .single();

  if (!profile?.spotify_access_token) {
    return NextResponse.json({ error: 'Spotify not connected', connected: false }, { status: 200 });
  }

  let accessToken = profile.spotify_access_token;

  // Try to fetch top tracks
  const fetchTopTracks = async (token: string) => {
    return fetch('https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=medium_term', {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  let res = await fetchTopTracks(accessToken);

  // If 401, try refreshing
  if (res.status === 401 && profile.spotify_refresh_token) {
    const newToken = await refreshSpotifyToken(profile.spotify_refresh_token);
    if (newToken) {
      accessToken = newToken;
      await supabase.from('profiles').update({ spotify_access_token: newToken }).eq('id', user.id);
      res = await fetchTopTracks(accessToken);
    }
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch Spotify data', connected: true }, { status: 200 });
  }

  const data = await res.json();
  const tracks = (data.items || []).map((t: Record<string, unknown>) => {
    const artists = t.artists as Array<{ name: string }>;
    const album = t.album as { name: string; images: Array<{ url: string }> };
    return {
      id: t.id as string,
      name: t.name as string,
      artist: artists.map(a => a.name).join(', '),
      album: album?.name,
      image: album?.images?.[0]?.url || null,
      spotify_url: (t.external_urls as { spotify?: string })?.spotify || null,
    };
  });

  return NextResponse.json({ connected: true, tracks });
}
