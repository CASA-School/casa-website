/**
 * What changed in SchoolMan since the last run (2026-10-26, migration 0088). An importer asks, per
 * record, whether its fingerprint — SchoolMan's data together with what it was matched to here — is
 * the same as last time, and passes over it if so; it saves the fingerprints in its own transaction, so
 * a step that fails remembers nothing. A record that depends on something here (its booking, its course)
 * puts that in the fingerprint, so it is written again the run that something arrives. Never a value a
 * step of the run itself changes (a sitting's hours, a count): it would make every record look changed.
 * Nor the order of rows a query returns without ORDER BY: a release re-applies the seeds, which moves
 * rows, and every learner had looked changed after one (2026-10-27) — `unordered` is for vocabularies.
 *
 * `BRIDGE_FULL=1` (or `--full`) writes every record, as every run did before. Without the table (a
 * database not yet migrated) every record is written and nothing is remembered.
 */
import { createHash } from 'node:crypto';

const fingerprint = (value) => createHash('sha256').update(JSON.stringify(value)).digest('base64url').slice(0, 22);
const BATCH = 5000;

/** A vocabulary's rows or a Map's entries, in an order that does not depend on how the database stores them. */
export const unordered = (rows) => [...rows].map((r) => JSON.stringify(r)).sort();

export async function changes(client, step) {
  const full = process.env.BRIDGE_FULL === '1' || process.argv.includes('--full');
  const kept = Boolean((await client.query(`SELECT to_regclass('bridge_fingerprints') AS t`)).rows[0].t);
  const known = new Map(
    kept && !full ? (await client.query(`SELECT record, fingerprint FROM bridge_fingerprints WHERE step = $1`, [step])).rows.map((r) => [r.record, r.fingerprint]) : []
  );
  const seen = new Map();
  let same = 0;
  return {
    /**
     * Whether this record is as it was last time; remembered either way. `before` is the value as an earlier
     * version of the importer fingerprinted it, accepted once so a change to the fingerprint itself does not
     * make every record look changed.
     */
    same(record, value, before) {
      const f = fingerprint(value);
      // A record SchoolMan holds twice is written each time, so the last one wins as in a full run.
      const twice = seen.has(String(record));
      seen.set(String(record), f);
      const was = known.get(String(record));
      const unchanged = !twice && (was === f || (before !== undefined && was === fingerprint(before)));
      if (unchanged) same++;
      return unchanged;
    },
    /** How many records were passed over, for the step's summary line. */
    get unchanged() {
      return same;
    },
    /** Saves this run's fingerprints, inside the importer's transaction. */
    async save() {
      if (!kept) return;
      const rows = [...seen].filter(([record, f]) => known.get(record) !== f);
      for (let i = 0; i < rows.length; i += BATCH) {
        const part = rows.slice(i, i + BATCH);
        await client.query(
          `INSERT INTO bridge_fingerprints (step, record, fingerprint) SELECT $1, * FROM unnest($2::text[], $3::text[])
           ON CONFLICT (step, record) DO UPDATE SET fingerprint = EXCLUDED.fingerprint`,
          [step, part.map((r) => r[0]), part.map((r) => r[1])]
        );
      }
    },
  };
}
