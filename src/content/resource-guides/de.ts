import type { ResourceGuideData, ResourceGuideSlug } from './types';

/*
 * German editorial copy, reviewed alongside English on 2026-09-16.
 * Sie form; natural German phrasing, shared facts and structure.
 * Keep official German terms readers meet on forms. See the release copy
 * handoff for sources and remaining operational confirmations.
 */

export const studyInGermanyGuideDe: ResourceGuideData = {
  slug: 'study-in-germany',
  path: '/resources/study-in-germany',
  metaTitle: 'Studium und Leben in Deutschland: Ihre nächsten Schritte',
  metaDescription:
    'Was ein Studium in Deutschland verlangt, von der Wahl des Studiengangs bis zum ersten Monat vor Ort: Zulassung, Sprachniveau, Bewerbung, Finanzierung und Wohnen.',
  hero: {
    title: 'Studium & Leben in Deutschland',
    summary: 'Orientierung bei Studienwahl, Bewerbung und den ersten Schritten in Deutschland.',
    lead: 'Sie möchten in Deutschland studieren? Hier finden Sie Orientierung für Ihre Planung – von der Studienwahl über den Sprachkurs bis zum Ankommen vor Ort.',
    photo: {
      src: '/media/casa/study-materials-map.jpg',
      alt: 'Lernmaterialien und eine Karte für die Kursplanung',
    },
    ctas: [{ label: 'Kurse ansehen', href: '/courses' }],
  },
  quickFacts: [
    'Viele staatliche Studiengänge sind gebührenfrei, es gibt aber Ausnahmen. Prüfen Sie Studiengebühren und Semesterbeitrag für Ihr Wunschstudium getrennt.',
    'Welcher Sprachnachweis verlangt wird, hängt vom Studiengang und der Unterrichtssprache ab. Maßgeblich sind die Angaben Ihrer Hochschule.',
    'Für das Studienvisum brauchen Sie meist einen Finanzierungsnachweis und eine Krankenversicherung, bevor Sie einreisen.',
    'Planen Sie neben dem Kennenlernen Ihrer neuen Stadt auch Zeit für Anmeldung, Bankkonto, Versicherung und Einschreibung ein.',
  ],
  stepsTitle: 'Die Schritte in der richtigen Reihenfolge',
  steps: [
    {
      title: 'Die Art des Studiums wählen',
      text: 'Universitäten und Hochschulen für angewandte Wissenschaften setzen unterschiedliche Schwerpunkte bei Forschung und Praxis. Eine Ausbildung ist ein weiterer Weg in den Beruf; betriebliche Ausbildungen werden in der Regel vergütet.',
      action: 'Notieren Sie ein Ziel: Fach, Stadt und das Semester, in dem Sie beginnen möchten.',
    },
    {
      title: 'Zulassungsvoraussetzungen prüfen',
      text: 'Jeder Studiengang legt sie eigenständig fest: Schulzeugnisse, Noten, ein Sprachzertifikat, teils eine Eignungsprüfung. Zwei Studiengänge derselben Hochschule können Unterschiedliches verlangen.',
      action: 'Wählen Sie drei bis fünf Studiengänge aus und listen Sie auf, was jeder einzelne verlangt.',
    },
    {
      title: 'Die Unterrichtssprache berücksichtigen',
      text: 'Für ein deutschsprachiges Studium benötigen Sie in der Regel fortgeschrittene Deutschkenntnisse und einen anerkannten Nachweis. Englischsprachige Studiengänge haben eigene Anforderungen. Im Alltag hilft Ihnen Deutsch in beiden Fällen.',
      action: 'Prüfen Sie, welches Zertifikat mit welchem Ergebnis verlangt wird, und planen Sie von Ihrem aktuellen Niveau aus.',
    },
    {
      title: 'Zeit für das Sprachenlernen einplanen',
      text: 'Wie viel Zeit Sie brauchen, hängt von Ihren Vorkenntnissen und Ihrem Lernpensum ab. Rechnen Sie vom gewünschten Studienbeginn zurück und berücksichtigen Sie auch Prüfungstermine und Wartezeiten auf Ergebnisse.',
      action: 'Ein Einstufungstest hilft Ihnen, Ihren Lernweg realistisch zu planen.',
    },
    {
      title: 'Unterlagen früh vollständig zusammenstellen',
      text: 'Prüfen Sie, welche Unterlagen Ihre Hochschule verlangt und ob Beglaubigungen oder Übersetzungen nötig sind. Wenn Sie früh beginnen, bleibt Zeit, offene Fragen vor der Bewerbungsfrist zu klären.',
      action: 'Führen Sie einen Ordner: Originale, beglaubigte Kopien, Übersetzungen, Lebenslauf, Pass.',
    },
    {
      title: 'Bewerben, direkt oder über uni-assist',
      text: 'Manche Hochschulen bearbeiten internationale Bewerbungen selbst, andere über uni-assist, einige je nach Studiengang unterschiedlich. In beiden Fällen dauert die Prüfung Wochen.',
      action: 'Bewerben Sie sich, sobald die Bewerbungsfrist beginnt, nicht kurz vor Ablauf.',
    },
    {
      title: 'Finanzierung nachweisen und Versicherung abschließen',
      text: 'Für das Studienvisum ist meist nachzuweisen, dass Sie Ihr erstes Jahr finanzieren können, üblicherweise über ein Sperrkonto, dazu eine in Deutschland gültige Krankenversicherung. Was als Nachweis gilt, hängt von Ihrer Staatsangehörigkeit ab.',
      action: 'Nutzen Sie die aktuelle Checkliste der deutschen Botschaft oder des Konsulats, das für Ihren Antrag zuständig ist.',
    },
    {
      title: 'Ankommen, anmelden, einschreiben',
      text: 'Prüfen Sie die Fristen für Wohnsitzanmeldung, Einschreibung und einen gegebenenfalls benötigten Aufenthaltstitel. Manche Schritte lassen sich parallel erledigen. Ihre Hochschule und die zuständigen Stellen helfen bei der Planung.',
      action: 'Im Ratgeber „Leben in Deutschland“ finden Sie Hinweise für die praktische Vorbereitung Ihrer Ankunft.',
    },
  ],
  sections: [
    {
      title: 'Welche Studienform zu Ihnen passt',
      intro: 'Überlegen Sie, welches Fach Sie interessiert, wie Sie gern lernen und in welchem Bereich Sie später arbeiten möchten.',
      bullets: [
        'Universitäten legen meist einen besonderen Schwerpunkt auf wissenschaftliches Arbeiten und Forschung.',
        'Hochschulen für angewandte Wissenschaften verbinden das Studium häufig mit Praxisprojekten und Praktika.',
        'Eine betriebliche Ausbildung verbindet Arbeiten und Lernen. Informieren Sie sich über Voraussetzungen, Vergütung und Abschluss des jeweiligen Angebots.',
      ],
    },
    {
      title: 'Bewerbung und Fristen',
      intro: 'Tragen Sie Bewerbungszeiträume und Fristen für Unterlagen in einen Kalender ein. So können Sie die Vorbereitung gut aufteilen.',
      bullets: [
        'Prüfen Sie für jeden Studiengang, ob Sie sich direkt oder über uni-assist bewerben. An einer Hochschule kann beides vorkommen.',
        'Fristen für das Wintersemester liegen meist im Sommer, für das Sommersemester im Winter. Bestätigen Sie jede Frist an der Quelle.',
        'Rechnen Sie Wochen für die Prüfung ein, und erneut Wochen für alles, was unvollständig zurückkommt.',
        'Bewahren Sie jedes Dokument digital und auf Papier auf. Beides wird zu unterschiedlichen Zeitpunkten verlangt.',
      ],
    },
    {
      title: 'Sprache: wie viel und wie schnell',
      intro: 'Ihr Sprachniveau entscheidet, welche Studiengänge offenstehen und wie viel Alltag Sie ohne Hilfe bewältigen.',
      bullets: [
        'Ihre Hochschule legt fest, welche Deutschzertifikate und Ergebnisse sie für die Zulassung anerkennt.',
        'Auch bei einem englischsprachigen Studium hilft Deutsch bei der Wohnungssuche, bei Terminen und beim Kennenlernen anderer Menschen.',
        'Wählen Sie ein Lernpensum, das zu Ihrem Alltag passt. Ein Intensivkurs bietet mehr Unterrichtszeit; ein Abendkurs lässt sich gut mit anderen Verpflichtungen verbinden.',
        'Bei CASA besprechen wir Ihr Niveau und Ihre Pläne persönlich. Gemeinsam finden wir einen passenden Deutschkurs und bei Bedarf eine zusätzliche telc-Vorbereitung.',
      ],
      link: { label: 'Mit dem Einstufungstest beginnen', href: '/placement-test' },
    },
    {
      title: 'Finanzierung, Wohnen und der erste Monat',
      intro: 'Planen Sie neben dem Studium auch Ihre Ankunft: Unterkunft, Versicherung und erste Anschaffungen können zeitlich zusammenfallen.',
      bullets: [
        'Planen Sie den Semesterbeitrag ein, auch wenn keine Studiengebühren anfallen. Häufig ist ein Semesterticket enthalten.',
        'Vergleichen Sie die Mieten vor Ort und prüfen Sie im Mietvertrag Kaution, Zahlungstermine und mögliche Zusatzkosten.',
        'Fragen Sie Hochschule, Bank und Versicherung, welche Unterlagen jeweils wann benötigt werden. So lassen sich die Schritte aufeinander abstimmen.',
        'Ein finanzieller Puffer hilft bei ersten Anschaffungen und unerwarteten Ausgaben in den ersten Wochen.',
      ],
      link: { label: 'Zum Ratgeber „Leben in Deutschland“', href: '/resources/living-in-germany' },
    },
  ],
  faq: [
    {
      question: 'Brauche ich Deutsch, bevor ich komme?',
      answer:
        'Das hängt von den Zulassungsvoraussetzungen Ihres Studiengangs ab. Auch für ein englischsprachiges Studium sind erste Deutschkenntnisse hilfreich: bei Gesprächen im Alltag, Terminen und neuen Kontakten.',
    },
    {
      question: 'Ist ein Studium in Deutschland kostenlos?',
      answer:
        'Viele staatliche Studiengänge sind gebührenfrei. Je nach Hochschule, Studiengang und persönlichem Status gibt es Ausnahmen. Der Semesterbeitrag ist eine eigene Kostenposition. Erfragen Sie die aktuellen Gesamtkosten bei Ihrer Hochschule.',
    },
    {
      question: 'Was ist uni-assist?',
      answer:
        'Eine gemeinsame Stelle, die internationale Bewerbungen für viele deutsche Hochschulen prüft. Einige nutzen sie, andere bearbeiten die Bewerbungen selbst, manche je nach Studiengang unterschiedlich.',
    },
    {
      question: 'Wie früh soll ich mich bewerben?',
      answer:
        'Sobald die Bewerbungsfrist beginnt. Unterlagen kommen zur Korrektur zurück, Übersetzungen brauchen Zeit, und ein Visumtermin kann nach der Zulassung weitere Wochen kosten.',
    },
    {
      question: 'Muss ich nachweisen, dass ich das Studium finanzieren kann?',
      answer:
        'Für das Visum in der Regel ja, üblicherweise über ein Sperrkonto. Höhe und anerkannte Nachweise hängen von Ihrer Staatsangehörigkeit ab, nutzen Sie daher die aktuelle Liste Ihrer Botschaft.',
    },
  ],
  officialLinks: [
    {
      label: 'Study in Germany',
      description: 'Das offizielle Portal: Studiengänge, Voraussetzungen, Finanzierung, Ankunft.',
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
      description: 'Studentische Dienste: Wohnheime, Versicherung, Alltagskosten.',
      url: 'https://www.studierendenwerke.de/en/topics/student-finance/costs-of-study/insurances-for-students/studienvoraussetzung-kranken-und-pflegeversicherung',
    },
  ],
};

