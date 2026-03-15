'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { BrowseResult, GenreRow } from '@/lib/tmdb';
import Image from 'next/image';
import { Film, Tv, Star, SortAsc, ThumbsUp, ThumbsDown, HelpCircle, Search, X, Music, Loader2, ChevronRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServiceBadge, ServiceIcon } from '@/components/ServiceIcon';
import { MUSIC_PLAYER_URLS, SERVICE_SEARCH_URLS } from '@/lib/constants';

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
  is_similar_suggestion?: boolean;
}

interface BecauseYouLikedData {
  source: { title: string; tmdb_id: number; media_type: string };
  recommendations: BrowseResult[];
}

const POSTER_W = 190;
const FEEDBACK_EVERY = 8; // show feedback card every N rows
const BECAUSE_EVERY = 12; // show "because you liked" every N rows

const MUSIC_GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B/Soul', 'Jazz', 'Classical', 'Electronic', 'Country',
  'Metal', 'Punk', 'Folk', 'Indie', 'Alternative', 'Blues', 'Reggae', 'Latin',
  'K-Pop', 'J-Pop', 'Afrobeats', 'Disco', 'Funk', 'Ambient', 'Lo-fi Hip-Hop',
  'Synthwave', 'Trap', 'Drill', 'Emo', 'Shoegaze', 'Post-Rock', 'Math Rock',
  'Prog Rock', 'Psychedelic', 'Bossa Nova', 'Salsa', 'Flamenco', 'New Age',
  'Gospel', 'Ska', 'Grunge', 'Industrial', 'Techno', 'House', 'Trance',
  'Drum & Bass', 'Dubstep', 'Chillout', 'Vaporwave', 'Bedroom Pop', 'Phonk',
  'Midwest Emo', 'Post-Punk', 'Darkwave', 'New Wave', 'Art Rock', 'Glam Rock',
  '80s Pop', '90s R&B', '2000s Hip-Hop', 'Soundtrack & Score', 'Choral & Orchestral',
  'Video Game Music', 'Holiday', 'World Music', 'Afro-Latin', 'Turkish Pop', 'Arabic Pop',
];

const GENRE_COLORS = [
  '#279AF1', '#C49991', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#14B8A6', '#A78BFA',
  '#FB923C', '#34D399', '#60A5FA', '#F472B6', '#4ADE80', '#FBBF24',
];

function openOnService(item: BrowseResult) {
  const firstService = item.services[0];
  if (firstService && SERVICE_SEARCH_URLS[firstService]) {
    window.open(SERVICE_SEARCH_URLS[firstService](item.title), '_blank', 'noopener,noreferrer');
    return;
  }
  fetch(`/api/watch-link?id=${item.id}&type=${item.media_type}`)
    .then(r => r.json())
    .then(d => { if (d.link) window.open(d.link, '_blank', 'noopener,noreferrer'); })
    .catch(() => null);
}

