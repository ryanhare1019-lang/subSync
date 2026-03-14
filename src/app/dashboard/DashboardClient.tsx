'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { SubscriptionList } from '@/components/SubscriptionList';
import { RecommendationFeed } from '@/components/RecommendationFeed';
import { Subscription, Recommendation } from '@/types';

interface DashboardClientProps {
  userEmail?: string | null;
  displayName?: string | null;
}

export function DashboardClient({ userEmail, displayName }: DashboardClientProps) {
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

  const userServices = subscriptions.map(s => s.service_name);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar userEmail={userEmail} displayName={displayName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Subscriptions panel */}
          <div className="lg:col-span-2">
            <SubscriptionList
              subscriptions={subscriptions}
              onAdd={handleAddSubscription}
              onDelete={handleDeleteSubscription}
              onUpdate={handleUpdateSubscription}
            />
          </div>

          {/* Recommendations panel */}
          <div className="lg:col-span-3">
            <RecommendationFeed
              recommendations={recommendations}
              userServices={userServices}
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
