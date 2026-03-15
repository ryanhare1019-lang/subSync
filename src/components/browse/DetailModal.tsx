'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, ThumbsUp, Check, Star, Play } from 'lucide-react';
import { ServiceIcon } from '@/components/ServiceIcon';
import { SERVICE_SEARCH_URLS } from '@/lib/constants';
import type { BrowseRowItem } from '@/types/browse';

interface DetailModalProps {
  item: BrowseRowItem & { ai_reason?: string; match_score?: number };
  onClose: () => void;
}

export function DetailModal({ item, onClose }: DetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<'thumbs_up' | 'watched' | null>(null);

  const submitFeedback = async (type: 'thumbs_up' | 'watched' | 'not_interested') => {
    if (type !== 'not_interested') setFeedback(type as 'thumbs_up' | 'watched');
    await fetch('/api/browse/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdb_id: item.tmdb_id,
        title: item.title,
        media_type: item.media_type,
        feedback: type,
      }),
    });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const imageUrl = item.backdrop_url || item.poster_url;
  const watchUrl = item.service ? (SERVICE_SEARCH_URLS[item.service]?.(item.title) || null) : null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="relative w-full bg-[#1a1a1a] rounded-t-2xl md:rounded-2xl md:max-w-lg md:w-full overflow-hidden animate-slide-up md:animate-fade-in"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X size={16} className="text-white" />
        </button>

        {/* Image */}
        {imageUrl && (
          <div className="relative w-full" style={{ aspectRatio: item.backdrop_url ? '16/9' : '3/4', maxHeight: 280 }}>
            <Image
              src={imageUrl}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 512px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {/* Title + year */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h2 className="text-white text-[20px] font-bold leading-tight">{item.title}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.year && <span className="text-gray-400 text-[13px]">{item.year}</span>}
                <span className="text-gray-600 text-[13px]">·</span>
                <span className="text-gray-400 text-[13px] capitalize">{item.media_type === 'tv' ? 'TV Show' : 'Movie'}</span>
                {item.vote_average > 0 && (
                  <>
                    <span className="text-gray-600 text-[13px]">·</span>
                    <span className="text-yellow-400 text-[13px] flex items-center gap-0.5">
                      <Star size={11} fill="currentColor" />
                      {item.vote_average.toFixed(1)}
                    </span>
                  </>
                )}
                {item.service && (
                  <>
                    <span className="text-gray-600 text-[13px]">·</span>
                    <span className="flex items-center gap-1 text-gray-300 text-[12px]">
                      <ServiceIcon name={item.service} size={13} variant="white" />
                      {item.service}
                    </span>
                  </>
                )}
              </div>
            </div>
            {item.match_score != null && (
              <span className="text-emerald-400 text-[13px] font-bold flex-shrink-0">
                {item.match_score}% Match
              </span>
            )}
          </div>

          {/* Genre pills */}
          {item.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {item.genres.map((g) => (
                <span key={g} className="text-[11px] font-medium text-gray-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* AI reason */}
          {item.ai_reason && (
            <div className="bg-white/5 rounded-xl p-3 mb-4">
              <p className="text-[13px] text-gray-300 leading-relaxed">
                <span className="text-emerald-400 font-semibold">Why you&apos;ll like it: </span>
                {item.ai_reason}
              </p>
            </div>
          )}

          {/* Overview */}
          {item.overview && (
            <p className="text-gray-400 text-[13px] leading-relaxed mb-4 line-clamp-4">
              {item.overview}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {/* Watch button */}
            {watchUrl ? (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-colors active:scale-95"
              >
                <ServiceIcon name={item.service!} size={15} variant="white" />
                <Play size={13} fill="currentColor" />
                Watch on {item.service}
              </a>
            ) : (
              <button
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/40 border border-blue-500/30 text-blue-300 text-[13px] font-medium cursor-default"
                disabled
              >
                <Play size={13} />
                {item.service ? `On ${item.service}` : 'Watch'}
              </button>
            )}

            <button
              onClick={() => submitFeedback('thumbs_up')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-colors active:scale-95 ${
                feedback === 'thumbs_up'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-white/10 hover:bg-white/15 border-white/10 text-white'
              }`}
            >
              <ThumbsUp size={14} />
              Interested
            </button>

            <button
              onClick={() => submitFeedback('watched')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-colors active:scale-95 ${
                feedback === 'watched'
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : 'bg-white/10 hover:bg-white/15 border-white/10 text-white'
              }`}
            >
              <Check size={14} />
              Watched
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
