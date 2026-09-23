-- 0016 — failed staff sign-ins, for throttling.
--
-- admin.casa-bremen.de is on the internet, and until now the sign-in form
-- accepted any number of guesses, each one a 64 MiB scrypt on a replica that
-- also serves the public site. `signIn` (src/lib/admin/auth.ts) now writes a
-- row here and then counts the recent rows BEFORE it verifies a password, per
-- address typed and per client address, and refuses with the ordinary sign-in
-- error once either is over its limit. Written first and counted after, so
-- attempts sent in parallel cannot all read the same old count. The limits
-- are in auth.ts and docs/ADMIN_WORKSPACE.md §Sign-in throttling.
--
-- ONE ROW PER FAILURE, NOT A COUNTER. A counter column is a stored accumulator
-- (docs/FILEMAKER_LESSONS.md): it drifts, and it cannot answer "how many in
-- the last fifteen minutes". Rows are counted over a window instead.
--
-- NEVER THE PASSWORD. What was typed as the password is not stored in any form;
-- the email is stored as typed, normalised, whether or not an account has it.
--
-- Short-lived by design. A successful sign-in deletes that email's rows, and
-- also every row older than a day (`pruneExpiredSessions`), so this is a
-- throttle, not a log. A refused attempt deletes the row it wrote, so however
-- many arrive at once, an address typed or a client keeps at most its limit
-- of rows per window.

CREATE TABLE IF NOT EXISTS staff_sign_in_failures (
  id bigserial PRIMARY KEY,
  -- lower(btrim(...)) of what was typed, so `Name@CASA-Bremen.de ` and
  -- `name@casa-bremen.de` share one budget.
  email text NOT NULL CONSTRAINT staff_sign_in_failures_email_check CHECK (email = lower(btrim(email))),
  -- The last X-Forwarded-For hop, as the ingress saw the client
  -- (clientAddress in src/lib/api/rate-limit.ts).
  client_address text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_sign_in_failures_email_idx
  ON staff_sign_in_failures (email, attempted_at);
CREATE INDEX IF NOT EXISTS staff_sign_in_failures_address_idx
  ON staff_sign_in_failures (client_address, attempted_at);

COMMENT ON TABLE staff_sign_in_failures IS
  'Failed staff sign-ins for throttling; no password, deleted on success and after a day.';
