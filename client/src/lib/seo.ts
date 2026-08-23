import { GUIDES } from "@/lib/guides";

/**
 * One registry drives every SEO surface: the runtime <Seo> component, the head injected during
 * prerendering, sitemap.xml, and the route manifest the server uses to decide what is a real 404.
 * Adding a route in one place keeps all four in sync.
 */

export const SITE_URL = "https://dbmover.cloud";
export const SITE_NAME = "DB Mover";
export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;
export const OG_IMAGE_ALT =
  "DB Mover — Migrate any database in minutes. No CLI headaches.";
export const TWITTER_HANDLE = "@jc_coder1";

export const DEFAULT_TITLE =
  "DB Mover | Database Migration Without the CLI Maze";
export const DEFAULT_DESCRIPTION =
  "Move or back up MongoDB, PostgreSQL, MySQL, and Redis databases through one simple open-source interface.";

export type SitemapChangeFreq = "daily" | "weekly" | "monthly" | "yearly";

export interface IPageSeo {
  title: string;
  description: string;
  /**
   * Absolute canonical URL. Omitted on the 404 page, which is served at whatever URL was missed —
   * there is no single address for it to claim as canonical.
   */
  canonical?: string;
  indexable: boolean;
  /** Serialised JSON-LD blocks specific to this page. */
  structuredData?: string[];
}

export interface IStaticRoute {
  path: string;
  title: string;
  description: string;
  indexable: boolean;
  priority: number;
  changefreq: SitemapChangeFreq;
  /** ISO date used for sitemap lastmod. Content-derived so rebuilds do not churn the value. */
  lastmod?: string;
}

/** Newest guide date, used as lastmod for the pages that aggregate them. */
export const CONTENT_LAST_MODIFIED: string = GUIDES.reduce(
  (latest, guide) => (guide.updated > latest ? guide.updated : latest),
  "2026-08-14",
);

/**
 * App surfaces are deliberately noindex: they render live job state behind connection strings, so
 * there is nothing stable for a crawler to rank and indexing them would only dilute the site.
 */
const APP_ROUTES: IStaticRoute[] = [
  {
    path: "/select",
    title: "Select Your Database | DB Mover",
    description:
      "Choose MongoDB, PostgreSQL, MySQL, Redis, or Firebase to start a copy or download a backup.",
    indexable: false,
    priority: 0.3,
    changefreq: "monthly",
  },
  {
    path: "/stats",
    title: "Usage Statistics | DB Mover",
    description: "Live anonymous usage statistics for the DB Mover project.",
    indexable: false,
    priority: 0.3,
    changefreq: "daily",
  },
];

const CONTENT_ROUTES: IStaticRoute[] = [
  {
    path: "/",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    indexable: true,
    priority: 1.0,
    changefreq: "weekly",
    lastmod: CONTENT_LAST_MODIFIED,
  },
  {
    path: "/docs",
    title: "Documentation & Guides | DB Mover",
    description:
      "Step-by-step guides for migrating and backing up MongoDB, PostgreSQL, MySQL, Redis, and Firebase databases without the command line.",
    indexable: true,
    priority: 0.9,
    changefreq: "weekly",
    lastmod: CONTENT_LAST_MODIFIED,
  },
  ...GUIDES.map<IStaticRoute>((guide) => ({
    path: `/guides/${guide.slug}`,
    title: guide.title,
    description: guide.description,
    indexable: true,
    priority: 0.8,
    changefreq: "monthly",
    lastmod: guide.updated,
  })),
  {
    path: "/privacy",
    title: "Privacy Policy | DB Mover",
    description:
      "Understand how DB Mover processes database connections in volatile memory, purges temporary backup archives after 24 hours, and ensures zero persistent credential storage.",
    indexable: true,
    priority: 0.5,
    changefreq: "monthly",
    lastmod: "2026-08-23",
  },
];

export const STATIC_ROUTES: IStaticRoute[] = [
  ...CONTENT_ROUTES,
  ...APP_ROUTES,
];

/** Routes rendered to static HTML at build time. Only indexable content is worth prerendering. */
export const PRERENDER_ROUTES: string[] = CONTENT_ROUTES.filter(
  (route) => route.indexable,
).map((route) => route.path);

export const SITEMAP_ROUTES: IStaticRoute[] = CONTENT_ROUTES.filter(
  (route) => route.indexable,
);

/**
 * Path patterns the SPA genuinely handles. Anything outside this list is a real 404 rather than a
 * soft 404 served as the app shell.
 */
export const ROUTE_PATTERNS: string[] = [
  ...STATIC_ROUTES.map((route) => route.path),
  "/config/:dbType",
  "/migration/:jobId",
  "/browser/:dbType",
];

export const absoluteUrl = (path: string): string =>
  path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;

export const NOT_FOUND_SEO: IPageSeo = {
  title: "Page Not Found | DB Mover",
  description:
    "The page you are looking for does not exist. Browse the DB Mover guides or start a database migration.",
  indexable: false,
};

