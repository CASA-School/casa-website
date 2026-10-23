/** A subject in the person's language: German when they wrote in German, English otherwise. */
export const inTheirLanguage = (locale: string, de: string, en: string) => (locale === 'de' ? de : en);
