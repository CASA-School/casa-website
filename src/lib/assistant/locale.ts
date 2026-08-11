import type { AssistantMessage, AssistantRuntimeLocale, AssistantUiLocale } from '@/lib/assistant/types';

const GERMAN_HINTS = [
  'ich',
  'hallo',
  'kurs',
  'prüfung',
  'unterkunft',
  'anmeldung',
  'deutsch',
  'stunden',
  'visa',
  'bitte',
  'danke',
  'möchte',
];

const ENGLISH_HINTS = [
  'hello',
  'course',
  'exam',
  'accommodation',
  'registration',
  'german',
  'lessons',
  'visa',
  'please',
  'thanks',
  'want',
];

function scoreHints(text: string, hints: string[]) {
  return hints.reduce((score, hint) => (text.includes(hint) ? score + 1 : score), 0);
}

export function normalizeAssistantLocale(locale?: string | null): AssistantRuntimeLocale | null {
  if (!locale) {
    return null;
  }

  const value = locale.trim().toLowerCase();
  if (value.startsWith('de')) {
    return 'de';
  }
  if (value.startsWith('en')) {
    return 'en';
  }

  return null;
}

export function detectLocaleFromMessages(messages: AssistantMessage[]): AssistantRuntimeLocale {
  const firstUserMessage = messages.find((message) => message.role === 'user')?.content.trim().toLowerCase();

  if (!firstUserMessage) {
    return 'de';
  }

  const germanScore = scoreHints(firstUserMessage, GERMAN_HINTS);
  const englishScore = scoreHints(firstUserMessage, ENGLISH_HINTS);

  if (germanScore === englishScore) {
    return 'de';
  }

  return germanScore > englishScore ? 'de' : 'en';
}

export function resolveAssistantLocale(
  explicitLocale: AssistantUiLocale | null | undefined,
  messages: AssistantMessage[]
): AssistantRuntimeLocale {
  const normalized = normalizeAssistantLocale(explicitLocale);
  if (normalized) {
    return normalized;
  }

  return detectLocaleFromMessages(messages);
}
