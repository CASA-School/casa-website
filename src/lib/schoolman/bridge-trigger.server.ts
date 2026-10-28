import 'server-only';

import { query } from '@/lib/admin/db';

/*
 * The bridge job is started when the copy of SchoolMan changed (2026-10-28, migrations 0099–0100), not
 * every five minutes: four of five scheduled starts found nothing to do, and every start costs the job's
 * minimum. A batch that changed the copy marks it as waiting (`pending_since`); the endpoint then asks
 * Azure to start `SCHOOLMAN_BRIDGE_JOB` (the job's resource id) with the app's managed identity, which
 * may start that one job and nothing else — when something waits, no run is going on, and the last start
 * was five minutes ago or more. Changes held back by those rules are started by the sync service's tick
 * after its next round (once a minute); the job's hourly start catches a start that never came.
 */

const ARM = 'https://management.azure.com';

/** Whether this deployment can start the bridge job at all. */
export function bridgeTriggerConfigured() {
  return Boolean(process.env.SCHOOLMAN_BRIDGE_JOB && process.env.IDENTITY_ENDPOINT && process.env.IDENTITY_HEADER);
}

async function armToken() {
  const url = new URL(process.env.IDENTITY_ENDPOINT!);
  url.searchParams.set('resource', `${ARM}/`);
  url.searchParams.set('api-version', '2019-08-01');
  const clientId = process.env.SCHOOLMAN_BRIDGE_IDENTITY_CLIENT_ID ?? process.env.FORM_MAIL_IDENTITY_CLIENT_ID;
  if (clientId) url.searchParams.set('client_id', clientId);
  const response = await fetch(url, { headers: { 'X-IDENTITY-HEADER': process.env.IDENTITY_HEADER! }, signal: AbortSignal.timeout(8000), cache: 'no-store' });
  if (!response.ok) throw new Error(`identity ${response.status}`);
  const token = (await response.json()) as { access_token?: string };
  if (!token.access_token) throw new Error('identity returned no token');
  return token.access_token;
}

/**
 * After a batch (`changed`: it changed the copy) or a tick: starts a bridge run if something waits and the
 * rules allow it. Never throws — a batch is kept whether or not the start went through.
 */
export async function requestBridgeRun(changed: boolean): Promise<'started' | 'waiting' | 'idle' | 'off' | 'failed'> {
  if (!bridgeTriggerConfigured()) return 'off';
  if (changed) await query(`UPDATE schoolman_bridge_state SET pending_since = coalesce(pending_since, timezone('utc', now()))`);
  const asked = await query<{ ok: boolean }>(
    `UPDATE schoolman_bridge_state SET requested_at = timezone('utc', now())
      WHERE pending_since IS NOT NULL
        AND (running_since IS NULL OR running_since < timezone('utc', now()) - interval '150 minutes')
        AND (requested_at IS NULL OR requested_at < timezone('utc', now()) - interval '5 minutes')
      RETURNING true AS ok`
  );
  if (!asked.length) return changed ? 'waiting' : 'idle';
  try {
    const response = await fetch(`${ARM}${process.env.SCHOOLMAN_BRIDGE_JOB}/start?api-version=2024-03-01`, {
      method: 'POST',
      headers: { authorization: `Bearer ${await armToken()}`, 'content-type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`start ${response.status}`);
    return 'started';
  } catch (error) {
    // The next tick asks again.
    await query(`UPDATE schoolman_bridge_state SET requested_at = NULL`);
    console.error('schoolman bridge: the job could not be started:', (error as Error).message);
    return 'failed';
  }
}
