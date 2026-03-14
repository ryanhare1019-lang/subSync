'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { BrowseResult } from '@/lib/tmdb';
import Image from 'next/image';
import { Film, Tv, Star, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';

interface BrowseClientProps {
  userEmail?: string | null;
  displayName?: string | null;
}

function MovieCard({ item }: { item: BrowseResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-brand/40 hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="aspect-[2/3] relative bg-gray-100 dark:bg-gray-800">
        {item.poster_url ? (
          <Image
            src={item.poster_url}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600">
            {item.media_type === 'tv' ? <Tv size={32} /> : <Film size={32} />}
          </div>
        )}
        {item.rating > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded-md">
            <Star size={10} className="fill-yellow-400 text-yellow-400" />
            {item.rating}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-gray-900 dark:text-white text-sm font-medium leading-tight line-clamp-2">{item.title}</h3>
        <p className="text-gray-400 text-xs mt-1">{item.year}</p>
      </div>
    </motion.div>
  );
}

export function BrowseClient({ userEmail, displayName }: BrowseClientProps) {
  const [type, setType] = useState<'movie' | 'tv'>('movie');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<BrowseResult[]>([]);
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async (t: 'movie' | 'tv', p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/browse?type=${t}&page=${p}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setServiceNames(data.serviceNames || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(type, page); }, [type, page, fetch_]);

  const handleTypeChange = (t: 'movie' | 'tv') => {
    setType(t);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar userEmail={userEmail} displayName={displayName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Browse</h1>
          {serviceNames.length > 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Popular on {serviceNames.join(', ')}
            </p>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Add subscriptions to see what's available on your services
            </p>
          )}
        </div>

        {/* Type toggle */}
        <div className="flex items-center gap-2 mb-6">
          {(['movie', 'tv'] as const).map(t => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                type === t
                  ? 'bg-brand border-brand text-white'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t === 'movie' ? <Film size={14} /> : <Tv size={14} />}
              {t === 'movie' ? 'Movies' : 'TV Shows'}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl aspect-[2/3] animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20">
            <Film size={40} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-900 dark:text-white font-medium">Nothing to show yet</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              Add video subscriptions (Netflix, Hulu, etc.) to browse their catalogs here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {results.map(item => <MovieCard key={item.id} item={item} />)}
          </div>
        )}

        {/* Pagination */}
        {results.length > 0 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
              <ChevronLeft size={16} /> Prev
            </Button>
            <span className="text-gray-500 dark:text-gray-400 text-sm">Page {page}</span>
            <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={loading}>
              Next <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
