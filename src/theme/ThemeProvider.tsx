import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { PALETTES, type Palette, type ThemeName } from '@/theme/tokens';

const STORAGE_KEY = 'trace.theme';

interface ThemeContextValue {
  theme: ThemeName;
  colors: Palette;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dusk',
  colors: PALETTES.dusk,
  setTheme: () => {},
});

/** Provides the active palette and persists the user's choice (default: dusk). */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dusk');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v && v in PALETTES) setThemeState(v as ThemeName);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      colors: PALETTES[theme],
      setTheme: (t: ThemeName) => {
        setThemeState(t);
        AsyncStorage.setItem(STORAGE_KEY, t).catch(() => {});
      },
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Build a themed StyleSheet that recomputes only when the palette changes. */
export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
