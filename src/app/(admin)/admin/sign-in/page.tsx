import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DatabaseUnavailable } from '@/components/admin/database-unavailable';
import { LangSwitch } from '@/components/admin/lang-switch';
import { Button, Field, Input } from '@/components/admin/ui';
import { Logo } from '@/components/ui/logo';
import { getStaffUser, pruneExpiredSessions, signIn, writeSessionCookie } from '@/lib/admin/auth';
import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { devLoginAllowedHere } from '@/lib/admin/dev-login';
import { getI18n } from '@/lib/admin/i18n.server';
import { microsoftEnabled } from '@/lib/admin/microsoft';
import { clientAddress } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t('Anmelden · CASA Arbeitsbereich', 'Sign in · CASA Workspace'),
    robots: { index: false, follow: false },
  };
}

/**
 * The sign-in screen.
 *
 * A plain form posting to a server action: no client bundle, no fetch, no
 * optimistic state. It is also the one screen in the workspace that an
 * unauthenticated request can reach, which is why it does as little as
 * possible.
 *
 * The error is deliberately one message for every failure — unknown address,
 * wrong password, deactivated account, too many failed attempts (see
 * `signIn`). Telling someone which it was turns this page into a way to find
 * out who works at CASA.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (!isWorkspaceDatabaseConfigured()) {
    return <DatabaseUnavailable />;
  }

  // Already signed in: nothing on this page applies.
  if (await getStaffUser()) {
    redirect('/admin');
  }

  // On one's own laptop, with ADMIN_DEV_LOGIN set, no password (src/lib/admin/dev-login.ts).
  if (devLoginAllowedHere(await headers())) {
    redirect('/admin/dev-login');
  }

  const params = await searchParams;
  const { t } = await getI18n();
  const failed = params.error === '1';
  const microsoft = microsoftEnabled();
  // Microsoft has already said who someone is, so these may be specific.
  const microsoftError =
    params.error === 'microsoft-unknown'
      ? t(
          'Dein Microsoft-Konto ist mit keinem Konto im Arbeitsbereich verknüpft. Bitte eine Inhaberin oder einen Inhaber, deine Outlook-Adresse unter Team einzutragen.',
          'Your Microsoft account is not linked to a workspace account. Ask an owner to add your Outlook address on the Team screen.'
        )
      : params.error === 'microsoft-cancelled'
        ? t('Die Microsoft-Anmeldung wurde abgebrochen.', 'The Microsoft sign-in was cancelled.')
        : params.error === 'microsoft-off'
          ? t('Die Anmeldung mit Microsoft ist noch nicht eingeschaltet.', 'Signing in with Microsoft is not switched on yet.')
          : params.error === 'microsoft'
            ? t('Die Microsoft-Anmeldung hat nicht geklappt. Versuch es noch einmal.', 'The Microsoft sign-in did not go through. Try again.')
            : null;

  async function attemptSignIn(formData: FormData) {
    'use server';

    const identifier = String(formData.get('identifier') ?? '');
    const password = String(formData.get('password') ?? '');

    if (identifier.trim().length === 0 || password.length === 0) {
      redirect('/admin/sign-in?error=1');
    }

    const requestHeaders = await headers();
    const result = await signIn(
      identifier,
      password,
      requestHeaders.get('user-agent'),
      clientAddress(requestHeaders)
    );

    if (!result) {
      redirect('/admin/sign-in?error=1');
    }

    await writeSessionCookie(result.token);
    // Cheap housekeeping on the one action that is already slow by design.
    await pruneExpiredSessions();

    redirect('/admin');
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/*
       * The ink panel is the same surface as the workspace sidebar, at full
       * height. Signing in should already look like the tool you are signing
       * into — a generic centred card on a white page is the moment a product
       * starts feeling like a template.
       */}
      <div className="casa-workspace-panel flex flex-col justify-between gap-10 bg-ws-panel px-8 py-10 text-ws-on-panel lg:w-[46%] lg:px-14 lg:py-14">
        {/*
          The full lock-up here, subtitle included: this panel is wide enough to
          set "Internationale Sprachschule" at a readable size, and the sign-in
          screen is the one place a person might arrive without already knowing
          which organisation's tool they are opening.

          h-14, not smaller. The subtitle occupies the bottom 93 of the
          lock-up's 325 viewBox units, so its cap height is roughly a fifth of
          whatever height is set here — below 56px it stops being legible and
          the reason for showing the full lock-up disappears with it.
        */}
        <div>
          <Logo className="h-14 w-auto" variant="white" />
          <span className="mt-3 block text-[0.58rem] font-semibold tracking-[0.24em] uppercase text-ws-on-panel-muted">
            {t('Arbeitsbereich', 'Workspace')}
          </span>
        </div>

        <div className="max-w-md">
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.06] tracking-[-0.02em]">
            {t('Das Büro hinter der Schule.', 'The desk behind the school.')}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ws-on-panel-muted">
            {t(
              'Anfragen, Kurs- und Prüfungsanmeldungen, Einstufungsempfehlungen und Bewerbungen — in einer Liste, mit Status und Zuständigkeit, statt in vier Postfächern und einer Tabelle.',
              'Enquiries, course and exam registrations, placement recommendations and applications — in one queue, with a status and an owner, instead of four inboxes and a spreadsheet.'
            )}
          </p>
        </div>

        <p className="text-xs leading-relaxed text-ws-on-panel-muted">
          CASA — Internationale Sprachschule Bremen gemeinnützige GmbH.
          <br />
          {t(
            'Nur für das Team. Jede Änderung hier wird unter deinem Namen festgehalten.',
            'Staff access only. Every change made here is recorded against your name.'
          )}
        </p>
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-ws-canvas px-6 py-12 lg:px-14">
        <div className="absolute top-5 right-6 lg:top-8 lg:right-10">
          <LangSwitch tone="page" />
        </div>
        <div className="w-full max-w-sm">
          <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight">
            {t('Anmelden', 'Sign in')}
          </h2>
          <p className="mt-2 text-sm text-[var(--casa-text-subtle)]">
            {t('Mit deinem vollen Namen oder deiner Outlook-Adresse.', 'With your full name or your Outlook address.')}
          </p>

          {microsoftError ? (
            <p
              role="alert"
              className="mt-6 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-3.5 py-2.5 text-sm text-[var(--casa-danger-text)]"
            >
              {microsoftError}
            </p>
          ) : null}

          {microsoft ? (
            <>
              <Link
                href="/admin/auth/microsoft"
                prefetch={false}
                className="mt-7 flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-ws-line-firm bg-white text-sm font-semibold text-[var(--casa-ink)] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-colors hover:border-[var(--casa-blue)]/45"
              >
                <svg viewBox="0 0 21 21" className="h-4 w-4" aria-hidden="true">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                {t('Mit Microsoft anmelden', 'Sign in with Microsoft')}
              </Link>
              <div className="mt-6 flex items-center gap-3 text-xs text-[var(--casa-text-subtle)]">
                <span className="h-px flex-1 bg-ws-line" />
                {t('oder mit deinem Passwort', 'or with your password')}
                <span className="h-px flex-1 bg-ws-line" />
              </div>
            </>
          ) : null}

          <form action={attemptSignIn} className={microsoft ? 'mt-5 space-y-4' : 'mt-7 space-y-4'}>
            {failed ? (
              <p
                role="alert"
                className="rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-3.5 py-2.5 text-sm text-[var(--casa-danger-text)]"
              >
                {t(
                  'Name oder E-Mail und Passwort passen zu keinem aktiven Konto.',
                  'That name or email and password do not match an active account.'
                )}
              </p>
            ) : null}

            <Field label={t('Name oder E-Mail', 'Name or email')} htmlFor="identifier">
              <Input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                autoCapitalize="words"
                spellCheck={false}
                required
                autoFocus
                placeholder={t('Vorname Nachname oder name@casa-bremen.de', 'Vorname Nachname or name@casa-bremen.de')}
              />
            </Field>

            <Field label={t('Passwort', 'Password')} htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>

            <Button type="submit" className="w-full">
              {t('Anmelden', 'Sign in')}
            </Button>
          </form>

          <p className="mt-6 text-xs leading-relaxed text-[var(--casa-text-subtle)]">
            {t(
              'Passwort vergessen? Selbst zurücksetzen geht noch nicht — bitte eine Inhaberin oder einen Inhaber, dir unter Team ein neues zu setzen.',
              'Forgotten your password? There is no self-service reset yet — ask an owner to set a new one for you from the Team screen.'
            )}
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--casa-accent-text)] transition-colors hover:text-[var(--casa-accent-text-hover)]"
          >
            {t('Zurück zu casa-bremen.de', 'Back to casa-bremen.de')}
          </Link>
        </div>
      </div>
    </div>
  );
}
