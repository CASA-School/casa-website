import { notFound } from 'next/navigation';

/**
 * Every `/admin/...` path no workspace route claims lands here, so it 404s in
 * the workspace tree rather than in the public site's `[locale]/[...rest]`,
 * which would otherwise take `admin` for a language and answer with the site's
 * head. Inside `(workspace)`, so the layout's auth gate runs first: signed out,
 * an unknown screen redirects to sign-in exactly as a real one does.
 *
 * Static and dynamic routes always match before a catch-all, so it shadows no
 * screen, the sign-in page or the CV download.
 */
export default function UnknownScreen(): never {
  notFound();
}
