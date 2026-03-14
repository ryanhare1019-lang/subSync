'use client';

import { useState } from 'react';
import { Subscription } from '@/types';
import { SubscriptionCard } from './SubscriptionCard';
import { AddSubscription } from './AddSubscription';
import { Button } from './ui/Button';
import { formatCurrency } from '@/lib/utils';
import { Plus, Wallet } from 'lucide-react';

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

      <div className="space-y-2">
        {subscriptions.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-gray-500">
            <Wallet size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No subscriptions yet</p>
            <p className="text-xs mt-1">Add your first service to get started</p>
          </div>
        ) : (
          subscriptions.map(sub => (
            <SubscriptionCard key={sub.id} subscription={sub} onDelete={onDelete} onUpdate={onUpdate} />
          ))
        )}
      </div>

      <AddSubscription open={addOpen} onClose={() => setAddOpen(false)} onAdd={onAdd} />
    </div>
  );
}
