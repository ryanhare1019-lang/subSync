'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Film, Tv } from 'lucide-react';
import { BrowseCard } from './BrowseCard';
import { DetailModal } from './DetailModal';
import type { BrowseRowItem } from '@/types/browse';

interface SearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv';
  vote_average?: number;
  genre_ids?: number[];
  overview?: string;
}

function resultToItem(r: SearchResult): BrowseRowItem {
  const isMovie = r.media_type === 'movie';
  const year = ((isMovie ? r.release_date : r.first_air_date) || '').split('-')[0];
  // Find a service based on known providers — simplified (no per-result provider call)
  return {
    tmdb_id: r.id,
    title: r.title || r.name || '',
    year: year ? parseInt(year) : null,
    poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : null,
    backdrop_url: null,
    media_type: r.media_type,
    service: null,
    service_color: null,
    service_abbrev: null,
    vote_average: Math.round((r.vote_average || 0) * 10) / 10,
    genres: [],
    overview: (r.overview || '').slice(0, 280),
    on_user_service: false,
  };
}

type Filter = 'all' | 'movie' | 'tv';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BrowseRowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedItem, setSelectedItem] = useState<BrowseRowItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/tmdb-search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = await res.json();
      const items: BrowseRowItem[] = (data as SearchResult[])
        .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
        .map(r => resultToItem(r));
      setResults(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  useEffect(() => {
    // Autofocus on mount
    inputRef.current?.focus();
  }, []);

  const filtered = filter === 'all' ? results : results.filter(r => r.media_type === filter);

  const filters: { id: Filter; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'All' },
    { id: 'movie', label: 'Movies', icon: <Film size={12} /> },
    { id: 'tv', label: 'TV Shows', icon: <Tv size={12} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F0F] px-4 pt-6 pb-24">
      {/* Header */}
      <h1 className="text-white text-[22px] font-bold mb-4">Search</h1>

      {/* Search input */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search movies & TV shows…"
          className="w-full bg-gray-800/80 border border-gray-700/50 rounded-xl pl-9 pr-9 py-3 text-white text-[15px] placeholder-gray-500 outline-none focus:border-gray-600 transition-colors"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filter pills */}
      {results.length > 0 && (
        <div className="flex gap-2 mb-5">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                filter === f.id
                  ? 'bg-white text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
        </div>
      )}

      {/* Results grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-x-3 gap-y-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
          {filtered.map(item => (
            <BrowseCard key={`${item.tmdb_id}-${item.media_type}`} item={item} onClick={setSelectedItem} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && query.trim() && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {/* No query state */}
      {!query && !loading && (
        <div className="text-center py-16 text-gray-600 text-sm">
          Start typing to search movies and TV shows
        </div>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
