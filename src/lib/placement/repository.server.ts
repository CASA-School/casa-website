/**
 * Attempt persistence, in both runtime modes.
 *
 * Neon-backed (`DATABASE_URL` set): attempts and responses persist. Autosave is
 * idempotent through `UNIQUE (attempt_id, item_id)`, resume works across
 * devices from the token, and staff get a record to review.
 *
 * Fallback (`DATABASE_URL` unset): the store is in-process and per-instance.
 * The learner can still take the whole test and see a real result — the engine
 * does not care where the responses came from — but there is no durable record
 * and no cross-device resume. That reduction is stated on the page rather than
 * hidden, because a placement a learner cannot get back to is worse than one
 * they were told is provisional.
 *
 * SERVER ONLY.
 */

import { getDb, logDatabaseFallback } from '@/lib/db/server';
import { isDatabaseConfigured } from '@/lib/db/env';
import type {
  PlacementAttemptStatus,
  PlacementPhase,
  PlacementResponse,
  PlacementResponseValue,
} from './types';
import type { PlacementDecision } from './finalise';

export type PlacementIntake = {
  priorLearning: string;
  goal: string;
  lastContact: string;
  /** Set when the learner declared no previous German at all. */
  directBeginner: boolean;
};

export type StoredAttempt = {
  id: string;
  token: string;
  locale: 'en' | 'de';
  status: PlacementAttemptStatus;
  phase: PlacementPhase;
  intake: PlacementIntake | null;
  routerTargetLevel: string | null;
  boundaryModuleId: string | null;
  decision: PlacementDecision | null;
  createdAt: string;
  submittedAt: string | null;
};

// ---------------------------------------------------------------------------
// fallback store
// ---------------------------------------------------------------------------

/**
 * In-process attempts for fallback mode.
 *
 * Deliberately a plain Map. A cookie would hit the 4KB limit around twenty
 * responses in, and silently truncating a learner's answers halfway through is
 * a worse failure than losing the attempt on a restart — at least a lost
 * attempt is visible.
 */
type FallbackRecord = { attempt: StoredAttempt; responses: Map<string, PlacementResponse> };

/*
 * Pinned to globalThis, not module scope.
 *
 * A plain module-level Map does not survive the trip from the route handler that
 * writes an attempt to the server component that reads it: the App Router builds
 * route handlers and pages into separate module graphs, so each got its OWN copy
 * of the Map, and dev HMR re-evaluates the module on top of that. The write went
 * to one Map and the read hit an empty one, so POST /api/placement/attempt
 * returned 200 and the result page it redirected to answered 404 — the whole
 * no-database path, which the fallback rule requires to work, was dead.
 *
 * Symbol.for keeps the key stable across those re-evaluations. This is still a
 * process-local store that a restart clears, which is the documented behaviour;
 * it is now merely shared within the process, as it always read as being.
 */
type FallbackGlobal = {
  store: Map<string, FallbackRecord>;
  tokens: Map<string, string>;
};

const FALLBACK_GLOBAL_KEY = Symbol.for('casa.placement.fallback-store');

const fallbackGlobal = ((globalThis as Record<symbol, unknown>)[FALLBACK_GLOBAL_KEY] ??= {
  store: new Map<string, FallbackRecord>(),
  tokens: new Map<string, string>(),
}) as FallbackGlobal;

const fallbackStore = fallbackGlobal.store;
const fallbackTokens = fallbackGlobal.tokens;

/** Keeps a long-lived dev server from growing without bound. */
const FALLBACK_MAX_ATTEMPTS = 200;

function rememberFallback(record: FallbackRecord) {
  if (fallbackStore.size >= FALLBACK_MAX_ATTEMPTS) {
    const oldest = fallbackStore.keys().next().value;
    if (oldest) {
      const stale = fallbackStore.get(oldest);
      if (stale) fallbackTokens.delete(stale.attempt.token);
      fallbackStore.delete(oldest);
    }
  }
  fallbackStore.set(record.attempt.id, record);
  fallbackTokens.set(record.attempt.token, record.attempt.id);
}

// ---------------------------------------------------------------------------
// tokens
// ---------------------------------------------------------------------------

/**
 * A result URL states a person's language level, so the token has to be
 * unguessable rather than merely unique. 160 bits from the platform CSPRNG,
 * base36-encoded for a URL segment that survives being pasted into an email.
 */
function createToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// row mapping
// ---------------------------------------------------------------------------

type AttemptRow = {
  id: string;
  token: string;
  locale: string;
  status: string;
  phase: string;
  intake: PlacementIntake | null;
  router_target_level: string | null;
  boundary_module_id: string | null;
  decision: PlacementDecision | null;
  created_at: string | Date;
  submitted_at: string | Date | null;
};

