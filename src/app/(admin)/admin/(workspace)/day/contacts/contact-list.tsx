'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { printLetter } from '@/components/admin/letters/print';
import { Button } from '@/components/admin/ui';
import type { ClassContacts } from '@/lib/admin/day-plan';

const subscribeNothing = () => () => {};
const de = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

/**
 * A class's learners with their addresses, for its teacher (2026-10-19, Rahman: teachers ask for them;
 * SchoolMan has such a list): on A4, to print or save as a PDF and send — or straight into an email to
 * the teacher, the list in it.
 */
export function ContactList({ list }: { list: ClassContacts }) {
  const { t } = useWsLang();
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const title = `Teilnehmerliste ${list.label}${list.number ? ` #${list.number}` : ''}`;
  const body = [
    `Hallo${list.teacherName ? ` ${list.teacherName.split(' ')[0]}` : ''},`,
    '',
    `hier die Teilnehmenden von ${list.label}${list.number ? ` (#${list.number})` : ''} mit ihren E-Mail-Adressen:`,
    '',
    ...list.learners.map((l, i) => `${i + 1}. ${l.name}${l.email ? ` – ${l.email}` : ''}`),
    '',
    'Viele Grüße',
  ].join('\n');
  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        {list.teacherEmail ? (
          <a
            href={`mailto:${encodeURIComponent(list.teacherEmail)}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[0.88rem] font-semibold text-[var(--casa-ink)] ring-1 ring-ws-line ring-inset transition-colors outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4 [&_svg]:text-[var(--casa-muted)]"
          >
            {Icon.mail}
            {t(`E-Mail an ${list.teacherName ?? 'die Lehrkraft'}`, `Email ${list.teacherName ?? 'the teacher'}`)}
          </a>
        ) : null}
        <Button type="button" onClick={() => printLetter(title)}>
          {t('Drucken / PDF', 'Print / PDF')}
        </Button>
      </div>
      <div className="mx-auto max-w-[760px] rounded-2xl border border-ws-line bg-white px-10 py-9 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <Sheet list={list} />
      </div>
      {mounted
        ? createPortal(
            <div data-letter-print className="ws-contacts-print hidden bg-white">
              <Sheet list={list} />
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function Sheet({ list }: { list: ClassContacts }) {
  return (
    <div className="text-[#111827]">
      <div className="flex items-end justify-between border-b-2 border-[#111827] pb-2.5">
        <div className="flex items-baseline gap-3">
          <span className="font-[family-name:var(--font-display)] text-[1.5rem] leading-none font-semibold tracking-[0.06em]">CASA</span>
          <span className="text-[0.95rem] font-bold">Teilnehmerliste</span>
        </div>
        <span className="text-[1.3rem] leading-none font-extrabold">
          {list.label} <span className="text-[0.9rem] font-semibold text-[#4b5563]">{list.typeName}</span>
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-4 gap-x-6 text-[0.8rem]">
        <Fact label="Kurs">{list.number ? `#${list.number}` : '—'}</Fact>
        <Fact label="Lehrkraft">{list.teacherName ?? '—'}</Fact>
        <Fact label="Raum · Zeit">{[list.roomName, list.hours].filter(Boolean).join(' · ') || '—'}</Fact>
        <Fact label="Stand">{de(list.date)}</Fact>
      </dl>
      <table className="mt-5 w-full border-collapse text-[0.86rem]">
        <thead>
          <tr className="bg-[#f3f4f6]">
            <th className="w-9 border border-[#9ca3af] px-2 py-1.5 text-left font-semibold">#</th>
            <th className="border border-[#9ca3af] px-2 py-1.5 text-left font-semibold">Name</th>
            <th className="border border-[#9ca3af] px-2 py-1.5 text-left font-semibold">E-Mail</th>
          </tr>
        </thead>
        <tbody>
          {list.learners.map((l, i) => (
            <tr key={i} className="h-[1.9rem]">
              <td className="border border-[#9ca3af] px-2 text-[#6b7280] tabular-nums">{i + 1}</td>
              <td className="border border-[#9ca3af] px-2 font-semibold">{l.name}</td>
              <td className="border border-[#9ca3af] px-2">{l.email ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.learners.length === 0 ? <p className="mt-3 text-[0.86rem] text-[#6b7280]">Niemand ist für diesen Tag gebucht.</p> : null}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.7rem] font-semibold text-[#6b7280]">{label}</dt>
      <dd className="mt-0.5 truncate font-bold">{children}</dd>
    </div>
  );
}
