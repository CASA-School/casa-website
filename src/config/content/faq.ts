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
      en: 'We offer intensive courses, evening courses, special courses and in-company teaching, as well as classes for groups, German for nursing and medicine, and courses for Bildungszeit, the paid training leave for people who work in Bremen. Unfortunately, we don’t offer integration courses (Integrationskurse) or job-related language courses (berufsbezogene Sprachkurse).',
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
      en: 'No. Our language courses are only for people who pay their own fees, and unfortunately the BAMF and the Jobcenter cannot cover them. CASA does work with HERE AHEAD and Bildungsberatung Garantiefonds Hochschule, though, which fund language courses that prepare people for university. Please check whether you qualify for funding from one of them.',
      de: 'Nein. Unsere Sprachkurse richten sich ausschließlich an Selbstzahler. Die Kursgebühren können leider nicht vom BAMF oder Jobcenter übernommen werden. CASA kooperiert aber mit HERE AHEAD und der Bildungsberatung Garantiefonds Hochschule, die studienvorbereitende Sprachkurse fördern. Bitte prüfe, ob du für eine dieser Förderungen infrage kommst.',
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
      en: 'You can register either through our online form or in person at our office. Please take a placement test first and send us the result, so that we can put you in the right group.',
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
      en: 'The office is open Monday to Thursday from 08:30 to 19:00 and on Friday from 08:30 to 13:00. During these hours you are welcome to drop in without an appointment. The school is closed over Easter (30 March to 6 April 2026) and Christmas (21 December 2026 to 1 January 2027).',
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
      en: 'It is very important to us that we find the right level for you and that you are happy with your course. If a course is too difficult for you, that is frustrating for you and for the others in the group. If it is too easy, you won’t be challenged enough. That is why we ask you to take a placement test before you register. Please always start with the A1 test and send your results to online@casa-bremen.de.',
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
      en: 'Please let the office and your teacher know that you are ill. Unfortunately, we cannot offer replacement lessons online. You still have to pay the full course fee for any lessons you miss.',
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
      en: 'You can take telc Deutsch B2 and telc Deutsch C1 Hochschule with us. Unfortunately, we don’t offer exams for levels A1 to B1. Results and certificates are ready about six weeks after the exam. As soon as they reach us, we let every candidate know.',
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
      en: 'To apply for a language visa, you have to book language courses with 20 lessons a week for at least three months. Our intensive courses meet this requirement. Our evening and special courses do not.',
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
      en: 'As soon as we have received the fee for at least your first course, we will email you your visa letter. If you live outside Germany, the full fee for your first course is due when you register, and so are the accommodation costs if you book accommodation. On request, we can also send you the letter by post, or by DHL Express for an extra charge.',
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
      en: 'If your visa process is delayed, you can postpone your course once free of charge, up to 21 days before it starts. Each further postponement costs €100. If your visa application takes longer than expected, we can also put your booking on hold indefinitely. Let us know as soon as you have your visa, and we will offer you the next possible start date.',
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
      en: 'In that case, we refund your course fee minus a €100 processing fee. This applies if you let us know at least two weeks before the course starts and show us an official refusal document. Otherwise, we charge part of the course fee in line with the four-week notice period.',
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
      en: 'No. If you came to Germany on a visa for a language course or for study, you have to complete all the courses the visa was issued for. Your contract is tied to the visa, and you cannot cancel it. You still have to pay any remaining course fees. CASA also gives information to the relevant authorities on request if someone does not attend the course for the full period of their visa.',
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
      en: 'Yes. You can book a room in a CASA shared flat or with a host family through us. Both are only available to participants on our intensive courses, and the rooms in our shared flats only to those aged 18 or over. Unfortunately, we cannot guarantee you a room in a CASA shared flat. If none is free for your dates, we will arrange a room with a host family for you.',
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
      en: 'Unfortunately, we cannot help you look for a flat of your own. If you ask us, though, we are happy to send you some useful links that make the search easier.',
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
      en: 'You can cancel a group course with four weeks’ notice, and we always count in full weeks. If you cancel at least four weeks before the course starts, we refund the fees you have paid, minus a €100 processing fee and any bank or postage charges. If you cancel later than that, you have to pay for everything you have booked that falls within the four weeks after the date you cancel.',
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
      en: 'You can only cancel in writing. Just send us an email or a letter. Unfortunately, we cannot accept verbal cancellations. If you don’t start a course, or stop partway through, that does not count as a cancellation, and the fees are not refunded. You can read everything about cancelling in point 6 of our terms and conditions (Termination of Contract / Change of Booking).',
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
      en: 'Yes, you can do this at any time, as long as you keep to the notice period above. We transfer the fees you have already paid to another course, minus any processing fees, and this can be a different type of course too. If you already know when you register that you will miss whole weeks, please let us know. We can often deduct that time from your course fees. For teaching reasons, however, we may say no to this, or move you to a different level when you come back.',
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
      en: 'Our intensive courses are taught in small international groups of 10 to 15 participants. Our evening and special courses are small groups too. This leaves more time for speaking, and your teachers can give you personal feedback and correct your written work.',
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
      en: 'If you already know some German, you can join our evening courses at any time, as long as there are places free. If a course is full, we are happy to put you on the waiting list. If you have no German yet (A1.1), you need to join at the beginning of a course. You can join Bildungszeit courses on any Monday.',
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
      en: 'No. The intensive courses do not include exam preparation. We offer separate preparation courses for that. The course for telc Deutsch B2 costs €260 and runs on two evenings a week for one month. The course for telc Deutsch C1 Hochschule costs €520 and is a four-week block. C1 vocabulary, phrases and grammar are not part of the C1 preparation course. We expect you to know them from a C1 course you have successfully completed. Alternatively, you can take a placement test with us here at the school. No preparation course can guarantee that you will pass the exam.',
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
      en: 'Yes, two. When you first register at our school, we charge a one-off enrolment fee of €50. On top of that there are the course materials, which cost €23.99 to €26.99 depending on the level. For Bildungszeit you need two books, which cost €46 to €54 together. There are no classes at weekends or on public holidays in the state of Bremen, and public holidays are not refunded.',
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
      en: 'Yes. If you live in or near Bremen, we warmly invite you to come to the school for a personal assessment and advice. The assessment is free of obligation, and it is a good chance to get to know the school and ask any other questions. You don’t need an appointment. Just come by during office hours and allow at least an hour. For the intensive courses, we assess your level here at the school in any case. We may then adjust your course level, whatever certificates you already have.',
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
