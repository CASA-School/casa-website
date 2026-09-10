import type { ResourceGuideData, ResourceGuideSlug } from './types';

/*
 * The three guides in German — a translation, written 2026-09-10.
 *
 * Until now these routes were English-only by construction: the content module
 * was named `resourcesGuides.en.ts` and there was no German one, so a German
 * visitor read English prose under a German URL.
 *
 * Written rather than machine-translated, in `Sie` form like the rest of the
 * site, and it stays a translation: the same guides, the same steps in the same
 * order, the same claims. A test locks that structure to the English set so the
 * two cannot drift apart silently.
 *
 * German terms stay German, and here that is the point — Anmeldung,
 * Wohnungsgeberbestätigung, Semesterbeitrag and Haftpflichtversicherung are
 * what the form and the letter will say.
 *
 * The Studierendenwerke link keeps its /en/ path in both languages on purpose: the
 * German path could only be guessed, and that site answers 403 to any automated
 * request, so a guess could not be checked. Swap it for the German page once
 * someone has opened it in a browser.
 *
 * NEEDS A NATIVE REVIEW before launch, like every other German page. It is on
 * the copy list with the Gemeinnützigkeit text.
 */

export const studyInGermanyGuideDe: ResourceGuideData = {
  slug: 'study-in-germany',
  path: '/resources/study-in-germany',
  metaTitle: 'Studium & Leben in Deutschland: die Schritte in der richtigen Reihenfolge',
  metaDescription:
    'Was ein Studium in Deutschland verlangt, von der Wahl des Studiengangs bis zum ersten Monat vor Ort: Zulassung, Sprachniveau, Bewerbung, Finanzierung und Wohnen.',
  hero: {
    title: 'Studium & Leben in Deutschland',
    summary: 'Bewerbung, Sprache, Finanzierung und Wohnen, in der Reihenfolge, in der sie anstehen.',
    lead: 'Der Weg von der Entscheidung für ein Studium in Deutschland bis zum ersten Monat hier, geschrieben für alle, die das aus dem Ausland organisieren.',
    ctas: [{ label: 'Kurse ansehen', href: '/courses' }],
  },
  quickFacts: [
    'Staatliche Hochschulen erheben in der Regel einen Semesterbeitrag statt Studiengebühren. Ihr Budget bestimmen also die Lebenshaltungskosten.',
    'Fast jeder Studiengang verlangt einen Sprachnachweis: Deutsch für deutschsprachige Studiengänge, Englisch für die übrigen.',
    'Für das Studienvisum brauchen Sie meist einen Finanzierungsnachweis und eine Krankenversicherung, bevor Sie einreisen.',
    'Der erste Monat hier besteht überwiegend aus Formalitäten: Anmeldung des Wohnsitzes, Bankkonto, Versicherung, Einschreibung.',
  ],
  stepsTitle: 'Die Schritte in der richtigen Reihenfolge',
  steps: [
    {
      title: 'Die Art des Studiums wählen',
      text: 'Eine Universität ist forschungsorientiert, eine Hochschule für angewandte Wissenschaften praxisorientiert, und eine Ausbildung ist bezahlte Berufsausbildung in einem Betrieb. Diese Wahl bestimmt sowohl das verlangte Sprachniveau als auch Ihren Zeitplan.',
      action: 'Notieren Sie ein Ziel: Fach, Stadt und das Semester, in dem Sie beginnen möchten.',
    },
    {
      title: 'Die Zulassungsvoraussetzungen selbst lesen',
      text: 'Jeder Studiengang legt sie eigenständig fest: Schulzeugnisse, Noten, ein Sprachzertifikat, teils eine Eignungsprüfung. Zwei Studiengänge derselben Hochschule können Unterschiedliches verlangen.',
      action: 'Wählen Sie drei bis fünf Studiengänge aus und listen Sie auf, was jeder einzelne verlangt.',
    },
    {
      title: 'Deutsch- oder englischsprachig entscheiden',
      text: 'Ein deutschsprachiger Studiengang verlangt ein hohes Sprachniveau, meist C1 mit anerkanntem Zertifikat. Ein englischsprachiger Studiengang verlangt Englisch, und Sie leben trotzdem auf Deutsch.',
      action: 'Legen Sie ein Zielniveau fest: B1 für den Alltag, C1 für ein deutschsprachiges Studium.',
    },
    {
      title: 'Den Sprachplan vom Startdatum aus rückwärts planen',
      text: 'Ein Niveau braucht Monate, nicht Wochen. Wenn Sie vom gewünschten Semester zurückrechnen, sehen Sie, ob ein Intensivkurs oder ein Abendkurs in Ihre Zeit passt.',
      action: 'Machen Sie zuerst einen Einstufungstest. Das eigene Niveau zu schätzen ist der häufigste Planungsfehler.',
    },
    {
      title: 'Unterlagen früh vollständig zusammenstellen',
      text: 'Beglaubigte Kopien und amtliche Übersetzungen brauchen Zeit, und die Hochschulen akzeptieren Unterschiedliches. Eine fehlende Übersetzung ist der häufigste Grund, warum eine Bewerbung liegen bleibt.',
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
      action: 'Arbeiten Sie mit der aktuellen Liste Ihrer deutschen Botschaft, nicht mit Forenbeiträgen.',
    },
    {
      title: 'Ankommen, anmelden, einschreiben',
      text: 'Die ersten Wochen sind Verwaltung in fester Reihenfolge: Wohnsitz anmelden, Konto eröffnen, Versicherung bestätigen, einschreiben, dann den Aufenthaltstitel beantragen.',
      action: 'Der Ratgeber „Leben in Deutschland“ geht diesen Monat Woche für Woche durch.',
    },
  ],
  sections: [
    {
      title: 'Welche Studienform zu Ihnen passt',
      intro: 'Die drei Wege führen an unterschiedliche Orte, und die Zulassungsvoraussetzungen folgen daraus, nicht umgekehrt.',
      bullets: [
        'Eine Universität ist akademisch und forschungsorientiert und der übliche Weg weiter zum Master und zur Promotion.',
        'Eine Hochschule für angewandte Wissenschaften lehrt dieselben Fächer praxisnah, ist enger mit Unternehmen verbunden und verlangt oft ein Pflichtpraktikum.',
        'Eine Ausbildung bezahlt Sie, während Sie im Betrieb lernen, und führt in einen Beruf statt in die Wissenschaft. Aus dem Ausland wird dieser Weg am häufigsten übersehen.',
      ],
    },
    {
      title: 'Bewerbung und Fristen',
      intro: 'Eine versäumte Frist kostet in der Regel ein ganzes Semester. Der Kalender gehört daher zur Bewerbung und ist keine Randnotiz.',
      bullets: [
        'Prüfen Sie pro Studiengang, ob Sie direkt oder über uni-assist bewerben. An einer Hochschule kann es beides geben.',
        'Fristen für das Wintersemester liegen meist im Sommer, für das Sommersemester im Winter. Bestätigen Sie jede Frist an der Quelle.',
        'Rechnen Sie Wochen für die Prüfung ein, und erneut Wochen für alles, was unvollständig zurückkommt.',
        'Bewahren Sie jedes Dokument digital und auf Papier auf. Beides wird zu unterschiedlichen Zeitpunkten verlangt.',
      ],
    },
    {
      title: 'Sprache: wie viel und wie schnell',
      intro: 'Ihr Sprachniveau entscheidet, welche Studiengänge offenstehen und wie viel Alltag Sie ohne Hilfe bewältigen.',
      bullets: [
        'Deutschsprachige Studiengänge verlangen in der Regel C1, nachgewiesen durch ein anerkanntes Zertifikat, nicht durch Selbsteinschätzung.',
        'Auch bei einem englischsprachigen Studium mieten Sie eine Wohnung, sitzen in Ämtern und arbeiten auf Deutsch.',
        'Regelmäßiger Unterricht bringt mehr als kurze Schübe, außer wenn Sie eine Frist haben. Dann ist Intensiv die ehrliche Antwort.',
        'CASA stuft Sie nach Niveau ein und bietet Intensiv- und Abendkurse von A1 bis C1, mit telc Prüfungsvorbereitung, wenn Sie ein Zertifikat brauchen.',
      ],
      link: { label: 'Mit dem Einstufungstest beginnen', href: '/placement-test' },
    },
    {
      title: 'Finanzierung, Wohnen und der erste Monat',
      intro: 'Ein Studienplan trägt nur, wenn der Ankunftsplan trägt. Kaution, erste Miete und Versicherung fallen in dieselben Wochen.',
      bullets: [
        'Planen Sie den Semesterbeitrag ein, auch wenn keine Studiengebühren anfallen. Häufig ist ein Semesterticket enthalten.',
        'Die Miete ist der größte Unterschied zwischen deutschen Städten, und die Kaution beträgt meist mehrere Monatsmieten, fällig vor dem Einzug.',
        'Anmeldung, Bankkonto und Krankenversicherung hängen voneinander ab. Die Reihenfolge ist deshalb wichtig.',
        'Planen Sie für den ersten Monat einen Puffer statt einer genauen Summe. Er kostet immer mehr als die Monate danach.',
      ],
      link: { label: 'Zum Ratgeber „Leben in Deutschland“', href: '/resources/living-in-germany' },
    },
  ],
  faq: [
    {
      question: 'Brauche ich Deutsch, bevor ich komme?',
      answer:
        'Formal nur für ein deutschsprachiges Studium. Wohnungssuche, Ämter und Nebenjobs laufen aber auf Deutsch, und mit etwa B1 anzukommen macht die ersten Monate deutlich leichter.',
    },
    {
      question: 'Ist ein Studium in Deutschland kostenlos?',
      answer:
        'Staatliche Hochschulen erheben meist einen Semesterbeitrag statt Studiengebühren, und darin ist häufig ein Semesterticket enthalten. Private Hochschulen verlangen Gebühren. Erfragen Sie die Summe bei der Hochschule selbst.',
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
  metaTitle: 'Leben in Deutschland: Ihre ersten dreißig Tage',
  metaDescription:
    'Wohnsitz anmelden, Konto eröffnen, Krankenversicherung, ein Zimmer finden und die Gewohnheiten, die den ersten Monat in Deutschland leichter machen.',
  hero: {
    title: 'Leben in Deutschland',
    summary: 'Anmeldung, Konto, Versicherung und Wohnen, in der Reihenfolge, die der erste Monat verlangt.',
    lead: 'Der praktische Monat: was in welcher Woche nach der Ankunft zu tun ist, und welche Schritte die anderen blockieren, solange sie offen sind.',
    ctas: [{ label: 'Unterkünfte ansehen', href: '/accommodation' }],
  },
  quickFacts: [
    'Die Anmeldung des Wohnsitzes schaltet fast alles Weitere frei: Bank, Versicherung, Aufenthaltstitel.',
    'Eine Krankenversicherung ist Voraussetzung für Einschreibung und Aufenthaltstitel, keine Option.',
    'Zimmer in Studienstädten sind schnell weg, und Organisation hilft mehr als früh dran zu sein.',
    'Die meisten Ämter arbeiten mit Terminen, und Termine sind oft Wochen im Voraus vergeben.',
  ],
  stepsTitle: 'Ihre ersten dreißig Tage, Woche für Woche',
  steps: [
    {
      title: 'Vor dem Abflug',
      text: 'Organisieren Sie möglichst eine Unterkunft, in der Sie sich anmelden dürfen, und bringen Sie Ihre Unterlagen als Original und als beglaubigte Kopie mit.',
      action: 'Buchen Sie alle Amtstermine, die schon aus dem Ausland buchbar sind.',
    },
    {
      title: 'Tag eins bis drei: erreichbar werden',
      text: 'Eine deutsche Mobilnummer und eine feste Adresse machen jeden weiteren Schritt möglich. Für die Formulare genügt eine Messenger-App nicht.',
      action: 'Kaufen Sie eine SIM-Karte und notieren Sie Ihre Adresse genau so, wie sie am Briefkasten steht.',
    },
    {
      title: 'Woche eins: Wohnsitz anmelden',
      text: 'Bei der Anmeldung im Bürgeramt erhalten Sie eine Meldebescheinigung. Bank, Versicherung und Ausländerbehörde verlangen sie alle.',
      action: 'Bringen Sie Pass, Wohnungsgeberbestätigung und das ausgefüllte Formular mit.',
    },
    {
      title: 'Woche eins bis zwei: Konto eröffnen',
      text: 'Miete, Versicherung und Handyvertrag werden per Lastschrift von einem deutschen Konto abgebucht. Dieser Schritt macht also die übrigen möglich.',
      action: 'Entscheiden Sie vorab, ob Sie eine Filiale vor Ort oder ein reines App-Konto möchten.',
    },
    {
      title: 'Woche zwei bis vier: Versicherung und Aufenthaltstitel',
      text: 'Prüfen Sie, ob Ihr Krankenversicherungsschutz für Ihren Status ausreicht, und beantragen Sie dann den Aufenthaltstitel, falls Ihre Staatsangehörigkeit einen verlangt.',
      action: 'Behalten Sie jede Bestätigung. Jede davon wird später noch einmal verlangt.',
    },
    {
      title: 'Von der Übergangs- in die Dauerwohnung',
      text: 'Ein Zwischenzimmer verschafft Ihnen die Zeit, richtige Wohnungen zu besichtigen. WGs und Vermietende entscheiden schnell, die Unterlagen müssen also vor der Besichtigung fertig sein.',
      action: 'Schreiben Sie eine kurze Selbstvorstellung und legen Sie Ihre Unterlagen in eine Datei.',
    },
    {
      title: 'Dann die Routine aufbauen',
      text: 'Die Sprache wird vom Fach zum Alltag: Einkauf, Termine, Nachbarschaft, Kurs.',
      action: 'Nehmen Sie sich pro Woche eine Sache vor, die Sie auf Deutsch erledigen statt auf Englisch.',
    },
  ],
  sections: [
    {
      title: 'Wo Studierende tatsächlich wohnen',
      intro: 'Vier Modelle, und sie unterscheiden sich in Kosten, Selbstständigkeit und darin, wie viel Hilfe Sie bekommen, wenn etwas schiefgeht.',
      bullets: [
        'Ein Wohnheim ist meist die günstigste und die begehrteste Variante. Bewerben Sie sich, sobald Sie eine Zulassung haben, nicht erst nach der Ankunft.',
        'Die WG ist hier die normale Wohnform, und über das Zimmer entscheiden die Menschen, die schon darin wohnen.',
        'Eine eigene Wohnung bringt Selbstständigkeit und verlangt Kaution, Einkommensnachweis und Geduld mit dem Markt.',
        'Eine Gastfamilie gibt Ihnen einen Haushalt und die Sprache jeden Tag. Genau deshalb vermittelt CASA sie an Kursteilnehmende.',
      ],
      link: { label: 'Unterkünfte von CASA ansehen', href: '/accommodation' },
    },
    {
      title: 'Der erste Monat, realistisch gerechnet',
      intro: 'Der erste Monat ist kein normaler Monat, und ihn als solchen zu planen ist der übliche Fehler.',
      bullets: [
        'Die Miete ist der Posten, der die Städte unterscheidet. Die übrigen Kosten sind bundesweit ähnlich.',
        'Die Kaution beträgt üblicherweise mehrere Monatsmieten, fällig vor dem Einzug und zurückgezahlt, wenn Sie die Wohnung in Ordnung übergeben.',
        'Rechnen Sie die Einmalkosten dazu, die niemand einplant: Bettwäsche und Küchengrundausstattung, ein Ticket, die Wege zu den Ämtern.',
        'Planen Sie einen Puffer statt einer genauen Summe. Etwas kommt immer später oder teurer als gedacht.',
      ],
    },
    {
      title: 'Die Unterlagen, von denen alles andere abhängt',
      intro: 'Zwei oder drei Papiere entscheiden, wie schnell der Rest des Monats läuft. Besorgen Sie sie früh und behalten Sie Kopien.',
      bullets: [
        'Die Krankenversicherung ist für die Einschreibung und für den Aufenthaltstitel erforderlich.',
        'Eine Reiseversicherung wird für einen längeren Aufenthalt meist nicht anerkannt, auch wenn die Laufzeit passt.',
        'Eine Haftpflichtversicherung ist nicht vorgeschrieben, hier aber üblich, und Vermietende fragen danach.',
        'Führen Sie einen Ordner: Meldebescheinigung, Versicherungsbestätigung, Mietvertrag, Immatrikulationsbescheinigung.',
      ],
    },
    {
      title: 'Arbeiten neben dem Studium',
      intro: 'Neben dem Studium zu arbeiten ist normal, und die Regeln hängen an Ihrem Aufenthaltstitel, nicht an Ihrem Kurs.',
      bullets: [
        'Wie viel Sie arbeiten dürfen, richtet sich nach Aufenthaltstitel und Staatsangehörigkeit. Die Auflagen stehen auf dem Titel selbst.',
        'Verbindliche Auskunft geben das International Office Ihrer Hochschule und die Ausländerbehörde.',
        'Ein Job auf Deutsch wird genauso bezahlt wie einer auf Englisch und bringt Ihnen deutlich mehr.',
        'Schützen Sie den Studienrhythmus. Ein wiederholtes Semester kostet mehr, als zusätzliche Schichten einbringen.',
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
  metaTitle: 'Warum Deutschland, und warum Deutsch',
  metaDescription:
    'Was Deutschland Studierenden praktisch bietet: was es kostet, welche Abschlüsse anerkannt sind, wie Studium und Arbeit zusammenpassen und wo Deutsch den Unterschied macht.',
  hero: {
    title: 'Warum Deutschland',
    summary: 'Was Deutschland Studierenden praktisch bietet, und wo Deutsch den Unterschied macht.',
    lead: 'Eine Seite zum Entscheiden, nicht zum Überzeugen: was hier wirklich gut ist, was Mühe kostet, und wie viel davon an der Sprache hängt.',
    ctas: [{ label: 'Kurse ansehen', href: '/courses' }],
  },
  quickFacts: [
    'Das staatliche Hochschulstudium ist vergleichsweise günstig. Sie planen also für das Leben hier, nicht für das Studium.',
    'Deutsche Abschlüsse sind international breit anerkannt, auch die beruflichen Wege außerhalb der Hochschule.',
    'Studium und Arbeit lassen sich verbinden, im Rahmen der Auflagen auf Ihrem Aufenthaltstitel.',
    'Fast jeder Vorteil auf dieser Seite wird größer, sobald Sie Deutsch sprechen.',
  ],
  stepsTitle: 'Ein Weg zur Entscheidung',
  steps: [
    {
      title: 'Welches Ergebnis wollen Sie?',
      text: 'Einen Abschluss, einen Beruf, ein Sprachniveau oder einen Umzug. Jedes davon bedeutet einen anderen Weg durch das System und eine andere Menge Deutsch.',
    },
    {
      title: 'Welche Stadt können Sie sich leisten?',
      text: 'Die Miete unterscheidet sich zwischen deutschen Städten stärker als alles andere, und eine kleinere Stadt verschafft meist Zeit und Ruhe.',
    },
    {
      title: 'Welcher Weg passt zu Ihrem Lernen?',
      text: 'Akademisch, angewandt oder bezahlte Ausbildung. Die angewandten und beruflichen Wege werden aus dem Ausland am stärksten unterschätzt.',
    },
    {
      title: 'Wie viel Deutsch brauchen Sie ehrlich?',
      text: 'Etwa B1, um bequem zu leben, C1 für ein deutschsprachiges Studium, und für die meisten Arbeitsplätze etwas dazwischen.',
    },
    {
      title: 'Wann wollen Sie beginnen, und was heißt das für heute?',
      text: 'Rechnen Sie zurück: Einschreibung, Visum, Zulassung, Bewerbung, Sprachniveau. Die Sprache ist der längste Posten auf dieser Liste und beginnt deshalb zuerst.',
    },
  ],
  sections: [
    {
      title: 'Was es wirklich kostet',
      intro: 'Deutschland ist günstig, wo alle hinschauen, bei den Gebühren, und durchschnittlich, wo kaum jemand hinschaut, bei der Miete.',
      bullets: [
        'Staatliche Hochschulen erheben einen Semesterbeitrag statt Studiengebühren, und häufig ist ein Semesterticket enthalten.',
        'Die Miete bestimmt Ihr Monatsbudget, und entschieden wird sie von der Stadt, nicht von der Hochschule.',
        'Für das Studienvisum ist meist eine Jahresfinanzierung im Voraus nachzuweisen. Das ist eher eine Planungsfrage als eine Frage des Vermögens.',
      ],
    },
    {
      title: 'Anerkennung, und die übersehenen Wege',
      intro: 'Der Abschluss ist international anerkannt, und die Wege, die nicht an einer Universität beginnen, sind es ebenso.',
      bullets: [
        'Abschlüsse von Universitäten und von Hochschulen für angewandte Wissenschaften gelten auf dem Arbeitsmarkt vergleichbar viel.',
        'Eine Ausbildung bezahlt Sie während der Lehre und führt direkt in einen Beruf.',
        'telc und vergleichbare Zertifikate sind der anerkannte Nachweis eines Sprachniveaus. Deshalb gehört die Prüfungsvorbereitung in den Kursplan und nicht dahinter.',
      ],
      link: { label: 'Prüfungswege ansehen', href: '/exams' },
    },
    {
      title: 'Wo Deutsch den Unterschied macht',
      intro: 'Das ist der Teil, der sich aus dem Ausland am schwersten erkennen lässt. Hier ist die Sprache kein Fach, das Sie lernen, sondern der Zugang, den Sie haben.',
      bullets: [
        'Wohnen: Besichtigung, Vertrag und Nachbarschaft laufen auf Deutsch, auch in Städten voller internationaler Studierender.',
        'Ämter: Anmeldung, Versicherung und Ausländerbehörde setzen voraus, dass Sie dem Gespräch folgen können.',
        'Arbeit: Ein Nebenjob auf Deutsch wird genauso bezahlt wie einer auf Englisch und bringt Ihnen deutlich mehr.',
        'Menschen: Es ist der Unterschied, ob Sie drei Jahre Gast sind oder hier leben.',
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
        'Die Gebühren an staatlichen Hochschulen sind im internationalen Vergleich niedrig. Die Lebenshaltungskosten sind europäischer Durchschnitt und werden vor allem von der Miete bestimmt.',
    },
    {
      question: 'Muss ich die Finanzierung nachweisen?',
      answer:
        'Für das Visum in der Regel ja. Ihre Botschaft veröffentlicht die aktuelle Summe und die anerkannten Nachweise.',
    },
    {
      question: 'Warum mit Deutsch anfangen, bevor ich komme?',
      answer:
        'Weil alle Formalitäten in Ihren ersten Monat fallen, und das ist genau der Monat, in dem Sie am wenigsten Deutsch haben.',
    },
    {
      question: 'Warum Bremen?',
      answer:
        'Eine Hafen- und Arbeitsstadt, keine Touristenstadt: nach deutschen Maßstäben bezahlbare Mieten, eine echte studentische Szene, und es ist genug los. CASA unterrichtet hier seit 1983 Deutsch.',
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
