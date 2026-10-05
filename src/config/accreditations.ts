export type Accreditation = {
  id: string;
  name: string;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  displayHeight?: number;
  href?: string;
};

export const accreditationLogos: Accreditation[] = [
  {
    id: 'tandem-international',
    name: 'TANDEM International',
    imageSrc: '/accreditations/tandem-international-bremen.png',
    imageWidth: 280,
    imageHeight: 141,
    displayHeight: 46,
    href: 'https://www.tandem-schools.com/en',
  },
  {
    // Took the TANDEM Quality seal's place (CASA, 2026-10-03). File: g.a.s.t.'s
    // own TestDaF logo from gast.de, downloaded 2026-10-03.
    id: 'testdaf',
    name: 'TestDaF',
    imageSrc: '/accreditations/testdaf.svg',
    imageWidth: 471,
    imageHeight: 118,
    displayHeight: 44,
    href: 'https://www.testdaf.de/',
  },
  {
    id: 'telc',
    name: 'telc Language Tests',
    imageSrc: '/accreditations/telc.svg',
    imageWidth: 438,
    imageHeight: 254,
    displayHeight: 44,
    href: 'https://www.telc.net/en',
  },
  {
    // CASA's certification mark from its certifier HZA, as the old
    // casa-bremen.de showed it (downloaded 2026-10-03). It replaced a badge we
    // had drawn ourselves. HZA publishes no logo of its own to link to.
    id: 'azav',
    name: 'Zertifiziert nach SGB III und AZAV durch HZA',
    imageSrc: '/accreditations/azav-hza.jpg',
    imageWidth: 1051,
    imageHeight: 476,
    displayHeight: 44,
  },
  {
    // Took Green Planet Energy's place (CASA, 2026-10-05). On the old site that
    // logo meant the WEB SERVER ran on its power, which stopped being true when
    // the site moved to Azure. CASA asked for Universität Bremen here, HERE
    // AHEAD's university; its logo is for university staff only (corporate
    // design portal, login), so it needs the university's approval first.
    // Until then the slot shows HERE AHEAD itself.
    id: 'here-ahead',
    name: 'HERE AHEAD',
    imageSrc: '/partners/here-ahead.svg',
    imageWidth: 105,
    imageHeight: 79,
    displayHeight: 50,
    href: 'https://www.aheadbremen.de/',
  },
];
