import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface IThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: IThemeToggleProps) {
  const { theme, nextTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative flex h-9 w-16 items-center rounded-full border border-[var(--landing-border)] bg-[var(--landing-card-soft)] px-1 transition-colors duration-500 ${className ?? ""}`}
      aria-label={`Switch to ${nextTheme} mode`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full bg-[var(--landing-bg)] text-[var(--landing-accent)] shadow-sm transition-transform duration-500 ease-out ${
          theme === "light" ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {theme === "dark" ? (
          <Moon className="h-3.5 w-3.5" />
        ) : (
          <Sun className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
}
