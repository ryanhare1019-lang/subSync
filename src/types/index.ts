export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  service_name: string;
  service_type: 'streaming_video' | 'streaming_music' | 'audiobooks' | 'gaming' | 'other';
  monthly_cost: number;
  billing_cycle: 'monthly' | 'annual';
  next_renewal: string | null;
  is_trial: boolean;
  trial_end_date: string | null;
  created_at: string;
}

export interface TasteProfile {
  id: string;
  user_id: string;
  favorite_genres: string[];
  favorite_titles: FavoriteTitle[];
  disliked_genres: string[];
  preferences: Record<string, string>;
  updated_at: string;
}

export interface FavoriteTitle {
  title: string;
  type: 'movie' | 'tv';
  year: number | null;
  tmdb_id?: number;
}

export interface Recommendation {
  id: string;
  user_id: string;
  title: string;
  media_type: 'movie' | 'tv' | 'music' | 'podcast' | 'book';
  description: string | null;
  service_name: string | null;
  tmdb_id: number | null;
  poster_url: string | null;
  ai_reason: string | null;
  user_feedback: 'loved' | 'watched' | 'not_interested' | null;
  created_at: string;
}

export interface ServiceOption {
  name: string;
  type: Subscription['service_type'];
  defaultCost: number;
  color: string;
  bgColor: string;
}

export interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
}

export interface AIRecommendation {
  title: string;
  media_type: 'movie' | 'tv' | 'music' | 'podcast' | 'book';
  service: string;
  reason: string;
  year: number | null;
}
