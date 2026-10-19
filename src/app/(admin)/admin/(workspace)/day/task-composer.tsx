'use client';

import { useRef, useState } from 'react';

import { createTaskAction } from './actions';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Button, Input, Select } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

/**
 * A task written straight onto the day, as SchoolMan's calendar lets one type into a row — but quiet
 * until it is wanted: one line, and once a colleague starts, the time and whom it is for beside it
 * (2026-10-19: "not put everything out and open").
 */
export function TaskComposer({ day, dayName, colleagues }: { day: string; dayName: string; colleagues: readonly { id: string; name: string }[] }) {
  const { t } = useWsLang();
  const [body, setBody] = useState('');
  const [focused, setFocused] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const open = focused || body.length > 0;
  return (
    <form
      ref={form}
      action={createTaskAction}
      // Sent: the line is empty again for the next one.
      onSubmit={() => setTimeout(() => setBody(''), 0)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      className={cn('border-b border-ws-line-soft px-4 py-3 transition-colors', open && 'bg-[#fbfcfe]')}
    >
      <input type="hidden" name="day" value={day} />
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-ws-sunk text-[var(--casa-muted)] [&_svg]:size-3.5">
          {Icon.plus}
        </span>
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t('Neue Aufgabe', 'New task')}</span>
          <input
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setBody('');
                (e.target as HTMLInputElement).blur();
              }
            }}
            required
            maxLength={2000}
            autoComplete="off"
            placeholder={t(`Neue Aufgabe für ${dayName} …`, `New task for ${dayName} …`)}
            className="h-9 w-full bg-transparent text-[0.9rem] text-[var(--casa-ink)] outline-none placeholder:text-[var(--casa-text-subtle)]"
          />
        </label>
      </div>
      {open ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-[2.375rem]">
          <label className="w-[7rem]">
            <span className="sr-only">{t('Uhrzeit', 'Time')}</span>
            <Input name="startsAt" type="time" step={300} aria-label={t('Uhrzeit', 'Time')} />
          </label>
          <label className="w-[11rem]">
            <span className="sr-only">{t('Für', 'For')}</span>
            <Select name="assigneeId" defaultValue="" aria-label={t('Für', 'For')}>
              <option value="">{t('Für alle', 'For everyone')}</option>
              {colleagues.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <span className="ml-auto flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setBody('')}>
              {t('Abbrechen', 'Cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={!body.trim()}>
              {t('Hinzufügen', 'Add')}
            </Button>
          </span>
        </div>
      ) : null}
    </form>
  );
}
