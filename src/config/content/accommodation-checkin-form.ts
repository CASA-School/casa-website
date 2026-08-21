import type { ContentLocale } from '@/lib/content/types';

/**
 * CASA's host-family check-in / check-out form, as structured data.
 *
 * SOURCE: `docs/assets/CASA-Check-In-Out-Formular.docx`, supplied by CASA on
 * 2026-08-21. The original is a German Word form, headed "CASA Unterkunft", that
 * a host family and a student fill in together at arrival and again at
 * departure. Its footer carries the accommodation inbox,
 * `accommodation@casa-bremen.de`.
 *
 * WHY IT IS HERE AND NOT A FEATURE. This is an operational document between a
 * host and a student, not marketing copy, and CLAUDE.md hard rule 1 keeps
 * dashboard surfaces out of this repository. So this file is a faithful record
 * of the form's structure, ready for the dashboard to render when that work
 * starts, and the public accommodation pages reference only the fact that the
 * handover is jointly documented — which is what a prospective student or host
 * actually needs to know, and what makes the €580 deposit rule legible.
 *
 * DO NOT publish the form's own fields on the public site. House rules,
 * liability and signature blocks are between the two parties.
 *
 * Two things about the source, recorded rather than silently corrected — see
 * docs/ACCOMMODATION_CHECK_IN_OUT_FORM.md:
 *
 *  1. The internet-use paragraph in section 2 ENDS MID-SENTENCE in the original:
 *     "...die in Deutschland geltenden gesetzlichen Bestimmungen für
 *     kostenpflichtige" and then section 3 begins. It is reproduced here exactly
 *     as it stands, because finishing a liability sentence would be inventing
 *     legal wording.
 *  2. The footer's phone number differs from the one this site publishes.
 */

/** How the dashboard should render a field when it comes to build this. */
export type CheckInFieldKind =
  | 'text'
  | 'date'
  | 'dateRange'
  | 'count'
  /** Four-step condition scale, recorded separately at check-in and check-out. */
  | 'conditionInOut'
  /** Two-step working / not working, recorded at check-in and check-out. */
  | 'functionInOut'
  | 'checkboxGroup'
  | 'yesNo'
  | 'longText'
  | 'signature';

export type CheckInField = {
  id: string;
  /** German is the source of truth: the form CASA hands over is German. */
  label: { de: string; en: string };
  kind: CheckInFieldKind;
  /** For checkboxGroup and the condition scales. */
  options?: Array<{ de: string; en: string }>;
  /** Reproduced from the form, including where it is incomplete. */
  note?: { de: string; en: string };
};

export type CheckInSection = {
  number: number;
  title: { de: string; en: string };
  fields: CheckInField[];
};

const CONDITION_SCALE = [
  { de: 'sehr gut', en: 'very good' },
  { de: 'gut', en: 'good' },
  { de: 'Gebrauchsspuren', en: 'signs of use' },
  { de: 'beschädigt', en: 'damaged' },
];

/** The six room items the form rates on the condition scale, in its own order. */
const ROOM_ITEMS: Array<{ id: string; de: string; en: string }> = [
  { id: 'bed', de: 'Bett', en: 'Bed' },
  { id: 'mattress', de: 'Matratze', en: 'Mattress' },
  { id: 'desk', de: 'Schreibtisch', en: 'Desk' },
  { id: 'chair', de: 'Stuhl', en: 'Chair' },
  { id: 'wardrobe', de: 'Kleiderschrank', en: 'Wardrobe' },
  { id: 'shelf', de: 'Regal/Nachttisch', en: 'Shelf / bedside table' },
];

