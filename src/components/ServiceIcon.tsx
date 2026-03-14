'use client';

import { SERVICE_ICON_SLUGS, SERVICE_COLORS } from '@/lib/constants';

interface ServiceIconProps {
  name: string;
  size?: number;
  /** 'white' forces white icon (for colored backgrounds), 'brand' uses brand color */
  variant?: 'white' | 'brand';
  className?: string;
}

export function ServiceIcon({ name, size = 20, variant = 'white', className = '' }: ServiceIconProps) {
  const slug = SERVICE_ICON_SLUGS[name];
  const color = SERVICE_COLORS[name] || '#D946EF';

  if (!slug) {
    return (
      <span
        className={`font-bold flex items-center justify-center ${className}`}
        style={{ fontSize: size * 0.55, color: variant === 'white' ? '#fff' : color, width: size, height: size }}
      >
        {name[0]}
      </span>
    );
  }

  const hex = variant === 'white' ? 'ffffff' : color.replace('#', '');
  const src = `https://cdn.simpleicons.org/${slug}/${hex}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={className}
      style={{ display: 'block' }}
    />
  );
}

/** Colored circle badge with logo inside */
export function ServiceBadge({ name, size = 40 }: { name: string; size?: number }) {
  const color = SERVICE_COLORS[name] || '#D946EF';
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
