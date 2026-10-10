'use client';

import { CasaImage as Image } from '@/components/ui/casa-image';
import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { levelTokens, type LevelKey } from '@/config/brand/tokens';
import { klettTextbookByLevelId, seriesAccent } from '@/config/content/klett-textbooks';
import { cn } from '@/lib/utils';
import { useSiteCopy } from '@/components/cms/site-copy-provider';

type Level = {
  id: LevelKey;
  label: string;
  /** Weeks in the intensive format. See the two sourcing constants below. */
  weeks: string;
  /** B1+ is a single half-level step, not a full CEFR level. */
  isBridge?: boolean;
  description: { en: string; de: string };
};

/**
 * Verified: a full CEFR level takes 8-9 weeks in the intensive format at
 * 20 UE/week (docs/COURSE_FACTS_SOURCE_OF_TRUTH.md:52; src/app/courses/page.tsx:114).
 * The figure is uniform across A1-C1 — nothing in the repo says higher levels
 * take longer, and the pricing engine treats every full level as 8 weeks
 * (src/config/calculator/pricing.ts:44). Per-level lesson totals are not
 * published anywhere, so this states the weekly RATE instead of a total.
 *
 * This is the SITE-VERIFIED figure for full levels (A1-C1). B1+ carries its
 * own constant — see WEEKS_FOR_BRIDGE_STAFF_CONFIRMED below — because it is
 * not a full level.
 */
const WEEKS_PER_LEVEL = '8-9';
const LESSONS_PER_WEEK = 20;

/**
 * B1+ duration — staff-confirmed, tracked separately from WEEKS_PER_LEVEL.
 *
 * casa-bremen.de does not publish a B1+ duration. Rahman (project owner, in
 * direct contact with CASA) confirmed 2026-08-13 that B1+ runs about two months,
 * the same order as a full level, despite billing at the half-level rate (see
 * CASA_LEVEL_GROUPS in pricing.ts). It is one step of the intensive course,
 * between B1.2 and B2.1, taught with Kontext B1+; the registration offers it as
 * "B1+ · 8 Wochen" (src/lib/registration/levels.ts).
 *
 * The card used to add "Angabe der Schule, nicht auf casa-bremen.de
 * veröffentlicht" under the duration. That was a note about where the number
 * came from, and on CASA's own site it read as an internal remark; it lives
 * here and in docs/COURSE_FACTS_SOURCE_OF_TRUTH.md now (2026-10-07).
 */
const WEEKS_FOR_BRIDGE_STAFF_CONFIRMED = '8-9';

/*
 * The German descriptions are the old casa-bremen.de page „Niveaustufen“
 * (/sprachkurse/niveaustufen, which now redirects here): what a learner can do
 * on each level, after the CEFR's global scale, already in „du“. Brought back
 * 2026-10-07 in the site's plain voice; the English says the same, written
 * afresh in plain British English rather than quoting the CEFR's own wording.
 */
