import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DatabaseUnavailable } from '@/components/admin/database-unavailable';
import { Button, Field, Input } from '@/components/admin/ui';
import { Logo } from '@/components/ui/logo';
import { getStaffUser, pruneExpiredSessions, signIn, writeSessionCookie } from '@/lib/admin/auth';
import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in · CASA Workspace',
  robots: { index: false, follow: false },
};

/**
 * The sign-in screen.
 *
 * A plain form posting to a server action: no client bundle, no fetch, no
 * optimistic state. It is also the one screen in the workspace that an
 * unauthenticated request can reach, which is why it does as little as
 * possible.
 *
 * The error is deliberately one message for every failure — unknown address,
 * wrong password, deactivated account (see `signIn`). Telling someone which of
 * the three it was turns this page into a way to find out who works at CASA.
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

  const params = await searchParams;
  const failed = params.error === '1';

  async function attemptSignIn(formData: FormData) {
    'use server';

    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    if (email.trim().length === 0 || password.length === 0) {
      redirect('/admin/sign-in?error=1');
    }

    const requestHeaders = await headers();
    const result = await signIn(email, password, requestHeaders.get('user-agent'));

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
            Workspace
          </span>
        </div>

        <div className="max-w-md">
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.06] tracking-[-0.02em]">
            The desk behind the school.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ws-on-panel-muted">
            Enquiries, course and exam registrations, placement recommendations
            and applications — in one queue, with a status and an owner, instead
            of four inboxes and a spreadsheet.
          </p>
        </div>

        <p className="text-xs leading-relaxed text-ws-on-panel-muted">
          CASA — Internationale Sprachschule Bremen gemeinnützige GmbH.
          <br />
          Staff access only. Every change made here is recorded against your
          name.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-ws-canvas px-6 py-12 lg:px-14">
        <div className="w-full max-w-sm">
          <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight">
            Sign in
          </h2>
          <p className="mt-2 text-sm text-[var(--casa-text-subtle)]">
            Use the address CASA issued you.
          </p>

          <form action={attemptSignIn} className="mt-7 space-y-4">
            {failed ? (
              <p
                role="alert"
                className="rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-3.5 py-2.5 text-sm text-[var(--casa-danger-text)]"
              >
                That email and password do not match an active account.
              </p>
            ) : null}

            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                autoFocus
                placeholder="you@casa-bremen.de"
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>

            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-xs leading-relaxed text-[var(--casa-text-subtle)]">
            Forgotten your password? There is no self-service reset yet — ask an
            owner to set a new one for you from the Team screen.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--casa-accent-text)] transition-colors hover:text-[var(--casa-accent-text-hover)]"
          >
            Back to casa-bremen.de
          </Link>
        </div>
      </div>
    </div>
  );
}
