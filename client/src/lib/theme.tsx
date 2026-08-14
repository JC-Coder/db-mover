import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "dark" | "light";

interface IThemeContext {
  theme: ThemeMode;
  nextTheme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

interface IThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = "db_mover_theme";

const ThemeContext = createContext<IThemeContext | null>(null);

const DEFAULT_THEME: ThemeMode = "dark";

const readStoredTheme = (): ThemeMode => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export function ThemeProvider({ children }: IThemeProviderProps) {
  // Starts at the default rather than reading storage, so the first client render matches the
  // pre rendered HTML exactly. The blocking script in index.html has already applied the stored
  // theme to <html>, so there is no flash while this effect catches the state up.
  const [theme, setTheme] = useState<ThemeMode>(DEFAULT_THEME);
  const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTheme(readStoredTheme());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Keep theme usable even when storage is unavailable.
    }
  }, [hydrated, theme]);

  const value = useMemo<IThemeContext>(
    () => ({
      theme,
      nextTheme,
      setTheme,
      toggleTheme: () => setTheme(nextTheme),
    }),
    [nextTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = (): IThemeContext => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
