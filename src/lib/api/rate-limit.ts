import { NextResponse } from 'next/server';

/**
 * Per-client request budget for the public POST endpoints.
 *
 * IN MEMORY, PER REPLICA. The Container App runs at most two replicas, so a
 * client gets at most twice its budget, and a restart resets every counter.
 * That is enough to stop one script from filling the enquiry queue or taking
 * every appointment slot; a shared store is the upgrade if it ever is not.
 *
 * The client is the LAST address in X-Forwarded-For: the Container Apps ingress
 * appends the peer it saw, and anything to its left was written by the client.
 * Behind a second proxy (Front Door) the last hop would be that proxy, and this
 * needs revisiting.
 *
 * Budgets are generous on purpose. A class taking the placement test from
 * CASA's own Wi-Fi, or a group registering at an open day, shares one address.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Above this many tracked clients, expired windows are swept on the next call. */
const SWEEP_THRESHOLD = 5_000;

export type RateLimitOptions = {
  /** Requests allowed per window, per client. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

/**
 * Takes a request, or the headers of one: a server action has no Request, only
 * `headers()` from next/headers (the staff sign-in throttle reads it that way).
 * Told apart by `get`, not by `'headers' in`: Next's read-only headers object
 * carries a `headers` field of its own.
 */
export function clientAddress(source: Request | Pick<Headers, 'get'>): string {
  const headers = 'get' in source ? source : source.headers;
  const forwarded = headers.get('x-forwarded-for');

  if (forwarded) {
    const hops = forwarded
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean);

    if (hops.length > 0) {
      return hops[hops.length - 1];
    }
  }

  return headers.get('x-real-ip')?.trim() || 'unknown';
}

function requestLocale(request: Request): 'de' | 'en' {
  const referer = request.headers.get('referer');

  if (!referer) {
    return 'de';
  }

  try {
    const { pathname } = new URL(referer);
    return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'de';
  } catch {
    return 'de';
  }
}

function sweep(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) {
      windows.delete(key);
    }
  }
}

/**
 * Counts this request against `bucket` and returns a 429 once the client is
 * over budget, or `null` when the request may proceed.
 *
 * The 429 carries both response shapes in use: the `{ data, error }` envelope,
 * and the `status`/`message` pair the contact and registration clients read.
 */
export function rateLimit(
  request: Request,
  bucket: string,
  { limit, windowMs }: RateLimitOptions
): NextResponse | null {
  const now = Date.now();

  if (windows.size > SWEEP_THRESHOLD) {
    sweep(now);
  }

  const key = `${bucket}:${clientAddress(request)}`;
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  current.count += 1;

  if (current.count <= limit) {
    return null;
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  const message =
    requestLocale(request) === 'en'
      ? 'Too many requests. Please wait a few minutes and try again.'
      : 'Zu viele Anfragen. Bitte warten Sie einige Minuten und versuchen Sie es dann erneut.';

  return NextResponse.json(
    {
      data: null,
      error: { code: 'RATE_LIMITED', message },
      status: 'error',
      message,
    },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

/** Test hook: forget every counter. */
export function resetRateLimits() {
  windows.clear();
}
