'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Plus, Info } from 'lucide-react';
import type { HeroItem } from '@/types/browse';

interface BrowseHeroProps {
  hero: HeroItem;
  onMoreInfo: (item: HeroItem) => void;
}

export function BrowseHero({ hero, onMoreInfo }: BrowseHeroProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 'clamp(280px, 50vh, 480px)' }}
    >
      {/* Backdrop */}
      {hero.backdrop_url ? (
        <>
          {!imgLoaded && <div className="absolute inset-0 shimmer" />}
          <Image
            src={hero.backdrop_url}
            alt={hero.title}
            fill
            priority
            className={`object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            sizes="100vw"
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-gray-800" />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F0F]/70 via-[#0F0F0F]/20 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 p-5 md:p-10 max-w-xl">
        {/* Genre pills */}
        {hero.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {hero.genres.map((g) => (
              <span
                key={g}
                className="text-[11px] font-medium text-gray-200 bg-white/15 backdrop-blur-sm px-2.5 py-0.5 rounded-full"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-white text-[24px] md:text-[36px] font-extrabold leading-tight mb-1.5">
          {hero.title}
        </h1>

        {/* Match score + service */}
        <div className="flex items-center gap-2.5 mb-2">
          {hero.match_score != null && (
            <span className="text-[13px] font-bold text-emerald-400">
              {hero.match_score}% Match
            </span>
          )}
          {hero.service && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: hero.service_color || '#444' }}
            >
              {hero.service}
            </span>
          )}
          {hero.vote_average > 0 && (
            <span className="text-[12px] text-yellow-400 font-medium">
              ★ {hero.vote_average.toFixed(1)}
            </span>
          )}
        </div>

        {/* AI reason */}
        {hero.ai_reason && (
          <p className="text-gray-300 text-[13px] md:text-[14px] leading-snug mb-4 line-clamp-2">
            {hero.ai_reason}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/25 rounded-lg text-white text-[13px] font-medium transition-colors active:scale-95">
            <Plus size={15} />
            Watchlist
          </button>
          <button
            onClick={() => onMoreInfo(hero)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-100 rounded-lg text-black text-[13px] font-bold transition-colors active:scale-95"
          >
            <Info size={15} />
            More Info
          </button>
        </div>
      </div>
    </div>
  );
}

export function BrowseHeroSkeleton() {
  return (
    <div
      className="relative w-full shimmer"
      style={{ height: 'clamp(280px, 50vh, 480px)' }}
    >
      <div className="absolute bottom-0 left-0 p-5 md:p-10 space-y-2">
        <div className="h-8 w-64 rounded bg-gray-700/50" />
        <div className="h-4 w-48 rounded bg-gray-700/50" />
        <div className="h-4 w-56 rounded bg-gray-700/50" />
        <div className="flex gap-3 mt-2">
          <div className="h-9 w-24 rounded-lg bg-gray-700/50" />
          <div className="h-9 w-24 rounded-lg bg-gray-700/50" />
        </div>
      </div>
    </div>
  );
}