export const livingInGermanyGuideDe: ResourceGuideData = {
  slug: 'living-in-germany',
  path: '/resources/living-in-germany',
  metaTitle: 'Leben in Deutschland: ankommen und sich einleben',
  metaDescription:
    'Wohnsitz anmelden, Konto eröffnen, Krankenversicherung, ein Zimmer finden und die Gewohnheiten, die den ersten Monat in Deutschland leichter machen.',
  hero: {
    title: 'Leben in Deutschland',
    summary: 'Praktische Hinweise zu Unterkunft, Terminen und Ihrem neuen Alltag.',
    lead: 'Ein neues Zuhause bringt Fragen und Möglichkeiten mit sich. Dieser Ratgeber hilft Ihnen, das Wichtigste vorzubereiten und Zeit für die Menschen und Orte um Sie herum zu finden.',
    photo: {
      src: '/media/casa/bremen-schnoor-houses.jpg',
      alt: 'Giebelhäuser im Bremer Schnoorviertel',
    },
    ctas: [{ label: 'Unterkünfte ansehen', href: '/accommodation' }],
  },
  quickFacts: [
    'Nach einem Umzug gehört die Anmeldung des Wohnsitzes zu den wichtigen ersten Aufgaben. Informieren Sie sich über die örtlichen Voraussetzungen und freien Termine.',
    'Eine Krankenversicherung ist Voraussetzung für Einschreibung und Aufenthaltstitel, keine Option.',
    'Beginnen Sie früh mit der Wohnungssuche und halten Sie die Unterlagen für Anfragen und Besichtigungen bereit.',
    'Die meisten Ämter arbeiten mit Terminen, und Termine sind oft Wochen im Voraus vergeben.',
  ],
  stepsTitle: 'Ihre ersten Wochen planen',
  steps: [
    {
      title: 'Vor dem Abflug',
      text: 'Organisieren Sie möglichst eine Unterkunft, in der Sie sich anmelden dürfen, und bringen Sie Ihre Unterlagen als Original und als beglaubigte Kopie mit.',
      action: 'Buchen Sie alle Amtstermine, die schon aus dem Ausland buchbar sind.',
    },
    {
      title: 'Gut erreichbar sein',
      text: 'Eine funktionierende Telefonnummer, E-Mail-Adresse und Postanschrift erleichtern vieles. Hochschulen, Banken und Behörden verschicken wichtige Mitteilungen auch per Brief.',
      action: 'Achten Sie darauf, dass Ihr Name am Briefkasten steht und Sie Anrufe und Nachrichten empfangen können.',
    },
    {
      title: 'Den Wohnsitz anmelden',
      text: 'Beim zuständigen Bürgeramt erfahren Sie, wie Sie Ihren Wohnsitz anmelden und welche Unterlagen Sie benötigen. Bewahren Sie die Meldebescheinigung für weitere Termine auf.',
      action: 'Bringen Sie Pass, Wohnungsgeberbestätigung und das ausgefüllte Formular mit.',
    },
    {
      title: 'Bankgeschäfte für den Alltag regeln',
      text: 'Klären Sie, wie Sie Miete und laufende Rechnungen bezahlen können. Wenn Sie ein neues Konto benötigen, vergleichen Sie Gebühren, Leistungen und erforderliche Unterlagen.',
      action: 'Entscheiden Sie vorab, ob Sie eine Filiale vor Ort oder ein reines App-Konto möchten.',
    },
    {
      title: 'Versicherung und Aufenthalt klären',
      text: 'Prüfen Sie, ob Ihr Krankenversicherungsschutz für Ihren Status ausreicht, und beantragen Sie dann den Aufenthaltstitel, falls Ihre Staatsangehörigkeit einen verlangt.',
      action: 'Behalten Sie jede Bestätigung. Jede davon wird später noch einmal verlangt.',
    },
    {
      title: 'Von der Übergangs- in die Dauerwohnung',
      text: 'Wenn Sie zunächst vorübergehend wohnen, planen Sie Zeit für die Suche nach einer dauerhaften Unterkunft ein. Eine kurze Vorstellung und die jeweils benötigten Unterlagen helfen bei der Anfrage.',
      action: 'Schreiben Sie eine kurze Selbstvorstellung und legen Sie Ihre Unterlagen in eine Datei.',
    },
    {
      title: 'Den neuen Alltag gestalten',
      text: 'Ein Gespräch mit den Nachbarn, ein gemeinsames Essen oder eine regelmäßige Aktivität können helfen, sich einzuleben. Auch kleine Gelegenheiten zum Deutschsprechen zählen.',
      action: 'Überlegen Sie, in welcher Alltagssituation Sie diese Woche Deutsch ausprobieren möchten.',
    },
  ],
  sections: [
    {
      title: 'Eine passende Unterkunft finden',
      intro: 'Denken Sie an Ihr Budget, den Weg zum Kurs und daran, wie viel Alltag Sie mit anderen teilen möchten.',
      bullets: [
        'Ein Studierendenwohnheim kann eine günstige Möglichkeit sein. Prüfen Sie die Voraussetzungen und bewerben Sie sich früh, da Wartelisten lang sein können.',
        'In einer Wohngemeinschaft, kurz WG, haben Sie ein eigenes Zimmer und teilen Räume wie die Küche mit anderen.',
        'Eine eigene Wohnung bringt Selbstständigkeit und verlangt Kaution, Einkommensnachweis und Geduld mit dem Markt.',
        'Für Teilnehmende an Intensivkursen vermittelt CASA je nach Verfügbarkeit Zimmer bei privaten Gastgebern oder in WGs.',
      ],
      link: { label: 'Unterkünfte von CASA ansehen', href: '/accommodation' },
    },
    {
      title: 'Der erste Monat, realistisch gerechnet',
      intro: 'In den ersten Wochen kommen zu den laufenden Ausgaben oft einmalige Kosten hinzu. Etwas Spielraum im Budget erleichtert den Start.',
      bullets: [
        'Vergleichen Sie die Mieten in den Stadtteilen, die für Sie infrage kommen, und berücksichtigen Sie Fahrtkosten.',
        'Prüfen Sie Kaution und Zahlungsvereinbarungen im Mietvertrag, einschließlich der Bedingungen für die Rückzahlung.',
        'Denken Sie an erste Anschaffungen wie Bettwäsche, Küchengrundausstattung und Fahrkarten.',
        'Eine Reserve hilft bei unerwarteten Ausgaben oder einem längeren Aufenthalt in einer vorübergehenden Unterkunft.',
      ],
    },
    {
      title: 'Wichtige Unterlagen griffbereit halten',
      intro: 'Ein Ordner mit wichtigen Dokumenten und digitalen Kopien erleichtert Termine und Anträge.',
      bullets: [
        'Die Krankenversicherung ist für die Einschreibung und für den Aufenthaltstitel erforderlich.',
        'Eine Reiseversicherung wird für einen längeren Aufenthalt meist nicht anerkannt, auch wenn die Laufzeit passt.',
        'Eine Haftpflichtversicherung ist nicht vorgeschrieben, hier aber üblich, und Vermietende fragen danach.',
        'Führen Sie einen Ordner: Meldebescheinigung, Versicherungsbestätigung, Mietvertrag, Immatrikulationsbescheinigung.',
      ],
    },
    {
      title: 'Arbeiten neben dem Studium',
      intro: 'Ein Nebenjob kann sich mit dem Studium verbinden lassen. Prüfen Sie vorab, welche Regeln für Ihre Staatsangehörigkeit und Ihren Aufenthaltsstatus gelten.',
      bullets: [
        'Wie viel Sie arbeiten dürfen, richtet sich nach Aufenthaltstitel und Staatsangehörigkeit. Die Auflagen stehen auf dem Titel selbst.',
        'Das International Office Ihrer Hochschule hilft bei der Orientierung. Die Ausländerbehörde kann die Bedingungen Ihres Aufenthaltstitels bestätigen.',
        'Deutschkenntnisse können Ihnen weitere Möglichkeiten im Austausch mit Kolleginnen, Kollegen und Kunden eröffnen.',
        'Planen Sie bei der Wahl Ihrer Arbeitszeiten auch Unterricht, selbstständiges Lernen und Erholung ein.',
      ],
    },
  ],
  faq: [
    {
      question: 'Was brauche ich für die Anmeldung?',
      answer:
        'Ihren Pass, die Wohnungsgeberbestätigung Ihrer Vermieterin oder Ihres Vermieters und das ausgefüllte Formular. Buchen Sie den Termin, sobald Sie die Bestätigung haben, denn die Termine sind schnell vergeben.',
    },
    {
      question: 'Brauche ich sofort eine Krankenversicherung?',
      answer:
        'Für einen längeren Aufenthalt ja. Einschreibung und Aufenthaltstitel verlangen beide einen gültigen Schutz, und eine gewöhnliche Reiseversicherung genügt in der Regel nicht.',
    },
    {
      question: 'Ist die Wohnungssuche wirklich so schwierig?',
      answer:
        'In den beliebten Studienstädten ja. Es hilft, früh anzufragen, am selben Tag zu antworten und alle Unterlagen in einer Datei zu haben, damit aus der Besichtigung ein Vertrag werden kann.',
    },
    {
      question: 'Darf ich neben dem Studium arbeiten?',
      answer:
        'In der Regel ja, im Rahmen der Grenzen, die von Aufenthaltstitel und Staatsangehörigkeit abhängen. Lesen Sie die Auflagen auf Ihrem eigenen Titel und lassen Sie sie sich von der Ausländerbehörde bestätigen, nicht von Mitstudierenden.',
    },
    {
      question: 'Was soll ich von zu Hause mitbringen?',
      answer:
        'Originalzeugnisse mit beglaubigten Kopien, mehrere Passfotos, Unterlagen zu Medikamenten, die Sie nehmen, und von allem eine digitale Kopie.',
    },
  ],
  officialLinks: [
    {
      label: 'Studierendenwerke',
      description: 'Studentische Dienste: Wohnheime, Versicherung, Alltagskosten.',
      url: 'https://www.studierendenwerke.de/en/topics/student-finance/costs-of-study/insurances-for-students/studienvoraussetzung-kranken-und-pflegeversicherung',
    },
    {
      label: 'Make it in Germany',
      description: 'Das Portal des Bundes zu Aufenthalt und Arbeit.',
      url: 'https://www.make-it-in-germany.com/de/',
    },
    {
      label: 'Auswärtiges Amt: Sperrkonto',
      description: 'Finanzierungsnachweis für ein Studienvisum.',
      url: 'https://www.auswaertiges-amt.de/de/sperrkonto-388600',
    },
  ],
};

