'use client';

import { useState } from 'react';
import {
  siNetflix, siMax, siAppletv, siParamountplus, siCrunchyroll,
  siSpotify, siApplemusic, siTidal,
} from 'simple-icons';
import { SERVICE_COLORS } from '@/lib/constants';

// Services covered by simple-icons (inline SVG — no network, always works)
const SI_ICONS: Record<string, { path: string; hex: string }> = {
  'Netflix':      siNetflix,
  'HBO Max':      siMax,
  'Apple TV+':    siAppletv,
  'Paramount+':   siParamountplus,
  'Crunchyroll':  siCrunchyroll,
  'Spotify':      siSpotify,
  'Apple Music':  siApplemusic,
  'Tidal':        siTidal,
};

// Services missing from simple-icons — use locally hosted TMDB logos
const LOCAL_LOGOS: Record<string, string> = {
  'Hulu':          '/logos/hulu.png',
  'Disney+':       '/logos/disney-plus.png',
  'Amazon Prime':  '/logos/amazon-prime.png',
  'Peacock':       '/logos/peacock.png',
};

interface ServiceIconProps {
  name: string;
  size?: number;
  /** 'white' = white icon (for dark/colored backgrounds), 'brand' = official brand color */
  variant?: 'white' | 'brand';
  className?: string;
}

function LetterFallback({ name, size, color, className }: {
  name: string; size: number; color: string; className: string;
}) {
  return (
    <span
      className={`font-bold flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ fontSize: size * 0.55, color, width: size, height: size }}
    >
      {name[0]}
    </span>
  );
}

function LocalLogoIcon({ name, src, size, variant, className }: {
  name: string; src: string; size: number; variant: 'white' | 'brand'; className: string;
}) {
  const [failed, setFailed] = useState(false);
  const brandColor = SERVICE_COLORS[name] || '#279AF1';

  if (failed) {
    return (
      <LetterFallback
        name={name}
        size={size}
        color={variant === 'white' ? '#fff' : brandColor}
        className={className}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={className}
      style={{
        display: 'block',
        flexShrink: 0,
        borderRadius: size * 0.18,
        filter: variant === 'white' ? 'brightness(0) invert(1)' : undefined,
      }}
      onError={() => setFailed(true)}
    />
  );
}

export function ServiceIcon({ name, size = 20, variant = 'white', className = '' }: ServiceIconProps) {
  const si = SI_ICONS[name];
  const brandColor = SERVICE_COLORS[name] || (si ? `#${si.hex}` : '#279AF1');

  // Inline SVG from simple-icons — most reliable
  if (si) {
    const fill = variant === 'white' ? '#ffffff' : `#${si.hex}`;
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill}
        className={className}
        style={{ flexShrink: 0, display: 'block' }}
        aria-label={name}
      >
        <path d={si.path} />
      </svg>
    );
  }

  // Locally hosted TMDB logos for Hulu / Disney+ / Amazon Prime / Peacock
  const localSrc = LOCAL_LOGOS[name];
  if (localSrc) {
    return (
      <LocalLogoIcon
        name={name}
        src={localSrc}
        size={size}
        variant={variant}
        className={className}
      />
    );
  }

  // Letter fallback for any unknown service
  return (
    <LetterFallback
      name={name}
      size={size}
      color={variant === 'white' ? '#fff' : brandColor}
      className={className}
    />
  );
}

/** Colored circle badge with logo inside */
export function ServiceBadge({ name, size = 40 }: { name: string; size?: number }) {
  const si = SI_ICONS[name];
  const color = SERVICE_COLORS[name] || (si ? `#${si.hex}` : '#279AF1');
  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: color + '22',
        border: `1px solid ${color}44`,
      }}
    >
      <ServiceIcon name={name} size={size * 0.5} variant="brand" />
    </div>
  );
}
