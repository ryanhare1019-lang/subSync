'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STREAMING_SERVICES, GENRES, SERVICE_COLORS } from '@/lib/constants';
import { ServiceOption, FavoriteTitle, TasteProfile } from '@/types';
import { Button } from './ui/Button';
import { Check, Search, X, ArrowRight, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ServiceIcon } from './ServiceIcon';

// ── Constants ─────────────────────────────────────────────────────────────────

const VIBE_PAIRS = [
  {
    key: 'pace',
    a: { emoji: '🌙', label: 'Slow burn', desc: 'Let it build, no rush', value: 'slow_burn', color: '#8B5CF6' },
    b: { emoji: '⚡', label: 'Fast-paced', desc: 'Hook me in 5 minutes', value: 'fast_paced', color: '#F59E0B' },
  },
  {
    key: 'complexity',
    a: { emoji: '🛋️', label: 'Comfort watch', desc: 'Familiar and warm', value: 'comfort', color: '#F97316' },
    b: { emoji: '🌀', label: 'Mind-bending', desc: 'Make me think', value: 'cerebral', color: '#3B82F6' },
  },
  {
    key: 'realism',
    a: { emoji: '📰', label: 'Based on true events', desc: 'Real stories hit different', value: 'true_stories', color: '#10B981' },
    b: { emoji: '🚀', label: 'Pure fiction', desc: 'Take me somewhere new', value: 'fiction', color: '#6366F1' },
  },
  {
    key: 'tone',
    a: { emoji: '😂', label: 'Light and funny', desc: 'I want to laugh', value: 'light', color: '#FBBF24' },
    b: { emoji: '🖤', label: 'Dark and intense', desc: 'I want to feel something', value: 'dark', color: '#7C3AED' },
  },
  {
    key: 'social',
    a: { emoji: '🧍', label: 'Solo viewing', desc: 'This is my time', value: 'solo', color: '#6366F1' },
    b: { emoji: '👥', label: 'Group watch', desc: 'Better with people', value: 'social_watch', color: '#EC4899' },
  },
  {
    key: 'consumption',
    a: { emoji: '🎬', label: 'Binge the whole season', desc: 'All at once', value: 'binge', color: '#EF4444' },
    b: { emoji: '📺', label: 'One episode at a time', desc: 'Savor it', value: 'savor', color: '#14B8A6' },
  },
] as const;

type VibePair = typeof VIBE_PAIRS[number];
type VibeOption = VibePair['a'] | VibePair['b'];

const DEALBREAKERS = [
  { label: 'Cliffhanger endings with no resolution', slug: 'cliffhanger_no_resolution' },
  { label: 'Excessive gore or violence', slug: 'excessive_gore' },
  { label: 'Love triangles', slug: 'love_triangles' },
  { label: 'Laugh tracks', slug: 'laugh_tracks' },
  { label: 'Requires subtitles (prefer dubbed)', slug: 'requires_subtitles' },
  { label: 'Slow first few episodes', slug: 'slow_start' },
  { label: 'More than 4 seasons', slug: 'too_many_seasons' },
  { label: 'Predictable plot twists', slug: 'predictable_twists' },
  { label: 'Shaky camera / found footage', slug: 'shaky_cam' },
  { label: 'Heavy political themes', slug: 'political_themes' },
  { label: 'Musical numbers', slug: 'musical_numbers' },
  { label: 'Talking animals / anthropomorphism', slug: 'talking_animals' },
  { label: 'Jump scares', slug: 'jump_scares' },
  { label: 'Cringey dialogue', slug: 'cringey_dialogue' },
];

function getPersonalityGradient(topVibes: string[]): string {
  const t = topVibes.join(' ').toLowerCase();
  const dark = t.includes('dark') || t.includes('slow burn') || t.includes('slow_burn');
  const cerebral = t.includes('cerebral') || t.includes('mind');
  const cozy = t.includes('comfort') || t.includes('solo');
  const chaotic = t.includes('fast') || t.includes('binge');
  if (dark && cerebral) return 'from-purple-950 via-indigo-950 to-gray-950';
  if (dark) return 'from-violet-950 via-purple-900 to-gray-950';
  if (cozy) return 'from-amber-950 via-orange-950 to-gray-950';
  if (chaotic) return 'from-pink-950 via-rose-950 to-gray-950';
  if (cerebral) return 'from-blue-950 via-teal-950 to-gray-950';
  return 'from-blue-950 via-indigo-950 to-gray-950';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TasteQuizProps {
  userId: string;
  existing?: Partial<TasteProfile> | null;
}

interface SearchResult {
  id: number;
  title: string;
  year: number | null;
  media_type: 'movie' | 'tv';
}

interface PersonalityData {
  label: string;
  description: string;
  top_vibes: string[];
}

type StepKey = 'services' | 'genres' | 'favorites' | 'dislikes' | 'vibes' | 'dealbreakers' | 'personality';

const STEPS_NEW: StepKey[] = ['services', 'genres', 'favorites', 'dislikes', 'vibes', 'dealbreakers', 'personality'];
const STEPS_EDIT: StepKey[] = ['genres', 'favorites', 'dislikes', 'vibes', 'dealbreakers', 'personality'];

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -48 : 48, opacity: 0 }),
};

