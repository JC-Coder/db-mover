import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ExternalLink,
  Github,
  Menu,
  RefreshCw,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";

type StatsRange = "7d" | "30d" | "90d" | "1y" | "all";

const REPO_URL = "https://github.com/JC-Coder/db-mover";

/** Below this many visitors, the social-proof headline reads as a liability. */
const SOCIAL_PROOF_FLOOR = 50;

interface IPublicStats {
  range: StatsRange;
  generatedAt: string;
  stale: boolean;
  traffic: {
    uniqueBrowsers: number;
    sessions: number;
    pageViews: number;
  };
  installations: {
    active: number;
    hosted: number;
    selfHosted: number;
    versions: Array<{ version: string; installations: number }>;
  };
  operations: {
    completed: number;
    failed: number;
    successRate: number;
    copy: number;
    download: number;
    browser: number;
  };
  throughput: {
    recordsProcessed: number;
    objectsProcessed: number;
    downloadBytes: number;
    medianDurationMs: number | null;
    p95DurationMs: number | null;
  };
  trends: Array<{ date: string; visitors: number; copy: number; download: number; browser: number }>;
  byDatabase: Array<{ database: string; operations: number; percentage: number; successRate: number }>;
  byDeployment: { hosted: number; selfHosted: number };
  community: { stars: number | null; forks: number | null; contributors: number | null };
}

interface IStatProps {
  label: string;
  value: string;
  detail: string;
}

const ranges: Array<{ value: StatsRange; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
];

const databaseLabels: Record<string, string> = {
  mongodb: "MongoDB",
  postgres: "PostgreSQL",
  mysql: "MySQL",
  redis: "Redis",
  firebase: "Firebase",
};

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en");

const formatBytes = (bytes: number): string => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

const formatDuration = (milliseconds: number | null | undefined): string => {
  if (milliseconds === null || milliseconds === undefined || !Number.isFinite(milliseconds)) return "—";
  if (milliseconds < 1_000) return `${Math.round(milliseconds)} ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1_000).toFixed(1)} sec`;
  return `${(milliseconds / 60_000).toFixed(1)} min`;
};

/** Editorial stat: hairline rule, label, number, one line of context. No box, no icon. */
function Stat({ label, value, detail }: IStatProps) {
  return (
    <div className="border-t border-[var(--landing-border)] pt-5">
      <p className="text-sm text-[var(--landing-muted)]">{label}</p>
      <p className="font-['Outfit'] mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--landing-subtle)]">{detail}</p>
    </div>
  );
}

interface ISectionProps {
  title: string;
  definition: string;
  children: React.ReactNode;
  className?: string;
}

/** Every section states what its numbers mean — the subtitle is a definition, never a restatement. */
function Section({ title, definition, children, className = "" }: ISectionProps) {
  return (
    <section className={className}>
      <h2 className="font-['Outfit'] text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-6 text-[var(--landing-subtle)]">{definition}</p>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-8 text-sm leading-6 text-[var(--landing-subtle)]">{children}</p>;
}

function StatsSkeleton() {
  return (
    <div className="space-y-16" aria-label="Loading statistics">
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-t border-[var(--landing-border)] pt-5">
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--landing-card-soft)]" />
            <div className="mt-4 h-9 w-28 animate-pulse rounded bg-[var(--landing-card-soft)]" />
          </div>
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-[var(--landing-card)]" />
      <div className="grid gap-12 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-xl bg-[var(--landing-card)]" />
        <div className="h-56 animate-pulse rounded-xl bg-[var(--landing-card)]" />
      </div>
    </div>
  );
}

