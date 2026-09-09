/**
 * Emits the `countries` rows for db/migrations/0007_people_and_flags.sql.
 *
 * The rows live in the MIGRATION, not a seed, because typed columns reference
 * them: a fresh database must accept a registration with `nationality_code`
 * after `db:migrate` alone. This script exists so the list has a provenance
 * and can be regenerated — ISO 3166-1 alpha-2 from `country-list` (the same
 * package the public form's CountryField draws its names from, so
 * `name_en` matches what the form submits byte for byte), German names from
 * the platform's CLDR data via Intl.DisplayNames.
 *
 *   node scripts/db/generate-countries-sql.mjs > /tmp/countries.sql
 */
import { getCodes, getName } from 'country-list';

const de = new Intl.DisplayNames(['de'], { type: 'region' });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const rows = getCodes()
  .sort()
  .map((code) => `  (${q(code)}, ${q(getName(code))}, ${q(de.of(code) ?? getName(code))})`);

process.stdout.write(
  `INSERT INTO countries (code, name_en, name_de) VALUES\n${rows.join(',\n')}\nON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de;\n`
);
