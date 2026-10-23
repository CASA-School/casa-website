'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import { decideOfferAction, deleteOfferAction, duplicateOfferAction, reviseOfferAction, sendOfferAction } from '@/app/(admin)/admin/(workspace)/offers/actions';
import { useWsLang } from '@/components/admin/lang';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { subjectLine, type Letter } from '@/lib/admin/letters/types';
import type { OfferStatus } from '@/lib/admin/offers/types';

import ui from './offers.module.css';
import { MoreMenu } from './panel';

const panel = `${ui.tokens} max-w-lg rounded-3xl p-6 sm:rounded-3xl`;

/**
 * The toolbar's right side: the one thing to do next as the primary button —
 * Send for a draft, Accepted for an offer waiting for an answer, „Buchung
 * anlegen" for an accepted offer to a learner — and the rest behind "⋯".
 */
export function OfferToolbarActions({
  id,
  status,
  canWrite,
  canDelete,
  bookHref,
  send,
  extra,
}: {
  id: string;
  status: OfferStatus;
  canWrite: boolean;
  canDelete: boolean;
  bookHref?: string | null;
  send: Omit<Parameters<typeof SendButton>[0], 'id'> | null;
  extra?: { label: string; onSelect: () => void }[];
}) {
  const { t } = useWsLang();
  const duplicate = useRef<HTMLFormElement>(null);
  const revise = useRef<HTMLFormElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [decision, setDecision] = useState<'accepted' | 'declined' | null>(null);

  const items = [
    ...(extra ?? []),
    ...(canWrite ? [{ label: t('Duplizieren', 'Duplicate'), onSelect: () => duplicate.current?.requestSubmit() }] : []),
    ...(canWrite && status !== 'draft' ? [{ label: t('Überarbeiten', 'Revise'), onSelect: () => revise.current?.requestSubmit() }] : []),
    ...(canWrite && status === 'sent' ? [{ label: t('Nicht angenommen …', 'Not accepted …'), onSelect: () => setDecision('declined') }] : []),
    ...(canDelete ? [{ label: t('Löschen …', 'Delete …'), onSelect: () => setConfirmDelete(true), danger: true, rule: true }] : []),
  ];

  return (
    <>
      <form ref={duplicate} action={duplicateOfferAction} hidden>
        <input type="hidden" name="id" value={id} />
      </form>
      <form ref={revise} action={reviseOfferAction} hidden>
        <input type="hidden" name="id" value={id} />
      </form>
      <MoreMenu items={items} />
      {canWrite && status === 'draft' && send ? <SendButton id={id} {...send} /> : null}
      {canWrite && status === 'sent' ? (
        <button type="button" className={ui.primary} onClick={() => setDecision('accepted')}>
          {t('Angenommen', 'Accepted')}
        </button>
      ) : null}
      {status === 'accepted' && bookHref ? (
        <Link href={bookHref} className={ui.primary}>
          {t('Buchung anlegen', 'Create booking')}
        </Link>
      ) : null}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className={panel} closeLabel={t('Schließen', 'Close')}>
          <DialogTitle className={ui.dlgTitle}>{t('Möchtest du dieses Angebot löschen?', 'Delete this offer?')}</DialogTitle>
          <DialogDescription className="mt-1 text-sm">
            {t(
              'Es verschwindet aus der Liste. Bereits gesendete Fassungen bleiben im Verlauf.',
              'It disappears from the list. Versions already sent stay in the history.'
            )}
          </DialogDescription>
          <form action={deleteOfferAction} className={ui.foot} style={{ marginTop: 18 }}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="confirmed" value="1" />
            <button type="button" className={ui.btn} onClick={() => setConfirmDelete(false)}>
              {t('Abbrechen', 'Cancel')}
            </button>
            <button type="submit" className={ui.primary} style={{ background: '#c81e1e' }}>
              {t('Löschen', 'Delete')}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {decision ? <DecideDialog id={id} decision={decision} onClose={() => setDecision(null)} /> : null}
    </>
  );
}

