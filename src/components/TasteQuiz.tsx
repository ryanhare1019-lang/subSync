'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STREAMING_SERVICES, GENRES } from '@/lib/constants';
import { ServiceOption, FavoriteTitle, TasteProfile } from '@/types';
import { Button } from './ui/Button';
import { Check, Search, X, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ServiceIcon } from './ServiceIcon';
import { SERVICE_COLORS } from '@/lib/constants';

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

export function TasteQuiz({ userId: _userId, existing }: TasteQuizProps) {
  const router = useRouter();
  const isEditing = !!existing;
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [selectedServices, setSelectedServices] = useState<ServiceOption[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(existing?.favorite_genres || []);
  const [favoriteTitles, setFavoriteTitles] = useState<FavoriteTitle[]>(
    (existing?.favorite_titles as FavoriteTitle[]) || []
  );
  const [dislikedGenres, setDislikedGenres] = useState<string[]>(existing?.disliked_genres || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const steps = isEditing
    ? ['Genres', 'Favorites', 'Dislikes']
    : ['Services', 'Genres', 'Favorites', 'Dislikes'];

  const toggleService = (svc: ServiceOption) => {
    setSelectedServices(prev =>
      prev.find(s => s.name === svc.name) ? prev.filter(s => s.name !== svc.name) : [...prev, svc]
    );
  };

  const toggleGenre = (genre: string, isDislike = false) => {
    if (isDislike) {
      setDislikedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
    } else {
      setSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
    }
  };

  const searchTMDB = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/tmdb-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, []);

  const addTitle = (result: SearchResult) => {
    if (favoriteTitles.find(t => t.title === result.title)) return;
    setFavoriteTitles(prev => [...prev, { title: result.title, type: result.media_type, year: result.year }]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await fetch('/api/taste-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite_genres: selectedGenres, favorite_titles: favoriteTitles, disliked_genres: dislikedGenres }),
      });
      if (!isEditing && selectedServices.length > 0) {
        await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ services: selectedServices.map(s => ({ service_name: s.name, service_type: s.type, monthly_cost: s.defaultCost, billing_cycle: 'monthly' })) }),
        });
      }
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-brand transition-colors";

  // Which step index maps to which UI
  const stepOffset = isEditing ? 1 : 0;
  const currentStepKey = isEditing
    ? ['genres', 'favorites', 'dislikes'][step]
    : ['services', 'genres', 'favorites', 'dislikes'][step];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white text-sm transition-colors">
            <ArrowLeft size={15} /> Dashboard
          </button>
          <span className="text-gray-400 text-sm">{isEditing ? 'Edit taste profile' : 'Set up your profile'}</span>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-all flex-shrink-0 ${
                i < step ? 'bg-brand border-brand text-white' :
                i === step ? 'border-brand text-brand bg-brand/10' :
                'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600'}`}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-xs ml-1.5 hidden sm:block ${i === step ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`h-px flex-1 mx-3 ${i < step ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Services step (new users only) */}
          {currentStepKey === 'services' && (
            <motion.div key="services" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Which services do you use?</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Tap to select. We'll track your costs automatically.</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {STREAMING_SERVICES.map(svc => {
                  const sel = !!selectedServices.find(s => s.name === svc.name);
                  const color = SERVICE_COLORS[svc.name] || '#D946EF';
                  return (
                    <button key={svc.name} onClick={() => toggleService(svc)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${sel ? 'border-brand bg-brand/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center relative"
                        style={{ backgroundColor: color + '18', border: `1px solid ${color}33` }}>
                        <ServiceIcon name={svc.name} size={22} variant="brand" />
                        {sel && <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand rounded-full flex items-center justify-center"><Check size={9} className="text-white" /></div>}
                      </div>
                      <span className="text-gray-800 dark:text-white text-xs font-medium text-center leading-tight">{svc.name}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Genres step */}
          {currentStepKey === 'genres' && (
            <motion.div key="genres" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">What genres do you love?</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Pick as many as you want.</p>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(genre => {
                  const sel = selectedGenres.includes(genre);
                  return (
                    <button key={genre} onClick={() => toggleGenre(genre)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${sel ? 'bg-brand border-brand text-white' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-brand/40'}`}>
                      {genre}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Favorites step */}
          {currentStepKey === 'favorites' && (
            <motion.div key="favorites" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Name titles you love</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Add 3-5 movies or shows. This is the best signal for great picks.</p>
              {favoriteTitles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {favoriteTitles.map(t => (
                    <span key={t.title} className="flex items-center gap-1.5 bg-brand/10 border border-brand/25 text-brand text-sm px-3 py-1 rounded-full">
                      {t.title}{t.year ? ` (${t.year})` : ''}
                      <button onClick={() => setFavoriteTitles(p => p.filter(x => x.title !== t.title))} className="hover:text-brand-hover"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
              {/* Fixed-position search container to prevent layout jump */}
              <div className="relative" ref={searchContainerRef}>
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); searchTMDB(e.target.value); }}
                  placeholder="Search movies and TV shows..."
                  className={`${inputCls} pl-10`}
                  autoComplete="off"
                />
                {/* Absolutely positioned dropdown — no layout shift */}
                {(searching || searchResults.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-xl">
                    {searching ? (
                      <div className="p-4 text-center text-gray-400 text-sm">Searching...</div>
                    ) : searchResults.slice(0, 6).map(r => (
                      <button key={r.id} onClick={() => addTitle(r)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded capitalize">{r.media_type}</span>
                        <span className="text-gray-900 dark:text-white text-sm">{r.title}</span>
                        {r.year && <span className="text-gray-400 text-xs ml-auto">{r.year}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Dislikes step */}
          {currentStepKey === 'dislikes' && (
            <motion.div key="dislikes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Anything you'd rather avoid?</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Optional. Select genres you never want recommended.</p>
              <div className="flex flex-wrap gap-2">
                {GENRES.filter(g => !selectedGenres.includes(g)).map(genre => {
                  const sel = dislikedGenres.includes(genre);
                  return (
                    <button key={genre} onClick={() => toggleGenre(genre, true)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${sel ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-600 dark:text-red-400' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                      {genre}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0}>Back</Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={handleFinish} loading={saving}>
              {isEditing ? 'Save changes' : 'Go to Dashboard'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
