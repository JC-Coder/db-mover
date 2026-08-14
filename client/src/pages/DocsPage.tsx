import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import { ContentLayout } from "@/components/ContentLayout";
import { Seo } from "@/components/Seo";
import { GUIDES } from "@/lib/guides";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  getStaticRouteSeo,
  organizationJsonLd,
  type IPageSeo,
} from "@/lib/seo";

const DOCS_SEO = getStaticRouteSeo("/docs") as IPageSeo;

const guideListJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "DB Mover guides",
  itemListElement: GUIDES.map((guide, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: guide.h1,
    url: absoluteUrl(`/guides/${guide.slug}`),
  })),
});

export function DocsPage() {
  return (
    <ContentLayout>
      <Seo
        {...DOCS_SEO}
        structuredData={[
          organizationJsonLd(),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Docs", path: "/docs" },
          ]),
          guideListJsonLd,
        ]}
      />

      <div className="mx-auto max-w-4xl px-6 py-16">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-[var(--landing-subtle)]">
            <li>
              <Link
                to="/"
                className="transition-colors hover:text-[var(--landing-text)]"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-[var(--landing-text)]">
              Docs
            </li>
          </ol>
        </nav>

        <p className="inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-[var(--landing-card)] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--landing-accent)]">
          <BookOpen className="h-3.5 w-3.5" />
          Guides
        </p>

        <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
          Database migration guides
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-[var(--landing-muted)]">
          Practical, step-by-step walkthroughs for moving and backing up
          MongoDB, PostgreSQL, MySQL, Redis, and Firebase databases — without
          installing a CLI or memorising flags.
        </p>

        <section className="mt-12" aria-labelledby="all-guides">
          <h2 id="all-guides" className="text-2xl font-semibold">
            All guides
          </h2>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {GUIDES.map((guide) => (
              <li key={guide.slug}>
                <Link
                  to={`/guides/${guide.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-6 transition-colors duration-300 hover:border-[var(--landing-border-strong)]"
                >
                  <span className="text-xs font-semibold uppercase tracking-widest text-[var(--landing-accent)]">
                    {guide.engineLabel}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold leading-snug">
                    {guide.h1}
                  </h3>
                  <p className="mt-3 flex-1 text-sm text-[var(--landing-muted)]">
                    {guide.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--landing-accent)]">
                    Read the guide
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="mt-16 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-8 text-center"
          aria-labelledby="docs-cta"
        >
          <h2 id="docs-cta" className="text-2xl font-semibold">
            Ready to move a database?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--landing-muted)]">
            Pick your engine, paste two connection strings, and watch it run.
            Free and open source.
          </p>
          <Link
            to="/select"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--landing-accent)] px-6 py-3 text-sm font-semibold text-[var(--landing-accent-text)] transition-colors hover:bg-[var(--landing-accent-hover)]"
          >
            Start a migration
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </ContentLayout>
  );
}
