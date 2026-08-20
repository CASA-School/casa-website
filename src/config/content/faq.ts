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
      en: 'Intensive courses, evening courses, special courses and in-company training, plus German for groups, German for medical professionals and Bildungszeit. We do not offer Integrationskurse or occupation-specific language courses (berufsbezogene Sprachkurse).',
      de: 'Intensivkurse, Abendkurse, Spezialkurse und Firmenunterricht, außerdem Deutsch für Gruppen, Deutsch für Mediziner und Bildungszeit. Wir bieten leider keine Integrationskurse oder berufsbezogene Sprachkurse an.',
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
      de: 'Nein. Unsere Sprachkurse richten sich ausschließlich an Selbstzahler; die Kursgebühren können nicht vom BAMF oder Jobcenter übernommen werden. CASA kooperiert allerdings mit Here Ahead und der Bildungsberatung Garantiefonds Hochschule, die studienvorbereitende Sprachkurse fördern — bitte prüfe, ob du für eine dieser Förderungen infrage kommst.',
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
      de: 'Sie können sich entweder über unser Online-Formular oder bei uns im Büro anmelden. Bitte machen Sie vorher einen Einstufungstest und senden Sie uns das Ergebnis, damit wir Sie in die passende Lerngruppe einstufen können.',
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
      de: 'Montag bis Donnerstag von 08:30 bis 19:00 Uhr und freitags von 08:30 bis 13:00 Uhr. In dieser Zeit können Sie gerne persönlich vorbeikommen, ohne Termin. Schließzeiten: Ostern (30.03. bis 06.04.26) und Weihnachten (21.12.26 bis 01.01.27).',
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
      de: 'Weil das richtige Niveau darüber entscheidet, ob der Kurs für Sie funktioniert. In einem Kurs, der zu schwierig ist, ist das für Sie und die anderen Teilnehmenden frustrierend; ist er zu leicht, sind Sie unterfordert. Bitte starten Sie immer mit dem A1-Test und senden Sie Ihre Ergebnisse an online@casa-bremen.de.',
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
      de: 'Bitte informieren Sie das Büro und Ihre Lehrkraft. Wir können leider keinen Unterrichtsersatz online anbieten. Die Kursgebühren sind auch für versäumte Unterrichtsstunden in voller Höhe zu zahlen.',
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
      de: 'Prüfungen auf B2- und C1-Niveau: telc Deutsch B2 und telc Deutsch C1 Hochschule. Für die Niveaus A1 bis B1 bieten wir keine Prüfungen an. Ergebnis und Zertifikat liegen etwa 6 Wochen nach der Prüfung vor; wir informieren alle Teilnehmenden, sobald sie eingegangen sind.',
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
      de: 'Sie müssen Sprachkurse mit 20 Wochenstunden für mindestens drei Monate buchen. Unsere Intensivkurse erfüllen diese Voraussetzung; Abend- und Spezialkurse nicht.',
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
      de: 'Sobald wir die Gebühr für mindestens den ersten Kurs erhalten haben, senden wir Ihnen den Visumsbrief per E-Mail zu. Bei Wohnsitz im Ausland wird mit der Anmeldung der Gesamtbetrag der Kursgebühren für den ersten Kurs und ggf. die Unterkunftskosten fällig. Auf Anfrage ist der Versand auch per Post oder gegen Aufpreis per DHL-Express möglich.',
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
      de: 'Sie können Ihren Kurs einmal kostenfrei verschieben, bis 21 Tage vor Kursbeginn. Jede weitere Verschiebung kostet 100 €. Wenn der Prozess länger dauert, können wir Ihre Buchung auch auf unbestimmte Zeit deaktivieren — informieren Sie uns, sobald Sie Ihr Visum erhalten haben, und wir bieten Ihnen den nächstmöglichen Kursbeginn an.',
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
      de: 'Wir erstatten die Kursgebühr abzüglich einer Bearbeitungsgebühr von 100 €, sofern wir die Information spätestens zwei Wochen vor Kursbeginn erhalten und ein offizielles Ablehnungsdokument vorliegt. Andernfalls berechnen wir Teile der Kursgebühr gemäß der Kündigungsfrist von vier Wochen.',
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
      de: 'Nein. Ist die Einreise mit einem Visum für einen Sprachkurs oder für ein Studium erfolgt, sind sämtliche Kurse, für die das Visum ausgestellt wurde, vollständig zu absolvieren — der Vertrag ist an das Visum gebunden und kann nicht durch Sie gekündigt werden. Die restliche Kursgebühr ist zu zahlen. CASA gibt autorisierten Behörden auf Anfrage außerdem Auskunft, wenn ein Teilnehmender den Kurs nicht für den vollen Visumszeitraum besucht.',
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
      de: 'Ja — ein Zimmer in einer CASA Wohngemeinschaft oder bei einer Gastfamilie. Beides steht ausschließlich Teilnehmenden unserer Intensivkurse zur Verfügung, die WG-Zimmer außerdem nur volljährigen Studierenden. Wir können kein WG-Zimmer garantieren: Ist zum gewünschten Zeitraum keines frei, organisieren wir ein Zimmer bei einer Gastfamilie.',
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
      de: 'Wir können leider keine Unterstützung bei der Wohnungssuche anbieten. Auf Anfrage schicken wir Ihnen aber gerne hilfreiche Links, die die Wohnungssuche erleichtern.',
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
      de: 'Ein Gruppenkurs kann mit einer Kündigungsfrist von vier Wochen gekündigt werden, wobei immer volle Wochen gerechnet werden. Bei einer Kündigung bis zu vier Wochen vor Kursbeginn erstatten wir die gezahlten Gebühren abzüglich einer Bearbeitungsgebühr von 100 € sowie etwaiger Bank- und Versandgebühren. Eine spätere Kündigung verpflichtet zur Zahlung aller gebuchten Leistungen, die im Rahmen der Vier-Wochen-Frist ab dem Kündigungsdatum liegen.',
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
      de: 'Nur schriftlich — per E-Mail oder Brief. Mündliche Kündigungen können wir leider nicht akzeptieren. Nichtantritt oder Kursabbruch gilt nicht als Kündigung und wird nicht erstattet. Die vollständigen Bedingungen stehen in unseren Geschäftsbedingungen, Punkt 6.',
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
      de: 'Ja, jederzeit unter Einhaltung der oben genannten Stornofrist. Bereits bezahlte Gebühren werden abzüglich etwaiger Bearbeitungsgebühren auf einen anderen Kurs übertragen, gegebenenfalls auch auf eine andere Kursart. Wenn Sie bei der Anmeldung schon wissen, dass Sie ganze Wochen nicht wahrnehmen können, sagen Sie es uns — wir können diesen Zeitraum oft von den Kursgebühren abziehen. Aus didaktischen Gründen behalten wir uns vor, dies abzulehnen oder nach der Rückkehr eine Umstufung vorzunehmen.',
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
      de: 'Die Intensivkurse finden in internationalen Lerngruppen von 10 bis 15 Teilnehmenden statt. Abend- und Spezialkurse sind ebenfalls Kleingruppen. Der Grund für die Gruppengröße ist Sprechzeit — sie macht individuelles Feedback und die Korrektur schriftlicher Arbeiten möglich.',
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
      de: 'Bei den Abendkursen: mit Vorkenntnissen jederzeit, solange Plätze frei sind — und bei ausgebuchten Kursen setzen wir Sie gern auf die Warteliste. Ohne Vorkenntnisse (A1.1) müssen Sie am Kursstart beginnen. In die Bildungszeit können Sie immer montags einsteigen.',
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
      de: 'Nein. Die Vorbereitung auf eine Prüfung ist ausdrücklich nicht Bestandteil der Intensivkurse. Es gibt separate Vorbereitungskurse: 260 € für telc B2 (zwei Abende pro Woche über einen Monat) und 520 € für telc C1 Hochschule (ein vierwöchiger Block). Für die C1 gilt: Wortschatz, Redemittel und Grammatik der C1 werden in Form eines erfolgreich abgeschlossenen C1-Kurses vorausgesetzt und sind nicht Inhalt des Kurses. Eine Garantie, die Prüfung zu bestehen, bietet kein Vorbereitungskurs.',
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
      de: 'Zwei. Eine einmalige Einschreibegebühr von 50 € bei der Erstanmeldung an unserer Schule und das Lehrwerk — 23,99 € bis 26,99 € je nach Niveaustufe, bei der Bildungszeit 46 € bis 54 € für zwei Bücher. An Wochenenden und gesetzlichen Feiertagen im Land Bremen findet kein Unterricht statt; Feiertage werden nicht erstattet.',
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
      de: 'Ja, und wenn Sie in Bremen oder Umgebung leben, laden wir Sie herzlich dazu ein. Ein Termin ist nicht erforderlich — kommen Sie einfach während der Bürozeiten vorbei und bringen Sie mindestens eine Stunde Zeit mit. Die Einstufung ist unverbindlich und Sie können die Schule kennenlernen und Fragen stellen. Bei den Intensivkursen führen wir die Einstufung ohnehin vor Ort durch und behalten uns vor, das Kursniveau anzupassen — unabhängig von zuvor erworbenen Zertifikaten.',
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
