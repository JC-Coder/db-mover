import { Button } from "@/components/ui/button";
import { GitHubStarButton } from "@/components/GitHubStarButton";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  Zap,
  ShieldCheck,
  BarChart2,
  Layers,
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

export function LandingPageV2({ onStart }: ISimpleLandingPageProps) {
  return (
    <div className="min-h-full bg-[#080504] text-[#F5EFE8]">
      {/* Floating Header */}
      <header className="fixed top-6 left-1/2 z-50 w-[calc(100%-3rem)] max-w-5xl -translate-x-1/2">
        <nav className="flex items-center justify-between rounded-full border border-[#2A1D16] bg-[#110C0A]/80 px-6 py-3 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C98A3D]">
              <Database className="h-5 w-5 text-[#120B07]" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#F5EFE8]">
              DB Mover
            </span>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-[#E3D7C8]/70 transition-colors hover:text-[#F5EFE8]"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-[#E3D7C8]/70 transition-colors hover:text-[#F5EFE8]"
            >
              How it works
            </a>
            <a
              href={`https://github.com/${REPO}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-[#E3D7C8]/70 transition-colors hover:text-[#F5EFE8]"
            >
              <GithubIcon className="h-4 w-4" />
              GitHub
            </a>
          </div>

          <Button
            onClick={onStart}
            size="sm"
            className="rounded-full bg-[#C98A3D] px-5 text-[#120B07] hover:bg-[#D49A54]"
          >
            Launch App
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-6 pt-48 pb-28">
        <div className="mx-auto max-w-5xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#2A1D16] bg-[#110C0A] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#D8B788]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C98A3D]" />
            100% Free &amp; Open Source
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            Stop googling{" "}
            <span className="font-mono text-[#C98A3D]">pg_dump</span>{" "}
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
                  stroke="#B56A4A"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-[#E3D7C8]/85 sm:text-lg">
            DB Mover handles the connection strings, the dump flags, and the
            transfer details so you can focus on what you're actually shipping.
            Copy databases or pull a backup zip — in minutes, not manuals.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs font-medium text-[#E3D7C8]/50">
            {["MongoDB", "PostgreSQL", "MySQL", "Redis"].map((db) => (
              <span
                key={db}
                className="rounded-full border border-[#2A1D16] px-3 py-1"
              >
                {db}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              onClick={onStart}
              size="lg"
              className="h-12 rounded-md bg-[#C98A3D] px-8 text-[#120B07] hover:bg-[#D49A54]"
            >
              Start Migrating — It's Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 rounded-md border-[#433023] bg-transparent px-8 text-[#F5EFE8] hover:bg-[#1C130E]"
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
            <h2 className="text-center text-3xl font-semibold leading-relaxed text-[#F3E9DC] sm:text-4xl">
              Every engineer has lost an hour to a dump command they half-remembered.
            </h2>

            <div className="mx-auto mt-8 h-px w-40 bg-gradient-to-r from-transparent via-[#4E3627] to-transparent" />

            <div className="mt-10 space-y-7 text-base leading-relaxed text-[#E3D7C8]/85 sm:text-lg">
              <p>
                The data move itself takes seconds. The ceremony around it doesn't:
                hunting down the right flags, double-checking URI formats,
                validating whether the migration actually finished — or silently failed.
              </p>
              <p>
                You context-switch between{" "}
                <span className="font-mono text-[#D8C3AA]">mongodump</span>,{" "}
                <span className="font-mono text-[#D8C3AA]">pg_dump</span>,{" "}
                <span className="font-mono text-[#D8C3AA]">mysqldump</span>, and{" "}
                <span className="font-mono text-[#D8C3AA]">redis-cli</span>{" "}
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
          <p className="mx-auto mt-5 max-w-3xl text-center text-[#E3D7C8]/80">
            A focused tool that does one job well: get your data from A to B
            without the ceremony.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <InfoCard
              icon={<Zap className="h-5 w-5 text-[#C98A3D]" />}
              title="Copy source → target in one flow"
              description="Move data between databases of the same engine with a guided, form-based interface. No CLI. No docs tab."
              bullets={[
                "MongoDB to MongoDB — collections intact",
                "PostgreSQL to PostgreSQL — schema preserved",
              ]}
            />
            <InfoCard
              icon={<ShieldCheck className="h-5 w-5 text-[#C98A3D]" />}
              title="Instant backup, no commands needed"
              description="Download a compressed zip of your source data before risky changes, audits, or handoffs — straight from the config screen."
              bullets={[
                "Grab a snapshot before schema changes",
                "Share data exports with your team offline",
              ]}
            />
            <InfoCard
              icon={<BarChart2 className="h-5 w-5 text-[#C98A3D]" />}
              title="Live progress you can actually trust"
              description="Real-time status updates and log output while the migration runs — so you know it worked before you close the tab."
              bullets={[
                "Streaming logs show each step",
                "Restart with saved config if needed",
              ]}
            />
            <InfoCard
              icon={<Layers className="h-5 w-5 text-[#C98A3D]" />}
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
          <p className="mx-auto mt-5 max-w-3xl text-center text-[#E3D7C8]/80">
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
          <p className="mx-auto mt-5 max-w-3xl text-center text-[#E3D7C8]/80">
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
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#2A1D16] bg-[#110C0A] p-12 text-center shadow-[0_32px_80px_-24px_rgba(0,0,0,0.8)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#D8B788]">
            Free forever · Open source · No account needed
          </p>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Ready to move your data?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#E3D7C8]/75">
            No install, no signup. Open the app, paste your connection strings,
            and your migration is running in under a minute.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              onClick={onStart}
              size="lg"
              className="h-12 rounded-md bg-[#C98A3D] px-10 text-[#120B07] hover:bg-[#D49A54]"
            >
              Launch the App
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A1D16] bg-[#080504] px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:gap-4">
            <div className="flex flex-col items-center gap-2 md:items-start">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-[#C98A3D]" />
                <span className="text-lg font-bold tracking-tight text-[#F5EFE8]">
                  DB Mover
                </span>
              </div>
              <p className="text-sm text-[#E3D7C8]/50">
                Open source database migration and backup tool.
              </p>
            </div>

            <div className="flex items-center gap-8">
              <a
                href={`https://github.com/${REPO}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-[#E3D7C8]/70 transition-colors hover:text-[#F5EFE8]"
              >
                GitHub
              </a>
              <a
                href="#"
                className="text-sm font-medium text-[#E3D7C8]/70 transition-colors hover:text-[#F5EFE8]"
              >
                Documentation
              </a>
              <a
                href="#"
                className="text-sm font-medium text-[#E3D7C8]/70 transition-colors hover:text-[#F5EFE8]"
              >
                Privacy Policy
              </a>
            </div>

            <p className="text-sm text-[#E3D7C8]/40">
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
    <article className="relative flex flex-col justify-between rounded-xl border border-[#2A1D16] bg-[#110C0A] p-7 shadow-sm transition-all hover:border-[#4E3627]">
      <div>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C130E] text-xs font-bold text-[#D8B788]">
            {avatarText}
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-sm font-semibold text-[#F5EFE8]">
              {name}
            </p>
            <p className="truncate text-xs text-[#E3D7C8]/60">{role}</p>
          </div>
        </div>
        <p className="text-sm italic leading-relaxed text-[#E3D7C8]/90">
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
    <article className="rounded-xl border border-[#2A1D16] bg-[#110C0A] p-7 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.7)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1C130E]">
        {icon}
      </div>
      <h3 className="mt-5 text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[#E3D7C8]/80">
        {description}
      </p>
      <div className="mt-5 space-y-2">
        {bullets.map((bullet) => (
          <div
            key={bullet}
            className="flex items-start gap-2 text-sm text-[#EADFCF]"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C98A3D]" />
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
    <article className="rounded-xl border border-[#2A1D16] bg-[#110C0A] p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D8B788]">
        {step}
      </p>
      <h3 className="mt-3 text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[#E3D7C8]/80">
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
