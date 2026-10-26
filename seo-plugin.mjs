// Vite plugin: build-time SEO / GEO / AEO for a single-page app.
// - fills <head> (title, description, canonical, Open Graph, Twitter, JSON-LD) from src/seo/content.json
// - injects crawlable fallback HTML into #root (React replaces it on mount)
// - emits robots.txt, sitemap.xml and llms.txt
// Site URL: VITE_SITE_URL, else Vercel's stable production domain, else `fallbackUrl`.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c')

export function resolveSiteUrl(fallbackUrl) {
  const env = process.env.VITE_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  const url = env ? (/^https?:/.test(env) ? env : 'https://' + env) : fallbackUrl
  return url.replace(/\/$/, '')
}

export function buildHead(c, site) {
  const url = site + '/'
  const image = site + '/og.png'
  const graph = [
    { '@type': 'WebSite', '@id': site + '/#website', url, name: c.name, inLanguage: c.lang, description: c.description },
    {
      '@type': 'WebApplication', '@id': site + '/#app', name: c.name, url, description: c.description,
      applicationCategory: c.category, operatingSystem: 'Any', browserRequirements: 'Requires JavaScript',
      inLanguage: c.lang, image,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'TWD' },
      ...(c.areaServed ? { audience: { '@type': 'Audience', audienceType: c.audience }, areaServed: { '@type': 'AdministrativeArea', name: c.areaServed } } : {}),
    },
    {
      '@type': 'WebPage', '@id': url + '#webpage', url, name: c.title, description: c.description, inLanguage: c.lang,
      isPartOf: { '@id': site + '/#website' }, primaryImageOfPage: { '@type': 'ImageObject', url: image },
    },
    {
      '@type': 'FAQPage', '@id': url + '#faq',
      mainEntity: c.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ]
  return `
    <title>${esc(c.title)}</title>
    <meta name="description" content="${esc(c.description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <meta name="theme-color" content="${esc(c.themeColor)}" />
    <link rel="canonical" href="${esc(url)}" />
    <link rel="alternate" hreflang="${esc(c.lang)}" href="${esc(url)}" />
    <link rel="alternate" hreflang="x-default" href="${esc(url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(c.name)}" />
    <meta property="og:locale" content="${esc(c.locale)}" />
    <meta property="og:title" content="${esc(c.title)}" />
    <meta property="og:description" content="${esc(c.description)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(c.heroAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(c.title)}" />
    <meta name="twitter:description" content="${esc(c.description)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    <script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': graph })}</script>`
}

export function buildFallback(c) {
  const sections = c.sections
    .map((s) => `<section id="${esc(s.id)}"><h2>${esc(s.h2)}</h2><ul>${s.items.map((i) => `<li><strong>${esc(i.t)}</strong> — ${esc(i.d)}</li>`).join('')}</ul></section>`)
    .join('')
  const faq = c.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')
  const refs = c.refs.map((r) => `<li><a href="${esc(r.href)}" target="_blank" rel="noopener noreferrer">${esc(r.label)}</a></li>`).join('')
  const related = (c.related || []).map((r) => `<li><a href="${esc(r.href)}" target="_blank" rel="noopener">${esc(r.label)}</a></li>`).join('')
  return `<main id="seo-fallback" style="max-width:760px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.6">
<nav aria-label="Page sections"><a href="/#features">${esc(c.nav.features)}</a> · <a href="/#faq">${esc(c.nav.faq)}</a> · <a href="/#resources">${esc(c.nav.resources)}</a></nav>
<h1>${esc(c.h1)}</h1><p>${esc(c.lead)}</p>
<img src="/hero.svg" alt="${esc(c.heroAlt)}" width="640" height="400" />
${sections}
<section id="faq"><h2>${esc(c.faqTitle)}</h2>${faq}</section>
<section id="resources"><h2>${esc(c.refsTitle)}</h2><ul>${refs}${related}</ul></section>
</main>`
}

export default function seoPlugin({ contentPath = 'src/seo/content.json', fallbackUrl, lastmod } = {}) {
  let content, site
  const load = () => {
    content = JSON.parse(readFileSync(resolve(process.cwd(), contentPath), 'utf8'))
    site = resolveSiteUrl(fallbackUrl)
  }
  return {
    name: 'seo-plugin',
    configResolved: load,
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        load()
        return html
          .replace('<!--SEO_HEAD-->', buildHead(content, site))
          .replace('<!--SEO_ROOT-->', buildFallback(content))
          .replace(/<html lang="[^"]*"/, `<html lang="${content.lang}"`)
      },
    },
    generateBundle() {
      load()
      const day = lastmod || new Date().toISOString().slice(0, 10)
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: ChatGPT-User\nAllow: /\nUser-agent: Claude-SearchBot\nAllow: /\nUser-agent: Claude-User\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n` })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${(content.pages || [{ path: '/', priority: 1 }]).map((pg) => `  <url><loc>${site}${pg.path}</loc><lastmod>${day}</lastmod><changefreq>monthly</changefreq><priority>${pg.priority ?? 0.7}</priority></url>`).join('\n')}\n</urlset>\n` })
      const llms = [`# ${content.name}`, '', `> ${content.description}`, '', '## Key facts', ...content.sections.flatMap((s) => s.items.map((i) => `- ${i.t}: ${i.d}`)), '', '## FAQ', ...content.faq.map((f) => `- ${f.q} ${f.a}`), '', '## Links', `- [Home](${site}/)`, ...content.refs.map((r) => `- [${r.label}](${r.href})`), ''].join('\n')
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llms })
    },
  }
}
