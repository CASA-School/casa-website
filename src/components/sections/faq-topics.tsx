'use client';

import { useMemo, useState } from 'react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export type FaqTopicItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

type FAQTopicsProps = {
  title: string;
  description: string;
  topics: string[];
  items: FaqTopicItem[];
  className?: string;
};

export function FAQTopics({ title, description, topics, items, className }: FAQTopicsProps) {
  const availableTopics = useMemo(() => {
    const set = new Set(items.map((item) => item.category));
    const ordered = topics.filter((topic) => set.has(topic));
    const rest = Array.from(set).filter((topic) => !ordered.includes(topic));
    return [...ordered, ...rest];
  }, [items, topics]);

  const [activeTopic, setActiveTopic] = useState<string>(availableTopics[0] ?? '');

  const filtered = useMemo(() => {
    if (!activeTopic) {
      return items;
    }

    return items.filter((item) => item.category === activeTopic);
  }, [activeTopic, items]);

  return (
    <section className={cn('rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-7', className)}>
      <h2 className="text-3xl font-bold text-[var(--casa-ink)]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)] md:text-base">{description}</p>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="FAQ topics">
        {availableTopics.map((topic) => (
          <button
            key={topic}
            type="button"
            role="tab"
            aria-selected={activeTopic === topic}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--casa-blue)]',
              activeTopic === topic
                ? 'border-[color:var(--casa-blue)] bg-[var(--casa-blue)]/10 text-[var(--casa-ink)]'
                : 'border-[color:var(--casa-sand)] bg-white text-[var(--casa-muted)] hover:bg-[var(--casa-warm-soft)]'
            )}
            onClick={() => setActiveTopic(topic)}
          >
            {topic}
          </button>
        ))}
      </div>

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
