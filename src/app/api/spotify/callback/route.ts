import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/browse?tab=music&spotify=error', req.url));
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${process.env.NEXT_PUBLIC_URL}/api/spotify/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/browse?tab=music&spotify=error', req.url));
  }

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/browse?tab=music&spotify=error', req.url));
  }

  const tokens = await tokenRes.json();
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Store in profiles table (add spotify_access_token and spotify_refresh_token columns if needed)
    await supabase.from('profiles').update({
      spotify_access_token: tokens.access_token,
      spotify_refresh_token: tokens.refresh_token,
    }).eq('id', user.id);
  }

  return NextResponse.redirect(new URL('/browse?tab=music&spotify=connected', req.url));
}
