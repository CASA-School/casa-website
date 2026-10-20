'use client';

import { useState, type FormEvent, type ReactNode } from 'react';

import { Logo } from '@/components/ui/logo';
import type { OpenSitting } from '@/lib/entry-test/types';
import { cn } from '@/lib/utils';

import { formatClock } from './controller';
import { column, errorLine, focusRing, ghostButton, primaryButton } from './ui';

const field =
  'w-full rounded-lg border-[1.5px] border-[color:var(--casa-field-edge)] bg-white p-3.5 text-[17px] text-[var(--casa-ink)] ' +
  'outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--casa-blue)] focus:ring-4 focus:ring-[var(--casa-blue)]/10 ' +
  'motion-reduce:transition-none';

const fieldLabel = 'mb-1.5 mt-4 block text-[14px] font-bold';

const sittingName = (sitting: OpenSitting) => `${sitting.course} · ${sitting.session === 'morning' ? 'Vormittag' : 'Nachmittag'}`;

// ---------------------------------------------------------------- start

type StartScreenProps = {
  sittings: OpenSitting[];
  infoLoaded: boolean;
  sittingId: string;
  starting: boolean;
  error: string;
  onChooseSitting: (id: string) => void;
  onStart: (name: string, email: string) => void;
};

export function StartScreen({ sittings, infoLoaded, sittingId, starting, error, onChooseSitting, onStart }: StartScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const chosen = sittings.length === 1 ? sittings[0] : sittings.find((sitting) => sitting.id === sittingId);
  const same = <K extends keyof OpenSitting>(key: K) =>
    sittings.length > 0 && sittings.every((sitting) => sitting[key] === sittings[0][key]) ? sittings[0][key] : undefined;
  const title = chosen?.title ?? same('title') ?? 'Einstufungstest';
  const tasks = chosen?.tasks ?? same('tasks');
  const meta = chosen ? `${chosen.tasks} Aufgaben · ${chosen.minutes} Minuten` : tasks ? `${tasks} Aufgaben` : ' ';

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onStart(name, email);
  };

  return (
    <section className={cn(column, 'pb-10 pt-[calc(28px+env(safe-area-inset-top))]')}>
      <Logo className="block h-auto w-[170px]" preload />
      <div aria-hidden className="casa-logo-stripe mb-[26px] mt-[18px] h-[3px] rounded-[2px]" />
      <h1 className="mb-1.5 text-[30px] font-bold leading-[1.1]">{title}</h1>
      <p className="mb-[26px] text-[var(--casa-muted)]">{meta}</p>

      <form onSubmit={submit} autoComplete="on" noValidate>
        <label htmlFor="entry-test-name" className={fieldLabel}>
          Vor- und Nachname
        </label>
        <input
          id="entry-test-name"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={field}
        />
        <label htmlFor="entry-test-email" className={fieldLabel}>
          E-Mail-Adresse
        </label>
        <input
          id="entry-test-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={field}
        />

        {sittings.length > 1 ? (
          <div>
            <label htmlFor="entry-test-group" className={fieldLabel}>
              Gruppe
            </label>
            <div className="relative">
              <select
                id="entry-test-group"
                value={sittingId}
                onChange={(event) => onChooseSitting(event.target.value)}
                className={cn(field, 'appearance-none pr-10')}
              >
                <option value="">Bitte wählen</option>
                {sittings.map((sitting) => (
                  <option key={sitting.id} value={sitting.id}>
                    {sittingName(sitting)}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 20 20" aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 size-[18px] -translate-y-1/2">
                <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        ) : infoLoaded ? (
          <p className={cn('mt-4 rounded-lg bg-white px-3.5 py-3 font-bold', !sittings.length && 'text-[var(--casa-coral-text)]')}>
            {sittings.length ? `Gruppe: ${sittingName(sittings[0])}` : 'Der Test ist noch nicht geöffnet.'}
          </p>
        ) : null}

        <div className="my-[22px] rounded-lg border-l-4 border-[var(--casa-sun)] bg-white px-3.5 py-3 text-[15px]">
          Bleiben Sie auf dieser Seite und lassen Sie den Bildschirm an, bis Sie abgeben. Wenn Sie die Seite verlassen, wird der Test pausiert
          und Ihre Lehrkraft gibt ihn wieder frei.
        </div>
        <button type="submit" disabled={starting} className={primaryButton}>
          {starting ? 'Wird gestartet …' : 'Test starten'}
        </button>
        <div role="alert" className={errorLine}>
          {error}
        </div>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------- sheets

function Sheet({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="fixed inset-0 z-20 flex items-end bg-[rgba(15,23,42,0.45)]">
      <div className="mx-auto max-h-[88vh] w-full max-w-[560px] overflow-auto rounded-t-3xl bg-white px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-5">
        {children}
      </div>
    </div>
  );
}

type OverviewSheetProps = {
  /** Per page: how many of its answers are given, of how many. */
  pages: { got: number; of: number }[];
  current: number;
  answered: number;
  total: number;
  onPick: (page: number) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function OverviewSheet({ pages, current, answered, total, onPick, onClose, onSubmit }: OverviewSheetProps) {
  return (
    <Sheet labelledBy="entry-test-overview">
      <h3 id="entry-test-overview" className="mb-1 text-[20px] font-bold">
        Übersicht
      </h3>
      <p className="mb-4 text-[var(--casa-muted)]">
        {answered} von {total} Antworten · {total - answered} leer
      </p>
      <div className="mb-[18px] grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-2">
        {pages.map(({ got, of }, page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPick(page)}
            aria-current={page === current ? 'step' : undefined}
            className={cn(
              'aspect-square cursor-pointer rounded-lg border-[1.5px] font-extrabold',
              focusRing,
              got === of
                ? 'border-[var(--casa-accent-surface)] bg-[var(--casa-accent-surface)] text-white'
                : got
                  ? 'border-[var(--casa-blue)] bg-[var(--casa-blue-tint)] text-[var(--casa-ink)]'
                  : 'border-[color:var(--casa-sand)] bg-white text-[var(--casa-ink)]',
              page === current && 'outline-3 outline-offset-1 outline-[var(--casa-ink)]'
            )}
          >
            {page + 1}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={onClose} className={ghostButton}>
          Weiterarbeiten
        </button>
        <button type="button" onClick={onSubmit} className={primaryButton}>
          Abgeben
        </button>
      </div>
    </Sheet>
  );
}

export function ConfirmSheet({ text, submitting, onBack, onConfirm }: { text: string; submitting: boolean; onBack: () => void; onConfirm: () => void }) {
  return (
    <Sheet labelledBy="entry-test-confirm">
      <h3 id="entry-test-confirm" className="mb-1 text-[20px] font-bold">
        Test abgeben?
      </h3>
      <p className="mb-4 text-[var(--casa-muted)]">{text}</p>
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={onBack} className={ghostButton}>
          Zurück
        </button>
        <button type="button" onClick={onConfirm} disabled={submitting} className={primaryButton}>
          Abgeben
        </button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- full-screen states

function FullScreen({ tone, labelledBy, badge, children }: { tone: string; labelledBy: string; badge: ReactNode; children: ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className={cn(
        'fixed inset-0 z-30 flex items-center justify-center overflow-auto text-center',
        'pb-[max(24px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] pt-[max(24px,env(safe-area-inset-top))]',
        tone
      )}
    >
      <div className="w-full max-w-[420px]">
        {badge}
        {children}
      </div>
    </div>
  );
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <div className={cn('mx-auto mb-[18px] grid size-[72px] place-items-center rounded-full [&>svg]:size-9', className)}>{children}</div>;
}

const fullTitle = 'mb-2 text-[26px] font-bold';
const fullText = 'mb-[18px] text-[var(--casa-muted)]';

type LockScreenProps = {
  left: number;
  code: string;
  unlocking: boolean;
  error: string;
  onCode: (code: string) => void;
  onUnlock: () => void;
};

export function LockScreen({ left, code, unlocking, error, onCode, onUnlock }: LockScreenProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onUnlock();
  };

  return (
    <FullScreen
      tone="bg-[var(--casa-warm-panel)]"
      labelledBy="entry-test-paused"
      badge={
        <Badge className="bg-[var(--casa-amber-strong)]">
          <svg viewBox="0 0 24 24" fill="#fff" aria-hidden>
            <rect x="7" y="6" width="3.4" height="12" rx="1.2" />
            <rect x="13.6" y="6" width="3.4" height="12" rx="1.2" />
          </svg>
        </Badge>
      }
    >
      <h2 id="entry-test-paused" className={fullTitle}>
        Test pausiert
      </h2>
      <p className={fullText}>
        Sie haben die Testseite verlassen. Ihre Antworten sind gespeichert.
        <br />
        Bitte melden Sie sich bei Ihrer Lehrkraft.
      </p>
      <div className="mb-[18px] font-extrabold tabular-nums">Restzeit {formatClock(left)}</div>
      <form onSubmit={submit} noValidate>
        <input
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          placeholder="Code"
          aria-label="Lehrkraft-Code"
          value={code}
          onChange={(event) => onCode(event.target.value)}
          className={cn(
            field,
            'mx-auto mb-3 block max-w-[220px] select-text text-center text-[28px] font-extrabold tracking-[0.4em]',
            'placeholder:text-[20px] placeholder:font-bold placeholder:tracking-normal placeholder:text-[var(--casa-muted)]'
          )}
        />
        <button type="submit" disabled={unlocking} className={primaryButton}>
          Freigeben
        </button>
      </form>
      <div role="alert" className={errorLine}>
        {error}
      </div>
    </FullScreen>
  );
}

export function DoneScreen({ timeUp }: { timeUp: boolean }) {
  return (
    <FullScreen
      tone="bg-[var(--casa-ground)]"
      labelledBy="entry-test-done"
      badge={
        <Badge className="bg-[var(--casa-success-surface)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </Badge>
      }
    >
      <h2 id="entry-test-done" className={fullTitle}>
        Vielen Dank!
      </h2>
      <p className={fullText}>
        {timeUp ? 'Die Zeit ist abgelaufen. Ihre Antworten wurden abgegeben.' : 'Ihr Test wurde abgegeben.'}
        <br />
        Ihre Lehrkraft erhält das Ergebnis.
      </p>
    </FullScreen>
  );
}

export function InfoScreen({ title, text, onRetry }: { title: string; text: string; onRetry: () => void }) {
  return (
    <FullScreen
      tone="bg-[var(--casa-ground)]"
      labelledBy="entry-test-info"
      badge={
        <Badge className="bg-[var(--casa-ink-deep)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v6M12 16.5v.5" />
          </svg>
        </Badge>
      }
    >
      <h2 id="entry-test-info" className={fullTitle}>
        {title}
      </h2>
      <p className={fullText}>{text}</p>
      <button type="button" onClick={onRetry} className={primaryButton}>
        Erneut versuchen
      </button>
    </FullScreen>
  );
}
