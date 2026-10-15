/**
 * „Antworten" on an inbox record: a `mailto:` — the workspace sends no mail
 * (CLAUDE.md, known open items) — opened with the subject, and a greeting and
 * sign-off in the language the person wrote in, signed by the colleague. CASA
 * says „du" (docs/VOICE_AND_TONE.md). Pure, so it is tested without a browser.
 */
export function replyHref({
  email,
  subject,
  firstName,
  locale,
  signer,
}: {
  email: string;
  /** In the person's language already: "Re: …", „Deine Anmeldung: …". */
  subject: string;
  firstName: string;
  locale: string;
  signer: string;
}): string {
  const body =
    locale === 'de'
      ? `Hallo ${firstName},\n\n\n\nViele Grüße\n${signer}\nCASA Bremen`
      : `Hello ${firstName},\n\n\n\nBest regards\n${signer}\nCASA Bremen`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** A subject in the person's language: German when they wrote in German, English otherwise. */
export const inTheirLanguage = (locale: string, de: string, en: string) => (locale === 'de' ? de : en);