const noindexSeo = (
  title: string,
  description: string,
  path: string,
): IPageSeo => ({
  title,
  description,
  canonical: absoluteUrl(path),
  indexable: false,
});

/**
 * SEO for the non-content app surfaces. Returns undefined for content routes, which set their own
 * head, so the two never fight over the same tags.
 */
export const getAppRouteSeo = (pathname: string): IPageSeo | undefined => {
  const staticSeo = getStaticRouteSeo(pathname);
  if (staticSeo) return staticSeo.indexable ? undefined : staticSeo;

  if (pathname.startsWith("/config/")) {
    return noindexSeo(
      "Configure Your Migration | DB Mover",
      "Paste your source and target connection strings to copy or back up your database.",
      pathname,
    );
  }
  if (pathname.startsWith("/migration/")) {
    return noindexSeo(
      "Migration Progress | DB Mover",
      "Live progress and streaming logs for your running database migration.",
      pathname,
    );
  }
  if (pathname.startsWith("/browser/")) {
    return noindexSeo(
      "Database Browser | DB Mover",
      "Read-only preview of your database contents.",
      pathname,
    );
  }
  return undefined;
};

export const getStaticRouteSeo = (path: string): IPageSeo | undefined => {
  const route = STATIC_ROUTES.find((entry) => entry.path === path);
  if (!route) return undefined;
  return {
    title: route.title,
    description: route.description,
    canonical: absoluteUrl(route.path),
    indexable: route.indexable,
  };
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** JSON-LD is injected as a script body, so only the closing-tag sequence needs neutralising. */
const escapeJsonLd = (value: string): string => value.replace(/</g, "\\u003c");

export const organizationJsonLd = (): string =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon-512.png`,
    sameAs: [
      "https://github.com/JC-Coder/db-mover",
      "https://x.com/jc_coder1",
    ],
  });

export const softwareApplicationJsonLd = (): string =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description: DEFAULT_DESCRIPTION,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web browser",
    softwareVersion: "1.0.0",
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    screenshot: OG_IMAGE_URL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
    },
    featureList: [
      "Copy a database to another server of the same engine",
      "Download a compressed backup archive",
      "Browse database contents read-only",
      "Live streaming migration progress logs",
      "Supports MongoDB, PostgreSQL, MySQL, Redis, and Firebase",
    ],
  });

export const breadcrumbJsonLd = (
  trail: Array<{ name: string; path: string }>,
): string =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  });

export const faqJsonLd = (
  faqs: Array<{ question: string; answer: string }>,
): string =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  });

export const howToJsonLd = (
  name: string,
  description: string,
  steps: string[],
): string =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step,
      text: step,
    })),
  });

/**
 * Builds the full <head> markup for a page, shared by the prerenderer and the runtime <Seo>
 * component. Everything except <title> carries data-seo="managed" so a client-side navigation can
 * clear the previous route's tags without touching the icons and manifest links in index.html.
 */
export const renderHeadTags = (seo: IPageSeo): string => {
  const m = ` data-seo="managed"`;
  const tags: string[] = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta${m} name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta${m} name="robots" content="${
      seo.indexable
        ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        : "noindex, follow"
    }" />`,
    `<meta${m} property="og:type" content="website" />`,
    `<meta${m} property="og:site_name" content="${SITE_NAME}" />`,
    `<meta${m} property="og:locale" content="en_US" />`,
    `<meta${m} property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta${m} property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta${m} property="og:image" content="${OG_IMAGE_URL}" />`,
    `<meta${m} property="og:image:type" content="image/png" />`,
    `<meta${m} property="og:image:width" content="1200" />`,
    `<meta${m} property="og:image:height" content="630" />`,
    `<meta${m} property="og:image:alt" content="${escapeHtml(OG_IMAGE_ALT)}" />`,
    `<meta${m} name="twitter:card" content="summary_large_image" />`,
    `<meta${m} name="twitter:site" content="${TWITTER_HANDLE}" />`,
    `<meta${m} name="twitter:creator" content="${TWITTER_HANDLE}" />`,
    `<meta${m} name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta${m} name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta${m} name="twitter:image" content="${OG_IMAGE_URL}" />`,
    `<meta${m} name="twitter:image:alt" content="${escapeHtml(OG_IMAGE_ALT)}" />`,
  ];

  if (seo.canonical) {
    const href = escapeHtml(seo.canonical);
    tags.push(
      `<link${m} rel="canonical" href="${href}" />`,
      `<meta${m} property="og:url" content="${href}" />`,
      `<meta${m} name="twitter:url" content="${href}" />`,
    );
  }

  for (const block of seo.structuredData ?? []) {
    tags.push(
      `<script${m} type="application/ld+json">${escapeJsonLd(block)}</script>`,
    );
  }

  return tags.join("\n    ");
};
