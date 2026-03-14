import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
              <path d="M4 6h16M4 10h16M4 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <span className="text-gray-900 dark:text-white font-semibold">SubSync</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">Log in</Link>
          <Link href="/signup" className="bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 rounded-full px-4 py-1.5 text-brand text-sm mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          Personalized picks across all your services
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white leading-tight max-w-3xl">
          All your subs.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand-light">
            What to watch next.
          </span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg mt-6 max-w-xl leading-relaxed">
          SubSync tracks every streaming subscription in one place — and helps you
          discover what to watch, listen to, or read based on your taste.
        </p>
        <div className="flex items-center gap-4 mt-10">
          <Link href="/signup" className="bg-brand hover:bg-brand-hover text-white px-8 py-3 rounded-xl font-medium text-base transition-all hover:scale-105">
            Start for free
          </Link>
          <Link href="/login" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-6 py-3 rounded-xl font-medium text-base transition-colors border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
            Sign in
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-20 max-w-3xl w-full">
          {[
            { icon: '📊', title: 'Track Everything', desc: 'See all your subscriptions and total monthly spend in one dashboard.' },
            { icon: '🎬', title: 'Browse by Service', desc: 'Explore movies and shows available on the services you actually pay for.' },
            { icon: '💸', title: 'No Waste', desc: 'Know which services are worth keeping and which you never actually use.' },
          ].map(f => (
            <div key={f.title} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-left">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-6 text-gray-400 dark:text-gray-600 text-sm">
        SubSync MVP
      </footer>
    </main>
  );
}
