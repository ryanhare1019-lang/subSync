'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ServiceIcon } from '@/components/ServiceIcon';

const HERO_IMAGES = [
  'https://images5.alphacoders.com/605/thumb-1920-605945.jpg',
  'https://cdn.mos.cms.futurecdn.net/LVoJnXBbUH6xx9EkfgVnc5.jpg',
  'https://image.benq.com/is/image/benqco/T7-1200X600?$ResponsivePreset$',
];

const SERVICES = [
  'Netflix', 'Hulu', 'Disney+', 'HBO Max', 'Amazon Prime',
  'Apple TV+', 'Peacock', 'Paramount+', 'Crunchyroll',
];

export default function LandingPage() {
  const [heroImg, setHeroImg] = useState('');

  useEffect(() => {
    setHeroImg(HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)]);
  }, []);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
              <path d="M4 6h16M4 10h16M4 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <span className="text-white font-semibold">SubSync</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-gray-300 hover:text-white text-sm transition-colors">Log in</Link>
          <Link href="/signup" className="bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative w-full min-h-[85vh] flex flex-col items-center justify-center text-center px-6">
        {/* Background image */}
        {heroImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/80" />

        <div className="relative z-10 flex flex-col items-center">
          <h1
            className="text-5xl sm:text-7xl font-bold text-white leading-[1.08] tracking-tight max-w-4xl"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            Any movie in the galaxy, at your fingertip.
          </h1>

          <p className="text-brand font-semibold text-xl mt-5 tracking-wide">
            All your media in one place.
          </p>

          <div className="flex items-center gap-4 mt-10">
            <Link href="/signup" className="bg-brand hover:bg-brand-hover text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all hover:scale-105 shadow-lg shadow-brand/25">
              Start for free
            </Link>
            <Link href="/login" className="text-gray-300 hover:text-white px-6 py-3.5 rounded-xl font-medium text-base transition-colors border border-white/20 hover:border-white/40">
              Sign in
            </Link>
          </div>

          {/* Service logos */}
          <div className="flex items-center gap-4 mt-10 flex-wrap justify-center">
            {SERVICES.map((name) => (
              <ServiceIcon key={name} name={name} size={24} variant="white" />
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-6 py-16 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              ),
              title: 'Track Everything',
              desc: 'See every subscription and your total monthly spend in one clean dashboard. No more mystery charges.',
              color: '#279AF1',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.8">
                  <path d="M15 10l4.553-2.069A1 1 0 0121 8.87V15.13a1 1 0 01-1.447.899L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              ),
              title: 'Browse by Service',
              desc: 'Explore movies and shows available on the services you actually pay for - sorted by genre, mood, and era.',
              color: '#C49991',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ),
              title: 'Discover What Fits',
              desc: 'Get personalized picks based on what you love. Rate titles and SubSync learns your taste over time.',
              color: '#F59E0B',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 19V6l12-3v13M9 19a2 2 0 11-4 0 2 2 0 014 0zM21 16a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
              title: 'No Waste, Ever',
              desc: 'Know exactly which services are worth keeping and which ones you never actually open. Cut the fat.',
              color: '#10B981',
            },
          ].map(f => (
            <div key={f.title} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-left hover:border-gray-300 dark:hover:border-gray-700 transition-colors group">
              <div className="mb-4 w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: f.color + '18', color: f.color }}>
                {f.icon}
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="max-w-5xl mx-auto px-6 pb-16 w-full">
        <div className="bg-gradient-to-br from-brand/10 to-brand-light/5 border border-brand/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ready to take control?</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            Free to use. No credit card needed. Add your subscriptions in under a minute.
          </p>
          <Link href="/signup" className="inline-block bg-brand hover:bg-brand-hover text-white px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105 shadow-md shadow-brand/20">
            Get started - it&apos;s free
          </Link>
        </div>
      </section>

      <footer className="text-center py-6 border-t border-gray-100 dark:border-gray-800">
        <p className="text-gray-400 dark:text-gray-600 text-sm">
          Made with care for people who love great content.{' '}
          <span className="text-brand">SubSync</span> &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
