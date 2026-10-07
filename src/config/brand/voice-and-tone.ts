export const voicePrinciples = [
  {
    title: 'Warm and specific',
    description: 'Use direct, concrete language that reduces uncertainty and feels welcoming.',
  },
  {
    title: 'Professional and calm',
    description: 'Show operational clarity without sounding bureaucratic or cold.',
  },
  {
    title: 'People before process',
    description: 'Start by listening. Describe help with real situations: learning, settling in, meeting people and planning what comes next.',
  },
  {
    title: 'Belonging through diversity',
    description: 'Welcome people from every background as participants in the community. Avoid implying that belonging depends on fluency, nationality or a particular career path.',
  },
  {
    title: 'Natural in each language',
    description: 'Write German the way casa-bremen.de does: warm, plain, complete sentences, with "wir" speaking for CASA. Address learners with du (lowercase: du, dich, dir, dein); keep Sie for group organisers and teachers booking a class trip, host families, companies and the legal texts. Write English in natural British English. Preserve meaning and verified facts, not sentence structure. Prefer Beratung and Gemeinschaft to Support and Community in German prose.',
  },
  {
    title: 'Plain British English',
    description: 'Write English the way a friendly colleague at our front desk would say it: warm, plain, complete sentences, with "we" speaking for CASA and "you" for the reader. It says what the German says, and reads as if it was written in English. Use British spelling (practise as a verb, programme, enrol, centre, organise, specialise, licence as a noun, colour). Keep headings short and plain, in sentence case. Avoid marketing clichés (journey, unlock, seamless, world-class, immerse yourself, elevate), Americanisms, dash asides, colon reveals and "not X but Y". Give each thing one name on every page: Intensive courses, Evening courses, Special courses, German for nursing and medicine, In-company teaching, Classes for groups. Bildungszeit keeps its German name and is explained once where it is introduced, as Bremen’s paid leave for further training; telc Deutsch B2, telc Deutsch C1 Hochschule, Netzwerk neu and Kontext keep theirs.',
  },
  {
    title: 'Care without overpromising',
    description: 'Describe advice and support specifically. Do not promise admission, employment, a visa, accommodation availability, exam results or event frequency without confirmation. Keep verified student quotations intact.',
  },
] as const;

export const toneByContext = {
  hero: 'Inspirational, grounded in real student progress and community.',
  forms: 'Clear, reassuring, and explicit about next steps.',
  support: 'Empathetic and action-oriented with fast fallback paths.',
  legal: 'Precise and transparent without overexplaining.',
} as const;
