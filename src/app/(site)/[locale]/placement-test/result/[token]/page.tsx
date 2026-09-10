/**
 * The placement result.
 *
 * Rendered entirely on the server from the resume token: the band, the
 * confidence, and the review reasons never travel through a client fetch that a
 * proxy or a browser could cache. The token is unguessable because this page
 * states a person's language level.
 *
 * DISCLOSURE ORDER — the whole page is one exercise in it:
 *
 *   1. the band, and one sentence on what it means
 *   2. what happens next (the honest status, before any celebration)
 *   3. which course this leads into
 *   4. what a learner can already do at this band
 *   5. the per-skill detail, behind a disclosure, for whoever wants it
 *
 * Cost, dates, and registration are one link away, not on the page. A learner
 * reading their level for the first time is not yet choosing a start date.
 *
 * `noindex` — a result URL is personal data.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { ArrowRight, Check, ClipboardCheck, MessageCircle, UserRound } from 'lucide-react';

import { Container } from '@/components/ui/container';
import { levelKeyFromLabel, levelTokens } from '@/config/brand/tokens';
import { BAND_COPY, SKILL_LABELS, SKILL_NOT_MEASURED, reviewNotice } from '@/config/placement/result-copy';
import { LISTENING_AUDIO_AVAILABLE } from '@/config/placement/policy';
import { getContentLocale } from '@/lib/content/locale.server';
import { loadAttempt } from '@/lib/placement/attempt.server';
import { levelLabelOfBand, presentationBand } from '@/lib/placement/finalise';

export const metadata: Metadata = {
  title: 'Your placement result | CASA Bremen',
  robots: { index: false, follow: false },
};

export default async function PlacementResultPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const locale = await getContentLocale();

  const attempt = await loadAttempt(token);
  if (!attempt || !attempt.decision) notFound();

  const decision = attempt.decision;
  // `presentationBand` owns the "may this be shown as settled?" rule, so the
  // page cannot accidentally present an unconfirmed C1 as a seat.
  const { band, provisional } = presentationBand(decision);
  const bandCopy = BAND_COPY[band];
  const notice = reviewNotice(decision.reviewReasons, locale);
  const levelKey = levelKeyFromLabel(levelLabelOfBand(band));

  const t = (en: string, de: string) => (locale === 'de' ? de : en);

  return (
    <main className="min-h-screen bg-[var(--casa-canvas)] py-10 text-[var(--casa-ink)] sm:py-14">
      <Container>
        <div className="mx-auto max-w-3xl space-y-6">
          {/* ---- 1. the band ------------------------------------------- */}
          <section className="overflow-hidden rounded-lg border border-[color:var(--casa-sand)] bg-white shadow-[var(--shadow-soft)]">
            <div className="p-6 sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {t('Your recommended starting point', 'Ihr empfohlener Einstieg')}
              </p>
              <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />

              <div className="mt-5 flex flex-wrap items-center gap-4">
                {/*
                  The band, set large. It carries its own level colour from the
                  shared level ramp, so a B1 result looks like B1 everywhere on
                  the site — the course cards, the timeline, and here.
                */}
                <span
                  className="inline-flex items-baseline rounded-lg px-4 py-2 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl"
                  style={
                    levelKey
                      ? { background: levelTokens[levelKey].surface, color: levelTokens[levelKey].ink }
                      : undefined
                  }
                >
                  {band}
                </span>

                {/* Provisional is stated next to the band, not in a footnote.
                    A learner should never have to scroll to find out whether
                    the big number is settled. */}
                {provisional ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--casa-gold-deep)]/35 bg-[var(--casa-gold-deep)]/8 px-3 py-1 text-xs font-bold uppercase tracking-eyebrow text-[var(--casa-warning-text)]">
                    {t('Provisional', 'Vorläufig')}
                  </span>
                ) : null}
              </div>

              <p className="mt-5 max-w-measure text-lg leading-relaxed text-[var(--casa-ink)]">
                {bandCopy.summary[locale]}
              </p>

              {/* Never a certificate, never pass/fail. Stated plainly rather
                  than left to inference. */}
              <p className="mt-4 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
                {t(
                  'This is a course recommendation, not a certificate, and there is no pass or fail. It tells us which group to start you in.',
                  'Das ist eine Kursempfehlung, kein Zertifikat, und es gibt kein Bestehen oder Nichtbestehen. Es zeigt, in welcher Gruppe Sie beginnen.'
                )}
              </p>
            </div>
          </section>

          {/* ---- 2. what happens next ---------------------------------- */}
          {notice ? (
            <section className="rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/40 p-6 sm:p-7">
              <div className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--casa-blue)]/12 text-[var(--casa-accent-text)]">
                  <UserRound className="h-4.5 w-4.5" aria-hidden />
                </span>
                <div className="min-w-0 space-y-1.5">
                  <h2 className="text-lg font-bold text-[var(--casa-ink)]">{notice.title}</h2>
                  <p className="max-w-measure text-base leading-relaxed text-[var(--casa-ink)]">
                    {notice.body}
                  </p>
                </div>
              </div>

              {decision.speakingRequired ? (
                <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[color:var(--casa-sand)]/70 pt-5">
                  <Link
                    href="/contact?topic=placement-in-person"
                    className="inline-flex h-11 items-center gap-2 rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--casa-ink-deep-hover)]"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    {t('Arrange the conversation', 'Gespräch vereinbaren')}
                  </Link>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* ---- 3. the course ---------------------------------------- */}
          <section className="rounded-lg border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-7">
            <h2 className="text-lg font-bold text-[var(--casa-ink)]">
              {t('Where this leads', 'Wie es weitergeht')}
            </h2>
            <p className="mt-2 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
              {t(
                'Bring this result to registration and we will place you in the matching group.',
                'Nehmen Sie dieses Ergebnis zur Anmeldung mit — wir setzen Sie in die passende Gruppe.'
              )}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href={`/courses/${bandCopy.courseSlug}`}
                className="group flex items-center justify-between gap-3 rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] px-4 py-3.5 transition-all duration-200 hover:border-[color:var(--casa-muted)] hover:bg-[var(--casa-canvas)]"
              >
                <span className="text-sm font-bold text-[var(--casa-ink)]">
                  {t('See the course', 'Kurs ansehen')}
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-[var(--casa-muted)] transition-colors group-hover:text-[var(--casa-ink)]"
                  aria-hidden
                />
              </Link>

              <Link
                href="/registration/course"
                className="group flex items-center justify-between gap-3 rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] px-4 py-3.5 transition-all duration-200 hover:border-[color:var(--casa-muted)] hover:bg-[var(--casa-canvas)]"
              >
                <span className="text-sm font-bold text-[var(--casa-ink)]">
                  {t('Register for a course', 'Zur Kursanmeldung')}
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-[var(--casa-muted)] transition-colors group-hover:text-[var(--casa-ink)]"
                  aria-hidden
                />
              </Link>
            </div>

            {/* The token is the only way back to this page. Given to the
                learner explicitly rather than left in the address bar. */}
            <p className="mt-5 rounded-lg border border-dashed border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] px-4 py-3 text-xs leading-relaxed text-[var(--casa-muted)]">
              {t(
                'Keep this page’s private link and show it when you register. The test does not ask for your name, so the link is how CASA connects you to this result.',
                'Speichern Sie den privaten Link dieser Seite und zeigen Sie ihn bei der Anmeldung. Der Test fragt nicht nach Ihrem Namen; über den Link kann CASA Ihr Ergebnis zuordnen.'
              )}
            </p>
          </section>

          {/* ---- 4. what you can already do --------------------------- */}
          <section className="rounded-lg border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-7">
            <h2 className="text-lg font-bold text-[var(--casa-ink)]">
              {t('What you can already do', 'Was Sie bereits können')}
            </h2>
            <ul className="mt-4 grid gap-2.5">
              {bandCopy.canDo[locale].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-base leading-relaxed">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--casa-success-text)]" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </section>

          {/* ---- 5. the detail, folded away --------------------------- */}
          <details className="group rounded-lg border border-[color:var(--casa-sand)] bg-white shadow-[var(--shadow-soft)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6 text-left sm:p-7 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
                  <ClipboardCheck className="h-4.5 w-4.5" aria-hidden />
                </span>
                <span className="text-lg font-bold text-[var(--casa-ink)]">
                  {t('Your answers in detail', 'Ihre Antworten im Detail')}
                </span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)] transition-transform duration-200 group-open:rotate-180">
                ▾
              </span>
            </summary>

            <div className="space-y-5 border-t border-[color:var(--casa-sand)]/70 p-6 sm:p-7">
              <div className="space-y-3">
                {decision.skillProfile.map((entry) => {
                  const label = SKILL_LABELS[entry.skill][locale];
                  const measured = entry.credit !== null;
                  const percent = measured ? Math.round((entry.credit ?? 0) * 100) : 0;

                  return (
                    <div key={entry.skill} className="space-y-1.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-bold text-[var(--casa-ink)]">{label}</span>
                        <span className="text-xs font-semibold tabular-nums text-[var(--casa-muted)]">
                          {measured
                            ? `${percent}%`
                            : SKILL_NOT_MEASURED[locale]}
                        </span>
                      </div>
                      {/* An unmeasured skill renders no bar at all. A zero-width
                          bar reads as a score of zero, which is the opposite of
                          "we did not ask". */}
                      {measured ? (
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--casa-surface-subtle)]">
                          <span
                            className="block h-full rounded-full bg-[var(--casa-blue)]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {!LISTENING_AUDIO_AVAILABLE ? (
                <p className="rounded-lg border border-dashed border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] px-4 py-3 text-sm leading-relaxed text-[var(--casa-muted)]">
                  {t(
                    'Listening is not part of this version of the test yet, so your teacher will check it in person.',
                    'Hören ist in dieser Testversion noch nicht enthalten — Ihre Lehrkraft prüft das persönlich.'
                  )}
                </p>
              ) : null}

              <dl className="grid gap-3 border-t border-[color:var(--casa-sand)]/70 pt-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">
                    {t('Questions answered', 'Beantwortete Fragen')}
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold tabular-nums text-[var(--casa-ink)]">
                    {Math.round(decision.answeredShare * 100)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">
                    {t('How clear the result is', 'Aussagekraft')}
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold text-[var(--casa-ink)]">
                    {decision.confidence === 'high'
                      ? t('Clear', 'Deutlich')
                      : decision.confidence === 'medium'
                        ? t('Fairly clear', 'Recht deutlich')
                        : t('Needs a teacher’s view', 'Braucht eine Lehrkraft')}
                  </dd>
                </div>
              </dl>
            </div>
          </details>

          <p className="px-1 text-xs leading-relaxed text-[var(--casa-muted)]">
            {t(
              'CASA’s placement test is our own instrument, currently in its pilot phase. Its questions are reviewed by our teaching staff and its recommendations are calibrated against how learners actually progress in their first weeks.',
              'Der CASA-Einstufungstest ist unser eigenes Instrument und befindet sich derzeit in der Pilotphase. Die Aufgaben werden von unserem Unterrichtsteam geprüft, die Empfehlungen anhand des tatsächlichen Lernfortschritts in den ersten Wochen kalibriert.'
            )}
          </p>
        </div>
      </Container>
    </main>
  );
}
