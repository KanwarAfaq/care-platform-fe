// On-page SEO audit of the built page (run after `npm run build`): node scripts/onpage-audit.mjs [--strict]
// Checks: keyword in title / first paragraph / an H2 / image alt; internal + external links; JSON-LD validity.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const strict = process.argv.includes('--strict')
const c = JSON.parse(readFileSync(resolve(process.cwd(), 'src/seo/content.json'), 'utf8'))
const html = readFileSync(resolve(process.cwd(), 'dist/index.html'), 'utf8')
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
const kw = c.keyword.toLowerCase()
const has = (t) => strip(t).toLowerCase().includes(kw)
const fails = []
const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ''
const body = (html.match(/<body[\s\S]*<\/body>/) || [html])[0]
if (!has(title)) fails.push('title')
if (!has((body.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1] || '')) fails.push('first paragraph')
if (![...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].some((m) => has(m[1]))) fails.push('h2')
if (![...body.matchAll(/<img[^>]*\salt="([^"]*)"/g)].some((m) => has(m[1]))) fails.push('image alt')
const hrefs = [...body.matchAll(/<a[^>]*\shref="([^"]+)"/g)].map((m) => m[1])
if (!hrefs.some((h) => h.startsWith('/'))) fails.push('internal links')
if (!hrefs.some((h) => /^https?:\/\//.test(h))) fails.push('external links')

const abs = (u) => typeof u === 'string' && /^https?:\/\//.test(u)
const errs = []
function validate(n, where) {
  if (Array.isArray(n)) return n.forEach((x) => validate(x, where))
  if (!n || typeof n !== 'object') return
  const t = n['@type']
  for (const [k, v] of Object.entries(n)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) errs.push(`${where}: empty ${k}`)
    if (/^(url|image|logo|item|@id|contentUrl)$/.test(k) && typeof v === 'string' && !abs(v)) errs.push(`${where}: relative ${k} ${v}`)
    if (v && typeof v === 'object') validate(v, where)
  }
  const need = (...ks) => ks.forEach((k) => { if (!n[k]) errs.push(`${where}: ${t} missing ${k}`) })
  if (t === 'WebSite' || t === 'WebPage') need('name', 'url')
  if (t === 'WebApplication') need('name', 'applicationCategory', 'operatingSystem', 'offers')
  if (t === 'Offer') need('price', 'priceCurrency')
  if (t === 'FAQPage' && !(n.mainEntity || []).every((q) => q['@type'] === 'Question' && q.name && q.acceptedAnswer?.text)) errs.push(`${where}: FAQPage incomplete`)
}
const blocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)]
if (!blocks.length) errs.push('no JSON-LD')
for (const m of blocks) {
  try { const d = JSON.parse(m[1]); if (d['@context'] !== 'https://schema.org') errs.push('bad @context'); validate(d, 'jsonld') } catch { errs.push('invalid JSON-LD') }
}
if (errs.length) fails.push('schema: ' + errs.slice(0, 3).join('; '))
for (const m of html.matchAll(/(?:href|src|content)="(\/[^"]*)"/g)) if (/og\.png|hero\.svg|favicon/.test(m[1]) && m[0].includes('content=')) fails.push('relative og url ' + m[1])
console.log(`On-page audit (${c.name}, keyword "${c.keyword}")`)
console.log(fails.length ? 'FAIL: ' + fails.join(' | ') : 'all checks pass')
if (strict && fails.length) process.exit(1)
