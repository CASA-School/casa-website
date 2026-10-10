-- Signing in by name or email, with a password or with Microsoft
-- (docs/ADMIN_WORKSPACE.md, §Signing in).
--
-- The office team signs in with their full name or their Outlook address. The
-- name a person types is matched on `username_key`: lower case, accents and
-- spacing folded, so „Natália Sostres", „natalia sostres" and
-- „Natalia  Sostres" are one person. src/lib/admin/sign-in-names.ts computes the
-- same key for what is typed; the backfill below folds the accents CASA's names
-- use, and every save from the Team screen recomputes it in the application.
--
-- A Microsoft sign-in is linked to an account by the directory's object id
-- (`microsoft_oid`), set the first time someone signs in with Microsoft under
-- the account's address. After that the address can change in either place
-- and the link holds.
--
-- `password_set_at` is null for an account created without a password: it can
-- sign in with Microsoft, and with a password once an owner has set one.

ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS username_key text;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS microsoft_oid text;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS microsoft_linked_at timestamptz;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS password_set_at timestamptz;

UPDATE staff_users SET username = regexp_replace(trim(name), '\s+', ' ', 'g') WHERE username IS NULL;

UPDATE staff_users
   SET username_key = replace(
         translate(lower(regexp_replace(trim(username), '\s+', ' ', 'g')),
                   'áàâãäåāçćčéèêëēęíìîïīñńóòôõöøōśšúùûüūýÿźżž',
                   'aaaaaaaccceeeeeeiiiiinnooooooossuuuuuyyzzz'),
         'ß', 'ss')
 WHERE username_key IS NULL;

UPDATE staff_users SET password_set_at = created_at WHERE password_set_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS staff_users_username_key
  ON staff_users (username_key) WHERE username_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS staff_users_microsoft_oid
  ON staff_users (microsoft_oid) WHERE microsoft_oid IS NOT NULL;
