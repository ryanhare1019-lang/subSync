export interface BrowseRowItem {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_url: string | null;
  backdrop_url?: string | null;
  media_type: 'movie' | 'tv';
  service: string | null;
  service_color: string | null;
  service_abbrev: string | null;
  vote_average: number;
  genres: string[];
  overview: string;
  on_user_service: boolean;
}

export interface HeroItem extends BrowseRowItem {
  backdrop_url: string | null;
  ai_reason: string;
  match_score?: number;
}

export interface BrowseRow {
  id: string;
  title: string;
  items: BrowseRowItem[];
}

export interface BrowseRowsResponse {
  hero: HeroItem | null;
  rows: BrowseRow[];
}
