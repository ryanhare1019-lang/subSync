'use client';

import { useState } from 'react';
import { Subscription } from '@/types';
import { SERVICE_COLORS } from '@/lib/constants';
import { formatCurrency, daysUntil } from '@/lib/utils';
import { Pencil, Trash2, AlertTriangle, Check, X } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);

  const accentColor = SERVICE_COLORS[subscription.service_name] || '#3B82F6';
  const isTrialEnding = subscription.is_trial && subscription.trial_end_date
    ? daysUntil(subscription.trial_end_date) <= 7
    : false;

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(subscription.id, {
      monthly_cost: parseFloat(cost),
      billing_cycle: cycle as 'monthly' | 'annual',
    });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div
      className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex items-center gap-4 hover:border-gray-600 transition-all group"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
    >
      {/* Service initial avatar */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ backgroundColor: accentColor + '22', border: `1px solid ${accentColor}44` }}
      >
        <span style={{ color: accentColor }}>
          {subscription.service_name[0]}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-medium text-sm">{subscription.service_name}</span>
          <span className="text-gray-500 text-xs capitalize">{subscription.service_type.replace('_', ' ')}</span>
          {subscription.is_trial && (
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
              Trial
            </span>
          )}
          {isTrialEnding && (
            <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-md">
              <AlertTriangle size={10} />
              Ends soon
            </span>
          )}
        </div>
        {editing ? (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-gray-400 text-xs">$</span>
            <input
              type="number"
              value={cost}
              onChange={e => setCost(e.target.value)}
              className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
              step="0.01"
            />
            <select
              value={cycle}
              onChange={e => setCycle(e.target.value as 'monthly' | 'annual')}
              className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        ) : (
          <p className="text-gray-400 text-xs mt-0.5 capitalize">{subscription.billing_cycle} billing</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {editing ? (
          <>
            <Button size="sm" onClick={handleSave} loading={saving} className="h-7 px-2">
              <Check size={13} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 px-2">
              <X size={13} />
            </Button>
          </>
        ) : (
          <>
            <span className="text-white font-semibold text-sm">
              {formatCurrency(subscription.monthly_cost)}
              <span className="text-gray-500 font-normal text-xs">/mo</span>
            </span>
            <button
              onClick={() => setEditing(true)}
              className="text-gray-500 hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100 p-1"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onDelete(subscription.id)}
              className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
