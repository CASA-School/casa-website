/**
 * How the site's search and CLARA read text: one normalisation for the pages
 * and for what a visitor types, so „Prüfung", "prufung" and "pruefung" are the
 * same word, "Kurse" finds "Kurs", and "Kosten" finds a "Preis".
 *
 * Pure functions, no I/O: the index (engine.ts) and the tests both use them.
 */

/** Lowercase, umlauts and ß folded, accents dropped: „Gebühren" → "gebuhren". */
export function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    // Typed without umlauts: "pruefung" is "prüfung".
    .replace(/([bcdfghjklmnpqrstvwxz])(ae|oe|ue)/g, (_, consonant: string, pair: string) => consonant + pair[0]);
}

/** Folded like everything else, so "für" and "does" (→ "dos") are recognised. */
const STOPWORDS = new Set(
  (
    // German
    'aber als also am an auch auf aus bei bin bis bist da damit dann das dass dein deine dem den der des dich die dir doch du durch ein eine einem einen einer eines er es euch euer eure für gibt habe haben hast hat hier ich ihr im in ins ist ja kann kannst können könnte man mein meine mich mir mit muss musst müssen nach nicht noch nur ob oder sich sie sind so soll sollte über um und uns unser unsere vom von vor war was weil wenn werde werden wie wir wird zu zum zur bitte gerne hallo ' +
    'schon findet finden statt gibt gibts bekomme bekommst bekommt bekommen brauche brauchst braucht brauchen möchte möchten mochte will willst wollen darf dürfen genau eigentlich gerade ganz mal etwas jemand euren eurer eurem ' +
    // English
    'a an and are as at be been but by can could do does did for from have has how i if in into is it its me my of on or our please should so than that the their them then there these they this to us was we were what which will with would you your hello hi ' +
    'take get got need want like any some also just here moment currently right'
  )
    .split(/\s+/)
    .map((word) => fold(word))
);

/**
 * Words that ask *what kind* of answer is wanted. They are not stopwords for
 * intent detection (answers.ts reads them), only for ranking.
 */
export const QUESTION_WORDS = new Set(['wann', 'wo', 'wie', 'viel', 'viele', 'when', 'where', 'much', 'many', 'welche', 'welcher', 'welches', 'welchen', 'welchem', 'which', 'who', 'wer', 'warum', 'wieso', 'why']);

/**
 * Words and numbers: "B1+" keeps its plus (a level of its own), "117,50" its
 * decimals, "telc-Prüfung" is two words.
 */
export function words(value: string): string[] {
  const folded = fold(value);
  const out: string[] = [];
  for (const match of folded.matchAll(/\d{1,2}:\d{2}|\d+(?:[.,]\d+)?|[a-z][a-z0-9]*\+?/g)) {
    out.push(match[0].replace(',', '.'));
  }
  return out;
}

/**
 * A light stemmer for German and English: enough that plural, case and verb
 * endings meet ("kurse", "kursen" → "kurs"; "courses" → "cours"), never so
 * much that two different words collapse. Numbers and short words stay.
 */
export function stem(word: string): string {
  if (word.length <= 4 || /\d/.test(word) || word.endsWith('+')) return word;
  const rules: Array<[string, string]> = [
    ['ungen', 'ung'],
    ['innen', 'in'],
    ['ies', 'y'],
    ['ing', ''],
    ['ern', ''],
    ['en', ''],
    ['er', ''],
    ['es', ''],
    ['em', ''],
    ['ed', ''],
    ['e', ''],
    ['n', ''],
    ['s', ''],
  ];
  for (const [suffix, replacement] of rules) {
    if (word.endsWith(suffix) && word.length - suffix.length + replacement.length >= 4) {
      return word.slice(0, word.length - suffix.length) + replacement;
    }
  }
  return word;
}

/**
 * Concepts: the words a visitor uses for one thing, in both languages. A text
 * that says „Preis" and a question that says "Kosten" or "fee" meet on the
 * concept `~price`. Members are written folded (no umlauts).
 */
