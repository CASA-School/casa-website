export type Accreditation = {
  id: string;
  name: string;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  displayHeight?: number;
  href?: string;
  preface?: string;
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
    id: 'greenpeace-energy',
    name: 'Green Planet Energy',
    imageSrc: '/accreditations/greenpeace-energy.svg',
    imageWidth: 335,
    imageHeight: 233,
    displayHeight: 50,
    href: 'https://www.green-planet-energy.de/en',
    preface: 'Hosted with green energy from',
  },
];