// ── Component ─────────────────────────────────────────────────────────────────

export function TasteQuiz({ userId: _userId, existing }: TasteQuizProps) {
  const router = useRouter();
  const isEditing = !!existing;
  const cardRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const steps = isEditing ? STEPS_EDIT : STEPS_NEW;
  const existingPrefs = (existing?.preferences as Record<string, unknown>) || {};

  // Taste state
  const [selectedServices, setSelectedServices] = useState<ServiceOption[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(existing?.favorite_genres || []);
  const [favoriteTitles, setFavoriteTitles] = useState<FavoriteTitle[]>((existing?.favorite_titles as FavoriteTitle[]) || []);
  const [dislikedGenres, setDislikedGenres] = useState<string[]>(existing?.disliked_genres || []);
  const [vibes, setVibes] = useState<Record<string, string>>((existingPrefs.vibes as Record<string, string>) || {});
  const [dealbreakers, setDealbreakers] = useState<string[]>((existingPrefs.dealbreakers as string[]) || []);
  const [personality, setPersonality] = useState<PersonalityData | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Navigation
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [currentPair, setCurrentPair] = useState(0);
  const [pairAnimating, setPairAnimating] = useState(false);

  // Loading
  const [saving, setSaving] = useState(false);

  const currentStep = steps[step];
  const progressPct = step / (steps.length - 1);

  const goTo = (delta: number) => {
    setDirection(delta);
    setStep(s => s + delta);
  };

  const searchTMDB = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/tmdb-search?q=${encodeURIComponent(query)}`);
      setSearchResults(await res.json());
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, []);

  const addTitle = (r: SearchResult) => {
    if (favoriteTitles.find(t => t.title === r.title)) return;
    setFavoriteTitles(prev => [...prev, { title: r.title, type: r.media_type, year: r.year }]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleVibeChoice = (key: string, value: string) => {
    if (pairAnimating) return;
    setPairAnimating(true);
    setVibes(prev => ({ ...prev, [key]: value }));
    setTimeout(() => {
      setPairAnimating(false);
      if (currentPair < VIBE_PAIRS.length - 1) {
        setCurrentPair(p => p + 1);
      } else {
        setCurrentPair(0);
        goTo(1);
      }
    }, 550);
  };

  const skipPair = () => {
    if (currentPair < VIBE_PAIRS.length - 1) {
      setCurrentPair(p => p + 1);
    } else {
      setCurrentPair(0);
      goTo(1);
    }
  };

  const saveAndReveal = async () => {
    setSaving(true);
    // Navigate immediately — loading state shows while we work
    setDirection(1);
    setStep(s => s + 1);

    try {
      const preferences = { ...existingPrefs, vibes, dealbreakers };
      await fetch('/api/taste-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          favorite_genres: selectedGenres,
          favorite_titles: favoriteTitles,
          disliked_genres: dislikedGenres,
          preferences,
        }),
      });

      if (!isEditing && selectedServices.length > 0) {
        await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            services: selectedServices.map(s => ({
              service_name: s.name, service_type: s.type,
              monthly_cost: s.defaultCost, billing_cycle: 'monthly',
            })),
          }),
        });
      }

      const res = await fetch('/api/taste-profile/personality', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPersonality(data.personality);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current || !personality) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const blob = await new Promise<Blob>(res => canvas.toBlob(res as BlobCallback, 'image/png'));
      if (navigator.share) {
        await navigator.share({
          title: `My SubSync Personality: ${personality.label}`,
          files: [new File([blob], 'subsync-personality.png', { type: 'image/png' })],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'subsync-personality.png'; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) { console.error('Share failed:', err); }
  };

  const inputCls = 'w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Progress bar */}
      <div className="h-0.5 bg-gray-800 w-full flex-shrink-0">
        <motion.div
          className="h-full bg-brand"
          animate={{ width: `${progressPct * 100}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="w-full max-w-2xl">

          {/* Back + step counter */}
          {currentStep !== 'personality' && (
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => {
                  if (currentStep === 'vibes' && currentPair > 0) setCurrentPair(p => p - 1);
                  else if (step > 0) goTo(-1);
                }}
                disabled={step === 0}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-0">
                ← Back
              </button>
              <span className="text-xs text-gray-600 uppercase tracking-widest">
                {step + 1} / {steps.length - 1}
              </span>
            </div>
          )}

          <AnimatePresence mode="wait" custom={direction}>

            {/* ── Services ── */}
            {currentStep === 'services' && (
              <motion.div key="services" custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}>
                <h1 className="text-2xl font-bold text-white mb-1">Which services do you use?</h1>
                <p className="text-gray-400 text-sm mb-6">Tap to select. We'll track your costs automatically.</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {STREAMING_SERVICES.map(svc => {
                    const sel = !!selectedServices.find(s => s.name === svc.name);
                    const color = SERVICE_COLORS[svc.name] || '#279AF1';
                    return (
                      <button key={svc.name}
                        onClick={() => setSelectedServices(prev =>
                          prev.find(s => s.name === svc.name) ? prev.filter(s => s.name !== svc.name) : [...prev, svc]
                        )}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${sel ? 'border-brand bg-brand/10' : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center relative"
                          style={{ backgroundColor: color + '18', border: `1px solid ${color}33` }}>
                          <ServiceIcon name={svc.name} size={22} variant="brand" />
                          {sel && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand rounded-full flex items-center justify-center">
                              <Check size={9} className="text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-white text-xs font-medium text-center leading-tight">{svc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Genres ── */}
            {currentStep === 'genres' && (
              <motion.div key="genres" custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}>
                <h1 className="text-2xl font-bold text-white mb-1">What genres do you love?</h1>
                <p className="text-gray-400 text-sm mb-6">Pick as many as you want.</p>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(genre => {
                    const sel = selectedGenres.includes(genre);
                    return (
                      <button key={genre}
                        onClick={() => setSelectedGenres(prev =>
                          prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
                        )}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${sel ? 'bg-brand border-brand text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'}`}>
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Favorites ── */}
            {currentStep === 'favorites' && (
              <motion.div key="favorites" custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}>
                <h1 className="text-2xl font-bold text-white mb-1">Name titles you love</h1>
                <p className="text-gray-400 text-sm mb-6">Add 3–5 movies or shows. The best signal we have.</p>
                {favoriteTitles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {favoriteTitles.map(t => (
                      <span key={t.title}
                        className="flex items-center gap-1.5 bg-brand/10 border border-brand/25 text-brand text-sm px-3 py-1 rounded-full">
                        {t.title}{t.year ? ` (${t.year})` : ''}
                        <button onClick={() => setFavoriteTitles(p => p.filter(x => x.title !== t.title))}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative" ref={searchContainerRef}>
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10" />
                  <input type="text" value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); searchTMDB(e.target.value); }}
                    placeholder="Search movies and TV shows…"
                    className={`${inputCls} pl-9`} autoComplete="off" />
                  {(searching || searchResults.length > 0) && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
                      {searching
                        ? <div className="p-4 text-center text-gray-400 text-sm">Searching…</div>
                        : searchResults.slice(0, 6).map(r => (
                          <button key={r.id} onClick={() => addTitle(r)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left border-b border-gray-800 last:border-0">
                            <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded capitalize">{r.media_type}</span>
                            <span className="text-white text-sm">{r.title}</span>
                            {r.year && <span className="text-gray-500 text-xs ml-auto">{r.year}</span>}
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Dislikes ── */}
            {currentStep === 'dislikes' && (
              <motion.div key="dislikes" custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}>
                <h1 className="text-2xl font-bold text-white mb-1">Anything you'd rather avoid?</h1>
                <p className="text-gray-400 text-sm mb-6">Optional. Select genres you never want recommended.</p>
                <div className="flex flex-wrap gap-2">
                  {GENRES.filter(g => !selectedGenres.includes(g)).map(genre => {
                    const sel = dislikedGenres.includes(genre);
                    return (
                      <button key={genre}
                        onClick={() => setDislikedGenres(prev =>
                          prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
                        )}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${sel ? 'bg-red-500/15 border-red-400/40 text-red-400' : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'}`}>
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Vibe Picker ── */}
            {currentStep === 'vibes' && (
              <motion.div key="vibes" custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}>
                <div className="flex items-center justify-between mb-1">
                  <h1 className="text-2xl font-bold text-white">Pick your vibe</h1>
                  <span className="text-sm text-gray-500">{currentPair + 1} of {VIBE_PAIRS.length}</span>
                </div>
                <p className="text-gray-400 text-sm mb-8">Tap the one that feels more like you.</p>

                <AnimatePresence mode="wait">
                  {VIBE_PAIRS.map((pair, idx) => idx === currentPair && (
                    <motion.div key={pair.key}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.18 }}>

                      <div className="flex flex-col sm:flex-row gap-4">
                        {([pair.a, pair.b] as VibeOption[]).map(option => {
                          const chosen = vibes[pair.key];
                          const isSelected = chosen === option.value;
                          const otherChosen = !!chosen && !isSelected;
                          return (
                            <motion.button key={option.value}
                              onClick={() => handleVibeChoice(pair.key, option.value)}
                              disabled={pairAnimating}
                              animate={{ scale: isSelected ? 1.03 : 1, opacity: otherChosen ? 0.28 : 1 }}
                              transition={{ duration: 0.15 }}
                              className="flex-1 flex flex-col items-start gap-3 p-5 rounded-2xl border-2 text-left min-h-[120px] cursor-pointer"
                              style={{
                                borderColor: isSelected ? option.color : 'rgba(255,255,255,0.08)',
                                backgroundColor: isSelected ? option.color + '1C' : 'rgba(255,255,255,0.02)',
                              }}>
                              <span className="text-4xl leading-none">{option.emoji}</span>
                              <div>
                                <p className="font-bold text-white text-base leading-tight">{option.label}</p>
                                <p className="text-sm text-gray-400 mt-1">{option.desc}</p>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>

                      {!pairAnimating && (
                        <div className="mt-5 text-center">
                          <button onClick={skipPair}
                            className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                            Can't decide — skip this one
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── Dealbreakers ── */}
            {currentStep === 'dealbreakers' && (
              <motion.div key="dealbreakers" custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}>
                <h1 className="text-2xl font-bold text-white mb-1">What ruins it for you?</h1>
                <p className="text-gray-400 text-sm mb-6">Pick anything that makes you bounce.</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {DEALBREAKERS.map(db => {
                    const sel = dealbreakers.includes(db.slug);
                    return (
                      <motion.button key={db.slug}
                        onClick={() => setDealbreakers(prev =>
                          prev.includes(db.slug) ? prev.filter(d => d !== db.slug) : [...prev, db.slug]
                        )}
                        animate={sel ? { scale: [1, 1.06, 1] } : {}}
                        transition={{ duration: 0.18 }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition-all ${
                          sel
                            ? 'bg-red-500/12 border-red-400/35 text-red-400'
                            : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                        }`}>
                        {sel && <X size={11} className="flex-shrink-0" />}
                        {db.label}
                      </motion.button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setDealbreakers([])}
                  className={`w-full py-3 rounded-xl border text-sm font-medium transition-all ${
                    dealbreakers.length === 0
                      ? 'border-brand/40 text-brand bg-brand/8'
                      : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                  }`}>
                  Nothing bothers me
                </button>
              </motion.div>
            )}

            {/* ── Personality Reveal ── */}
            {currentStep === 'personality' && (
              <motion.div key="personality"
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}>

                {saving || !personality ? (
                  <div className="flex flex-col items-center py-20 gap-6">
                    <svg className="animate-spin h-8 w-8 text-brand" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                      Skip — take me to the dashboard
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 uppercase tracking-widest text-center mb-5">
                      Your taste personality
                    </p>

                    {/* Shareable card */}
                    <div ref={cardRef}
                      className={`relative rounded-3xl p-8 mb-6 bg-gradient-to-br ${getPersonalityGradient(personality.top_vibes)} border border-white/8 overflow-hidden`}>
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background: 'radial-gradient(circle at 78% 18%, rgba(255,255,255,0.07), transparent 55%)' }} />

                      <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 relative leading-tight">
                        {personality.label}
                      </h1>
                      <p className="text-gray-300 text-base leading-relaxed mb-6 relative">
                        {personality.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {personality.top_vibes.map(vibe => (
                          <span key={vibe}
                            className="px-3 py-1 rounded-full bg-white/15 text-white text-sm font-medium">
                            {vibe}
                          </span>
                        ))}
                      </div>

                      {selectedGenres.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedGenres.slice(0, 5).map(g => (
                            <span key={g} className="px-2.5 py-0.5 rounded-full bg-white/8 text-gray-300 text-xs">
                              {g}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-white/20 text-xs mt-6 font-medium tracking-wide">SubSync</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button onClick={handleShare}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-all text-sm font-medium">
                        <Share2 size={14} /> Share your taste
                      </button>
                      <button onClick={() => router.push('/dashboard')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors">
                        Take me to my dashboard <ArrowRight size={14} />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>

          {/* Bottom nav — hidden on vibes (auto-advance) and personality */}
          {currentStep !== 'vibes' && currentStep !== 'personality' && (
            <div className="flex justify-end mt-8">
              {currentStep === 'dealbreakers' ? (
                <Button onClick={saveAndReveal} loading={saving}>
                  See my personality →
                </Button>
              ) : (
                <Button onClick={() => goTo(1)}>Continue</Button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
