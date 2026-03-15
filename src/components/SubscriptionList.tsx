'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Subscription } from '@/types';
import { SubscriptionCard } from './SubscriptionCard';
import { AddSubscription } from './AddSubscription';
import { PlaidLinkButton } from './PlaidLink';
import { Button } from './ui/Button';
import { formatCurrency, daysUntil } from '@/lib/utils';
import { Plus, Wallet, Bell } from 'lucide-react';

interface SubscriptionListProps {
  subscriptions: Subscription[];
  onAdd: (data: Parameters<React.ComponentProps<typeof AddSubscription>['onAdd']>[0]) => Promise<void>;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Subscription>) => void;
}

export function SubscriptionList({ subscriptions, onAdd, onDelete, onUpdate }: SubscriptionListProps) {
  const [addOpen, setAddOpen] = useState(false);

  const totalMonthly = subscriptions.reduce((sum, s) => {
    const cost = s.billing_cycle === 'annual' ? s.monthly_cost / 12 : s.monthly_cost;
    return sum + cost;
  }, 0);

  const expiring = subscriptions.filter(s =>
    s.next_renewal && daysUntil(s.next_renewal) <= 7 && daysUntil(s.next_renewal) >= 0
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Subscriptions</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{subscriptions.length} active</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={14} /> Add
        </Button>
      </div>

      {/* Expiry notifications */}
      <AnimatePresence>
        {expiring.map(s => {
          const days = daysUntil(s.next_renewal!);
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-3 py-2 mb-2 text-xs text-amber-700 dark:text-amber-400">
              <Bell size={12} />
              <span><strong>{s.service_name}</strong> renews {days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Monthly total */}
      <div className="bg-gradient-to-br from-brand/10 to-brand/5 border border-brand/20 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={14} className="text-brand" />
          <span className="text-brand text-xs font-medium">Monthly Spend</span>
        </div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalMonthly)}</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
          {formatCurrency(totalMonthly * 12)}/year across {subscriptions.length} services
        </p>
      </div>

      {/* Plaid auto-import */}
      <div className="mb-4">
        <PlaidLinkButton onSuccess={(imported) => {
          if (imported.length > 0) window.location.reload();
        }} />
      </div>

      <AnimatePresence mode="popLayout">
        {subscriptions.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-10 text-gray-400 dark:text-gray-500">
            <Wallet size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No subscriptions yet</p>
            <p className="text-xs mt-1">Add your first service to get started</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {subscriptions.map(sub => (
              <SubscriptionCard key={sub.id} subscription={sub} onDelete={onDelete} onUpdate={onUpdate} />
            ))}
          </div>
        )}
      </AnimatePresence>

      <AddSubscription open={addOpen} onClose={() => setAddOpen(false)} onAdd={onAdd} />
    </div>
  );
}
