'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServiceBadge } from './ServiceIcon';
import { Flame, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
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
}

export function CheckInBanner({ subscriptions }: CheckInBannerProps) {
  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  const videoSubs = subscriptions.filter(s => s.service_type !== 'streaming_music');
  const allSubs = subscriptions;

  useEffect(() => {
    fetch('/api/checkin/status')
      .then(r => r.json())
      .then((data: CheckInStatus) => {
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
    if (status?.checked_in_today && !submitted) return; // Already checked in; read-only unless they re-submit
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: Array.from(selected) }),
      });
      const data = await res.json();
      setStatus(prev => prev ? {
        ...prev,
        checked_in_today: true,
        today_services: Array.from(selected),
        current_streak: data.current_streak,
        longest_streak: data.longest_streak,
      } : prev);
      setSubmitted(true);
      // Collapse after a brief delay
      setTimeout(() => setCollapsed(true), 1800);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || allSubs.length === 0) return null;

  const isCheckedIn = status?.checked_in_today || submitted;
  const streak = status?.current_streak ?? 0;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl mb-6 overflow-hidden">
      {/* Header row — always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          {isCheckedIn ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
            <Flame size={16} className="text-orange-400" />
          )}
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {isCheckedIn ? 'Checked in today ✓' : 'What did you use today?'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Streak badge */}
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

      {/* Streak broke nudge */}
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
              {/* Service icon grid */}
              <div className="flex flex-wrap gap-3 mb-4">
                {allSubs.map(sub => {
                  const isSelected = selected.has(sub.service_name);
                  return (
                    <button
                      key={sub.service_name}
                      onClick={() => toggle(sub.service_name)}
                      className="relative flex flex-col items-center gap-1 group"
                    >
                      <div className={`relative transition-all duration-150 ${isSelected ? 'scale-110' : 'opacity-60 hover:opacity-90 hover:scale-105'}`}>
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

              {/* Submit button */}
              {!isCheckedIn ? (
                <button
                  onClick={handleSubmit}
                  disabled={selected.size === 0 || submitting}
                  className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Logging…' : `Log it (${selected.size} selected)`}
                </button>
              ) : (
                <AnimatePresence>
                  {submitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
                    >
                      <CheckCircle2 size={16} /> Updated ✓
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