function BecauseYouLikedEvent({ source, recommendations, onDismiss }: {
  source: { title: string };
  recommendations: BrowseResult[];
  onDismiss: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="mb-10 bg-white dark:bg-gray-900 border border-copper/30 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          <span style={{ color: 'var(--color-copper)' }}>Because you loved</span> {source.title}, you might enjoy:
        </p>
        <button onClick={onDismiss} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 text-xs">✕</button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {recommendations.slice(0, 10).map(item => (
          <div key={item.id} style={{ width: 80, flexShrink: 0 }}
            className="cursor-pointer group"
            onClick={() => openOnService(item)}>
            <div className="aspect-[2/3] relative rounded-lg overflow-hidden bg-gray-800">
              {item.poster_url && <Image src={item.poster_url} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform" sizes="80px" />}
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-xs mt-1 leading-tight line-clamp-2">{item.title}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function BrowseFeedbackCard({ item, type, onDismiss }: {
  item: BrowseResult;
  type: 'movie' | 'tv';
  onDismiss: (feedback: 'thumbs_up' | 'thumbs_down' | 'unsure') => void;
}) {
  const [submitted, setSubmitted] = useState(false);

  const handle = (feedback: 'thumbs_up' | 'thumbs_down' | 'unsure') => {
    if (submitted) return;
    setSubmitted(true);
    fetch('/api/browse-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: item.id, media_type: type, title: item.title, poster_url: item.poster_url, feedback }),
    }).catch(() => null);
    setTimeout(() => onDismiss(feedback), 400);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="mb-10 bg-white dark:bg-gray-900 border border-brand/20 rounded-2xl p-4 flex items-center gap-4"
    >
      <div className="w-14 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-800 relative">
        {item.poster_url && <Image src={item.poster_url} alt={item.title} fill className="object-cover" sizes="56px" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{item.title}</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 mb-3">Is this something you might be interested in?</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handle('thumbs_up')} disabled={submitted}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-xs border border-green-200 dark:border-green-500/30 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors disabled:opacity-40">
            <ThumbsUp size={11} /> Yes!
          </button>
          <button onClick={() => handle('thumbs_down')} disabled={submitted}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-40">
            <ThumbsDown size={11} /> Not for me
          </button>
          <button onClick={() => handle('unsure')} disabled={submitted}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40">
            <HelpCircle size={11} /> Not sure
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PosterCard({ item, type, onFeedback }: {
  item: BrowseResult;
  type: 'movie' | 'tv';
  onFeedback: (item: BrowseResult, feedback: 'thumbs_up' | 'thumbs_down') => void;
}) {
  const [feedbackGiven, setFeedbackGiven] = useState<'thumbs_up' | 'thumbs_down' | null>(null);

  const handleFeedback = (e: React.MouseEvent, fb: 'thumbs_up' | 'thumbs_down') => {
    e.stopPropagation();
    if (feedbackGiven) return;
    setFeedbackGiven(fb);
    onFeedback(item, fb);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.18 }}
      onClick={() => openOnService(item)}
      className="group cursor-pointer flex-shrink-0"
      style={{ width: POSTER_W }}
    >
      <div className="aspect-[2/3] relative bg-gray-800 rounded-xl overflow-hidden">
        {item.poster_url ? (
          <Image src={item.poster_url} alt={item.title} fill className="object-cover" sizes={`${POSTER_W}px`} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            {type === 'tv' ? <Tv size={32} /> : <Film size={32} />}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Feedback buttons top */}
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              onClick={e => handleFeedback(e, 'thumbs_up')}
              title="I like this"
              className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${feedbackGiven === 'thumbs_up' ? 'bg-green-500 text-white' : 'bg-black/60 text-white hover:bg-green-500/80'}`}
            >
              <ThumbsUp size={12} />
            </button>
            <button
              onClick={e => handleFeedback(e, 'thumbs_down')}
              title="Not for me"
              className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${feedbackGiven === 'thumbs_down' ? 'bg-red-500 text-white' : 'bg-black/60 text-white hover:bg-red-500/80'}`}
            >
              <ThumbsDown size={12} />
            </button>
          </div>

          {/* Info bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2.5">
            {item.rating > 0 && (
              <div className="flex items-center gap-1 text-yellow-400 text-xs font-medium mb-0.5">
                <Star size={10} className="fill-current" /> {item.rating}
              </div>
            )}
            <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{item.title}</p>
            {item.services.length > 0 && (
              <div className="flex gap-1 mt-1">
                {item.services.slice(0, 3).map(svc => (
                  <div key={svc} className="flex items-center gap-1">
                    <ServiceIcon name={svc} size={11} variant="white" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-gray-800 dark:text-gray-200 text-xs mt-1.5 leading-tight line-clamp-2 px-0.5">{item.title}</p>
      <div className="flex items-center gap-1 mt-0.5 px-0.5">
        <p className="text-gray-500 text-xs">{item.year}</p>
        {item.services.length > 0 && (
          <div className="flex gap-0.5 ml-auto">
            {item.services.slice(0, 2).map(svc => (
              <ServiceIcon key={svc} name={svc} size={16} variant="brand" className="opacity-80" />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function HorizontalRow({ row, type, onFeedback }: {
  row: GenreRow;
  type: 'movie' | 'tv';
  onFeedback: (item: BrowseResult, feedback: 'thumbs_up' | 'thumbs_down') => void;
}) {
  return (
    <div className="mb-10">
      <h2 className="text-gray-900 dark:text-white text-lg font-bold mb-3">{row.name}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
        {row.results.map(item => (
          <PosterCard key={item.id} item={item} type={type} onFeedback={onFeedback} />
        ))}
      </div>
    </div>
  );
}

function MusicTab({ userServices }: { userServices: string[] }) {
  const musicServices = userServices.filter(s => ['Spotify', 'Apple Music', 'Tidal'].includes(s));

  return (
    <div>
      {/* Connected services */}
      {musicServices.length > 0 && (
        <div className="mb-8">
          <h2 className="text-gray-900 dark:text-white text-lg font-bold mb-3">Your Music Services</h2>
          <div className="space-y-2">
            {musicServices.map(svc => (
              <div key={svc} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                <ServiceBadge name={svc} size={36} />
                <span className="text-gray-900 dark:text-white font-medium text-sm flex-1">{svc}</span>
                {MUSIC_PLAYER_URLS[svc] && (
                  <button
                    onClick={() => window.open(MUSIC_PLAYER_URLS[svc], '_blank', 'noopener,noreferrer')}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors">
                    Open <ChevronRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spotify connect */}
      <div className="mb-8 p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1DB95418', border: '1px solid #1DB95433' }}>
            <ServiceIcon name="Spotify" size={22} variant="brand" />
          </div>
          <div className="flex-1">
            <p className="text-gray-900 dark:text-white font-semibold text-sm">Connect Spotify for personalized picks</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Based on your listening history, we&apos;ll surface music you&apos;ll love.</p>
          </div>
          <a href="/api/spotify/auth"
            className="flex-shrink-0 flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-[#1DB954] text-white hover:bg-[#1aa34a] transition-colors font-medium">
            Connect <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Genre grid */}
      <div className="mb-4">
        <h2 className="text-gray-900 dark:text-white text-lg font-bold mb-1">Explore by Genre</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Click any genre to search on Spotify.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {MUSIC_GENRES.map((genre, i) => {
            const color = GENRE_COLORS[i % GENRE_COLORS.length];
            const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(genre + ' music')}`;
            return (
              <a
                key={genre}
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col justify-between rounded-xl p-3.5 cursor-pointer hover:scale-[1.03] transition-all group"
                style={{
                  backgroundColor: color + '14',
                  border: `1px solid ${color}30`,
                  minHeight: 80,
                }}
              >
                <span className="font-semibold text-sm leading-tight" style={{ color }}>
                  {genre}
                </span>
                <div className="flex items-center gap-1 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                  <ExternalLink size={10} style={{ color }} />
                  <span className="text-xs" style={{ color }}>Spotify</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SearchPanel({ results, loading, query, onOpenService }: {
  results: SearchResult[];
  loading: boolean;
  query: string;
  onOpenService: (r: SearchResult) => void;
}) {
  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-brand" /></div>;
  if (results.length === 0 && query.length >= 2) return (
    <div className="text-center py-20">
      <Search size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
      <p className="text-gray-500 dark:text-gray-400">No results for &ldquo;{query}&rdquo;</p>
    </div>
  );
  return (
    <div className="space-y-3 max-w-2xl">
      {results.map(r => (
        <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-4 p-3 bg-white dark:bg-gray-900 border rounded-xl ${r.available_on.length > 0 ? 'border-green-200 dark:border-green-500/30' : 'border-gray-200 dark:border-gray-700'}`}>
          <div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800 relative">
            {r.poster_url && <Image src={r.poster_url} alt={r.title} fill className="object-cover" sizes="48px" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-gray-900 dark:text-white font-semibold text-sm leading-tight">{r.title}</p>
              {r.is_similar_suggestion && (
                <span className="text-xs px-1.5 py-0.5 rounded-md bg-brand/10 text-brand border border-brand/20 flex-shrink-0">Similar</span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 capitalize">{r.media_type} {r.year && `(${r.year})`}</p>
            {r.available_on.length > 0 ? (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-green-600 dark:text-green-400 text-xs font-medium">On:</span>
                {r.available_on.map(svc => (
                  <div key={svc} className="flex items-center gap-1">
                    <ServiceIcon name={svc} size={12} variant="brand" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{svc}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-xs mt-1">Not on your services</p>
            )}
          </div>
          {r.available_on.length > 0 && (
            <button
              onClick={() => onOpenService(r)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand text-white text-xs font-medium hover:bg-brand-hover transition-colors">
              Watch <ChevronRight size={12} />
            </button>
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dismissedFeedback, setDismissedFeedback] = useState<Set<string>>(new Set());
  const [shownInFeedback, setShownInFeedback] = useState<Set<number>>(new Set());
  const [becauseYouLiked, setBecauseYouLiked] = useState<BecauseYouLikedData | null>(null);
  const [becauseDismissed, setBecauseDismissed] = useState(false);
  const searchRef = useRef<NodeJS.Timeout | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const BATCH = 15;
  const firstName = displayName?.split(' ')[0] || displayName || 'you';

  const loadBatch = useCallback(async (t: 'movie' | 'tv', sort: string, offset: number, replace: boolean) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetch(`/api/browse?type=${t}&mode=genres&sort=${sort}&offset=${offset}&limit=${BATCH}`);
      if (res.ok) {
        const data = await res.json();
        const newRows: GenreRow[] = data.genres || [];
        setGenres(prev => replace ? newRows : [...prev, ...newRows]);
        setServiceNames(data.serviceNames || []);
        setHasMore(newRows.length === BATCH);
      }
    } finally {
      if (replace) setLoading(false); else setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== 'music') {
      setGenres([]);
      setHasMore(true);
      loadBatch(tab, sortBy, 0, true);
    }
  }, [tab, sortBy, loadBatch]);

  // Fetch "because you liked" data on mount
  useEffect(() => {
    fetch('/api/because-you-liked')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.source && data.recommendations?.length > 0) {
          setBecauseYouLiked(data);
        }
      })
      .catch(() => null);
  }, []);

  // Infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadBatch(tab as 'movie' | 'tv', sortBy, genres.length, false);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, tab, sortBy, genres.length, loadBatch]);

  // Debounced search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    searchRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/browse-search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) setSearchResults(await res.json());
      } finally { setSearchLoading(false); }
    }, 500);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [searchQuery]);

  const handlePosterFeedback = useCallback((item: BrowseResult, feedback: 'thumbs_up' | 'thumbs_down') => {
    fetch('/api/browse-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: item.id, media_type: item.media_type, title: item.title, poster_url: item.poster_url, feedback }),
    }).catch(() => null);
  }, []);

  // Pick a feedback item from a row that hasn't been shown yet
  const getFeedbackItem = (rowIndex: number): BrowseResult | null => {
    for (let i = rowIndex; i >= 0; i--) {
      const row = genres[i];
      if (!row) continue;
      for (const item of row.results) {
        if (!shownInFeedback.has(item.id)) return item;
      }
    }
    return null;
  };

  const handleFeedbackDismiss = (rowKey: string, itemId: number) => {
    setDismissedFeedback(prev => new Set([...prev, rowKey]));
    setShownInFeedback(prev => new Set([...prev, itemId]));
  };

  const isSearching = searchQuery.trim().length >= 2;

  const openSearchResult = (r: SearchResult) => {
    const firstService = r.available_on[0];
    if (firstService && SERVICE_SEARCH_URLS[firstService]) {
      window.open(SERVICE_SEARCH_URLS[firstService](r.title), '_blank', 'noopener,noreferrer');
    } else if (r.watch_link) {
      window.open(r.watch_link, '_blank', 'noopener,noreferrer');
    }
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
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search movies, shows, songs..."
            className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-9 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand transition-colors" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {!isSearching && (
          <div className="flex items-center gap-3 mb-8 flex-wrap">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              {([['movie', <Film key="f" size={13} />, 'Movies'], ['tv', <Tv key="t" size={13} />, 'TV Shows'], ['music', <Music key="m" size={13} />, 'Music']] as const).map(([t, icon, label]) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-brand text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                  {icon} {label}
                </button>
              ))}
            </div>
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

        {isSearching ? (
          <SearchPanel results={searchResults} loading={searchLoading} query={searchQuery} onOpenService={openSearchResult} />
        ) : tab === 'music' ? (
          <MusicTab userServices={serviceNames} />
        ) : loading ? (
          <div className="space-y-10">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-3" />
                <div className="flex gap-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="flex-shrink-0 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" style={{ width: POSTER_W, aspectRatio: '2/3' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : genres.length === 0 ? (
          <div className="text-center py-20">
            <Film size={40} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-900 dark:text-white font-medium">Nothing to browse yet</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Add video subscriptions from your dashboard to browse their catalogs here.</p>
          </div>
        ) : (
          <div>
            <AnimatePresence>
              {genres.map((row, i) => {
                const feedbackKey = `feedback-${i}`;
                const showFeedback = (i + 1) % FEEDBACK_EVERY === 0 && !dismissedFeedback.has(feedbackKey);
                const feedbackItem = showFeedback ? getFeedbackItem(i) : null;
                const showBecause = (i + 1) % BECAUSE_EVERY === 0 && !becauseDismissed && becauseYouLiked;

                return (
                  <div key={row.id}>
                    <HorizontalRow row={row} type={tab as 'movie' | 'tv'} onFeedback={handlePosterFeedback} />
                    {showFeedback && feedbackItem && (
                      <BrowseFeedbackCard
                        item={feedbackItem}
                        type={tab as 'movie' | 'tv'}
                        onDismiss={() => handleFeedbackDismiss(feedbackKey, feedbackItem.id)}
                      />
                    )}
                    {showBecause && becauseYouLiked && (
                      <BecauseYouLikedEvent
                        source={becauseYouLiked.source}
                        recommendations={becauseYouLiked.recommendations}
                        onDismiss={() => setBecauseDismissed(true)}
                      />
                    )}
                  </div>
                );
              })}
            </AnimatePresence>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />

            {loadingMore && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-brand" />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
