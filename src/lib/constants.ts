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
  { name: 'Xbox Game Pass', type: 'gaming', defaultCost: 14.99, color: '#107C10', bgColor: 'bg-green-950' },
  { name: 'PlayStation Plus', type: 'gaming', defaultCost: 9.99, color: '#003791', bgColor: 'bg-blue-950' },
  { name: 'Nintendo Switch Online', type: 'gaming', defaultCost: 3.99, color: '#E60012', bgColor: 'bg-red-950' },
];

export const GENRES = [
  'Action', 'Adventure', 'Animation', 'Anime', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Horror', 'K-Drama', 'Mystery',
  'Reality', 'Romance', 'Sci-Fi', 'Thriller', 'True Crime', 'Western',
];

export const SERVICE_COLORS: Record<string, string> = Object.fromEntries(
  STREAMING_SERVICES.map(s => [s.name, s.color])
);
