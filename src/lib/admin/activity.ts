import { query } from './db';
import type { StaffUser } from './auth';
import { pick, translator, wsLocale, type WsLang } from './i18n';
import { queueLabel, queuePath, STATUS_LABELS, type QueueEntity, type WorkStatus } from './queues';

/**
 * The activity trail.
 *
 * Written by the mutations in `queues.ts`, `notes.ts` and the placement review
 * action — never from a page. `staff_name` is denormalised into the row so a
 * deleted account does not turn six months of history into "unknown".
 */

export type ActivityEntry = {
  id: string;
  staffName: string | null;
  entity: string;
  entityId: string | null;
  action: string;
  detail: Record<string, unknown> | null;
  createdAt: Date;
};

export async function logActivity({
  actor,
  entity,
  entityId,
  action,
  detail,
}: {
  actor: StaffUser;
  entity: string;
  entityId: string | null;
  action: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action, detail)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [actor.id, actor.name, entity, entityId, action, detail ? JSON.stringify(detail) : null]
  );
}

/**
 * The latest entries across the whole workspace.
 *
 * Entries about job applications — a status change, a note, a CV download —
 * only when asked for, because each links to the application's record. The
 * caller passes `canAccess(user, 'applications')`.
 */
export async function recentActivity(
  limit = 12,
  { includeApplications = false }: { includeApplications?: boolean } = {}
): Promise<ActivityEntry[]> {
  const rows = await query<{
    id: string;
    staff_name: string | null;
    entity: string;
    entity_id: string | null;
    action: string;
    detail: Record<string, unknown> | null;
    created_at: Date;
  }>(
    `SELECT id, staff_name, entity, entity_id, action, detail, created_at
       FROM staff_activity
      WHERE $2::boolean OR entity <> 'career_application'
      ORDER BY created_at DESC
      LIMIT $1`,
    [limit, includeApplications]
  );

  return rows.map((row) => ({
    id: String(row.id),
    staffName: row.staff_name,
    entity: row.entity,
    entityId: row.entity_id,
    action: row.action,
    detail: row.detail,
    createdAt: row.created_at,
  }));
}

export async function activityFor(
  entity: string,
  entityId: string,
  limit = 20
): Promise<ActivityEntry[]> {
  const rows = await query<{
    id: string;
    staff_name: string | null;
    entity: string;
    entity_id: string | null;
    action: string;
    detail: Record<string, unknown> | null;
    created_at: Date;
  }>(
    `SELECT id, staff_name, entity, entity_id, action, detail, created_at
       FROM staff_activity
      WHERE entity = $1 AND entity_id = $2
      ORDER BY created_at DESC
      LIMIT $3`,
    [entity, entityId, limit]
  );

  return rows.map((row) => ({
    id: String(row.id),
    staffName: row.staff_name,
    entity: row.entity,
    entityId: row.entity_id,
    action: row.action,
    detail: row.detail,
    createdAt: row.created_at,
  }));
}

const KNOWN_QUEUES = new Set<string>([
  'enquiry',
  'course_registration',
  'exam_registration',
  'career_application',
]);

const asQueue = (entity: string) => (KNOWN_QUEUES.has(entity) ? (entity as QueueEntity) : null);

/**
 * "an enquiry", not "a enquiry".
 *
 * Small, and worth having: the trail is the most-read prose in the workspace
 * and it is read as a sentence, so a wrong article in every third line makes
 * the whole screen look machine-generated. A vowel test is enough here because
 * the noun set is closed — the four queue labels plus the entity names — and
 * none of them is a "a university" case.
 */
const article = (noun: string) => (/^[aeiou]/i.test(noun) ? 'an' : 'a');

/** "an enquiry" / "a course registration". */
const subjectOf = (entity: string) => {
  const queue = asQueue(entity);
  const noun = queue ? queueLabel(queue, 'en').toLowerCase() : entity.replace(/_/g, ' ');
  return `${article(noun)} ${noun}`;
};

