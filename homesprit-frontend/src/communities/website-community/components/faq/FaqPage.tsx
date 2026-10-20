'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Search, SearchX } from 'lucide-react';
import { cn } from '@/helpers/utils/utils';
import { StateCard } from '../propertylist/StateCard';
import { FAQ_CATEGORY_LABELS, FAQ_ITEMS, type FaqCategory } from './faq.data';

const CATEGORIES = Object.entries(FAQ_CATEGORY_LABELS) as [FaqCategory, string][];

/**
 * `/faq` — questions grouped by topic, filterable by topic and by text.
 *
 * Each answer is a native `<details>`: keyboard and screen-reader behaviour
 * come from the browser, and the text is in the HTML for search engines (and
 * for find-in-page) even while collapsed.
 */
export function FaqPage() {
  const [category, setCategory] = useState<FaqCategory | 'all'>('all');
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return FAQ_ITEMS.filter(
      (item) =>
        (category === 'all' || item.category === category) &&
        (!needle || `${item.question} ${item.answer}`.toLowerCase().includes(needle))
    );
  }, [category, query]);

  const groups = CATEGORIES.map(([key, label]) => ({
    key,
    label,
    items: items.filter((item) => item.category === key),
  })).filter((group) => group.items.length > 0);

  const chip = (value: FaqCategory | 'all', label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={category === value}
      onClick={() => setCategory(value)}
      className={cn(
        'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
        category === value
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-ink/15 bg-white text-ink-body hover:border-ink/30 dark:border-white/15 dark:bg-ink-soft dark:text-slate-300'
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="container-page py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Help</p>
        <h1 className="mt-2 text-4xl font-extrabold text-ink dark:text-white">Questions &amp; answers</h1>
        <p className="mt-4 text-lg text-ink-body dark:text-slate-300">
          How searching, viewing, renting and listing work at Homesprit.
        </p>

        <div className="mt-8 space-y-4">
          <label className="relative block">
            <span className="sr-only">Search the questions</span>
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              className="field-input rounded-full py-3 pl-11"
              placeholder="Search the questions…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {/* Scrolls sideways on a phone rather than wrapping into a wall of chips. */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Topic">
            {chip('all', 'All topics')}
            {CATEGORIES.map(([value, label]) => chip(value, label))}
          </div>
        </div>

        <div className="mt-10 space-y-10" aria-live="polite">
          {groups.length === 0 ? (
            <StateCard
              icon={<SearchX size={28} aria-hidden="true" />}
              title="No question matches that"
              body="Try another word, or ask us directly — we answer within one working day."
              action={
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setQuery('');
                    setCategory('all');
                  }}
                >
                  Show every question
                </button>
              }
            />
          ) : (
            groups.map((group) => (
              <section key={group.key} aria-labelledby={`faq-${group.key}`}>
                <h2 id={`faq-${group.key}`} className="mb-4 text-xl font-bold text-ink dark:text-white">
                  {group.label}
                </h2>
                <div className="surface divide-y divide-ink/[0.07] overflow-hidden dark:divide-white/[0.08]">
                  {group.items.map((item) => (
                    <details key={item.id} id={item.id} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink hover:bg-sand/60 dark:text-white dark:hover:bg-white/[0.03] md:px-6 [&::-webkit-details-marker]:hidden">
                        {item.question}
                        <ChevronDown
                          size={18}
                          aria-hidden="true"
                          className="shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
                        />
                      </summary>
                      <p className="px-5 pb-5 leading-relaxed text-ink-body dark:text-slate-300 md:px-6">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <div className="surface mt-12 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
          <div>
            <h2 className="text-lg font-bold text-ink dark:text-white">Still have a question?</h2>
            <p className="mt-1 text-ink-muted dark:text-slate-400">An agent will get back to you within one working day.</p>
          </div>
          <Link href="/contact" className="btn-primary shrink-0">
            Talk to an agent
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
