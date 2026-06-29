import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
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

export const THEME_VARS: Record<ThemeMode, CSSProperties> = {
  dark: {
    "--landing-bg": "#080504",
    "--landing-text": "#F5EFE8",
    "--landing-muted": "rgba(227, 215, 200, 0.72)",
    "--landing-subtle": "rgba(227, 215, 200, 0.5)",
    "--landing-panel": "rgba(17, 12, 10, 0.82)",
    "--landing-card": "#110C0A",
    "--landing-card-soft": "#1C130E",
    "--landing-border": "#2A1D16",
    "--landing-border-strong": "#4E3627",
    "--landing-accent": "#C98A3D",
    "--landing-accent-hover": "#D49A54",
    "--landing-accent-text": "#120B07",
    "--landing-code": "#D8C3AA",
    "--landing-shadow": "rgba(0, 0, 0, 0.72)",
  } as CSSProperties,
  light: {
    "--landing-bg": "#FBF7F0",
    "--landing-text": "#1F1712",
    "--landing-muted": "rgba(64, 49, 39, 0.82)",
    "--landing-subtle": "rgba(91, 70, 56, 0.72)",
    "--landing-panel": "rgba(255, 250, 243, 0.86)",
    "--landing-card": "#FFF8EF",
    "--landing-card-soft": "#F3E6D6",
    "--landing-border": "#D8BE9F",
    "--landing-border-strong": "#C9A77F",
    "--landing-accent": "#B8752F",
    "--landing-accent-hover": "#A96729",
    "--landing-accent-text": "#FFF8EF",
    "--landing-code": "#8A5A30",
    "--landing-shadow": "rgba(120, 80, 42, 0.2)",
  } as CSSProperties,
};

const ThemeContext = createContext<IThemeContext | null>(null);

const getStoredTheme = (): ThemeMode => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "dark";
  } catch {
    return "dark";
  }
};

export function ThemeProvider({ children }: IThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);
  const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Keep theme usable even when storage is unavailable.
    }
  }, [theme]);

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
