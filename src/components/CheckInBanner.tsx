'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServiceBadge } from './ServiceIcon';
import { Flame, CheckCircle2, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { Subscription } from '@/types';

interface CheckInStatus {
  checked_in_today: boolean;
  today_services: string[];
  current_streak: number;
  longest_streak: number;
  broke_streak: boolean;
  previous_streak: number | null;
}

interface CheckInBannerProps {
  subscriptions: Subscription[];
  onCheckinComplete?: () => void;
}

export function CheckInBanner({ subscriptions, onCheckinComplete }: CheckInBannerProps) {
  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tablesMissing, setTablesMissing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/checkin/status')
      .then(r => r.json())
      .then((data: CheckInStatus & { tables_missing?: boolean }) => {
        if (data.tables_missing) {
          setTablesMissing(true);
          setLoading(false);
          return;
        }
        setStatus(data);
        if (data.checked_in_today) {
          setSelected(new Set(data.today_services));
          setCollapsed(true);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggle = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const isCheckedIn = status?.checked_in_today ?? false;

  const handleSubmit = async () => {
    if (selected.size === 0 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          services: Array.from(selected),
          replace: isCheckedIn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to save check-in.');
        return;
      }
      setStatus(prev => prev ? {
        ...prev,
        checked_in_today: true,
        today_services: Array.from(selected),
        current_streak: data.current_streak,
        longest_streak: data.longest_streak,
      } : {
        checked_in_today: true,
        today_services: Array.from(selected),
        current_streak: data.current_streak,
        longest_streak: data.longest_streak,
        broke_streak: false,
        previous_streak: null,
      });
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
        setCollapsed(true);
      }, 1600);
      onCheckinComplete?.();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || subscriptions.length === 0) return null;

  if (tablesMissing) {
    return (
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-4 py-3 mb-6 text-xs text-amber-700 dark:text-amber-400">
        <strong>Missing database tables.</strong> Run the spending dashboard SQL migrations in Supabase (activity_log, spending_snapshots, checkin_streaks) to enable check-ins.
      </div>
    );
  }

  const streak = status?.current_streak ?? 0;
  const showForm = !isCheckedIn || editing;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl mb-6 overflow-hidden">
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          {isCheckedIn && !editing ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
            <Flame size={16} className="text-orange-400" />
          )}
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {isCheckedIn && !editing ? 'Checked in today ✓' : 'What did you use today?'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-lg leading-none">🔥</span>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                {streak > 0 ? `${streak} day${streak === 1 ? '' : 's'}` : 'Start your streak!'}
              </p>
              {(status?.longest_streak ?? 0) > 0 && (
                <p className="text-xs text-gray-400 leading-none mt-0.5">
                  Best: {status?.longest_streak}d
                </p>
              )}
            </div>
          </div>
          {collapsed
            ? <ChevronDown size={15} className="text-gray-400" />
            : <ChevronUp size={15} className="text-gray-400" />
          }
        </div>
      </div>

      {/* Streak-broke nudge */}
      <AnimatePresence>
        {status?.broke_streak && !isCheckedIn && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 overflow-hidden"
          >
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2 mb-3">
              Your {status.previous_streak}-day streak ended — start a new one today!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {/* Service icon grid — always interactive */}
              <div className="flex flex-wrap gap-3 mb-4">
                {subscriptions.map(sub => {
                  const isSelected = selected.has(sub.service_name);
                  const isReadOnly = isCheckedIn && !editing;
                  return (
                    <button
                      key={sub.service_name}
                      onClick={() => !isReadOnly && toggle(sub.service_name)}
                      className={`relative flex flex-col items-center gap-1 ${isReadOnly ? 'cursor-default' : 'group'}`}
                    >
                      <div className={`relative transition-all duration-150 ${
                        isSelected ? 'scale-110' : isReadOnly ? 'opacity-40' : 'opacity-60 hover:opacity-90 hover:scale-105'
                      }`}>
                        <ServiceBadge name={sub.service_name} size={48} />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                            <CheckCircle2 size={18} className="text-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 max-w-[56px] text-center truncate leading-tight">
                        {sub.service_name.replace('Amazon Prime', 'Prime').replace('Apple TV+', 'Apple TV')}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Submit error */}
              {submitError && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
                  {submitError}
                </p>
              )}

              {/* Action row */}
              <div className="flex items-center gap-2">
                {showForm ? (
                  <>
                    <button
                      onClick={handleSubmit}
                      disabled={selected.size === 0 || submitting}
                      className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {submitting
                        ? 'Saving…'
                        : isCheckedIn
                          ? `Save changes (${selected.size} selected)`
                          : `Log it (${selected.size} selected)`}
                    </button>
                    {isCheckedIn && editing && (
                      <button
                        onClick={() => {
                          setEditing(false);
                          setSelected(new Set(status?.today_services ?? []));
                        }}
                        className="px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <AnimatePresence>
                      {justSaved && (
                        <motion.span
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
                        >
                          <CheckCircle2 size={14} /> Saved ✓
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(true);
                        setCollapsed(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                    >
                      <Pencil size={11} /> Edit today's check-in
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
