/**
 * Renders every indexable route to static HTML after the client and SSR builds have run.
 *
 * Why this exists: the app is a client-rendered SPA, so without prerendering the shipped HTML is an
 * empty <div id="root">. Googlebot eventually renders JS, but Bing and the LLM crawlers do not, and
 * the content would be invisible to them. This uses Vite's built-in SSR build plus react-dom/server
 * — no extra dependencies, no headless browser.
 *
 * Also emits sitemap.xml and route-manifest.json (the server reads the manifest to distinguish a
 * real 404 from a route the SPA handles).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const SSR_ENTRY = join(ROOT, "dist-ssr", "entry-server.js");

const SEO_BLOCK = /<!--seo-->[\s\S]*?<!--\/seo-->/;
const APP_PLACEHOLDER = "<!--app-html-->";

const {
  render,
  PRERENDER_ROUTES,
  ROUTE_PATTERNS,
  SITEMAP_ROUTES,
  SITE_URL,
} = await import(SSR_ENTRY);

const template = await readFile(join(DIST, "index.html"), "utf8");

if (!SEO_BLOCK.test(template)) {
  throw new Error("index.html is missing the <!--seo--> block the prerenderer replaces.");
}
if (!template.includes(APP_PLACEHOLDER)) {
  throw new Error(`index.html is missing the ${APP_PLACEHOLDER} placeholder.`);
}

const outputPath = (route) =>
  route === "/" ? join(DIST, "index.html") : join(DIST, route, "index.html");

for (const route of PRERENDER_ROUTES) {
  const { html, head } = render(route);

  if (!head) throw new Error(`Route ${route} rendered without any SEO head tags.`);
  if (!html.trim()) throw new Error(`Route ${route} rendered empty markup.`);

  const page = template
    .replace(SEO_BLOCK, head)
    .replace(APP_PLACEHOLDER, html);

  const target = outputPath(route);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, page, "utf8");
  console.log(`prerendered ${route} -> ${target.replace(DIST, "dist")}`);
}

/*
 * Static 404 body, served by the server with a real 404 status. Rendering an unmatched path hits
 * the SPA catch-all route, which is the NotFoundPage.
 */
const notFound = render("/__not-found__");
await writeFile(
  join(DIST, "404.html"),
  template
    .replace(SEO_BLOCK, notFound.head)
    .replace(APP_PLACEHOLDER, notFound.html),
  "utf8",
);
console.log("wrote dist/404.html");

/*
 * The SPA fallback for app routes (/select, /config/*, ...). It keeps the empty root div and a
 * noindex default, so a crawler that reaches an app URL without running JS never sees the home
 * page's canonical and title duplicated onto it.
 */
const appShell = template
  .replace(
    SEO_BLOCK,
    [
      "<title>DB Mover</title>",
      '<meta data-seo="managed" name="robots" content="noindex, follow" />',
    ].join("\n    "),
  )
  .replace(APP_PLACEHOLDER, "");
await writeFile(join(DIST, "app-shell.html"), appShell, "utf8");
console.log("wrote dist/app-shell.html");

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...SITEMAP_ROUTES.map((route) => {
    const loc = route.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${route.path}`;
    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      route.lastmod ? `    <lastmod>${route.lastmod}</lastmod>` : null,
      `    <changefreq>${route.changefreq}</changefreq>`,
      `    <priority>${route.priority.toFixed(1)}</priority>`,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n");
  }),
  "</urlset>",
  "",
].join("\n");
await writeFile(join(DIST, "sitemap.xml"), sitemap, "utf8");
console.log(`wrote dist/sitemap.xml (${SITEMAP_ROUTES.length} urls)`);

await writeFile(
  join(DIST, "route-manifest.json"),
  `${JSON.stringify({ routes: ROUTE_PATTERNS }, null, 2)}\n`,
  "utf8",
);
console.log(`wrote dist/route-manifest.json (${ROUTE_PATTERNS.length} patterns)`);
