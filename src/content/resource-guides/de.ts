import type { ResourceGuideData, ResourceGuideSlug } from './types';

/*
 * German editorial copy, reviewed alongside English on 2026-09-16.
 * Du form since 2026-10-07, in the plain voice of casa-bremen.de; shared facts
 * and structure. Keep official German terms readers meet on forms. See the
 * release copy handoff for sources and remaining operational confirmations.
 */

export const studyInGermanyGuideDe: ResourceGuideData = {
  slug: 'study-in-germany',
  path: '/resources/study-in-germany',
  metaTitle: 'Studium und Leben in Deutschland: nächste Schritte',
  metaDescription:
    'Was du für ein Studium in Deutschland brauchst, vom Studiengang bis zum ersten Monat vor Ort: Zulassung, Sprachniveau, Bewerbung, Finanzierung und Wohnen.',
  hero: {
    title: 'Studium & Leben in Deutschland',
    summary: 'Hier findest du Hilfe bei der Studienwahl, der Bewerbung und den ersten Schritten in Deutschland.',
    lead: 'Du möchtest in Deutschland studieren? Dieser Ratgeber hilft dir bei der Planung, von der Wahl des Studiums über den Sprachkurs bis zur Ankunft vor Ort.',
    photo: {
      src: '/media/casa/study-learners-attentive.webp',
      alt: 'Zwei Teilnehmerinnen hören aufmerksam zu',
    },
    ctas: [{ label: 'Kurse ansehen', href: '/courses' }],
  },
  quickFacts: [
    'Viele staatliche Studiengänge sind gebührenfrei, es gibt aber Ausnahmen. Prüfe für deinen Wunschstudiengang die Studiengebühren und den Semesterbeitrag getrennt.',
    'Welcher Sprachnachweis verlangt wird, hängt vom Studiengang und von der Unterrichtssprache ab. Maßgeblich sind die Angaben deiner Hochschule.',
    'Für das Studienvisum brauchst du meist schon vor der Einreise einen Finanzierungsnachweis und eine Krankenversicherung.',
    'Neben dem Kennenlernen deiner neuen Stadt brauchst du auch Zeit für die Anmeldung, das Bankkonto, die Versicherung und die Einschreibung.',
  ],
  stepsTitle: 'Die Schritte in der richtigen Reihenfolge',
  steps: [
    {
      title: 'Die Art des Studiums wählen',
      text: 'Universitäten und Hochschulen für angewandte Wissenschaften setzen unterschiedliche Schwerpunkte bei Forschung und Praxis. Auch eine Ausbildung führt in einen Beruf, und eine betriebliche Ausbildung wird in der Regel bezahlt.',
      action: 'Schreib dir dein Ziel auf, also das Fach, die Stadt und das Semester, in dem du anfangen möchtest.',
    },
    {
      title: 'Zulassungsvoraussetzungen prüfen',
      text: 'Jeder Studiengang legt seine Voraussetzungen selbst fest. Dazu gehören zum Beispiel Schulzeugnisse, Noten, ein Sprachzertifikat und manchmal eine Eignungsprüfung. Auch zwei Studiengänge an derselben Hochschule können Unterschiedliches verlangen.',
      action: 'Such dir drei bis fünf Studiengänge aus und schreib auf, was jeder davon verlangt.',
    },
    {
      title: 'Die Unterrichtssprache berücksichtigen',
      text: 'Für ein Studium auf Deutsch brauchst du in der Regel fortgeschrittene Deutschkenntnisse und einen anerkannten Nachweis. Englischsprachige Studiengänge haben eigene Anforderungen. Im Alltag hilft dir Deutsch in beiden Fällen.',
      action: 'Prüfe, welches Zertifikat mit welchem Ergebnis verlangt wird, und plane von deinem aktuellen Niveau aus.',
    },
    {
      title: 'Zeit zum Deutschlernen einplanen',
      text: 'Wie viel Zeit du brauchst, hängt von deinen Vorkenntnissen ab und davon, wie viel du pro Woche lernst. Rechne vom gewünschten Studienbeginn zurück und denk auch an Prüfungstermine und die Wartezeit auf die Ergebnisse.',
      action: 'Mit einem Einstufungstest weißt du, wo du stehst, und kannst realistisch planen.',
    },
    {
      title: 'Unterlagen früh vollständig zusammenstellen',
      text: 'Prüfe, welche Unterlagen deine Hochschule verlangt und ob du Beglaubigungen oder Übersetzungen brauchst. Wenn du früh anfängst, bleibt genug Zeit, offene Fragen vor der Bewerbungsfrist zu klären.',
      action: 'Leg einen Ordner an für Originale, beglaubigte Kopien, Übersetzungen, Lebenslauf und Pass.',
    },
    {
      title: 'Bewerben, direkt oder über uni-assist',
      text: 'Manche Hochschulen bearbeiten internationale Bewerbungen selbst, andere lassen sie von uni-assist prüfen, und bei einigen hängt es vom Studiengang ab. In beiden Fällen dauert die Prüfung mehrere Wochen.',
      action: 'Bewirb dich, sobald die Bewerbungsfrist beginnt, und warte nicht bis kurz vor Ablauf.',
    },
    {
      title: 'Finanzierung nachweisen und Versicherung abschließen',
      text: 'Für das Studienvisum musst du meist nachweisen, dass du dein erstes Jahr finanzieren kannst, in der Regel mit einem Sperrkonto. Dazu kommt eine Krankenversicherung, die in Deutschland gilt. Was als Nachweis anerkannt wird, hängt von deiner Staatsangehörigkeit ab.',
      action: 'Nutze die aktuelle Checkliste der deutschen Botschaft oder des Konsulats, das für deinen Antrag zuständig ist.',
    },
    {
      title: 'Ankommen, anmelden, einschreiben',
      text: 'Prüfe die Fristen für die Anmeldung deines Wohnsitzes, für die Einschreibung und für den Aufenthaltstitel, falls du einen brauchst. Manches kannst du gleichzeitig erledigen. Deine Hochschule und die zuständigen Stellen helfen dir bei der Planung.',
      action: 'Im Ratgeber „Leben in Deutschland“ findest du Tipps für die praktische Vorbereitung deiner Ankunft.',
    },
  ],
  sections: [
    {
      title: 'Welche Studienform zu dir passt',
      intro: 'Überleg dir, welches Fach dich interessiert, wie du gern lernst und in welchem Bereich du später arbeiten möchtest.',
      bullets: [
        'Universitäten legen meist einen besonderen Schwerpunkt auf wissenschaftliches Arbeiten und Forschung.',
        'Hochschulen für angewandte Wissenschaften verbinden das Studium häufig mit Praxisprojekten und Praktika.',
        'Eine betriebliche Ausbildung verbindet Arbeiten und Lernen. Informiere dich über die Voraussetzungen, die Vergütung und den Abschluss des Angebots, das dich interessiert.',
      ],
    },
    {
      title: 'Bewerbung und Fristen',
      intro: 'Trag die Bewerbungszeiträume und die Fristen für deine Unterlagen in einen Kalender ein. So kannst du dir die Vorbereitung gut einteilen.',
      bullets: [
        'Prüfe für jeden Studiengang, ob du dich direkt oder über uni-assist bewirbst. An einer Hochschule kann es beides geben.',
        'Die Fristen für das Wintersemester liegen meist im Sommer, die für das Sommersemester im Winter. Prüfe jede Frist noch einmal direkt bei der Hochschule.',
        'Rechne mit einigen Wochen für die Prüfung deiner Bewerbung und mit weiteren Wochen, falls Unterlagen unvollständig zurückkommen.',
        'Heb jedes Dokument digital und auf Papier auf. Du wirst zu verschiedenen Zeitpunkten nach beidem gefragt.',
      ],
    },
    {
      title: 'Wie viel Deutsch du brauchst',
      intro: 'Dein Sprachniveau entscheidet, welche Studiengänge dir offenstehen und wie viel du im Alltag ohne Hilfe erledigen kannst.',
      bullets: [
        'Deine Hochschule legt fest, welche Deutschzertifikate und welche Ergebnisse sie für die Zulassung anerkennt.',
        'Auch bei einem englischsprachigen Studium hilft dir Deutsch bei der Wohnungssuche, bei Terminen und wenn du neue Leute kennenlernst.',
        'Wähle ein Lernpensum, das zu deinem Alltag passt. Ein Intensivkurs bietet mehr Unterrichtszeit, und ein Abendkurs lässt sich gut mit anderen Verpflichtungen verbinden.',
        'Bei CASA besprechen wir dein Niveau und deine Pläne persönlich mit dir. Gemeinsam finden wir einen passenden Deutschkurs und, wenn du sie brauchst, eine zusätzliche Vorbereitung auf die telc-Prüfung.',
      ],
      link: { label: 'Mach den Einstufungstest', href: '/placement-test' },
    },
    {
      title: 'Finanzierung, Wohnen und der erste Monat',
      intro: 'Plane neben dem Studium auch deine Ankunft. Unterkunft, Versicherung und erste Anschaffungen können in dieselben Wochen fallen.',
      bullets: [
        'Plane den Semesterbeitrag ein, auch wenn keine Studiengebühren anfallen. Oft ist darin ein Semesterticket enthalten.',
        'Vergleiche die Mieten vor Ort und prüfe im Mietvertrag die Kaution, die Zahlungstermine und mögliche Zusatzkosten.',
        'Frag bei der Hochschule, der Bank und der Versicherung nach, welche Unterlagen sie wann brauchen. So kannst du die einzelnen Schritte gut aufeinander abstimmen.',
        'Etwas Geld als Reserve hilft dir bei ersten Anschaffungen und unerwarteten Ausgaben in den ersten Wochen.',
      ],
      link: { label: 'Zum Ratgeber „Leben in Deutschland“', href: '/resources/living-in-germany' },
    },
  ],
  faq: [
    {
      question: 'Brauche ich Deutsch, bevor ich komme?',
      answer:
        'Das hängt von den Zulassungsvoraussetzungen deines Studiengangs ab. Auch bei einem englischsprachigen Studium helfen dir erste Deutschkenntnisse, zum Beispiel bei Gesprächen im Alltag, bei Terminen und wenn du neue Leute kennenlernst.',
    },
    {
      question: 'Ist ein Studium in Deutschland kostenlos?',
      answer:
        'Viele staatliche Studiengänge sind gebührenfrei. Je nach Hochschule, Studiengang und persönlichem Status gibt es aber Ausnahmen. Der Semesterbeitrag kommt als eigener Posten dazu. Frag bei deiner Hochschule nach den aktuellen Gesamtkosten.',
    },
    {
      question: 'Was ist uni-assist?',
      answer:
        'Hinter uni-assist steht eine gemeinsame Stelle, die internationale Bewerbungen für viele deutsche Hochschulen prüft. Einige Hochschulen nutzen sie, andere bearbeiten die Bewerbungen selbst, und bei manchen hängt es vom Studiengang ab.',
    },
    {
      question: 'Wie früh sollte ich mich bewerben?',
      answer:
        'Bewirb dich, sobald die Bewerbungsfrist beginnt. Manchmal kommen Unterlagen zur Korrektur zurück, Übersetzungen brauchen Zeit, und auf einen Termin für das Visum musst du nach der Zulassung oft noch einige Wochen warten.',
    },
    {
      question: 'Muss ich nachweisen, dass ich das Studium finanzieren kann?',
      answer:
        'Für das Visum in der Regel ja, meistens mit einem Sperrkonto. Wie hoch der Betrag ist und welche Nachweise anerkannt werden, hängt von deiner Staatsangehörigkeit ab. Nutze deshalb die aktuelle Liste deiner Botschaft.',
    },
  ],
  officialLinks: [
    {
      label: 'Study in Germany',
      description: 'Das offizielle Portal zu Studiengängen, Voraussetzungen, Finanzierung und Ankunft.',
      url: 'https://www.study-in-germany.com/en/',
    },
    {
      label: 'uni-assist',
      description: 'Wie die Bewerbung über die gemeinsame Bewerbungsstelle abläuft.',
      url: 'https://www.uni-assist.de/en/how-to-apply/apply-online/',
    },
    {
      label: 'Auswärtiges Amt: Sperrkonto',
      description: 'Was als Finanzierungsnachweis für ein Studienvisum gilt.',
      url: 'https://www.auswaertiges-amt.de/de/sperrkonto-388600',
    },
    {
      label: 'Studierendenwerke',
      description: 'Die Studierendenwerke informieren über Wohnheime, Versicherung und Alltagskosten.',
      url: 'https://www.studierendenwerke.de/en/topics/student-finance/costs-of-study/insurances-for-students/studienvoraussetzung-kranken-und-pflegeversicherung',
    },
  ],
};

