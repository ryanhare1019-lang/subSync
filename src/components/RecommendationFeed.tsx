'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Recommendation } from '@/types';
import { Button } from './ui/Button';
import { Star, Heart, Check, X, Film, Tv, Music, BookOpen, Mic, RefreshCw } from 'lucide-react';
import Image from 'next/image';

interface RecommendationFeedProps {
  recommendations: Recommendation[];
  userServices: string[];
  onGetRecs: () => Promise<void>;
  onFeedback: (id: string, feedback: 'loved' | 'watched' | 'not_interested') => Promise<void>;
  loading: boolean;
  error?: string | null;
}

const MediaIcon = ({ type }: { type: string }) => {
  const cls = "w-3 h-3";
  switch (type) {
    case 'movie': return <Film className={cls} />;
    case 'tv': return <Tv className={cls} />;
    case 'music': return <Music className={cls} />;
    case 'book': return <BookOpen className={cls} />;
    case 'podcast': return <Mic className={cls} />;
    default: return <Film className={cls} />;
  }
};

function RecCard({ rec, userServices, onFeedback }: {
  rec: Recommendation;
  userServices: string[];
  onFeedback: (id: string, feedback: 'loved' | 'watched' | 'not_interested') => Promise<void>;
}) {
  const [feedback, setFeedback] = useState(rec.user_feedback);
  const [busy, setBusy] = useState(false);
  const hasService = rec.service_name ? userServices.includes(rec.service_name) : true;

  const handleFeedback = async (type: 'loved' | 'watched' | 'not_interested') => {
    if (feedback === type || busy) return;
    setBusy(true);
    await onFeedback(rec.id, type);
    setFeedback(type);
    setBusy(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-all flex"
    >
      {/* Poster */}
      <div className="w-24 sm:w-28 flex-shrink-0 bg-gray-100 dark:bg-gray-800 relative min-h-[140px]">
        {rec.poster_url ? (
          <Image
            src={rec.poster_url}
            alt={rec.title}
            fill
            className="object-cover"
            sizes="112px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600">
            <MediaIcon type={rec.media_type} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 min-w-0">
        <h3 className="text-gray-900 dark:text-white font-semibold text-sm leading-tight">{rec.title}</h3>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs capitalize">
            <MediaIcon type={rec.media_type} />
            {rec.media_type}
          </span>
          {rec.service_name && (
            <span className={`text-xs px-1.5 py-0.5 rounded-md border ${
              hasService
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            }`}>
              {rec.service_name}{!hasService && ' (not subscribed)'}
            </span>
          )}
        </div>

        {rec.ai_reason && (
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-2 leading-relaxed line-clamp-2">
            {rec.ai_reason}
          </p>
        )}

        {/* Feedback */}
        <div className="flex items-center gap-1.5 mt-3">
          {[
            { type: 'loved' as const, icon: <Heart size={11} className={feedback === 'loved' ? 'fill-current' : ''} />, label: 'Loved', active: 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30', base: 'text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 border-gray-200 dark:border-gray-700' },
            { type: 'watched' as const, icon: <Check size={11} />, label: 'Watched', active: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30', base: 'text-gray-400 dark:text-gray-500 hover:text-emerald-500 dark:hover:text-emerald-400 border-gray-200 dark:border-gray-700' },
            { type: 'not_interested' as const, icon: <X size={11} />, label: 'Not for me', active: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600', base: 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border-gray-200 dark:border-gray-700' },
          ].map(btn => (
            <button
              key={btn.type}
              onClick={() => handleFeedback(btn.type)}
              disabled={busy}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all bg-transparent border ${feedback === btn.type ? btn.active : btn.base}`}
            >
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function RecommendationFeed({ recommendations, userServices, onGetRecs, onFeedback, loading, error }: RecommendationFeedProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Discover</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Personalized picks for you</p>
        </div>
        <Button onClick={onGetRecs} loading={loading} size="sm">
          <RefreshCw size={13} />
          {recommendations.length > 0 ? 'Refresh picks' : 'Find picks'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}
      {recommendations.length === 0 && !loading ? (
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <Star size={36} className="mx-auto mb-3 text-brand opacity-60" />
          <p className="text-gray-900 dark:text-white font-medium">Nothing here yet</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-4 max-w-xs mx-auto">
            Set up your taste profile and we'll find shows, movies, and more that match your vibe.
          </p>
          <Button onClick={onGetRecs} loading={loading}>
            Find my picks
          </Button>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {loading && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-brand text-sm">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Finding your picks...
                </div>
              </div>
            )}
            {recommendations.map(rec => (
              <RecCard key={rec.id} rec={rec} userServices={userServices} onFeedback={onFeedback} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
