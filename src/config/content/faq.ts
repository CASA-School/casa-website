import type { ContentLocale, FaqViewItem } from '@/lib/content/types';

/**
 * CASA's FAQ, as CASA answers it.
 *
 * WHAT CHANGED AND WHY
 *
 * The previous FAQ was 24 invented questions per locale, and it had zero overlap
 * with the FAQ CASA actually publishes. It answered things like "Can agencies
 * register students on their behalf?" with "Yes. We support agency coordination
 * and can provide structured communication for intake, documents, and
 * scheduling." — which says nothing and commits to nothing.
 *
 * Meanwhile casa-bremen.de/faq answers the questions people actually write in
 * about, with numbers and deadlines attached: that courses cannot be funded by
 * the BAMF or the Jobcenter, that a language visa needs 20 lessons a week for at
 * least three months, that a delayed visa buys you one free postponement and
 * €100 for each one after, that cancellation runs on four weeks' notice in full
 * weeks and only in writing. None of it was on our site.
 *
 * A FAQ is the one page where a hedge is worse than a hard answer. Somebody is
 * reading it because they need to know whether their money comes back.
 *
 * RULES
 *
 * 1. Every entry marked `source: 'faq'` is CASA's own FAQ, ported. Do not soften
 *    the negatives — "we do not offer Integrationskurse" and "self-payers only"
 *    are the answers, and burying them costs someone a wasted enquiry or worse.
 * 2. Entries marked with another source are answered elsewhere on
 *    casa-bremen.de and belong here because this is where people look. The
 *    source is recorded so the next person can re-check it.
 * 3. Legal detail defers to /terms. The FAQ paraphrases §6 and §7 of the AGB;
 *    where the two could ever disagree, the AGB is binding and the FAQ says so.
 *
 * VERIFIED 2026-08-18 against casa-bremen.de/faq and the pages named in each
 * `source`. Fees and deadlines change — re-check before launch.
 */

type FaqSource = {
  id: string;
  category: 'general' | 'courses' | 'registration' | 'exams' | 'visa' | 'accommodation' | 'cancellation';
  question: { en: string; de: string };
  answer: { en: string; de: string };
  /** Where on casa-bremen.de this is published. 'faq' means the FAQ itself. */
  source: string;
};

