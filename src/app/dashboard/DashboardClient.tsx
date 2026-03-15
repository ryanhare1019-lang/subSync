'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { SubscriptionList } from '@/components/SubscriptionList';
import { CheckInBanner } from '@/components/CheckInBanner';
import { SpendingStatCards } from '@/components/SpendingStatCards';
import { SpendingDonut, SpendingHistory } from '@/components/SpendingCharts';
import { CostPerUseTable } from '@/components/CostPerUseTable';
import { BrowsePage } from '@/components/browse/BrowsePage';
import { Subscription } from '@/types';
import Link from 'next/link';
import { Sparkles, CreditCard } from 'lucide-react';

interface DashboardClientProps {
  userEmail?: string | null;
  displayName?: string | null;
  hasTasteProfile: boolean;
}

type Tab = 'home' | 'spending';

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

const NAV_TABS = [
  { id: 'home' as Tab, label: 'Home' },
  { id: 'spending' as Tab, label: 'Spending' },
];

export function DashboardClient({ userEmail, displayName, hasTasteProfile }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [spendingStats, setSpendingStats] = useState<SpendingStats | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/subscriptions');
    if (res.ok) setSubscriptions(await res.json());
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

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar
        userEmail={userEmail}
        displayName={displayName}
        tabs={NAV_TABS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
      />

      {/* ── Home Tab: Browse + Search ── */}
      {activeTab === 'home' && (
        <>
          {/* Taste profile banner */}
          {!hasTasteProfile && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
              <Link
                href="/onboarding"
                className="flex items-center justify-between gap-4 p-4 bg-brand/10 border border-brand/25 rounded-xl hover:bg-brand/15 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center">
                    <Sparkles size={16} className="text-brand" />
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white text-sm font-semibold">Set up your taste profile</p>
                    <p className="text-gray-500 text-xs">Tell us what you love and we&apos;ll find perfect picks for you</p>
                  </div>
                </div>
                <span className="text-brand text-sm font-medium group-hover:translate-x-0.5 transition-transform">Start →</span>
              </Link>
            </div>
          )}
          <BrowsePage />
        </>
      )}

      {/* ── Spending Tab: Stats + Services ── */}
      {activeTab === 'spending' && (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-10">
          {/* Check-in banner */}
          {subscriptions.length > 0 && (
            <CheckInBanner
              subscriptions={subscriptions}
              onCheckinComplete={fetchSpendingStats}
            />
          )}

          {/* Spending stats */}
          {statsLoading || !spendingStats ? (
            <div className="text-center py-16 text-gray-400 text-sm">Loading spending data…</div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              <CreditCard size={36} className="mx-auto mb-3 text-brand opacity-60" />
              <p className="text-gray-900 dark:text-white font-medium">No subscriptions yet</p>
              <p className="text-gray-500 text-sm mt-1">Add your subscriptions below to see spending insights</p>
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

          {/* Services section */}
          <div className="mt-10">
            <h2 className="text-gray-900 dark:text-white text-lg font-bold mb-4">My Services</h2>
            <SubscriptionList
              subscriptions={subscriptions}
              onAdd={handleAddSubscription}
              onDelete={handleDeleteSubscription}
              onUpdate={handleUpdateSubscription}
            />
          </div>
        </main>
      )}
    </div>
  );
}