/**
 * The same in German, where the article follows the noun's gender and the
 * case: "eine Anfrage" (accusative), "einer Anfrage" (dative). The records a
 * trail line can name; anything else is named as stored, as in English.
 */
const NOUNS_DE: Record<string, { noun: string; gender: 'f' | 'm' | 'n' }> = {
  enquiry: { noun: 'Anfrage', gender: 'f' },
  course_registration: { noun: 'Kursanmeldung', gender: 'f' },
  exam_registration: { noun: 'Prüfungsanmeldung', gender: 'f' },
  career_application: { noun: 'Bewerbung', gender: 'f' },
  placement_attempt: { noun: 'Einstufungstest', gender: 'm' },
  booking: { noun: 'Buchung', gender: 'f' },
  person: { noun: 'Person', gender: 'f' },
  offer: { noun: 'Angebot', gender: 'n' },
  room: { noun: 'Raum', gender: 'm' },
};

const ARTICLES_DE = {
  acc: { f: 'eine', m: 'einen', n: 'ein' },
  dat: { f: 'einer', m: 'einem', n: 'einem' },
} as const;

const subjectDe = (entity: string, grammaticalCase: 'acc' | 'dat') => {
  const known = NOUNS_DE[entity];
  return known ? `${ARTICLES_DE[grammaticalCase][known.gender]} ${known.noun}` : entity.replace(/_/g, ' ');
};

const statusLabel = (value: unknown, lang: WsLang) =>
  typeof value === 'string' && value in STATUS_LABELS
    ? pick(lang, STATUS_LABELS[value as WorkStatus])
    : String(value ?? '—');

/**
 * One sentence per entry, in plain English or German — the colleague's name
 * goes before it ("Anna moved …", "Anna hat … gesetzt").
 *
 * Kept out of the component so both the overview feed and a record's own trail
 * read identically — a trail that phrases the same event two ways makes staff
 * doubt whether it is the same event.
 */
