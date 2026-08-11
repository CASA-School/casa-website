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
    id: 'tandem-quality',
    name: 'TANDEM Quality',
    imageSrc: '/accreditations/tandem-quality.jpg',
    imageWidth: 69,
    imageHeight: 100,
    displayHeight: 50,
    href: 'https://www.tandem-schools.com/en/about-us/quality-management',
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
    id: 'azav',
    name: 'AZAV',
    imageSrc: '/accreditations/azav.svg',
    imageWidth: 300,
    imageHeight: 160,
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
