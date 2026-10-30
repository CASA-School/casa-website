// Read-only: visits and leads since SINCE (Europe/Berlin), counts only. Run with
// ./scripts/ops/run-in-app.sh scripts/ops/queries/site-activity.js '2026-10-29 16:39'
// It runs through `node -e` and eval, which is CommonJS: no `import` there.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const S = `'${globalThis.SINCE || '2026-10-29 16:39'} Europe/Berlin'::timestamptz`;
const Q = {
  visits: `SELECT count(*) loads, count(*) FILTER (WHERE entry) visits FROM site_page_views WHERE viewed_at >= ${S}`,
  pages: `SELECT path, count(*) FILTER (WHERE entry) n FROM site_page_views WHERE viewed_at >= ${S} GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
  sources: `SELECT coalesce(referrer_host,'(direct)') h, count(*) n FROM site_page_views WHERE entry AND viewed_at >= ${S} GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
  campaigns: `SELECT campaign, count(*) n FROM site_page_views WHERE entry AND campaign IS NOT NULL AND viewed_at >= ${S} GROUP BY 1 ORDER BY 2 DESC`,
  leads: `SELECT (SELECT count(*) FROM registrations WHERE submitted_at >= ${S}) registrations, (SELECT count(*) FROM enquiries WHERE submitted_at >= ${S}) enquiries, (SELECT count(*) FROM appointments WHERE source='website' AND created_at >= ${S}) appointments, (SELECT count(*) FROM career_applications WHERE created_at >= ${S}) applications`,
};
(async () => {
  for (const [name, sql] of Object.entries(Q)) {
    try {
      const r = await p.query(sql);
      console.log(`## ${name}`);
      for (const row of r.rows) console.log(Object.values(row).join(' | '));
    } catch (e) {
      console.log(`## ${name} ERROR ${e.message}`);
    }
  }
  await p.end();
})();
