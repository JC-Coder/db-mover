import { useEffect } from "react";
import { renderHeadTags, type IPageSeo } from "@/lib/seo";
import { collectSsrSeo } from "@/lib/ssrHead";

const IS_SERVER = typeof document === "undefined";

/**
 * Keeps <head> in sync on client-side navigation. Prerendered pages already ship the correct tags;
 * this replaces them on route change so a SPA transition does not leave the previous page's title,
 * canonical, or structured data behind.
 *
 * It reuses `renderHeadTags` rather than building DOM nodes by hand so the prerendered head and the
 * client-side head can never drift apart.
 */
export function Seo(props: IPageSeo) {
  const { title, description, canonical, indexable, structuredData } = props;
  const structuredDataKey = (structuredData ?? []).join("");

  // During prerendering there is no effect phase, so the head is handed to the renderer here.
  if (IS_SERVER) collectSsrSeo(props);

  useEffect(() => {
    const seo: IPageSeo = {
      title,
      description,
      canonical,
      indexable,
      structuredData,
    };

    document.head
      .querySelectorAll('[data-seo="managed"]')
      .forEach((node) => node.remove());

    const template = document.createElement("template");
    template.innerHTML = renderHeadTags(seo);

    const titleNode = template.content.querySelector("title");
    if (titleNode) {
      document.title = titleNode.textContent ?? title;
      titleNode.remove();
    }

    document.head.append(template.content);
    // Keyed on `structuredDataKey` rather than the `structuredData` array itself: callers rebuild
    // that array on every render, so an identity comparison would rewrite the whole head each time.
  }, [title, description, canonical, indexable, structuredDataKey]);

  return null;
}
