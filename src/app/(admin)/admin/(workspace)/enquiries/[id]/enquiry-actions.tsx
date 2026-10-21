'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';

import { listPersonAction, updateStatusAction } from '../../actions';
import { assignOrganisationAction, deleteEnquiryAction } from '../actions';
import { menuItem, menuPanel } from '@/components/admin/choice-menu';
import { DIALOG_OVERLAY, DialogBody, DialogFooter, DialogHead, dialogPanel } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Button, Field, Input, Select } from '@/components/admin/ui';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ORGANISATION_KIND_CHOICES, ORGANISATION_KIND_LABELS } from '@/lib/admin/organisation-labels';
import { pick } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

/**
 * „Weiter mit …" on an enquiry (Rahman, 2026-10-21): what the enquiry becomes, in one menu beside its
 * status and owner. A website contact is no learner until a colleague says so (0076):
 *
 * - „Zu einem Kurs anmelden" — the person's booking wizard; the booking lists them in Teilnehmende;
 * - „Als Teilnehmende/n anlegen" — a future learner, not yet booked;
 * - „Organisation zuordnen …" — an agency, a company or a school: an existing one or a new one, the
 *   sender as its contact, the person left off the register;
 * - „Als Spam markieren" — out of every list; „Löschen …" — gone, after a confirmation, with the person
 *   if nothing else at CASA is theirs.
 *
 * Matching the sender with someone already known is the person card's („Dieselbe Person"), beside it.
 */
