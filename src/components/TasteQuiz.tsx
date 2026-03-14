'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STREAMING_SERVICES, GENRES } from '@/lib/constants';
import { ServiceOption, FavoriteTitle } from '@/types';
import { Button } from './ui/Button';
import { Check, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TasteQuizProps {
  userId: string;
}

interface SearchResult {
  id: number;
  title: string;
  year: number | null;
  media_type: 'movie' | 'tv';
}

export function TasteQuiz({ userId: _userId }: TasteQuizProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedServices, setSelectedServices] = useState<ServiceOption[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [favoriteTitles, setFavoriteTitles] = useState<FavoriteTitle[]>([]);
  const [dislikedGenres, setDislikedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const steps = ['Services', 'Genres', 'Favorites', 'Dislikes'];

  const toggleService = (svc: ServiceOption) => {
    setSelectedServices(prev =>
      prev.find(s => s.name === svc.name)
        ? prev.filter(s => s.name !== svc.name)
        : [...prev, svc]
    );
  };

  const toggleGenre = (genre: string, isDislike = false) => {
    if (isDislike) {
      setDislikedGenres(prev =>
        prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
      );
    } else {
      setSelectedGenres(prev =>
        prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
      );
    }
  };

  const searchTMDB = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/tmdb-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const addTitle = (result: SearchResult) => {
    if (favoriteTitles.find(t => t.title === result.title)) return;
    setFavoriteTitles(prev => [...prev, {
      title: result.title,
      type: result.media_type,
      year: result.year,
    }]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeTitle = (title: string) => {
    setFavoriteTitles(prev => prev.filter(t => t.title !== title));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Save taste profile
      await fetch('/api/taste-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          favorite_genres: selectedGenres,
          favorite_titles: favoriteTitles,
          disliked_genres: dislikedGenres,
        }),
      });

      // Save subscriptions
      if (selectedServices.length > 0) {
        await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            services: selectedServices.map(s => ({
              service_name: s.name,
              service_type: s.type,
              monthly_cost: s.defaultCost,
              billing_cycle: 'monthly',
            })),
          }),
        });
      }

      router.push('/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-all ${
                  i < step ? 'bg-blue-600 border-blue-500 text-white' :
                  i === step ? 'border-blue-500 text-blue-400' :
                  'border-gray-700 text-gray-600'
                }`}>
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? 'text-white' : 'text-gray-500'}`}>{s}</span>
                {i < steps.length - 1 && (
                  <div className={`h-px w-8 sm:w-16 ml-2 ${i < step ? 'bg-blue-600' : 'bg-gray-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Services */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-bold text-white mb-1">Which services do you use?</h1>
              <p className="text-gray-400 mb-6">Tap to select all that apply. We'll track your costs automatically.</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {STREAMING_SERVICES.map(svc => {
                  const selected = !!selectedServices.find(s => s.name === svc.name);
                  return (
                    <button
                      key={svc.name}
                      onClick={() => toggleService(svc)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                        selected
                          ? 'border-blue-500 bg-blue-600/10'
                          : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base relative"
                        style={{ backgroundColor: svc.color + '22', color: svc.color, border: `1px solid ${svc.color}44` }}
                      >
                        {svc.name[0]}
                        {selected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
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

          {/* Step 1: Genres */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-bold text-white mb-1">What genres do you love?</h1>
              <p className="text-gray-400 mb-6">Pick as many as you want. This helps us personalize your recommendations.</p>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(genre => {
                  const selected = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        selected
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Favorite titles */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-bold text-white mb-1">Name titles you love</h1>
              <p className="text-gray-400 mb-6">Add 3–5 movies or shows you've enjoyed. This is our best signal for great recs.</p>

              {/* Selected titles */}
              {favoriteTitles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {favoriteTitles.map(t => (
                    <span key={t.title} className="flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm px-3 py-1 rounded-full">
                      {t.title}{t.year ? ` (${t.year})` : ''}
                      <button onClick={() => removeTitle(t.title)} className="text-blue-400 hover:text-white">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    searchTMDB(e.target.value);
                  }}
                  placeholder="Search movies and TV shows..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {(searching || searchResults.length > 0) && (
                <div className="mt-2 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                  {searching ? (
                    <div className="p-4 text-center text-gray-400 text-sm">Searching...</div>
                  ) : (
                    searchResults.slice(0, 6).map(result => (
                      <button
                        key={result.id}
                        onClick={() => addTitle(result)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left border-b border-gray-800 last:border-0"
                      >
                        <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded capitalize">{result.media_type}</span>
                        <span className="text-white text-sm">{result.title}</span>
                        {result.year && <span className="text-gray-500 text-xs ml-auto">{result.year}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Dislikes */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-bold text-white mb-1">Anything you'd rather avoid?</h1>
              <p className="text-gray-400 mb-6">Optional — select genres you never want recommended.</p>
              <div className="flex flex-wrap gap-2">
                {GENRES.filter(g => !selectedGenres.includes(g)).map(genre => {
                  const selected = dislikedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre, true)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        selected
                          ? 'bg-red-900/40 border-red-600 text-red-300'
                          : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
              {GENRES.filter(g => !selectedGenres.includes(g)).length === 0 && (
                <p className="text-gray-500 text-sm">You liked all genres — nothing to dislike!</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
          >
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleFinish} loading={saving}>
              Go to Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