const CONCEPTS: Record<string, string[]> = {
  price: ['preis', 'preise', 'kosten', 'kostet', 'gebuhr', 'gebuhren', 'teuer', 'euro', 'eur', 'price', 'prices', 'cost', 'costs', 'fee', 'fees', 'expensive', 'tuition', 'kursgebuhr'],
  course: ['kurs', 'kurse', 'sprachkurs', 'deutschkurs', 'unterricht', 'course', 'courses', 'class', 'classes', 'lesson', 'lessons'],
  intensive: ['intensiv', 'intensivkurs', 'intensivkurse', 'vormittag', 'vormittags', 'intensive', 'morning', 'mornings'],
  evening: ['abend', 'abends', 'abendkurs', 'abendkurse', 'feierabend', 'evening', 'evenings', 'night', 'after work'],
  special: ['spezialkurs', 'spezialkurse', 'aussprache', 'grammatik', 'schreiben', 'konversation', 'special', 'pronunciation', 'grammar', 'writing', 'conversation'],
  accommodation: ['unterkunft', 'wohnen', 'wohnung', 'zimmer', 'wg', 'wohngemeinschaft', 'gastfamilie', 'gastfamilien', 'gastgeber', 'miete', 'accommodation', 'housing', 'room', 'rooms', 'flat', 'shared flat', 'host family', 'homestay', 'rent', 'stay'],
  exam: ['prufung', 'prufungen', 'telc', 'zertifikat', 'examen', 'exam', 'exams', 'certificate'],
  placement: ['einstufung', 'einstufungstest', 'einstufen', 'niveau', 'level', 'levels', 'placement', 'stufe', 'which level'],
  registration: ['anmeldung', 'anmelden', 'anmeldeformular', 'registrieren', 'einschreiben', 'buchen', 'buchung', 'register', 'registration', 'enrol', 'enroll', 'enrolment', 'booking', 'sign up', 'apply'],
  visa: ['visum', 'visa', 'botschaft', 'aufenthalt', 'einreise', 'embassy', 'residence permit'],
  date: ['termin', 'termine', 'datum', 'wann', 'beginn', 'beginnt', 'start', 'starttermin', 'starttermine', 'nachste', 'date', 'dates', 'when', 'begin', 'begins', 'starts', 'next', 'schedule', 'zeitplan', 'semester', 'trimester', 'term'],
  contact: ['kontakt', 'kontaktieren', 'telefon', 'telefonnummer', 'anrufen', 'mail', 'email', 'e-mail', 'erreichen', 'contact', 'phone', 'call', 'reach', 'telephone'],
  hours: ['offnungszeiten', 'sprechzeiten', 'geoffnet', 'buro', 'sekretariat', 'office', 'hours', 'opening', 'open'],
  address: ['adresse', 'anfahrt', 'standort', 'lage', 'wo', 'address', 'location', 'where', 'directions', 'dobben'],
  cancel: ['storno', 'stornieren', 'stornierung', 'kundigen', 'kundigung', 'rucktritt', 'absagen', 'erstattung', 'zuruck', 'cancel', 'cancellation', 'refund', 'withdraw'],
  payment: ['zahlung', 'zahlen', 'bezahlen', 'uberweisung', 'rechnung', 'payment', 'pay', 'invoice', 'transfer'],
  career: ['job', 'jobs', 'stelle', 'stellen', 'karriere', 'bewerbung', 'bewerben', 'lehrkraft', 'arbeiten', 'career', 'careers', 'vacancy', 'vacancies', 'teacher job', 'work for'],
  medical: ['medizin', 'medizinisch', 'pflege', 'pflegekraft', 'arzt', 'arzte', 'arztin', 'mediziner', 'fachsprachprufung', 'krankenhaus', 'medical', 'medicine', 'nursing', 'nurse', 'doctor', 'doctors'],
  bildungszeit: ['bildungszeit', 'bildungsurlaub', 'training leave', 'educational leave'],
  group: ['gruppe', 'gruppen', 'klasse', 'schulklasse', 'klassenfahrt', 'reisegruppe', 'group', 'groups', 'school class', 'school trip'],
  company: ['firma', 'firmen', 'unternehmen', 'firmenunterricht', 'betrieb', 'mitarbeitende', 'company', 'companies', 'business', 'in-company', 'employer', 'employees'],
  nonprofit: ['gemeinnutzig', 'gemeinnutzige', 'gemeinnutzigkeit', 'ggmbh', 'non-profit', 'nonprofit', 'charity'],
  beginner: ['anfanger', 'anfangerin', 'vorkenntnisse', 'beginner', 'beginners', 'no german', 'from scratch'],
  study: ['studium', 'studieren', 'universitat', 'hochschule', 'uni', 'study', 'studying', 'university'],
  material: ['buch', 'bucher', 'lehrbuch', 'material', 'materialien', 'books', 'textbook', 'materials'],
  duration: ['dauer', 'dauert', 'lange', 'wochen', 'monate', 'duration', 'long', 'weeks', 'months'],
  time: ['uhr', 'uhrzeit', 'uhrzeiten', 'zeiten', 'unterrichtszeit', 'unterrichtszeiten', 'time', 'times', 'oclock'],
};

const conceptOf = new Map<string, string>();
/** Members of more than one word ("host family") match as a phrase, never word by word. */
const conceptPhrases: Array<[string, string]> = [];
for (const [concept, members] of Object.entries(CONCEPTS)) {
  for (const member of members) {
    const parts = words(member);
    if (parts.length === 1) conceptOf.set(stem(parts[0]), concept);
    else if (parts.length > 1) conceptPhrases.push([` ${parts.join(' ')} `, concept]);
  }
}

/** The concept a (stemmed) term belongs to, if any. */
export const conceptFor = (term: string): string | undefined => conceptOf.get(term);

/**
 * Index terms of a text: stems without stopwords, plus `~concept` for every
 * stem that belongs to one. Question words stay out of the ranking.
 */
export function terms(value: string): string[] {
  const out: string[] = [];
  const all = words(value);
  for (const word of all) {
    if (STOPWORDS.has(word) || QUESTION_WORDS.has(word) || (word.length < 2 && !/\d/.test(word))) continue;
    const term = stem(word);
    out.push(term);
    const concept = conceptOf.get(term) ?? (/^\d{1,2}:\d{2}$/.test(term) ? 'time' : undefined);
    if (concept) out.push(`~${concept}`);
  }
  if (all.length > 1) {
    const joined = ` ${all.join(' ')} `;
    for (const [phrase, concept] of conceptPhrases) if (joined.includes(phrase)) out.push(`~${concept}`);
  }
  return out;
}

/** Restricted Damerau–Levenshtein distance, stopping early past `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  let previousPrevious: number[] = [];
  let previous = Array.from({ length: cols }, (_, j) => j);
  for (let i = 1; i < rows; i += 1) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, previousPrevious[j - 2] + 1);
      }
      current.push(value);
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    previousPrevious = previous;
    previous = current;
  }
  return previous[cols - 1];
}

/** How many typos a word of this length may carry and still be recognised. */
export const typoAllowance = (word: string) => (word.length >= 8 ? 2 : word.length >= 4 ? 1 : 0);
