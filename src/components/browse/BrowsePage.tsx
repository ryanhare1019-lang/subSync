'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Search, X, Film, Tv } from 'lucide-react';
import { BrowseHero, BrowseHeroSkeleton } from './BrowseHero';
import { BrowseRowComponent, BrowseRowSkeleton } from './BrowseRow';
import { BrowseCard } from './BrowseCard';
import { DetailModal } from './DetailModal';
import type { BrowseRowsResponse, BrowseRowItem, HeroItem } from '@/types/browse';

interface SearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv';
  vote_average?: number;
  overview?: string;
}

function resultToItem(r: SearchResult): BrowseRowItem {
  const isMovie = r.media_type === 'movie';
  const year = ((isMovie ? r.release_date : r.first_air_date) || '').split('-')[0];
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

type SearchFilter = 'all' | 'movie' | 'tv';

export function BrowsePage() {
  const [data, setData] = useState<BrowseRowsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<(BrowseRowItem & { ai_reason?: string; match_score?: number }) | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BrowseRowItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (bust = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/browse/rows${bust ? '?bust=1' : ''}`);
      if (!res.ok) throw new Error('Failed to load browse data');
      setData(await res.json());
    } catch {
      setError('Could not load content. Check your API keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/tmdb-search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = await res.json();
      const items: BrowseRowItem[] = (data as SearchResult[])
        .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
        .map(r => resultToItem(r));
      setSearchResults(items);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(searchQuery), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, runSearch]);

  const handleCardClick = (item: BrowseRowItem) => setSelectedItem(item);
  const handleHeroMoreInfo = (item: HeroItem) => setSelectedItem(item);

  const isSearching = searchQuery.trim().length > 0;
  const filteredResults = searchFilter === 'all'
    ? searchResults
    : searchResults.filter(r => r.media_type === searchFilter);

  const searchFilters: { id: SearchFilter; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'All' },
    { id: 'movie', label: 'Movies', icon: <Film size={12} /> },
    { id: 'tv', label: 'TV Shows', icon: <Tv size={12} /> },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F0F0F]">
      {/* Search bar */}
      <div className="px-4 md:px-6 pt-4 pb-3">
        <div className="relative max-w-xl">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search movies & TV shows…"
            className="w-full bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/50 rounded-xl pl-9 pr-9 py-2.5 text-gray-900 dark:text-white text-[14px] placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-brand transition-colors"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Search filter pills */}
        {isSearching && searchResults.length > 0 && (
          <div className="flex gap-2 mt-3">
            {searchFilters.map(f => (
              <button
                key={f.id}
                onClick={() => setSearchFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  searchFilter === f.id
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search results */}
      {isSearching && (
        <div className="px-4 md:px-6 pb-8">
          {searchLoading && (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-gray-500 dark:border-t-gray-400 rounded-full animate-spin" />
            </div>
          )}
          {!searchLoading && filteredResults.length > 0 && (
            <div className="grid gap-x-3 gap-y-4 md:gap-x-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
              {filteredResults.map(item => (
                <BrowseCard
                  key={`${item.tmdb_id}-${item.media_type}`}
                  item={item}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          )}
          {!searchLoading && searchQuery.trim() && filteredResults.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-sm">No results for &ldquo;{searchQuery}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {/* Browse content (hidden while searching) */}
      {!isSearching && (
        <>
          {error ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <p className="text-gray-500 text-sm mb-4">{error}</p>
              <button
                onClick={() => load(true)}
                className="flex items-center gap-2 text-blue-500 hover:text-blue-400 text-sm transition-colors"
              >
                <RefreshCw size={14} />
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Hero */}
              {loading || !data ? (
                <BrowseHeroSkeleton />
              ) : data.hero ? (
                <BrowseHero hero={data.hero} onMoreInfo={handleHeroMoreInfo} />
              ) : null}

              {/* Rows */}
              <div className="pt-4">
                {loading || !data ? (
                  <>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <BrowseRowSkeleton key={i} />
                    ))}
                  </>
                ) : data.rows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                    <p className="text-gray-500 text-sm mb-2">No content rows available.</p>
                    <p className="text-gray-400 dark:text-gray-600 text-xs">Add streaming subscriptions to see personalized content.</p>
                  </div>
                ) : (
                  data.rows.map((row) => (
                    <BrowseRowComponent key={row.id} row={row} onCardClick={handleCardClick} />
                  ))
                )}
              </div>

              {/* Refresh button */}
              {!loading && data && (
                <div className="flex justify-center py-8">
                  <button
                    onClick={() => load(true)}
                    className="flex items-center gap-2 text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 text-xs transition-colors"
                  >
                    <RefreshCw size={12} />
                    Refresh recommendations
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