export function EnquiryActions({
  id,
  status,
  bookHref,
  listPersonId,
  organisations,
  canOrganise,
  canCreateOrganisation,
  canEdit,
  canDelete,
}: {
  id: string;
  status: string;
  /** The person's booking wizard, where the colleague may book. */
  bookHref: string | null;
  /** The person to put on the register, where they are not yet and the colleague may. */
  listPersonId: string | null;
  organisations: readonly { id: string; name: string; kind: string }[];
  canOrganise: boolean;
  canCreateOrganisation: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { t, lang } = useWsLang();
  const [dialog, setDialog] = useState<'organisation' | 'delete' | null>(null);
  const listForm = useRef<HTMLFormElement>(null);
  const spamForm = useRef<HTMLFormElement>(null);
  const returnTo = `/admin/enquiries/${id}`;
  const open = (which: 'organisation' | 'delete') => window.setTimeout(() => setDialog(which), 0);

  if (!bookHref && !listPersonId && !canOrganise && !canEdit && !canDelete) return null;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ws-line bg-white px-3.5 text-[0.84rem] font-semibold text-[var(--casa-ink)] transition-colors outline-none hover:border-ws-line-firm focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 data-[state=open]:border-ws-line-firm [&_svg]:size-3.5">
          {t('Weiter mit …', 'Next step …')}
          {Icon.chevronDown}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className={cn(menuPanel, 'min-w-[16rem]')}>
          {bookHref ? (
            <DropdownMenuItem asChild className={menuItem}>
              <Link href={bookHref}>
                {Icon.bookings}
                {t('Zu einem Kurs anmelden', 'Book onto a course')}
              </Link>
            </DropdownMenuItem>
          ) : null}
          {listPersonId ? (
            <DropdownMenuItem className={menuItem} onSelect={() => listForm.current?.requestSubmit()}>
              {Icon.person}
              {t('Als Teilnehmende/n anlegen', 'Add to Learners')}
            </DropdownMenuItem>
          ) : null}
          {canOrganise ? (
            <DropdownMenuItem className={menuItem} onSelect={() => open('organisation')}>
              {Icon.people}
              {t('Organisation zuordnen …', 'Assign to an organisation …')}
            </DropdownMenuItem>
          ) : null}
          {(canEdit && status !== 'spam') || canDelete ? <DropdownMenuSeparator /> : null}
          {canEdit && status !== 'spam' ? (
            <DropdownMenuItem className={menuItem} onSelect={() => spamForm.current?.requestSubmit()}>
              {Icon.flag}
              {t('Als Spam markieren', 'Mark as spam')}
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <DropdownMenuItem className={cn(menuItem, 'text-[#b42318] focus:text-[#b42318] [&_svg]:text-[#b42318]')} onSelect={() => open('delete')}>
              {Icon.trash}
              {t('Löschen …', 'Delete …')}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {listPersonId ? (
        <form ref={listForm} action={listPersonAction} className="hidden">
          <input type="hidden" name="personId" value={listPersonId} />
          <input type="hidden" name="returnTo" value={returnTo} />
        </form>
      ) : null}
      {canEdit ? (
        <form ref={spamForm} action={updateStatusAction} className="hidden">
          <input type="hidden" name="entity" value="enquiry" />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="spam" />
        </form>
      ) : null}

      <Dialog open={dialog === 'organisation'} onOpenChange={(next) => (next ? null : setDialog(null))}>
        <DialogContent className={dialogPanel('md')} overlayClassName={DIALOG_OVERLAY} closeLabel={t('Schließen', 'Close')}>
          <DialogHead
            title={t('Organisation zuordnen', 'Assign to an organisation')}
            description={t('Die Anfrage geht an die Organisation, der Absender wird ihr Kontakt.', 'The enquiry goes to the organisation, the sender becomes its contact.')}
            icon={Icon.people}
            tint="blue"
          />
          <DialogBody>
            <OrganisationForm id={id} organisations={organisations} canCreate={canCreateOrganisation} kindLabel={(kind) => pick(lang, ORGANISATION_KIND_LABELS[kind as keyof typeof ORGANISATION_KIND_LABELS] ?? { de: kind, en: kind })} />
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'delete'} onOpenChange={(next) => (next ? null : setDialog(null))}>
        <DialogContent className={dialogPanel('sm')} overlayClassName={DIALOG_OVERLAY} closeLabel={t('Schließen', 'Close')}>
          <DialogHead
            title={t('Anfrage löschen?', 'Delete the enquiry?')}
            description={t(
              'Sie verschwindet aus allen Listen, mit dem Absender, wenn bei CASA sonst nichts von ihm ist.',
              'It leaves every list, with its sender if nothing else at CASA is theirs.'
            )}
            icon={Icon.trash}
            tint="red"
          />
          <DialogBody>
            <form action={deleteEnquiryAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="confirmed" value="1" />
              <DialogFooter>
                <Button type="submit" variant="danger" size="md">
                  {t('Löschen', 'Delete')}
                </Button>
              </DialogFooter>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** An existing organisation, found by name, or a new one with its kind. */
function OrganisationForm({
  id,
  organisations,
  canCreate,
  kindLabel,
}: {
  id: string;
  organisations: readonly { id: string; name: string; kind: string }[];
  canCreate: boolean;
  kindLabel: (kind: string) => string;
}) {
  const { t } = useWsLang();
  const [term, setTerm] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const found = useMemo(() => {
    const q = term.trim().toLowerCase();
    return (q ? organisations.filter((o) => o.name.toLowerCase().includes(q)) : organisations).slice(0, 8);
  }, [organisations, term]);

  return (
    <form action={assignOrganisationAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {creating ? (
        <>
          <Field label={t('Name der Organisation', 'Organisation name')} htmlFor="org-new-name">
            <Input id="org-new-name" name="name" required maxLength={200} defaultValue={term} autoFocus />
          </Field>
          <Field label={t('Art', 'Kind')} htmlFor="org-new-kind">
            <Select id="org-new-kind" name="kind" defaultValue="agency">
              {ORGANISATION_KIND_CHOICES.map((kind) => (
                <option key={kind} value={kind}>
                  {kindLabel(kind)}
                </option>
              ))}
            </Select>
          </Field>
        </>
      ) : (
        <>
          <input type="hidden" name="organisationId" value={chosen ?? ''} />
          <Field label={t('Organisation suchen', 'Find the organisation')} htmlFor="org-search">
            <Input id="org-search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t('Name …', 'Name …')} autoFocus autoComplete="off" />
          </Field>
          <ul className="max-h-64 overflow-y-auto rounded-xl ring-1 ring-ws-line ring-inset" role="listbox" aria-label={t('Organisationen', 'Organisations')}>
            {found.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={chosen === o.id}
                  onClick={() => setChosen(o.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[0.86rem] transition-colors',
                    chosen === o.id ? 'bg-[var(--casa-blue-tint)] font-semibold' : 'hover:bg-[var(--ws-row-hover)]'
                  )}
                >
                  <span className="min-w-0 truncate">{o.name}</span>
                  <span className="shrink-0 text-xs text-[var(--casa-muted)]">{kindLabel(o.kind)}</span>
                </button>
              </li>
            ))}
            {found.length === 0 ? <li className="px-3 py-2 text-sm text-[var(--casa-muted)]">{t('Keine gefunden.', 'None found.')}</li> : null}
          </ul>
        </>
      )}
      <DialogFooter
        start={
          canCreate ? (
            <Button type="button" variant="ghost" size="md" onClick={() => setCreating((c) => !c)}>
              {creating ? t('Vorhandene wählen', 'Choose an existing one') : t('Neue Organisation', 'New organisation')}
            </Button>
          ) : undefined
        }
      >
        <Button type="submit" size="md" disabled={!creating && !chosen}>
          {t('Zuordnen', 'Assign')}
        </Button>
      </DialogFooter>
    </form>
  );
}
