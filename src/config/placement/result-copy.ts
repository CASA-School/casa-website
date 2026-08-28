/**
 * Learner-facing result copy.
 *
 * ASSUMPTION (2026-08-23). The upstream package ships `content/result/`, which
 * is not present on this machine. This copy is authored here and is subject to
 * the same CASA approval as the rest: "Public result wording" is on the list of
 * things requiring human approval before live use.
 *
 * THREE HARD RULES, from the package's explicit non-decisions:
 *
 *  1. Never call the result a certificate.
 *  2. Never use pass/fail language. Nobody fails a placement — that is not what
 *     it measures.
 *  3. Never present a shadow-mode or above-ceiling result as final.
 *
 * Reason codes never appear here. A learner must never read
 * "router_level_disagreement"; they read a sentence about what happens next.
 * The mapping lives in `reviewNotice` below and is deliberately lossy — several
 * distinct staff-facing reasons collapse into one honest learner-facing line.
 *
 * Safe on the client.
 */

import type { PlacementBand } from '@/lib/placement/types';
import type { PlacementReviewReason } from './policy';

export type BandCopy = {
  /** What this band means, in plain language. No CEFR jargon in the first line. */
  summary: { en: string; de: string };
  /** What a learner at this band can already do. Concrete, not aspirational. */
  canDo: { en: readonly string[]; de: readonly string[] };
  /** The course this band leads into. Slugs verified against src/config/courses. */
  courseSlug: 'intensive-german' | 'evening-german' | 'exam-preparation';
};

/**
 * One entry per band. Written as "you can already…" rather than "you cannot
 * yet…": the same information, but a placement result is the first thing a
 * prospective student reads about themselves at CASA.
 */
export const BAND_COPY: Record<PlacementBand, BandCopy> = {
  'A1.1': {
    summary: {
      en: 'You are at the very start, which is exactly where the first course begins.',
      de: 'Sie stehen am Anfang — genau dort, wo der erste Kurs beginnt.',
    },
    canDo: {
      en: ['Introduce yourself with a few set phrases', 'Recognise some everyday words'],
      de: ['Sich mit einigen festen Wendungen vorstellen', 'Einzelne Alltagswörter erkennen'],
    },
    courseSlug: 'intensive-german',
  },
  'A1.2': {
    summary: {
      en: 'You handle simple, familiar situations and are ready to finish the A1 level.',
      de: 'Sie bewältigen einfache, vertraute Situationen und können das Niveau A1 abschließen.',
    },
    canDo: {
      en: ['Ask and answer simple questions about yourself', 'Understand short notices and times'],
      de: ['Einfache Fragen zu sich stellen und beantworten', 'Kurze Hinweise und Uhrzeiten verstehen'],
    },
    courseSlug: 'intensive-german',
  },
  'A2.1': {
    summary: {
      en: 'You manage routine exchanges about everyday things.',
      de: 'Sie meistern alltägliche Gespräche über vertraute Themen.',
    },
    canDo: {
      en: ['Talk about your day, your work, and your plans', 'Understand short messages and announcements'],
      de: ['Über Alltag, Arbeit und Pläne sprechen', 'Kurze Nachrichten und Ansagen verstehen'],
    },
    courseSlug: 'intensive-german',
  },
  'A2.2': {
    summary: {
      en: 'You connect your sentences and cope with most simple practical situations.',
      de: 'Sie verbinden Ihre Sätze und bewältigen die meisten einfachen Alltagssituationen.',
    },
    canDo: {
      en: ['Explain a reason, a problem, or a change of plan', 'Read short factual texts for detail'],
      de: ['Gründe, Probleme oder Planänderungen erklären', 'Kurze Sachtexte im Detail lesen'],
    },
    courseSlug: 'intensive-german',
  },
  'B1.1': {
    summary: {
      en: 'You are moving into independent use of German.',
      de: 'Sie gehen zum selbstständigen Sprachgebrauch über.',
    },
    canDo: {
      en: ['Follow a conversation on familiar topics', 'Write a clear message with a reason and a request'],
      de: ['Einem Gespräch über vertraute Themen folgen', 'Eine klare Nachricht mit Begründung und Bitte schreiben'],
    },
    courseSlug: 'intensive-german',
  },
  'B1.2': {
    summary: {
      en: 'You use German independently in most everyday and work situations.',
      de: 'Sie verwenden Deutsch selbstständig in den meisten Alltags- und Arbeitssituationen.',
    },
    canDo: {
      en: ['Give and justify an opinion', 'Handle unexpected situations in shops, offices, and at work'],
      de: ['Eine Meinung äußern und begründen', 'Unerwartete Situationen im Alltag und im Beruf bewältigen'],
    },
    courseSlug: 'intensive-german',
  },
  'B1+': {
    summary: {
      en: 'You are between B1 and B2 — the step CASA teaches as its own bridge level.',
      de: 'Sie befinden sich zwischen B1 und B2 — die Stufe, die CASA als eigenes Brückenniveau unterrichtet.',
    },
    canDo: {
      en: ['Take part in discussions and meetings', 'Read longer texts and pick out the argument'],
      de: ['An Diskussionen und Besprechungen teilnehmen', 'Längere Texte lesen und die Argumentation erfassen'],
    },
    courseSlug: 'intensive-german',
  },
  'B2.1': {
    summary: {
      en: 'You work with more abstract and professional language.',
      de: 'Sie arbeiten mit abstrakterer und beruflicher Sprache.',
    },
    canDo: {
      en: ['Argue a position with qualification', 'Follow discussion at natural speed'],
      de: ['Eine Position differenziert begründen', 'Diskussionen in natürlichem Tempo folgen'],
    },
    courseSlug: 'intensive-german',
  },
  'B2.2': {
    summary: {
      en: 'You are approaching the level most employers and universities ask for.',
      de: 'Sie erreichen bald das Niveau, das Arbeitgeber und Hochschulen meist verlangen.',
    },
    canDo: {
      en: ['Write structured, well-connected texts', 'Weigh advantages and drawbacks precisely'],
      de: ['Strukturierte, gut verbundene Texte schreiben', 'Vor- und Nachteile präzise abwägen'],
    },
    courseSlug: 'exam-preparation',
  },
  'C1.1': {
    summary: {
      en: 'You use German flexibly for demanding academic and professional purposes.',
      de: 'Sie verwenden Deutsch flexibel für anspruchsvolle akademische und berufliche Zwecke.',
    },
    canDo: {
      en: ['Handle implicit meaning and register', 'Produce clear, well-structured argument at length'],
      de: ['Implizite Bedeutung und Register erfassen', 'Längere, klar strukturierte Argumentationen verfassen'],
    },
    courseSlug: 'exam-preparation',
  },
  'C1.2': {
    summary: {
      en: 'You operate close to full command of German in demanding contexts.',
      de: 'Sie beherrschen Deutsch in anspruchsvollen Kontexten nahezu vollständig.',
    },
    canDo: {
      en: ['Express nuance and precise qualification', 'Work with specialised and academic sources'],
      de: ['Nuancen und präzise Einschränkungen ausdrücken', 'Mit fachlichen und akademischen Quellen arbeiten'],
    },
    courseSlug: 'exam-preparation',
  },
};

