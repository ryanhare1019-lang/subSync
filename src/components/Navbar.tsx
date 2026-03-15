'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { User, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TasteSwiperModal } from './TasteSwiperModal';

interface NavTab {
  id: string;
  label: string;
}

interface NavbarProps {
  userEmail?: string | null;
  displayName?: string | null;
  tabs?: NavTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

export function Navbar({ userEmail, displayName, tabs, activeTab, onTabChange }: NavbarProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [swiperOpen, setSwiperOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (displayName || userEmail || 'U')[0].toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false);
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
    <>
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        {/* Full-width container — no max-width so contents always span edge to edge */}
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo + tabs */}
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
                    <path d="M4 6h16M4 10h16M4 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
                <span className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">SubSync</span>
              </Link>

              {/* Tab navigation */}
              {tabs && tabs.length > 0 && (
                <div className="flex items-center gap-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange?.(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Build Your Taste + profile */}
            <div className="flex items-center gap-2">
              {/* Build Your Taste button */}
              <button
                onClick={() => setSwiperOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 border border-brand/25 text-brand text-sm font-medium transition-colors"
              >
                <Sparkles size={14} />
                Build Your Taste
              </button>
              {/* Compact mobile version */}
              <button
                onClick={() => setSwiperOpen(true)}
                className="sm:hidden w-8 h-8 rounded-lg bg-brand/10 hover:bg-brand/20 border border-brand/25 flex items-center justify-center transition-colors"
                aria-label="Build Your Taste"
              >
                <Sparkles size={15} className="text-brand" />
              </button>

              {/* Profile mini-menu */}
              <div className="relative" ref={ref}>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold">
                    {initial}
                  </div>
                  <ChevronDown size={13} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                      <div className="p-1">
                        <Link
                          href="/account"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 text-sm"
                        >
                          <User size={14} /> My Account
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400 text-sm text-left"
                        >
                          <LogOut size={14} /> Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Taste swiper modal */}
      {swiperOpen && <TasteSwiperModal onClose={() => setSwiperOpen(false)} />}
    </>
  );
}
