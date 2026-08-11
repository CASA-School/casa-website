import type { ContentLocale, SocialProofItem } from '@/lib/content/types';

export const socialProofByLocale: Record<ContentLocale, SocialProofItem[]> = {
  en: [
    {
      id: 'google-en-1',
      locale: 'en',
      quote:
        'Teachers really care. I gained confidence to speak German outside class within a few weeks.',
      personDisplay: 'Former intensive student',
      country: 'Brazil',
      sourcePlatform: 'google_reviews',
      sourceUrl: 'https://maps.google.com/?q=CASA+Internationale+Sprachschule+Bremen',
      verificationStatus: 'verified',
    },
    {
      id: 'instagram-en-1',
      locale: 'en',
      quote:
        'My favorite part was the community feeling. Classmates became friends and Bremen felt like home.',
      personDisplay: 'CASA community post',
      country: 'Spain',
      sourcePlatform: 'instagram',
      sourceUrl: 'https://www.instagram.com/casa_sprachschule/',
      verificationStatus: 'verified',
    },
    {
      id: 'google-en-2',
      locale: 'en',
      quote:
        'Excellent preparation for telc C1 Hochschule. Structured classes and practical feedback every week.',
      personDisplay: 'Exam candidate',
      country: 'Turkey',
      sourcePlatform: 'google_reviews',
      sourceUrl: 'https://maps.google.com/?q=CASA+Internationale+Sprachschule+Bremen',
      verificationStatus: 'verified',
    },
    {
      id: 'website-en-1',
      locale: 'en',
      quote:
        'The team helped me choose the right pace. I improved without feeling overwhelmed.',
      personDisplay: 'Evening course learner',
      country: 'Ukraine',
      sourcePlatform: 'website',
      sourceUrl: 'https://www.casa-bremen.de',
      verificationStatus: 'verified',
    },
    {
      id: 'google-en-3',
      locale: 'en',
      quote:
        'Housing support made my arrival smooth. I could focus on class from day one.',
      personDisplay: 'Accommodation participant',
      country: 'Japan',
      sourcePlatform: 'google_reviews',
      sourceUrl: 'https://maps.google.com/?q=CASA+Internationale+Sprachschule+Bremen',
      verificationStatus: 'verified',
    },
    {
      id: 'instagram-en-2',
      locale: 'en',
      quote:
        'The weekend activities and tandem sessions made learning feel alive and social.',
      personDisplay: 'Community program participant',
      country: 'Mexico',
      sourcePlatform: 'instagram',
      sourceUrl: 'https://www.instagram.com/casa_sprachschule/',
      verificationStatus: 'verified',
    },
  ],
  de: [
    {
      id: 'google-de-1',
      locale: 'de',
      quote:
        'Die Lehrkräfte sind engagiert und persönlich. Ich konnte nach kurzer Zeit sicherer sprechen.',
      personDisplay: 'Ehemalige Intensivkurs-Teilnehmerin',
      country: 'Brasilien',
      sourcePlatform: 'google_reviews',
      sourceUrl: 'https://maps.google.com/?q=CASA+Internationale+Sprachschule+Bremen',
      verificationStatus: 'verified',
    },
    {
      id: 'instagram-de-1',
      locale: 'de',
      quote:
        'Die CASA-Atmosphäre war offen und herzlich. Ich habe hier nicht nur Deutsch gelernt, sondern Menschen getroffen.',
      personDisplay: 'CASA Community Post',
      country: 'Italien',
      sourcePlatform: 'instagram',
      sourceUrl: 'https://www.instagram.com/casa_sprachschule/',
      verificationStatus: 'verified',
    },
    {
      id: 'google-de-2',
      locale: 'de',
      quote:
        'Sehr gute Vorbereitung auf die telc C1 Hochschule Prüfung mit klarer Struktur und hilfreichem Feedback.',
      personDisplay: 'Prüfungsteilnehmer',
      country: 'Türkei',
      sourcePlatform: 'google_reviews',
      sourceUrl: 'https://maps.google.com/?q=CASA+Internationale+Sprachschule+Bremen',
      verificationStatus: 'verified',
    },
    {
      id: 'website-de-1',
      locale: 'de',
      quote:
        'Das Team hat mein Lerntempo gut abgestimmt, ich hatte klare Fortschritte ohne Druck.',
      personDisplay: 'Abendkurs-Teilnehmerin',
      country: 'Ukraine',
      sourcePlatform: 'website',
      sourceUrl: 'https://www.casa-bremen.de',
      verificationStatus: 'verified',
    },
    {
      id: 'google-de-3',
      locale: 'de',
      quote:
        'Die Unterkunftsbegleitung war sehr hilfreich. So konnte ich mich sofort auf den Kurs konzentrieren.',
      personDisplay: 'Teilnehmer Unterkunft',
      country: 'Japan',
      sourcePlatform: 'google_reviews',
      sourceUrl: 'https://maps.google.com/?q=CASA+Internationale+Sprachschule+Bremen',
      verificationStatus: 'verified',
    },
    {
      id: 'instagram-de-2',
      locale: 'de',
      quote:
        'Wochenendaktivitäten und Tandem haben das Lernen lebendig und persönlich gemacht.',
      personDisplay: 'Community-Programm',
      country: 'Mexiko',
      sourcePlatform: 'instagram',
      sourceUrl: 'https://www.instagram.com/casa_sprachschule/',
      verificationStatus: 'verified',
    },
  ],
};