const LEVELS: Level[] = [
  {
    id: 'a1',
    label: 'A1',
    weeks: WEEKS_PER_LEVEL,
    description: {
      en: 'You understand familiar, everyday expressions and very simple sentences, and you can use them yourself to say what you need in daily life. You can introduce yourself and others and ask people questions about themselves, for example where they live, who they know or what they have. You can also answer questions like these yourself. You can communicate in a simple way if the person you are talking to speaks slowly and clearly and is willing to help you.',
      de: 'Du verstehst vertraute, alltägliche Ausdrücke und ganz einfache Sätze und kannst sie selbst verwenden, um zu sagen, was du im Alltag brauchst. Du kannst dich und andere vorstellen und anderen Fragen zu ihrer Person stellen, zum Beispiel, wo sie wohnen, wen sie kennen oder was sie haben. Auf solche Fragen kannst du auch selbst antworten. Du kannst dich auf einfache Art verständigen, wenn dein Gegenüber langsam und deutlich spricht und bereit ist, dir zu helfen.',
    },
  },
  {
    id: 'a2',
    label: 'A2',
    weeks: WEEKS_PER_LEVEL,
    description: {
      en: 'You understand sentences and frequently used expressions on topics that concern you directly, for example you and your family, shopping, work or your local area. You can make yourself understood in simple, everyday situations, as long as the exchange is straightforward and about familiar things. In simple words, you can describe your background and education, your surroundings and the things you need at the moment.',
      de: 'Du verstehst Sätze und häufig gebrauchte Ausdrücke zu Themen, die dich direkt betreffen, zum Beispiel zu dir und deiner Familie, zum Einkaufen, zur Arbeit oder zu deiner näheren Umgebung. In einfachen, alltäglichen Situationen kannst du dich verständigen, wenn es um einen einfachen und direkten Austausch über vertraute Dinge geht. Mit einfachen Worten kannst du deine Herkunft und Ausbildung, deine Umgebung und Dinge beschreiben, die du gerade brauchst.',
    },
  },
  {
    id: 'b1',
    label: 'B1',
    weeks: WEEKS_PER_LEVEL,
    description: {
      en: 'You understand the main points when clear standard German is used and the subject is familiar, such as work, school or free time. You can deal with most situations you are likely to come across when travelling in German-speaking countries. You can talk about familiar topics and your interests in simple, connected sentences. You can tell people about experiences and events, describe your dreams, hopes and goals, and briefly explain your plans and views or give reasons for them.',
      de: 'Du verstehst die Hauptpunkte, wenn klare Standardsprache verwendet wird und es um vertraute Dinge aus Arbeit, Schule oder Freizeit geht. Die meisten Situationen, die dir auf Reisen in deutschsprachigen Ländern begegnen, kannst du bewältigen. Über vertraute Themen und deine Interessen kannst du dich einfach und zusammenhängend äußern. Du kannst von Erfahrungen und Ereignissen erzählen, Träume, Hoffnungen und Ziele beschreiben und deine Pläne und Ansichten kurz begründen oder erklären.',
    },
  },
  {
    // Not a CEFR level of its own: B1+ is a single step of the intensive course
    // (one entry in CASA_LEVEL_SEQUENCE, src/config/calculator/pricing.ts:25),
    // and it is where the textbook switches from Netzwerk neu to Kontext
    // (pricing.ts:98). Both languages say who it is for, as the old
    // casa-bremen.de page did, and that the course moves on to Kontext here.
    id: 'b1plus',
    label: 'B1+',
    weeks: WEEKS_FOR_BRIDGE_STAFF_CONFIRMED,
    isBridge: true,
    description: {
      en: 'You understand the most important information when clear standard German is spoken and the subject is familiar, such as work, school, free time or travel. You can talk in connected sentences about familiar topics and your interests, describe experiences, dreams, hopes and goals, and give explanations and reasons. But you’d still like to work on grammar and sentence structure, practise useful phrases, build your vocabulary and feel more confident. If so, B1+ is the right level for you. Here you build on the vocabulary, grammar and phrases from B1 and practise speaking and writing freely. This gives you a solid foundation for B2. From B1+ onwards, the course uses the Kontext textbook.',
      de: 'Du verstehst die wichtigsten Informationen, wenn klare Standardsprache gesprochen wird und es um vertraute Dinge aus Arbeit, Schule, Freizeit oder Reisen geht. Du kannst dich zusammenhängend über vertraute Themen und deine Interessen äußern, über Erfahrungen, Träume, Hoffnungen und Ziele sprechen und Erklärungen und Begründungen geben. Du möchtest aber noch an Strukturen und Satzbau arbeiten, Redemittel üben, deinen Wortschatz ausbauen und sicherer werden. Dann ist die B1+ die richtige Stufe für dich. Hier baust du Wortschatz, Grammatik und Redemittel aus der B1 aus und übst das freie Sprechen und Schreiben. So schaffst du dir eine solide Grundlage für die B2. Ab der B1+ arbeitet der Kurs mit dem Lehrwerk Kontext.',
    },
  },
  {
    id: 'b2',
    label: 'B2',
    weeks: WEEKS_PER_LEVEL,
    description: {
      en: 'You understand the main content of complex texts on concrete and abstract subjects, and in your own field you can follow specialist discussions too. You can communicate so spontaneously and fluently that an ordinary conversation with native speakers takes no great effort on either side. You can express yourself clearly and in detail on many different subjects, explain your point of view on a current issue and set out the pros and cons of different options.',
      de: 'Du verstehst die Hauptinhalte komplexer Texte zu konkreten und abstrakten Themen und in deinem eigenen Fachgebiet auch Fachdiskussionen. Du kannst dich so spontan und fließend verständigen, dass ein normales Gespräch mit Muttersprachlerinnen und Muttersprachlern für beide Seiten ohne größere Anstrengung möglich ist. Zu vielen verschiedenen Themen kannst du dich klar und ausführlich äußern, deinen Standpunkt zu einer aktuellen Frage erklären und die Vor- und Nachteile verschiedener Möglichkeiten nennen.',
    },
  },
  {
    id: 'c1',
    label: 'C1',
    weeks: WEEKS_PER_LEVEL,
    description: {
      en: 'You understand many demanding, longer texts and can also read between the lines. You express yourself spontaneously and fluently, and you rarely have to stop and search for words. You use the language effectively and flexibly in social and working life, in vocational training and at university. You express yourself on complex subjects clearly, in detail and in a well-structured way, linking your ideas with suitable language.',
      de: 'Du verstehst viele anspruchsvolle, längere Texte und erfasst auch, was zwischen den Zeilen steht. Du drückst dich spontan und fließend aus, ohne oft erkennbar nach Worten suchen zu müssen. Im gesellschaftlichen und beruflichen Leben, in der Ausbildung und im Studium setzt du die Sprache wirksam und flexibel ein. Zu komplexen Sachverhalten äußerst du dich klar, gut gegliedert und ausführlich und verknüpfst deine Gedanken dabei mit passenden sprachlichen Mitteln.',
    },
  },
];


