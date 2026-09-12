import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';

const ThemeCtx = createContext({ theme: 'light', toggle: () => {} });
const KEY = 'stackit_theme';

function initial() {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; // default: light.txt
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem(KEY, theme); } catch {}
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo(() => ({ theme, toggle, dark: theme === 'dark' }), [theme, toggle]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
