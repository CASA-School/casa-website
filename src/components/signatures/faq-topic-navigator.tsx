'use client';

import { useMemo, useState } from 'react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export type FaqNavigatorItem = {
  id: string;
  topic: string;
  question: string;
  answer: string;
};

type FaqTopicNavigatorProps = {
  title: string;
  description: string;
  topics: string[];
  items: FaqNavigatorItem[];
  searchPlaceholder: string;
};

export function FaqTopicNavigator({ title, description, topics, items, searchPlaceholder }: FaqTopicNavigatorProps) {
  const allTopic = topics[0] || 'All';
  const [activeTopic, setActiveTopic] = useState(allTopic);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const base = activeTopic === allTopic ? items : items.filter((item) => item.topic === activeTopic);
    if (!query.trim()) {
      return base;
    }

    const normalized = query.trim().toLowerCase();
    return base.filter(
      (item) => item.question.toLowerCase().includes(normalized) || item.answer.toLowerCase().includes(normalized)
    );
  }, [activeTopic, allTopic, items, query]);

  return (
    <section className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-7">
      <h2 className="mt-2 text-3xl font-bold text-[var(--casa-ink)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--casa-muted)] md:text-base">{description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {topics.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => setActiveTopic(topic)}
            className={
              activeTopic === topic
                ? 'rounded-full border border-[color:var(--casa-blue)] bg-[var(--casa-blue)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--casa-ink)]'
                : 'rounded-full border border-[color:var(--casa-sand)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--casa-muted)] hover:bg-[var(--casa-warm-soft)]'
            }
          >
            {topic}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="sr-only">{searchPlaceholder}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] px-3 text-sm text-[var(--casa-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--casa-blue)]"
        />
      </label>

      <Accordion type="single" collapsible className="mt-4">
        {filtered.map((item) => (
          <AccordionItem key={item.id} value={item.id} className="border-[color:var(--casa-sand)]">
            <AccordionTrigger className="text-sm font-semibold text-[var(--casa-ink)] md:text-base">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-[var(--casa-muted)]">{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