export function describeActivity(entry: ActivityEntry, lang: WsLang): string {
  const t = translator(lang);
  const subject = subjectOf(entry.entity);
  const acc = subjectDe(entry.entity, 'acc');
  const dat = subjectDe(entry.entity, 'dat');
  const email = (de: string, en: string) => String(entry.detail?.email ?? t(de, en));
  const from = fromDate(entry.detail?.list, lang);

  switch (entry.action) {
    case 'status_changed': {
      const was = statusLabel(entry.detail?.from, lang);
      const now = statusLabel(entry.detail?.to, lang);
      return t(`hat ${acc} von ${was} auf ${now} gesetzt`, `moved ${subject} from ${was} to ${now}`);
    }
    case 'assigned': {
      const to = String(entry.detail?.to ?? t('jemanden', 'someone'));
      return t(`hat ${to} als zuständig für ${acc} eingetragen`, `assigned ${subject} to ${to}`);
    }
    case 'unassigned':
      return t(`hat die Zuständigkeit für ${acc} entfernt`, `removed the owner from ${subject}`);
    case 'note_added':
      return t(`hat eine Notiz zu ${dat} hinzugefügt`, `added a note to ${subject}`);
    case 'cv_downloaded':
      return t(`hat den Lebenslauf zu ${dat} heruntergeladen`, `downloaded the CV on ${subject}`);
    case 'person_created':
      return t('hat eine Person angelegt', 'added a person');
    case 'person_updated':
      return t('hat eine Person bearbeitet', 'edited a person');
    case 'person_address_updated':
      return t('hat eine Adresse geändert', 'changed an address');
    case 'person_private_updated':
      return t('hat Steuer- und Versicherungsnummern geändert', 'changed tax and insurance numbers');
    case 'bank_account_added':
      return t('hat eine Bankverbindung hinzugefügt', 'added a bank account');
    case 'bank_account_updated':
      return t('hat eine Bankverbindung geändert', 'changed a bank account');
    case 'bank_account_removed':
      return t('hat eine Bankverbindung entfernt', 'removed a bank account');
    case 'person_deleted':
      return t('hat eine Person gelöscht', 'deleted a person');
    case 'room_created':
      return t('hat einen Raum angelegt', 'added a room');
    case 'room_updated':
      return t('hat einen Raum bearbeitet', 'edited a room');
    case 'room_deleted':
      return t('hat einen Raum gelöscht', 'deleted a room');
    case 'room_assigned':
      return t('hat eine Kursgruppe einem Raum zugeordnet', 'put a cohort in a room');
    case 'room_unassigned':
      return t('hat eine Kursgruppe aus ihrem Raum genommen', 'took a cohort out of its room');
    case 'booking_created':
      return t('hat eine Buchung angelegt', 'created a booking');
    case 'booking_updated':
      return t('hat eine Buchung bearbeitet', 'edited a booking');
    case 'booking_extended':
      return t('hat eine Buchung verlängert', 'extended a booking');
    case 'booking_period_removed':
      return t('hat einen Zeitraum aus einer Buchung entfernt', 'removed dates from a booking');
    case 'charge_added':
      return t('hat eine Kostenposition hinzugefügt', 'added a cost line');
    case 'charge_removed':
      return t('hat eine Kostenposition entfernt', 'removed a cost line');
    case 'payment_recorded':
      return t('hat eine Zahlung erfasst', 'recorded a payment');
    case 'payment_voided':
      return t('hat eine Zahlung storniert', 'voided a payment');
    case 'credit_carried_over':
    case 'credit_received': {
      const amount = typeof entry.detail?.amount === 'number' ? `${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(entry.detail.amount)} ` : '';
      return entry.action === 'credit_carried_over'
        ? t(`hat ${amount}Guthaben auf eine andere Buchung übertragen`, `carried ${amount}credit over to another booking`)
        : t(`hat ${amount}Guthaben von einer anderen Buchung übertragen`, `carried ${amount}credit over from another booking`);
    }
    case 'booking_cancelled':
      return t('hat eine Buchung storniert', 'cancelled a booking');
    case 'booking_observed':
      return t('hat eine Buchung unter Beobachtung gestellt', 'put a booking under observation');
    case 'booking_observation_ended':
      return t('hat die Beobachtung einer Buchung beendet', 'ended the observation of a booking');
    case 'booking_deleted':
      return t('hat eine Buchung gelöscht', 'deleted a booking');
    case 'cohort_created':
      return t('hat eine Kursgruppe angesetzt', 'scheduled a cohort');
    case 'person_linked':
      return t(
        'hat einen doppelten Personeneintrag mit dem vorhandenen verknüpft',
        'linked a duplicate person record to the existing one'
      );
    case 'person_unlinked':
      return t('hat eine Personenverknüpfung aufgehoben', 'undid a person link');
    case 'flag_resolved':
      return t(`hat einen Hinweis zu ${dat} erledigt`, `cleared a flag on ${subject}`);
    case 'review_attached_to_person':
      return t('hat eine Einstufung einer Person zugeordnet', 'attached a placement review to a person');
    case 'review_detached_from_person':
      return t('hat eine Einstufung von einer Person gelöst', 'detached a placement review from a person');
    case 'placement_confirmed': {
      const level = entry.detail?.level;
      const against = entry.detail?.agreed === false;
      return t(
        `hat eine Einstufung auf ${String(level ?? 'ein Niveau')} bestätigt${against ? ', entgegen der Empfehlung' : ''}`,
        `confirmed a placement at ${String(level ?? 'a level')}${against ? ', against the recommendation' : ''}`
      );
    }
    case 'staff_invited':
      return t(
        `hat ein Konto für ${email('jemanden aus dem Team', 'a colleague')} angelegt`,
        `created an account for ${email('jemanden aus dem Team', 'a colleague')}`
      );
    case 'staff_deactivated':
      return t(`hat ${email('ein Konto', 'an account')} deaktiviert`, `deactivated ${email('ein Konto', 'an account')}`);
    case 'staff_reactivated':
      return t(
        `hat ${email('ein Konto', 'an account')} wieder aktiviert`,
        `reactivated ${email('ein Konto', 'an account')}`
      );
    case 'staff_updated':
      return t(
        `hat das Konto ${String(entry.detail?.email ?? '')} bearbeitet`.replace(/\s+/g, ' '),
        `updated the account ${String(entry.detail?.email ?? '')}`.trim()
      );
    case 'staff_microsoft_unlinked':
      return t('hat ein Konto von Microsoft getrennt', 'unlinked an account from Microsoft');
    case 'staff_password_changed':
      return t('hat das eigene Passwort geändert', 'changed their password');
    case 'staff_role_changed': {
      const role = String(entry.detail?.to ?? t('eine neue Rolle', 'a new role'));
      return t(
        `hat die Rolle von ${email('einem Konto', 'an account')} auf ${role} geändert`,
        `changed ${email('einem Konto', 'an account')} to ${role}`
      );
    }
    case 'offer_created':
      return t('hat ein Angebot angelegt', 'created an offer');
    case 'offer_duplicated':
      return t('hat ein Angebot aus einem früheren erstellt', 'made an offer from an earlier one');
    case 'offer_sent':
      return t('hat ein Angebot gesendet', 'sent an offer');
    case 'offer_accepted':
      return t('hat ein Angebot als angenommen erfasst', 'recorded an offer as accepted');
    case 'offer_declined':
      return t('hat ein Angebot als abgelehnt erfasst', 'recorded an offer as declined');
    case 'offer_withdrawn':
      return t('hat ein Angebot zurückgezogen', 'withdrew an offer');
    case 'offer_revised':
      return t('hat ein Angebot zur Überarbeitung wieder geöffnet', 'reopened an offer to revise it');
    case 'offer_deleted':
      return t('hat ein Angebot gelöscht', 'deleted an offer');
    case 'letter_standard_text_changed': {
      const closing = entry.detail?.part === 'closing';
      const german = entry.detail?.language === 'de';
      return t(
        `hat ${closing ? 'den Standardschluss' : 'die Standardeinleitung'} der ${german ? 'deutschen' : 'englischen'} Angebote geändert`,
        `changed the standard ${closing ? 'closing' : 'opening'} of ${german ? 'German' : 'English'} offers`
      );
    }
    case 'week.saved':
      return t(
        `hat die ${shiftWeekDe(entry.detail?.shift)} ${fromDate(entry.detail?.weekStart, lang)} in der Kursplanung geplant`,
        `planned the ${shiftWord(entry.detail?.shift)} week ${fromDate(entry.detail?.weekStart, lang)} in Kursplanung`
      );
    case 'month.created':
      return t('hat in der Kursplanung einen neuen Monat angelegt', 'set up a new month in Kursplanung');
    case 'pairs.filled':
      return t(
        `hat die Lehrkräftepaare${shiftDe(entry.detail?.shift)} in der Kursplanung besetzt`,
        `filled the ${shiftWord(entry.detail?.shift)} teacher pairs in Kursplanung`
      );
    case 'rules.saved':
      return t(
        'hat die Verfügbarkeit einer Lehrkraft in der Kursplanung geändert',
        'changed a teacher’s availability in Kursplanung'
      );
    case 'group.added':
      return t('hat in der Kursplanung eine Gruppe hinzugefügt', 'added a group in Kursplanung');
    case 'group.saved':
      return t('hat in der Kursplanung eine Gruppe geändert', 'changed a group in Kursplanung');
    case 'group.removed':
      return t('hat in der Kursplanung eine Gruppe entfernt', 'removed a group in Kursplanung');
    case 'task_updated':
      return t('hat eine Aufgabe im Tagesplan geändert', 'changed a task on the day board');
    case 'task_deleted':
      return t('hat eine Aufgabe aus dem Tagesplan genommen', 'took a task off the day board');
    case 'prices_changed': {
      const n = Array.isArray(entry.detail?.changes) ? entry.detail.changes.length : 0;
      return t(
        `hat ${n === 1 ? 'einen Preis' : `${n} Preise`} in der Preisliste ${from} geändert`,
        `changed ${n === 1 ? 'a price' : `${n} prices`} in the price list ${from}`
      );
    }
    case 'price_list_prepared':
      return t(`hat die Preisliste ${from} vorbereitet`, `prepared the price list ${from}`);
    case 'price_list_deleted':
      return t(`hat die Preisliste ${from} gelöscht`, `deleted the price list ${from}`);
    case 'website_published':
      return t(`hat ${texts(entry, lang)} auf der Website veröffentlicht`, `published ${texts(entry, lang)} on the website`);
    case 'website_scheduled':
      return t(`hat ${texts(entry, lang)} für die Website eingeplant`, `scheduled ${texts(entry, lang)} for the website`);
    case 'website_review_requested':
      return t(`hat um Freigabe für ${texts(entry, lang)} gebeten`, `asked for approval of ${texts(entry, lang)}`);
    case 'website_approved':
      return t(`hat ${texts(entry, lang)} freigegeben und veröffentlicht`, `approved and published ${texts(entry, lang)}`);
    case 'website_rejected':
      return t(`hat ${texts(entry, lang)} zurück in die Entwürfe geschickt`, `sent ${texts(entry, lang)} back to drafts`);
    case 'website_undone':
      return t(`hat ${texts(entry, lang)} wieder von der Website genommen`, `took ${texts(entry, lang)} back off the website`);
    case 'website_cancelled':
      return t(
        `hat ${texts(entry, lang)} vor der Veröffentlichung zurückgezogen`,
        `withdrew ${texts(entry, lang)} before they went live`
      );
    default:
      return t(`${entry.action.replace(/_/g, ' ')} bei ${dat}`, `${entry.action.replace(/_/g, ' ')} on ${subject}`);
  }
}

