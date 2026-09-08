import { notFound } from 'next/navigation';

import { addNoteAction, confirmPlacementAction } from '../../actions';
import {
  Badge,
  Button,
  Card,
  DateText,
  DetailList,
  Field,
  Meter,
  PageHeader,
  Select,
  Textarea,
  relativeDays,
} from '@/components/admin/ui';
import { Icon } from '@/components/admin/icons';
import { activityFor } from '@/lib/admin/activity';
import { listNotes } from '@/lib/admin/notes';
import { getPlacementAttempt } from '@/lib/admin/placement';
import {
  CONFIDENCE_COPY,
  INTAKE_LABELS,
  REVIEW_REASON_COPY,
  SKILL_LABELS,
} from '@/lib/admin/placement-copy';
import { BAND_SEQUENCE, LISTENING_AUDIO_AVAILABLE } from '@/config/placement/policy';
import type { PlacementSkill } from '@/lib/placement/types';

/**
 * One placement attempt, and the form that records a teacher's decision.
 *
 * WHAT THIS SCREEN DOES NOT SHOW, AND WHY
 *
 * Not one item, not one answer, not one accepted-answer list, and no listening
 * transcript. CLAUDE.md rule 6 forbids shipping any of those to a client, and
 * a server-rendered staff page is a client — the HTML goes to a browser on a
 * shared office machine like any other. `src/lib/admin/placement.ts` never
 * joins responses against the item bank for exactly this reason.
 *
 * What a teacher gets instead is what a placement decision is actually made on:
 * the band, how confident the engine is and why, which skills carried the
 * evidence, how much of the test was answered, the learner's own account of
 * their background, and their writing in their own words. That is a better
 * basis for the decision than an answer sheet would be, and it keeps the bank
 * intact for the next candidate.
 */
