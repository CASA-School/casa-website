import Link from 'next/link';
import type { ReactNode } from 'react';

import { ConfirmSubmit, DialogFooter, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Badge, Button, Card, Field, Input, Select } from '@/components/admin/ui';
import { EMAIL_KIND_LABELS, EMAIL_KINDS, PHONE_KIND_LABELS, PHONE_KINDS } from '@/lib/admin/contact-labels';
import type { PersonEmail, PersonPhone } from '@/lib/admin/contacts';
import { pick, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * A person's addresses and numbers (Rahman, 2026-11-01: „what if a participant has more than one email or
 * phone"): every one they gave, labelled, the one the workspace uses marked „Hauptadresse". The person
 * page and a colleague's staff page show the same card, each with its own module's actions.
 */

type Actions = {
  saveEmail: (formData: FormData) => void | Promise<void>;
  savePhone: (formData: FormData) => void | Promise<void>;
  remove: (formData: FormData) => void | Promise<void>;
};

const box = 'size-4 rounded border-ws-line-firm accent-[var(--casa-accent-surface)]';

function Hidden({ values }: { values: Record<string, string> }) {
  return Object.entries(values).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />);
}

/** What an address is, in a few words: its kind, whose it is besides, a note. */
function emailLine(e: PersonEmail, lang: WsLang, t: T): string {
  const whose =
    e.tier === 2
      ? e.organisation ?? (e.kind === 'agency' ? null : t('Adresse einer Organisation', 'An organisation’s address'))
      : e.sharedWith
        ? t(`auch bei ${e.sharedWith} weiteren Personen`, `also on ${e.sharedWith} other ${e.sharedWith === 1 ? 'person' : 'people'}`)
        : null;
  const kind = e.tier === 2 && e.kind !== 'work' ? EMAIL_KIND_LABELS.agency : EMAIL_KIND_LABELS[e.kind];
  return [pick(lang, kind), whose, e.note].filter(Boolean).join(' · ');
}

