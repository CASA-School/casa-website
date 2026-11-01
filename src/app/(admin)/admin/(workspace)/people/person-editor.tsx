'use client';

import { createContext, useContext, useEffect, useId, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { DateField } from '@/components/admin/date-picker';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { SidePanel } from '@/components/admin/side-panel';
import { Button, Field, Input, Select } from '@/components/admin/ui';
import { EMAIL_KINDS, EMAIL_KIND_LABELS, PHONE_KINDS, PHONE_KIND_LABELS } from '@/lib/admin/contact-labels';
import { pick } from '@/lib/admin/i18n';
import type { Country } from '@/lib/admin/people';
import type { PersonDetailsValues } from '@/lib/admin/person-details-input';
import { todayInputValue } from '@/lib/dates';
import { savePersonDetailsAction } from './actions';

type Section = 'person' | 'contact' | 'addresses';
const EditorContext = createContext<((section: Section) => void) | null>(null);

export function PersonEditButton({ section = 'person', variant = 'secondary' }: { section?: Section; variant?: 'primary' | 'secondary' | 'tertiary' }) {
  const open = useContext(EditorContext);
  const { t } = useWsLang();
  return open ? <Button type="button" variant={variant} size={variant === 'tertiary' ? 'sm' : 'md'} onClick={() => open(section)} aria-haspopup="dialog">{variant === 'primary' ? Icon.pen : null}{t('Bearbeiten', 'Edit')}</Button> : null;
}

/** One editor for the complete participant, retaining a draft across its sections. */
export function PersonEditor({ initial, countries, enabled, canRemove, children }: {
  initial: PersonDetailsValues; countries: Country[]; enabled: boolean; canRemove: boolean; children: ReactNode;
}) {
  const { t, lang } = useWsLang();
  const router = useRouter();
  const id = useId();
  const formId = `person-editor-${id}`;
  const form = useRef<HTMLFormElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const openingSection = useRef<Section>('person');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [section, setSection] = useState<Section>('person');
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [pending, startSaving] = useTransition();
  const dirty = JSON.stringify(draft) !== baseline;

  const jump = (next: Section, focus = false) => {
    setSection(next);
    const target = form.current?.querySelector<HTMLElement>(`[data-editor-section="${next}"]`);
    target?.scrollIntoView({ block: 'start', behavior: focus || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    if (focus) target?.querySelector<HTMLElement>('input:not([readonly]),select')?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      const target = form.current?.querySelector<HTMLElement>(`[data-editor-section="${openingSection.current}"]`);
      target?.scrollIntoView({ block: 'start' });
      target?.querySelector<HTMLElement>('input:not([readonly]),select')?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    if (!open || !dirty) return;
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [open, dirty]);

  const close = (next: boolean) => {
    if (pending) return;
    if (!next && dirty) { setDiscard(true); return; }
    setOpen(next);
  };
  const personal = (key: keyof PersonDetailsValues['person'], value: string) => setDraft(old => ({ ...old, person: { ...old.person, [key]: value } }));
  const email = (index: number, value: Partial<PersonDetailsValues['emails'][number]>) => setDraft(old => ({ ...old, emails: old.emails.map((e, i) => i === index ? { ...e, ...value } : value.primary ? { ...e, primary: false } : e) }));
  const phone = (index: number, value: Partial<PersonDetailsValues['phones'][number]>) => setDraft(old => ({ ...old, phones: old.phones.map((p, i) => i === index ? { ...p, ...value, ...(value.kind === 'emergency' ? { primary: false } : {}) } : value.primary ? { ...p, primary: false } : p) }));
  const address = (kind: 'home' | 'local', key: keyof PersonDetailsValues['addresses']['local'], value: string) => setDraft(old => ({ ...old, addresses: { ...old.addresses, [kind]: { ...old.addresses[kind], [key]: value } } }));
  const field = (key: keyof PersonDetailsValues['person'], label: string, maxLength: number, props: { type?: string; list?: string; required?: boolean; max?: string } = {}) => (
    <Field key={key} label={label} htmlFor={`${id}-${key}`}>
      <Input id={`${id}-${key}`} name={key} value={draft.person[key]} onChange={e => personal(key, e.target.value)} maxLength={maxLength} {...props} />
    </Field>
  );
  const openEditor = enabled ? (next: Section) => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fresh = structuredClone(initial);
    setDraft(fresh); setBaseline(JSON.stringify(fresh));
    setError(''); setSaved(false); setDiscard(false); setSection(next); openingSection.current = next; setOpen(true);
  } : null;

  return <EditorContext.Provider value={openEditor}>
    {children}
    {saved ? <div className="fixed right-5 bottom-5 z-50 rounded-ws-inner border border-ws-line bg-white px-4 py-3 text-sm text-[var(--casa-ink)] shadow-lg" role="status">{t('Änderungen gespeichert.', 'Changes saved.')}<button type="button" className="ml-4" aria-label={t('Schließen', 'Close')} onClick={() => setSaved(false)}>×</button></div> : null}
    {enabled ? <SidePanel open={open} onOpenChange={close} onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }} title={`${initial.person.firstName} ${initial.person.lastName}`.trim()} subtitle={t('Teilnehmende bearbeiten', 'Edit student')} width="lg" className="casa-person-editor" footer={
      <>
        {discard ? <div className="mb-3 flex flex-wrap items-center gap-3 rounded-ws-field border border-[#ebdfc7] bg-[#fffaf0] px-3 py-2.5" role="alert"><span className="mr-auto text-xs">{t('Änderungen noch nicht gespeichert.', 'You have unsaved changes.')}</span><Button type="button" variant="tertiary" size="sm" onClick={() => setDiscard(false)}>{t('Weiter bearbeiten', 'Keep editing')}</Button><Button type="button" variant="tertiary" size="sm" onClick={() => { setOpen(false); setDiscard(false); trigger.current?.focus(); }}>{t('Verwerfen', 'Discard')}</Button></div> : null}
        <div className="flex items-center justify-end gap-2"><span className="mr-auto hidden text-xs text-[var(--casa-muted)] min-[400px]:inline" aria-live="polite">{pending ? t('Wird gespeichert …', 'Saving …') : dirty ? t('Ungespeicherte Änderungen', 'Unsaved changes') : t('Keine Änderungen', 'No changes')}</span><Button type="button" variant="secondary" disabled={pending} onClick={() => close(false)}>{t('Abbrechen', 'Cancel')}</Button><Button type="submit" form={formId} disabled={pending || !dirty}>{pending ? t('Wird gespeichert …', 'Saving …') : t('Speichern', 'Save')}</Button></div>
      </>
    }>
      <nav aria-label={t('Bearbeitungsbereich', 'Editing section')} className="sticky top-0 z-10 flex gap-6 border-b border-ws-line bg-white px-6">
        {([['person', t('Person', 'Person')], ['contact', t('Kontakt', 'Contact')], ['addresses', t('Adressen', 'Addresses')]] as const).map(([key, label]) => <button type="button" key={key} onClick={() => jump(key)} aria-current={section === key ? 'location' : undefined} className={`border-b-2 py-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 ${section === key ? 'border-[var(--fm-navy)] text-[var(--fm-navy)]' : 'border-transparent text-[var(--casa-muted)]'}`}>{label}</button>)}
      </nav>
      <form id={formId} ref={form} onSubmit={event => {
        event.preventDefault(); setError('');
        startSaving(async () => {
          try {
            const result = await savePersonDetailsAction(draft);
            if (!result.ok) { setError(result.error); return; }
            setOpen(false); setSaved(true); router.refresh(); trigger.current?.focus();
          } catch { setError(t('Speichern war nicht möglich. Deine Eingaben bleiben erhalten.', 'Unable to save. Your draft has been preserved.')); }
        });
      }} className="px-6 pb-6">
        {error ? <p role="alert" className="mt-4 rounded-ws-field border border-[var(--casa-danger-text)]/20 bg-[var(--casa-danger)]/5 px-3 py-2 text-sm text-[var(--casa-danger-text)]">{error}</p> : null}
        <fieldset disabled={pending} className="min-w-0">
          <section data-editor-section="person" className="scroll-mt-16 border-b border-ws-line-soft py-6">
            <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold">{Icon.person}{t('Persönliche Angaben', 'Personal details')}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('firstName', t('Vorname', 'First name'), 80, { required: true })}{field('lastName', t('Nachname', 'Last name'), 80)}
              <Field label={t('Anrede', 'Salutation')} htmlFor={`${id}-salutation`}><Select id={`${id}-salutation`} value={draft.person.salutation} onChange={e => personal('salutation', e.target.value)}><option value="">{t('Keine Angabe', 'Not specified')}</option><option value="ms">{t('Frau', 'Ms')}</option><option value="mr">{t('Herr', 'Mr')}</option><option value="mx">Mx</option><option value="neutral">{t('Keine Anrede', 'No salutation')}</option></Select></Field>
              <Field label={t('Geburtsdatum', 'Date of birth')} htmlFor={`${id}-birthDate`}><DateField id={`${id}-birthDate`} ariaLabel={t('Geburtsdatum', 'Date of birth')} value={draft.person.birthDate || null} onChange={value => personal('birthDate', value ?? '')} max={todayInputValue()} /></Field>
              {field('nationality', t('Nationalität', 'Nationality'), 120, { list: `${id}-countries` })}{field('motherTongue', t('Muttersprache', 'Mother tongue'), 80)}
            </div>
            <details className="mt-5 border-t border-ws-line-soft pt-4"><summary className="cursor-pointer text-xs font-semibold text-[var(--casa-muted)]">{t('Weitere persönliche Angaben', 'More personal details')}</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">{field('secondLastName', t('Zweiter Nachname', 'Second surname'), 80)}{field('nickname', t('Rufname', 'Nickname'), 60)}{field('birthPlace', t('Geburtsort', 'Place of birth'), 120)}{field('birthCountry', t('Geburtsland', 'Country of birth'), 120, { list: `${id}-countries` })}{!draft.person.birthDate ? field('birthYear', t('Geburtsjahr', 'Year of birth'), 4) : null}{field('occupation', t('Beruf', 'Occupation'), 120)}{field('passportNumber', t('Passnummer', 'Passport number'), 40)}</div></details>
          </section>
          <section data-editor-section="contact" className="scroll-mt-16 border-b border-ws-line-soft py-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">{Icon.mail}{t('Kontakt', 'Contact')}</h3>
            {draft.emails.map((e, index) => <div key={e.id ?? `new-email-${index}`} className="mb-4 border-b border-ws-line-soft pb-4 last:border-0">
              {e.remove ? <div className="flex items-center justify-between gap-2 text-xs text-[var(--casa-muted)]"><span>{e.address} · {t('Wird entfernt', 'Will be removed')}</span><Button type="button" variant="tertiary" size="sm" onClick={() => email(index, { remove: false })}>{t('Rückgängig', 'Undo')}</Button></div> : <>
                <Field label={t('E-Mail-Adresse', 'Email address')} htmlFor={`${id}-email-${index}`}><Input id={`${id}-email-${index}`} type="email" value={e.address} readOnly={Boolean(e.id)} required={!e.id} maxLength={200} onChange={event => email(index, { address: event.target.value })} className={e.id ? 'bg-[#fafbfd] text-[var(--casa-muted)]' : undefined} /></Field>
                <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label={t('Art', 'Kind')} htmlFor={`${id}-email-kind-${index}`}><Select id={`${id}-email-kind-${index}`} value={e.kind} onChange={event => email(index, { kind: event.target.value as typeof e.kind })}>{EMAIL_KINDS.map(k => <option key={k} value={k}>{pick(lang, EMAIL_KIND_LABELS[k])}</option>)}</Select></Field><Field label={t('Notiz', 'Note')} htmlFor={`${id}-email-note-${index}`}><Input id={`${id}-email-note-${index}`} maxLength={120} value={e.note} onChange={event => email(index, { note: event.target.value })} /></Field></div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-xs"><input type="radio" name={`${id}-preferred-email`} checked={e.primary} onChange={() => email(index, { primary: true })} className="size-4 accent-[var(--fm-navy)]" />{t('Bevorzugte Adresse', 'Preferred address')}</label>{canRemove || !e.id ? <Button type="button" variant="tertiary" size="sm" onClick={() => e.id ? email(index, { remove: true, primary: false }) : setDraft(old => ({ ...old, emails: old.emails.filter((_, i) => i !== index) }))}>{t('Entfernen', 'Remove')}</Button> : null}</div>
              </>}
            </div>)}
            <Button type="button" variant="tertiary" size="sm" onClick={() => setDraft(old => ({ ...old, emails: [...old.emails, { id: null, address: '', note: '', kind: 'personal', primary: false, remove: false }] }))}>{Icon.plus}{t('E-Mail hinzufügen', 'Add email')}</Button>
            <div className="mt-6 border-t border-ws-line-soft pt-5">
              {draft.phones.map((p, index) => <div key={p.id ?? `new-phone-${index}`} className="mb-4 border-b border-ws-line-soft pb-4">
                {p.remove ? <div className="flex items-center justify-between gap-2 text-xs text-[var(--casa-muted)]"><span>{p.number} · {t('Wird entfernt', 'Will be removed')}</span><Button type="button" variant="tertiary" size="sm" onClick={() => phone(index, { remove: false })}>{t('Rückgängig', 'Undo')}</Button></div> : <><div className="grid gap-3 sm:grid-cols-2"><Field label={t('Telefon', 'Phone')} htmlFor={`${id}-phone-${index}`}><Input id={`${id}-phone-${index}`} type="tel" value={p.number} readOnly={Boolean(p.id)} required={!p.id} maxLength={60} onChange={event => phone(index, { number: event.target.value })} /></Field><Field label={t('Art', 'Kind')} htmlFor={`${id}-phone-kind-${index}`}><Select id={`${id}-phone-kind-${index}`} value={p.kind} onChange={event => phone(index, { kind: event.target.value as typeof p.kind })}>{PHONE_KINDS.map(k => <option key={k} value={k}>{pick(lang, PHONE_KIND_LABELS[k])}</option>)}</Select></Field></div><div className="mt-3 flex items-center justify-between gap-2"><label className="flex items-center gap-2 text-xs"><input type="radio" name={`${id}-preferred-phone`} checked={p.primary} disabled={p.kind === 'emergency'} onChange={() => phone(index, { primary: true })} className="size-4 accent-[var(--fm-navy)]" />{t('Bevorzugte Nummer', 'Preferred number')}</label>{canRemove || !p.id ? <Button type="button" variant="tertiary" size="sm" onClick={() => p.id ? phone(index, { remove: true, primary: false }) : setDraft(old => ({ ...old, phones: old.phones.filter((_, i) => i !== index) }))}>{t('Entfernen', 'Remove')}</Button> : null}</div></>}
              </div>)}
              <Button type="button" variant="tertiary" size="sm" onClick={() => setDraft(old => ({ ...old, phones: [...old.phones, { id: null, number: '', kind: 'mobile', primary: false, remove: false }] }))}>{Icon.plus}{t('Telefon hinzufügen', 'Add phone')}</Button>
            </div>
          </section>
          <section data-editor-section="addresses" className="scroll-mt-16 py-6">
            <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold">{Icon.home}{t('Adressen', 'Addresses')}</h3>
            {(['local', 'home'] as const).map(kind => <fieldset key={kind} className="mb-6 min-w-0 last:mb-0"><legend className="mb-3 text-xs font-semibold text-[var(--casa-muted)]">{kind === 'local' ? t('In Bremen', 'In Bremen') : t('Zuhause', 'At home')}</legend><div className="grid gap-4 sm:grid-cols-2">{([['street',t('Straße und Hausnummer','Street and number'),160],['postcode',t('PLZ','Postcode'),20],['city',t('Ort','City'),120],['country',t('Land','Country'),120]] as const).map(([key,label,max]) => <Field key={key} label={label} htmlFor={`${id}-${kind}-${key}`} className={key === 'street' || key === 'country' ? 'sm:col-span-2' : undefined}><Input id={`${id}-${kind}-${key}`} value={draft.addresses[kind][key]} maxLength={max} list={key === 'country' ? `${id}-countries` : undefined} onChange={event => address(kind, key, event.target.value)} /></Field>)}</div></fieldset>)}
          </section>
        </fieldset>
        <datalist id={`${id}-countries`}>{countries.map(c => <option key={c.code} value={c.name} />)}</datalist>
      </form>
    </SidePanel> : null}
  </EditorContext.Provider>;
}
