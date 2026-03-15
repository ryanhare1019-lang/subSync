'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { SubscriptionList } from '@/components/SubscriptionList';
import { CheckInBanner } from '@/components/CheckInBanner';
import { SpendingStatCards } from '@/components/SpendingStatCards';
import { SpendingDonut, SpendingHistory } from '@/components/SpendingCharts';
import { CostPerUseTable } from '@/components/CostPerUseTable';
import { BrowsePage } from '@/components/browse/BrowsePage';
import { SearchPage } from '@/components/browse/SearchPage';
import { Subscription } from '@/types';
import Link from 'next/link';
import { Sparkles, Home, Search, CreditCard, LayoutGrid } from 'lucide-react';

interface DashboardClientProps {
  userEmail?: string | null;
  displayName?: string | null;
  hasTasteProfile: boolean;
}

type Tab = 'home' | 'search' | 'spending' | 'subscriptions';

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
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    );
  }

  const bottomTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'home',          label: 'Home',    icon: <Home size={20} /> },
    { id: 'search',        label: 'Search',  icon: <Search size={20} /> },
    { id: 'spending',      label: 'Spending', icon: <CreditCard size={20} /> },
    { id: 'subscriptions', label: 'Services', icon: <LayoutGrid size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Top nav — hide on browse/search tabs to give full-bleed look */}
      {activeTab !== 'home' && activeTab !== 'search' && (
        <Navbar userEmail={userEmail} displayName={displayName} />
      )}

      {/* Taste profile banner — show on home tab only */}
      {activeTab === 'home' && !hasTasteProfile && (
        <div className="px-4 pt-4 md:pt-6">
          <Link
            href="/onboarding"
            className="flex items-center justify-between gap-4 p-4 bg-brand/10 border border-brand/25 rounded-xl hover:bg-brand/15 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center">
                <Sparkles size={16} className="text-brand" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Set up your taste profile</p>
                <p className="text-gray-500 text-xs">Tell us what you love and we'll find perfect picks for you</p>
              </div>
            </div>
            <span className="text-brand text-sm font-medium group-hover:translate-x-0.5 transition-transform">Start →</span>
          </Link>
        </div>
      )}

      {/* ── Home Tab: Browse experience ── */}
      {activeTab === 'home' && <BrowsePage />}

      {/* ── Search Tab ── */}
      {activeTab === 'search' && <SearchPage />}

      {/* ── Spending + Subscriptions tabs: use standard layout ── */}
      {(activeTab === 'spending' || activeTab === 'subscriptions') && (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
          {/* Check-in banner on spending tab */}
          {activeTab === 'spending' && subscriptions.length > 0 && (
            <CheckInBanner
              subscriptions={subscriptions}
              onCheckinComplete={fetchSpendingStats}
            />
          )}

          {/* ── Spending Tab ── */}
          {activeTab === 'spending' && (
            <div>
              {statsLoading || !spendingStats ? (
                <div className="text-center py-16 text-gray-500 text-sm">Loading spending data…</div>
              ) : subscriptions.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-800 rounded-xl">
                  <CreditCard size={36} className="mx-auto mb-3 text-brand opacity-60" />
                  <p className="text-white font-medium">No subscriptions yet</p>
                  <p className="text-gray-500 text-sm mt-1">Add your subscriptions to see spending insights</p>
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
      )}

      {/* ── Mobile bottom navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-800/80 bg-[#0F0F0F]/95 backdrop-blur-md"
        style={{ height: 56, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-full">
          {bottomTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-brand' : ''}>{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