const FAQ: FaqSource[] = [
  // ---- Allgemeines --------------------------------------------------------
  {
    id: 'course-types',
    category: 'courses',
    question: {
      en: 'What kinds of courses does CASA offer?',
      de: 'Welche Art von Kursen bietet CASA an?',
    },
    answer: {
      en: 'Intensive courses, evening courses, special courses and in-company training, plus classes for groups, German for nursing and medicine and Bildungszeit. We do not offer Integrationskurse or occupation-specific language courses (berufsbezogene Sprachkurse).',
      de: 'Wir bieten Intensivkurse, Abendkurse, Spezialkurse und Firmenunterricht an, außerdem Unterricht für Gruppen, Deutsch für Pflege und Medizin und Bildungszeit. Integrationskurse und berufsbezogene Sprachkurse bieten wir leider nicht an.',
    },
    source: 'faq',
  },
  {
    id: 'funding',
    category: 'general',
    question: {
      en: 'Can my course be funded by the BAMF or the Jobcenter?',
      de: 'Kann mein Sprachkurs vom BAMF oder Jobcenter finanziert werden?',
    },
    answer: {
      en: 'No. Our courses are for self-paying participants, and course fees cannot be covered by the BAMF or the Jobcenter. CASA does cooperate with Here Ahead and Bildungsberatung Garantiefonds Hochschule, which fund study-preparation language courses — it is worth checking whether you qualify for one of those.',
      de: 'Nein. Unsere Sprachkurse richten sich ausschließlich an Selbstzahler. Die Kursgebühren können leider nicht vom BAMF oder Jobcenter übernommen werden. CASA kooperiert aber mit Here Ahead und der Bildungsberatung Garantiefonds Hochschule, die studienvorbereitende Sprachkurse fördern. Bitte prüfe, ob du für eine dieser Förderungen infrage kommst.',
    },
    source: 'faq + the funding cooperations on the German homepage',
  },
  {
    id: 'how-to-register',
    category: 'registration',
    question: {
      en: 'How do I register for a course?',
      de: 'Wie kann ich mich für einen Sprachkurs anmelden?',
    },
    answer: {
      en: 'Either through our online form or in person at the office. Please take a placement test first and send us the result, so we can put you in the right group.',
      de: 'Du kannst dich entweder über unser Online-Formular oder bei uns im Büro anmelden. Bitte mach vorher einen Einstufungstest und schick uns das Ergebnis, damit wir dich in die passende Lerngruppe einstufen können.',
    },
    source: 'faq',
  },
  {
    id: 'office-hours',
    category: 'general',
    question: {
      en: 'When is the CASA office open?',
      de: 'Wann ist das Büro bei CASA geöffnet?',
    },
    answer: {
      en: 'Monday to Thursday 08:30–19:00 and Friday 08:30–13:00. You are welcome to come by in person during those hours — no appointment needed. The school closes over Easter (30 March to 6 April 2026) and Christmas (21 December 2026 to 1 January 2027).',
      de: 'Das Büro ist von Montag bis Donnerstag von 08:30 bis 19:00 Uhr und am Freitag von 08:30 bis 13:00 Uhr geöffnet. In dieser Zeit kannst du gern ohne Termin persönlich vorbeikommen. Über Ostern (30.03. bis 06.04.26) und Weihnachten (21.12.26 bis 01.01.27) ist die Schule geschlossen.',
    },
    source: 'faq + the office hours and closures in the German footer',
  },
  {
    id: 'why-placement-test',
    category: 'registration',
    question: {
      en: 'Why do I need a placement test before registering?',
      de: 'Warum muss ich einen Einstufungstest vor der Anmeldung machen?',
    },
    answer: {
      en: 'Because the right level decides whether the course works for you. In a group that is too hard, you and everyone else find it frustrating; in one that is too easy, you are not being stretched. So we ask you to take the test and send us the result. Start with the A1 test even if you are past that level, and send your results to online@casa-bremen.de.',
      de: 'Uns ist es sehr wichtig, dass wir das richtige Niveau für dich finden und du mit deinem Sprachkurs bei uns zufrieden bist. Wenn ein Kurs zu schwierig für dich ist, ist das für dich und für die anderen Teilnehmenden frustrierend. Ist der Kurs zu leicht, bist du unterfordert. Deshalb bitten wir dich, vorher einen Einstufungstest zu machen. Bitte starte immer mit dem A1-Test und schick deine Ergebnisse an online@casa-bremen.de.',
    },
    source: 'faq + /anmeldung/einstufungstest',
  },
  {
    id: 'illness',
    category: 'courses',
    question: {
      en: 'What happens if I fall ill and cannot come to class?',
      de: 'Was passiert, wenn ich krank werde und nicht am Unterricht teilnehmen kann?',
    },
    answer: {
      en: 'Please let the office and your teacher know. We cannot offer a replacement lesson online. Course fees remain payable in full for lessons you miss.',
      de: 'Bitte sag dem Büro und deiner Lehrkraft Bescheid, dass du krank bist. Wir können leider keinen Unterrichtsersatz online anbieten. Die Kursgebühren musst du auch für versäumte Unterrichtsstunden in voller Höhe zahlen.',
    },
    source: 'faq + AGB §5.5',
  },
  {
    id: 'which-exams',
    category: 'exams',
    question: {
      en: 'Which language exams can I take at CASA?',
      de: 'Welche Sprachprüfungen kann ich bei CASA ablegen?',
    },
    answer: {
      en: 'Exams at B2 and C1 level: telc Deutsch B2 and telc Deutsch C1 Hochschule. We do not offer exams for A1 to B1. Results and certificates arrive about six weeks after the exam, and we let every candidate know as soon as they are in.',
      de: 'Bei uns kannst du die Prüfungen telc Deutsch B2 und telc Deutsch C1 Hochschule ablegen. Für die Niveaus A1 bis B1 bieten wir leider keine Prüfungen an. Das Ergebnis und das Zertifikat liegen etwa 6 Wochen nach der Prüfung vor. Wir informieren alle Teilnehmenden, sobald sie bei uns eingegangen sind.',
    },
    source: 'faq + the two Prüfungszentrum pages',
  },

  // ---- Sprachvisum --------------------------------------------------------
  {
    id: 'visa-requirements',
    category: 'visa',
    question: {
      en: 'What do I need in order to apply for a language visa?',
      de: 'Welche Voraussetzungen gibt es, um ein Sprachvisum zu beantragen?',
    },
    answer: {
      en: 'You have to book courses of 20 lessons a week for at least three months. Our intensive courses meet that requirement; evening and special courses do not.',
      de: 'Um ein Sprachvisum beantragen zu können, musst du Sprachkurse mit 20 Wochenstunden für mindestens drei Monate buchen. Unsere Intensivkurse erfüllen diese Voraussetzung, unsere Abend- und Spezialkurse nicht.',
    },
    source: 'faq',
  },
  {
    id: 'visa-letter',
    category: 'visa',
    question: {
      en: 'How do I get my visa letter?',
      de: 'Wie erhalte ich meinen Visumsbrief?',
    },
    answer: {
      en: 'As soon as we have received payment for at least the first course, we send the visa letter by email. If you live outside Germany, the full fee for the first course — and any accommodation costs — is due on registration. On request we can also send the confirmation by post, or by DHL Express for an additional charge.',
      de: 'Sobald wir die Gebühr für mindestens den ersten Kurs von dir erhalten haben, schicken wir dir den Visumsbrief per E-Mail. Wenn du im Ausland wohnst, sind mit der Anmeldung die gesamten Kursgebühren für den ersten Kurs fällig und, falls du eine Unterkunft buchst, auch die Unterkunftskosten. Auf Anfrage schicken wir dir den Brief auch per Post oder gegen Aufpreis per DHL-Express.',
    },
    source: 'faq + AGB §5.3',
  },
  {
    id: 'visa-delay',
    category: 'visa',
    question: {
      en: 'What if my visa application takes longer than expected?',
      de: 'Was passiert, wenn die Antragstellung länger dauert?',
    },
    answer: {
      en: 'You can postpone your course once free of charge, up to 21 days before it starts. Each further postponement costs €100. If the process drags on, we can also put your booking on hold indefinitely — tell us when your visa comes through and we will offer you the next possible start date.',
      de: 'Wenn sich dein Visumsverfahren verzögert, kannst du deinen Kurs bis 21 Tage vor Kursbeginn einmal kostenfrei verschieben. Jede weitere Verschiebung kostet 100 €. Wenn dein Visumsantrag länger dauert als gedacht, können wir deine Buchung auch auf unbestimmte Zeit deaktivieren. Gib uns Bescheid, sobald du dein Visum erhalten hast. Wir bieten dir dann den nächstmöglichen Kursbeginn an.',
    },
    source: 'faq + AGB §7.2',
  },
  {
    id: 'visa-refused',
    category: 'visa',
    question: {
      en: 'What if my visa application is refused?',
      de: 'Was passiert, wenn mein Visumsantrag abgelehnt wird?',
    },
    answer: {
      en: 'We refund the course fee minus a €100 processing fee, provided you tell us at least two weeks before the course starts and can show the official refusal document. Later than that, part of the fee falls due under the standard four-week notice period.',
      de: 'Dann erstatten wir dir die Kursgebühr abzüglich einer Bearbeitungsgebühr von 100 €. Das gilt, wenn wir die Information spätestens zwei Wochen vor Kursbeginn von dir erhalten und du uns ein offizielles Ablehnungsdokument vorlegst. Andernfalls berechnen wir Teile der Kursgebühr gemäß der Kündigungsfrist von vier Wochen.',
    },
    source: 'faq + AGB §7.2',
  },
  {
    id: 'visa-bound-contract',
    category: 'visa',
    question: {
      en: 'Can I shorten my course once I am in Germany on a language visa?',
      de: 'Kann ich meinen Kurs verkürzen, wenn ich mit einem Sprachvisum in Deutschland bin?',
    },
    answer: {
      en: 'No. If you entered Germany on a visa for a language course or for study, all the courses the visa was issued for have to be completed in full — the contract is bound to the visa and cannot be cancelled by you. Any remaining fee is still payable. CASA is also obliged to inform the authorities on request if a participant does not attend for the full visa period.',
      de: 'Nein. Wenn du mit einem Visum für einen Sprachkurs oder für ein Studium nach Deutschland eingereist bist, musst du alle Kurse, für die das Visum ausgestellt wurde, vollständig absolvieren. Der Vertrag ist an das Visum gebunden, und du kannst ihn nicht kündigen. Die restliche Kursgebühr musst du zahlen. Außerdem gibt CASA autorisierten Behörden auf Anfrage Auskunft, wenn jemand den Kurs nicht für den vollen Zeitraum des Visums besucht.',
    },
    source: 'AGB §7.3 and §7.4, and the warning on the German registration form',
  },

  // ---- Unterkunft ---------------------------------------------------------
  {
    id: 'accommodation-booking',
    category: 'accommodation',
    question: {
      en: 'Can I book accommodation through CASA?',
      de: 'Kann ich Unterkünfte bei CASA buchen?',
    },
    answer: {
      en: 'Yes — a room in a CASA shared flat or with a host family. Both are available only to students on our intensive courses, and the shared flats only to participants who are of legal age. We cannot guarantee a shared-flat room: if none is free for your dates, we arrange a room with a host family instead.',
      de: 'Ja. Bei uns kannst du ein Zimmer in einer CASA-Wohngemeinschaft oder bei einer Gastfamilie buchen. Beides steht ausschließlich Teilnehmenden unserer Intensivkurse zur Verfügung, die WG-Zimmer außerdem nur volljährigen Studierenden. Ein Zimmer in einer CASA-WG können wir leider nicht garantieren. Wenn zum gewünschten Zeitraum keines frei ist, organisieren wir dir ein Zimmer bei einer Gastfamilie.',
    },
    source: 'faq + the two Unterkunft pages',
  },
  {
    id: 'flat-search',
    category: 'accommodation',
    question: {
      en: 'Does CASA help me find a flat of my own?',
      de: 'Hilft CASA mir bei der Wohnungssuche?',
    },
    answer: {
      en: 'We cannot support you in finding your own flat. We are glad to send you links that make the search easier if you ask.',
      de: 'Bei der Wohnungssuche können wir dich leider nicht unterstützen. Auf Anfrage schicken wir dir aber gern hilfreiche Links, die dir die Suche erleichtern.',
    },
    source: 'faq',
  },

  // ---- Kündigungsbedingungen ---------------------------------------------
  {
    id: 'cancellation-terms',
    category: 'cancellation',
    question: {
      en: 'What happens if I want to cancel my course?',
      de: 'Was ist, wenn ich meine Kurse bei CASA kündigen möchte?',
    },
    answer: {
      en: 'A group course can be cancelled with four weeks’ notice, always counted in full weeks. Cancel more than four weeks before the course starts and we refund what you have paid, minus a €100 processing fee and any bank or postage charges. Cancel later than that and you owe everything booked that falls inside the four weeks from your cancellation date.',
      de: 'Einen Gruppenkurs kannst du mit einer Kündigungsfrist von vier Wochen kündigen. Dabei rechnen wir immer volle Wochen. Wenn du bis zu vier Wochen vor Kursbeginn kündigst, erstatten wir dir die gezahlten Gebühren abzüglich einer Bearbeitungsgebühr von 100 € sowie etwaiger Bank- und Versandgebühren. Wenn du später kündigst, musst du alle gebuchten Leistungen bezahlen, die innerhalb der vier Wochen ab dem Kündigungsdatum liegen.',
    },
    source: 'faq + AGB §6.1',
  },
  {
    id: 'cancellation-how',
    category: 'cancellation',
    question: {
      en: 'How do I cancel a course or my accommodation?',
      de: 'Wie kann ich meinen Sprachkurs oder meine Unterkunft kündigen?',
    },
    answer: {
      en: 'In writing only — email or letter. We cannot accept a cancellation given verbally. Simply not turning up, or stopping mid-course, does not count as a cancellation and is not refunded. The full conditions are in our Terms and Conditions, point 6.',
      de: 'Kündigungen sind nur schriftlich möglich. Du kannst uns dafür eine E-Mail oder einen Brief schreiben. Mündliche Kündigungen können wir leider nicht akzeptieren. Wenn du einen Kurs nicht antrittst oder abbrichst, gilt das nicht als Kündigung, und die Gebühren werden nicht erstattet. Alle Kündigungsbedingungen kannst du in unseren Geschäftsbedingungen unter Punkt 6 (Kündigung / Absage / Umbuchung) nachlesen.',
    },
    source: 'faq + AGB §6.2 and §6.4',
  },
  {
    id: 'rebooking',
    category: 'cancellation',
    question: {
      en: 'Can I move to a different course date?',
      de: 'Kann ich auf einen anderen Kurstermin umbuchen?',
    },
    answer: {
      en: 'Yes, at any time within the cancellation deadline above. Fees already paid transfer to the new course, minus any processing charge, and can go to a different course type if that suits you better. If you already know at registration that you will miss whole weeks, tell us — we can often deduct that time from the fee, though for teaching reasons we may decline, or place you a level lower on your return.',
      de: 'Ja, das ist jederzeit möglich, wenn du die oben genannte Kündigungsfrist einhältst. Bereits bezahlte Gebühren übertragen wir abzüglich etwaiger Bearbeitungsgebühren auf einen anderen Kurs, gegebenenfalls auch auf eine andere Kursart. Wenn du schon bei der Anmeldung weißt, dass du ganze Wochen nicht teilnehmen kannst, sag uns bitte Bescheid. Wir können diesen Zeitraum oft von den Kursgebühren abziehen. Aus didaktischen Gründen behalten wir uns aber vor, dies abzulehnen oder nach deiner Rückkehr eine Umstufung vorzunehmen.',
    },
    source: 'AGB §6.5 and §6.6',
  },

  // ---- Answered elsewhere on casa-bremen.de, asked here -------------------
  {
    id: 'group-size',
    category: 'courses',
    question: {
      en: 'How many people are in a class?',
      de: 'Wie groß sind die Lerngruppen?',
    },
    answer: {
      en: 'Intensive courses run in international groups of 10 to 15. Evening and special courses are small groups too. The point of the size is speaking time: it is what makes individual feedback and correction of written work possible.',
      de: 'Unsere Intensivkurse finden in kleinen, internationalen Lerngruppen von 10 bis 15 Teilnehmenden statt. Auch die Abend- und Spezialkurse sind Kleingruppen. So bleibt mehr Zeit zum Sprechen, und die Lehrkräfte können dir persönliche Rückmeldungen geben und deine schriftlichen Arbeiten korrigieren.',
    },
    source: '/sprachkurse/deutsch-intensiv',
  },
  {
    id: 'join-mid-course',
    category: 'registration',
    question: {
      en: 'Can I join a course that has already started?',
      de: 'Kann ich in einen laufenden Kurs einsteigen?',
    },
    answer: {
      en: 'For evening courses: with some German already, yes, whenever seats are free — and if a course is full we can put you on the waiting list. With no German at all (A1.1) you have to start at the beginning of a course. Educational-leave participants can join on any Monday.',
      de: 'In unsere Abendkurse kannst du mit Vorkenntnissen jederzeit einsteigen, wenn es noch freie Plätze gibt. Wenn ein Kurs ausgebucht ist, setzen wir dich gern auf die Warteliste. Wenn du noch keine Deutschkenntnisse hast (A1.1), musst du am Kursstart beginnen. In die Bildungszeit kannst du immer montags einsteigen.',
    },
    source: '/sprachkurse/deutsch-am-abend and /sprachkurse/bildungszeit-deutsch',
  },
  {
    id: 'exam-prep-not-included',
    category: 'exams',
    question: {
      en: 'Does an intensive course prepare me for a telc exam?',
      de: 'Bereitet mich ein Intensivkurs auf eine telc-Prüfung vor?',
    },
    answer: {
      en: 'No. Preparation for an exam is explicitly not part of the intensive courses. There are separate preparation courses: €260 for telc B2 (two evenings a week over a month) and €520 for telc C1 Hochschule (a four-week block). For C1, note that C1 vocabulary and grammar are assumed from a completed C1 course rather than taught in the preparation course, and no preparation course can guarantee a pass.',
      de: 'Nein. Die Vorbereitung auf eine Prüfung ist ausdrücklich nicht Bestandteil der Intensivkurse. Dafür gibt es eigene Vorbereitungskurse. Der Kurs für telc B2 kostet 260 € und findet einen Monat lang an zwei Abenden pro Woche statt. Der Kurs für telc C1 Hochschule kostet 520 € und ist ein vierwöchiger Block. Wortschatz, Redemittel und Grammatik der C1 sind nicht Teil des C1-Vorbereitungskurses. Wir setzen sie in Form eines erfolgreich abgeschlossenen C1-Kurses voraus. Alternativ machen wir mit dir vor Ort einen Einstufungstest. Kein Vorbereitungskurs kann garantieren, dass du die Prüfung bestehst.',
    },
    source: '/sprachkurse/deutsch-intensiv and the two Prüfungszentrum pages',
  },
  {
    id: 'enrolment-fee',
    category: 'registration',
    question: {
      en: 'Are there costs on top of the course fee?',
      de: 'Kommen zu der Kursgebühr weitere Kosten hinzu?',
    },
    answer: {
      en: 'Two. A one-time enrolment fee of €50 on your first registration at CASA, and the course book — €23.99 to €26.99 depending on level, or €46 to €54 for Bildungszeit, which uses two. Weekends and public holidays in Bremen have no classes and are not refunded.',
      de: 'Ja, zwei. Bei deiner ersten Anmeldung an unserer Schule berechnen wir eine einmalige Einschreibegebühr von 50 €. Dazu kommt das Lehrwerk, das je nach Niveaustufe 23,99 € bis 26,99 € kostet. Bei der Bildungszeit brauchst du zwei Bücher, die zusammen 46 € bis 54 € kosten. An Wochenenden und an gesetzlichen Feiertagen im Land Bremen findet kein Unterricht statt. Feiertage werden nicht erstattet.',
    },
    source: '/sprachkurse/deutsch-intensiv, /sprachkurse/bildungszeit-deutsch, AGB §4',
  },
  {
    id: 'placement-in-person',
    category: 'registration',
    question: {
      en: 'Can I be assessed at the school instead of online?',
      de: 'Kann ich mich in der Schule einstufen lassen statt online?',
    },
    answer: {
      en: 'Yes, and you are very welcome to if you are in Bremen or nearby. No appointment is needed — just come by during office hours and bring at least an hour. It is free of obligation and it lets you see the school and ask whatever else you want to know. Note that intensive courses are placed on site in any case, and CASA may adjust your level regardless of certificates you already hold.',
      de: 'Ja. Wenn du in Bremen oder Umgebung lebst, laden wir dich herzlich zur persönlichen Einstufung und Beratung in der Schule ein. Die Einstufung ist unverbindlich, und du kannst dabei gleich die Schule kennenlernen und weitere Fragen stellen. Einen Termin brauchst du nicht. Komm einfach während der Bürozeiten vorbei und bring mindestens eine Stunde Zeit mit. Bei den Intensivkursen führen wir die Einstufung ohnehin vor Ort durch. Dabei behalten wir uns vor, das Kursniveau anzupassen, unabhängig von zuvor erworbenen Zertifikaten.',
    },
    source: '/anmeldung/einstufungstest and /sprachkurse/deutsch-intensiv',
  },
];

function toFaqItem(entry: FaqSource, locale: ContentLocale): FaqViewItem {
  return {
    id: `faq-${locale}-${entry.id}`,
    locale,
    category: entry.category,
    question: entry.question[locale],
    answer: entry.answer[locale],
  };
}

export const faqByLocale: Record<ContentLocale, FaqViewItem[]> = {
  en: FAQ.map((entry) => toFaqItem(entry, 'en')),
  de: FAQ.map((entry) => toFaqItem(entry, 'de')),
};

/** Kept for tests and for anyone auditing where an answer came from. */
export const faqSources = FAQ.map((entry) => ({ id: entry.id, source: entry.source }));