export const livingInGermanyGuideDe: ResourceGuideData = {
  slug: 'living-in-germany',
  path: '/resources/living-in-germany',
  metaTitle: 'Leben in Deutschland: ankommen und sich einleben',
  metaDescription:
    'Wie du deinen Wohnsitz anmeldest, ein Konto eröffnest, dich krankenversicherst und ein Zimmer findest, und was dir den ersten Monat in Deutschland leichter macht.',
  hero: {
    title: 'Leben in Deutschland',
    summary: 'Hier findest du praktische Tipps zu Unterkunft, Terminen und deinem neuen Alltag.',
    lead: 'Ein neues Zuhause bringt Fragen und Möglichkeiten mit sich. Dieser Ratgeber hilft dir, das Wichtigste vorzubereiten, damit dir Zeit für die Menschen und Orte um dich herum bleibt.',
    photo: {
      src: '/media/casa/bremen-schnoor-houses.jpg',
      alt: 'Giebelhäuser im Bremer Schnoorviertel',
    },
    ctas: [{ label: 'Unterkünfte ansehen', href: '/accommodation' }],
  },
  quickFacts: [
    'Nach dem Umzug gehört die Anmeldung deines Wohnsitzes zu den ersten wichtigen Aufgaben. Informiere dich über die Regeln vor Ort und über freie Termine.',
    'Ohne Krankenversicherung kannst du dich nicht einschreiben und bekommst keinen Aufenthaltstitel.',
    'Fang früh mit der Wohnungssuche an und halte die Unterlagen für Anfragen und Besichtigungen bereit.',
    'Die meisten Ämter arbeiten mit Terminen, und die Termine sind oft Wochen im Voraus vergeben.',
  ],
  stepsTitle: 'Deine ersten Wochen planen',
  steps: [
    {
      title: 'Vor dem Abflug',
      text: 'Organisiere möglichst eine Unterkunft, in der du dich anmelden darfst, und bring deine Unterlagen im Original und als beglaubigte Kopie mit.',
      action: 'Vereinbare alle Termine bei Ämtern, die du schon aus dem Ausland buchen kannst.',
    },
    {
      title: 'Gut erreichbar sein',
      text: 'Eine funktionierende Telefonnummer, E-Mail-Adresse und Postanschrift erleichtern vieles. Hochschulen, Banken und Behörden schicken wichtige Mitteilungen auch per Brief.',
      action: 'Achte darauf, dass dein Name am Briefkasten steht und dass du Anrufe und Nachrichten empfangen kannst.',
    },
    {
      title: 'Den Wohnsitz anmelden',
      text: 'Beim zuständigen Bürgeramt erfährst du, wie du deinen Wohnsitz anmeldest und welche Unterlagen du brauchst. Heb die Meldebescheinigung gut auf, denn du brauchst sie für weitere Termine.',
      action: 'Bring deinen Pass, die Wohnungsgeberbestätigung und das ausgefüllte Formular mit.',
    },
    {
      title: 'Bankgeschäfte für den Alltag regeln',
      text: 'Kläre, wie du die Miete und laufende Rechnungen bezahlen kannst. Wenn du ein neues Konto brauchst, vergleiche die Gebühren, die Leistungen und die Unterlagen, die die Bank verlangt.',
      action: 'Überleg dir vorher, ob du eine Filiale vor Ort möchtest oder ein Konto, das nur über eine App läuft.',
    },
    {
      title: 'Versicherung und Aufenthalt klären',
      text: 'Prüfe, ob deine Krankenversicherung für deinen Status ausreicht. Beantrage danach den Aufenthaltstitel, falls du mit deiner Staatsangehörigkeit einen brauchst.',
      action: 'Heb jede Bestätigung auf, denn jede davon wird später noch einmal verlangt.',
    },
    {
      title: 'Von der Übergangs- in die Dauerwohnung',
      text: 'Wenn du zuerst vorübergehend wohnst, plane Zeit für die Suche nach einer dauerhaften Unterkunft ein. Eine kurze Vorstellung und die nötigen Unterlagen helfen dir bei jeder Anfrage.',
      action: 'Schreib ein paar Sätze über dich und leg alle Unterlagen in eine Datei.',
    },
    {
      title: 'Den neuen Alltag gestalten',
      text: 'Ein Gespräch mit den Nachbarn, ein gemeinsames Essen oder eine regelmäßige Aktivität können dir helfen, dich einzuleben. Auch kleine Gelegenheiten, Deutsch zu sprechen, zählen.',
      action: 'Überleg dir, in welcher Situation im Alltag du diese Woche Deutsch ausprobieren möchtest.',
    },
  ],
  sections: [
    {
      title: 'Eine passende Unterkunft finden',
      intro: 'Denk an dein Budget, an den Weg zum Kurs und daran, wie viel Alltag du mit anderen teilen möchtest.',
      bullets: [
        'Ein Studierendenwohnheim kann eine günstige Möglichkeit sein. Prüfe die Voraussetzungen und bewirb dich früh, denn die Wartelisten können lang sein.',
        'In einer Wohngemeinschaft, kurz WG, hast du ein eigenes Zimmer und teilst Räume wie die Küche mit anderen.',
        'In einer eigenen Wohnung bist du unabhängig. Dafür brauchst du eine Kaution, einen Einkommensnachweis und Geduld bei der Suche.',
        'Wenn du einen Intensivkurs bei CASA besuchst, vermitteln wir dir je nach Verfügbarkeit ein Zimmer bei privaten Gastgebern oder in einer WG.',
      ],
      link: { label: 'Unterkünfte von CASA ansehen', href: '/accommodation' },
    },
    {
      title: 'Was der erste Monat kostet',
      intro: 'In den ersten Wochen kommen zu den laufenden Ausgaben oft einmalige Kosten hinzu. Etwas Spielraum im Budget erleichtert dir den Start.',
      bullets: [
        'Vergleiche die Mieten in den Stadtteilen, die für dich infrage kommen, und rechne die Fahrtkosten mit ein.',
        'Prüfe im Mietvertrag die Kaution und die Zahlungsvereinbarungen und achte darauf, unter welchen Bedingungen du die Kaution zurückbekommst.',
        'Denk an erste Anschaffungen wie Bettwäsche, eine Grundausstattung für die Küche und Fahrkarten.',
        'Eine Reserve hilft bei unerwarteten Ausgaben oder wenn du länger in einer vorübergehenden Unterkunft bleibst.',
      ],
    },
    {
      title: 'Wichtige Unterlagen griffbereit halten',
      intro: 'Ein Ordner mit deinen wichtigen Dokumenten und digitalen Kopien erleichtert dir Termine und Anträge.',
      bullets: [
        'Die Krankenversicherung brauchst du für die Einschreibung und für den Aufenthaltstitel.',
        'Eine Reiseversicherung wird für einen längeren Aufenthalt meist nicht anerkannt, auch wenn die Laufzeit passt.',
        'Eine Haftpflichtversicherung ist nicht vorgeschrieben, in Deutschland aber üblich, und viele Vermieterinnen und Vermieter fragen danach.',
        'Leg einen Ordner an für die Meldebescheinigung, die Versicherungsbestätigung, den Mietvertrag und die Immatrikulationsbescheinigung.',
      ],
    },
    {
      title: 'Arbeiten neben dem Studium',
      intro: 'Ein Nebenjob kann sich mit dem Studium verbinden lassen. Prüfe vorher, welche Regeln für deine Staatsangehörigkeit und deinen Aufenthaltsstatus gelten.',
      bullets: [
        'Wie viel du arbeiten darfst, richtet sich nach deinem Aufenthaltstitel und deiner Staatsangehörigkeit. Die Auflagen stehen auf dem Aufenthaltstitel selbst.',
        'Das International Office deiner Hochschule hilft dir bei der Orientierung. Die Ausländerbehörde kann dir die Bedingungen deines Aufenthaltstitels bestätigen.',
        'Mit Deutschkenntnissen hast du mehr Möglichkeiten im Austausch mit Kolleginnen, Kollegen und Kunden.',
        'Plane bei der Wahl deiner Arbeitszeiten auch Zeit für den Unterricht, für selbstständiges Lernen und für Erholung ein.',
      ],
    },
  ],
  faq: [
    {
      question: 'Was brauche ich für die Anmeldung?',
      answer:
        'Du brauchst deinen Pass, die Wohnungsgeberbestätigung deiner Vermieterin oder deines Vermieters und das ausgefüllte Formular. Buche den Termin, sobald du die Bestätigung hast, denn die Termine sind schnell vergeben.',
    },
    {
      question: 'Brauche ich sofort eine Krankenversicherung?',
      answer:
        'Für einen längeren Aufenthalt ja. Für die Einschreibung und für den Aufenthaltstitel brauchst du einen gültigen Versicherungsschutz, und eine normale Reiseversicherung reicht dafür in der Regel nicht aus.',
    },
    {
      question: 'Ist die Wohnungssuche wirklich so schwierig?',
      answer:
        'In den beliebten Studienstädten leider ja. Es hilft, früh anzufragen, noch am selben Tag zu antworten und alle Unterlagen in einer Datei zu haben, damit aus der Besichtigung ein Mietvertrag werden kann.',
    },
    {
      question: 'Darf ich neben dem Studium arbeiten?',
      answer:
        'In der Regel ja, aber nur in bestimmten Grenzen, die von deinem Aufenthaltstitel und deiner Staatsangehörigkeit abhängen. Lies die Auflagen auf deinem eigenen Aufenthaltstitel und lass sie dir von der Ausländerbehörde bestätigen. Verlass dich dabei nicht auf andere Studierende.',
    },
    {
      question: 'Was sollte ich von zu Hause mitbringen?',
      answer:
        'Bring deine Originalzeugnisse und beglaubigte Kopien mit, außerdem mehrere Passfotos und Unterlagen zu Medikamenten, die du nimmst. Von allem solltest du auch eine digitale Kopie haben.',
    },
  ],
  officialLinks: [
    {
      label: 'Studierendenwerke',
      description: 'Die Studierendenwerke informieren über Wohnheime, Versicherung und Alltagskosten.',
      url: 'https://www.studierendenwerke.de/en/topics/student-finance/costs-of-study/insurances-for-students/studienvoraussetzung-kranken-und-pflegeversicherung',
    },
    {
      label: 'Make it in Germany',
      description: 'Das Portal des Bundes zu Aufenthalt und Arbeit.',
      url: 'https://www.make-it-in-germany.com/de/',
    },
    {
      label: 'Auswärtiges Amt: Sperrkonto',
      description: 'Was als Finanzierungsnachweis für ein Studienvisum gilt.',
      url: 'https://www.auswaertiges-amt.de/de/sperrkonto-388600',
    },
  ],
};

