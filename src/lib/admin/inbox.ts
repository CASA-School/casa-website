import { queryFirst } from './db';
import type { QueueEntity } from './queues';

/**
 * What the three inboxes — enquiries, registrations, applications — share in
 * their reads (Rahman, 2026-10-15: "they share global design properties so if
 * we change something it gets reflected all over"): a week, a history before
 * it, what counts as open and as closed, and the head's counts. Each queue's
 * own list function adds its columns and its search; the period and the state
 * come from here, so the four lists cannot drift apart.
 */

/**
 * The start of the week: midnight in Bremen six days ago, so the week is today
 * and the six days before it. Everything earlier is the history.
 */
const WEEK_START = `((date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') - interval '6 days') AT TIME ZONE 'Europe/Berlin')`;

/** The week, the history before it, or (for a search) everything. */
export type InboxPeriod = 'week' | 'history' | 'all';

/** Within a period: every state but spam, only the open ones, or only the closed ones. */
export type InboxState = 'any' | 'open' | 'closed';

type Spec = {
  table: string;
  /** When the record came in. */
  at: string;
  /** The status as text, given the table's alias. */
  status: (alias: string) => string;
  /** Stored values per state; applications keep the public form's own words. */
  values: { new: string[]; inProgress: string[]; waiting: string[]; closed: string[]; hidden: string[] };
};

const WORK = { new: ['new'], inProgress: ['in_progress'], waiting: ['waiting'], closed: ['done', 'declined'], hidden: ['spam'] };

// An allowlist, like queues.ts: a table name is interpolated, so it only ever comes from here.
const SPECS: Record<QueueEntity, Spec> = {
  enquiry: { table: 'enquiries', at: 'submitted_at', status: (a) => `${a}.status::text`, values: WORK },
  course_registration: { table: 'course_registrations', at: 'submitted_at', status: (a) => `${a}.status::text`, values: WORK },
  exam_registration: { table: 'exam_registrations', at: 'submitted_at', status: (a) => `${a}.status::text`, values: WORK },
  career_application: {
    table: 'career_applications',
    at: 'created_at',
    // The public apply route writes 'submitted'; an old row may say 'interview'.
    status: (a) => `coalesce(${a}.status, 'new')`,
    values: { ...WORK, new: ['new', 'submitted'], inProgress: ['in_progress', 'interview'] },
  },
};

const list = (values: readonly string[]) => `(${values.map((value) => `'${value}'`).join(', ')})`;
const openValues = (spec: Spec) => [...spec.values.new, ...spec.values.inProgress, ...spec.values.waiting];

/** The WHERE conditions for a period and a state, on the table under `alias`. */
export function inboxConditions(entity: QueueEntity, alias: string, { period, state }: { period: InboxPeriod; state: InboxState }): string[] {
  const spec = SPECS[entity];
  const conditions: string[] = [];
  if (period === 'week') conditions.push(`${alias}.${spec.at} >= ${WEEK_START}`);
  if (period === 'history') conditions.push(`${alias}.${spec.at} < ${WEEK_START}`);
  const status = spec.status(alias);
  if (state === 'open') conditions.push(`${status} IN ${list(openValues(spec))}`);
  else if (state === 'closed') conditions.push(`${status} IN ${list(spec.values.closed)}`);
  else conditions.push(`${status} NOT IN ${list(spec.values.hidden)}`);
  return conditions;
}

/** When the record came in, for ordering: newest first. */
export const inboxOrder = (entity: QueueEntity, alias: string) => `${alias}.${SPECS[entity].at} DESC`;

export type InboxCounts = {
  /** This week's records, closed ones too. */
  week: number;
  /** Everything before the week. */
  history: number;
  /** Still open from before the week: unfinished work, not history. */
  openOlder: number;
  new: number;
  inProgress: number;
  waiting: number;
};

export async function inboxCounts(entity: QueueEntity): Promise<InboxCounts> {
  const spec = SPECS[entity];
  const status = spec.status('q');
  const at = `q.${spec.at}`;
  const row = await queryFirst<Record<'week' | 'history' | 'open_older' | 'new' | 'in_progress' | 'waiting', string>>(
    `SELECT count(*) FILTER (WHERE ${at} >= ${WEEK_START} AND ${status} NOT IN ${list(spec.values.hidden)}) AS week,
            count(*) FILTER (WHERE ${at} < ${WEEK_START} AND ${status} NOT IN ${list(spec.values.hidden)}) AS history,
            count(*) FILTER (WHERE ${at} < ${WEEK_START} AND ${status} IN ${list(openValues(spec))}) AS open_older,
            count(*) FILTER (WHERE ${status} IN ${list(spec.values.new)}) AS new,
            count(*) FILTER (WHERE ${status} IN ${list(spec.values.inProgress)}) AS in_progress,
            count(*) FILTER (WHERE ${status} IN ${list(spec.values.waiting)}) AS waiting
       FROM ${spec.table} q`
  );
  return {
    week: Number(row?.week ?? 0),
    history: Number(row?.history ?? 0),
    openOlder: Number(row?.open_older ?? 0),
    new: Number(row?.new ?? 0),
    inProgress: Number(row?.in_progress ?? 0),
    waiting: Number(row?.waiting ?? 0),
  };
}

/** How many are open, of any age: what a sidebar switch or a card counts. */
export const openCount = (counts: InboxCounts) => counts.new + counts.inProgress + counts.waiting;
