import 'server-only';

import { query } from '@/lib/admin/db';

/*
 * The bridge job is started when the copy of SchoolMan changed (2026-10-28, migration 0099), not every five
 * minutes: four of five scheduled starts found nothing to do, and every start costs the job's minimum.
 * The endpoint asks Azure to start `SCHOOLMAN_BRIDGE_JOB` (the job's resource id) with the app's managed
 * identity, which may start that one job and nothing else. No run is asked for while one is going on or
 * one was asked for in the last three minutes: a run that finds the copy moved on while it ran goes round
 * again before it ends (bridge-mirror.mjs), and the job's hourly start catches a start that never came.
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
 * After a batch that changed the copy: starts a bridge run unless one is going on or was just asked
 * for. Never throws — a batch is kept whether or not the start went through.
 */
export async function requestBridgeRun(): Promise<'started' | 'running' | 'off' | 'failed'> {
  if (!bridgeTriggerConfigured()) return 'off';
  const asked = await query<{ ok: boolean }>(
    `UPDATE schoolman_bridge_state SET requested_at = timezone('utc', now())
      WHERE (running_since IS NULL OR running_since < timezone('utc', now()) - interval '150 minutes')
        AND (requested_at IS NULL OR requested_at < timezone('utc', now()) - interval '3 minutes')
      RETURNING true AS ok`
  );
  if (!asked.length) return 'running';
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
    // The next batch asks again.
    await query(`UPDATE schoolman_bridge_state SET requested_at = NULL`);
    console.error('schoolman bridge: the job could not be started:', (error as Error).message);
    return 'failed';
  }
}
