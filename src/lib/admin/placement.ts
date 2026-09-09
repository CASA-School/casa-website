import { query, queryFirst } from './db';
import type { StaffUser } from './auth';
import { logActivity } from './activity';
import type { PlacementDecision } from '@/lib/placement/finalise';

/**
 * Placement attempts, and the staff decision on each.
 *
 * WHAT THIS SURFACE MAY AND MAY NOT SHOW
 *
 * CLAUDE.md hard rule 6 forbids shipping an answer key, an accepted-answer list
 * or a listening transcript to any client — and the workspace is a client. So
 * nothing here reads `placement_responses.value` against the item bank. Staff
 * get the engine's own output: the recommended band, the confidence, the skill
 * profile, how much of the test was answered, and the reasons the engine itself
 * flagged for review. That is what a placement decision is actually made on.
 *
 * The engine's recommendation is never overwritten. A confirmation is a new row
 * in `placement_reviews`, so "what the test said" and "what a teacher decided"
 * stay two separate facts — which is the whole point of shadow mode.
 */

export type PlacementListItem = {
  id: string;
  token: string;
  locale: string;
  status: string;
  /** Null while the attempt is still in progress. */
  recommendedBand: string | null;
  confidence: string | null;
  needsReview: boolean;
  answeredShare: number | null;
  confirmedLevel: string | null;
  reviewerName: string | null;
  createdAt: Date;
  submittedAt: Date | null;
};

export type PlacementAttemptDetail = PlacementListItem & {
  decision: PlacementDecision | null;
  intake: Record<string, unknown> | null;
  routerTargetLevel: string | null;
  boundaryModuleId: string | null;
  reviewNote: string | null;
  speakingCheckDone: boolean;
  decidedAt: Date | null;
  /** The person the reviewer attached this decision to, if any. */
  reviewPerson: { id: string; name: string } | null;
  writing: {
    promptId: string;
    text: string;
    wordCount: number;
    submittedAt: Date;
  }[];
  responseCount: number;
};

type Row = {
  id: string;
  token: string;
  locale: string;
  status: string;
  decision: PlacementDecision | null;
  intake: Record<string, unknown> | null;
  router_target_level: string | null;
  boundary_module_id: string | null;
  created_at: Date;
  submitted_at: Date | null;
  confirmed_level: string | null;
  review_note: string | null;
  review_person_id: string | null;
  review_person_name: string | null;
  speaking_check_done: boolean | null;
  decided_at: Date | null;
  reviewer_name: string | null;
};

const SELECT = `
  SELECT a.id,
         a.token,
         a.locale,
         a.status,
         a.decision,
         a.intake,
         a.router_target_level,
         a.boundary_module_id,
         a.created_at,
         a.submitted_at,
         r.confirmed_level,
         r.note AS review_note,
         r.speaking_check_done,
         r.decided_at,
         u.name AS reviewer_name,
         rp.id AS review_person_id,
         trim(rp.first_name || ' ' || coalesce(rp.last_name, '')) AS review_person_name
    FROM placement_attempts a
    LEFT JOIN placement_reviews r ON r.attempt_id = a.id
    LEFT JOIN staff_users u ON u.id = r.reviewed_by
    LEFT JOIN people rp ON rp.id = canonical_person_id(r.person_id)
`;

const toListItem = (row: Row): PlacementListItem => ({
  id: row.id,
  token: row.token,
  locale: row.locale,
  status: row.status,
  recommendedBand: row.decision?.band ?? null,
  confidence: row.decision?.confidence ?? null,
  // An attempt needs a look when the engine says so and nobody has decided yet.
  needsReview:
    row.confirmed_level === null &&
    row.decision !== null &&
    (!row.decision.autoConfirmable || row.decision.reviewReasons.length > 0),
  answeredShare: row.decision?.answeredShare ?? null,
  confirmedLevel: row.confirmed_level,
  reviewerName: row.reviewer_name,
  createdAt: row.created_at,
  submittedAt: row.submitted_at,
});

export type PlacementFilter = 'needs_review' | 'confirmed' | 'in_progress' | 'all';