export const whyGermanyGuideDe: ResourceGuideData = {
  slug: 'why-germany',
  path: '/resources/why-germany',
  metaTitle: 'Warum in Deutschland studieren und Deutsch lernen?',
  metaDescription:
    'Was dir ein Studium in Deutschland bietet, was es kostet, welche Abschlüsse anerkannt sind, wie Studium und Arbeit zusammenpassen und wobei dir Deutsch hilft.',
  hero: {
    title: 'Warum Deutschland',
    summary: 'Hier erfährst du, was Deutschland dir im Studium und im Alltag bietet und wobei dir Deutsch hilft.',
    lead: 'Was könnten ein Studium und ein Leben in Deutschland für dich bedeuten? Dieser Ratgeber hilft dir, es herauszufinden.',
    photo: {
      src: '/media/casa/group-course-walking-bremen.jpg',
      alt: 'CASA-Lernende gehen gemeinsam durch Bremen',
      // The group spans the whole width: shown as its full 3:2 frame, no head cut.
      aspectRatio: '3 / 2',
    },
    ctas: [{ label: 'Kurse ansehen', href: '/courses' }],
  },
  quickFacts: [
    'Viele staatliche Studiengänge sind gebührenfrei. Prüfe trotzdem mögliche Ausnahmen und plane Semesterbeiträge und Lebenshaltungskosten ein.',
    'Vergleiche Studium und Ausbildung und informiere dich, wo dein angestrebter Abschluss anerkannt wird.',
    'Studium und Arbeit lassen sich verbinden, solange du dich an die Auflagen in deinem Aufenthaltstitel hältst.',
    'Mit Deutsch hast du im Alltag mehr Möglichkeiten, im Gespräch mit den Nachbarn genauso wie im Beruf.',
  ],
  stepsTitle: 'So kannst du dich entscheiden',
  steps: [
    {
      title: 'Was möchtest du erreichen?',
      text: 'Vielleicht möchtest du studieren, beruflich weiterkommen, dein Deutsch verbessern oder einen neuen Lebensmittelpunkt finden. Deine Wünsche sind ein guter Ausgangspunkt, um die Möglichkeiten zu erkunden.',
    },
    {
      title: 'Welche Stadt kannst du dir leisten?',
      text: 'Vergleiche Mieten, Fahrtkosten und alltägliche Ausgaben, aber auch die Bildungsangebote und Möglichkeiten vor Ort.',
    },
    {
      title: 'Welcher Weg passt zu dir?',
      text: 'Ein wissenschaftliches Studium, ein praxisorientierter Studiengang und eine Ausbildung bieten dir jeweils andere Möglichkeiten, deine Fähigkeiten zu entwickeln.',
    },
    {
      title: 'Welche Deutschkenntnisse brauchst du?',
      text: 'Prüfe die Anforderungen deines Studiengangs oder deines Berufs. Denk auch an deinen Alltag. Welche Gespräche möchtest du führen, und was möchtest du selbst erledigen können?',
    },
    {
      title: 'Wann möchtest du anfangen, und was heißt das für heute?',
      text: 'Rechne vom gewünschten Beginn zurück und plane Zeit für das Deutschlernen, die Bewerbungen, die Prüfungen und, falls nötig, das Visum ein.',
    },
  ],
  sections: [
    {
      title: 'Was es wirklich kostet',
      intro: 'Schau dir das gesamte Budget an, also Gebühren, Miete, Versicherung, Fahrtkosten und die Ausgaben für den Alltag.',
      bullets: [
        'Prüfe Studiengebühren und Semesterbeitrag getrennt. Auch staatliche Studiengänge können unter bestimmten Voraussetzungen Gebühren verlangen.',
        'Die Miete bestimmt dein Monatsbudget. Wie hoch sie ist, hängt von der Stadt ab, in der du wohnst.',
        'Wenn du ein Studienvisum brauchst, informiere dich vor dem Antrag über die aktuellen Vorgaben zur Finanzierung und über die anerkannten Nachweise.',
      ],
    },
    {
      title: 'Verschiedene Abschlüsse kennenlernen',
      intro: 'Welcher Abschluss zu dir passt, hängt von deinen Zielen ab und davon, wo du später arbeiten möchtest.',
      bullets: [
        'Vergleiche die Studieninhalte und die Praxisanteile an Universitäten und an Hochschulen für angewandte Wissenschaften.',
        'Eine betriebliche Ausbildung verbindet das Lernen mit bezahlter Arbeit und führt zu einem Berufsabschluss.',
        'Prüfe vor der Buchung einer Sprachprüfung, welches Zertifikat und welches Ergebnis deine Hochschule oder dein Arbeitgeber anerkennt.',
      ],
      link: { label: 'Unsere Prüfungen ansehen', href: '/exams' },
    },
    {
      title: 'Wobei dir Deutsch hilft',
      intro: 'Mit Deutsch kannst du mitreden, Fragen stellen und Menschen kennenlernen. Schon kleine Gespräche können viel bewirken.',
      bullets: [
        'Zu Hause hilft dir Deutsch im Gespräch mit deinen Mitbewohnerinnen und Mitbewohnern, beim Verstehen von Briefen und beim Kennenlernen der Nachbarschaft.',
        'Bei Terminen und offiziellen Schreiben können dir Deutschkenntnisse helfen, Einzelheiten zu verstehen und gezielt nachzufragen.',
        'Im Beruf erleichtert dir Deutsch den Austausch mit Kolleginnen, Kollegen und Kunden, und du hast eine größere Auswahl an Stellen.',
        'Über gemeinsame Interessen, Aktivitäten vor Ort und Gespräche im Alltag können Kontakte und Freundschaften entstehen.',
      ],
      link: { label: 'Finde einen Kurs, der zu deinem Zeitplan passt', href: '/courses' },
    },
  ],
  faq: [
    {
      question: 'Ist Deutschland eine gute Wahl, wenn ich noch kein Deutsch spreche?',
      answer:
        'Ja, und sie wird noch besser, je mehr Deutsch du sprichst. Sinnvoll ist es, schon vor der Ankunft mit dem Lernen anzufangen.',
    },
    {
      question: 'Ist das Studium teuer?',
      answer:
        'Die Kosten unterscheiden sich je nach Studiengang und Stadt. Prüfe Studiengebühren, Semesterbeitrag und Lebenshaltungskosten zusammen, einschließlich Miete und Versicherung.',
    },
    {
      question: 'Muss ich die Finanzierung nachweisen?',
      answer:
        'Für das Visum in der Regel ja. Deine Botschaft veröffentlicht die aktuelle Summe und die Nachweise, die sie anerkennt.',
    },
    {
      question: 'Warum sollte ich schon vor der Ankunft mit Deutsch anfangen?',
      answer:
        'Schon erste Deutschkenntnisse können dir bei Gesprächen und Terminen helfen. Fang an, sobald es für dich möglich ist, und lern nach der Ankunft weiter.',
    },
    {
      question: 'Warum Bremen?',
      answer:
        'Bremen bietet Stadtleben, Orte zum Entdecken an der Weser und Begegnungen mit Menschen aus aller Welt. Bei CASA lernst du Deutsch, machst bei gemeinsamen Aktivitäten mit und bekommst persönliche Unterstützung beim Ankommen.',
    },
  ],
  officialLinks: [
    {
      label: 'Study in Germany',
      description: 'Das offizielle Portal für Studiengänge und Planung.',
      url: 'https://www.study-in-germany.com/en/',
    },
    {
      label: 'Make it in Germany',
      description: 'Das Portal des Bundes zum Arbeiten und Leben in Deutschland.',
      url: 'https://www.make-it-in-germany.com/de/',
    },
    {
      label: 'Auswärtiges Amt: Sperrkonto',
      description: 'Was als Finanzierungsnachweis für ein Studienvisum gilt.',
      url: 'https://www.auswaertiges-amt.de/de/sperrkonto-388600',
    },
  ],
};

export const resourceGuidesDe: Record<ResourceGuideSlug, ResourceGuideData> = {
  'study-in-germany': studyInGermanyGuideDe,
  'living-in-germany': livingInGermanyGuideDe,
  'why-germany': whyGermanyGuideDe,
};
