export const isDatabaseConfigured = () =>
  typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim().length > 0;

export const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;

  if (!url || url.trim().length === 0) {
    throw new Error('DATABASE_URL is missing');
  }

  return url;
};
