'use client';

import Link from 'next/link';
import { ProfileMenu } from './ProfileMenu';
import { Compass } from 'lucide-react';

interface NavbarProps {
  userEmail?: string | null;
  displayName?: string | null;
}

export function Navbar({ userEmail, displayName }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
                  <path d="M4 6h16M4 10h16M4 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <span className="text-gray-900 dark:text-white font-semibold text-sm">SubSync</span>
            </Link>

            <Link
              href="/browse"
              className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
            >
              <Compass size={15} />
              Browse
            </Link>
          </div>

          <ProfileMenu userEmail={userEmail} displayName={displayName} />
        </div>
      </div>
    </nav>
  );
}
