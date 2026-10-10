/**
 * The pages the website editor lists, grouped as the site's own menu groups them.
 *
 * `path` is the German address, which is what staff see in the address bar.
 * Every page's text is connected. The legal texts are listed but locked: they
 * change with a lawyer, not in the editor.
 */

export type EditorPage = { name: string; path: string; locked?: boolean };
export type EditorPageGroup = { group: string; pages: EditorPage[] };

export const EDITOR_PAGES: readonly EditorPageGroup[] = [
  { group: 'Home', pages: [{ name: 'Startseite', path: '/' }] },
  {
    group: 'Courses',
    pages: [
      { name: 'Sprachkurse', path: '/sprachkurse' },
      { name: 'Intensivkurse', path: '/sprachkurse/deutsch-intensiv' },
      { name: 'Abendkurse', path: '/sprachkurse/deutsch-am-abend' },
      { name: 'Spezialkurse', path: '/sprachkurse/deutsch-spezialkurse' },
      { name: 'Deutsch für Pflege und Medizin', path: '/sprachkurse/deutsch-fuer-mediziner' },
      { name: 'Bildungszeit', path: '/sprachkurse/bildungszeit-deutsch' },
      { name: 'Firmenunterricht', path: '/sprachkurse/firmenunterricht' },
      { name: 'Deutsch für Gruppen', path: '/sprachkurse/deutsch-fuer-gruppen' },
    ],
  },
  {
    group: 'Exams',
    pages: [
      { name: 'Prüfungszentrum', path: '/pruefungszentrum' },
      { name: 'telc Deutsch B2', path: '/pruefungszentrum/telc-deutsch-b2' },
      { name: 'telc Deutsch C1 Hochschule', path: '/pruefungszentrum/telc-deutsch-c1-hochschule' },
    ],
  },
  {
    group: 'Accommodation',
    pages: [
      { name: 'Unterkunft', path: '/unterkunft' },
      { name: 'Die CASA-WG', path: '/unterkunft/die-casa-wg' },
      { name: 'Wohnen in einer Gastfamilie', path: '/unterkunft/wohnen-in-einer-gastfamilie' },
      { name: 'Gastfamilie werden', path: '/unterkunft/gastfamilie-werden' },
    ],
  },
  {
    group: 'About CASA',
    pages: [
      { name: 'Leitbild', path: '/ueber-uns/casa-leitbild' },
      { name: 'Team', path: '/ueber-uns/casa-team' },
      { name: 'Gemeinnützigkeit', path: '/ueber-uns/gemeinnuetzigkeit' },
      { name: 'Kooperationspartner', path: '/ueber-uns/kooperationspartner' },
      { name: 'Karriere', path: '/karriere' },
    ],
  },
  {
    group: 'Service',
    pages: [
      { name: 'Kontakt', path: '/kontakt' },
      { name: 'FAQ', path: '/faq' },
      { name: 'Aktuelles', path: '/aktuelles' },
      { name: 'Kostenrechner', path: '/kostenrechner' },
      { name: 'Einstufungstest', path: '/anmeldung/einstufungstest' },
      { name: 'Anmeldeformular', path: '/anmeldung/anmeldeformular' },
    ],
  },
  {
    group: 'Guides',
    pages: [
      { name: 'Warum Deutschland', path: '/ratgeber/warum-deutschland' },
      { name: 'Studieren in Deutschland', path: '/ratgeber/studieren-in-deutschland' },
      { name: 'Leben in Deutschland', path: '/ratgeber/leben-in-deutschland' },
    ],
  },
  {
    group: 'Legal texts',
    pages: [
      { name: 'AGB', path: '/agb', locked: true },
      { name: 'Datenschutz', path: '/datenschutz', locked: true },
      { name: 'Impressum', path: '/impressum', locked: true },
    ],
  },
];

export const DEFAULT_EDITOR_PATH = '/sprachkurse/deutsch-intensiv';