export default async function PlacementAttemptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const attempt = await getPlacementAttempt(id);

  if (!attempt) {
    notFound();
  }

  const [notes, activity] = await Promise.all([
    listNotes('placement_attempt', attempt.id),
    activityFor('placement_attempt', attempt.id),
  ]);

  const decision = attempt.decision;
  const intakeEntries = attempt.intake
    ? Object.entries(attempt.intake).filter(
        ([, value]) => value !== null && value !== undefined && value !== ''
      )
    : [];

  return (
    <>
      <PageHeader
        backHref="/admin/placement"
        backLabel="All placement attempts"
        eyebrow="Placement attempt"
        title={decision ? `Recommended ${decision.band}` : 'Not scored yet'}
        description={
          decision
            ? 'A recommendation from a pilot instrument. Confirm the level a learner should actually start in.'
            : 'This attempt has not been submitted, so the engine has produced nothing to review.'
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          {decision ? (
            <>
              <Card title="What the engine concluded">
                <DetailList
                  items={[
                    {
                      label: 'Recommended band',
                      value: (
                        <span className="font-[family-name:var(--font-display)] text-xl">
                          {decision.band}
                        </span>
                      ),
                    },
                    {
                      label: 'Confidence',
                      value: (
                        <span className="flex items-center gap-2">
                          <Badge
                            tone={
                              decision.confidence === 'high'
                                ? 'positive'
                                : decision.confidence === 'medium'
                                  ? 'neutral'
                                  : 'warning'
                            }
                          >
                            {CONFIDENCE_COPY[decision.confidence]}
                          </Badge>
                          <span className="text-xs text-[var(--casa-text-subtle)]">
                            {(decision.confidenceScore * 100).toFixed(0)} of 100
                          </span>
                        </span>
                      ),
                    },
                    {
                      label: 'Test answered',
                      // The response count is only shown when there is one.
                      // "92% · 0 responses" is a contradiction on its face, and
                      // it happens legitimately: the share is computed by the
                      // engine at finalisation, while the rows can be absent
                      // for an attempt migrated in or scored in fallback mode.
                      value:
                        attempt.responseCount > 0
                          ? `${Math.round(decision.answeredShare * 100)}% · ${attempt.responseCount} responses`
                          : `${Math.round(decision.answeredShare * 100)}% of the items served`,
                    },
                    {
                      label: 'Presentable as settled',
                      value: decision.autoConfirmable ? (
                        'Yes, under policy'
                      ) : (
                        <Badge tone="warning">No — a teacher must decide</Badge>
                      ),
                    },
                    {
                      label: 'Spoken check',
                      value: decision.speakingRequired ? (
                        <Badge tone="warning">Required from B1+</Badge>
                      ) : (
                        'Not required at this band'
                      ),
                    },
                    {
                      label: 'Cut scores',
                      value: `Policy version ${decision.policyVersion} · ${decision.releaseMode} mode`,
                    },
                  ]}
                />
              </Card>

              <Card
                title="Skill profile"
                description="How they did on what they attempted, per skill. Not a percentage of the whole test."
              >
                <ul className="space-y-3.5">
                  {decision.skillProfile.map((entry) => (
                    <li key={entry.skill}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold">
                          {SKILL_LABELS[entry.skill as PlacementSkill] ?? entry.skill}
                        </span>
                        <span className="text-[var(--casa-text-subtle)]">
                          {entry.credit === null
                            ? 'not measured'
                            : `${Math.round(entry.credit * 100)}% over ${entry.itemCount} ${
                                entry.itemCount === 1 ? 'item' : 'items'
                              }`}
                        </span>
                      </div>
                      <Meter
                        value={entry.credit ?? 0}
                        max={1}
                        label={`${SKILL_LABELS[entry.skill as PlacementSkill] ?? entry.skill}: ${
                          entry.credit === null
                            ? 'not measured'
                            : `${Math.round(entry.credit * 100)} percent`
                        }`}
                        tone={entry.credit === null ? 'neutral' : 'accent'}
                      />
                    </li>
                  ))}
                </ul>

                {!LISTENING_AUDIO_AVAILABLE ? (
                  <p className="mt-4 border-t border-ws-line-soft pt-3 text-xs leading-relaxed text-[var(--casa-text-subtle)]">
                    Listening is not measured in this pilot — no audio exists for
                    the scored listening scripts yet, so the test covers language
                    use and reading only. A learner who listens far better or
                    worse than they read will not show it here.
                  </p>
                ) : null}
              </Card>

              {decision.reviewReasons.length > 0 ? (
                <Card
                  title="Why this needs a person"
                  description="Flagged by the engine itself, in the order it decided them."
                >
                  <ul className="space-y-2.5">
                    {decision.reviewReasons.map((reason) => (
                      <li key={reason} className="flex gap-2.5 text-sm">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-[var(--casa-warning-text)]"
                        >
                          {Icon.attention}
                        </span>
                        <span className="leading-relaxed">
                          {REVIEW_REASON_COPY[reason] ?? reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              {decision.rationale.length > 0 ? (
                <Card
                  title="How it got there"
                  description="The engine's own trail, ordered as the decisions were taken."
                >
                  <ol className="space-y-2 text-sm leading-relaxed text-[var(--casa-muted)]">
                    {decision.rationale.map((line, index) => (
                      <li key={index} className="flex gap-2.5">
                        <span className="w-4 shrink-0 text-right text-xs text-[var(--casa-text-subtle)]">
                          {index + 1}
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              ) : null}
            </>
          ) : (
            <Card title="Attempt in progress">
              <DetailList
                items={[
                  { label: 'Started', value: <DateText value={attempt.createdAt} withTime /> },
                  { label: 'Responses so far', value: attempt.responseCount },
                  { label: 'Current stage', value: attempt.status },
                  { label: 'Screener pointed at', value: attempt.routerTargetLevel },
                ]}
              />
            </Card>
          )}

          {intakeEntries.length > 0 ? (
            <Card
              title="What the learner told us"
              description="Self-reported at the start and deliberately unscored. Context for a surprising result, never a reason for one."
            >
              <DetailList
                items={intakeEntries.map(([key, value]) => ({
                  label: INTAKE_LABELS[key] ?? key,
                  value: typeof value === 'string' ? value : JSON.stringify(value),
                }))}
              />
            </Card>
          ) : null}

          {attempt.writing.length > 0 ? (
            <Card
              title="Writing"
              description="Their own words, unscored by the engine. The best single signal a teacher has here."
            >
              <div className="space-y-5">
                {attempt.writing.map((submission) => (
                  <div key={submission.promptId}>
                    <p className="mb-2 text-xs text-[var(--casa-text-subtle)]">
                      Prompt <code className="font-mono">{submission.promptId}</code> ·{' '}
                      {submission.wordCount} words · {relativeDays(submission.submittedAt)}
                    </p>
                    <p className="max-w-prose rounded-lg border border-ws-line-soft bg-ws-sunk px-4 py-3 text-base leading-relaxed whitespace-pre-line">
                      {submission.text}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card
            title={attempt.confirmedLevel ? 'Confirmed level' : 'Confirm the level'}
            description={
              attempt.confirmedLevel
                ? undefined
                : 'What should this learner actually start in? You may disagree with the recommendation.'
            }
          >
            {attempt.confirmedLevel ? (
              <div className="mb-4 rounded-lg border border-ws-line-soft bg-ws-sunk px-4 py-3">
                <p className="font-[family-name:var(--font-display)] text-2xl leading-none">
                  {attempt.confirmedLevel}
                </p>
                <p className="mt-2 text-xs text-[var(--casa-text-subtle)]">
                  {attempt.reviewerName ?? 'A former colleague'} ·{' '}
                  <DateText value={attempt.decidedAt} />
                </p>
                {attempt.reviewNote ? (
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">
                    {attempt.reviewNote}
                  </p>
                ) : null}
              </div>
            ) : null}

            {query.error === 'note' ? (
              <p
                role="alert"
                className="mb-3 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-3.5 py-2.5 text-sm text-[var(--casa-danger-text)]"
              >
                You chose a different level from the recommendation. Say why —
                a disagreement is the only evidence CASA has for whether the
                pilot cut scores are right.
              </p>
            ) : null}

            <form action={confirmPlacementAction} className="space-y-3">
              <input type="hidden" name="attemptId" value={attempt.id} />

              <Field label="Level they should start in" htmlFor="confirmedLevel">
                <Select
                  id="confirmedLevel"
                  name="confirmedLevel"
                  defaultValue={attempt.confirmedLevel ?? decision?.band ?? ''}
                  required
                >
                  <option value="" disabled>
                    Choose a level
                  </option>
                  {BAND_SEQUENCE.map((band) => (
                    <option key={band} value={band}>
                      {band}
                      {band === decision?.band ? ' — recommended' : ''}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Note"
                hint="required if you disagree"
                htmlFor="placement-note"
              >
                <Textarea
                  id="placement-note"
                  name="note"
                  rows={3}
                  defaultValue={attempt.reviewNote ?? ''}
                  placeholder="What you saw, and what tipped the decision."
                />
              </Field>

              <label className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name="speakingCheckDone"
                  defaultChecked={attempt.speakingCheckDone}
                  className="mt-0.5 size-4 rounded-sm border-ws-line-firm accent-[var(--casa-accent-surface)]"
                />
                <span className="leading-snug">
                  I have had a spoken conversation with this learner
                  {decision?.speakingRequired ? (
                    <span className="block text-xs text-[var(--casa-warning-text)]">
                      Required at this band before the placement stands.
                    </span>
                  ) : null}
                </span>
              </label>

              <Button type="submit" className="w-full">
                {attempt.confirmedLevel ? 'Revise the decision' : 'Confirm level'}
              </Button>
            </form>

            <p className="mt-4 border-t border-ws-line-soft pt-3 text-xs leading-relaxed text-[var(--casa-text-subtle)]">
              This records your decision beside the engine&apos;s. It never
              overwrites the recommendation, and it is not a certificate — the
              learner is told a course to start in, not a level they have
              achieved.
            </p>
          </Card>

          <Card title="Notes">
            <PlacementNotes attemptId={attempt.id} notes={notes} />
          </Card>

          {activity.length > 0 ? (
            <Card title="History">
              <ol className="space-y-2.5 text-xs">
                {activity.map((entry) => (
                  <li key={entry.id} className="text-[var(--casa-text-subtle)]">
                    <span className="font-semibold text-[var(--casa-ink)]">
                      {entry.staffName ?? 'Someone'}
                    </span>{' '}
                    {entry.action === 'placement_confirmed'
                      ? `confirmed ${String(entry.detail?.level ?? 'a level')}${
                          entry.detail?.agreed === false ? ', against the recommendation' : ''
                        }`
                      : entry.action.replace(/_/g, ' ')}{' '}
                    · {relativeDays(entry.createdAt)}
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

/** The notes panel, without the queue-entity plumbing the shared rail needs. */
function PlacementNotes({
  attemptId,
  notes,
}: {
  attemptId: string;
  notes: readonly { id: string; body: string; authorName: string | null; createdAt: Date }[];
}) {
  return (
    <>
      <form action={addNoteAction} className="space-y-2">
        <input type="hidden" name="entity" value="placement_attempt" />
        <input type="hidden" name="entityId" value={attemptId} />
        <Textarea
          name="body"
          rows={3}
          required
          placeholder="Anything a colleague should know before they teach this learner."
          aria-label="New note"
        />
        <Button type="submit" variant="secondary" size="sm">
          Add note
        </Button>
      </form>

      {notes.length > 0 ? (
        <ul className="mt-4 space-y-3 border-t border-ws-line-soft pt-4">
          {notes.map((note) => (
            <li key={note.id}>
              <p className="text-sm leading-relaxed whitespace-pre-line">{note.body}</p>
              <p className="mt-1 text-xs text-[var(--casa-text-subtle)]">
                {note.authorName ?? 'A former colleague'} · {relativeDays(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
