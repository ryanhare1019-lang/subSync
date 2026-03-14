'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useTheme } from './ThemeProvider';
import { LogOut, Sun, Moon, Settings, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileMenuProps {
  userEmail?: string | null;
  displayName?: string | null;
}

export function ProfileMenu({ userEmail, displayName }: ProfileMenuProps) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initial = (displayName || userEmail || 'U')[0].toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold">
          {initial}
        </div>
        <span className="text-gray-700 dark:text-gray-300 text-sm hidden sm:block max-w-[120px] truncate">
          {displayName || userEmail?.split('@')[0]}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            {/* Account info */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-bold">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                    {displayName || 'My Account'}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{userEmail}</p>
                </div>
              </div>

              {/* Email field */}
              <div className="space-y-2">
                <div>
                  <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Email</label>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 truncate">
                    {userEmail}
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Password</label>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center justify-between">
                    <span className={showPassword ? '' : 'tracking-widest text-gray-400'}>
                      {showPassword ? '(stored securely)' : '••••••••••'}
                    </span>
                    <button
                      onClick={() => setShowPassword(s => !s)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="p-2">
              {/* Theme toggle */}
              <button
                onClick={toggle}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  {theme === 'dark' ? (
                    <Moon size={15} className="text-gray-500 dark:text-gray-400" />
                  ) : (
                    <Sun size={15} className="text-gray-500" />
                  )}
                  <span className="text-gray-700 dark:text-gray-300 text-sm">
                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                  </span>
                </div>
                <div className={`w-9 h-5 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-brand' : 'bg-gray-200'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>

              {/* Taste preferences */}
              <Link
                href="/onboarding"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <Settings size={15} className="text-gray-500 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300 text-sm">Taste preferences</span>
              </Link>
            </div>

            {/* Sign out */}
            <div className="p-2 pt-0 border-t border-gray-100 dark:border-gray-800 mt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left text-red-600 dark:text-red-400"
              >
                <LogOut size={15} />
                <span className="text-sm font-medium">Sign out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
