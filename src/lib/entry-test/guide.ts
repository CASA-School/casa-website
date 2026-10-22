/**
 * The teachers' guide to the day-one test (Rahman, 2026-10-22), one text for the printed „Leitfaden" and
 * the mail with the codes. Only what CASA does: no address beside the QR code, and the office does not
 * pass results on. `time` is the line for the test's time („30 Minuten", or each level's).
 */
export type GuideStep = { title: string; points: string[] };

export function guideSteps(time: string): GuideStep[] {
  return [
    {
      title: 'Vorbereiten',
      points: [
        'Den QR-Code an die Tafel projizieren oder ausgedruckt aufhängen.',
        'Wer kein funktionierendes Handy hat, schreibt auf Papier: Testheft A oder B aus dem Büro, im Wechsel ausgeteilt, und einen Bleistift.',
      ],
    },
    {
      title: 'Starten',
      points: [
        'Den QR-Code scannen.',
        'Vor- und Nachnamen und die E-Mail-Adresse der Anmeldung eingeben – so kommt das Ergebnis zur richtigen Person.',
        'Version A und B wechseln sich von selbst ab, und die Antworten stehen bei allen in anderer Reihenfolge.',
      ],
    },
    {
      title: `Während des Tests · ${time}`,
      points: [
        'Die Zeit läuft auf dem Handy; bei 0:00 wird der Test von selbst abgegeben.',
        'Wer die Seite verlässt (andere App, Bildschirm aus), wird pausiert. Die Lehrkraft gibt den Code ein, dann geht es weiter – die Zeit läuft dabei weiter.',
        'Den Code nicht an die Teilnehmenden weitergeben.',
      ],
    },
    {
      title: 'Nach dem Test',
      points: [
        'Die Teilnehmenden sehen kein Ergebnis.',
        'Alle Testhefte aus Papier einsammeln und ins Büro bringen; das Büro trägt sie ein.',
        'Das Büro sieht die Ergebnisse sofort.',
      ],
    },
    {
      title: 'Ergebnisse besprechen',
      points: ['Die Ergebnisse mit Studienleitung, Büro und Teilnehmenden besprechen.', 'Zurückgestufte Teilnehmende in die Übersichtstabelle zum Kursstart eintragen.'],
    },
  ];
}
