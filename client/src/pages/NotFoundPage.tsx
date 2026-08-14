import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ContentLayout } from "@/components/ContentLayout";
import { Seo } from "@/components/Seo";
import { GUIDES } from "@/lib/guides";
import { NOT_FOUND_SEO } from "@/lib/seo";

export function NotFoundPage() {
  return (
    <ContentLayout>
      <Seo {...NOT_FOUND_SEO} />

      <div className="mx-auto max-w-3xl px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--landing-accent)]">
          404
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
          That page doesn&apos;t exist
        </h1>
        <p className="mt-5 text-lg text-[var(--landing-muted)]">
          The link may be out of date. Start a migration, or pick up one of the
          guides below.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/select"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--landing-accent)] px-6 py-3 text-sm font-semibold text-[var(--landing-accent-text)] transition-colors hover:bg-[var(--landing-accent-hover)]"
          >
            Start a migration
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] px-6 py-3 text-sm font-semibold transition-colors hover:border-[var(--landing-border-strong)]"
          >
            Browse the docs
          </Link>
        </div>

        <section className="mt-14" aria-labelledby="popular-guides">
          <h2 id="popular-guides" className="text-xl font-semibold">
            Popular guides
          </h2>
          <ul className="mt-5 space-y-3">
            {GUIDES.slice(0, 4).map((guide) => (
              <li key={guide.slug}>
                <Link
                  to={`/guides/${guide.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] px-6 py-4 transition-colors hover:border-[var(--landing-border-strong)]"
                >
                  <span className="font-medium">{guide.h1}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--landing-accent)] transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ContentLayout>
  );
}
