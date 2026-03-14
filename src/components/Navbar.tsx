'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Compass, LayoutDashboard, User, LogOut, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  userEmail?: string | null;
  displayName?: string | null;
  showBrowse?: boolean;
  showDashboard?: boolean;
}

export function Navbar({ userEmail, displayName, showBrowse = true, showDashboard = false }: NavbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    <nav className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
                  <path d="M4 6h16M4 10h16M4 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <span className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">SubSync</span>
            </Link>

            {showDashboard && (
              <Link href="/dashboard" className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                <LayoutDashboard size={14} /> Dashboard
              </Link>
            )}
            {showBrowse && (
              <Link href="/browse" className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                <Compass size={14} /> Browse
              </Link>
            )}
          </div>

          {/* Profile mini-menu */}
          <div className="relative" ref={ref}>
            <button onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold">
                {initial}
              </div>
              <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-1">
                    <Link href="/account" onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 text-sm">
                      <User size={14} /> My Account
                    </Link>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400 text-sm text-left">
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
}
