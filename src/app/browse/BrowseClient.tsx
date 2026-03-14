'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { BrowseResult, GenreRow } from '@/lib/tmdb';
import Image from 'next/image';
import { Film, Tv, Star, SortAsc } from 'lucide-react';
import { motion } from 'framer-motion';
import { ServiceBadge } from '@/components/ServiceIcon';
import { BILLING_URLS } from '@/lib/constants';

interface BrowseClientProps {
  userEmail?: string | null;
  displayName?: string | null;
}

async function fetchStreamingLink(tmdbId: number, type: 'movie' | 'tv'): Promise<string | null> {
  const res = await fetch(`/api/watch-link?id=${tmdbId}&type=${type}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.link || null;
}

function PosterCard({ item, type, userServices }: { item: BrowseResult; type: 'movie' | 'tv'; userServices: string[] }) {
  const handleClick = async () => {
    if (item.media_type === 'movie' || item.media_type === 'tv') {
      const link = await fetchStreamingLink(item.id, item.media_type);
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    }
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
            {userServices[0] && <ServiceBadge name={userServices[0]} size={40} />}
            <div className="text-gray-500">{type === 'tv' ? <Tv size={28} /> : <Film size={28} />}</div>
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
          </div>
        </div>

        {item.rating > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-0">
            <Star size={10} className="fill-yellow-400 text-yellow-400" />{item.rating}
          </div>
        )}
      </div>
      <p className="text-gray-800 dark:text-gray-200 text-xs mt-1.5 leading-tight line-clamp-2 px-0.5">{item.title}</p>
      <p className="text-gray-500 dark:text-gray-500 text-xs px-0.5">{item.year}</p>
    </motion.div>
  );
}

function HorizontalRow({ row, type, userServices }: { row: GenreRow; type: 'movie' | 'tv'; userServices: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mb-10">
      <h2 className="text-gray-900 dark:text-white text-lg font-bold mb-3 px-0">{row.name}</h2>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: 'thin' }}
      >
        {row.results.map(item => (
          <PosterCard key={item.id} item={item} type={type} userServices={userServices} />
        ))}
      </div>
    </div>
  );
}

export function BrowseClient({ userEmail, displayName }: BrowseClientProps) {
  const [type, setType] = useState<'movie' | 'tv'>('movie');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [genres, setGenres] = useState<GenreRow[]>([]);
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { load(type, sortBy); }, [type, sortBy, load]);

  const handleTypeChange = (t: 'movie' | 'tv') => { setType(t); };
  const handleSortChange = (s: string) => { setSortBy(s); };

  const videoServices = serviceNames.filter(s => BILLING_URLS[s]);

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

        {/* Controls */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {/* Type toggle */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {([['movie', <Film key="f" size={13} />, 'Movies'], ['tv', <Tv key="t" size={13} />, 'TV Shows']] as const).map(([t, icon, label]) => (
              <button key={t} onClick={() => handleTypeChange(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${type === t ? 'bg-brand text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <SortAsc size={14} />
            <select value={sortBy} onChange={e => handleSortChange(e.target.value)}
              className="bg-transparent border-none text-sm text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer">
              <option value="popularity.desc">Most popular</option>
              <option value="vote_average.desc">Top rated</option>
              <option value="primary_release_date.desc">Newest</option>
            </select>
          </div>
        </div>

        {/* Genre rows */}
        {loading ? (
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
            {genres.map(row => (
              <HorizontalRow key={row.id} row={row} type={type} userServices={videoServices} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
