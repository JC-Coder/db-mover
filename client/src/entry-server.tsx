import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import App from "./App";
import { renderHeadTags } from "./lib/seo";
import { takeSsrSeo } from "./lib/ssrHead";

export interface IRenderResult {
  html: string;
  head: string;
}

/** Renders a route to static markup plus its <head>. Consumed by scripts/prerender.mjs. */
export function render(url: string): IRenderResult {
  takeSsrSeo();

  const html = renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  );

  const seo = takeSsrSeo();
  return { html, head: seo ? renderHeadTags(seo) : "" };
}

export { PRERENDER_ROUTES, ROUTE_PATTERNS, SITEMAP_ROUTES, SITE_URL } from "./lib/seo";
