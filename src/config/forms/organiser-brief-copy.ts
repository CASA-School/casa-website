import type { ContentLocale } from '@/lib/content/types';
import { ORGANISER_CHOICES, type OrganiserBriefField } from '@/lib/validation/contact';

export type OrganiserChoiceField = keyof typeof ORGANISER_CHOICES;

export type OrganiserCopy = {
  legendGroup: string;
  legendCompany: string;
  intro: string;
  announcementGroup: string;
  announcementCompany: string;
  selectPlaceholder: string;
  labels: Record<OrganiserBriefField, string>;
  placeholders: Partial<Record<OrganiserBriefField, string>>;
  options: {
    [Field in OrganiserChoiceField]: Record<(typeof ORGANISER_CHOICES)[Field][number], string>;
  };
};

/**
 * Copy for the organiser brief: the contact form's labels and options, and the
 * notification email's, so staff read the words the sender chose. Its own
 * module because the form is a client component and the mail is server code.
 */
export const organiserCopy: Record<ContentLocale, OrganiserCopy> = {
  en: {
    legendGroup: 'Group enquiry details',
    legendCompany: 'Company training details',
    intro:
      'Every field below is optional — send what you already know and we will fill in the rest by email. This is a non-binding enquiry, not a quotation.',
    announcementGroup: 'Group enquiry details added below. All of these fields are optional.',
    announcementCompany: 'Company training details added below. All of these fields are optional.',
    selectPlaceholder: 'Optional — select if known',
    labels: {
      organisationName: 'Organisation or company',
      groupSize: 'Number of participants',
      participantLevels: 'Current German level(s)',
      preferredDates: 'Preferred dates',
      durationWeeks: 'Length in weeks',
      weeklyLessons: 'Lessons per week (UE, 45 minutes each)',
      languageFocus: 'Language focus',
      invoicingParty: 'Who receives the invoice?',
      ageBand: 'Age group',
      accommodation: 'Accommodation',
      meals: 'Meals',
      transport: 'Public transport pass',
      cultureProgramme: 'Culture programme',
      deliveryMode: 'Where the course should take place',
      schedulePreference: 'Preferred time of day',
    },
    placeholders: {
      organisationName: 'Gymnasium Beispiel / Example GmbH',
      participantLevels: 'Mixed A2-B1, or not tested yet',
      preferredDates: 'Second half of July',
    },
    options: {
      languageFocus: {
        general: 'General German',
        'exam-preparation': 'Exam preparation',
        business: 'Workplace and business German',
        academic: 'Academic or university preparation',
        technical: 'Sector-specific vocabulary',
        undecided: 'Not decided yet',
      },
      invoicingParty: {
        organisation: 'Our organisation',
        'public-funder': 'A public body or funding programme',
        participants: 'Each participant pays individually',
        undecided: 'Not decided yet',
      },
      ageBand: {
        'under-14': 'Under 14',
        '14-17': '14-17',
        '18-25': '18-25',
        '26-plus': '26 and older',
        mixed: 'Mixed ages',
      },
      accommodation: {
        'not-needed': 'Not needed',
        double: 'Host family, double room',
        single: 'Host family, single room',
        undecided: 'Not decided yet',
      },
      meals: {
        'not-needed': 'Not needed',
        'half-board': 'Half board with the host family',
        'half-board-plus-canteen': 'Half board plus lunch at the canteen',
        undecided: 'Not decided yet',
      },
      transport: {
        'not-needed': 'Not needed',
        weekly: 'Weekly pass',
        monthly: 'Monthly pass',
        undecided: 'Not decided yet',
      },
      cultureProgramme: {
        'not-needed': 'Not needed',
        small: 'Compact',
        medium: 'Standard',
        large: 'Full programme',
        undecided: 'Not decided yet',
      },
      deliveryMode: {
        'on-site': 'At our own premises',
        'at-casa': 'At CASA in Bremen',
        online: 'Online',
        undecided: 'Not decided yet',
      },
      schedulePreference: {
        mornings: 'Mornings',
        midday: 'Midday',
        afternoons: 'Afternoons',
        evenings: 'Evenings',
        undecided: 'Not decided yet',
      },
    },
  },
  de: {
    legendGroup: 'Angaben zur Gruppenanfrage',
    legendCompany: 'Angaben zum Firmenunterricht',
    intro:
      'Alle Felder in diesem Bereich sind optional. Schick uns, was du schon weißt. Den Rest klären wir per E-Mail. Deine Anfrage ist unverbindlich und noch kein Angebot.',
    announcementGroup: 'Angaben zur Gruppenanfrage wurden ergänzt. Alle Felder sind optional.',
    announcementCompany: 'Angaben zum Firmenunterricht wurden ergänzt. Alle Felder sind optional.',
    selectPlaceholder: 'Optional, falls bekannt',
    labels: {
      organisationName: 'Organisation oder Unternehmen',
      groupSize: 'Anzahl der Teilnehmenden',
      participantLevels: 'Aktuelles Deutschniveau',
      preferredDates: 'Wunschzeitraum',
      durationWeeks: 'Dauer in Wochen',
      weeklyLessons: 'Unterrichtseinheiten pro Woche (UE à 45 Minuten)',
      languageFocus: 'Sprachlicher Schwerpunkt',
      invoicingParty: 'Wer erhält die Rechnung?',
      ageBand: 'Altersgruppe',
      accommodation: 'Unterkunft',
      meals: 'Verpflegung',
      transport: 'ÖPNV-Ticket',
      cultureProgramme: 'Kulturprogramm',
      deliveryMode: 'Wo der Unterricht stattfinden soll',
      schedulePreference: 'Bevorzugte Tageszeit',
    },
    placeholders: {
      organisationName: 'Gymnasium Beispiel / Beispiel GmbH',
      participantLevels: 'Gemischt A2–B1 oder noch nicht getestet',
      preferredDates: 'Zweite Julihälfte',
    },
    options: {
      languageFocus: {
        general: 'Allgemeines Deutsch',
        'exam-preparation': 'Prüfungsvorbereitung',
        business: 'Berufs- und Arbeitsplatzdeutsch',
        academic: 'Studienvorbereitung',
        technical: 'Fachwortschatz',
        undecided: 'Noch offen',
      },
      invoicingParty: {
        organisation: 'Unsere Organisation',
        'public-funder': 'Öffentlicher Träger oder Förderprogramm',
        participants: 'Jede Person zahlt selbst',
        undecided: 'Noch offen',
      },
      ageBand: {
        'under-14': 'Unter 14',
        '14-17': '14–17',
        '18-25': '18–25',
        '26-plus': '26 und älter',
        mixed: 'Gemischte Altersgruppen',
      },
      accommodation: {
        'not-needed': 'Nicht nötig',
        double: 'Gastfamilie, Doppelzimmer',
        single: 'Gastfamilie, Einzelzimmer',
        undecided: 'Noch offen',
      },
      meals: {
        'not-needed': 'Nicht nötig',
        'half-board': 'Halbpension in der Gastfamilie',
        'half-board-plus-canteen': 'Halbpension plus Mittagessen in der Kantine',
        undecided: 'Noch offen',
      },
      transport: {
        'not-needed': 'Nicht nötig',
        weekly: 'Wochenticket',
        monthly: 'Monatsticket',
        undecided: 'Noch offen',
      },
      cultureProgramme: {
        'not-needed': 'Nicht nötig',
        small: 'Kompakt',
        medium: 'Standard',
        large: 'Volles Programm',
        undecided: 'Noch offen',
      },
      deliveryMode: {
        'on-site': 'In unseren eigenen Räumen',
        'at-casa': 'Bei CASA in Bremen',
        online: 'Online',
        undecided: 'Noch offen',
      },
      schedulePreference: {
        mornings: 'Vormittags',
        midday: 'Mittags',
        afternoons: 'Nachmittags',
        evenings: 'Abends',
        undecided: 'Noch offen',
      },
    },
  },
};
