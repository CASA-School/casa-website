/**
 * Shared class strings and copy for the placement test surface.
 *
 * Extracted rather than repeated because the six response renderers must look
 * like one instrument: an option card that is 1px different in the cloze
 * renderer than in the single-choice renderer reads as a different question
 * type, and the learner starts wondering what changed instead of answering.
 *
 * Every value comes from `globals.css` / `src/config/brand/tokens.ts`. Nothing
 * new is introduced here — see UI_SYSTEM.md.
 */

import type { ContentLocale } from '@/lib/content/types';

/**
 * The option card. One shape for every choice interaction in the test.
 *
 * WHY THIS IS A `<label>` WRAPPING A REAL INPUT, NOT A BUTTON
 *
 * The first version used `role="radio"` buttons, copying the calculator's
 * segmented control. But `role="radio"` inside `role="radiogroup"` is a promise
 * of ARIA keyboard behaviour — arrow keys move between options, only the
 * selected one is tabbable — and none of that comes for free. The calculator
 * gets away with `aria-pressed` toggle buttons, which promise nothing; a
 * question with one correct answer is genuinely a radio group and should say so.
 *
 * A visually-hidden native input inside a styled label gives the whole contract
 * for free: arrow keys, roving focus, form semantics, and the name computed from
 * the label's own text.
 *
 * `min-h-14` matches the calculator's segmented control, so a tap target is the
 * same size across the site. The selected state carries a border, a tint, and a
 * check glyph — three signals, because colour alone fails for a learner who
 * cannot distinguish it, and this is the only control on the screen.
 */
export const optionCardBase =
  // 48px minimum on a phone, 56px from `sm` up. Both clear the 44px platform
  // guidance for a touch target while costing ~32px less per four-option item
  // than a flat 56px did — which is the difference between three options and
  // four being visible above the answer bar on a 667px screen.
  // The transition is scoped, not `transition-all`, and that is an accessibility
  // fix rather than a preference. `outline-width` is animatable, so under
  // `transition-all` the focus outline eased in over 200ms: a keyboard user
  // tabbing at speed never saw it. Only properties that should ease are listed.
  'group relative flex w-full cursor-pointer items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-left ' +
  'transition-[color,background-color,border-color,box-shadow] duration-200 ' +
  'min-h-12 sm:min-h-14 sm:gap-3 sm:px-4 sm:py-3 ' +
  // Focus comes from `.casa-option-focus:has(:focus-visible)` in globals.css,
  // beside the other CASA focus rules. It is an outline so it cannot be confused
  // with the card's border, which already carries the selected state.
  'casa-option-focus ' +
  'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55';

/** The visually hidden input that carries the real semantics. */
export const optionInputClassName = 'sr-only';

export const optionCardIdle =
  'border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] text-[var(--casa-ink)] ' +
  'hover:border-[color:var(--casa-muted)] hover:bg-[var(--casa-canvas)]';

export const optionCardSelected =
  'border-[var(--casa-blue)] bg-[color-mix(in_srgb,var(--casa-blue)_10%,var(--casa-bg))] text-[var(--casa-ink)] shadow-xs';

/** The letter/number chip at the head of an option card. */
export const optionMarkerBase =
  'mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold transition-colors duration-200 sm:h-6 sm:w-6 sm:text-xs';

export const optionMarkerIdle =
  'border-[color:var(--casa-sand)] bg-white text-[var(--casa-muted)] group-hover:text-[var(--casa-ink)]';

export const optionMarkerSelected = 'border-[var(--casa-blue)] bg-[var(--casa-accent-surface)] text-white';

/** Matches the registration wizard's field styling exactly. */
export const fieldClassName =
  'h-11 rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] px-3.5 text-base sm:text-sm ' +
  'text-[var(--casa-ink)] placeholder:text-[var(--casa-muted)] shadow-none transition-all duration-200 ' +
  'focus-visible:bg-white focus-visible:border-[var(--casa-blue)] focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/10 ' +
  'focus-visible:ring-offset-0 focus-visible:outline-none';

export const selectTriggerClassName =
  'h-11 data-[size=default]:h-11 w-full rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] px-3.5 ' +
  'text-base sm:text-sm text-[var(--casa-ink)] data-[placeholder]:text-[var(--casa-muted)] shadow-none text-left ' +
  'flex items-center justify-between transition-all duration-200 focus-visible:bg-white focus-visible:border-[var(--casa-blue)] ' +
  'focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/10 focus-visible:ring-offset-0 focus-visible:outline-none';

/** Inline select, sized to sit inside a running German sentence. */
export const inlineSelectTriggerClassName =
  // Narrower on a phone so a two-blank sentence still reads as a sentence rather
  // than as two controls stacked with words around them. 16px text regardless:
  // iOS Safari zooms the page when a focused field is under 16px.
  'h-10 data-[size=default]:h-10 min-w-[6.5rem] sm:min-w-[9rem] rounded-lg border border-[color:var(--casa-blue)]/45 bg-white px-2.5 sm:px-3 ' +
  'text-base font-semibold text-[var(--casa-ink)] data-[placeholder]:font-normal data-[placeholder]:text-[var(--casa-muted)] ' +
  'shadow-xs inline-flex items-center justify-between gap-1.5 align-middle transition-all duration-200 ' +
  'hover:border-[var(--casa-blue)] focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/15 focus-visible:ring-offset-0 focus-visible:outline-none';

