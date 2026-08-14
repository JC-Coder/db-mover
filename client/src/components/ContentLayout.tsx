import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

interface IContentLayoutProps {
  children: ReactNode;
}

const REPO = "JC-Coder/db-mover";

/** Shared shell for the crawlable content pages (docs, guides, 404). */
export function ContentLayout({ children }: IContentLayoutProps) {
  return (
    <div className="min-h-full bg-[var(--landing-bg)] text-[var(--landing-text)] transition-colors duration-500">
      <header className="sticky top-0 z-50 border-b border-[var(--landing-border)] bg-[var(--landing-panel)] backdrop-blur-md transition-colors duration-500">
        <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img src="/logo.svg" alt="" className="h-7 w-7 shrink-0 rounded-md" />
            <span className="whitespace-nowrap text-base font-bold tracking-tight">
              DB Mover
            </span>
          </Link>

          <div className="flex items-center gap-5">
            <Link
              to="/docs"
              className="text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)]"
            >
              Docs
            </Link>
            <a
              href={`https://github.com/${REPO}`}
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)] sm:inline"
            >
              GitHub
            </a>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[var(--landing-border)] px-6 py-10 transition-colors duration-500">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 text-sm text-[var(--landing-subtle)] sm:flex-row">
          <p>© {new Date().getFullYear()} DB Mover. MIT License.</p>
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="transition-colors hover:text-[var(--landing-text)]"
            >
              Home
            </Link>
            <Link
              to="/docs"
              className="transition-colors hover:text-[var(--landing-text)]"
            >
              Docs
            </Link>
            <Link
              to="/stats"
              className="transition-colors hover:text-[var(--landing-text)]"
            >
              Stats
            </Link>
            <a
              href={`https://github.com/${REPO}`}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-[var(--landing-text)]"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
