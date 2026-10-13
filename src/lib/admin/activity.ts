import { query } from './db';
import type { StaffUser } from './auth';
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
  const noun = queue ? queueLabel(queue).toLowerCase() : entity.replace(/_/g, ' ');
  return `${article(noun)} ${noun}`;
};

const statusLabel = (value: unknown) =>
  typeof value === 'string' && value in STATUS_LABELS
    ? STATUS_LABELS[value as WorkStatus]
    : String(value ?? '—');

/**
 * One sentence per entry, in plain English.
 *
 * Kept out of the component so both the overview feed and a record's own trail
 * read identically — a trail that phrases the same event two ways makes staff
 * doubt whether it is the same event.
 */
export function describeActivity(entry: ActivityEntry): string {
  const subject = subjectOf(entry.entity);

  switch (entry.action) {
    case 'status_changed':
      return `moved ${subject} from ${statusLabel(entry.detail?.from)} to ${statusLabel(
        entry.detail?.to
      )}`;
    case 'assigned':
      return `assigned ${subject} to ${String(entry.detail?.to ?? 'someone')}`;
    case 'unassigned':
      return `removed the owner from ${subject}`;
    case 'note_added':
      return `added a note to ${subject}`;
    case 'cv_downloaded':
      return `downloaded the CV on ${subject}`;
    case 'person_created':
      return 'added a person';
    case 'person_updated':
      return 'edited a person';
    case 'person_deleted':
      return 'deleted a person';
    case 'room_created':
      return 'added a room';
    case 'room_updated':
      return 'edited a room';
    case 'room_deleted':
      return 'deleted a room';
    case 'room_assigned':
      return 'put a cohort in a room';
    case 'room_unassigned':
      return 'took a cohort out of its room';
    case 'booking_created':
      return 'created a booking';
    case 'booking_updated':
      return 'edited a booking';
    case 'booking_extended':
      return 'extended a booking';
    case 'booking_period_removed':
      return 'removed dates from a booking';
    case 'charge_added':
      return 'added a cost line';
    case 'charge_removed':
      return 'removed a cost line';
    case 'payment_recorded':
      return 'recorded a payment';
    case 'payment_voided':
      return 'voided a payment';
    case 'booking_cancelled':
      return 'cancelled a booking';
    case 'booking_deleted':
      return 'deleted a booking';
    case 'cohort_created':
      return 'scheduled a cohort';
    case 'shift_saved':
      return 'planned a shift on the rota';
    case 'shift_removed':
      return 'took a shift off the rota';
    case 'shifts_copied':
      return `copied last week's shifts into the rota${typeof entry.detail?.count === 'number' ? ` (${entry.detail.count})` : ''}`;
    case 'absence_saved':
      // Never the reason: Activity is read by the whole team.
      return 'recorded an absence on the rota';
    case 'absence_deleted':
      return 'removed an absence from the rota';
    case 'person_linked':
      return 'linked a duplicate person record to the existing one';
    case 'person_unlinked':
      return 'undid a person link';
    case 'flag_resolved':
      return `cleared a flag on ${subject}`;
    case 'review_attached_to_person':
      return 'attached a placement review to a person';
    case 'review_detached_from_person':
      return 'detached a placement review from a person';
    case 'placement_confirmed':
      return `confirmed a placement at ${String(entry.detail?.level ?? 'a level')}`;
    case 'staff_invited':
      return `created an account for ${String(entry.detail?.email ?? 'a colleague')}`;
    case 'staff_deactivated':
      return `deactivated ${String(entry.detail?.email ?? 'an account')}`;
    case 'staff_reactivated':
      return `reactivated ${String(entry.detail?.email ?? 'an account')}`;
    case 'staff_updated':
      return `updated the account ${String(entry.detail?.email ?? '')}`.trim();
    case 'staff_microsoft_unlinked':
      return 'unlinked an account from Microsoft';
    case 'staff_password_changed':
      return 'changed their password';
    case 'staff_role_changed':
      return `changed ${String(entry.detail?.email ?? 'an account')} to ${String(
        entry.detail?.to ?? 'a new role'
      )}`;
    case 'offer_created':
      return 'created an offer';
    case 'offer_duplicated':
      return 'made an offer from an earlier one';
    case 'offer_sent':
      return 'sent an offer';
    case 'offer_accepted':
      return 'recorded an offer as accepted';
    case 'offer_declined':
      return 'recorded an offer as declined';
    case 'offer_withdrawn':
      return 'withdrew an offer';
    case 'offer_revised':
      return 'reopened an offer to revise it';
    case 'offer_deleted':
      return 'deleted an offer';
    case 'letter_standard_text_changed':
      return `changed the standard ${entry.detail?.part === 'closing' ? 'closing' : 'opening'} of ${entry.detail?.language === 'de' ? 'German' : 'English'} offers`;
    case 'week.saved':
      return `planned the ${shiftWord(entry.detail?.shift)} week from ${listName(entry.detail?.weekStart)} in Kursplanung`;
    case 'month.created':
      return 'set up a new month in Kursplanung';
    case 'pairs.filled':
      return `filled the ${shiftWord(entry.detail?.shift)} teacher pairs in Kursplanung`;
    case 'rules.saved':
      return 'changed a teacher’s availability in Kursplanung';
    case 'group.added':
      return 'added a group in Kursplanung';
    case 'group.saved':
      return 'changed a group in Kursplanung';
    case 'group.removed':
      return 'removed a group in Kursplanung';
    case 'task_updated':
      return 'changed a task on the day board';
    case 'task_deleted':
      return 'took a task off the day board';
    case 'prices_changed': {
      const n = Array.isArray(entry.detail?.changes) ? entry.detail.changes.length : 0;
      return `changed ${n === 1 ? 'a price' : `${n} prices`} in the price list from ${listName(entry.detail?.list)}`;
    }
    case 'price_list_prepared':
      return `prepared the price list from ${listName(entry.detail?.list)}`;
    case 'price_list_deleted':
      return `deleted the price list from ${listName(entry.detail?.list)}`;
    case 'website_published':
      return `published ${texts(entry)} on the website`;
    case 'website_scheduled':
      return `scheduled ${texts(entry)} for the website`;
    case 'website_review_requested':
      return `asked for approval of ${texts(entry)}`;
    case 'website_approved':
      return `approved and published ${texts(entry)}`;
    case 'website_rejected':
      return `sent ${texts(entry)} back to drafts`;
    case 'website_undone':
      return `took ${texts(entry)} back off the website`;
    case 'website_cancelled':
      return `withdrew ${texts(entry)} before they went live`;
    default:
      return `${entry.action.replace(/_/g, ' ')} on ${subject}`;
  }
}

function texts(entry: ActivityEntry): string {
  const count = Number(entry.detail?.count ?? 0);
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

/** "1 January 2027", the way a price list is named. */
const listName = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : 'a date';

const shiftWord = (value: unknown) => (value === 'afternoon' ? 'afternoon' : value === 'morning' ? 'morning' : 'course');

