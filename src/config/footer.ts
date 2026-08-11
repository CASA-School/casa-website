import { IconKey } from './icon-map';

export type FooterLink = {
  label: string;
  href: string;
  icon?: IconKey;
};

export type FooterSection = {
  title: string;
  items: FooterLink[];
};

export type FooterSocialLink = {
  label: string;
  href: string;
  platform: 'facebook' | 'instagram';
};

export type FooterLegalLink = {
  label: string;
  href: string;
};

export type FooterConfig = {
  columns: FooterSection[];
  contact: {
    phone: string;
    address: string;
    mapsHref: string;
    emails: FooterLink[];
    officeHours: string[];
  };
  socialLinks: FooterSocialLink[];
  legalLinks: FooterLegalLink[];
};

export const footerConfig: FooterConfig = {
  columns: [
    {
      title: 'School',
      items: [
        { label: 'Our School', href: '/about#mission' },
        { label: 'Non-profit status', href: '/ueber-uns/gemeinnuetzigkeit' },
        { label: 'Team', href: '/team' },
      ],
    },
    {
      title: 'Learn',
      items: [
        { label: 'Intensive courses', href: '/courses/intensive-german' },
        { label: 'Evening courses', href: '/courses/evening-course' },
        { label: 'Special courses', href: '/courses/special-courses' },
        { label: 'German for Medical', href: '/courses/german-for-medical' },
        { label: 'German for Groups', href: '/courses/german-for-groups' },
        { label: 'Bildungszeit', href: '/courses/bildungszeit' },
        { label: 'Firmenunterricht', href: '/courses/firmenunterricht' },
        { label: 'Levels & placement', href: '/placement-test' },
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'Registration', href: '/registration/course' },
        { label: 'Exam dates & registration', href: '/exams' },
        { label: 'Accommodation request', href: '/accommodation' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Contact', href: '/contact' },
      ],
    },
  ],
  contact: {
    phone: '+49 421 460 414 3-0',
    address: 'Am Dobben 14-16, 28203 Bremen, Germany',
    mapsHref: 'https://goo.gl/maps/sqJEsWgSezYa7JM5A',
    emails: [
      { label: 'info@casa-bremen.de', href: 'mailto:info@casa-bremen.de' },
    ],
    officeHours: [
      'Monday - Thursday: 08:30 - 19:00',
      'Friday: 08:30 - 13:00',
    ],
  },
  socialLinks: [
    { label: 'Facebook', href: 'https://de-de.facebook.com/pages/Sprachschule-CASA/136717096341699', platform: 'facebook' },
    { label: 'Instagram', href: 'https://www.instagram.com/casa_sprachschule/?hl=en', platform: 'instagram' },
  ],
  legalLinks: [
    { label: 'Imprint', href: '/imprint' },
    { label: 'Non-profit status', href: '/ueber-uns/gemeinnuetzigkeit' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms & Conditions', href: '/terms' },
  ],
};
