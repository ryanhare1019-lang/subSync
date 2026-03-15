'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { SubscriptionList } from '@/components/SubscriptionList';
import { RecommendationFeed } from '@/components/RecommendationFeed';
import { CheckInBanner } from '@/components/CheckInBanner';
import { SpendingStatCards } from '@/components/SpendingStatCards';
import { SpendingDonut, SpendingHistory } from '@/components/SpendingCharts';
import { CostPerUseTable } from '@/components/CostPerUseTable';
import { Subscription, Recommendation } from '@/types';
import Link from 'next/link';
import { Sparkles, LayoutGrid, Star, CreditCard } from 'lucide-react';

interface DashboardClientProps {
  userEmail?: string | null;
  displayName?: string | null;
  hasTasteProfile: boolean;
}

type Tab = 'spending' | 'discover' | 'subscriptions';

interface SpendingStats {
  currentMonthTotal: number;
  previousMonthTotal: number | null;
  monthOverMonthChange: number | null;
  yearTotal: number;
  activeServiceCount: number;
  bestValue: { service_name: string; cost_per_use: number } | null;
  costPerService: Array<{ service_name: string; monthly_cost: number; percentage_of_total: number }>;
  costPerUse: Array<{ service_name: string; monthly_cost: number; activity_count: number; cost_per_use: number | null }>;
  spendingHistory: Array<{ month: string; total: number }>;
}

export function DashboardClient({ userEmail, displayName, hasTasteProfile }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('spending');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [spendingStats, setSpendingStats] = useState<SpendingStats | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const [subsRes, recsRes] = await Promise.all([
      fetch('/api/subscriptions'),
      fetch('/api/recommendations'),
    ]);
    if (subsRes.ok) setSubscriptions(await subsRes.json());
    if (recsRes.ok) setRecommendations(await recsRes.json());
    setInitialLoading(false);
  }, []);

  const fetchSpendingStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      await fetch('/api/spending/snapshot', { method: 'POST' });
      const res = await fetch('/api/spending/stats');
      if (res.ok) setSpendingStats(await res.json());
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'spending') fetchSpendingStats();
  }, [activeTab, fetchSpendingStats]);

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
    setRecsError(null);
    try {
      const res = await fetch('/api/recommendations', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setRecommendations(prev => [...data, ...prev]);
      } else {
        setRecsError(data?.error || 'Failed to generate recommendations. Check that your Anthropic API key is set in .env.local.');
      }
    } catch {
      setRecsError('Network error while fetching recommendations.');
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
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'spending', label: 'Spending', icon: <CreditCard size={14} /> },
    { id: 'discover', label: 'Discover', icon: <Star size={14} /> },
    { id: 'subscriptions', label: 'Subscriptions', icon: <LayoutGrid size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar userEmail={userEmail} displayName={displayName} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Taste profile banner */}
        {!hasTasteProfile && (
          <Link
            href="/onboarding"
            className="flex items-center justify-between gap-4 p-4 mb-5 bg-brand/10 border border-brand/25 rounded-xl hover:bg-brand/15 transition-colors group"
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

        {/* Daily check-in — always visible when user has subscriptions */}
        {subscriptions.length > 0 && (
          <CheckInBanner
            subscriptions={subscriptions}
            onCheckinComplete={fetchSpendingStats}
          />
        )}

        {/* Tab nav */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl p-1 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Spending Tab ── */}
        {activeTab === 'spending' && (
          <div>
            {statsLoading || !spendingStats ? (
              <div className="text-center py-16 text-gray-400 text-sm">Loading spending data…</div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <CreditCard size={36} className="mx-auto mb-3 text-brand opacity-60" />
                <p className="text-gray-900 dark:text-white font-medium">No subscriptions yet</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Add your subscriptions to see spending insights</p>
              </div>
            ) : (
              <>
                <SpendingStatCards stats={spendingStats} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <SpendingDonut
                    data={spendingStats.costPerService}
                    totalMonthly={spendingStats.currentMonthTotal}
                  />
                  <SpendingHistory data={spendingStats.spendingHistory} />
                </div>
                <CostPerUseTable rows={spendingStats.costPerUse} />
              </>
            )}
          </div>
        )}

        {/* ── Discover Tab ── */}
        {activeTab === 'discover' && (
          <RecommendationFeed
            recommendations={recommendations}
            userServices={subscriptions.map(s => s.service_name)}
            onGetRecs={handleGetRecommendations}
            onFeedback={handleFeedback}
            loading={recsLoading}
            error={recsError}
          />
        )}

        {/* ── Subscriptions Tab ── */}
        {activeTab === 'subscriptions' && (
          <SubscriptionList
            subscriptions={subscriptions}
            onAdd={handleAddSubscription}
            onDelete={handleDeleteSubscription}
            onUpdate={handleUpdateSubscription}
          />
        )}
      </main>
    </div>
  );
}
