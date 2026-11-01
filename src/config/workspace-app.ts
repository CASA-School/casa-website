import manifest from '../../public/admin/manifest.json';

/** One staff-app identity, separate from the public site's browser-mode manifest. */
export const workspaceApp = {
  name: manifest.name,
  manifest: '/admin/manifest.json',
  startUrl: manifest.start_url,
  versionUrl: '/admin/app-version',
  themeColor: manifest.theme_color,
  backgroundColor: manifest.background_color,
} as const;
