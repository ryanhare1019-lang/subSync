'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { SubscriptionList } from '@/components/SubscriptionList';
import { RecommendationFeed } from '@/components/RecommendationFeed';
import { Subscription, Recommendation } from '@/types';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

interface DashboardClientProps {
  userEmail?: string | null;
  displayName?: string | null;
  hasTasteProfile: boolean;
}

export function DashboardClient({ userEmail, displayName, hasTasteProfile }: DashboardClientProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [subsRes, recsRes] = await Promise.all([
      fetch('/api/subscriptions'),
      fetch('/api/recommendations'),
    ]);
    if (subsRes.ok) setSubscriptions(await subsRes.json());
    if (recsRes.ok) setRecommendations(await recsRes.json());
    setInitialLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddSubscription = async (data: {
    service_name: string;
    service_type: string;
    monthly_cost: number;
    billing_cycle: 'monthly' | 'annual';
    is_trial: boolean;
  }) => {
    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const newSub = await res.json();
      setSubscriptions(prev => [newSub, ...prev]);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    setSubscriptions(prev => prev.filter(s => s.id !== id));
    await fetch('/api/subscriptions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  };

  const handleUpdateSubscription = async (id: string, updates: Partial<Subscription>) => {
    const res = await fetch('/api/subscriptions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSubscriptions(prev => prev.map(s => s.id === id ? updated : s));
    }
  };

  const handleGetRecommendations = async () => {
    setRecsLoading(true);
    try {
      const res = await fetch('/api/recommendations', { method: 'POST' });
      if (res.ok) {
        const newRecs = await res.json();
        setRecommendations(prev => [...newRecs, ...prev]);
      }
    } finally {
      setRecsLoading(false);
    }
  };

  const handleFeedback = async (id: string, feedback: 'loved' | 'watched' | 'not_interested') => {
    await fetch('/api/recommendations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, user_feedback: feedback }),
    });
    setRecommendations(prev =>
      prev.map(r => r.id === id ? { ...r, user_feedback: feedback } : r)
    );
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar userEmail={userEmail} displayName={displayName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Taste profile banner */}
        {!hasTasteProfile && (
          <Link
            href="/onboarding"
            className="flex items-center justify-between gap-4 p-4 mb-6 bg-brand/10 border border-brand/25 rounded-xl hover:bg-brand/15 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center">
                <Sparkles size={16} className="text-brand" />
              </div>
              <div>
                <p className="text-gray-900 dark:text-white text-sm font-semibold">Set up your taste profile</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Tell us what you love and we'll find perfect picks for you</p>
              </div>
            </div>
            <span className="text-brand text-sm font-medium group-hover:translate-x-0.5 transition-transform">Start →</span>
          </Link>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <SubscriptionList
              subscriptions={subscriptions}
              onAdd={handleAddSubscription}
              onDelete={handleDeleteSubscription}
              onUpdate={handleUpdateSubscription}
            />
          </div>
          <div className="lg:col-span-3">
            <RecommendationFeed
              recommendations={recommendations}
              userServices={subscriptions.map(s => s.service_name)}
              onGetRecs={handleGetRecommendations}
              onFeedback={handleFeedback}
              loading={recsLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