export const eyebrowClassName =
  'text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]';

/**
 * The stimulus panel — the reading text or listening frame.
 *
 * Deliberately a different surface from the answer area. The bank's stimuli are
 * notices, emails, and announcements; giving them their own ground makes it
 * obvious which part is the world and which part is the question.
 */
export const stimulusPanelClassName =
  'rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/35 p-3.5 sm:p-5';

// ---------------------------------------------------------------------------
// copy
// ---------------------------------------------------------------------------

/**
 * All learner-facing strings for the runner, in both content locales.
 *
 * German matters as much as English even though routing is EN-only today: the
 * test content is German, so a learner reading these strings is already reading
 * German on the same screen.
 *
 * Typed as one shape per locale rather than inferred `as const`. Without the
 * annotation each locale infers its own string-literal type, and passing
 * `runnerCopy[locale]` to a component becomes a union no prop can accept.
 */
export type RunnerCopyShape = {
  intakeEyebrow: string;
  intakeTitle: string;
  intakeBody: string;
  intakeSubmit: string;
  /** Label when the answers mean the test will be skipped entirely. */
  intakeSubmitBeginner: string;
  intakeStarting: string;
  /** Shown beside a disabled start button. Must fit next to it on a phone. */
  intakeIncomplete: string;

  phaseRouter: string;
  phaseLevel: string;
  phaseBoundary: string;
  phaseWriting: string;
  phaseRouterHint: string;
  phaseLevelHint: string;
  phaseBoundaryHint: string;
  questionOf: (position: number, total: number) => string;

  next: string;
  saving: string;
  notKnown: string;
  selectTwo: string;
  orderInstruction: string;
  orderCleared: string;
  matchInstruction: string;
  typeAnswer: string;
  chooseBlank: string;
  /** Spoken stand-in for a `{{b1}}` placeholder in the screen-reader sentence. */
  spokenBlank: string;
  /** Accessible name for the nth inline select, 1-based. */
  blankLabel: (position: number, total: number) => string;
  play: string;
  playAgain: string;
  playsLeft: (left: number) => string;
  noPlaysLeft: string;
  audioUnavailable: string;

  writingEyebrow: string;
  writingTitle: string;
  writingBody: string;
  writingReadBy: string;
  writingInclude: string;
  writingSourceLabel: string;
  writingWords: (count: number, min: number, max: number) => string;
  writingSubmit: string;
  writingSkip: string;
  writingSkipHint: string;
  writingPlaceholder: string;

  errorTitle: string;
  errorRetry: string;
  errorGeneric: string;
  notPersistentTitle: string;
  notPersistentBody: string;
  resumeSaved: string;
  resuming: string;
  finishing: string;
  /** Shown between the last objective item and the writing task. */
  preparingWriting: string;
};

