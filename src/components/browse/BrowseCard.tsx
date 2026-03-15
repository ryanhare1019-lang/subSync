'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { BrowseRowItem } from '@/types/browse';

interface BrowseCardProps {
  item: BrowseRowItem;
  onClick: (item: BrowseRowItem) => void;
  desktopWidth?: number;
}

export function BrowseCard({ item, onClick, desktopWidth = 150 }: BrowseCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const mobileW = 110;
  const mobileH = 165;
  const desktopH = Math.round(desktopWidth * 1.5);

  return (
    <button
      onClick={() => onClick(item)}
      className="relative flex-shrink-0 text-left group/card"
      style={{ width: mobileW }}
    >
      {/* Poster container */}
      <div
        className="relative rounded-lg overflow-hidden bg-gray-800 md:scale-100 md:group-hover/card:scale-[1.05] transition-transform duration-150"
        style={{ width: mobileW, height: mobileH }}
      >
        {item.poster_url ? (
          <Image
            src={item.poster_url}
            alt={item.title}
            fill
            className={`object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            sizes={`${mobileW}px`}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gray-700 flex items-center justify-center p-2">
            <span className="text-gray-400 text-[11px] text-center leading-tight">{item.title}</span>
          </div>
        )}

        {/* Shimmer while image loads */}
        {!imgLoaded && item.poster_url && (
          <div className="absolute inset-0 shimmer" />
        )}

        {/* Service badge */}
        {item.service_abbrev && (
          <div
            className="absolute bottom-1.5 right-1.5 min-w-5 h-5 rounded-full flex items-center justify-center text-white font-bold px-1"
            style={{
              fontSize: 8,
              backgroundColor: item.service_color || '#444',
              boxShadow: '0 0 0 1.5px rgba(0,0,0,0.5)',
            }}
          >
            {item.service_abbrev}
          </div>
        )}
      </div>

      {/* Title + year */}
      <div className="mt-1.5 px-0.5">
        <p className="text-white text-[13px] font-semibold leading-tight line-clamp-2">{item.title}</p>
        <p className="text-gray-500 text-[11px] mt-0.5">{item.year ?? ''}</p>
      </div>
    </button>
  );
}

export function BrowseCardSkeleton() {
  return (
    <div className="flex-shrink-0" style={{ width: 110 }}>
      <div className="rounded-lg shimmer" style={{ width: 110, height: 165 }} />
      <div className="mt-1.5 space-y-1 px-0.5">
        <div className="h-3 rounded shimmer" style={{ width: '90%' }} />
        <div className="h-2.5 rounded shimmer" style={{ width: '55%' }} />
      </div>
    </div>
  );
}
