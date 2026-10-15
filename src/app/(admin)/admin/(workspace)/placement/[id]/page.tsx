import { notFound } from 'next/navigation';

import Link from 'next/link';

import { attachReviewPersonAction, confirmPlacementAction } from '../../actions';
import {
  Badge,
  Button,
  Card,
  DateText,
  Field,
  Input,
  Meter,
  RecordHeader,
  Select,
  Textarea,
} from '@/components/admin/ui';
import { Icon } from '@/components/admin/icons';
import { FactGrid, MetaItem, MetaLine, Stat, StatBar, Timeline } from '@/components/admin/record-parts';
import { activityFor } from '@/lib/admin/activity';
import { pick, relativeDays, type Bilingual } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listNotes } from '@/lib/admin/notes';
import { listPeople } from '@/lib/admin/people';
import { getPlacementAttempt } from '@/lib/admin/placement';
import {
  CONFIDENCE_COPY,
  REVIEW_REASON_COPY,
  SKILL_LABELS,
} from '@/lib/admin/placement-copy';
import { BAND_SEQUENCE } from '@/config/placement/policy';
import type { PlacementSkill } from '@/lib/placement/types';
import { backgroundItems, humanise } from './background';

/** Where an attempt stands, by `placement_attempts.status`. */
const STAGES: Record<string, Bilingual> = {
  in_progress: { de: 'Läuft noch', en: 'In progress' },
  submitted: { de: 'Abgeschickt', en: 'Submitted' },
  abandoned: { de: 'Abgebrochen', en: 'Abandoned' },
};

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
  const [attempt, { t, lang }] = await Promise.all([getPlacementAttempt(id), getI18n()]);

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
  const background = backgroundItems(attempt.intake, lang);
  const skillLabel = (skill: string) =>
    skill in SKILL_LABELS ? pick(lang, SKILL_LABELS[skill as PlacementSkill]) : skill;


  return (
    <>
      <RecordHeader
        backHref="/admin/placement"
        backLabel={t('Einstufungstests', 'Placement')}
        title={attempt.reviewPerson?.name ?? t('Einstufungstest', 'Placement test')}
        status={
          attempt.confirmedLevel ? (
            <Badge tone="positive">{t(`Bestätigt: ${attempt.confirmedLevel}`, `Confirmed ${attempt.confirmedLevel}`)}</Badge>
          ) : attempt.needsReview ? (
            <Badge tone="accent">{t('Braucht eine Lehrkraft', 'Needs a teacher')}</Badge>
          ) : decision ? (
            <Badge tone="neutral">{t('Unbestätigt', 'Unconfirmed')}</Badge>
          ) : (
            <Badge tone="quiet">{t('Läuft noch', 'In progress')}</Badge>
          )
        }
        subtitle={
          <>
            <span className="block text-[0.98rem] font-semibold text-[#2b3546]">
              {decision ? t(`Empfohlen: ${decision.band}`, `Recommended ${decision.band}`) : t('Noch nicht ausgewertet', 'Not scored yet')}
            </span>
            <MetaLine>
              <MetaItem icon={Icon.clock}>
                {decision ? t('Abgeschickt', 'Submitted') : t('Begonnen', 'Started')}{' '}
                <DateText value={decision ? (attempt.submittedAt ?? attempt.createdAt) : attempt.createdAt} withTime />
              </MetaItem>
              <MetaItem icon={Icon.globe}>{attempt.locale === 'de' ? t('auf Deutsch', 'in German') : t('auf Englisch', 'in English')}</MetaItem>
              {decision ? (
                <MetaItem icon={Icon.placement}>
                  {t(`Pilot · Richtlinie ${decision.policyVersion} · Modus ${decision.releaseMode}`, `Pilot · policy ${decision.policyVersion} · ${decision.releaseMode} mode`)}
                </MetaItem>
              ) : null}
            </MetaLine>
          </>
        }
        bar={
          decision ? (
            <StatBar>
              <Stat label={t('Sicherheit', 'Confidence')}>
                <span className={decision.confidence === 'low' ? 'text-[#9a5b00]' : decision.confidence === 'high' ? 'text-[#17693a]' : undefined}>
                  {pick(lang, CONFIDENCE_COPY[decision.confidence])}
                </span>{' '}
                <span className="text-[0.78rem] font-semibold text-[var(--casa-muted)]">
                  {t(`${(decision.confidenceScore * 100).toFixed(0)} von 100`, `${(decision.confidenceScore * 100).toFixed(0)} of 100`)}
                </span>
              </Stat>
              <Stat label={t('Bearbeitet', 'Answered')}>
                <span className={decision.answeredShare < 1 ? 'text-[#9a5b00]' : undefined}>
                  {t(`${Math.round(decision.answeredShare * 100)} %`, `${Math.round(decision.answeredShare * 100)}%`)}
                </span>
                {attempt.responseCount > 0 ? (
                  <span className="text-[0.78rem] font-semibold text-[var(--casa-muted)]">
                    {' '}
                    · {t(`${attempt.responseCount} Antworten`, `${attempt.responseCount} responses`)}
                  </span>
                ) : null}
              </Stat>
              <Stat label={t('Gespräch', 'Spoken check')}>
                {decision.speakingRequired ? (
                  attempt.speakingCheckDone ? (
                    <span className="text-[#17693a]">{t('Geführt', 'Done')}</span>
                  ) : (
                    <span className="text-[#9a5b00]">{t('Nötig, noch offen', 'Required, not done')}</span>
                  )
                ) : (
                  <span className="text-[var(--casa-muted)]">{t('Nicht nötig', 'Not required')}</span>
                )}
              </Stat>
              <Stat label={t('Automatisch bestätigbar', 'Presentable as settled')}>
                {decision.autoConfirmable ? t('Ja', 'Yes') : <span className="text-[var(--casa-muted)]">{t('Nein — eine Lehrkraft entscheidet', 'No — a teacher decides')}</span>}
              </Stat>
            </StatBar>
          ) : (
            <StatBar>
              <Stat label={t('Antworten bisher', 'Responses so far')}>{attempt.responseCount}</Stat>
              <Stat label={t('Aktueller Stand', 'Current stage')}>{STAGES[attempt.status] ? pick(lang, STAGES[attempt.status]) : humanise(attempt.status)}</Stat>
              <Stat label={t('Einstiegsteil zeigte auf', 'Screener pointed at')}>{attempt.routerTargetLevel ?? '—'}</Stat>
            </StatBar>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          {decision ? (
            <>
              <Card
                title={t('Fertigkeiten', 'Skill profile')}
                icon={Icon.book}
                tint="red"
              >
                <ul className="space-y-3.5">
                  {decision.skillProfile.map((entry) => (
                    <li key={entry.skill}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold">
                          {skillLabel(entry.skill)}
                        </span>
                        <span className="text-[var(--casa-text-subtle)]">
                          {entry.credit === null
                            ? t('nicht gemessen', 'not measured')
                            : t(
                                `${Math.round(entry.credit * 100)} % aus ${entry.itemCount} ${
                                  entry.itemCount === 1 ? 'Aufgabe' : 'Aufgaben'
                                }`,
                                `${Math.round(entry.credit * 100)}% over ${entry.itemCount} ${
                                  entry.itemCount === 1 ? 'item' : 'items'
                                }`
                              )}
                        </span>
                      </div>
                      <Meter
                        value={entry.credit ?? 0}
                        max={1}
                        label={`${skillLabel(entry.skill)}: ${
                          entry.credit === null
                            ? t('nicht gemessen', 'not measured')
                            : t(`${Math.round(entry.credit * 100)} Prozent`, `${Math.round(entry.credit * 100)} percent`)
                        }`}
                        tone={entry.credit === null ? 'neutral' : 'accent'}
                      />
                    </li>
                  ))}
                </ul>
              </Card>

              {decision.reviewReasons.length > 0 ? (
                <Card title={t('Gründe für eine Durchsicht', 'Review reasons')} icon={Icon.attention} tint="sun">
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
                          {REVIEW_REASON_COPY[reason] ? pick(lang, REVIEW_REASON_COPY[reason]) : reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              {decision.rationale.length > 0 ? (
                <Card title={t('Begründung', 'Rationale')} icon={Icon.placement} tint="ink">
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

          {background.length > 0 ? (
            <Card
              title={t('Hintergrund', 'Background')}
              description={t('Selbst angegeben, nicht gewertet.', 'Self-reported, unscored.')}
              icon={Icon.person}
              tint="green"
            >
              <FactGrid facts={background} />
            </Card>
          ) : null}

          {attempt.writing.length > 0 ? (
            <Card
              title={t('Schreiben', 'Writing')}
              description={t('In eigenen Worten, nicht gewertet.', 'Their own words, unscored.')}
              icon={Icon.note}
              tint="blue"
            >
              <div className="space-y-5">
                {attempt.writing.map((submission) => (
                  <div key={submission.promptId}>
                    <p className="mb-2 text-xs text-[var(--casa-text-subtle)]">
                      {t('Aufgabe', 'Prompt')} <code className="font-mono">{submission.promptId}</code> ·{' '}
                      {t(`${submission.wordCount} Wörter`, `${submission.wordCount} words`)} ·{' '}
                      {relativeDays(submission.submittedAt, lang)}
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
            title={attempt.confirmedLevel ? t('Bestätigtes Niveau', 'Confirmed level') : t('Niveau bestätigen', 'Confirm the level')}
            icon={Icon.check}
            tint={attempt.confirmedLevel ? 'green' : 'red'}
          >
            {attempt.confirmedLevel ? (
              <div className="mb-4 rounded-xl border border-ws-line-soft bg-ws-sunk px-4 py-3">
                <p className="text-2xl leading-none font-extrabold tracking-[-0.02em] text-[var(--casa-ink)]">
                  {attempt.confirmedLevel}
                </p>
                <p className="mt-2 text-xs text-[var(--casa-text-subtle)]">
                  {attempt.reviewerName ?? t('Ehemaliges Teammitglied', 'A former colleague')} ·{' '}
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
                {t(
                  'Du hast ein anderes Niveau als empfohlen gewählt. Schreib in der Notiz, warum.',
                  'You chose a different level from the recommendation. Say why in the note.'
                )}
              </p>
            ) : null}

            <form action={confirmPlacementAction} className="space-y-3">
              <input type="hidden" name="attemptId" value={attempt.id} />

              <Field label={t('Niveau, mit dem die Person beginnt', 'Level they should start in')} htmlFor="confirmedLevel">
                <Select
                  id="confirmedLevel"
                  name="confirmedLevel"
                  defaultValue={attempt.confirmedLevel ?? decision?.band ?? ''}
                  required
                >
                  <option value="" disabled>
                    {t('Niveau wählen', 'Choose a level')}
                  </option>
                  {BAND_SEQUENCE.map((band) => (
                    <option key={band} value={band}>
                      {band}
                      {band === decision?.band ? t(' – empfohlen', ' — recommended') : ''}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label={t('Notiz', 'Note')}
                hint={t('nötig, wenn du abweichst', 'required if you disagree')}
                htmlFor="placement-note"
              >
                <Textarea
                  id="placement-note"
                  name="note"
                  rows={3}
                  defaultValue={attempt.reviewNote ?? ''}
                  placeholder={t('Was du gesehen hast und was den Ausschlag gegeben hat.', 'What you saw, and what tipped the decision.')}
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
                  {t('Ich habe mit dieser Person ein Gespräch geführt', 'I have had a spoken conversation with this learner')}
                  {decision?.speakingRequired ? (
                    <span className="block text-xs text-[var(--casa-warning-text)]">
                      {t('Auf dieser Stufe nötig, bevor die Einstufung gilt.', 'Required at this band before the placement stands.')}
                    </span>
                  ) : null}
                </span>
              </label>

              <Button type="submit" className="w-full">
                {attempt.confirmedLevel ? t('Entscheidung ändern', 'Revise the decision') : t('Niveau bestätigen', 'Confirm level')}
              </Button>
            </form>
          </Card>

          {attempt.confirmedLevel ? (
            <Card title={t('Person', 'Person')} icon={Icon.person} tint="green">
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
                      {t('Lösen', 'Detach')}
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
                      placeholder={t('Name oder E-Mail', 'Name or email')}
                      aria-label={t('Person suchen', 'Find a person')}
                    />
                    <Button type="submit" variant="secondary" size="md">
                      {t('Suchen', 'Find')}
                    </Button>
                  </form>
                  {personSearch ? (
                    personMatches.length === 0 ? (
                      <p className="mt-3 text-xs text-[var(--casa-text-subtle)]">{t('Kein Treffer.', 'No match.')}</p>
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
                                {t('Verknüpfen', 'Attach')}
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

          <Timeline
            entity="placement_attempt"
            id={attempt.id}
            notes={notes}
            activity={activity}
            origin={{
              at: attempt.submittedAt ?? attempt.createdAt,
              label: decision ? t('Test abgeschickt', 'Test submitted') : t('Test begonnen', 'Test started'),
              icon: Icon.placement,
            }}
          />
        </div>
      </div>
    </>
  );
}
