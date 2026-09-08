/**
 * Stands in for the `server-only` package under Vitest.
 *
 * See the alias in `vitest.config.ts` for why. Intentionally empty — importing
 * the real package from a `jsdom` environment throws, and there is no client
 * boundary in a unit test for it to protect.
 */
export {};
