import 'server-only';

import { headers } from 'next/headers';

/**
 * Which origins the editor and its preview may talk to.
 *
 * In development both are this server: localhost:3000/admin/website frames
 * localhost:3000/… . In production the editor is admin.casa-bremen.de and the
 * page casa-bremen.de, the same split src/proxy.ts makes. `CMS_PUBLIC_ORIGIN`
 * and `CMS_EDITOR_ORIGIN` override the guess for any other pair (the preview
 * subdomain, a staging host).
 */

async function requestOrigin(): Promise<{ proto: string; host: string }> {
  const list = await headers();
  const host = (list.get('x-forwarded-host') ?? list.get('host') ?? 'localhost:3000').split(',')[0].trim();
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) || host.endsWith('.localhost') || host.includes('.localhost:');
  const proto = (list.get('x-forwarded-proto') ?? (local ? 'http' : 'https')).split(',')[0].trim();
  return { proto, host };
}

/** Where the editor loads the page from: '' for this same server. */
export async function publicSiteOrigin(): Promise<string> {
  if (process.env.CMS_PUBLIC_ORIGIN) return process.env.CMS_PUBLIC_ORIGIN.replace(/\/$/, '');
  const { proto, host } = await requestOrigin();
  return host.startsWith('admin.') ? `${proto}://${host.slice('admin.'.length)}` : '';
}

/** The origins a page in draft mode accepts editor messages from, space-separated. */
export async function editorOrigins(): Promise<string> {
  const { proto, host } = await requestOrigin();
  const bare = host.replace(/^www\./, '');
  const origins = [`${proto}://${host}`, `${proto}://admin.${bare}`, process.env.CMS_EDITOR_ORIGIN?.replace(/\/$/, '')];
  return [...new Set(origins.filter((origin): origin is string => Boolean(origin)))].join(' ');
}