export async function ContactCard({
  emails,
  phones,
  canEdit,
  canRemove,
  hidden,
  actions,
  mailTo,
  title,
  headerAction,
  children,
  className,
}: {
  emails: PersonEmail[];
  phones: PersonPhone[];
  canEdit: boolean;
  /** Removing one is `full`, as every removal; with `edit` an old one is simply not the main one. */
  canRemove: boolean;
  /** Which person or colleague the forms are for. */
  hidden: Record<string, string>;
  actions: Actions;
  /** The mail screen for one of the addresses. */
  mailTo: (address: string) => string;
  title?: string;
  headerAction?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { t, lang } = await getI18n();

  const emailForm = (e?: PersonEmail) => (
    <form action={actions.saveEmail} className="space-y-3">
      <Hidden values={hidden} />
      {e ? <input type="hidden" name="emailId" value={e.id} /> : null}
      {e ? null : (
        <Field label={t('E-Mail-Adresse', 'Email address')} htmlFor="contact-address">
          <Input id="contact-address" name="address" type="email" required maxLength={200} autoFocus />
        </Field>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Art', 'Kind')} htmlFor={`contact-kind-${e?.id ?? 'new'}`}>
          <Select id={`contact-kind-${e?.id ?? 'new'}`} name="kind" defaultValue={e?.kind ?? 'personal'}>
            {EMAIL_KINDS.map((k) => (
              <option key={k} value={k}>
                {pick(lang, EMAIL_KIND_LABELS[k])}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('Notiz', 'Note')} htmlFor={`contact-note-${e?.id ?? 'new'}`}>
          <Input id={`contact-note-${e?.id ?? 'new'}`} name="note" maxLength={120} defaultValue={e?.note ?? ''} />
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[0.88rem] font-semibold text-[var(--casa-ink)]">
        <input type="checkbox" name="primary" value="1" defaultChecked={e ? e.isPrimary : false} className={box} />
        {t('Hauptadresse', 'Main address')}
      </label>
      <DialogFooter>
        <Button type="submit">{e ? t('Speichern', 'Save') : t('Hinzufügen', 'Add')}</Button>
      </DialogFooter>
    </form>
  );

  const phoneForm = (p?: PersonPhone) => (
    <form action={actions.savePhone} className="space-y-3">
      <Hidden values={hidden} />
      {p ? <input type="hidden" name="phoneId" value={p.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {p ? null : (
          <Field label={t('Nummer', 'Number')} htmlFor="contact-number">
            <Input id="contact-number" name="number" type="tel" required maxLength={60} autoFocus />
          </Field>
        )}
        <Field label={t('Art', 'Kind')} htmlFor={`contact-phone-kind-${p?.id ?? 'new'}`}>
          <Select id={`contact-phone-kind-${p?.id ?? 'new'}`} name="kind" defaultValue={p?.kind ?? 'mobile'}>
            {PHONE_KINDS.map((k) => (
              <option key={k} value={k}>
                {pick(lang, PHONE_KIND_LABELS[k])}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[0.88rem] font-semibold text-[var(--casa-ink)]">
        <input type="checkbox" name="primary" value="1" defaultChecked={p ? p.isPrimary : false} className={box} />
        {t('Hauptnummer', 'Main number')}
      </label>
      <DialogFooter>
        <Button type="submit">{p ? t('Speichern', 'Save') : t('Hinzufügen', 'Add')}</Button>
      </DialogFooter>
    </form>
  );

  const remove = (channel: 'email' | 'phone', id: string, what: string) => (
    <form action={actions.remove}>
      <Hidden values={hidden} />
      <input type="hidden" name="channel" value={channel} />
      <input type="hidden" name="contactId" value={id} />
      <ConfirmSubmit
        title={t(`${what} entfernen?`, `Remove ${what}?`)}
        description={t('Sie wird von der Person entfernt.', 'It is removed from the person.')}
        confirmLabel={t('Entfernen', 'Remove')}
        variant="ghost"
      >
        {t('Entfernen', 'Remove')}
      </ConfirmSubmit>
    </form>
  );

  const row = 'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5';
  const head = 'text-xs font-bold text-[var(--casa-muted)]';

  return (
    <Card title={title ?? t('Kontakt', 'Contact')} icon={Icon.mail} tint="blue" actions={headerAction} className={className}>
      <div className="space-y-4">
        <section aria-label={t('E-Mail', 'Email')}>
          <h3 className={head}>{t('E-Mail', 'Email')}</h3>
          {emails.length ? (
            <ul className="divide-y divide-ws-line-soft">
              {emails.map((e) => (
                <li key={e.id} className={row}>
                  <span className="min-w-0 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <Link href={mailTo(e.address)} className="truncate font-semibold text-[var(--casa-ink)] hover:underline">
                        {e.address}
                      </Link>
                      {e.inUse && emails.length > 1 ? <Badge tone="accent">{t('Hauptadresse', 'Main address')}</Badge> : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">{emailLine(e, lang, t)}</span>
                  </span>
                  {canEdit ? (
                    <span className="flex items-center gap-1">
                      <FormDialog icon={Icon.mail} tint="blue" trigger={t('Ändern', 'Change')} title={e.address} triggerVariant="tertiary" size="sm" width="sm">
                        {emailForm(e)}
                      </FormDialog>
                      {canRemove ? remove('email', e.id, e.address) : null}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-[var(--casa-text-subtle)]">—</p>
          )}
          {canEdit ? (
            <FormDialog icon={Icon.mail} tint="blue" trigger={t('E-Mail hinzufügen', 'Add an email')} title={t('E-Mail hinzufügen', 'Add an email')} triggerVariant="tertiary" size="sm" width="sm">
              {emailForm()}
            </FormDialog>
          ) : null}
        </section>

        <section aria-label={t('Telefon', 'Phone')} className="border-t border-ws-line-soft pt-3">
          <h3 className={head}>{t('Telefon', 'Phone')}</h3>
          {phones.length ? (
            <ul className="divide-y divide-ws-line-soft">
              {phones.map((p) => (
                <li key={p.id} className={row}>
                  <span className="min-w-0 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <a href={`tel:${p.number}`} className="font-semibold text-[var(--casa-ink)] hover:underline">
                        {p.number}
                      </a>
                      {p.inUse && phones.length > 1 ? <Badge tone="accent">{t('Hauptnummer', 'Main number')}</Badge> : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">{pick(lang, PHONE_KIND_LABELS[p.kind])}</span>
                  </span>
                  {canEdit ? (
                    <span className="flex items-center gap-1">
                      <FormDialog icon={Icon.phone} tint="blue" trigger={t('Ändern', 'Change')} title={p.number} triggerVariant="tertiary" size="sm" width="sm">
                        {phoneForm(p)}
                      </FormDialog>
                      {canRemove ? remove('phone', p.id, p.number) : null}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-[var(--casa-text-subtle)]">—</p>
          )}
          {canEdit ? (
            <FormDialog icon={Icon.phone} tint="blue" trigger={t('Telefon hinzufügen', 'Add a phone')} title={t('Telefon hinzufügen', 'Add a phone')} triggerVariant="tertiary" size="sm" width="sm">
              {phoneForm()}
            </FormDialog>
          ) : null}
        </section>
        {children}
      </div>
    </Card>
  );
}
