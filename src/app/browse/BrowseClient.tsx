'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { BrowseResult, GenreRow } from '@/lib/tmdb';
import Image from 'next/image';
import { Film, Tv, Star, SortAsc, ThumbsUp, ThumbsDown, HelpCircle, Search, X, Music, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServiceBadge, ServiceIcon } from '@/components/ServiceIcon';
import { BILLING_URLS, MUSIC_PLAYER_URLS } from '@/lib/constants';

interface BrowseClientProps {
  userEmail?: string | null;
  displayName?: string | null;
}

type MediaTab = 'movie' | 'tv' | 'music';

interface SearchResult {
  id: number;
  title: string;
  year: string | null;
  media_type: 'movie' | 'tv';
  poster_url: string | null;
  available_on: string[];
  watch_link: string | null;
}

async function fetchStreamingLink(tmdbId: number, type: 'movie' | 'tv'): Promise<string | null> {
  const res = await fetch(`/api/watch-link?id=${tmdbId}&type=${type}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.link || null;
}

// Feedback card shown every 5 rows
function BrowseFeedbackCard({ item, type, onDismiss }: {
  item: BrowseResult;
  type: 'movie' | 'tv';
  onDismiss: (feedback: 'thumbs_up' | 'thumbs_down' | 'unsure') => void;
}) {
  const [submitted, setSubmitted] = useState(false);

  const handle = async (feedback: 'thumbs_up' | 'thumbs_down' | 'unsure') => {
    setSubmitted(true);
    fetch('/api/browse-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdb_id: item.id,
        media_type: type,
        title: item.title,
        poster_url: item.poster_url,
        feedback,
      }),
    }).catch(() => null);
    setTimeout(() => onDismiss(feedback), 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="mb-10 bg-white dark:bg-gray-900 border border-brand/20 rounded-2xl p-4 flex items-center gap-4"
    >
      {/* Poster */}
      <div className="w-14 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-800 relative">
        {item.poster_url && (
          <Image src={item.poster_url} alt={item.title} fill className="object-cover" sizes="56px" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{item.title}</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 mb-3">Is this something you might be interested in?</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handle('thumbs_up')}
            disabled={submitted}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-xs border border-green-200 dark:border-green-500/30 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors disabled:opacity-50"
          >
            <ThumbsUp size={11} /> Yes!
          </button>
          <button
            onClick={() => handle('thumbs_down')}
            disabled={submitted}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <ThumbsDown size={11} /> Not for me
          </button>
          <button
            onClick={() => handle('unsure')}
            disabled={submitted}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <HelpCircle size={11} /> Not sure
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PosterCard({ item, type }: { item: BrowseResult; type: 'movie' | 'tv' }) {
  const handleClick = async () => {
    const link = await fetchStreamingLink(item.id, type);
    if (link) window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className="group cursor-pointer flex-shrink-0"
      style={{ width: 140 }}
    >
      <div className="aspect-[2/3] relative bg-gray-800 rounded-xl overflow-hidden">
        {item.poster_url ? (
          <Image
            src={item.poster_url}
            alt={item.title}
            fill
            className="object-cover"
            sizes="140px"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-800">
            <div className="text-gray-500">{type === 'tv' ? <Tv size={28} /> : <Film size={28} />}</div>
          </div>
        )}

        {/* Service badges bottom-left (hidden on hover) */}
        {item.services.length > 0 && (
          <div className="absolute bottom-1.5 left-1.5 flex gap-1 group-hover:opacity-0 transition-opacity">
            {item.services.slice(0, 2).map(svc => (
              <div
                key={svc}
                className="w-5 h-5 rounded-md bg-black/80 backdrop-blur-sm flex items-center justify-center"
                title={svc}
              >
                <ServiceIcon name={svc} size={11} variant="white" />
              </div>
            ))}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-2">
            {item.rating > 0 && (
              <div className="flex items-center gap-1 text-yellow-400 text-xs font-medium">
                <Star size={10} className="fill-current" /> {item.rating}
              </div>
            )}
            <p className="text-white text-xs font-medium leading-tight mt-0.5 line-clamp-2">{item.title}</p>
            {item.services.length > 0 && (
              <div className="flex gap-1 mt-1">
                {item.services.slice(0, 3).map(svc => (
                  <div key={svc} className="w-4 h-4 rounded bg-black/60 flex items-center justify-center" title={svc}>
                    <ServiceIcon name={svc} size={10} variant="white" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-gray-800 dark:text-gray-200 text-xs mt-1.5 leading-tight line-clamp-2 px-0.5">{item.title}</p>
      <div className="flex items-center gap-1 mt-0.5 px-0.5">
        <p className="text-gray-500 dark:text-gray-500 text-xs">{item.year}</p>
        {item.services.length > 0 && (
          <div className="flex gap-0.5 ml-auto">
            {item.services.slice(0, 2).map(svc => (
              <ServiceIcon key={svc} name={svc} size={11} variant="brand" className="opacity-70" />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function HorizontalRow({ row, type }: { row: GenreRow; type: 'movie' | 'tv' }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mb-10">
      <h2 className="text-gray-900 dark:text-white text-lg font-bold mb-3">{row.name}</h2>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: 'thin' }}
      >
        {row.results.map(item => (
          <PosterCard key={item.id} item={item} type={type} />
        ))}
      </div>
    </div>
  );
}

function MusicTab({ userServices }: { userServices: string[] }) {
  const musicServices = userServices.filter(s => ['Spotify', 'Apple Music', 'Tidal', 'Audible'].includes(s));

  return (
    <div className="max-w-2xl">
      {musicServices.length > 0 && (
        <div className="mb-8">
          <h2 className="text-gray-900 dark:text-white text-lg font-bold mb-3">Your Music Services</h2>
          <div className="space-y-2">
            {musicServices.map(svc => (
              <div
                key={svc}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
              >
                <ServiceBadge name={svc} size={36} />
                <span className="text-gray-900 dark:text-white font-medium text-sm flex-1">{svc}</span>
                <div className="flex gap-2">
                  {MUSIC_PLAYER_URLS[svc] && (
                    <button
                      onClick={() => window.open(MUSIC_PLAYER_URLS[svc], '_blank', 'noopener,noreferrer')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors"
                    >
                      Open
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center py-14 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
        <Music size={40} className="mx-auto mb-4 text-brand opacity-60" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Music Discovery Coming Soon</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm mx-auto">
          Connect your music services to discover new artists and albums tailored to your taste.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          {(['Spotify', 'Apple Music', 'Tidal'] as const).map(svc => (
            !musicServices.includes(svc) && (
              <button
                key={svc}
                onClick={() => window.open(BILLING_URLS[svc], '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm hover:border-brand/40 transition-colors"
              >
                <ServiceIcon name={svc} size={16} variant="brand" />
                Connect {svc}
              </button>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchPanel({ results, loading, query }: {
  results: SearchResult[];
  loading: boolean;
  query: string;
}) {
  const handleClick = (r: SearchResult) => {
    if (r.watch_link) window.open(r.watch_link, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-brand" />
      </div>
    );
  }

  if (results.length === 0 && query.length >= 2) {
    return (
      <div className="text-center py-20">
        <Search size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400">No results found for &ldquo;{query}&rdquo;</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map(r => (
        <motion.div
          key={r.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => handleClick(r)}
          className={`flex items-center gap-4 p-3 bg-white dark:bg-gray-900 border rounded-xl transition-all ${r.watch_link ? 'cursor-pointer hover:border-brand/40' : ''} ${r.available_on.length > 0 ? 'border-green-200 dark:border-green-500/30' : 'border-gray-200 dark:border-gray-700'}`}
        >
          {/* Poster */}
          <div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800 relative">
            {r.poster_url && (
              <Image src={r.poster_url} alt={r.title} fill className="object-cover" sizes="48px" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 dark:text-white font-semibold text-sm leading-tight">{r.title}</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 capitalize">{r.media_type} {r.year && `(${r.year})`}</p>
            {r.available_on.length > 0 ? (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-green-600 dark:text-green-400 text-xs font-medium">Available on:</span>
                {r.available_on.map(svc => (
                  <div key={svc} className="flex items-center gap-1">
                    <ServiceIcon name={svc} size={12} variant="brand" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{svc}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Not on your services</p>
            )}
          </div>

          {r.available_on.length > 0 && r.watch_link && (
            <div className="flex-shrink-0">
              <span className="text-xs text-brand font-medium">Watch</span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export function BrowseClient({ userEmail, displayName }: BrowseClientProps) {
  const [tab, setTab] = useState<MediaTab>('movie');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [genres, setGenres] = useState<GenreRow[]>([]);
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dismissedFeedback, setDismissedFeedback] = useState<Set<string>>(new Set());
  const searchRef = useRef<NodeJS.Timeout | null>(null);
  const firstName = displayName?.split(' ')[0] || displayName || 'you';

  const load = useCallback(async (t: 'movie' | 'tv', sort: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/browse?type=${t}&mode=genres&sort=${sort}`);
      if (res.ok) {
        const data = await res.json();
        setGenres(data.genres || []);
        setServiceNames(data.serviceNames || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== 'music') load(tab, sortBy);
  }, [tab, sortBy, load]);

  // Debounced search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/browse-search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) setSearchResults(await res.json());
      } finally {
        setSearchLoading(false);
      }
    }, 500);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [searchQuery]);

  const videoServices = serviceNames.filter(s => BILLING_URLS[s]);
  const isSearching = searchQuery.trim().length >= 2;

  // Pick a feedback item from a row (stable pick based on row index)
  const getFeedbackItem = (rowIndex: number): BrowseResult | null => {
    const row = genres[rowIndex];
    if (!row || row.results.length === 0) return null;
    return row.results[rowIndex % row.results.length];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar userEmail={userEmail} displayName={displayName} showDashboard showBrowse={false} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Picked for <span className="text-brand">{firstName}</span>
          </h1>
          {videoServices.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-gray-500 dark:text-gray-400 text-sm">From:</span>
              {videoServices.map(svc => (
                <button
                  key={svc}
                  onClick={() => window.open(BILLING_URLS[svc], '_blank', 'noopener,noreferrer')}
                  className="hover:opacity-80 transition-opacity"
                  title={`Open ${svc}`}
                >
                  <ServiceBadge name={svc} size={28} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search movies & shows..."
            className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-9 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Controls (hidden when searching) */}
        {!isSearching && (
          <div className="flex items-center gap-3 mb-8 flex-wrap">
            {/* Tab toggle */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              {([
                ['movie', <Film key="f" size={13} />, 'Movies'],
                ['tv', <Tv key="t" size={13} />, 'TV Shows'],
                ['music', <Music key="m" size={13} />, 'Music'],
              ] as const).map(([t, icon, label]) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-brand text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Sort (only for video tabs) */}
            {tab !== 'music' && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <SortAsc size={14} />
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-sm text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer">
                  <option value="popularity.desc">Most popular</option>
                  <option value="vote_average.desc">Top rated</option>
                  <option value="primary_release_date.desc">Newest</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Search results */}
        {isSearching ? (
          <SearchPanel results={searchResults} loading={searchLoading} query={searchQuery} />
        ) : tab === 'music' ? (
          <MusicTab userServices={serviceNames} />
        ) : loading ? (
          <div className="space-y-10">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-3" />
                <div className="flex gap-3">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="flex-shrink-0 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" style={{ width: 140, aspectRatio: '2/3' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : genres.length === 0 ? (
          <div className="text-center py-20">
            <Film size={40} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-900 dark:text-white font-medium">Nothing to browse yet</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              Add video subscriptions from your dashboard to browse their catalogs here.
            </p>
          </div>
        ) : (
          <div>
            <AnimatePresence>
              {genres.map((row, i) => (
                <div key={row.id}>
                  <HorizontalRow row={row} type={tab as 'movie' | 'tv'} />
                  {/* Feedback card every 5 rows */}
                  {(i + 1) % 5 === 0 && !dismissedFeedback.has(`${i}`) && (() => {
                    const feedbackItem = getFeedbackItem(i);
                    return feedbackItem ? (
                      <BrowseFeedbackCard
                        key={`feedback-${i}`}
                        item={feedbackItem}
                        type={tab as 'movie' | 'tv'}
                        onDismiss={() => setDismissedFeedback(prev => new Set([...prev, `${i}`]))}
                      />
                    ) : null;
                  })()}
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
