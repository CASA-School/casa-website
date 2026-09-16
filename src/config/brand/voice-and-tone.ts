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
    description: 'Write German in the established Sie form and English in natural British English. Preserve meaning and verified facts, not sentence structure. Prefer Beratung and Gemeinschaft to Support and Community in German prose.',
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