function toIso(value: string | Date | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function mapAttempt(row: AttemptRow): StoredAttempt {
  return {
    id: row.id,
    token: row.token,
    locale: row.locale === 'de' ? 'de' : 'en',
    status: row.status as PlacementAttemptStatus,
    phase: row.phase as PlacementPhase,
    intake: row.intake,
    routerTargetLevel: row.router_target_level,
    boundaryModuleId: row.boundary_module_id,
    decision: row.decision,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    submittedAt: toIso(row.submitted_at),
  };
}

// ---------------------------------------------------------------------------
// api
// ---------------------------------------------------------------------------

/**
 * Opens an attempt.
 *
 * Reports `persisted` from what actually happened, not from whether
 * `DATABASE_URL` is set. Those come apart in the case that matters: a configured
 * database whose migration has not been applied. The insert fails, the fallback
 * store takes over correctly — and an env-var check would still have told the
 * learner "your progress is saved. You can close this page and come back."
 * Telling someone twelve items into an adaptive test that they can safely leave,
 * when they cannot, is the worst failure this feature has available to it.
 */
export async function createAttempt(options: {
  locale: 'en' | 'de';
  intake: PlacementIntake;
  phase: PlacementPhase;
}): Promise<{ attempt: StoredAttempt; persisted: boolean }> {
  const token = createToken();
  const database = getDb();

  if (database) {
    try {
      const rows = (await database.query(
        `INSERT INTO placement_attempts (token, locale, status, phase, intake)
         VALUES ($1, $2, 'in_progress', $3, $4::jsonb)
         RETURNING id, token, locale, status, phase, intake, router_target_level,
                   boundary_module_id, decision, created_at, submitted_at`,
        [token, options.locale, options.phase, JSON.stringify(options.intake)]
      )) as AttemptRow[];

      if (rows[0]) return { attempt: mapAttempt(rows[0]), persisted: true };
    } catch (error) {
      logDatabaseFallback('placement.createAttempt', error);
    }
  }

  const attempt: StoredAttempt = {
    id: crypto.randomUUID(),
    token,
    locale: options.locale,
    status: 'in_progress',
    phase: options.phase,
    intake: options.intake,
    routerTargetLevel: null,
    boundaryModuleId: null,
    decision: null,
    createdAt: new Date().toISOString(),
    submittedAt: null,
  };

  rememberFallback({ attempt, responses: new Map() });
  return { attempt, persisted: false };
}

export async function getAttemptByTokenWithPersistence(
  token: string
): Promise<{ attempt: StoredAttempt; persisted: boolean } | null> {
  const database = getDb();

  if (database) {
    try {
      const rows = (await database.query(
        `SELECT id, token, locale, status, phase, intake, router_target_level,
                boundary_module_id, decision, created_at, submitted_at
         FROM placement_attempts WHERE token = $1 LIMIT 1`,
        [token]
      )) as AttemptRow[];

      if (rows[0]) return { attempt: mapAttempt(rows[0]), persisted: true };
      // A configured database that has no such token is authoritative: the
      // token does not exist. Falling through to the in-process map here would
      // resurrect a stale dev attempt and mask a real 404.
      return null;
    } catch (error) {
      logDatabaseFallback('placement.getAttemptByToken', error);
    }
  }

  const id = fallbackTokens.get(token);
  const attempt = id ? (fallbackStore.get(id)?.attempt ?? null) : null;
  return attempt ? { attempt, persisted: false } : null;
}

export async function getAttemptByToken(token: string): Promise<StoredAttempt | null> {
  return (await getAttemptByTokenWithPersistence(token))?.attempt ?? null;
}

export async function updateAttempt(
  attemptId: string,
  patch: {
    phase?: PlacementPhase;
    status?: PlacementAttemptStatus;
    routerTargetLevel?: string | null;
    boundaryModuleId?: string | null;
    decision?: PlacementDecision | null;
    policyVersion?: number;
    releaseMode?: string;
    submitted?: boolean;
  }
): Promise<void> {
  const database = getDb();

  if (database) {
    try {
      // Built as a fixed statement with COALESCE rather than dynamic SQL: every
      // undefined field keeps its stored value, so a partial patch cannot blank
      // a column it did not mention.
      await database.query(
        `UPDATE placement_attempts SET
           phase               = COALESCE($2, phase),
           status              = COALESCE($3, status),
           router_target_level = COALESCE($4, router_target_level),
           boundary_module_id  = COALESCE($5, boundary_module_id),
           decision            = COALESCE($6::jsonb, decision),
           policy_version      = COALESCE($7, policy_version),
           release_mode        = COALESCE($8, release_mode),
           submitted_at        = CASE WHEN $9 THEN now() ELSE submitted_at END,
           updated_at          = now()
         WHERE id = $1`,
        [
          attemptId,
          patch.phase ?? null,
          patch.status ?? null,
          patch.routerTargetLevel ?? null,
          patch.boundaryModuleId ?? null,
          patch.decision ? JSON.stringify(patch.decision) : null,
          patch.policyVersion ?? null,
          patch.releaseMode ?? null,
          patch.submitted === true,
        ]
      );
      return;
    } catch (error) {
      logDatabaseFallback('placement.updateAttempt', error);
    }
  }

  const record = fallbackStore.get(attemptId);
  if (!record) return;

  record.attempt = {
    ...record.attempt,
    phase: patch.phase ?? record.attempt.phase,
    status: patch.status ?? record.attempt.status,
    routerTargetLevel: patch.routerTargetLevel ?? record.attempt.routerTargetLevel,
    boundaryModuleId: patch.boundaryModuleId ?? record.attempt.boundaryModuleId,
    decision: patch.decision ?? record.attempt.decision,
    submittedAt: patch.submitted === true ? new Date().toISOString() : record.attempt.submittedAt,
  };
}

/**
 * Records one answer.
 *
 * Idempotent by item: re-sending the same item overwrites rather than appending.
 * That is what makes autosave safe to retry after a dropped connection, and it
 * is why the unique constraint is on `(attempt_id, item_id)` rather than a
 * surrogate key alone.
 */
export async function saveResponse(
  attemptId: string,
  response: { itemId: string; value: PlacementResponseValue; optionOrder: readonly string[] | null }
): Promise<void> {
  const database = getDb();

  if (database) {
    try {
      await database.query(
        `INSERT INTO placement_responses (attempt_id, item_id, value, option_order)
         VALUES ($1, $2, $3::jsonb, $4::jsonb)
         ON CONFLICT (attempt_id, item_id)
         DO UPDATE SET value = EXCLUDED.value,
                       option_order = EXCLUDED.option_order,
                       updated_at = now()`,
        [
          attemptId,
          response.itemId,
          JSON.stringify(response.value),
          response.optionOrder ? JSON.stringify(response.optionOrder) : null,
        ]
      );
      return;
    } catch (error) {
      logDatabaseFallback('placement.saveResponse', error);
    }
  }

  const record = fallbackStore.get(attemptId);
  if (!record) return;

  record.responses.set(response.itemId, {
    itemId: response.itemId,
    value: response.value,
    optionOrder: response.optionOrder,
    answeredAt: new Date().toISOString(),
  });
}

export async function listResponses(attemptId: string): Promise<PlacementResponse[]> {
  const database = getDb();

  if (database) {
    try {
      const rows = (await database.query(
        `SELECT item_id, value, option_order, answered_at
         FROM placement_responses WHERE attempt_id = $1 ORDER BY answered_at ASC`,
        [attemptId]
      )) as {
        item_id: string;
        value: PlacementResponseValue;
        option_order: string[] | null;
        answered_at: string | Date;
      }[];

      return rows.map((row) => ({
        itemId: row.item_id,
        value: row.value,
        optionOrder: row.option_order,
        answeredAt: toIso(row.answered_at) ?? new Date().toISOString(),
      }));
    } catch (error) {
      logDatabaseFallback('placement.listResponses', error);
    }
  }

  const record = fallbackStore.get(attemptId);
  return record ? [...record.responses.values()] : [];
}

/**
 * Stores the writing task. Returns whether it actually landed.
 *
 * Writing is only useful to a reviewer, and fallback mode has no reviewer to
 * hand it to. The caller surfaces a failure as "writing cannot be submitted
 * right now", mirroring how career applications already behave without storage,
 * rather than accepting text it will drop.
 */
export async function saveWriting(
  attemptId: string,
  submission: { promptId: string; text: string }
): Promise<boolean> {
  const wordCount = submission.text.trim().split(/\s+/u).filter(Boolean).length;
  const database = getDb();

  if (!database) return false;

  try {
    await database.query(
      `INSERT INTO placement_writing_submissions (attempt_id, prompt_id, text, word_count)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (attempt_id)
       DO UPDATE SET prompt_id = EXCLUDED.prompt_id,
                     text = EXCLUDED.text,
                     word_count = EXCLUDED.word_count,
                     submitted_at = now()`,
      [attemptId, submission.promptId, submission.text, wordCount]
    );
    return true;
  } catch (error) {
    logDatabaseFallback('placement.saveWriting', error);
    return false;
  }
}

/**
 * Whether a database is *configured*.
 *
 * A necessary condition for persistence, not a sufficient one — see
 * `createAttempt`. Use this only to decide whether to offer a feature that
 * cannot work at all without a database (the writing task). Never use it to tell
 * a learner their progress is safe; that claim needs the write to have
 * succeeded.
 */
export function isPlacementPersistenceAvailable(): boolean {
  return isDatabaseConfigured();
}
