'use client';

import { useState } from 'react';
import { SERVICE_ICON_SLUGS, SERVICE_COLORS, SERVICE_LOGO_DOMAINS } from '@/lib/constants';

interface ServiceIconProps {
  name: string;
  size?: number;
  /** 'white' forces white icon via simpleicons (for dark backgrounds), 'brand' uses clearbit colored logo */
  variant?: 'white' | 'brand';
  className?: string;
}

function LetterFallback({ name, size, variant, color, className }: {
  name: string; size: number; variant: 'white' | 'brand'; color: string; className: string;
}) {
  return (
    <span
      className={`font-bold flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        fontSize: size * 0.55,
        color: variant === 'white' ? '#fff' : color,
        width: size,
        height: size,
      }}
    >
      {name[0]}
    </span>
  );
}

export function ServiceIcon({ name, size = 20, variant = 'white', className = '' }: ServiceIconProps) {
  const [clearbitFailed, setClearbitFailed] = useState(false);
  const [simpleiconFailed, setSimpleiconFailed] = useState(false);
  const slug = SERVICE_ICON_SLUGS[name];
  const domain = SERVICE_LOGO_DOMAINS[name];
  const color = SERVICE_COLORS[name] || '#279AF1';

  // White variant: simpleicons CDN with white hex
  if (variant === 'white') {
    if (!slug || simpleiconFailed) {
      return <LetterFallback name={name} size={size} variant={variant} color={color} className={className} />;
    }
    const src = `https://cdn.simpleicons.org/${slug}/ffffff`;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={className}
        style={{ display: 'block', flexShrink: 0 }}
        onError={() => setSimpleiconFailed(true)}
      />
    );
  }

  // Brand variant: try clearbit first, then simpleicons brand color, then letter
  if (variant === 'brand') {
    if (!domain && !slug) {
      return <LetterFallback name={name} size={size} variant={variant} color={color} className={className} />;
    }

    // Both clearbit and simpleicons failed - letter fallback
    if ((clearbitFailed || !domain) && (simpleiconFailed || !slug)) {
      return <LetterFallback name={name} size={size} variant={variant} color={color} className={className} />;
    }

    // Clearbit failed but simpleicons available
    if ((clearbitFailed || !domain) && slug && !simpleiconFailed) {
      const hex = color.replace('#', '');
      const src = `https://cdn.simpleicons.org/${slug}/${hex}`;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className={className}
          style={{ display: 'block', flexShrink: 0 }}
          onError={() => setSimpleiconFailed(true)}
        />
      );
    }

    // Use clearbit (real colored logo)
    const clearbitSrc = `https://logo.clearbit.com/${domain}?size=128`;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={clearbitSrc}
        alt={name}
        width={size}
        height={size}
        className={className}
        style={{ display: 'block', flexShrink: 0, borderRadius: size * 0.2 }}
        onError={() => setClearbitFailed(true)}
      />
    );
  }

  return <LetterFallback name={name} size={size} variant={variant} color={color} className={className} />;
}

/** Colored circle badge with logo inside */
export function ServiceBadge({ name, size = 40 }: { name: string; size?: number }) {
  const color = SERVICE_COLORS[name] || '#279AF1';
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