function texts(entry: ActivityEntry, lang: WsLang): string {
  const count = Number(entry.detail?.count ?? 0);
  if (lang === 'de') return count === 1 ? 'einen Text' : count > 1 ? `${count} Texte` : 'Texte';
  return count === 1 ? 'one text' : count > 1 ? `${count} texts` : 'texts';
}

/** Where an entry points, when it points anywhere. */
export function activityHref(entry: ActivityEntry): string | null {
  const queue = asQueue(entry.entity);

  if (queue && entry.entityId) {
    return `${queuePath(queue)}/${entry.entityId}`;
  }

  if (entry.entity === 'placement_attempt' && entry.entityId) {
    return `/admin/placement/${entry.entityId}`;
  }

  if (entry.entity === 'person' && entry.entityId) {
    return `/admin/people/${entry.entityId}`;
  }

  if (entry.entity === 'room' && entry.entityId) {
    return `/admin/settings/rooms/${entry.entityId}`;
  }

  if (entry.entity === 'booking' && entry.entityId) {
    return `/admin/bookings/${entry.entityId}`;
  }

  if (entry.entity === 'offer' && entry.entityId && entry.action !== 'offer_deleted') {
    return `/admin/offers/${entry.entityId}`;
  }

  if (entry.entity === 'website_release') {
    return '/admin/website';
  }

  return null;
}

/** "from 1 January 2027" / "ab dem 1. Januar 2027", the way a price list is named. */
function fromDate(value: unknown, lang: WsLang): string {
  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00Z`).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
      : null;
  if (lang === 'de') return date ? `ab dem ${date}` : 'ab einem Datum';
  return `from ${date ?? 'a date'}`;
}

const shiftWord = (value: unknown) => (value === 'afternoon' ? 'afternoon' : value === 'morning' ? 'morning' : 'course');

/** "Vormittagswoche" — the week of a shift, in German. */
const shiftWeekDe = (value: unknown) =>
  value === 'afternoon' ? 'Nachmittagswoche' : value === 'morning' ? 'Vormittagswoche' : 'Kurswoche';

/** " am Vormittag" — a shift after a noun, in German; nothing for the course as a whole. */
const shiftDe = (value: unknown) => (value === 'afternoon' ? ' am Nachmittag' : value === 'morning' ? ' am Vormittag' : '');

