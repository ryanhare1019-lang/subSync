import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'SPOTIFY_CLIENT_ID not configured' }, { status: 503 });
  }
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${process.env.NEXT_PUBLIC_URL}/api/spotify/callback`;
  const scopes = 'user-top-read user-read-recently-played user-library-read playlist-read-private';
  const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
  return NextResponse.redirect(url);
}
