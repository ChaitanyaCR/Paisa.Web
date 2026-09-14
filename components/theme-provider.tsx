'use client';

import {
  FluentProvider,
  webDarkTheme,
  webLightTheme,
} from '@fluentui/react-components';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

type Appearance = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  appearance: Appearance;
  setAppearance: (value: Appearance) => void;
  dark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>('system');
  const [systemDark, setSystemDark] = useState(false);
  const dark = appearance === 'dark' || (appearance === 'system' && systemDark);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    fetch('/api/settings')
      .then((response) => (response.ok ? response.json() : null))
      .then((settings) => {
        if (settings?.appearance) setAppearanceState(settings.appearance);
      })
      .catch(() => undefined);
  }, []);

  const setAppearance = useCallback(
    (value: Appearance) => {
      const previous = appearance;
      setAppearanceState(value);
      fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appearance: value }),
      })
        .then((response) => {
          if (!response.ok) setAppearanceState(previous);
        })
        .catch(() => setAppearanceState(previous));
    },
    [appearance],
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const theme = useMemo(
    () => ({
      ...(dark ? webDarkTheme : webLightTheme),
      colorBrandBackground: dark ? '#4979d6' : '#3565c9',
      colorBrandBackgroundHover: '#2956b1',
      colorBrandBackgroundPressed: '#204795',
    }),
    [dark],
  );

  const value = useMemo(
    () => ({ appearance, setAppearance, dark }),
    [appearance, dark, setAppearance],
  );

  return (
    <ThemeContext value={value}>
      <FluentProvider theme={theme} className="fluent-root">
        {children}
      </FluentProvider>
    </ThemeContext>
  );
}
