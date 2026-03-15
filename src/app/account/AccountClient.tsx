'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { User, CreditCard, Sparkles, Sliders, Sun, Moon, Type, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

type Tab = 'profile' | 'subscriptions' | 'taste' | 'customization';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={15} /> },
  { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard size={15} /> },
  { id: 'taste', label: 'Taste Profile', icon: <Sparkles size={15} /> },
  { id: 'customization', label: 'Customization', icon: <Sliders size={15} /> },
];

export function AccountClient({ userEmail, displayName }: { userEmail: string; displayName: string }) {
  const [tab, setTab] = useState<Tab>('profile');
  const { theme, setTheme, textSize, setTextSize } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar userEmail={userEmail} displayName={displayName} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Account</h1>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl mb-8">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 flex-1 justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          {/* Profile tab */}
          {tab === 'profile' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>

              <div>
                <label className="text-gray-500 dark:text-gray-400 text-sm block mb-1.5">Display name</label>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-700 dark:text-gray-300 text-sm">
                  {displayName || <span className="text-gray-400 italic">Not set</span>}
                </div>
              </div>

              <div>
                <label className="text-gray-500 dark:text-gray-400 text-sm block mb-1.5">Email address</label>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-700 dark:text-gray-300 text-sm">
                  {userEmail}
                </div>
              </div>

              <div>
                <label className="text-gray-500 dark:text-gray-400 text-sm block mb-1.5">Password</label>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className={`text-sm ${showPassword ? 'text-gray-500 dark:text-gray-400' : 'tracking-widest text-gray-400 dark:text-gray-600'}`}>
                    {showPassword ? 'Stored securely by Supabase' : '••••••••••••'}
                  </span>
                  <button onClick={() => setShowPassword(s => !s)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-1.5">Password changes coming in a future update.</p>
              </div>
            </div>
          )}

          {/* Subscriptions tab */}
          {tab === 'subscriptions' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center py-20">
              <CreditCard size={40} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Coming soon!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Subscription insights, billing history, and spending analytics are on the way.
              </p>
              <Link href="/dashboard">
                <Button variant="secondary">Go to Dashboard</Button>
              </Link>
            </div>
          )}

          {/* Taste profile tab */}
          {tab === 'taste' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Taste Profile</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Your taste profile powers your personalized picks. The more detailed, the better.
              </p>
              <Link href="/onboarding" className="flex items-center justify-between p-4 bg-brand/5 border border-brand/20 rounded-xl hover:bg-brand/10 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand/15 flex items-center justify-center">
                    <Sparkles size={16} className="text-brand" />
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium text-sm">Edit taste preferences</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Genres, favorite titles, things you avoid</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-brand group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}

          {/* Customization tab */}
          {tab === 'customization' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Customization</h2>

              {/* Theme */}
              <div>
                <label className="text-gray-700 dark:text-gray-300 text-sm font-medium block mb-3">Theme</label>
                <div className="flex gap-3">
                  {([['light', <Sun key="s" size={16} />, 'Light'], ['dark', <Moon key="m" size={16} />, 'Dark']] as const).map(([t, icon, label]) => (
                    <button key={t} onClick={() => setTheme(t)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${theme === t ? 'bg-brand border-brand text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand/40'}`}>
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text size */}
              <div>
                <label className="text-gray-700 dark:text-gray-300 text-sm font-medium flex items-center gap-2 mb-3">
                  <Type size={15} /> Text size
                </label>
                <div className="flex gap-2">
                  {([['sm', 'Small'], ['md', 'Medium'], ['lg', 'Large']] as const).map(([s, label]) => (
                    <button key={s} onClick={() => setTextSize(s)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${textSize === s ? 'bg-brand border-brand text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand/40'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-gray-400 text-xs mt-2">Preview: <span style={{ fontSize: textSize === 'sm' ? 12 : textSize === 'lg' ? 18 : 14 }}>The quick brown fox jumps over the lazy dog.</span></p>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
