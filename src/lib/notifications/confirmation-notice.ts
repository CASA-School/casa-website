/**
 * The line a form shows once its confirmation email went to the sender.
 * Client-safe on purpose: the forms are client components and must not import
 * the server mail code. Shown only when the server says the confirmation
 * reached the sender, never in test mode, when it went to the test inbox.
 */
export function confirmationNotice(locale: 'de' | 'en') {
  return locale === 'de'
    ? 'Eine Eingangsbestätigung ist per E-Mail zu Ihnen unterwegs.'
    : 'An acknowledgement is on its way to your inbox.';
}
