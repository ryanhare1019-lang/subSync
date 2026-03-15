import { ServiceOption } from '@/types';

export const STREAMING_SERVICES: ServiceOption[] = [
  { name: 'Netflix', type: 'streaming_video', defaultCost: 15.49, color: '#E50914', bgColor: 'bg-red-950' },
  { name: 'Hulu', type: 'streaming_video', defaultCost: 7.99, color: '#1CE783', bgColor: 'bg-green-950' },
  { name: 'Disney+', type: 'streaming_video', defaultCost: 7.99, color: '#113CCF', bgColor: 'bg-blue-950' },
  { name: 'HBO Max', type: 'streaming_video', defaultCost: 15.99, color: '#B147F5', bgColor: 'bg-purple-950' },
  { name: 'Amazon Prime', type: 'streaming_video', defaultCost: 8.99, color: '#00A8E0', bgColor: 'bg-sky-950' },
  { name: 'Apple TV+', type: 'streaming_video', defaultCost: 9.99, color: '#A2AAAD', bgColor: 'bg-gray-800' },
  { name: 'Peacock', type: 'streaming_video', defaultCost: 5.99, color: '#F5A623', bgColor: 'bg-amber-950' },
  { name: 'Paramount+', type: 'streaming_video', defaultCost: 5.99, color: '#0064FF', bgColor: 'bg-blue-950' },
  { name: 'Crunchyroll', type: 'streaming_video', defaultCost: 7.99, color: '#F47521', bgColor: 'bg-orange-950' },
  { name: 'Spotify', type: 'streaming_music', defaultCost: 10.99, color: '#1DB954', bgColor: 'bg-green-950' },
  { name: 'Apple Music', type: 'streaming_music', defaultCost: 10.99, color: '#FC3C44', bgColor: 'bg-red-950' },
  { name: 'Tidal', type: 'streaming_music', defaultCost: 10.99, color: '#00FFFF', bgColor: 'bg-cyan-950' },
];

// Billing / account management pages
export const BILLING_URLS: Record<string, string> = {
  'Netflix': 'https://www.netflix.com/YourAccount',
  'Hulu': 'https://www.hulu.com/account/billing',
  'Disney+': 'https://www.disneyplus.com/account/subscription',
  'HBO Max': 'https://www.max.com/account',
  'Amazon Prime': 'https://www.amazon.com/mc/optOutEligibility',
  'Apple TV+': 'https://apps.apple.com/account/subscriptions',
  'Peacock': 'https://www.peacocktv.com/account',
  'Paramount+': 'https://www.paramountplus.com/account/cancel/',
  'Crunchyroll': 'https://www.crunchyroll.com/account/membership',
  'Spotify': 'https://www.spotify.com/account/subscription/',
  'Apple Music': 'https://apps.apple.com/account/subscriptions',
  'Tidal': 'https://account.tidal.com',
};

// Direct search URLs on each streaming service
export const SERVICE_SEARCH_URLS: Record<string, (title: string) => string> = {
  'Netflix': (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  'Hulu': (t) => `https://www.hulu.com/search?q=${encodeURIComponent(t)}`,
  'Disney+': (t) => `https://www.disneyplus.com/search/${encodeURIComponent(t)}`,
  'HBO Max': (t) => `https://www.max.com/search?q=${encodeURIComponent(t)}`,
  'Amazon Prime': (t) => `https://www.amazon.com/s?k=${encodeURIComponent(t)}&i=instant-video`,
  'Apple TV+': (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}`,
  'Peacock': (t) => `https://www.peacocktv.com/watch/asset/movies/search?q=${encodeURIComponent(t)}`,
  'Paramount+': (t) => `https://www.paramountplus.com/search/${encodeURIComponent(t)}/`,
  'Crunchyroll': (t) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,
};

// Direct music player links (not billing)
export const MUSIC_PLAYER_URLS: Record<string, string> = {
  'Spotify': 'https://open.spotify.com',
  'Apple Music': 'https://music.apple.com',
  'Tidal': 'https://tidal.com/browse',
};

export const GENRES = [
  'Action', 'Adventure', 'Animation', 'Anime', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Horror', 'K-Drama', 'Mystery',
  'Reality', 'Romance', 'Sci-Fi', 'Thriller', 'True Crime', 'Western',
];

export const SERVICE_COLORS: Record<string, string> = Object.fromEntries(
  STREAMING_SERVICES.map(s => [s.name, s.color])
);
