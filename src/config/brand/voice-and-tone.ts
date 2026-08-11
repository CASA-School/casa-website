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
    description: 'Frame steps around learner outcomes, confidence, and real-life progress.',
  },
] as const;

export const toneByContext = {
  hero: 'Inspirational, grounded in real student progress and community.',
  forms: 'Clear, reassuring, and explicit about next steps.',
  support: 'Empathetic and action-oriented with fast fallback paths.',
  legal: 'Precise and transparent without overexplaining.',
} as const;
