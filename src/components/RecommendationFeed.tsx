'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Recommendation } from '@/types';
import { Button } from './ui/Button';
import { Sparkles, Heart, Check, X, Film, Tv, Music, BookOpen, Mic } from 'lucide-react';
import Image from 'next/image';

interface RecommendationFeedProps {
  recommendations: Recommendation[];
  userServices: string[];
  onGetRecs: () => Promise<void>;
  onFeedback: (id: string, feedback: 'loved' | 'watched' | 'not_interested') => Promise<void>;
  loading: boolean;
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

function RecCard({
  rec,
  userServices,
  onFeedback,
}: {
  rec: Recommendation;
  userServices: string[];
  onFeedback: (id: string, feedback: 'loved' | 'watched' | 'not_interested') => Promise<void>;
}) {
  const [feedback, setFeedback] = useState(rec.user_feedback);
  const [loading, setLoading] = useState<string | null>(null);
  const hasService = rec.service_name ? userServices.includes(rec.service_name) : true;

  const handleFeedback = async (type: 'loved' | 'watched' | 'not_interested') => {
    if (feedback === type) return;
    setLoading(type);
    await onFeedback(rec.id, type);
    setFeedback(type);
    setLoading(null);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-all flex gap-0"
    >
      {/* Poster */}
      <div className="w-24 sm:w-28 flex-shrink-0 bg-gray-800 relative">
        {rec.poster_url ? (
          <Image
            src={rec.poster_url}
            alt={rec.title}
            fill
            className="object-cover"
            sizes="112px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            <MediaIcon type={rec.media_type} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-sm leading-tight truncate">{rec.title}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-gray-400 text-xs capitalize">
                <MediaIcon type={rec.media_type} />
                {rec.media_type}
              </span>
              {rec.service_name && (
                <span className={`text-xs px-1.5 py-0.5 rounded-md border ${
                  hasService
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}>
                  {rec.service_name}
                  {!hasService && ' — not subscribed'}
                </span>
              )}
            </div>
          </div>
        </div>

        {rec.ai_reason && (
          <p className="text-gray-400 text-xs mt-2 leading-relaxed line-clamp-2">
            {rec.ai_reason}
          </p>
        )}

        {/* Feedback buttons */}
        <div className="flex items-center gap-1.5 mt-3">
          <button
            onClick={() => handleFeedback('loved')}
            disabled={loading !== null}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
              feedback === 'loved'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-gray-800 text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-500/30'
            }`}
          >
            <Heart size={11} className={feedback === 'loved' ? 'fill-current' : ''} />
            Loved
          </button>
          <button
            onClick={() => handleFeedback('watched')}
            disabled={loading !== null}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
              feedback === 'watched'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-800 text-gray-400 hover:text-emerald-400 border border-gray-700 hover:border-emerald-500/30'
            }`}
          >
            <Check size={11} />
            Watched
          </button>
          <button
            onClick={() => handleFeedback('not_interested')}
            disabled={loading !== null}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
              feedback === 'not_interested'
                ? 'bg-gray-700 text-gray-300 border border-gray-600'
                : 'bg-gray-800 text-gray-500 hover:text-gray-300 border border-gray-700'
            }`}
          >
            <X size={11} />
            Not for me
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function RecommendationFeed({
  recommendations,
  userServices,
  onGetRecs,
  onFeedback,
  loading,
}: RecommendationFeedProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Recommendations</h2>
          <p className="text-gray-400 text-sm mt-0.5">Personalized by AI</p>
        </div>
        <Button onClick={onGetRecs} loading={loading} size="sm">
          <Sparkles size={14} />
          {recommendations.length > 0 ? 'Refresh' : 'Get Recs'}
        </Button>
      </div>

      {recommendations.length === 0 && !loading ? (
        <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
          <Sparkles size={36} className="mx-auto mb-3 text-blue-500 opacity-60" />
          <p className="text-white font-medium">No recommendations yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">
            Click "Get Recs" and Claude will analyze your taste profile
          </p>
          <Button onClick={onGetRecs} loading={loading}>
            <Sparkles size={14} />
            Get Recommendations
          </Button>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {loading && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-blue-400 text-sm">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating personalized recommendations...
                </div>
              </div>
            )}
            {recommendations.map(rec => (
              <RecCard
                key={rec.id}
                rec={rec}
                userServices={userServices}
                onFeedback={onFeedback}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
