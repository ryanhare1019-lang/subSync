'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Subscription } from '@/types';
import { SERVICE_COLORS, BILLING_URLS } from '@/lib/constants';
import { ServiceBadge } from './ServiceIcon';
import { formatCurrency, daysUntil } from '@/lib/utils';
import { Pencil, ExternalLink, AlertTriangle, Check, X, Trash2, Calendar } from 'lucide-react';
import { Button } from './ui/Button';

interface SubscriptionCardProps {
  subscription: Subscription;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Subscription>) => void;
}

export function SubscriptionCard({ subscription, onDelete, onUpdate }: SubscriptionCardProps) {
  const [editing, setEditing] = useState(false);
  const [cost, setCost] = useState(subscription.monthly_cost.toString());
  const [cycle, setCycle] = useState(subscription.billing_cycle);
  const [renewal, setRenewal] = useState(subscription.next_renewal || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const accentColor = SERVICE_COLORS[subscription.service_name] || '#D946EF';
  const billingUrl = BILLING_URLS[subscription.service_name];

  const daysLeft = subscription.next_renewal ? daysUntil(subscription.next_renewal) : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
  const isExpiredOrToday = daysLeft !== null && daysLeft <= 0;

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(subscription.id, {
      monthly_cost: parseFloat(cost),
      billing_cycle: cycle as 'monthly' | 'annual',
      next_renewal: renewal || null,
    });
    setSaving(false);
    setEditing(false);
  };

  const handleBillingClick = () => {
    if (billingUrl) window.open(billingUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -120, transition: { duration: 0.25 } }}
      className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3 hover:border-gray-200 dark:hover:border-gray-600 transition-all group"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
    >
      <ServiceBadge name={subscription.service_name} size={40} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-900 dark:text-white font-medium text-sm">{subscription.service_name}</span>
          {subscription.is_trial && (
            <span className="text-xs bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 px-1.5 py-0.5 rounded-md">Trial</span>
          )}
          {(isExpiringSoon || isExpiredOrToday) && (
            <span className="flex items-center gap-1 text-xs bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-1.5 py-0.5 rounded-md">
              <AlertTriangle size={10} />
              {isExpiredOrToday ? 'Renews today' : `${daysLeft}d left`}
            </span>
          )}
        </div>

        {editing ? (
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">$</span>
              <input type="number" value={cost} onChange={e => setCost(e.target.value)}
                className="w-20 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-brand"
                step="0.01" />
              <select value={cycle} onChange={e => setCycle(e.target.value as 'monthly' | 'annual')}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-brand">
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={11} className="text-gray-400" />
              <input type="date" value={renewal} onChange={e => setRenewal(e.target.value)}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-brand"
                placeholder="Next renewal date" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-gray-400 dark:text-gray-500 text-xs capitalize">{subscription.billing_cycle}</p>
            {subscription.next_renewal && daysLeft !== null && daysLeft > 0 && (
              <span className="text-gray-300 dark:text-gray-600 text-xs">· renews in {daysLeft}d</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {editing ? (
          <>
            <Button size="sm" onClick={handleSave} loading={saving} className="h-7 px-2"><Check size={13} /></Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setConfirmDelete(false); }} className="h-7 px-2"><X size={13} /></Button>
            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Remove?</span>
                <button onClick={() => onDelete(subscription.id)}
                  className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium">
                  Yes
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  No
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="text-red-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 size={13} />
              </button>
            )}
          </>
        ) : (
          <>
            <span className="text-gray-900 dark:text-white font-semibold text-sm">
              {formatCurrency(subscription.monthly_cost)}
              <span className="text-gray-400 font-normal text-xs">/mo</span>
            </span>
            <button onClick={() => setEditing(true)}
              className="text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              <Pencil size={13} />
            </button>
            {billingUrl && (
              <button onClick={handleBillingClick}
                className="text-gray-300 dark:text-gray-600 hover:text-brand transition-colors opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                title="Manage subscription">
                <ExternalLink size={13} />
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
