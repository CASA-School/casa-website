export const isDatabaseConfigured = () =>
  typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim().length > 0;

/**
 * Optional fan-out for group and company briefs. Unset by default: contact
 * submissions then fall back to CONTACT_WEBHOOK_URL, and to preview logging if
 * that is unset too, so fallback mode keeps working.
 */
export const getGroupInquiryWebhookUrl = () => {
  const url = process.env.GROUP_INQUIRY_WEBHOOK_URL;

  if (!url || url.trim().length === 0) {
    return null;
  }

  return url.trim();
};

export const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;

  if (!url || url.trim().length === 0) {
    throw new Error('DATABASE_URL is missing');
  }

  return url;
};
