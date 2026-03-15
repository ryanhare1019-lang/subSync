'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, ThumbsUp, ThumbsDown, Check, Star } from 'lucide-react';
import type { BrowseRowItem } from '@/types/browse';

interface DetailModalProps {
  item: BrowseRowItem & { ai_reason?: string; match_score?: number };
  onClose: () => void;
}

export function DetailModal({ item, onClose }: DetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<'thumbs_up' | 'watched' | 'not_interested' | null>(null);

  const submitFeedback = async (type: 'thumbs_up' | 'watched' | 'not_interested') => {
    setFeedback(type);
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

  // Close on backdrop click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const imageUrl = item.backdrop_url || item.poster_url;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      {/* Sheet / Modal */}
      <div
        ref={sheetRef}
        className="
          relative w-full bg-[#1a1a1a] rounded-t-2xl md:rounded-2xl
          md:max-w-lg md:w-full overflow-hidden
          animate-slide-up md:animate-fade-in
        "
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Close button */}
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
              <div className="flex items-center gap-2 mt-1">
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
                <span
                  key={g}
                  className="text-[11px] font-medium text-gray-300 bg-white/10 px-2.5 py-0.5 rounded-full"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Service */}
          {item.service && (
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold"
                style={{ fontSize: 8, backgroundColor: item.service_color || '#444' }}
              >
                {item.service_abbrev}
              </div>
              <span className="text-gray-300 text-[13px]">
                {item.on_user_service ? 'Available on' : 'On'} <strong className="text-white">{item.service}</strong>
              </span>
            </div>
          )}

          {/* AI reason */}
          {item.ai_reason && (
            <div className="bg-white/5 rounded-xl p-3 mb-4">
              <p className="text-[13px] text-gray-300 leading-relaxed">
                <span className="text-emerald-400 font-semibold">Why you'll like it: </span>
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
            <button
              onClick={() => submitFeedback('thumbs_up')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-medium transition-colors active:scale-95 ${
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
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-medium transition-colors active:scale-95 ${
                feedback === 'watched'
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : 'bg-white/10 hover:bg-white/15 border-white/10 text-white'
              }`}
            >
              <Check size={14} />
              Watched
            </button>
            <button
              onClick={() => submitFeedback('not_interested')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-medium transition-colors active:scale-95 ${
                feedback === 'not_interested'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-white/10 hover:bg-white/15 border-white/10 text-gray-400'
              }`}
            >
              <ThumbsDown size={14} />
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
