import Link from 'next/link';

import { OfferFrame } from '@/components/admin/offers/frame';
import ui from '@/components/admin/offers/offers.module.css';
import { dayRange, euros, ListBar, ListEmpty, ListGroup, Owner, RecordName } from '@/components/admin/list';
import { Card, Cell, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { capitalise, counted, relativeDays, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listOffers, offerCounts, OFFER_FILTERS, type OfferListFilter, type OfferListItem } from '@/lib/admin/offers/repo';

/**
 * Offers — what is being written, what is out, what came back. Open first,
 * grouped by what to do: a sent offer quiet for ten days or past its validity
 * to follow up, then the sent ones waiting, then the drafts. The group is the
 * status, so no row repeats it (docs/ADMIN_WORKSPACE.md §Lists).
 */

const filterLabels = (t: T): Record<OfferListFilter, string> => ({
  open: t('Offen', 'Open'),
  accepted: t('Angenommen', 'Accepted'),
  declined: t('Abgelehnt', 'Declined'),
  all: t('Alle', 'All'),
});

const stages = (t: T) =>
  [
    { key: 'follow', label: t('Nachfassen', 'Follow up'), has: (o: OfferListItem) => o.followUp !== null },
    { key: 'sent', label: t('Gesendet', 'Sent'), has: (o: OfferListItem) => o.status === 'sent' && !o.followUp },
    { key: 'draft', label: t('Entwürfe', 'Drafts'), has: (o: OfferListItem) => o.status === 'draft' },
    { key: 'accepted', label: t('Angenommen', 'Accepted'), has: (o: OfferListItem) => o.status === 'accepted' },
    { key: 'declined', label: t('Abgelehnt', 'Declined'), has: (o: OfferListItem) => o.status === 'declined' || o.status === 'withdrawn' },
  ] as const;

/** Who it is for, under the name: the school behind a group's name and its size, or a learner's course. */
function about(o: OfferListItem, t: T, lang: WsLang): string {
  if (o.kind === 'individual') return o.course?.label ?? '';
  return [
    o.groupName ? o.recipientName : null,
    o.participants ? counted(lang, o.participants, t('Teilnehmende', 'participant'), t('Teilnehmende', 'participants')) : t('Gruppe', 'Group'),
    o.escorts ? counted(lang, o.escorts, t('Begleitperson', 'escort'), t('Begleitpersonen', 'escorts')) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function when(o: OfferListItem, lang: WsLang): string {
  const from = o.arrival ?? o.course?.start;
  const to = o.departure ?? o.course?.end;
  return from && to ? dayRange(from, to, lang) : '';
}

/** The latest that happened to it, said as a sentence: sent when, expired, or last changed. */
function latest(o: OfferListItem, t: T, lang: WsLang) {
  if (o.followUp === 'expired') return <span className="font-semibold text-[#b91c1c]">{t('Abgelaufen', 'Expired')}</span>;
  if (o.sentAt) {
    const ago = relativeDays(o.sentAt, lang);
    const sent = t(`Gesendet ${ago}`, `Sent ${ago}`);
    return o.followUp === 'chase' ? <span className="font-semibold text-[#9a5b00]">{sent}</span> : sent;
  }
  return capitalise(relativeDays(o.updatedAt, lang));
}

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; ok?: string; error?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, requireModule('offers')]);
  const { t, lang } = await getI18n();
  const filter = (OFFER_FILTERS as readonly string[]).includes(params.filter ?? '') ? (params.filter as OfferListFilter) : 'open';
  const q = params.q?.slice(0, 80) ?? '';
  const [offers, counts] = await Promise.all([listOffers({ filter, q, lang }), offerCounts()]);
  const labels = filterLabels(t);
  const canWrite = canAccess(user, 'offers', 'edit');
  const href = (f: OfferListFilter) => `/admin/offers${f === 'open' ? '' : `?filter=${f}`}`;

  // Open and All read in groups by what to do; Accepted and Declined are one group already, named by their tab.
  const groups =
    filter === 'open' || filter === 'all'
      ? stages(t).map((stage) => ({ ...stage, rows: offers.filter(stage.has) })).filter((g) => g.rows.length)
      : [{ key: filter, label: '', rows: offers }];

  return (
    <OfferFrame
      back={{ href: '/admin', label: t('Arbeitsbereich', 'Workspace') }}
      title={t('Angebote', 'Offers')}
      right={
        canWrite ? (
          <Link href="/admin/offers/new" className={ui.primary}>
            {t('Neues Angebot', 'New offer')}
          </Link>
        ) : null
      }
    >
      <main className={ui.page}>
        <div className={ui.listHead}>
          <div style={{ flex: 1 }}>
            <h1 className={ui.pageTitle}>{t('Angebote', 'Offers')}</h1>
            {params.ok === 'deleted' ? <div className={ui.subtitle}>{t('Das Angebot wurde gelöscht.', 'The offer was deleted.')}</div> : null}
          </div>
        </div>

        <Card bleed>
          <ListBar
            tabs={OFFER_FILTERS.map((f) => ({ key: f, label: labels[f], href: href(f), count: counts[f] }))}
            active={filter}
            search={{
              action: '/admin/offers',
              value: q,
              placeholder: t('Name, Schule oder Nummer', 'Name, school or number'),
              keep: { filter: filter === 'open' ? undefined : filter },
            }}
          />
          {offers.length === 0 ? (
            <ListEmpty
              title={q ? t('Nichts gefunden', 'Nothing found') : filter === 'open' ? t('Nichts offen', 'Nothing open') : t('Hier gibt es keine Angebote', 'No offers here')}
            >
              {q ? t(`Kein Angebot passt zu „${q}“.`, `No offer matches “${q}”.`) : null}
            </ListEmpty>
          ) : (
            <Table
              head={[
                t('Angebot', 'Offer'),
                { label: t('Daten', 'Dates'), className: 'hidden w-[13.5rem] md:table-cell' },
                { label: t('Betrag', 'Amount'), align: 'right', className: 'w-[9rem]' },
                { label: t('Zuständig', 'Owner'), className: 'hidden w-[4.5rem] md:table-cell' },
                { label: t('Aktualisiert', 'Updated'), className: 'hidden w-[9.5rem] lg:table-cell' },
              ]}
            >
              {groups.map((group) => [
                group.label ? <ListGroup key={group.key} label={group.label} count={group.rows.length} span={5} /> : null,
                ...group.rows.map((o) => (
                  <TableRow key={o.id} interactive>
                    <Cell href={`/admin/offers/${o.id}`} className="max-w-0">
                      <RecordName name={o.groupName || o.recipientName || t('Ohne Namen', 'Untitled')} reference={o.number} about={about(o, t, lang)} />
                    </Cell>
                    <Cell className="hidden text-[0.84rem] whitespace-nowrap text-[#2b3546] tabular-nums md:table-cell">{when(o, lang)}</Cell>
                    <Cell align="right" className="whitespace-nowrap tabular-nums">
                      {o.kind === 'group' ? (
                        o.perParticipant != null ? (
                          <>
                            <span className="font-semibold">{euros(o.perParticipant)}</span>
                            <span className="ml-1 text-xs text-[var(--casa-text-subtle)]">{t('p. P.', 'p. p.')}</span>
                          </>
                        ) : null
                      ) : o.groupTotal != null ? (
                        <span className="font-semibold">{euros(o.groupTotal)}</span>
                      ) : null}
                    </Cell>
                    <Cell className="hidden md:table-cell">
                      <Owner name={o.ownerName} />
                    </Cell>
                    <Cell className="hidden text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)] lg:table-cell">
                      {latest(o, t, lang)}
                    </Cell>
                  </TableRow>
                )),
              ])}
            </Table>
          )}
        </Card>
      </main>
    </OfferFrame>
  );
}
