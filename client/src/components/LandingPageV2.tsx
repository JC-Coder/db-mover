import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { GitHubStarButton } from "@/components/GitHubStarButton";
import { DatabaseBrand } from "@/components/DatabaseBrand";
import { DATABASE_BRANDS } from "@/lib/databaseBrands";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Zap,
  ShieldCheck,
  BarChart2,
  Layers,
  Moon,
  Sun,
} from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

interface ISimpleLandingPageProps {
  onStart: () => void;
}

const REPO = "JC-Coder/db-mover";
const HERO_BRAND_LOOP = [...DATABASE_BRANDS, ...DATABASE_BRANDS];
type LandingTheme = "dark" | "light";

const THEME_VARS: Record<LandingTheme, CSSProperties> = {
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
    "--landing-muted": "rgba(64, 49, 39, 0.72)",
    "--landing-subtle": "rgba(91, 70, 56, 0.58)",
    "--landing-panel": "rgba(255, 250, 243, 0.86)",
    "--landing-card": "#FFF8EF",
    "--landing-card-soft": "#F3E6D6",
    "--landing-border": "#E6D3BC",
    "--landing-border-strong": "#C9A77F",
    "--landing-accent": "#B8752F",
    "--landing-accent-hover": "#A96729",
    "--landing-accent-text": "#FFF8EF",
    "--landing-code": "#8A5A30",
    "--landing-shadow": "rgba(120, 80, 42, 0.2)",
  } as CSSProperties,
};

