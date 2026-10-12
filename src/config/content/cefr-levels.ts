import type { LevelKey } from '@/config/brand/tokens';

/**
 * CASA's six levels, A1 to C1 with B1+ — one source for every page that says
 * what a level means (2026-10-12, Rahman: "you have information on levels on
 * multiple pages, use from here").
 *
 * - The levels page (/sprachkurse/niveaustufen) shows each level in full:
 *   `description`, its CEFR band and its picture.
 * - The course pages' „Lernziele nach Niveaustufen" use `summary`, the short
 *   version a row holds, and link here for the rest.
 * - The placement page's level overview shows `summary` with a link to the
 *   level's section.
 *
 * The descriptions are the old casa-bremen.de page „Niveaustufen", after the
 * CEFR's global scale, in the site's „du" (brought back 2026-10-07); the
 * English says the same in plain British English. B1+ is not a CEFR level of
 * its own but one step of the intensive course, between B1 and B2, where the
 * textbook changes to Kontext; the old page described it the same way.
 */

export type CefrBand = 'basic' | 'independent' | 'proficient';

export type CefrLevel = {
  id: LevelKey;
  label: string;
  /** The level's section on the levels page. */
  anchor: string;
  band: CefrBand;
  textbook: 'netzwerk' | 'kontext';
  /** Weeks in the intensive course: 8 for every level, B1+ too. One summer course a year runs 9; the site says 8 (Rahman, 2026-10-12). */
  weeks: string;
  /** B1+: a step of the intensive course, not a CEFR level of its own. */
  isBridge?: boolean;
  /** One or two lines: what a learner can do, for rows and cards. */
  summary: { de: string; en: string };
  /** The full description, on the levels page. */
  description: { de: string; en: string };
  photo: { src: string; alt: { de: string; en: string } };
};

/** The levels page. */
export const LEVELS_PATH = '/courses/levels';

/** The CEFR's three bands, by their German and English names. */
export const CEFR_BANDS: Record<CefrBand, { de: string; en: string; levels: string }> = {
  basic: { de: 'Elementare Sprachverwendung', en: 'Basic user', levels: 'A1 – A2' },
  independent: { de: 'Selbstständige Sprachverwendung', en: 'Independent user', levels: 'B1 – B2' },
  proficient: { de: 'Kompetente Sprachverwendung', en: 'Proficient user', levels: 'C1' },
};