export async function listPlacementAttempts({
  filter = 'needs_review',
  limit = 40,
  offset = 0,
}: {
  filter?: PlacementFilter;
  limit?: number;
  offset?: number;
}): Promise<{ items: PlacementListItem[]; total: number }> {
  const conditions: string[] = [];

  switch (filter) {
    case 'needs_review':
      // Submitted, scored, and nobody has signed it off.
      conditions.push(`a.decision IS NOT NULL`, `r.attempt_id IS NULL`);
      break;
    case 'confirmed':
      conditions.push(`r.attempt_id IS NOT NULL`);
      break;
    case 'in_progress':
      conditions.push(`a.decision IS NULL`);
      break;
    case 'all':
      break;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalRow = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n
       FROM placement_attempts a
       LEFT JOIN placement_reviews r ON r.attempt_id = a.id
       ${where}`
  );

  const rows = await query<Row>(
    `${SELECT} ${where}
     ORDER BY a.submitted_at DESC NULLS LAST, a.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return { items: rows.map(toListItem), total: Number(totalRow?.n ?? 0) };
}

export async function getPlacementAttempt(id: string): Promise<PlacementAttemptDetail | null> {
  const row = await queryFirst<Row>(`${SELECT} WHERE a.id = $1`, [id]);

  if (!row) {
    return null;
  }

  const writing = await query<{
    prompt_id: string;
    text: string;
    word_count: number;
    submitted_at: Date;
  }>(
    `SELECT prompt_id, text, word_count, submitted_at
       FROM placement_writing_submissions
      WHERE attempt_id = $1
      ORDER BY submitted_at ASC`,
    [id]
  );

  const responses = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM placement_responses WHERE attempt_id = $1`,
    [id]
  );

  return {
    ...toListItem(row),
    decision: row.decision,
    intake: row.intake,
    routerTargetLevel: row.router_target_level,
    boundaryModuleId: row.boundary_module_id,
    reviewNote: row.review_note,
    speakingCheckDone: row.speaking_check_done ?? false,
    decidedAt: row.decided_at,
    reviewPerson:
      row.review_person_id && row.review_person_name
        ? { id: row.review_person_id, name: row.review_person_name }
        : null,
    writing: writing.map((w) => ({
      promptId: w.prompt_id,
      text: w.text,
      wordCount: w.word_count,
      submittedAt: w.submitted_at,
    })),
    responseCount: Number(responses?.n ?? 0),
  };
}

/**
 * Records a teacher's decision, or replaces an earlier one.
 *
 * Upsert rather than insert-only: a level gets revised after a speaking check,
 * and forcing a second row would make "the current decision" a query with an
 * ordering in it. The activity trail keeps the history instead.
 */
export async function confirmPlacement({
  attemptId,
  confirmedLevel,
  note,
  speakingCheckDone,
  recommendedBand,
  policyVersion,
  actor,
}: {
  attemptId: string;
  confirmedLevel: string;
  note: string | null;
  speakingCheckDone: boolean;
  recommendedBand: string | null;
  policyVersion: number | null;
  actor: StaffUser;
}): Promise<void> {
  await query(
    `INSERT INTO placement_reviews
       (attempt_id, reviewed_by, confirmed_level, confirmed_level_code, note, recommended_band,
        policy_version, speaking_check_done)
     VALUES ($1, $2, $3, (SELECT code FROM levels WHERE code = $3), $4, $5, $6, $7)
     ON CONFLICT (attempt_id) DO UPDATE
       SET reviewed_by = EXCLUDED.reviewed_by,
           confirmed_level = EXCLUDED.confirmed_level,
           confirmed_level_code = EXCLUDED.confirmed_level_code,
           note = EXCLUDED.note,
           recommended_band = EXCLUDED.recommended_band,
           policy_version = EXCLUDED.policy_version,
           speaking_check_done = EXCLUDED.speaking_check_done,
           decided_at = now()`,
    [attemptId, actor.id, confirmedLevel, note, recommendedBand, policyVersion, speakingCheckDone]
  );

  await logActivity({
    actor,
    entity: 'placement_attempt',
    entityId: attemptId,
    action: 'placement_confirmed',
    detail: {
      level: confirmedLevel,
      recommended: recommendedBand,
      agreed: recommendedBand === confirmedLevel,
    },
  });
}

/** Attempts waiting on a teacher. Drives the sidebar badge and the overview. */
export async function placementReviewBacklog(): Promise<number> {
  const row = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n
       FROM placement_attempts a
       LEFT JOIN placement_reviews r ON r.attempt_id = a.id
      WHERE a.decision IS NOT NULL AND r.attempt_id IS NULL`
  );

  return Number(row?.n ?? 0);
}

/**
 * Names the person a review is about. Optional and reversible (null detaches).
 * Refuses when there is no review yet: a person is attached to a DECISION, not
 * to an anonymous attempt.
 */
export async function attachReviewToPerson({
  attemptId,
  personId,
  actor,
}: {
  attemptId: string;
  personId: string | null;
  actor: StaffUser;
}): Promise<void> {
  const updated = await query<{ attempt_id: string }>(
    `UPDATE placement_reviews SET person_id = $2 WHERE attempt_id = $1 RETURNING attempt_id`,
    [attemptId, personId]
  );
  if (updated.length === 0) {
    throw new Error('Confirm the level before attaching a person.');
  }
  await logActivity({
    actor,
    entity: 'placement_attempt',
    entityId: attemptId,
    action: personId ? 'review_attached_to_person' : 'review_detached_from_person',
    detail: personId ? { person: personId } : undefined,
  });
}
