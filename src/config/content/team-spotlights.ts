import type { ContentLocale, TeamSpotlight } from '@/lib/content/types';

const teamPhotoLibrary = {
  anna: {
    src: '/media/casa/team/team-anna-keller-portrait.jpg',
    altEn: 'Temporary portrait-style image for Anna Keller',
    altDe: 'Temporäres Portraitbild für Anna Keller',
  },
  david: {
    src: '/media/casa/team/team-david-stein-portrait.jpg',
    altEn: 'Temporary portrait-style image for David Stein',
    altDe: 'Temporäres Portraitbild für David Stein',
  },
  melanie: {
    src: '/media/casa/team/team-melanie-hoffmann-portrait.jpg',
    altEn: 'Temporary portrait-style image for Melanie Hoffmann',
    altDe: 'Temporäres Portraitbild für Melanie Hoffmann',
  },
  kareem: {
    src: '/media/casa/team/team-kareem-yilmaz-portrait.jpg',
    altEn: 'Temporary portrait-style image for Kareem Yilmaz',
    altDe: 'Temporäres Portraitbild für Kareem Yilmaz',
  },
  sofia: {
    src: '/media/casa/team/team-sofia-martin-portrait.jpg',
    altEn: 'Temporary portrait-style image for Sofia Martin',
    altDe: 'Temporäres Portraitbild für Sofia Martin',
  },
  lucas: {
    src: '/media/casa/team/team-lucas-brandt-portrait.jpg',
    altEn: 'Temporary portrait-style image for Lucas Brandt',
    altDe: 'Temporäres Portraitbild für Lucas Brandt',
  },
};