export const CEFR_LEVELS: readonly CefrLevel[] = [
  {
    id: 'a1',
    label: 'A1',
    anchor: 'a1',
    band: 'basic',
    textbook: 'netzwerk',
    weeks: '8',
    summary: {
      de: 'Du verstehst und verwendest vertraute Alltagsausdrücke und ganz einfache Sätze, stellst dich vor und stellst und beantwortest einfache Fragen zur Person.',
      en: 'You understand and use familiar everyday expressions and very simple sentences, introduce yourself and ask and answer simple questions about people.',
    },
    description: {
      en: 'You understand familiar, everyday expressions and very simple sentences, and you can use them yourself to say what you need in daily life. You can introduce yourself and others and ask people questions about themselves, for example where they live, who they know or what they have. You can also answer questions like these yourself. You can communicate in a simple way if the person you are talking to speaks slowly and clearly and is willing to help you.',
      de: 'Du verstehst vertraute, alltägliche Ausdrücke und ganz einfache Sätze und kannst sie selbst verwenden, um zu sagen, was du im Alltag brauchst. Du kannst dich und andere vorstellen und anderen Fragen zu ihrer Person stellen, zum Beispiel, wo sie wohnen, wen sie kennen oder was sie haben. Auf solche Fragen kannst du auch selbst antworten. Du kannst dich auf einfache Art verständigen, wenn dein Gegenüber langsam und deutlich spricht und bereit ist, dir zu helfen.',
    },
    photo: {
      src: '/media/casa/level-a1.webp',
      alt: { de: 'Ein Baby krabbelt und schaut neugierig nach oben', en: 'A baby crawling and looking up with curiosity' },
    },
  },
  {
    id: 'a2',
    label: 'A2',
    anchor: 'a2',
    band: 'basic',
    textbook: 'netzwerk',
    weeks: '8',
    summary: {
      de: 'Du verständigst dich in einfachen Alltagssituationen und beschreibst mit einfachen Worten deine Herkunft, deine Ausbildung und deine Umgebung.',
      en: 'You make yourself understood in simple everyday situations and describe your background, your education and your surroundings in simple words.',
    },
    description: {
      en: 'You understand sentences and frequently used expressions on topics that concern you directly, for example you and your family, shopping, work or your local area. You can make yourself understood in simple, everyday situations, as long as the exchange is straightforward and about familiar things. In simple words, you can describe your background and education, your surroundings and the things you need at the moment.',
      de: 'Du verstehst Sätze und häufig gebrauchte Ausdrücke zu Themen, die dich direkt betreffen, zum Beispiel zu dir und deiner Familie, zum Einkaufen, zur Arbeit oder zu deiner näheren Umgebung. In einfachen, alltäglichen Situationen kannst du dich verständigen, wenn es um einen einfachen und direkten Austausch über vertraute Dinge geht. Mit einfachen Worten kannst du deine Herkunft und Ausbildung, deine Umgebung und Dinge beschreiben, die du gerade brauchst.',
    },
    photo: {
      src: '/media/casa/level-a2.jpg',
      alt: { de: 'Ein Junge schwimmt mit einem blauen Schwimmring im Wasser', en: 'A boy swimming in a blue swim ring' },
    },
  },
  {
    id: 'b1',
    label: 'B1',
    anchor: 'b1',
    band: 'independent',
    textbook: 'netzwerk',
    weeks: '8',
    summary: {
      de: 'Du verstehst das Wichtigste zu vertrauten Themen, erzählst von Erfahrungen, Träumen und Zielen und begründest kurz deine Ansichten.',
      en: 'You understand the main points on familiar topics, talk about your experiences, dreams and goals and briefly give reasons for your views.',
    },
    description: {
      en: 'You understand the main points when clear standard German is used and the subject is familiar, such as work, school or free time. You can deal with most situations you are likely to come across when travelling in German-speaking countries. You can talk about familiar topics and your interests in simple, connected sentences. You can tell people about experiences and events, describe your dreams, hopes and goals, and briefly explain your plans and views or give reasons for them.',
      de: 'Du verstehst die Hauptpunkte, wenn klare Standardsprache verwendet wird und es um vertraute Dinge aus Arbeit, Schule oder Freizeit geht. Die meisten Situationen, die dir auf Reisen in deutschsprachigen Ländern begegnen, kannst du bewältigen. Über vertraute Themen und deine Interessen kannst du dich einfach und zusammenhängend äußern. Du kannst von Erfahrungen und Ereignissen erzählen, Träume, Hoffnungen und Ziele beschreiben und deine Pläne und Ansichten kurz begründen oder erklären.',
    },
    photo: {
      src: '/media/casa/level-b1.jpg',
      alt: { de: 'Ein Mädchen springt über eine Wiese, darüber blauer Himmel', en: 'A girl leaping across a meadow under a blue sky' },
    },
  },
  {
    id: 'b1plus',
    label: 'B1+',
    anchor: 'b1-plus',
    band: 'independent',
    textbook: 'kontext',
    weeks: '8',
    isBridge: true,
    summary: {
      de: 'Du baust Wortschatz, Grammatik und Redemittel aus der B1 aus, übst das freie Sprechen und Schreiben und wirst sicherer. Ab hier lernst du mit Kontext.',
      en: 'You build on the vocabulary, grammar and phrases from B1, practise speaking and writing freely and grow more confident. From here you learn with Kontext.',
    },
    description: {
      en: 'You understand the most important information when clear standard German is spoken and the subject is familiar, such as work, school, free time or travel. You can talk in connected sentences about familiar topics and your interests, describe experiences, dreams, hopes and goals, and give explanations and reasons. But you’d still like to work on grammar and sentence structure, practise useful phrases, build your vocabulary and feel more confident. If so, B1+ is the right level for you. Here you build on the vocabulary, grammar and phrases from B1 and practise speaking and writing freely. This gives you a solid foundation for B2. From B1+ onwards, the course uses the Kontext textbook.',
      de: 'Du verstehst die wichtigsten Informationen, wenn klare Standardsprache gesprochen wird und es um vertraute Dinge aus Arbeit, Schule, Freizeit oder Reisen geht. Du kannst dich zusammenhängend über vertraute Themen und deine Interessen äußern, über Erfahrungen, Träume, Hoffnungen und Ziele sprechen und Erklärungen und Begründungen geben. Du möchtest aber noch an Strukturen und Satzbau arbeiten, Redemittel üben, deinen Wortschatz ausbauen und sicherer werden. Dann ist die B1+ die richtige Stufe für dich. Hier baust du Wortschatz, Grammatik und Redemittel aus der B1 aus und übst das freie Sprechen und Schreiben. So schaffst du dir eine solide Grundlage für die B2. Ab der B1+ arbeitet der Kurs mit dem Lehrwerk Kontext.',
    },
    photo: {
      src: '/media/casa/level-b1plus.webp',
      alt: { de: 'Eine junge Frau kniet in Startposition auf einer Straße', en: 'A young woman crouched at the start on a road' },
    },
  },
  {
    id: 'b2',
    label: 'B2',
    anchor: 'b2',
    band: 'independent',
    textbook: 'kontext',
    weeks: '8',
    summary: {
      de: 'Du verstehst komplexe Texte und Fachdiskussionen in deinem Gebiet und unterhältst dich spontan und fließend, klar und ausführlich zu vielen Themen.',
      en: 'You understand complex texts and specialist discussions in your field and talk spontaneously and fluently, clearly and in detail, on many subjects.',
    },
    description: {
      en: 'You understand the main content of complex texts on concrete and abstract subjects, and in your own field you can follow specialist discussions too. You can communicate so spontaneously and fluently that an ordinary conversation with native speakers takes no great effort on either side. You can express yourself clearly and in detail on many different subjects, explain your point of view on a current issue and set out the pros and cons of different options.',
      de: 'Du verstehst die Hauptinhalte komplexer Texte zu konkreten und abstrakten Themen und in deinem eigenen Fachgebiet auch Fachdiskussionen. Du kannst dich so spontan und fließend verständigen, dass ein normales Gespräch mit Muttersprachlerinnen und Muttersprachlern für beide Seiten ohne größere Anstrengung möglich ist. Zu vielen verschiedenen Themen kannst du dich klar und ausführlich äußern, deinen Standpunkt zu einer aktuellen Frage erklären und die Vor- und Nachteile verschiedener Möglichkeiten nennen.',
    },
    photo: {
      src: '/media/casa/level-b2.webp',
      alt: { de: 'Läuferinnen laufen jubelnd durch das Zielband', en: 'Runners cheering as they break the finishing tape' },
    },
  },
  {
    id: 'c1',
    label: 'C1',
    anchor: 'c1',
    band: 'proficient',
    textbook: 'kontext',
    weeks: '8',
    summary: {
      de: 'Du verstehst anspruchsvolle, längere Texte, auch zwischen den Zeilen, und drückst dich spontan, fließend und flexibel aus, im Beruf wie im Studium.',
      en: 'You understand demanding, longer texts, including what is implied, and express yourself spontaneously, fluently and flexibly at work and at university.',
    },
    description: {
      en: 'You understand many demanding, longer texts and can also read between the lines. You express yourself spontaneously and fluently, and you rarely have to stop and search for words. You use the language effectively and flexibly in social and working life, in vocational training and at university. You express yourself on complex subjects clearly, in detail and in a well-structured way, linking your ideas with suitable language.',
      de: 'Du verstehst viele anspruchsvolle, längere Texte und erfasst auch, was zwischen den Zeilen steht. Du drückst dich spontan und fließend aus, ohne oft erkennbar nach Worten suchen zu müssen. Im gesellschaftlichen und beruflichen Leben, in der Ausbildung und im Studium setzt du die Sprache wirksam und flexibel ein. Zu komplexen Sachverhalten äußerst du dich klar, gut gegliedert und ausführlich und verknüpfst deine Gedanken dabei mit passenden sprachlichen Mitteln.',
    },
    photo: {
      src: '/media/casa/level-c1.jpg',
      alt: { de: 'Eine Läuferin nimmt am Meer die Treppe hinauf', en: 'A runner taking the stairs by the sea' },
    },
  },
];

const byLabel = new Map(CEFR_LEVELS.map((level) => [level.label, level]));

/** The level for a label as the site writes it: "A1", "B1+". Ranges ("A1-A2") have none. */
export const cefrLevel = (label: string): CefrLevel | undefined => byLabel.get(label.trim().toUpperCase());

/** The level's section on the levels page. */
export const levelHref = (label: string): string => {
  const level = cefrLevel(label);
  return level ? `${LEVELS_PATH}#${level.anchor}` : LEVELS_PATH;
};
