'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type TextSize = 'sm' | 'md' | 'lg';

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  textSize: TextSize;
  setTextSize: (s: TextSize) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'light',
  toggle: () => {},
  setTheme: () => {},
  textSize: 'md',
  setTextSize: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [textSize, setTextSizeState] = useState<TextSize>('md');

  useEffect(() => {
    const storedTheme = (localStorage.getItem('theme') as Theme) || 'light';
    const storedSize = (localStorage.getItem('textSize') as TextSize) || 'md';
    applyTheme(storedTheme);
    applyTextSize(storedSize);
    setThemeState(storedTheme);
    setTextSizeState(storedSize);
  }, []);

  const applyTheme = (t: Theme) => {
    document.documentElement.setAttribute('data-theme', t);
  };

  const applyTextSize = (s: TextSize) => {
    const el = document.documentElement;
    el.classList.remove('text-size-sm', 'text-size-md', 'text-size-lg');
    el.classList.add(`text-size-${s}`);
  };

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    localStorage.setItem('theme', next);
    applyTheme(next);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('theme', t);
    applyTheme(t);
  };

  const setTextSize = (s: TextSize) => {
    setTextSizeState(s);
    localStorage.setItem('textSize', s);
    applyTextSize(s);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme, textSize, setTextSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