export const whyGermanyGuideDe: ResourceGuideData = {
  slug: 'why-germany',
  path: '/resources/why-germany',
  metaTitle: 'Warum in Deutschland studieren und Deutsch lernen?',
  metaDescription:
    'Was Deutschland Studierenden praktisch bietet: was es kostet, welche Abschlüsse anerkannt sind, wie Studium und Arbeit zusammenpassen und wo Deutsch den Unterschied macht.',
  hero: {
    title: 'Warum Deutschland',
    summary: 'Was Deutschland Studierenden praktisch bietet, und wo Deutsch den Unterschied macht.',
    lead: 'Entdecken Sie, was ein Studium und ein Leben in Deutschland für Sie bedeuten könnten – von der Wahl des Bildungswegs bis zu neuen Freundschaften und einem Zuhause in einer anderen Stadt.',
    photo: {
      src: '/media/casa/group-course-walking-bremen.jpg',
      alt: 'CASA Lernende gehen gemeinsam durch Bremen',
    },
    ctas: [{ label: 'Kurse ansehen', href: '/courses' }],
  },
  quickFacts: [
    'Viele staatliche Studiengänge sind gebührenfrei. Prüfen Sie dennoch mögliche Ausnahmen und planen Sie Semesterbeiträge und Lebenshaltungskosten ein.',
    'Vergleichen Sie Studium und Ausbildung und informieren Sie sich, wo Ihr angestrebter Abschluss anerkannt wird.',
    'Studium und Arbeit lassen sich verbinden, im Rahmen der Auflagen auf Ihrem Aufenthaltstitel.',
    'Deutsch eröffnet Ihnen mehr Möglichkeiten im Alltag: im Gespräch mit den Nachbarn genauso wie im Beruf.',
  ],
  stepsTitle: 'Ein Weg zur Entscheidung',
  steps: [
    {
      title: 'Was möchten Sie erreichen?',
      text: 'Vielleicht möchten Sie studieren, beruflich weiterkommen, Ihr Deutsch verbessern oder einen neuen Lebensmittelpunkt finden. Ihre Wünsche sind ein guter Ausgangspunkt, um Möglichkeiten zu erkunden.',
    },
    {
      title: 'Welche Stadt können Sie sich leisten?',
      text: 'Vergleichen Sie Mieten, Fahrtkosten und alltägliche Ausgaben ebenso wie die Bildungsangebote und Möglichkeiten vor Ort.',
    },
    {
      title: 'Welcher Weg passt zu Ihrem Lernen?',
      text: 'Wissenschaftliches Studium, praxisorientierter Studiengang oder Ausbildung: Jeder Weg bietet andere Möglichkeiten, Ihre Fähigkeiten zu entwickeln.',
    },
    {
      title: 'Welche Deutschkenntnisse brauchen Sie?',
      text: 'Prüfen Sie die Anforderungen Ihres Studiengangs oder Berufs. Denken Sie auch an den Alltag: Welche Gespräche möchten Sie führen und was möchten Sie selbstständig erledigen können?',
    },
    {
      title: 'Wann wollen Sie beginnen, und was heißt das für heute?',
      text: 'Rechnen Sie vom gewünschten Beginn zurück und planen Sie Zeit für Sprache, Bewerbungen, Prüfungen und gegebenenfalls das Visum ein.',
    },
  ],
  sections: [
    {
      title: 'Was es wirklich kostet',
      intro: 'Vergleichen Sie das gesamte Budget: Gebühren, Miete, Versicherung, Fahrtkosten und alltägliche Ausgaben.',
      bullets: [
        'Prüfen Sie Studiengebühren und Semesterbeitrag getrennt. Auch staatliche Studiengänge können unter bestimmten Voraussetzungen Gebühren verlangen.',
        'Die Miete bestimmt Ihr Monatsbudget, und entschieden wird sie von der Stadt, nicht von der Hochschule.',
        'Wenn Sie ein Studienvisum benötigen, informieren Sie sich vor dem Antrag über die aktuellen Finanzierungsvorgaben und anerkannten Nachweise.',
      ],
    },
    {
      title: 'Verschiedene Abschlüsse kennenlernen',
      intro: 'Welcher Abschluss zu Ihnen passt, hängt von Ihren Zielen ab und davon, wo Sie später arbeiten möchten.',
      bullets: [
        'Vergleichen Sie die Studieninhalte und Praxisanteile von Universitäten und Hochschulen für angewandte Wissenschaften.',
        'Eine betriebliche Ausbildung verbindet Lernen mit vergüteter Arbeit und führt zu einem Berufsabschluss.',
        'Prüfen Sie vor der Buchung einer Sprachprüfung, welches Zertifikat und Ergebnis Ihre Hochschule oder Ihr Arbeitgeber anerkennt.',
      ],
      link: { label: 'Prüfungswege ansehen', href: '/exams' },
    },
    {
      title: 'Wo Deutsch den Unterschied macht',
      intro: 'Deutsch hilft Ihnen, mitzureden, Fragen zu stellen und Menschen kennenzulernen. Schon kleine Gespräche können viel bewirken.',
      bullets: [
        'Beim Wohnen hilft Deutsch im Gespräch mit Mitbewohnenden, beim Verstehen von Briefen und beim Kennenlernen der Nachbarschaft.',
        'Bei Terminen und offiziellen Schreiben können Deutschkenntnisse helfen, Einzelheiten zu verstehen und gezielt nachzufragen.',
        'Im Beruf erleichtert Deutsch den Austausch mit Kolleginnen, Kollegen und Kunden und erweitert die Auswahl möglicher Tätigkeiten.',
        'Über gemeinsame Interessen, Aktivitäten vor Ort und alltägliche Gespräche können Kontakte und Freundschaften entstehen.',
      ],
      link: { label: 'Kurs passend zu Ihrem Zeitplan finden', href: '/courses' },
    },
  ],
  faq: [
    {
      question: 'Ist Deutschland eine gute Wahl, wenn ich noch kein Deutsch spreche?',
      answer:
        'Ja, und sie wird deutlich besser, sobald Ihr Deutsch wächst. Sinnvoll ist, vor der Ankunft anzufangen und nicht danach.',
    },
    {
      question: 'Ist das Studium teuer?',
      answer:
        'Die Kosten unterscheiden sich je nach Studiengang und Stadt. Prüfen Sie Studiengebühren, Semesterbeitrag und Lebenshaltungskosten gemeinsam, einschließlich Miete und Versicherung.',
    },
    {
      question: 'Muss ich die Finanzierung nachweisen?',
      answer:
        'Für das Visum in der Regel ja. Ihre Botschaft veröffentlicht die aktuelle Summe und die anerkannten Nachweise.',
    },
    {
      question: 'Warum mit Deutsch anfangen, bevor ich komme?',
      answer:
        'Schon erste Deutschkenntnisse können bei Gesprächen und Terminen helfen. Beginnen Sie, wenn es für Sie möglich ist, und lernen Sie nach der Ankunft weiter.',
    },
    {
      question: 'Warum Bremen?',
      answer:
        'Bremen bietet Stadtleben, Orte zum Entdecken an der Weser und Begegnungen mit Menschen aus aller Welt. Bei CASA verbinden Sie Deutschlernen mit gemeinsamen Aktivitäten und persönlicher Unterstützung beim Ankommen.',
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
      description: 'Finanzierungsnachweis für ein Studienvisum.',
      url: 'https://www.auswaertiges-amt.de/de/sperrkonto-388600',
    },
  ],
};

export const resourceGuidesDe: Record<ResourceGuideSlug, ResourceGuideData> = {
  'study-in-germany': studyInGermanyGuideDe,
  'living-in-germany': livingInGermanyGuideDe,
  'why-germany': whyGermanyGuideDe,
};
