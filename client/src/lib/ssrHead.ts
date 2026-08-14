import type { IPageSeo } from "@/lib/seo";

/**
 * Collects the SEO a page declared during a server render. renderToString is synchronous and
 * single-threaded, so a module-level slot is safe here and it guarantees the prerendered <head>
 * is exactly what the <Seo> component would have produced in the browser.
 */
let collected: IPageSeo | undefined;

export const collectSsrSeo = (seo: IPageSeo): void => {
  collected = seo;
};

export const takeSsrSeo = (): IPageSeo | undefined => {
  const value = collected;
  collected = undefined;
  return value;
};
