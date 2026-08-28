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

/**
 * Optional fan-out for a finished placement attempt.
 *
 * This is the boundary between the website and the CASA dashboard workspace.
 * `CLAUDE.md` forbids reintroducing auth, roles, or dashboard surfaces here, so
 * the website persists the attempt and hands the recommendation off rather than
 * growing a staff review queue of its own. Unset by default: the attempt still
 * persists and the learner still gets their result, there is simply nothing
 * notified.
 */
export const getPlacementResultWebhookUrl = () => {
  const url = process.env.PLACEMENT_RESULT_WEBHOOK_URL;

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
