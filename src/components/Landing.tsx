import { ChevronDown, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import content from '../seo/content.json';

/** Crawlable content shown under the calculator. Copy lives in src/seo/content.json (shared with the build-time head/fallback). */
export function LandingIntro() {
  const c = content;
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">{c.h1}</h1>
      <p className="text-gray-600 leading-relaxed">{c.lead}</p>
      <img src="/hero.svg" alt={c.heroAlt} width={640} height={400} className="w-full max-w-md mx-auto rounded-2xl" fetchPriority="high" />
    </>
  );
}

export function LandingSections() {
  const c = content;
  return (
    <div className="space-y-10 pt-4">
      {c.sections.map((s) => (
        <section key={s.id} id={s.id} className="scroll-mt-4">
          <h2 className="text-xl font-bold mb-3">{s.h2}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {s.items.map((i) => (
              <li key={i.t} className="bg-white border border-gray-100 rounded-xl p-4">
                <h3 className="font-semibold">{i.t}</h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{i.d}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-center text-sm">
        <Link to="/CareDirectory" className="text-blue-600 font-medium hover:underline">瀏覽桃園長照機構名冊 →</Link>
      </p>
      <section id="faq" className="scroll-mt-4">
        <h2 className="text-xl font-bold mb-3">{c.faqTitle}</h2>
        <div className="space-y-2">
          {c.faq.map((f) => (
            <details key={f.q} className="group bg-white border border-gray-100 rounded-xl p-4">
              <summary className="flex items-center justify-between cursor-pointer font-medium">{f.q}<ChevronDown size={16} className="transition group-open:rotate-180" /></summary>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
      <section id="resources" className="scroll-mt-4 pb-10">
        <h2 className="text-xl font-bold mb-3">{c.refsTitle}</h2>
        <ul className="space-y-2 text-sm">
          {[...c.refs, ...c.related].map((r) => (
            <li key={r.href}>
              <a href={r.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">{r.label}<ExternalLink size={13} /></a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