/**
 * Shows which Klett textbook a level is taught from. Renders the licensed cover
 * when one is available and a designed stand-in otherwise, so the section works
 * before Klett's image permission is on file. See config/content/klett-textbooks.
 */
function TextbookCard({ levelId, locale, label }: { levelId: string; locale: 'en' | 'de'; label: string }) {
  const { say } = useSiteCopy();
  const book = klettTextbookByLevelId[levelId];

  if (!book) {
    return null;
  }

  const accent = seriesAccent[book.series];
  const coverAlt =
    say(locale, 'Titelbild des Lehrwerks {title} von Ernst Klett Sprachen', 'Cover of the {title} textbook published by Ernst Klett Sprachen', { title: book.title });

  return (
    <div className="flex gap-4 rounded-xl border border-[color:var(--casa-sand)]/70 bg-white p-5 shadow-xs">
      <div className="shrink-0">
        {book.coverPermission === 'granted' && book.coverSrc ? (
          <Image
            src={book.coverSrc}
            alt={coverAlt}
            width={96}
            height={132}
            className="h-[8.25rem] w-24 rounded-lg object-cover shadow-[var(--shadow-card)]"
          />
        ) : (
          // Stand-in until a licensed cover is on file. Deliberately does not
          // imitate Klett's artwork — it reads as a book without pretending to
          // be the real cover.
          <div
            aria-hidden
            className="flex h-[8.25rem] w-24 flex-col justify-between overflow-hidden rounded-lg p-2.5 shadow-[var(--shadow-card)]"
            style={{
              background: `linear-gradient(150deg, ${accent.bg} 0%, color-mix(in srgb, ${accent.bg} 68%, #0f172a) 100%)`,
              borderLeft: `5px solid color-mix(in srgb, ${accent.bg} 55%, #0f172a)`,
            }}
          >
            <span className="text-xs font-semibold uppercase leading-tight tracking-eyebrow text-white/80">
              {book.seriesLabel}
            </span>
            <span className="text-xl font-black leading-none text-white">{book.level}</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">{label}</p>
        <p className="mt-2 text-base font-bold leading-tight text-[var(--casa-ink)]">{book.title}</p>
        <p className="mt-1 text-xs text-[var(--casa-muted)]">Ernst Klett Sprachen</p>
        {book.isbn ? <p className="mt-1 text-xs tabular-nums text-[var(--casa-text-subtle)]">ISBN {book.isbn}</p> : null}
        {book.productUrl ? (
          <a
            href={book.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-semibold text-[var(--casa-accent-text)] hover:underline"
          >
            {say(locale, 'Beim Verlag ansehen', 'View at the publisher')}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}

type Props = {
  locale?: 'en' | 'de';
  className?: string;
};

export function LevelProgressionTimeline({ locale = 'en', className }: Props) {
  const { pickTree, say } = useSiteCopy();
  const [active, setActive] = useState<LevelKey>('a1');
  const activeLevel = LEVELS.find((l) => l.id === active)!;

  const copy =
    pickTree(locale, { de: {
          eyebrow: 'Niveaustufen',
          title: 'Was du auf jeder Stufe kannst',
          description:
            'In unserer Schule finden fortlaufend Kurse auf den Niveaustufen A1, A2, B1, B1+, B2 und C1 statt. Wir orientieren uns dabei streng am Gemeinsamen Europäischen Referenzrahmen (GER).',
          pace: `Im Intensivkurs hast du ${LESSONS_PER_WEEK} Unterrichtseinheiten à 45 Minuten pro Woche. Eine ganze Niveaustufe dauert dort in der Regel ${WEEKS_PER_LEVEL.replace('-', '–')} Wochen, die B1+ genauso lange. Im Abendkurs dauert eine halbe Niveaustufe etwa ein Trimester.`,
          paceLabel: 'Dauer pro Niveaustufe',
          weeks: 'Wochen',
          rate: `${LESSONS_PER_WEEK} UE pro Woche (je 45 Min.)`,
          textbook: 'Lehrwerk',
        }, en: {
          eyebrow: 'Levels',
          title: 'What you can do at each level',
          description:
            'At our school, courses run continuously at levels A1, A2, B1, B1+, B2 and C1. We keep strictly to the Common European Framework of Reference for Languages (CEFR).',
          pace: `On the intensive course, you have ${LESSONS_PER_WEEK} lessons of 45 minutes a week, and a whole level usually takes ${WEEKS_PER_LEVEL.replace('-', '–')} weeks. B1+ takes just as long. On the evening course, half a level takes about one trimester.`,
          paceLabel: 'Time per level',
          weeks: 'weeks',
          rate: `${LESSONS_PER_WEEK} lessons a week (45 min each)`,
          textbook: 'Textbook',
        } });

  return (
    <section className={cn('rounded-xl bg-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)] sm:p-8', className)}>
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{copy.eyebrow}</p>
      <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
      <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl">{copy.title}</h2>
      <p className="mt-2 text-sm text-[var(--casa-muted)]">{copy.description}</p>
      <p className="mt-1 text-sm text-[var(--casa-muted)]">{copy.pace}</p>

      {/* Level selector */}
      <div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label={say(locale, 'Kursstufen', 'Course levels')}>
        {LEVELS.map((level, idx) => {
          const isActive = level.id === active;
          return (
            <button
              key={level.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(level.id)}
              className={cn(
                'relative flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'shadow-[var(--shadow-soft)]'
                  : 'border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] text-[var(--casa-muted)] hover:border-[color:var(--casa-sand)] hover:bg-white'
              )}
              // The selected tab wears its own level colour, so the ramp reads
              // as a progression. `ink` is measured per step because the scale
              // crosses over between B1+ and B2.
              style={
                isActive
                  ? {
                      background: levelTokens[level.id].surface,
                      color: levelTokens[level.id].ink,
                      borderColor: levelTokens[level.id].surface,
                    }
                  : undefined
              }
            >
              {/* Connector line between tabs */}
              {idx < LEVELS.length - 1 && (
                <span
                  className="pointer-events-none absolute -right-[9px] top-1/2 z-10 h-px w-2 -translate-y-1/2 bg-[var(--casa-sand)]"
                  aria-hidden
                />
              )}
              {level.label}
            </button>
          );
        })}
      </div>

      {/* Active level detail */}
      <div
        role="tabpanel"
        aria-label={`Level ${activeLevel.label} details`}
        className="mt-6 grid gap-4 sm:grid-cols-2"
      >
        {/* Description */}
        <div className="flex flex-col gap-3 rounded-xl bg-[var(--casa-surface-wash)] p-5 sm:col-span-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-lg px-2.5 py-0.5 text-sm font-bold tracking-eyebrow"
              style={{
                background: levelTokens[activeLevel.id].surface,
                color: levelTokens[activeLevel.id].ink,
              }}
            >
              {activeLevel.label}
            </span>
            {activeLevel.isBridge ? (
              <span className="text-xs font-semibold text-[var(--casa-text-subtle)]">
                {say(locale, 'Zwischenstufe', 'In-between level')}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-[var(--casa-ink)]">
            {locale === 'de' ? activeLevel.description.de : activeLevel.description.en}
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-col justify-between rounded-xl border border-[color:var(--casa-sand)]/70 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">
            {copy.paceLabel}
          </p>
          <div className="mt-3">
            <p className="text-3xl font-black text-[var(--casa-ink)]">
              {activeLevel.weeks}
              <span className="ml-1 text-sm font-semibold text-[var(--casa-text-subtle)]">{copy.weeks}</span>
            </p>
            <p className="mt-0.5 text-sm text-[var(--casa-muted)]">{copy.rate}</p>
          </div>
        </div>

        {/* Textbook card — replaces the former price card. Course fees are
            deliberately not stated here; they will come from the central
            dashboard once it exists. See docs/COURSE_FACTS_SOURCE_OF_TRUTH.md. */}
        <TextbookCard levelId={activeLevel.id} locale={locale} label={copy.textbook} />
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="mb-1.5 flex justify-between text-xs text-[var(--casa-text-subtle)]">
          <span>A1</span>
          <span>C1</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--casa-surface-subtle)]">
          {LEVELS.map((level) => (
            <span
              key={level.id}
              // The bar IS the scale: each segment wears its level's colour, so
              // A1 to C1 reads light-to-deep at a glance.
              style={{
                width: `${100 / LEVELS.length}%`,
                background: levelTokens[level.id].surface,
                opacity: level.id === active ? 1 : 0.55,
              }}
              className="inline-block h-full transition-all duration-300"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
