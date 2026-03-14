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
  { name: 'YouTube Premium', type: 'streaming_video', defaultCost: 13.99, color: '#FF0000', bgColor: 'bg-red-950' },
  { name: 'Spotify', type: 'streaming_music', defaultCost: 10.99, color: '#1DB954', bgColor: 'bg-green-950' },
  { name: 'Apple Music', type: 'streaming_music', defaultCost: 10.99, color: '#FC3C44', bgColor: 'bg-red-950' },
  { name: 'Tidal', type: 'streaming_music', defaultCost: 10.99, color: '#00FFFF', bgColor: 'bg-cyan-950' },
  { name: 'Audible', type: 'audiobooks', defaultCost: 14.95, color: '#F8991D', bgColor: 'bg-orange-950' },
];

// Simpleicons CDN slugs (https://simpleicons.org)
export const SERVICE_ICON_SLUGS: Record<string, string> = {
  'Netflix': 'netflix',
  'Hulu': 'hulu',
  'Disney+': 'disneyplus',
  'HBO Max': 'hbomax',
  'Amazon Prime': 'amazonprimevideo',
  'Apple TV+': 'appletv',
  'Peacock': 'peacocktv',
  'Paramount+': 'paramountplus',
  'Crunchyroll': 'crunchyroll',
  'YouTube Premium': 'youtube',
  'Spotify': 'spotify',
  'Apple Music': 'applemusic',
  'Tidal': 'tidal',
  'Audible': 'audible',
};

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
  'YouTube Premium': 'https://www.youtube.com/paid_memberships',
  'Spotify': 'https://www.spotify.com/account/subscription/',
  'Apple Music': 'https://apps.apple.com/account/subscriptions',
  'Tidal': 'https://account.tidal.com',
  'Audible': 'https://www.audible.com/account/membership',
};

export const GENRES = [
  'Action', 'Adventure', 'Animation', 'Anime', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Horror', 'K-Drama', 'Mystery',
  'Reality', 'Romance', 'Sci-Fi', 'Thriller', 'True Crime', 'Western',
];

export const SERVICE_COLORS: Record<string, string> = Object.fromEntries(
  STREAMING_SERVICES.map(s => [s.name, s.color])
);
