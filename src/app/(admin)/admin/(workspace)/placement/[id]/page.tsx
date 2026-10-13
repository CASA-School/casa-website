import { notFound } from 'next/navigation';

import Link from 'next/link';

import { addNoteAction, attachReviewPersonAction, confirmPlacementAction } from '../../actions';
import {
  Badge,
  Button,
  Card,
  DateText,
  DetailList,
  Field,
  Input,
  Meter,
  RecordHeader,
  Select,
  Textarea,
  relativeDays,
} from '@/components/admin/ui';
import { Icon } from '@/components/admin/icons';
import { activityFor } from '@/lib/admin/activity';
import { listNotes } from '@/lib/admin/notes';
import { listPeople } from '@/lib/admin/people';
import { getPlacementAttempt } from '@/lib/admin/placement';
import {
  CONFIDENCE_COPY,
  INTAKE_LABELS,
  REVIEW_REASON_COPY,
  SKILL_LABELS,
} from '@/lib/admin/placement-copy';
import { BAND_SEQUENCE } from '@/config/placement/policy';
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
  searchParams: Promise<{ error?: string; person?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const attempt = await getPlacementAttempt(id);

  if (!attempt) {
    notFound();
  }

  const personSearch = query.person?.trim() || undefined;
  const [notes, activity, personMatches] = await Promise.all([
    listNotes('placement_attempt', attempt.id),
    activityFor('placement_attempt', attempt.id),
    personSearch && attempt.confirmedLevel
      ? listPeople({ search: personSearch, limit: 8 }).then((r) => r.items)
      : Promise.resolve([]),
  ]);

  const decision = attempt.decision;
  const intakeEntries = attempt.intake
    ? Object.entries(attempt.intake).filter(
        ([, value]) => value !== null && value !== undefined && value !== ''
      )
    : [];

  const confidenceTint = (
    { high: 'green', medium: 'ink', low: 'sun' } as const
  )[decision?.confidence ?? 'medium'];

  return (
    <>
      <RecordHeader
        backHref="/admin/placement"
        backLabel="All placement attempts"
        title={decision ? `Recommended ${decision.band}` : 'Not scored yet'}
        subtitle={
          decision
            ? `Pilot recommendation · policy version ${decision.policyVersion} · ${decision.releaseMode} mode`
            : 'Not submitted yet, so there is nothing to review'
        }
        status={
          attempt.confirmedLevel ? (
            <Badge tone="positive">Confirmed {attempt.confirmedLevel}</Badge>
          ) : attempt.needsReview ? (
            <Badge tone="accent">Needs a teacher</Badge>
          ) : decision ? (
            <Badge tone="neutral">Unconfirmed</Badge>
          ) : (
            <Badge tone="quiet">In progress</Badge>
          )
        }
        facts={
          decision
            ? [
                {
                  label: 'Submitted',
                  icon: Icon.clock,
                  tint: 'blue',
                  value: <DateText value={attempt.submittedAt ?? attempt.createdAt} />,
                  sub: relativeDays(attempt.submittedAt ?? attempt.createdAt),
                },
                {
                  label: 'Confidence',
                  icon: Icon.placement,
                  tint: confidenceTint,
                  value: CONFIDENCE_COPY[decision.confidence],
                  sub: `${(decision.confidenceScore * 100).toFixed(0)} of 100`,
                },
                {
                  label: 'Test answered',
                  icon: Icon.book,
                  tint: 'red',
                  value: `${Math.round(decision.answeredShare * 100)}%`,
                  // The response count is only shown when there is one.
                  // "92% · 0 responses" is a contradiction on its face, and it
                  // happens legitimately: the share is computed by the engine
                  // at finalisation, while the rows can be absent for an
                  // attempt migrated in or scored in fallback mode.
                  sub:
                    attempt.responseCount > 0
                      ? `${attempt.responseCount} responses`
                      : 'of the items served',
                },
                {
                  label: 'Spoken check',
                  icon: Icon.people,
                  tint: decision.speakingRequired ? 'sun' : 'ink',
                  value: decision.speakingRequired ? 'Required' : 'Not required',
                  sub: decision.speakingRequired
                    ? attempt.speakingCheckDone
                      ? 'Done'
                      : 'From B1+, not done yet'
                    : 'At this band',
                },
                {
                  label: 'Presentable as settled',
                  icon: Icon.check,
                  tint: decision.autoConfirmable ? 'green' : 'sun',
                  value: decision.autoConfirmable ? 'Yes' : 'No',
                  sub: decision.autoConfirmable ? 'Under policy' : 'A teacher must decide',
                },
              ]
            : [
                {
                  label: 'Started',
                  icon: Icon.clock,
                  tint: 'blue',
                  value: <DateText value={attempt.createdAt} withTime />,
                  sub: relativeDays(attempt.createdAt),
                },
                { label: 'Responses so far', icon: Icon.book, tint: 'red', value: attempt.responseCount },
                { label: 'Current stage', icon: Icon.check, tint: 'blue', value: attempt.status.replace(/_/g, ' ') },
                {
                  label: 'Screener pointed at',
                  icon: Icon.placement,
                  tint: 'red',
                  value: attempt.routerTargetLevel,
                },
              ]
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          {decision ? (
            <>
              <Card
                title="Skill profile"
                description="Per skill, on what they attempted."
                icon={Icon.book}
                tint="red"
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
              </Card>

              {decision.reviewReasons.length > 0 ? (
                <Card title="Review reasons" icon={Icon.attention} tint="sun">
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
                <Card title="Rationale" icon={Icon.placement} tint="ink">
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
          ) : null}

          {intakeEntries.length > 0 ? (
            <Card
              title="Background"
              description="Self-reported, unscored."
              icon={Icon.person}
              tint="green"
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
              description="Their own words, unscored."
              icon={Icon.note}
              tint="blue"
            >
              <div className="space-y-5">
                {attempt.writing.map((submission) => (
                  <div key={submission.promptId}>
                    <p className="mb-2 text-xs text-[var(--casa-text-subtle)]">
                      Prompt <code className="font-mono">{submission.promptId}</code> ·{' '}
                      {submission.wordCount} words · {relativeDays(submission.submittedAt)}
                    </p>
                    <p className="max-w-prose rounded-xl border border-ws-line-soft bg-ws-sunk px-4 py-3 text-base leading-relaxed whitespace-pre-line">
                      {submission.text}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card
            title={attempt.confirmedLevel ? 'Confirmed level' : 'Confirm the level'}
            icon={Icon.check}
            tint={attempt.confirmedLevel ? 'green' : 'red'}
          >
            {attempt.confirmedLevel ? (
              <div className="mb-4 rounded-xl border border-ws-line-soft bg-ws-sunk px-4 py-3">
                <p className="text-2xl leading-none font-extrabold tracking-[-0.02em] text-[var(--casa-ink)]">
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
                className="mb-3 rounded-xl border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-3.5 py-2.5 text-sm text-[var(--casa-danger-text)]"
              >
                You chose a different level from the recommendation. Say why in the note.
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

              <Field label="Note" hint="required if you disagree" htmlFor="placement-note">
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
                  className="mt-0.5 size-4 rounded-lg border-ws-line-firm accent-[var(--casa-accent-surface)]"
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
          </Card>

          {attempt.confirmedLevel ? (
            <Card title="Person" icon={Icon.person} tint="green">
              {attempt.reviewPerson ? (
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/admin/people/${attempt.reviewPerson.id}`}
                    className="text-sm font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                  >
                    {attempt.reviewPerson.name}
                  </Link>
                  <form action={attachReviewPersonAction}>
                    <input type="hidden" name="attemptId" value={attempt.id} />
                    <input type="hidden" name="personId" value="" />
                    <Button type="submit" variant="ghost" size="sm">
                      Detach
                    </Button>
                  </form>
                </div>
              ) : (
                <>
                  <form method="get" className="flex gap-2">
                    <Input
                      type="search"
                      name="person"
                      defaultValue={personSearch ?? ''}
                      placeholder="Name or email"
                      aria-label="Find a person"
                    />
                    <Button type="submit" variant="secondary" size="md">
                      Find
                    </Button>
                  </form>
                  {personSearch ? (
                    personMatches.length === 0 ? (
                      <p className="mt-3 text-xs text-[var(--casa-text-subtle)]">No match.</p>
                    ) : (
                      <ul className="mt-3 divide-y divide-ws-line-soft">
                        {personMatches.map((match) => (
                          <li
                            key={match.id}
                            className="flex items-center justify-between gap-2 py-2"
                          >
                            <span className="min-w-0 text-sm">
                              <span className="block truncate font-medium">
                                {match.displayName}
                              </span>
                              <span className="block truncate text-xs text-[var(--casa-text-subtle)]">
                                {match.primaryEmail ?? match.nationalityName ?? ''}
                              </span>
                            </span>
                            <form action={attachReviewPersonAction}>
                              <input type="hidden" name="attemptId" value={attempt.id} />
                              <input type="hidden" name="personId" value={match.id} />
                              <Button type="submit" variant="secondary" size="sm">
                                Attach
                              </Button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : null}
                </>
              )}
            </Card>
          ) : null}

          <Card title="Notes" description="Only staff see these." icon={Icon.note} tint="sun">
            <PlacementNotes attemptId={attempt.id} notes={notes} />
          </Card>

          {activity.length > 0 ? (
            <Card title="History" icon={Icon.clock} tint="ink">
              <ol className="relative space-y-3 before:absolute before:top-1 before:bottom-1 before:left-[4px] before:w-px before:bg-ws-line">
                {activity.map((entry) => (
                  <li key={entry.id} className="relative flex gap-3 text-xs">
                    <span
                      aria-hidden="true"
                      className="relative mt-1 h-[9px] w-[9px] shrink-0 rounded-full border-2 border-white bg-ws-line-firm"
                    />
                    <span className="text-[var(--casa-text-subtle)]">
                      <span className="font-bold text-[var(--casa-ink)]">
                        {entry.staffName ?? 'Someone'}
                      </span>{' '}
                      {entry.action === 'placement_confirmed'
                        ? `confirmed ${String(entry.detail?.level ?? 'a level')}${
                            entry.detail?.agreed === false ? ', against the recommendation' : ''
                          }`
                        : entry.action.replace(/_/g, ' ')}{' '}
                      · {relativeDays(entry.createdAt)}
                    </span>
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
  notes: readonly {
    id: string;
    body: string;
    authorName: string | null;
    createdAt: Date;
  }[];
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
            <li key={note.id} className="rounded-xl bg-[#fffbea] px-3 py-2.5">
              <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">
                {note.body}
              </p>
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
