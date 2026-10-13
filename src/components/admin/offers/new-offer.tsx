'use client';

import { useEffect, useRef, useState } from 'react';

import { createOfferAction, findRecipientsAction } from '@/app/(admin)/admin/(editor)/offers/actions';
import type { RecipientResult } from '@/lib/admin/offers/repo';

import { OfferFrame } from './frame';
import ui from './offers.module.css';

type Choice = {
  key: string;
  mark: string;
  title: string;
  detail: string;
  fields: Record<string, string>;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '+';

function choicesFor(results: RecipientResult[], q: string): { head: string; items: Choice[] }[] {
  const enquiries = results.filter((r) => r.type === 'enquiry');
  const orgs = results.filter((r) => r.type === 'organisation');
  const students = results.filter((r) => r.type === 'student');
  const groups: { head: string; items: Choice[] }[] = [];
  if (enquiries.length)
    groups.push({
      head: q ? 'Enquiries' : 'Enquiries waiting for an offer',
      items: enquiries.map((r) => ({
        key: `e:${r.id}`,
        mark: initials(r.name),
        title: r.name,
        detail: r.detail,
        fields: { kind: r.kind === 'group' ? 'group' : 'individual', enquiryId: r.id, language: r.language },
      })),
    });
  if (orgs.length)
    groups.push({
      head: q ? 'Organisations' : 'Recent recipients',
      items: orgs.map((r) => ({
        key: `o:${r.id}`,
        mark: initials(r.name),
        title: r.name,
        detail: r.detail,
        fields: { kind: 'group', organisationId: r.id, language: r.language },
      })),
    });
  if (students.length)
    groups.push({
      head: 'Students',
      items: students.map((r) => ({
        key: `s:${r.id}`,
        mark: initials(r.name),
        title: r.name,
        detail: r.detail,
        fields: { kind: 'individual', personId: r.id, language: 'de' },
      })),
    });
  const name = q.trim();
  if (name) {
    groups.push({
      head: 'New',
      items: [
        { key: 'new-org', mark: '+', title: name, detail: 'New organisation · a group offer', fields: { kind: 'group', recipientName: name, language: 'en' } },
        { key: 'new-person', mark: '+', title: name, detail: 'One learner · an individual offer', fields: { kind: 'individual', recipientName: name, language: 'de' } },
      ],
    });
  }
  return groups;
}

/**
 * New offer: one question, who is it for. Type a school, an agency, a
 * student; pick a group enquiry still waiting for its offer; or start one for
 * a name nobody has had an offer before. Arrow keys and Enter work.
 */
export function NewOffer({ suggestions }: { suggestions: RecipientResult[] }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(suggestions);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const forms = useRef<(HTMLFormElement | null)[]>([]);
  const asked = useRef(0);

  useEffect(() => {
    const term = q.trim();
    const n = ++asked.current;
    const t = setTimeout(async () => {
      const found = term ? await findRecipientsAction(term) : suggestions;
      if (n === asked.current) {
        setResults(found);
        setActive(0);
      }
    }, term ? 180 : 0);
    return () => clearTimeout(t);
  }, [q, suggestions]);

  const groups = choicesFor(results, q);
  const flat = groups.flatMap((g) => g.items);

  return (
    <OfferFrame back={{ href: '/admin/offers', label: 'Offers' }} title="New offer">
      <main className={ui.start}>
        <h1 className={ui.pageTitle}>Who is it for?</h1>
        <input
          className={ui.startInput}
          autoFocus
          value={q}
          placeholder="A school, agency, company or student"
          aria-label="Who the offer is for"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(flat.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter' && flat[active]) {
              e.preventDefault();
              forms.current[active]?.requestSubmit();
            }
          }}
        />
        <div className={ui.results}>
          {groups.map((g) => (
            <div key={g.head}>
              <div className={ui.resultsHead}>{g.head}</div>
              {g.items.map((c) => {
                const index = flat.indexOf(c);
                return (
                  <form
                    key={c.key}
                    ref={(el) => {
                      forms.current[index] = el;
                    }}
                    action={createOfferAction}
                    onSubmit={() => setBusy(true)}
                  >
                    {Object.entries(c.fields).map(([k, v]) => (
                      <input key={k} type="hidden" name={k} value={v} />
                    ))}
                    <button type="submit" disabled={busy} className={`${ui.result} ${index === active ? ui.resultOn : ''}`} onMouseEnter={() => setActive(index)}>
                      <span className={ui.resultMark}>{c.mark}</span>
                      <span className={ui.resultText}>
                        <b>{c.title}</b>
                        <span>{c.detail}</span>
                      </span>
                      <span className={ui.resultGo}>{busy && index === active ? 'Creating …' : 'Start →'}</span>
                    </button>
                  </form>
                );
              })}
            </div>
          ))}
          {flat.length === 0 ? <div className={ui.note} style={{ marginTop: 18 }}>Type a name to start.</div> : null}
        </div>
      </main>
    </OfferFrame>
  );
}
