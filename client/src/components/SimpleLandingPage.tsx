import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Heart,
  MessageCircle,
  Repeat2,
} from "lucide-react";

interface ISimpleLandingPageProps {
  onStart: () => void;
}

export function SimpleLandingPage({ onStart }: ISimpleLandingPageProps) {
  return (
    <div className="min-h-full bg-[#120E0A] text-[#F5EFE8]">
      <section className="px-6 pt-32 pb-28">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D8B788]">
            Built for Developers
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            Copy database data safely{" "}
            <span className="relative inline-block px-1 pb-2">
              or download a backup
              {/* Curved underline for key phrase in the hero headline */}
              <svg
                aria-hidden="true"
                viewBox="0 0 220 24"
                className="pointer-events-none absolute -bottom-2 left-0 h-4 w-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M4 14 Q 110 2 216 14"
                  fill="none"
                  stroke="#B56A4A"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            .
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#E3D7C8]/85 sm:text-lg">
            Choose your database type, enter your source and target connection
            strings, then run copy. Or download your source data as a zip
            backup in one step.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              onClick={onStart}
              size="lg"
              className="h-12 rounded-md bg-[#C98A3D] px-8 text-[#1D130C] hover:bg-[#D49A54]"
            >
              Start Migration
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 rounded-md border-[#5D4635] bg-transparent px-8 text-[#F5EFE8] hover:bg-[#2B2018]"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              View Docs
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-[#3A2B20] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mt-2 max-w-4xl">
            <h2 className="text-center text-3xl font-semibold leading-relaxed text-[#F3E9DC] sm:text-4xl">
              Copying or downloading data from a database should feel
              straightforward, not like a CLI exam.
            </h2>

            <div className="mx-auto mt-8 h-px w-40 bg-gradient-to-r from-transparent via-[#6A4B36] to-transparent" />

            <div className="mt-10 space-y-7 text-base leading-relaxed text-[#E3D7C8]/85 sm:text-lg">
              <p>
                In many teams, data tasks still start with command hunting:
                checking syntax, matching flags, and validating connection
                strings before real work even begins.
              </p>
              <p>
                You may jump between{" "}
                <span className="font-mono text-[#D8C3AA]">mongodump</span>,{" "}
                <span className="font-mono text-[#D8C3AA]">pg_dump</span>,{" "}
                <span className="font-mono text-[#D8C3AA]">mysqldump</span>, or{" "}
                <span className="font-mono text-[#D8C3AA]">redis-cli</span>{" "}
                commands, then repeat the same checks again for every environment.
              </p>
              <p>
                DB Mover keeps that flow simple: select database type, enter
                source and target details, choose copy or download, and run with
                live status in the interface.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#3A2B20] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionTitle title="What it does" />
          <p className="mx-auto mt-5 max-w-3xl text-center text-[#E3D7C8]/80">
            DB Mover keeps the flow simple: copy from source to target in the
            same database engine, or download data for backup.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <InfoCard
              title="Copy from source to target"
              description="Move data from one database to another database of the same type with a clean guided flow."
              bullets={[
                "MongoDB to MongoDB",
                "PostgreSQL to PostgreSQL",
              ]}
            />
            <InfoCard
              title="Download a backup zip"
              description="Need an offline copy? Download source data as a compressed file directly from the config screen."
              bullets={[
                "Fast backup when you need to inspect data",
                "Useful before major changes",
              ]}
            />
            <InfoCard
              title="See live migration progress"
              description="Watch job status and logs while data is being copied so you can detect issues early."
              bullets={[
                "Clear status updates",
                "Restart with saved config when needed",
              ]}
            />
            <InfoCard
              title="Supports common developer databases"
              description="Work with MongoDB, PostgreSQL, MySQL, and Redis using one predictable UI."
              bullets={[
                "One workflow across supported engines",
                "No command memorization required",
              ]}
            />
          </div>
        </div>
      </section>

      <section className="border-t border-[#3A2B20] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionTitle title="How it works" />
          <p className="mx-auto mt-5 max-w-3xl text-center text-[#E3D7C8]/80">
            Three steps, no extra noise.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <StepCard
              step="01"
              title="Select Type"
              description="Choose MongoDB, PostgreSQL, MySQL, or Redis."
            />
            <StepCard
              step="02"
              title="Enter Connection Info"
              description="Add source URI, and target URI if you are copying."
            />
            <StepCard
              step="03"
              title="Run Copy or Download"
              description="Start the action and monitor status from the migration view."
            />
          </div>
        </div>
      </section>

      <section className="border-t border-[#3A2B20] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionTitle title="Developer feedback" />
          <p className="mx-auto mt-5 max-w-3xl text-center text-[#E3D7C8]/80">
            Placeholder testimonials in Twitter-style cards. We can replace with
            real posts later.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <TweetCard
              name="Maya Chen"
              handle="@mayacodes"
              time="2d"
              content="We copied MongoDB staging data to a fresh database in minutes. Setup was simple and the live status helped us trust the run."
              replies="12"
              reposts="31"
              likes="148"
            />
            <TweetCard
              name="Ade O."
              handle="@ade_builds"
              time="5d"
              content="The download mode is exactly what we needed before a risky schema change. One click and we had a zip backup."
              replies="8"
              reposts="20"
              likes="92"
            />
            <TweetCard
              name="Nina Patel"
              handle="@ninaoninfra"
              time="1w"
              content="I like that it focuses on the basics: choose type, add URIs, run. No clutter, just a smooth developer workflow."
              replies="16"
              reposts="44"
              likes="205"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

interface IInfoCardProps {
  title: string;
  description: string;
  bullets: string[];
}

function InfoCard({ title, description, bullets }: IInfoCardProps) {
  return (
    <article className="rounded-xl border border-[#3C2B1F] bg-[#1A130D] p-7 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.7)]">
      <div className="h-1.5 w-16 rounded-full bg-[#C98A3D]/80" />
      <h3 className="mt-5 text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[#E3D7C8]/80">
        {description}
      </p>
      <div className="mt-5 space-y-2">
        {bullets.map((bullet) => (
          <div key={bullet} className="flex items-start gap-2 text-sm text-[#EADFCF]">
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
    <article className="rounded-xl border border-[#3C2B1F] bg-[#1A130D] p-7">
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
    <div className="flex items-center justify-center gap-4">
      <span className="h-px w-16 bg-[#5A4331] sm:w-24" />
      <h2 className="text-center text-2xl font-semibold capitalize sm:text-3xl">
        {title}
      </h2>
      <span className="h-px w-16 bg-[#5A4331] sm:w-24" />
    </div>
  );
}

interface ITweetCardProps {
  name: string;
  handle: string;
  time: string;
  content: string;
  replies: string;
  reposts: string;
  likes: string;
}

function TweetCard({
  name,
  handle,
  time,
  content,
  replies,
  reposts,
  likes,
}: ITweetCardProps) {
  const avatarText = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="rounded-2xl border border-[#1E2A36] bg-[#09111A] p-5 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.85)] transition-colors hover:border-[#1D9BF0]/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1D9BF0]/20 text-sm font-semibold text-[#EAF4FC]">
            {avatarText}
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-[#E7EEF5]">
              {name}
              <CheckCircle2 className="h-3.5 w-3.5 fill-[#1D9BF0] text-[#1D9BF0]" />
            </p>
            <p className="text-xs text-[#8B98A5]">
              {handle} · {time}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-[#E7EEF5]">{content}</p>

      <div className="mt-5 flex items-center gap-5 text-[#8B98A5]">
        <div className="flex items-center gap-1.5 text-xs transition-colors hover:text-[#1D9BF0]">
          <MessageCircle className="h-3.5 w-3.5" />
          <span>{replies}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs transition-colors hover:text-[#00BA7C]">
          <Repeat2 className="h-3.5 w-3.5" />
          <span>{reposts}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs transition-colors hover:text-[#F91880]">
          <Heart className="h-3.5 w-3.5" />
          <span>{likes}</span>
        </div>
      </div>
    </article>
  );
}
