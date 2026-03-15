'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, Heart, ThumbsUp, ThumbsDown, Star, ChevronRight } from 'lucide-react';
import { ServiceIcon } from '@/components/ServiceIcon';
import { motion, AnimatePresence } from 'framer-motion';

interface SwiperItem {
  tmdb_id: number;
  title: string;
  year: number | null;
  media_type: 'movie' | 'tv';
  poster_url: string | null;
  overview: string;
  vote_average: number;
  service: string | null;
  service_color: string | null;
}

interface TasteSwiperModalProps {
  onClose: () => void;
}

type Vote = 'not_interested' | 'interested' | 'loved';

export function TasteSwiperModal({ onClose }: TasteSwiperModalProps) {
  const [items, setItems] = useState<SwiperItem[]>([]);
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [lastVote, setLastVote] = useState<Vote | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [totalVoted, setTotalVoted] = useState(0);

  const loadMore = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/taste-swiper?page=${p}`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(prev => p === 1 ? data.items : [...prev, ...data.items]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMore(1); }, [loadMore]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const current = items[index];

  const vote = async (type: Vote) => {
    if (!current || voting) return;
    setVoting(true);
    setLastVote(type);

    const feedbackMap: Record<Vote, 'thumbs_up' | 'watched' | 'not_interested'> = {
      interested: 'thumbs_up',
      loved: 'thumbs_up',
      not_interested: 'not_interested',
    };

    // Submit feedback
    await Promise.all([
      fetch('/api/browse/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: current.tmdb_id,
          title: current.title,
          media_type: current.media_type,
          feedback: feedbackMap[type],
        }),
      }),
      type === 'loved' ? fetch('/api/browse-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: current.tmdb_id,
          title: current.title,
          media_type: current.media_type,
          poster_url: current.poster_url,
          feedback: 'thumbs_up',
        }),
      }) : Promise.resolve(),
    ]);

    setTotalVoted(v => v + 1);
    setImgLoaded(false);

    setTimeout(() => {
      setVoting(false);
      setLastVote(null);
      const nextIndex = index + 1;
      setIndex(nextIndex);
      // Load more when near end
      if (nextIndex >= items.length - 5) {
        setPage(p => {
          loadMore(p + 1);
          return p + 1;
        });
      }
    }, 300);
  };

  const isFinished = !loading && index >= items.length && items.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="relative w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white text-lg font-bold">Build Your Taste</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {totalVoted > 0 ? `${totalVoted} rated · keeps getting smarter` : 'Rate movies to personalize your feed'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          {loading && items.length === 0 ? (
            <div className="w-full rounded-2xl shimmer" style={{ aspectRatio: '2/3' }} />
          ) : isFinished ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full rounded-2xl bg-gray-900 border border-gray-700 flex flex-col items-center justify-center py-16 px-6 text-center"
            >
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-white font-bold text-xl mb-2">All caught up!</h3>
              <p className="text-gray-400 text-sm mb-6">
                You&apos;ve rated {totalVoted} titles. Your recommendations are getting sharper.
              </p>
              <button
                onClick={() => { setIndex(0); setPage(1); loadMore(1); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-medium text-sm hover:bg-brand-hover transition-colors"
              >
                Load more <ChevronRight size={14} />
              </button>
            </motion.div>
          ) : current ? (
            <motion.div
              key={current.tmdb_id}
              initial={{ opacity: 0, x: lastVote === 'not_interested' ? -30 : 30, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.25 }}
              className="w-full rounded-2xl overflow-hidden bg-gray-900 border border-gray-800"
            >
              {/* Poster */}
              <div className="relative w-full" style={{ aspectRatio: '2/3', maxHeight: 380 }}>
                {current.poster_url ? (
                  <>
                    <Image
                      key={current.tmdb_id}
                      src={current.poster_url}
                      alt={current.title}
                      fill
                      className={`object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setImgLoaded(true)}
                      sizes="400px"
                      priority
                    />
                    {!imgLoaded && <div className="absolute inset-0 shimmer" />}
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <span className="text-gray-500 text-sm">{current.title}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />

                {/* Vote feedback overlay */}
                <AnimatePresence>
                  {voting && lastVote && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${
                        lastVote === 'loved' ? 'bg-pink-500/90 border-pink-400' :
                        lastVote === 'interested' ? 'bg-emerald-500/90 border-emerald-400' :
                        'bg-red-500/90 border-red-400'
                      }`}>
                        {lastVote === 'loved' ? <Heart size={28} fill="white" className="text-white" /> :
                         lastVote === 'interested' ? <ThumbsUp size={28} className="text-white" /> :
                         <ThumbsDown size={28} className="text-white" />}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-white font-bold text-[18px] leading-tight">{current.title}</h3>
                  {current.vote_average > 0 && (
                    <span className="flex items-center gap-1 text-yellow-400 text-[13px] font-semibold flex-shrink-0">
                      <Star size={12} fill="currentColor" />
                      {current.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {current.year && (
                    <span className="text-gray-400 text-[12px]">{current.year}</span>
                  )}
                  <span className="text-gray-600 text-[11px]">·</span>
                  <span className="text-gray-400 text-[12px] capitalize">
                    {current.media_type === 'tv' ? 'TV Show' : 'Movie'}
                  </span>
                  {current.service && (
                    <>
                      <span className="text-gray-600 text-[11px]">·</span>
                      <span className="flex items-center gap-1 text-gray-300 text-[12px]">
                        <ServiceIcon name={current.service} size={13} variant="brand" />
                        {current.service}
                      </span>
                    </>
                  )}
                </div>

                {current.overview && (
                  <p className="text-gray-400 text-[13px] leading-relaxed line-clamp-3 mb-4">
                    {current.overview}
                  </p>
                )}

                {/* Vote buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => vote('not_interested')}
                    disabled={voting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-[13px] font-medium transition-colors active:scale-95 disabled:opacity-50"
                  >
                    <ThumbsDown size={14} />
                    Nope
                  </button>
                  <button
                    onClick={() => vote('interested')}
                    disabled={voting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[13px] font-medium transition-colors active:scale-95 disabled:opacity-50"
                  >
                    <ThumbsUp size={14} />
                    Interested
                  </button>
                  <button
                    onClick={() => vote('loved')}
                    disabled={voting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-400 text-[13px] font-medium transition-colors active:scale-95 disabled:opacity-50"
                  >
                    <Heart size={14} />
                    Love it
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Progress dots */}
        {items.length > 0 && !isFinished && (
          <div className="flex justify-center gap-1.5 mt-4">
            {Array.from({ length: Math.min(items.length, 8) }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  i === index % 8
                    ? 'w-4 h-1.5 bg-brand'
                    : 'w-1.5 h-1.5 bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
