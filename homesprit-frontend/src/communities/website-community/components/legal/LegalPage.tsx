'use client';

import Link from 'next/link';
import { formatDate } from '@/helpers/utils/format';
import type { LegalDocument } from './legal.data';

/**
 * A legal document — `/privacy` and `/terms` share it. The contents list is a
 * sticky sidebar from `lg`, and an inline list above the text on smaller
 * screens; every heading carries an id, so a section can be linked to.
 */
export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <div className="container-page py-12 md:py-16">
      <header className="max-w-3xl">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-2 text-4xl font-extrabold text-ink dark:text-white">{document.title}</h1>
        {/* Noon, not midnight: a bare date parses as UTC midnight and would print the day before west of Greenwich. */}
        <p className="mt-3 text-sm text-ink-muted dark:text-slate-400">
          Last updated <time dateTime={document.updated}>{formatDate(`${document.updated}T12:00:00`)}</time>
        </p>
        <p className="mt-6 text-lg leading-relaxed text-ink-body dark:text-slate-300">{document.intro}</p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
            On this page
          </p>
          <ol className="flex flex-wrap gap-2 lg:block lg:space-y-1">
            {document.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-full border border-ink/10 px-3 py-1.5 text-sm font-medium text-ink-body hover:border-ink/25 hover:text-ink dark:border-white/10 dark:text-slate-300 dark:hover:text-white lg:rounded-lg lg:border-0 lg:px-3 lg:py-1.5 lg:hover:bg-ink/5 dark:lg:hover:bg-white/10"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="surface max-w-3xl space-y-10 p-6 md:p-10">
          {document.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24" aria-labelledby={`${section.id}-heading`}>
              <h2 id={`${section.id}-heading`} className="text-xl font-bold text-ink dark:text-white">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 leading-relaxed text-ink-body dark:text-slate-300">
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-ink-body marker:text-brand-600 dark:text-slate-300">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <p className="border-t border-ink/[0.07] pt-6 text-sm text-ink-muted dark:border-white/[0.08] dark:text-slate-400">
            Something unclear? <Link href="/contact" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">Get in touch</Link> and we will explain.
          </p>
        </article>
      </div>
    </div>
  );
}