interface ICustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: ICustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--landing-border)] bg-[var(--landing-card)] px-3.5 py-2.5 shadow-lg">
      <p className="mb-1.5 text-xs text-[var(--landing-subtle)]">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-sm">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
          <span className="text-[var(--landing-muted)]">{item.name}</span>
          <span className="ml-auto font-medium tabular-nums">{full.format(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function StatsPage() {
  const [range, setRange] = useState<StatsRange>("30d");
  const [stats, setStats] = useState<IPublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadStats = async (selectedRange: StatsRange) => {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get<Partial<IPublicStats>>(`/stats?range=${selectedRange}`);
      let community = response.data.community;
      if (
        !community ||
        community.stars === null ||
        community.forks === null ||
        community.contributors === null
      ) {
        try {
          const [ghRepo, ghContributors] = await Promise.all([
            fetch("https://api.github.com/repos/JC-Coder/db-mover"),
            fetch("https://api.github.com/repos/JC-Coder/db-mover/contributors?per_page=1&anon=1"),
          ]);

          let stars = community?.stars ?? null;
          let forks = community?.forks ?? null;
          let contributors = community?.contributors ?? null;

          if (ghRepo.ok) {
            const ghData = (await ghRepo.json()) as { stargazers_count?: number; forks_count?: number };
            stars = ghData.stargazers_count ?? stars;
            forks = ghData.forks_count ?? forks;
          }

          if (ghContributors.ok) {
            const contributorData = (await ghContributors.json()) as Array<unknown>;
            const lastPage = ghContributors.headers
              .get("link")
              ?.match(/<[^>]*[?&]page=(\d+)[^>]*>; rel="last"/);
            contributors = lastPage ? Number(lastPage[1]) : contributorData.length;
          }

          community = { stars, forks, contributors };
        } catch {
          // Ignore GitHub API errors
        }
      }
      setStats({
        range: selectedRange,
        generatedAt: response.data.generatedAt || new Date().toISOString(),
        stale: response.data.stale || false,
        traffic: response.data.traffic || { uniqueBrowsers: 0, sessions: 0, pageViews: 0 },
        installations: response.data.installations || { active: 0, hosted: 0, selfHosted: 0, versions: [] },
        operations: response.data.operations || { completed: 0, failed: 0, successRate: 100, copy: 0, download: 0, browser: 0 },
        throughput: {
          recordsProcessed: response.data.throughput?.recordsProcessed ?? 0,
          objectsProcessed: response.data.throughput?.objectsProcessed ?? 0,
          downloadBytes: response.data.throughput?.downloadBytes ?? 0,
          medianDurationMs: response.data.throughput?.medianDurationMs ?? null,
          p95DurationMs: response.data.throughput?.p95DurationMs ?? null,
        },
        trends: response.data.trends || [],
        byDatabase: response.data.byDatabase || [
          { database: "mongodb", operations: 0, percentage: 0, successRate: 100 },
          { database: "postgres", operations: 0, percentage: 0, successRate: 100 },
          { database: "mysql", operations: 0, percentage: 0, successRate: 100 },
          { database: "redis", operations: 0, percentage: 0, successRate: 100 },
          { database: "firebase", operations: 0, percentage: 0, successRate: 100 },
        ],
        byDeployment: response.data.byDeployment || { hosted: 0, selfHosted: 0 },
        community: community || { stars: null, forks: null, contributors: null },
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats(range);
  }, [range]);

  const chartData = useMemo(
    () =>
      stats?.trends.map((item) => ({
        ...item,
        operations: item.copy + item.download + item.browser,
        label: new Date(`${item.date}T00:00:00Z`).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
      })) ?? [],
    [stats],
  );

  const operationTotal = stats ? stats.operations.copy + stats.operations.download + stats.operations.browser : 0;
  const attemptedTotal = stats ? stats.operations.completed + stats.operations.failed : 0;
  const deploymentTotal = stats ? stats.installations.hosted + stats.installations.selfHosted : 0;
  const activeDatabases = stats?.byDatabase.filter((db) => db.operations > 0) ?? [];
  const allCommunityNull =
    stats?.community.stars === null &&
    stats.community.forks === null &&
    stats.community.contributors === null;

  const operationBreakdown = stats
    ? [
      { label: "Copy", detail: "Source → target database", value: stats.operations.copy },
      { label: "Download", detail: "Export a snapshot to a file", value: stats.operations.download },
      { label: "Browse", detail: "Load a database's structure to inspect it", value: stats.operations.browser },
    ]
    : [];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--landing-bg)] text-[var(--landing-text)] transition-colors duration-500">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[var(--landing-border)] bg-[var(--landing-panel)]/90 backdrop-blur-xl">
        <nav
          className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8"
          aria-label="Primary navigation"
        >
          <Link
            to="/"
            className="flex min-h-11 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-accent)]"
          >
            <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
            <span className="font-['Outfit'] text-base font-bold tracking-tight max-[430px]:hidden">
              DB Mover
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/"
              className="hidden min-h-11 items-center px-3.5 text-sm text-[var(--landing-muted)] hover:text-[var(--landing-text)] sm:flex"
            >
              Home
            </Link>
            <span className="hidden min-h-11 items-center px-3.5 text-sm font-semibold text-[var(--landing-accent)] sm:flex">
              Stats
            </span>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden min-h-11 items-center gap-1.5 px-3.5 text-sm text-[var(--landing-muted)] hover:text-[var(--landing-text)] md:flex"
            >
              GitHub
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--landing-muted)] hover:bg-[var(--landing-card-soft)] hover:text-[var(--landing-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-accent)] md:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link
              to="/select"
              className="ml-1 flex min-h-9 items-center rounded-full bg-[var(--landing-accent)] px-4 text-sm font-semibold text-[var(--landing-accent-text)] transition-colors hover:bg-[var(--landing-accent-hover)]"
            >
              Launch App
            </Link>
          </div>
        </nav>

        {mobileMenuOpen && (
          <div className="mx-4 mb-3 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-panel)] p-2 shadow-xl md:hidden">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center rounded-xl px-4 text-sm text-[var(--landing-muted)] hover:bg-[var(--landing-card-soft)]"
            >
              Home
            </Link>
            <span className="flex min-h-11 items-center rounded-xl bg-[var(--landing-card-soft)] px-4 text-sm font-semibold text-[var(--landing-accent)]">
              Stats
            </span>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center rounded-xl px-4 text-sm text-[var(--landing-muted)] hover:bg-[var(--landing-card-soft)]"
            >
              GitHub
            </a>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-28 pt-16 sm:px-8 sm:pt-24">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="mb-14 max-w-2xl">
          <h1 className="font-['Outfit'] text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Every migration, counted.
          </h1>
          <p className="mt-5 text-base leading-7 text-[var(--landing-muted)]">
            DB Mover is open source, and so are its numbers. Anonymous usage from every install —
            hosted and self-hosted — updated continuously.
          </p>
          {stats && (
            <p className="mt-5 text-xs text-[var(--landing-subtle)]">
              Updated {new Date(stats.generatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </section>

        {/* ── Range picker ──────────────────────────────────────────────── */}
        <div
          className="mb-12 flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Select time period"
        >
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              aria-pressed={range === r.value}
              className={`min-h-9 whitespace-nowrap rounded-full px-4 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-accent)] ${range === r.value
                ? "bg-[var(--landing-card-soft)] font-medium text-[var(--landing-text)]"
                : "text-[var(--landing-subtle)] hover:text-[var(--landing-text)]"
                }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Stale notice */}
        {stats?.stale && (
          <p className="mb-10 flex items-center gap-2.5 text-sm text-[var(--landing-subtle)]">
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            Showing cached data — live refresh is temporarily unavailable.
          </p>
        )}

        {/* ── Content ───────────────────────────────────────────────────── */}
        {loading ? (
          <StatsSkeleton />
        ) : error || !stats ? (
          <section className="border-t border-[var(--landing-border)] py-20 text-center">
            <h2 className="font-['Outfit'] text-xl font-semibold">Couldn't fetch the numbers</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--landing-subtle)]">
              DB Mover itself is running fine — this is the stats endpoint. Try again in a moment.
            </p>
            <button
              onClick={() => void loadStats(range)}
              className="mt-7 inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--landing-border-strong)] px-5 text-sm font-medium transition-colors hover:bg-[var(--landing-card-soft)]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </section>
        ) : (
          <div className="space-y-20">

            {/* ── Headline stats ──────────────────────────────────────── */}
            <section className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4" aria-label="Key metrics">
              <Stat
                label="Success rate"
                value={attemptedTotal ? `${stats.operations.successRate.toFixed(1)}%` : "—"}
                detail={
                  attemptedTotal
                    ? `${full.format(stats.operations.completed)} of ${full.format(attemptedTotal)} copies and downloads finished cleanly`
                    : "No copies or downloads run yet in this window"
                }
              />
              <Stat
                label="Records moved"
                value={compact.format(stats.throughput.recordsProcessed)}
                detail="Rows, documents and keys read across copy and download runs"
              />
              <Stat
                label="Unique visitors"
                value={compact.format(stats.traffic.uniqueBrowsers)}
                detail={`Across ${compact.format(stats.traffic.sessions)} ${stats.traffic.sessions === 1 ? "session" : "sessions"}`}
              />
              <Stat
                label="Data exported"
                value={formatBytes(stats.throughput.downloadBytes)}
                detail={`Written to backup files across ${compact.format(stats.operations.download)} ${stats.operations.download === 1 ? "download" : "downloads"}`}
              />
            </section>

            {/* ── Trend chart ─────────────────────────────────────────── */}
            <Section
              title="Visitors & operations"
              definition="Unique browsers per day, and the operations they finished that day."
            >
              <div className="mt-6 flex gap-5 text-xs text-[var(--landing-subtle)]" aria-hidden="true">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--landing-accent)" }} />
                  Visitors
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Operations
                </span>
              </div>

              {chartData.length ? (
                <>
                  <div className="mt-6 h-64 w-full" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--landing-accent)" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="var(--landing-accent)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradOps" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.14} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--landing-border)" vertical={false} strokeOpacity={0.5} />
                        <XAxis dataKey="label" tick={{ fill: "var(--landing-subtle)", fontSize: 11 }} minTickGap={36} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: "var(--landing-subtle)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--landing-border-strong)" }} />
                        <Area type="monotone" dataKey="visitors" name="Visitors" stroke="var(--landing-accent)" fill="url(#gradVisitors)" strokeWidth={1.75} dot={false} activeDot={{ r: 3.5, strokeWidth: 0 }} />
                        <Area type="monotone" dataKey="operations" name="Operations" stroke="#10b981" fill="url(#gradOps)" strokeWidth={1.75} dot={false} activeDot={{ r: 3.5, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="sr-only">
                    Chart showing {stats.traffic.uniqueBrowsers} visitors and {stats.operations.completed} completed
                    operations in the selected period.
                  </p>
                </>
              ) : (
                <EmptyNote>
                  Nothing recorded in this window. Try a longer period — or run a migration and you'll show up
                  here tomorrow.
                </EmptyNote>
              )}
            </Section>

            {/* ── Usage + engines ─────────────────────────────────────── */}
            <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
              <Section
                title="What people use it for"
                definition="Successful actions. Copies and downloads are whole runs; browsing counts each schema load."
              >
                <div className="mt-8 space-y-7">
                  {operationBreakdown.map((item) => {
                    const pct = operationTotal ? (item.value / operationTotal) * 100 : 0;
                    return (
                      <div key={item.label}>
                        <div className="mb-2.5 flex items-baseline justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="mt-0.5 text-xs text-[var(--landing-subtle)]">{item.detail}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="font-['Outfit'] text-lg font-semibold tabular-nums">
                              {compact.format(item.value)}
                            </span>
                            {operationTotal > 0 && (
                              <span className="ml-2 text-xs text-[var(--landing-subtle)]">{pct.toFixed(0)}%</span>
                            )}
                          </div>
                        </div>
                        <div className="h-px w-full bg-[var(--landing-border)]">
                          <div
                            className="h-px bg-[var(--landing-accent)] transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              <Section
                title="Which engines people connect"
                definition="Every copy and download that finished, successful or not. Browsing is excluded."
              >
                {activeDatabases.length ? (
                  <dl className="mt-8 divide-y divide-[var(--landing-border)] border-t border-[var(--landing-border)]">
                    {activeDatabases.map((db) => (
                      <div key={db.database} className="flex items-center justify-between gap-4 py-4">
                        <div>
                          <dt className="text-sm font-medium">{databaseLabels[db.database] ?? db.database}</dt>
                          <dd className="mt-0.5 text-xs text-[var(--landing-subtle)]">
                            {full.format(db.operations)} {db.operations === 1 ? "operation" : "operations"}
                          </dd>
                        </div>
                        <dd className="shrink-0 text-right">
                          <span
                            className={`text-sm font-medium tabular-nums ${db.successRate >= 90
                              ? "text-emerald-500"
                              : db.successRate >= 70
                                ? "text-amber-500"
                                : "text-rose-500"
                              }`}
                          >
                            {db.successRate.toFixed(1)}%
                          </span>
                          <span className="ml-1.5 text-xs text-[var(--landing-subtle)]">success</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <EmptyNote>
                    No engine has been connected in this window yet. MongoDB, PostgreSQL, MySQL, Redis and
                    Firebase each appear here after their first finished run.
                  </EmptyNote>
                )}
              </Section>
            </div>

            {/* ── Performance + deployment + community ────────────────── */}
            <div className={`grid gap-14 lg:gap-16 ${allCommunityNull ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>

              <Section
                title="How long operations take"
                definition="Copies and downloads end to end. Small tables finish in seconds, large ones do not."
              >
                <div className="mt-8 grid grid-cols-2 gap-8">
                  <div>
                    <p className="font-['Outfit'] text-2xl font-semibold">{formatDuration(stats.throughput.medianDurationMs)}</p>
                    <p className="mt-1.5 text-xs text-[var(--landing-subtle)]">Typical run (median)</p>
                  </div>
                  <div>
                    <p className="font-['Outfit'] text-2xl font-semibold">{formatDuration(stats.throughput.p95DurationMs)}</p>
                    <p className="mt-1.5 text-xs text-[var(--landing-subtle)]">95% finish within</p>
                  </div>
                </div>

                <dl className="mt-8 divide-y divide-[var(--landing-border)] border-t border-[var(--landing-border)] text-sm">
                  <div className="flex items-baseline justify-between gap-4 py-3.5">
                    <dt className="text-[var(--landing-muted)]">Collections, tables & keys</dt>
                    <dd className="font-medium tabular-nums">{compact.format(stats.throughput.objectsProcessed)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-3.5">
                    <dt className="text-[var(--landing-muted)]">Page views</dt>
                    <dd className="font-medium tabular-nums">{compact.format(stats.traffic.pageViews)}</dd>
                  </div>
                </dl>
              </Section>

              <Section
                title="Where DB Mover runs"
                definition="People who opened the app or ran something in this window, split by how they run it."
              >
                <p className="font-['Outfit'] mt-8 text-4xl font-semibold tracking-tight">
                  {compact.format(stats.installations.active)}
                </p>
                <p className="mt-1.5 text-xs text-[var(--landing-subtle)]">
                  active {stats.installations.active === 1 ? "user" : "users"}
                </p>

                <dl className="mt-8 divide-y divide-[var(--landing-border)] border-t border-[var(--landing-border)]">
                  {(["hosted", "selfHosted"] as const).map((key) => {
                    const value = stats.installations[key];
                    const pct = deploymentTotal ? Math.round((value / deploymentTotal) * 100) : 0;
                    return (
                      <div key={key} className="py-3.5">
                        <div className="flex items-baseline justify-between gap-4 text-sm">
                          <dt>
                            <span className="text-[var(--landing-muted)]">
                              {key === "hosted" ? "dbmover.cloud" : "Self-hosted"}
                            </span>
                            <span className="ml-2 text-xs text-[var(--landing-subtle)]">
                              {key === "hosted" ? "the hosted app" : "your own server or laptop"}
                            </span>
                          </dt>
                          <dd className="shrink-0 font-medium tabular-nums">
                            {compact.format(value)}{deploymentTotal ? ` · ${pct}%` : ""}
                          </dd>
                        </div>
                        {deploymentTotal > 0 && (
                          <div className="mt-2.5 h-px w-full bg-[var(--landing-border)]">
                            <div
                              className="h-px bg-[var(--landing-accent)] transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </dl>
              </Section>

              {!allCommunityNull && (
                <Section title="Community" definition="Pulled live from the GitHub repository.">
                  <dl className="mt-8 divide-y divide-[var(--landing-border)] border-t border-[var(--landing-border)] text-sm">
                    {[
                      { label: "Stars", value: stats.community.stars },
                      { label: "Forks", value: stats.community.forks },
                      { label: "Contributors", value: stats.community.contributors },
                    ].map((item) => (
                      <div key={item.label} className="flex items-baseline justify-between gap-4 py-3.5">
                        <dt className="text-[var(--landing-muted)]">{item.label}</dt>
                        <dd className="font-medium tabular-nums">
                          {item.value !== null ? compact.format(item.value) : "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--landing-accent)] transition-opacity hover:opacity-80"
                  >
                    <Github className="h-4 w-4" />
                    View the repository
                  </a>
                </Section>
              )}
            </div>

            {/* ── Telemetry ───────────────────────────────────────────── */}
            <section id="telemetry" className="scroll-mt-24 border-t border-[var(--landing-border)] pt-12">
              <h2 className="font-['Outfit'] text-xl font-semibold tracking-tight">Anonymous by design</h2>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-[var(--landing-subtle)]">
                These numbers only exist because every install reports them. Here's exactly what that means.
              </p>

              <div className="mt-8 grid gap-8 text-sm leading-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="font-medium">What we count</p>
                  <p className="mt-1.5 text-[var(--landing-subtle)]">
                    Page visits, operation outcomes, which engine was used, how long a run took, and totals for
                    records and collections processed.
                  </p>
                </div>
                <div>
                  <p className="font-medium">What never leaves your machine</p>
                  <p className="mt-1.5 text-[var(--landing-subtle)]">
                    Connection strings, credentials, hostnames, table and collection names, record contents, and
                    query text. None of it is ever sent.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Always on, always aggregate</p>
                  <p className="mt-1.5 text-[var(--landing-subtle)]">
                    Every install reports here, self-hosted ones included, so this page reflects real
                    usage rather than a sample. Nothing published identifies a person, a database, or
                    a company.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Don't take our word for it</p>
                  <p className="mt-1.5 text-[var(--landing-subtle)]">
                    The whole implementation is two short files you can read in a minute.
                  </p>
                  <a
                    href={`${REPO_URL}/blob/main/client/src/lib/telemetry.ts`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1.5 text-[var(--landing-accent)] transition-opacity hover:opacity-80"
                  >
                    client/telemetry.ts
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                  <br />
                  <a
                    href={`${REPO_URL}/blob/main/server/src/lib/telemetry.ts`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-[var(--landing-accent)] transition-opacity hover:opacity-80"
                  >
                    server/telemetry.ts
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                </div>
              </div>
            </section>

            {/* ── CTA ─────────────────────────────────────────────────── */}
            <section className="border-t border-[var(--landing-border)] pt-12">
              <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
                <div className="max-w-md">
                  <h2 className="font-['Outfit'] text-2xl font-semibold tracking-tight">
                    {stats.traffic.uniqueBrowsers >= SOCIAL_PROOF_FLOOR
                      ? `Join the ${compact.format(stats.traffic.uniqueBrowsers)} people who moved data with DB Mover.`
                      : "Your database, moved in under a minute."}
                  </h2>
                  <p className="mt-2.5 text-sm leading-6 text-[var(--landing-muted)]">
                    Paste a connection string and go. No account, no CLI, no install.
                  </p>
                </div>
                <Link
                  to="/select"
                  className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--landing-accent)] px-6 text-sm font-semibold text-[var(--landing-accent-text)] transition-colors hover:bg-[var(--landing-accent-hover)]"
                >
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>

          </div>
        )}
      </main>
    </div>
  );
}
