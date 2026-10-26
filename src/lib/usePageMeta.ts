import { useEffect } from 'react';

interface PageMeta { title: string; description: string; path: string; noindex?: boolean }

function setMeta(selector: string, attr: string, value: string, create: () => HTMLElement) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) { el = create(); document.head.appendChild(el); }
  el.setAttribute(attr, value);
}

/** Keeps title/description/canonical/robots correct per route (the static HTML only describes "/"). */
export function usePageMeta({ title, description, path, noindex = false }: PageMeta) {
  useEffect(() => {
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const origin = canonical ? new URL(canonical.href).origin : window.location.origin;
    const url = origin + path;
    document.title = title;
    const meta = (name: string, content: string, prop = false) =>
      setMeta(`meta[${prop ? 'property' : 'name'}="${name}"]`, 'content', content, () => {
        const m = document.createElement('meta'); m.setAttribute(prop ? 'property' : 'name', name); return m;
      });
    meta('description', description);
    meta('robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');
    meta('og:title', title, true);
    meta('og:description', description, true);
    meta('og:url', url, true);
    meta('twitter:title', title);
    meta('twitter:description', description);
    setMeta('link[rel="canonical"]', 'href', url, () => { const l = document.createElement('link'); l.rel = 'canonical'; return l; });
  }, [title, description, path, noindex]);
}