/**
 * Send: this version is kept as it goes out, and the mail screen opens with the letter as a PDF — sent
 * directly after a review, or opened in Outlook (docs/LETTERS.md §Sending). Printing stays one click away.
 */
export function SendButton({
  id,
  canSend,
  busy,
  problems,
  email,
  letter,
  onPrint,
  onBeforeSend,
}: {
  id: string;
  canSend: boolean;
  busy: boolean;
  problems: string[];
  email: string;
  letter: Letter;
  onPrint: () => void;
  onBeforeSend: () => Promise<void>;
}) {
  const { t } = useWsLang();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={ui.primary}
        disabled={!canSend}
        title={canSend ? undefined : problems.join(' · ')}
        onClick={async () => {
          await onBeforeSend();
          setOpen(true);
        }}
      >
        {t('Senden …', 'Send …')}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={panel} closeLabel={t('Schließen', 'Close')}>
          <DialogTitle className={ui.dlgTitle}>{t('Angebot senden', 'Send the offer')}</DialogTitle>
          <DialogDescription className="mt-1 text-sm">{subjectLine(letter)}</DialogDescription>
          <form action={sendOfferAction} className={ui.form} style={{ marginTop: 18 }}>
            <input type="hidden" name="id" value={id} />
            <p className="text-sm">
              {email
                ? t(`Diese Fassung wird so aufbewahrt, wie sie ist. Danach geht sie als PDF an ${email}.`, `This version is kept as it is. Then it goes to ${email} as a PDF.`)
                : t('Diese Fassung wird so aufbewahrt, wie sie ist. Danach geht sie als PDF hinaus.', 'This version is kept as it is. Then it goes out as a PDF.')}
            </p>
            <div className={ui.foot}>
              <button type="button" className={ui.btn} onClick={onPrint}>
                {t('Drucken / PDF', 'Print / PDF')}
              </button>
              <button type="button" className={ui.btn} onClick={() => setOpen(false)}>
                {t('Abbrechen', 'Cancel')}
              </button>
              <button type="submit" className={ui.primary} disabled={busy}>
                {t('Speichern und senden …', 'Save and send …')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DecideDialog({ id, decision, onClose }: { id: string; decision: 'accepted' | 'declined'; onClose: () => void }) {
  const { t } = useWsLang();
  const [reason, setReason] = useState<'declined' | 'lapsed' | 'withdrawn'>('declined');
  const accepted = decision === 'accepted';
  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className={panel} closeLabel={t('Schließen', 'Close')}>
        <DialogTitle className={ui.dlgTitle}>
          {accepted ? t('Das Angebot wurde angenommen', 'The offer was accepted') : t('Das Angebot wurde nicht angenommen', 'The offer was not accepted')}
        </DialogTitle>
        <DialogDescription className="sr-only">{t('Antwort festhalten', 'Record the answer')}</DialogDescription>
        <form action={decideOfferAction} className={ui.form} style={{ marginTop: 16 }}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value={accepted ? 'accepted' : reason} />
          {!accepted ? (
            <div className={ui.seg} role="radiogroup" aria-label={t('Warum', 'Why')}>
              {(
                [
                  ['declined', t('Von ihnen abgelehnt', 'Declined by them')],
                  ['lapsed', t('Keine Antwort bekommen', 'No answer came')],
                  ['withdrawn', t('Von uns zurückgezogen', 'Withdrawn by us')],
                ] as const
              ).map(([v, label]) => (
                <label key={v}>
                  <input type="radio" name="reason" checked={reason === v} onChange={() => setReason(v)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          ) : null}
          <div>
            <label className={ui.lbl} htmlFor={`note-${decision}`}>
              {t('Notiz', 'Note')}
            </label>
            <textarea id={`note-${decision}`} name="note" rows={3} className={ui.textarea} />
          </div>
          <div className={ui.foot}>
            <button type="button" className={ui.btn} onClick={onClose}>
              {t('Abbrechen', 'Cancel')}
            </button>
            <button type="submit" className={ui.primary}>
              {t('Speichern', 'Save')}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