export function LandingPageV2({ onStart }: ISimpleLandingPageProps) {
  const [theme, setTheme] = useState<LandingTheme>("dark");
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <div
      className="min-h-full bg-[var(--landing-bg)] text-[var(--landing-text)] transition-colors duration-500 ease-out"
      style={THEME_VARS[theme]}
      data-theme={theme}
    >
      {/* Floating Header */}
      <header className="fixed top-6 left-1/2 z-50 w-[calc(100%-3rem)] max-w-5xl -translate-x-1/2">
        <nav className="flex items-center justify-between rounded-full border border-[var(--landing-border)] bg-[var(--landing-panel)] px-6 py-3 shadow-lg backdrop-blur-md transition-colors duration-500">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold tracking-tight text-[var(--landing-text)] transition-colors duration-500">
              DB Mover
            </span>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)]"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)]"
            >
              How it works
            </a>
            <a
              href={`https://github.com/${REPO}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)]"
            >
              <GithubIcon className="h-4 w-4" />
              GitHub
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(nextTheme)}
              className="relative flex h-9 w-16 items-center rounded-full border border-[var(--landing-border)] bg-[var(--landing-card-soft)] px-1 transition-colors duration-500"
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
            <Button
              onClick={onStart}
              size="sm"
              className="rounded-full bg-[var(--landing-accent)] px-5 text-[var(--landing-accent-text)] transition-colors duration-300 hover:bg-[var(--landing-accent-hover)]"
            >
              Launch App
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-6 pt-48 pb-28">
        <div className="mx-auto max-w-5xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-[var(--landing-card)] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--landing-accent)] transition-colors duration-500">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--landing-accent)] transition-colors duration-500" />
            100% Free &amp; Open Source
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            Stop googling{" "}
            <span className="font-mono text-[var(--landing-accent)] transition-colors duration-500">pg_dump</span>{" "}
            flags.{" "}
            <span className="relative inline-block px-1 pb-2">
              Just move your data.
              <svg
                aria-hidden="true"
                viewBox="0 0 280 24"
                className="pointer-events-none absolute -bottom-2 left-0 h-4 w-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M4 14 Q 140 2 276 14"
                  fill="none"
                  stroke="var(--landing-accent)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-[var(--landing-muted)] transition-colors duration-500 sm:text-lg">
            DB Mover handles the connection strings, the dump flags, and the
            transfer details so you can focus on what you're actually shipping.
            Copy databases or pull a backup zip — in minutes, not manuals.
          </p>

          <div className="mx-auto mt-8 max-w-3xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <div className="flex w-max animate-logo-marquee items-center gap-12">
              {HERO_BRAND_LOOP.map((brand, index) => (
                <span
                  key={`${brand.id}-${index}`}
                  className="flex h-12 w-36 shrink-0 items-center justify-center"
                  aria-hidden={index >= DATABASE_BRANDS.length}
                >
                  <DatabaseBrand
                    db={brand.id}
                    theme={theme}
                    variant={brand.id === "redis" ? "icon" : "wordmark"}
                    className="h-8 w-36"
                  />
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              onClick={onStart}
              size="lg"
              className="h-12 rounded-md bg-[var(--landing-accent)] px-8 text-[var(--landing-accent-text)] transition-colors duration-300 hover:bg-[var(--landing-accent-hover)]"
            >
              Start Migrating — It's Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 rounded-md border-[var(--landing-border-strong)] bg-transparent px-8 text-[var(--landing-text)] transition-colors duration-300 hover:bg-[var(--landing-card-soft)]"
              asChild
            >
              <a
                href={`https://github.com/${REPO}`}
                target="_blank"
                rel="noreferrer"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Pain / Why section */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mt-2 max-w-4xl">
            <h2 className="text-center text-3xl font-semibold leading-relaxed text-[var(--landing-text)] transition-colors duration-500 sm:text-4xl">
              Every engineer has lost an hour to a dump command they half-remembered.
            </h2>

            <div className="mx-auto mt-8 h-px w-40 bg-gradient-to-r from-transparent via-[var(--landing-border-strong)] to-transparent transition-colors duration-500" />

            <div className="mt-10 space-y-7 text-base leading-relaxed text-[var(--landing-muted)] transition-colors duration-500 sm:text-lg">
              <p>
                The data move itself takes seconds. The ceremony around it doesn't:
                hunting down the right flags, double-checking URI formats,
                validating whether the migration actually finished — or silently failed.
              </p>
              <p>
                You context-switch between{" "}
                <span className="font-mono text-[var(--landing-code)]">mongodump</span>,{" "}
                <span className="font-mono text-[var(--landing-code)]">pg_dump</span>,{" "}
                <span className="font-mono text-[var(--landing-code)]">mysqldump</span>, and{" "}
                <span className="font-mono text-[var(--landing-code)]">redis-cli</span>{" "}
                — each with its own syntax, its own gotchas, its own documentation
                rabbit hole. And you repeat the same lookup in every environment.
              </p>
              <p>
                DB Mover collapses all of that into one interface: select your
                database engine, paste your connection strings, and hit run. Live
                logs tell you exactly what's happening while it moves.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionTitle title="Everything you need. Nothing you don't." />
          <p className="mx-auto mt-5 max-w-3xl text-center text-[var(--landing-muted)] transition-colors duration-500">
            A focused tool that does one job well: get your data from A to B
            without the ceremony.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <InfoCard
              icon={<Zap className="h-5 w-5 text-[var(--landing-accent)] transition-colors duration-500" />}
              title="Copy source → target in one flow"
              description="Move data between databases of the same engine with a guided, form-based interface. No CLI. No docs tab."
              bullets={[
                "MongoDB to MongoDB — collections intact",
                "PostgreSQL to PostgreSQL — schema preserved",
              ]}
            />
            <InfoCard
              icon={<ShieldCheck className="h-5 w-5 text-[var(--landing-accent)] transition-colors duration-500" />}
              title="Instant backup, no commands needed"
              description="Download a compressed zip of your source data before risky changes, audits, or handoffs — straight from the config screen."
              bullets={[
                "Grab a snapshot before schema changes",
                "Share data exports with your team offline",
              ]}
            />
            <InfoCard
              icon={<BarChart2 className="h-5 w-5 text-[var(--landing-accent)] transition-colors duration-500" />}
              title="Live progress you can actually trust"
              description="Real-time status updates and log output while the migration runs — so you know it worked before you close the tab."
              bullets={[
                "Streaming logs show each step",
                "Restart with saved config if needed",
              ]}
            />
            <InfoCard
              icon={<Layers className="h-5 w-5 text-[var(--landing-accent)] transition-colors duration-500" />}
              title="One UI for four database engines"
              description="MongoDB, PostgreSQL, MySQL, and Redis all share the same clean workflow. Onboard once, use everywhere."
              bullets={[
                "Predictable flow regardless of engine",
                "No engine-specific command memorization",
              ]}
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionTitle title="Up and running in three steps" />
          <p className="mx-auto mt-5 max-w-3xl text-center text-[var(--landing-muted)] transition-colors duration-500">
            No setup. No config files. No surprises.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <StepCard
              step="01"
              title="Pick your engine"
              description="Choose MongoDB, PostgreSQL, MySQL, or Redis — the UI adapts to match what that engine needs."
            />
            <StepCard
              step="02"
              title="Paste your connection strings"
              description="Drop in your source URI. Add a target URI if you're copying. That's your entire config."
            />
            <StepCard
              step="03"
              title="Run it. Watch it. Done."
              description="Hit copy or download and monitor live status in the migration view. Close the tab when it's green."
            />
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionTitle title="What developers are saying" />
          <p className="mx-auto mt-5 max-w-3xl text-center text-[var(--landing-muted)] transition-colors duration-500">
            Used by developers who'd rather ship features than memorize CLI flags.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <FeedbackCard
              name="Maya Chen"
              role="Senior Engineer @ TechFlow"
              content="Saved us a solid 45 minutes on a staging-to-prod MongoDB copy. Pasted the URIs, watched the logs, done. I didn't touch the terminal once."
            />
            <FeedbackCard
              name="Ade Okonkwo"
              role="Fullstack Engineer"
              content="The zip backup mode is a lifesaver before schema migrations. One click and I had a snapshot to roll back to. Exactly what I needed."
            />
            <FeedbackCard
              name="Nina Patel"
              role="Platform Lead"
              content="I've recommended this to three teammates now. It removes all the friction from database handoffs. Clean, fast, no surprises."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-12 text-center shadow-[0_32px_80px_-24px_var(--landing-shadow)] transition-colors duration-500">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--landing-accent)] transition-colors duration-500">
            Free forever · Open source · No account needed
          </p>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Ready to move your data?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--landing-muted)] transition-colors duration-500">
            No install, no signup. Open the app, paste your connection strings,
            and your migration is running in under a minute.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              onClick={onStart}
              size="lg"
              className="h-12 rounded-md bg-[var(--landing-accent)] px-10 text-[var(--landing-accent-text)] transition-colors duration-300 hover:bg-[var(--landing-accent-hover)]"
            >
              Launch the App
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--landing-border)] bg-[var(--landing-bg)] px-6 py-12 transition-colors duration-500">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:gap-4">
            <div className="flex flex-col items-center gap-2 md:items-start">
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="" className="h-7 w-7 rounded-md" />
                <span className="text-lg font-bold tracking-tight text-[var(--landing-text)] transition-colors duration-500">
                  DB Mover
                </span>
              </div>
              <p className="text-sm text-[var(--landing-subtle)] transition-colors duration-500">
                Open source database migration and backup tool.
              </p>
            </div>

            <div className="flex items-center gap-8">
              <a
                href={`https://github.com/${REPO}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)]"
              >
                GitHub
              </a>
              <a
                href="#"
                className="text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)]"
              >
                Documentation
              </a>
              <a
                href="#"
                className="text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)]"
              >
                Privacy Policy
              </a>
            </div>

            <p className="text-sm text-[var(--landing-subtle)] transition-colors duration-500">
              © {new Date().getFullYear()} DB Mover. MIT License.
            </p>
          </div>
        </div>
      </footer>

      <GitHubStarButton repo={REPO} />
    </div>
  );
}

interface IFeedbackCardProps {
  name: string;
  role: string;
  content: string;
}

function FeedbackCard({ name, role, content }: IFeedbackCardProps) {
  const avatarText = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="relative flex flex-col justify-between rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-7 shadow-sm transition-all duration-500 hover:border-[var(--landing-border-strong)]">
      <div>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--landing-card-soft)] text-xs font-bold text-[var(--landing-accent)] transition-colors duration-500">
            {avatarText}
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-sm font-semibold text-[var(--landing-text)] transition-colors duration-500">
              {name}
            </p>
            <p className="truncate text-xs text-[var(--landing-subtle)] transition-colors duration-500">{role}</p>
          </div>
        </div>
        <p className="text-sm italic leading-relaxed text-[var(--landing-muted)] transition-colors duration-500">
          "{content}"
        </p>
      </div>
    </article>
  );
}

interface IInfoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
}

function InfoCard({ icon, title, description, bullets }: IInfoCardProps) {
  return (
    <article className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-7 shadow-[0_18px_50px_-28px_var(--landing-shadow)] transition-colors duration-500">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--landing-card-soft)] transition-colors duration-500">
        {icon}
      </div>
      <h3 className="mt-5 text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[var(--landing-muted)] transition-colors duration-500">
        {description}
      </p>
      <div className="mt-5 space-y-2">
        {bullets.map((bullet) => (
          <div
            key={bullet}
            className="flex items-start gap-2 text-sm text-[var(--landing-text)] transition-colors duration-500"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--landing-accent)] transition-colors duration-500" />
            <span>{bullet}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

interface IStepCardProps {
  step: string;
  title: string;
  description: string;
}

function StepCard({ step, title, description }: IStepCardProps) {
  return (
    <article className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-7 transition-colors duration-500">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--landing-accent)] transition-colors duration-500">
        {step}
      </p>
      <h3 className="mt-3 text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[var(--landing-muted)] transition-colors duration-500">
        {description}
      </p>
    </article>
  );
}

interface ISectionTitleProps {
  title: string;
}

function SectionTitle({ title }: ISectionTitleProps) {
  return (
    <div className="flex items-center justify-center">
      <h2 className="text-center text-2xl font-semibold capitalize sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}