/**
 * What a learner is told when the result goes to a teacher.
 *
 * One line per situation, chosen by the highest-priority reason. Deliberately
 * lossy: five staff-facing codes can share one learner-facing sentence, because
 * the learner's question is always the same — "so what happens now?"
 */
export function reviewNotice(
  reasons: readonly PlacementReviewReason[],
  locale: 'en' | 'de'
): { title: string; body: string } | null {
  if (reasons.length === 0) return null;

  const has = (reason: PlacementReviewReason) => reasons.includes(reason);

  if (has('technical_problem') || has('incomplete_objective_evidence')) {
    return locale === 'de'
      ? {
          title: 'Wir schauen uns Ihr Ergebnis noch persönlich an',
          body: 'Der Test wurde nicht vollständig abgeschlossen, deshalb prüft eine Lehrkraft Ihre Antworten, bevor wir eine Empfehlung bestätigen. Sie können den Test auch erneut starten.',
        }
      : {
          title: 'A teacher will look at your result',
          body: 'The test was not completed in full, so a teacher will read your answers before we confirm a recommendation. You are also welcome to take it again.',
        };
  }

  if (has('router_level_disagreement') || has('low_confidence') || has('unresolved_boundary')) {
    return locale === 'de'
      ? {
          title: 'Ihr Ergebnis liegt zwischen zwei Gruppen',
          body: 'Ihre Antworten deuten auf zwei mögliche Kursniveaus hin. Eine Lehrkraft entscheidet gemeinsam mit Ihnen, welche Gruppe besser passt — das ist häufig und kein Problem.',
        }
      : {
          title: 'Your result sits between two groups',
          body: 'Your answers point to two possible course levels. A teacher will settle it with you before you start. This is common and nothing to worry about.',
        };
  }

  if (has('b1plus_b2_boundary') || has('above_auto_confirm_ceiling') || has('speaking_required')) {
    return locale === 'de'
      ? {
          title: 'Ein kurzes Gespräch schließt die Einstufung ab',
          body: 'Ab diesem Niveau gehört ein kurzes Gespräch mit einer Lehrkraft zur Einstufung. Wir prüfen dabei vor allem Sprechen — schriftliche Aufgaben allein reichen hier nicht aus.',
        }
      : {
          title: 'A short conversation completes your placement',
          body: 'From this level a short conversation with a teacher is part of the placement. It covers speaking, which written tasks alone cannot show.',
        };
  }

  if (has('uneven_skill_profile')) {
    return locale === 'de'
      ? {
          title: 'Ihre Stärken liegen unterschiedlich',
          body: 'Ihre Ergebnisse in den einzelnen Bereichen unterscheiden sich deutlich. Eine Lehrkraft sieht sich das an, damit Sie nicht in einer Gruppe landen, die in einem Bereich zu leicht und in einem anderen zu schwer ist.',
        }
      : {
          title: 'Your strengths are uneven',
          body: 'Your results differ noticeably between areas. A teacher will look at this so you are not placed in a group that is too easy in one skill and too hard in another.',
        };
  }

  // Shadow mode alone, or a learner-requested review.
  return locale === 'de'
    ? {
        title: 'Eine Lehrkraft bestätigt Ihre Einstufung',
        body: 'Bei CASA bestätigt immer eine Lehrkraft die Einstufung, bevor Ihr Kurs beginnt. Ihre Empfehlung unten ist der Ausgangspunkt für dieses Gespräch.',
      }
    : {
        title: 'A teacher confirms your placement',
        body: 'At CASA a teacher always confirms the placement before your course starts. The recommendation below is the starting point for that conversation.',
      };
}

/** Skill names as a learner should read them. */
export const SKILL_LABELS = {
  language_use: { en: 'Grammar and structures', de: 'Grammatik und Strukturen' },
  reading: { en: 'Reading', de: 'Lesen' },
  listening: { en: 'Listening', de: 'Hören' },
} as const;

/**
 * Why a skill shows no result.
 *
 * Currently only one cause — no audio yet — but stated plainly rather than
 * rendered as a zero, which would read as a failure the learner never had the
 * chance to avoid.
 */
export const SKILL_NOT_MEASURED = {
  en: 'Not part of this version of the test yet',
  de: 'In dieser Testversion noch nicht enthalten',
} as const;
