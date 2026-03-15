'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ServiceIcon } from '@/components/ServiceIcon';
import type { BrowseRowItem } from '@/types/browse';

interface BrowseCardProps {
  item: BrowseRowItem;
  onClick: (item: BrowseRowItem) => void;
}

export function BrowseCard({ item, onClick }: BrowseCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <button
      onClick={() => onClick(item)}
      className="relative flex-shrink-0 text-left group/card w-[110px] md:w-[160px]"
    >
      {/* Poster */}
      <div
        className="relative w-full rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 md:group-hover/card:scale-[1.04] transition-transform duration-150"
        style={{ aspectRatio: '2/3' }}
      >
        {item.poster_url ? (
          <Image
            src={item.poster_url}
            alt={item.title}
            fill
            className={`object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            sizes="(min-width: 768px) 160px, 110px"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gray-300 dark:bg-gray-700 flex items-center justify-center p-2">
            <span className="text-gray-500 dark:text-gray-400 text-[11px] text-center leading-tight">{item.title}</span>
          </div>
        )}
        {!imgLoaded && item.poster_url && (
          <div className="absolute inset-0 shimmer" />
        )}
      </div>

      {/* Title + year + service logo */}
      <div className="mt-1.5 px-0.5">
        <p className="text-gray-900 dark:text-white text-[12px] md:text-[13px] font-semibold leading-tight line-clamp-2">
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {item.year && (
            <span className="text-gray-500 text-[11px]">{item.year}</span>
          )}
          {item.service && (
            <>
              <span className="text-gray-400 text-[10px]">·</span>
              <ServiceIcon name={item.service} size={12} variant="brand" />
            </>
          )}
        </div>
      </div>
    </button>
  );
}

export function BrowseCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[110px] md:w-[160px]">
      <div className="rounded-lg shimmer w-full" style={{ aspectRatio: '2/3' }} />
      <div className="mt-1.5 space-y-1 px-0.5">
        <div className="h-3 rounded shimmer" style={{ width: '90%' }} />
        <div className="h-2.5 rounded shimmer" style={{ width: '55%' }} />
      </div>
    </div>
  );
}
