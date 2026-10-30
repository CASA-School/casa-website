# Go-live: casa-bremen.de to the new site

**Done on 2026-10-29.** Meike pressed the button at 16:27; casa-bremen.de answered from the new site at
16:39 (revision `0000103`, main `a85d6a74`). The record is at the end of this file.

The runbook for moving `casa-bremen.de` and `www.casa-bremen.de` from the old TYPO3 server to the
Container App `ca-casa-website`. Written 2026-10-29 from a read-only check of DNS and Azure; re-check
the values in „State" before you start, since a release or a DNS edit may have changed them.

Who does what: Rahman edits DNS in Plesk (Lands Concepts) and owns the go; Claude runs the `az`
commands and the checks. Nobody deploys while the switch is in progress.

## State (checked 2026-10-29)

**Azure.** `ca-casa-website` in `rg-casa-website-prod`, environment `cae-casa-prod`, healthy, one to
two replicas.

| Value | |
| --- | --- |
| Environment static IP (the apex's A record) | `20.79.72.159` |
| App FQDN (www's CNAME target) | `ca-casa-website.livelycliff-6187a034.germanywestcentral.azurecontainerapps.io` |
| Custom domain verification id (the `asuid` TXT value) | `40893E82A710B90F9750F2AA217DBD353E4D88D0A8512F7E5BA84BA4E5C06DCA` |
| Bound hostnames, managed certificates | `admin.casa-bremen.de`, `neu.casa-bremen.de` |
| Settings to remove at cutover | `CMS_PUBLIC_ORIGIN=https://neu.casa-bremen.de`, `CMS_EDITOR_ORIGIN=https://admin.casa-bremen.de` |

**DNS** (nameservers `ns3`/`ns4.lands-concepts.com`, managed in Plesk):

| Name | Today | Note |
| --- | --- | --- |
| `casa-bremen.de` | A `195.34.167.82`, TTL 21600 | the old TYPO3 server, which is also the Plesk mail host |
| `www` | CNAME `casa-bremen.de`, TTL 21600 | |
| `smtp`, `imap`, `ftp` | CNAME `casa-bremen.de` | **would follow the apex to Azure** |
| `mail`, `webmail`, `ipv4` | A `195.34.167.82` | unaffected |
| `admin`, `neu` | CNAME the app FQDN, `asuid.*` TXT set | already on the new site |
| `lernen` | CNAME the student app | unaffected |
| MX | `mx.spamexperts.com` (5, 10, 15) | unaffected |
| SPF (apex TXT) | `v=spf1 +a include:spf.protection.outlook.com -all` | **`+a` means „the apex's IP"** |
| DKIM | Microsoft 365 `selector1`/`selector2`, Plesk `default` | the Plesk server signs mail it sends |
| DMARC | `p=none` | |
| Search verification | two `google-site-verification` TXT, `MS=` TXT | keep |

**The new site** is ready for the apex: every host but `casa-bremen.de` and `www` answers
`X-Robots-Tag: noindex` (`next.config.ts`), canonical tags, `robots.txt` and the sitemap name
`https://casa-bremen.de`, `src/proxy.ts` sends `www` to the apex with a 308, the old site's URLs
redirect to their pages (`docs/LEGACY_REDIRECTS.md`), and form mail is live and was verified on
2026-10-29 (`docs/GROUP_APPOINTMENTS_AND_TEST_MAIL.md`).

## Two risks, both mail

1. **`smtp`, `imap` and `ftp` are CNAMEs of the apex.** Repointing the apex would send them to Azure,
   so mail programs and FileMaker's mail (mail@ through `smtp.casa-bremen.de`) would stop working.
2. **SPF authorises the apex's IP (`+a`), which today is the Plesk mail server.** After the switch it
   would authorise the Azure address instead, and mail the Plesk server sends (signed with the
   `default` DKIM key) would fail SPF under `-all`.

Both are fixed in step 1, before the website moves.

## Step 1: prepare (a day ahead; nobody sees a change)

In Plesk, DNS of casa-bremen.de:

1. **TTL 300** on the apex A record and on `www`, so the switch and a rollback take minutes, not six hours.
2. **`smtp`, `imap`, `ftp`**: CNAME `mail.casa-bremen.de` instead of `casa-bremen.de`.
3. **SPF**: `v=spf1 a:mail.casa-bremen.de include:spf.protection.outlook.com -all` instead of
   `+a`, so the mail server stays authorised by its own name.
4. **Verification TXT** for Azure: `asuid.casa-bremen.de` and `asuid.www.casa-bremen.de`, both with
   the verification id above.
5. Optional: remove the stray apex TXT record `"@"`.

Then check, after the TTLs have passed (`dig smtp.casa-bremen.de` gives `mail.casa-bremen.de`, the
SPF record shows `a:mail.casa-bremen.de`), and send one mail from FileMaker to confirm it arrives.

Also before the day:

6. **Back up the old site** in Plesk (Websites & Domains → Backup Manager → full backup with the
   databases) and download the file.
7. **Final content release** deployed (the course-dates work), and nothing else queued.
8. **Test records** left in the Azure database closed or deleted in the workspace.
9. **Legal**: the privacy policy is marked as awaiting specialist review (`docs/PRIVACY_POLICY.md`);
   decide whether go-live waits for it.

## Step 2: switch (a quiet hour, about 20 minutes)

1. Plesk: apex A → `20.79.72.159`; `www` → CNAME the app FQDN.
2. Azure (Claude), once `dig casa-bremen.de` shows the new address:
   ```bash
   az containerapp hostname add -n ca-casa-website -g rg-casa-website-prod --hostname casa-bremen.de
   az containerapp hostname bind -n ca-casa-website -g rg-casa-website-prod --hostname casa-bremen.de --environment /subscriptions/f8d745fc-c2dc-4ad9-a3a8-e9da556b69ab/resourceGroups/rg-casa-platform-prod/providers/Microsoft.App/managedEnvironments/cae-casa-prod --validation-method HTTP
   az containerapp hostname add -n ca-casa-website -g rg-casa-website-prod --hostname www.casa-bremen.de
   az containerapp hostname bind -n ca-casa-website -g rg-casa-website-prod --hostname www.casa-bremen.de --environment /subscriptions/f8d745fc-c2dc-4ad9-a3a8-e9da556b69ab/resourceGroups/rg-casa-platform-prod/providers/Microsoft.App/managedEnvironments/cae-casa-prod --validation-method CNAME
   az containerapp update -n ca-casa-website -g rg-casa-website-prod --remove-env-vars CMS_PUBLIC_ORIGIN CMS_EDITOR_ORIGIN
   ```
   Until the managed certificate is issued (a few minutes), https on the apex shows a certificate
   warning; that is the reason for the quiet hour.
3. `neu.casa-bremen.de` stays bound: the day-one test's printed QR posters open `neu.casa-bremen.de/test`.

## Step 3: check

- `https://casa-bremen.de` answers 200 with a valid certificate; `https://www.casa-bremen.de/kontakt`
  answers 308 to `https://casa-bremen.de/kontakt`.
- A handful of old URLs from `docs/LEGACY_REDIRECTS.md` land on their new pages.
- `admin.casa-bremen.de` and the website editor work (the editor now frames casa-bremen.de).
- One contact form, received at info@ (the message trace in the Exchange admin center shows it).
- Mail: a FileMaker mail arrives, webmail opens, a mail program still connects to `imap`/`smtp`.

## Step 4: afterwards

- Google Search Console (the domain is verified by TXT): submit `https://casa-bremen.de/sitemap.xml`,
  check coverage over the following days. Bing Webmaster Tools: import from Search Console.
  `docs/SEO_AND_GEO.md` has the rest (IndexNow, the Business Profile's website link).
- ~~`relaunch.casa-bremen.de` still points at the old server: remove it once nobody needs it.~~
  Done 2026-10-30: the DNS record is gone; the Plesk site itself stays until Rahman decides.
- The „neue Website" notice runs six to eight weeks, then `enabled: false` in `src/config/site-notice.ts`.
- Branch protection on `main`, requiring the quality workflow (CLAUDE.md, open items).
- Keep the old server and its backup until the new site has run a few weeks without a rollback.

## Record of 2026-10-29

- Step 1 by Codex in Plesk (smtp/imap/ftp → `mail.casa-bremen.de`, the SPF, `asuid` and `asuid.www`,
  TTL 300), verified on `ns3.lands-concepts.com`; the old site's backup started from Plesk.
- The switch: a button page (`output/golive/`, not in git) for Meike; her click wrote a signal file,
  Codex applied the staged A and www records in Plesk 6 seconds later, and the button's program ran
  the Azure commands. Two faults on the way, both in the program: `--environment` must be the
  environment's **full resource id** (it lives in `rg-casa-platform-prod`, not in the app's group;
  the name alone gives `ParentResourceNotFound`), and a new managed certificate stays „Pending" for
  a few minutes, during which `hostname bind` answers `CertificateProvisioningError`: retry until it
  binds. The apex certificate took about four minutes, www's about five.
- Checked after: public DNS, a DigiCert/GeoTrust certificate for casa-bremen.de until 2027-04-29,
  pages 200, `www` → 308 apex, http → 301 https, old tandem URLs → 308 to their pages, no `noindex`,
  canonical casa-bremen.de, `/admin` 404 on the apex, admin.casa-bremen.de and `neu…/test` working,
  MX and SPF unchanged.
- Propagation: Telekom's and the office's resolvers kept the old A record for up to a day (the old
  TTL). Meanwhile the old server's `.htaccess` sent casa-bremen.de to `neu.casa-bremen.de` (302, by
  Codex; the original file is `~/Downloads/htaccess`), and the website editor framed
  `neu.casa-bremen.de` again (`CMS_PUBLIC_ORIGIN`, with `CMS_EDITOR_ORIGIN=https://admin.casa-bremen.de`),
  because on a network still seeing the old server the framed page came from the wrong origin and the
  editor waited for it forever. **Once both resolvers answer `20.79.72.159`:** remove the `.htaccess`
  lines and both `CMS_*` variables (`az containerapp update … --remove-env-vars CMS_PUBLIC_ORIGIN CMS_EDITOR_ORIGIN`).
- **2026-10-30, both done.** The office resolver answered `20.79.72.159` at 08:08, and the `CMS_*`
  variables were removed at 08:13 (revision 0000112). In the afternoon, with every resolver (Google, Cloudflare,
  Telekom, Quad9, the office's) on the new address, the redirect block came out of
  `t3-web/htdocs/.htaccess` in Plesk. The file is again byte for byte the original (SHA-256 checked
  against `~/Downloads/htaccess`). The old server now answers casa-bremen.de with its own TYPO3 site,
  which only a stale cache would still reach. The same afternoon the `relaunch` A record left the zone
  (board unit H2).

## Rollback

Plesk: apex A back to `195.34.167.82`, `www` back to CNAME `casa-bremen.de`. With TTL 300 the old site
is back within minutes. (Since 2026-10-30 the old server no longer redirects to neu, so a rollback
shows the old TYPO3 site directly, as it did before the switch.) The Azure bindings can stay; the step-1 changes (smtp/imap/ftp, SPF) are
correct either way and stay too.
