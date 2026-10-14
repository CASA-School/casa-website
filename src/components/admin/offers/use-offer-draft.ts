'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useWsLang } from '@/components/admin/lang';
import type { T } from '@/lib/admin/i18n';
import { offerChecks } from '@/lib/admin/offers/checks';
import { buildLines, computeTotals } from '@/lib/admin/offers/engine';
import type { OfferCheck, OfferDraft, OfferLine, OfferStatus, OfferTotals } from '@/lib/admin/offers/types';

import { saveOfferAction } from '@/app/(admin)/admin/(editor)/offers/actions';

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error' | 'stale';

/**
 * One offer's draft, saving itself — the builder and the letter both hold it.
 *
 * The draft is the only state: lines, totals and checks are computed from it
 * with the same pure functions the server uses, so the screen answers as fast
 * as one types. The save — 0.7 s
 * after the last change — names the revision it started from; a colleague's
 * save in between is refused and the screen offers a reload (Kursplanung's
 * rule), never overwritten.
 */
export function useOfferDraft({
  id,
  status,
  initialDraft,
  initialRevision,
  storedLines,
  editable,
  today,
}: {
  id: string;
  status: OfferStatus;
  initialDraft: OfferDraft;
  initialRevision: number;
  storedLines: OfferLine[];
  editable: boolean;
  today: string;
}) {
  const { t } = useWsLang();
  const [draft, setDraft] = useState(initialDraft);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);

  const draftRef = useRef(draft);
  const revision = useRef(initialRevision);
  const pending = useRef<OfferDraft | null>(null);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inFlight.current || !pending.current) return;
    const next = pending.current;
    pending.current = null;
    inFlight.current = true;
    setSaveState('saving');
    try {
      const result = await saveOfferAction(id, revision.current, next);
      if (result.ok) {
        revision.current = result.revision;
        setSaveError(null);
        setSaveState(pending.current ? 'dirty' : 'saved');
      } else if (result.stale) {
        pending.current = null;
        setSaveState('stale');
      } else {
        setSaveError(result.error);
        setSaveState('error');
      }
    } catch {
      pending.current = pending.current ?? next;
      setSaveError(t('Die Verbindung ist abgebrochen. Die letzte Änderung ist noch nicht gespeichert.', 'The connection dropped. The last change is not saved yet.'));
      setSaveState('error');
    } finally {
      inFlight.current = false;
      if (pending.current && timer.current == null) void flush();
    }
  }, [id, t]);

  const update = useCallback(
    (change: Partial<OfferDraft> | ((d: OfferDraft) => OfferDraft)) => {
      if (!editable) return;
      const next = typeof change === 'function' ? change(draftRef.current) : { ...draftRef.current, ...change };
      draftRef.current = next;
      setDraft(next);
      pending.current = next;
      setSaveState('dirty');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void flush();
      }, 700);
    },
    [editable, flush]
  );

  // Leaving with a change not stored yet: save it now, and let the browser ask.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && pending.current) void flush();
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (pending.current || inFlight.current) e.preventDefault();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [flush]);

  const lines = useMemo(() => (status === 'draft' ? buildLines(draft) : storedLines), [draft, status, storedLines]);
  const totals: OfferTotals = useMemo(() => computeTotals(draft, lines), [draft, lines]);
  const checks: OfferCheck[] = useMemo(() => (status === 'draft' ? offerChecks(draft, lines, today) : []), [draft, lines, today, status]);

  return { draft, update, flush, lines, totals, checks, saveState, saveError, editable };
}

export function saveLabel(state: SaveState, error: string | null, editable: boolean, t: T): string | null {
  if (state === 'saving') return t('Speichert …', 'Saving …');
  if (state === 'dirty') return t('Ungespeichert', 'Unsaved');
  if (state === 'error') return error ?? t('Nicht gespeichert', 'Not saved');
  if (state === 'stale') return null;
  return editable ? t('Gespeichert', 'Saved') : null;
}
