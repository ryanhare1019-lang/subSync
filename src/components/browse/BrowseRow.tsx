'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BrowseCard, BrowseCardSkeleton } from './BrowseCard';
import type { BrowseRow as BrowseRowType, BrowseRowItem } from '@/types/browse';

interface BrowseRowProps {
  row: BrowseRowType;
  onCardClick: (item: BrowseRowItem) => void;
}

export function BrowseRowComponent({ row, onCardClick }: BrowseRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  if (row.items.length === 0) return null;

  return (
    <div className="mb-8 md:mb-10">
      <div className="flex items-center justify-between mb-3 px-4 md:px-6">
        <h2 className="text-gray-900 dark:text-white text-[18px] md:text-[20px] font-bold tracking-tight">
          {row.title}
        </h2>
      </div>

      <div className="relative group/row">
        {/* Left arrow — desktop only */}
        <button
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute left-0 top-0 bottom-[54px] z-10 w-10 bg-gradient-to-r from-white dark:from-[#0F0F0F] to-transparent md:flex items-center justify-center hidden opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"
        >
          <ChevronLeft className="text-gray-800 dark:text-white drop-shadow" size={24} />
        </button>

        {/* Scroll container */}
        <div
          ref={scrollRef}
          className="flex gap-2 md:gap-3 overflow-x-auto pl-4 md:pl-6 pr-4 pb-1"
          style={{
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {row.items.map((item) => (
            <div key={`${item.tmdb_id}-${item.media_type}`} style={{ scrollSnapAlign: 'start', flexShrink: 0 }}>
              <BrowseCard item={item} onClick={onCardClick} />
            </div>
          ))}
          {/* End spacer */}
          <div className="flex-shrink-0 w-4" />
        </div>

        {/* Right arrow — desktop only */}
        <button
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute right-0 top-0 bottom-[54px] z-10 w-10 bg-gradient-to-l from-white dark:from-[#0F0F0F] to-transparent md:flex items-center justify-center hidden opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"
        >
          <ChevronRight className="text-gray-800 dark:text-white drop-shadow" size={24} />
        </button>
      </div>
    </div>
  );
}

export function BrowseRowSkeleton() {
  return (
    <div className="mb-8 md:mb-10">
      <div className="flex items-center mb-3 px-4 md:px-6">
        <div className="h-5 w-44 rounded shimmer" />
      </div>
      <div className="flex gap-2 md:gap-3 pl-4 md:pl-6 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <BrowseCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
