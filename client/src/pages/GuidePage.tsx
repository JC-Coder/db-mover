import { Link, useParams } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { ContentLayout } from "@/components/ContentLayout";
import { Seo } from "@/components/Seo";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { GUIDES, getGuideBySlug, type IGuide } from "@/lib/guides";
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  OG_IMAGE_URL,
} from "@/lib/seo";

const articleJsonLd = (guide: IGuide): string =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: guide.h1,
    description: guide.description,
    image: OG_IMAGE_URL,
    datePublished: guide.updated,
    dateModified: guide.updated,
    mainEntityOfPage: absoluteUrl(`/guides/${guide.slug}`),
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon-512.png`,
      },
    },
  });

export function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const guide = getGuideBySlug(slug);

  if (!guide) return <NotFoundPage />;

  const steps = guide.sections.flatMap((section) => section.steps ?? []);
  const structuredData = [
    articleJsonLd(guide),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Docs", path: "/docs" },
      { name: guide.engineLabel, path: `/guides/${guide.slug}` },
    ]),
    faqJsonLd(guide.faqs),
  ];
  if (steps.length > 0) {
    structuredData.push(howToJsonLd(guide.h1, guide.description, steps));
  }

  const related = GUIDES.filter((entry) => entry.slug !== guide.slug).slice(0, 3);

  return (
    <ContentLayout>
      <Seo
        title={guide.title}
        description={guide.description}
        canonical={absoluteUrl(`/guides/${guide.slug}`)}
        indexable
        structuredData={structuredData}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--landing-subtle)]">
            <li>
              <Link
                to="/"
                className="transition-colors hover:text-[var(--landing-text)]"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                to="/docs"
                className="transition-colors hover:text-[var(--landing-text)]"
              >
                Docs
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-[var(--landing-text)]">
              {guide.engineLabel}
            </li>
          </ol>
        </nav>

        <article>
          <header>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              {guide.h1}
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--landing-subtle)]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {guide.readMinutes} min read
              </span>
              <span>
                Updated{" "}
                <time dateTime={guide.updated}>
                  {new Date(`${guide.updated}T00:00:00Z`).toLocaleDateString(
                    "en-US",
                    { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" },
                  )}
                </time>
              </span>
            </p>
            <p className="mt-6 text-lg leading-relaxed text-[var(--landing-muted)]">
              {guide.intro}
            </p>
          </header>

          {guide.sections.map((section) => (
            <section key={section.heading} className="mt-12">
              <h2 className="text-2xl font-semibold">{section.heading}</h2>

              {section.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-4 leading-relaxed text-[var(--landing-muted)]"
                >
                  {paragraph}
                </p>
              ))}

              {section.steps && (
                <ol className="mt-6 space-y-3">
                  {section.steps.map((step, index) => (
                    <li key={step} className="flex gap-4">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--landing-accent)] text-xs font-bold text-[var(--landing-accent-text)]">
                        {index + 1}
                      </span>
                      <span className="text-[var(--landing-muted)]">{step}</span>
                    </li>
                  ))}
                </ol>
              )}

              {section.code && (
                <figure className="mt-6">
                  <figcaption className="text-sm text-[var(--landing-subtle)]">
                    {section.code.label}
                  </figcaption>
                  <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--landing-border)] bg-[var(--landing-card)] p-4 text-sm">
                    <code className="font-mono text-[var(--landing-code)]">
                      {section.code.value}
                    </code>
                  </pre>
                </figure>
              )}
            </section>
          ))}

          <section className="mt-12" aria-labelledby="faq">
            <h2 id="faq" className="text-2xl font-semibold">
              Frequently asked questions
            </h2>
            <dl className="mt-6 space-y-6">
              {guide.faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-6"
                >
                  <dt className="font-semibold">{faq.question}</dt>
                  <dd className="mt-2 text-[var(--landing-muted)]">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </article>

        <section
          className="mt-14 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-8 text-center"
          aria-labelledby="guide-cta"
        >
          <h2 id="guide-cta" className="text-2xl font-semibold">
            {guide.ctaHeading ?? `Try it with your own ${guide.engineLabel} database`}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[var(--landing-muted)]">
            Free, open source, and nothing to install.
          </p>
          <Link
            to={guide.engineId ? `/config/${guide.engineId}` : "/select"}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--landing-accent)] px-6 py-3 text-sm font-semibold text-[var(--landing-accent-text)] transition-colors hover:bg-[var(--landing-accent-hover)]"
          >
            Open DB Mover
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="mt-14" aria-labelledby="related">
          <h2 id="related" className="text-2xl font-semibold">
            Related guides
          </h2>
          <ul className="mt-6 space-y-3">
            {related.map((entry) => (
              <li key={entry.slug}>
                <Link
                  to={`/guides/${entry.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] px-6 py-4 transition-colors hover:border-[var(--landing-border-strong)]"
                >
                  <span className="font-medium">{entry.h1}</span>
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
