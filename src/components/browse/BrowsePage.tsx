'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { BrowseHero, BrowseHeroSkeleton } from './BrowseHero';
import { BrowseRowComponent, BrowseRowSkeleton } from './BrowseRow';
import { DetailModal } from './DetailModal';
import type { BrowseRowsResponse, BrowseRowItem, HeroItem } from '@/types/browse';

export function BrowsePage() {
  const [data, setData] = useState<BrowseRowsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<(BrowseRowItem & { ai_reason?: string; match_score?: number }) | null>(null);

  const load = useCallback(async (bust = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/browse/rows${bust ? '?bust=1' : ''}`);
      if (!res.ok) throw new Error('Failed to load browse data');
      setData(await res.json());
    } catch {
      setError('Could not load content. Check your API keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCardClick = (item: BrowseRowItem) => setSelectedItem(item);
  const handleHeroMoreInfo = (item: HeroItem) => setSelectedItem(item);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <button
          onClick={() => load(true)}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Hero */}
      {loading || !data ? (
        <BrowseHeroSkeleton />
      ) : data.hero ? (
        <BrowseHero hero={data.hero} onMoreInfo={handleHeroMoreInfo} />
      ) : null}

      {/* Rows */}
      <div className="pt-4">
        {loading || !data ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <BrowseRowSkeleton key={i} />
            ))}
          </>
        ) : data.rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <p className="text-gray-500 text-sm mb-2">No content rows available.</p>
            <p className="text-gray-600 text-xs">Add streaming subscriptions to see personalized content.</p>
          </div>
        ) : (
          data.rows.map((row) => (
            <BrowseRowComponent key={row.id} row={row} onCardClick={handleCardClick} />
          ))
        )}
      </div>

      {/* Refresh button at bottom */}
      {!loading && data && (
        <div className="flex justify-center py-8">
          <button
            onClick={() => load(true)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-400 text-xs transition-colors"
          >
            <RefreshCw size={12} />
            Refresh recommendations
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