export const runnerCopy: Record<ContentLocale, RunnerCopyShape> = {
  en: {
    // intake
    intakeEyebrow: 'Before we start',
    intakeTitle: 'Three quick questions',
    intakeBody:
      'Nothing here is scored. Complete beginners can start directly at A1.1; the other answers give your teacher context.',
    intakeSubmit: 'Start the test',
    intakeSubmitBeginner: 'See my result',
    intakeStarting: 'Starting…',
    intakeIncomplete: 'Answer all three to start.',

    // phases
    phaseRouter: 'First impression',
    phaseLevel: 'Your level',
    phaseBoundary: 'Fine-tuning',
    phaseWriting: 'Writing',
    phaseRouterHint: 'A short spread of questions to find roughly where you are.',
    phaseLevelHint: 'Now a closer look at the level you reached.',
    phaseBoundaryHint: 'Your result is close to a boundary. A few more questions settle it.',
    questionOf: (position: number, total: number) => `Question ${position} of ${total}`,

    // answering
    next: 'Next',
    saving: 'Saving…',
    notKnown: 'I don’t know',
    selectTwo: 'Choose exactly two answers.',
    orderInstruction: 'Tap the parts in the right order. Tap a placed part to take it back.',
    orderCleared: 'Nothing placed yet.',
    matchInstruction: 'Match each person to what they will do.',
    typeAnswer: 'Type the missing word',
    chooseBlank: 'Choose',
    spokenBlank: 'blank',
    blankLabel: (position: number, total: number) => `Choose word ${position} of ${total}`,
    play: 'Play',
    playAgain: 'Play again',
    playsLeft: (left: number) => (left === 1 ? '1 play left' : `${left} plays left`),
    noPlaysLeft: 'No plays left',
    audioUnavailable: 'This recording is not available yet.',

    // writing
    writingEyebrow: 'Last step',
    writingTitle: 'One short piece of writing',
    writingBody:
      'It is the part that shows what you can actually produce, rather than recognise.',
    writingReadBy: 'A teacher reads this. It is never graded automatically.',
    writingInclude: 'Please include',
    writingSourceLabel: 'Read this first',
    writingWords: (count: number, min: number, max: number) =>
      `${count} words · aim for ${min}–${max}`,
    writingSubmit: 'Finish and see my result',
    writingSkip: 'Skip writing',
    writingSkipHint: 'You can skip, but your teacher will have less to go on.',
    writingPlaceholder: 'Write your answer in German…',

    // errors and state
    errorTitle: 'Something went wrong',
    errorRetry: 'Try again',
    errorGeneric: 'We could not save that answer. Your earlier answers are safe.',
    notPersistentTitle: 'Progress is not being saved',
    notPersistentBody:
      'You can take the whole test and see your result, but you cannot pause and come back later.',
    resumeSaved: 'Your progress is saved. Keep this private link to come back later.',
    resuming: 'Restoring your test…',
    finishing: 'Working out your result…',
    preparingWriting: 'Almost done — one last task…',
  },
  de: {
    intakeEyebrow: 'Vor dem Start',
    intakeTitle: 'Drei kurze Fragen',
    intakeBody:
      'Diese Angaben werden nicht bewertet. Anfänger ohne Vorkenntnisse beginnen direkt bei A1.1; die übrigen Antworten geben Ihrer Lehrkraft Kontext.',
    intakeSubmit: 'Test starten',
    intakeSubmitBeginner: 'Ergebnis anzeigen',
    intakeStarting: 'Wird gestartet…',
    intakeIncomplete: 'Bitte alle drei beantworten.',

    phaseRouter: 'Erste Einschätzung',
    phaseLevel: 'Ihr Niveau',
    phaseBoundary: 'Feinabstimmung',
    phaseWriting: 'Schreiben',
    phaseRouterHint: 'Einige gemischte Fragen, um ungefähr Ihr Niveau zu finden.',
    phaseLevelHint: 'Jetzt schauen wir genauer auf das erreichte Niveau.',
    phaseBoundaryHint: 'Ihr Ergebnis liegt an einer Grenze. Ein paar Fragen klären das.',
    questionOf: (position: number, total: number) => `Frage ${position} von ${total}`,

    next: 'Weiter',
    saving: 'Wird gespeichert…',
    notKnown: 'Weiß ich nicht',
    selectTwo: 'Wählen Sie genau zwei Antworten.',
    orderInstruction:
      'Tippen Sie die Teile in der richtigen Reihenfolge an. Ein gesetzter Teil lässt sich wieder entfernen.',
    orderCleared: 'Noch nichts gesetzt.',
    matchInstruction: 'Ordnen Sie jeder Person ihre Aufgabe zu.',
    typeAnswer: 'Fehlendes Wort eintragen',
    chooseBlank: 'Auswählen',
    spokenBlank: 'Lücke',
    blankLabel: (position: number, total: number) => `Wort ${position} von ${total} auswählen`,
    play: 'Abspielen',
    playAgain: 'Noch einmal',
    playsLeft: (left: number) => (left === 1 ? 'Noch 1 Wiedergabe' : `Noch ${left} Wiedergaben`),
    noPlaysLeft: 'Keine Wiedergabe mehr',
    audioUnavailable: 'Diese Aufnahme ist noch nicht verfügbar.',

    writingEyebrow: 'Letzter Schritt',
    writingTitle: 'Ein kurzer Schreibtext',
    writingBody:
      'Dieser Teil zeigt, was Sie tatsächlich produzieren können — nicht nur wiedererkennen.',
    writingReadBy: 'Eine Lehrkraft liest diesen Text. Er wird nie automatisch bewertet.',
    writingInclude: 'Bitte behandeln Sie',
    writingSourceLabel: 'Lesen Sie zuerst',
    writingWords: (count: number, min: number, max: number) =>
      `${count} Wörter · empfohlen ${min}–${max}`,
    writingSubmit: 'Fertig — Ergebnis anzeigen',
    writingSkip: 'Schreiben überspringen',
    writingSkipHint: 'Sie können überspringen, dann hat Ihre Lehrkraft aber weniger Grundlage.',
    writingPlaceholder: 'Schreiben Sie Ihre Antwort auf Deutsch…',

    errorTitle: 'Etwas ist schiefgelaufen',
    errorRetry: 'Erneut versuchen',
    errorGeneric:
      'Diese Antwort konnte nicht gespeichert werden. Ihre bisherigen Antworten sind sicher.',
    notPersistentTitle: 'Fortschritt wird nicht gespeichert',
    notPersistentBody:
      'Sie können den Test vollständig machen und Ihr Ergebnis sehen, aber nicht pausieren und später fortsetzen.',
    resumeSaved: 'Ihr Fortschritt ist gespeichert. Bewahren Sie diesen privaten Link auf, um später weiterzumachen.',
    resuming: 'Ihr Test wird wiederhergestellt…',
    finishing: 'Ihr Ergebnis wird berechnet…',
    preparingWriting: 'Fast fertig — eine letzte Aufgabe…',
  },
};

export type RunnerCopy = RunnerCopyShape;

/** `a` -> `A`, for the option marker chips. */
export function optionMarker(index: number): string {
  return String.fromCharCode(65 + index);
}