export const teamSpotlightsByLocale: Record<ContentLocale, TeamSpotlight[]> = {
  en: [
    {
      id: 'anna-keller',
      locale: 'en',
      name: 'Anna Keller',
      title: 'Senior German Teacher',
      role: 'Teachers',
      focus: 'Speaking confidence and fluency progression from A2 to C1',
      highlight: 'Known for practical speaking drills and calm, motivating feedback.',
      bio: 'Anna has supported international learners for over a decade and specializes in helping students move from classroom German to real daily confidence in Bremen.',
      photo: {
        src: teamPhotoLibrary.anna.src,
        alt: teamPhotoLibrary.anna.altEn,
      },
      socials: [
        { platform: 'linkedin', href: 'https://www.linkedin.com', label: 'Anna on LinkedIn' },
        { platform: 'instagram', href: 'https://www.instagram.com', label: 'Anna on Instagram' },
        { platform: 'email', href: 'mailto:anna@casa-bremen.de', label: 'Email Anna' },
      ],
    },
    {
      id: 'david-stein',
      locale: 'en',
      name: 'David Stein',
      title: 'Academic Coordinator',
      role: 'Coordination',
      focus: 'Course pathways, placement alignment, and progress planning',
      highlight: 'Builds clear level progression plans across intensive and evening tracks.',
      bio: 'David ensures learners enter the right level and keeps course pathways aligned with personal goals, exams, and long-term academic outcomes.',
      photo: {
        src: teamPhotoLibrary.david.src,
        alt: teamPhotoLibrary.david.altEn,
      },
      socials: [
        { platform: 'linkedin', href: 'https://www.linkedin.com', label: 'David on LinkedIn' },
        { platform: 'email', href: 'mailto:david@casa-bremen.de', label: 'Email David' },
      ],
    },
    {
      id: 'melanie-hoffmann',
      locale: 'en',
      name: 'Melanie Hoffmann',
      title: 'Student Services Lead',
      role: 'Office',
      focus: 'Onboarding, registrations, and daily student support',
      highlight: 'Helps students navigate paperwork and practical steps smoothly.',
      bio: 'Melanie works closely with learners before and after arrival to reduce uncertainty and keep enrollment, schedules, and support requests clearly organized.',
      photo: {
        src: teamPhotoLibrary.melanie.src,
        alt: teamPhotoLibrary.melanie.altEn,
      },
      socials: [
        { platform: 'instagram', href: 'https://www.instagram.com', label: 'Melanie on Instagram' },
        { platform: 'email', href: 'mailto:melanie@casa-bremen.de', label: 'Email Melanie' },
      ],
    },
    {
      id: 'kareem-yilmaz',
      locale: 'en',
      name: 'Kareem Yilmaz',
      title: 'Exam Office Manager',
      role: 'Coordination',
      focus: 'telc B2 and C1 Hochschule sessions, deadlines, and candidate operations',
      highlight: 'Coordinates exam logistics with high reliability and clarity.',
      bio: 'Kareem oversees exam administration and candidate communication so every session runs with predictable standards and transparent next steps.',
      photo: {
        src: teamPhotoLibrary.kareem.src,
        alt: teamPhotoLibrary.kareem.altEn,
      },
      socials: [
        { platform: 'linkedin', href: 'https://www.linkedin.com', label: 'Kareem on LinkedIn' },
        { platform: 'email', href: 'mailto:kareem@casa-bremen.de', label: 'Email Kareem' },
      ],
    },
    {
      id: 'sofia-martin',
      locale: 'en',
      name: 'Sofia Martin',
      title: 'Community Programs Coordinator',
      role: 'Office',
      focus: 'Cultural activities, tandem formats, and weekend excursions',
      highlight: 'Designs programs where language learning meets social belonging.',
      bio: 'Sofia leads activities that help learners practice language in social contexts while building confidence and friendships across cultures.',
      photo: {
        src: teamPhotoLibrary.sofia.src,
        alt: teamPhotoLibrary.sofia.altEn,
      },
      socials: [
        { platform: 'instagram', href: 'https://www.instagram.com', label: 'Sofia on Instagram' },
        { platform: 'email', href: 'mailto:sofia@casa-bremen.de', label: 'Email Sofia' },
      ],
    },
    {
      id: 'lucas-brandt',
      locale: 'en',
      name: 'Lucas Brandt',
      title: 'Accommodation Coordinator',
      role: 'Office',
      focus: 'Shared flats, host family matching, and arrival support',
      highlight: 'Bridges housing setup with student wellbeing and course readiness.',
      bio: 'Lucas supports housing requests and move-in coordination so students can settle quickly and focus on learning from day one.',
      photo: {
        src: teamPhotoLibrary.lucas.src,
        alt: teamPhotoLibrary.lucas.altEn,
      },
      socials: [
        { platform: 'linkedin', href: 'https://www.linkedin.com', label: 'Lucas on LinkedIn' },
        { platform: 'email', href: 'mailto:lucas@casa-bremen.de', label: 'Email Lucas' },
      ],
    },
  ],
  de: [
    {
      id: 'anna-keller',
      locale: 'de',
      name: 'Anna Keller',
      title: 'Senior Deutschlehrerin',
      role: 'Teachers',
      focus: 'Sprechsicherheit und Flüssigkeit von A2 bis C1',
      highlight: 'Bekannt für praxisnahe Sprechübungen und klares Feedback.',
      bio: 'Anna begleitet internationale Lernende seit vielen Jahren und hilft dabei, Unterrichtsdeutsch in alltagstaugliche Sicherheit zu verwandeln.',
      photo: {
        src: teamPhotoLibrary.anna.src,
        alt: teamPhotoLibrary.anna.altDe,
      },
      socials: [
        { platform: 'linkedin', href: 'https://www.linkedin.com', label: 'Anna auf LinkedIn' },
        { platform: 'instagram', href: 'https://www.instagram.com', label: 'Anna auf Instagram' },
        { platform: 'email', href: 'mailto:anna@casa-bremen.de', label: 'Anna schreiben' },
      ],
    },
    {
      id: 'david-stein',
      locale: 'de',
      name: 'David Stein',
      title: 'Akademische Koordination',
      role: 'Coordination',
      focus: 'Kurspfade, Einstufung und Fortschrittsplanung',
      highlight: 'Plant klare Lernwege zwischen Intensiv- und Abendkursen.',
      bio: 'David stellt sicher, dass Lernende passend einsteigen und ihren Weg Richtung Prüfung, Studium oder Beruf transparent planen können.',
      photo: {
        src: teamPhotoLibrary.david.src,
        alt: teamPhotoLibrary.david.altDe,
      },
      socials: [
        { platform: 'linkedin', href: 'https://www.linkedin.com', label: 'David auf LinkedIn' },
        { platform: 'email', href: 'mailto:david@casa-bremen.de', label: 'David schreiben' },
      ],
    },
    {
      id: 'melanie-hoffmann',
      locale: 'de',
      name: 'Melanie Hoffmann',
      title: 'Leitung Student Services',
      role: 'Office',
      focus: 'Onboarding, Anmeldung und Begleitung im Alltag',
      highlight: 'Sorgt für klare Prozesse und schnelle Rückmeldungen.',
      bio: 'Melanie begleitet Lernende vor und nach der Anreise, damit Einschreibung, Kursstart und Organisation in Bremen reibungslos funktionieren.',
      photo: {
        src: teamPhotoLibrary.melanie.src,
        alt: teamPhotoLibrary.melanie.altDe,
      },
      socials: [
        { platform: 'instagram', href: 'https://www.instagram.com', label: 'Melanie auf Instagram' },
        { platform: 'email', href: 'mailto:melanie@casa-bremen.de', label: 'Melanie schreiben' },
      ],
    },
    {
      id: 'kareem-yilmaz',
      locale: 'de',
      name: 'Kareem Yilmaz',
      title: 'Prüfungskoordination',
      role: 'Coordination',
      focus: 'telc B2 und C1 Hochschule Termine, Fristen und Kommunikation',
      highlight: 'Führt Prüfungsabläufe mit hoher Verlässlichkeit.',
      bio: 'Kareem steuert die gesamte Prüfungsorganisation und sorgt für transparente Kommunikation mit Kandidatinnen und Kandidaten.',
      photo: {
        src: teamPhotoLibrary.kareem.src,
        alt: teamPhotoLibrary.kareem.altDe,
      },
      socials: [
        { platform: 'linkedin', href: 'https://www.linkedin.com', label: 'Kareem auf LinkedIn' },
        { platform: 'email', href: 'mailto:kareem@casa-bremen.de', label: 'Kareem schreiben' },
      ],
    },
    {
      id: 'sofia-martin',
      locale: 'de',
      name: 'Sofia Martin',
      title: 'Community-Programme',
      role: 'Office',
      focus: 'Kulturelle Angebote, Tandem und Wochenendprogramme',
      highlight: 'Schafft Begegnungsräume für Sprache und Zugehörigkeit.',
      bio: 'Sofia organisiert Aktivitäten, in denen Lernende Deutsch außerhalb des Klassenzimmers anwenden und neue soziale Netze aufbauen.',
      photo: {
        src: teamPhotoLibrary.sofia.src,
        alt: teamPhotoLibrary.sofia.altDe,
      },
      socials: [
        { platform: 'instagram', href: 'https://www.instagram.com', label: 'Sofia auf Instagram' },
        { platform: 'email', href: 'mailto:sofia@casa-bremen.de', label: 'Sofia schreiben' },
      ],
    },
    {
      id: 'lucas-brandt',
      locale: 'de',
      name: 'Lucas Brandt',
      title: 'Unterkunftskoordinator',
      role: 'Office',
      focus: 'WG-/Gastfamilien-Matching und Anreisebegleitung',
      highlight: 'Verbindet Wohnorganisation mit einem guten Lernstart.',
      bio: 'Lucas begleitet Unterkunftsanfragen und Check-in-Abläufe, damit Lernende schnell ankommen und sich auf ihren Kurs konzentrieren können.',
      photo: {
        src: teamPhotoLibrary.lucas.src,
        alt: teamPhotoLibrary.lucas.altDe,
      },
      socials: [
        { platform: 'linkedin', href: 'https://www.linkedin.com', label: 'Lucas auf LinkedIn' },
        { platform: 'email', href: 'mailto:lucas@casa-bremen.de', label: 'Lucas schreiben' },
      ],
    },
  ],
};