export const accommodationCheckInForm = {
  title: {
    de: 'Check-in / Check-out Formular',
    en: 'Check-in / check-out form',
  },
  context: {
    de: 'Unterbringung eines Schülers / einer Schülerin in einer Gastfamilie',
    en: 'Placement of a student with a host family',
  },
  /** The form's own explanation of why it exists. Reproduced, not paraphrased. */
  purpose: {
    de: 'Das vorliegende Formular ist von der Gastfamilie sowie dem/der Sprachschüler*in vollständig und wahrheitsgemäß auszufüllen. Ziel dieses Formulars ist es, die gemeinsame Dokumentation des Zustands der Gastunterkunft sowie der allgemeinen Ordnung und Sauberkeit der zur Verfügung gestellten Räumlichkeiten. Mit der Ausfüllung bestätigen beide Parteien den Zustand der Unterkunft zum Zeitpunkt der An- und Abreise. Das Formular dient der Transparenz, der gegenseitigen Absicherung sowie der Vorbeugung möglicher Missverständnisse während und nach dem Aufenthalt.',
    en: 'The host family and the student complete this form together, fully and truthfully. Its purpose is a joint record of the condition of the accommodation and of the general order and cleanliness of the rooms provided. By completing it, both parties confirm the condition of the accommodation at arrival and at departure. The form exists for transparency, for mutual protection, and to prevent misunderstandings during and after the stay.',
  },
  contactEmail: 'accommodation@casa-bremen.de',
  sections: [
    {
      number: 1,
      title: { de: 'Angaben zur Unterbringung', en: 'Placement details' },
      fields: [
        { id: 'studentName', label: { de: 'Name Schüler/in', en: 'Student name' }, kind: 'text' },
        { id: 'dateOfBirth', label: { de: 'Geburtsdatum', en: 'Date of birth' }, kind: 'date' },
        { id: 'hostFamilyName', label: { de: 'Name Gastfamilie', en: 'Host family name' }, kind: 'text' },
        { id: 'address', label: { de: 'Adresse der Unterkunft', en: 'Address of the accommodation' }, kind: 'text' },
        { id: 'roomLabel', label: { de: 'Zimmerbezeichnung', en: 'Room designation' }, kind: 'text' },
        { id: 'stayPeriod', label: { de: 'Zeitraum der Unterbringung', en: 'Period of stay' }, kind: 'dateRange' },
        { id: 'checkInDate', label: { de: 'Check-in am', en: 'Check-in on' }, kind: 'date' },
        { id: 'checkOutDate', label: { de: 'Check-out am', en: 'Check-out on' }, kind: 'date' },
      ],
    },
    {
      number: 2,
      title: { de: 'Hausregeln (Kurzfassung)', en: 'House rules (summary)' },
      fields: [
        { id: 'smoking', label: { de: 'Rauchen', en: 'Smoking' }, kind: 'text' },
        { id: 'visitors', label: { de: 'Besuch', en: 'Visitors' }, kind: 'text' },
        { id: 'cleaning', label: { de: 'Reinigung', en: 'Cleaning' }, kind: 'text' },
        { id: 'other', label: { de: 'Andere', en: 'Other' }, kind: 'longText' },
        {
          id: 'internetUse',
          label: { de: 'Internetnutzung', en: 'Internet use' },
          kind: 'longText',
          /*
           * VERBATIM, INCLUDING THE BREAK. The original sentence stops after
           * "für kostenpflichtige" and the form moves on to section 3. Do not
           * complete it here — ask CASA for the intended wording.
           */
          note: {
            de: 'Der Internetanschluss ist nur im Rahmen des rechtlich Zulässigen zu nutzen und illegale Downloads sind strengstens verboten. Aus gegebenem Anlass wird ausdrücklich darauf hingewiesen, dass WLAN kostenfrei zur Verfügung steht, jedoch bei Verstößen (kostenpflichtige Downloads etc.) die in Deutschland geltenden gesetzlichen Bestimmungen für kostenpflichtige [Satz im Originalformular unvollständig — Wortlaut bei CASA erfragen]',
            en: 'The internet connection may be used only within what is legally permitted, and illegal downloads are strictly forbidden. WLAN is provided free of charge, but in the event of violations (paid downloads and similar) the statutory provisions applicable in Germany for paid [sentence incomplete in the original form — confirm the intended wording with CASA]',
          },
        },
      ],
    },
    {
      number: 3,
      title: { de: 'Inventar & Zustand des Zimmers', en: 'Room inventory and condition' },
      fields: [
        ...ROOM_ITEMS.map((item) => ({
          id: item.id,
          label: { de: item.de, en: item.en },
          kind: 'conditionInOut' as const,
          options: CONDITION_SCALE,
        })),
        {
          id: 'lamp',
          label: { de: 'Lampe', en: 'Lamp' },
          kind: 'functionInOut',
          options: [
            { de: 'funktionsfähig', en: 'working' },
            { de: 'nicht funktionsfähig', en: 'not working' },
          ],
        },
        { id: 'roomOther', label: { de: 'Sonstiges', en: 'Other' }, kind: 'text' },
        {
          id: 'bedLinen',
          label: { de: 'Bettwäsche (Anzahl und Zustand)', en: 'Bed linen (count and condition)' },
          kind: 'count',
          options: [
            { de: 'gut', en: 'good' },
            { de: 'beschädigt', en: 'damaged' },
          ],
        },
      ],
    },
    {
      number: 4,
      title: { de: 'Zustand der Wände', en: 'Condition of the walls' },
      fields: [
        {
          id: 'wallCondition',
          label: { de: 'Zustand', en: 'Condition' },
          kind: 'checkboxGroup',
          options: [
            { de: 'keine Schäden', en: 'no damage' },
            { de: 'Gebrauchsspuren', en: 'signs of use' },
            { de: 'Flecken', en: 'marks' },
            { de: 'Bohrlöcher', en: 'drill holes' },
            { de: 'Risse', en: 'cracks' },
            { de: 'sonstige Schäden', en: 'other damage' },
          ],
        },
        {
          id: 'preExistingDamage',
          label: { de: 'Bereits vorhandene Schäden bei Check-in', en: 'Damage already present at check-in' },
          kind: 'longText',
        },
        {
          id: 'newDamage',
          label: { de: 'Neue Schäden bei Check-out', en: 'New damage at check-out' },
          kind: 'longText',
        },
      ],
    },
    {
      number: 5,
      title: { de: 'Schlüssel & Ausstattung', en: 'Keys and facilities' },
      fields: [
        { id: 'keysHandedOver', label: { de: 'Übergebene Schlüssel (Anzahl)', en: 'Keys handed over (count)' }, kind: 'count' },
        {
          id: 'keysReturned',
          label: { de: 'Rückgabe der Schlüssel', en: 'Return of keys' },
          kind: 'checkboxGroup',
          options: [
            { de: 'vollständig zurückgegeben', en: 'returned in full' },
            { de: 'nicht vollständig zurückgegeben', en: 'not returned in full' },
          ],
        },
        { id: 'wlanAccess', label: { de: 'WLAN-Zugang erhalten', en: 'WLAN access provided' }, kind: 'yesNo' },
        {
          id: 'sharedUse',
          label: { de: 'Mitbenutzung erlaubt', en: 'Shared use permitted' },
          kind: 'checkboxGroup',
          options: [
            { de: 'Küche', en: 'Kitchen' },
            { de: 'Bad', en: 'Bathroom' },
            { de: 'Waschmaschine', en: 'Washing machine' },
            { de: 'WLAN', en: 'WLAN' },
            { de: 'Sonstiges', en: 'Other' },
          ],
        },
        { id: 'photosTaken', label: { de: 'Fotos zur Dokumentation erstellt', en: 'Photos taken for the record' }, kind: 'yesNo' },
      ],
    },
    {
      number: 6,
      title: { de: 'Reinigung & Gesamteindruck bei Auszug', en: 'Cleaning and overall impression at departure' },
      fields: [
        {
          id: 'cleanliness',
          label: { de: 'Zustand bei Übergabe', en: 'Condition at handover' },
          kind: 'checkboxGroup',
          options: [
            { de: 'Zimmer sauber übergeben', en: 'room handed over clean' },
            { de: 'Reinigungsbedarf', en: 'cleaning required' },
            { de: 'starke Verschmutzung', en: 'heavily soiled' },
          ],
        },
        { id: 'cleaningRemarks', label: { de: 'Bemerkungen', en: 'Remarks' }, kind: 'longText' },
      ],
    },
    {
      number: 7,
      title: { de: 'Haftung & Vereinbarungen', en: 'Liability and agreements' },
      fields: [
        {
          id: 'liabilityInsurance',
          label: {
            de: 'Haftpflichtversicherung Schüler/in vorhanden',
            en: 'Student holds personal liability insurance',
          },
          kind: 'yesNo',
        },
        {
          id: 'damageAgreements',
          label: { de: 'Vereinbarungen bei Schäden', en: 'Agreements in case of damage' },
          kind: 'longText',
        },
      ],
    },
    {
      number: 8,
      title: { de: 'Unterschriften', en: 'Signatures' },
      fields: [
        {
          id: 'checkInSignatures',
          label: { de: 'Check-in: Ort, Datum und Unterschriften', en: 'Check-in: place, date and signatures' },
          kind: 'signature',
          note: {
            de: 'Mit ihrer Unterschrift bestätigen beide Parteien die Richtigkeit der Angaben. Unterschrift Gastfamilie und Unterschrift Schüler/in.',
            en: 'Both parties confirm the accuracy of the entries by signing. Host family signature and student signature.',
          },
        },
        {
          id: 'checkOutSignatures',
          label: { de: 'Check-out: Ort, Datum und Unterschriften', en: 'Check-out: place, date and signatures' },
          kind: 'signature',
        },
      ],
    },
  ] satisfies CheckInSection[],
} as const;

/**
 * The public-safe summary: what the handover records, without the form itself.
 *
 * This is the only part of the document that belongs on the marketing site. It
 * explains why the deposit rule is what it is — the room is documented jointly
 * at arrival and again at departure — without publishing house rules, liability
 * terms or signature blocks that are between the host and the student.
 */
export function checkInSummary(locale: ContentLocale) {
  return locale === 'de'
    ? [
        'Zustand von Zimmer, Möbeln und Wänden, gemeinsam festgehalten',
        'Anzahl der übergebenen Schlüssel und der Bettwäsche',
        'Was mitbenutzt werden darf: Küche, Bad, Waschmaschine, WLAN',
        'Fotos zur Dokumentation, wenn beide Seiten zustimmen',
      ]
    : [
        'The condition of the room, the furniture and the walls, recorded together',
        'How many keys and how much bed linen were handed over',
        'What is shared: kitchen, bathroom, washing machine, WLAN',
        'Photographs for the record, when both sides agree',
      ];
}
