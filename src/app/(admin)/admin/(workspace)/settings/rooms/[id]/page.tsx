import Link from 'next/link';
import { notFound } from 'next/navigation';

import { courseHref } from '../../../catalogue/course-href';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { dayRange } from '@/components/admin/list';
import { Badge, Card, DetailList, RecordHeader } from '@/components/admin/ui';
import { isSchoolClosed } from '@/config/school-closures';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { floorLabel, getRoom, roomCourses, roomWeek, ROOM_KIND_LABELS, type RoomShift, type RoomSlot } from '@/lib/admin/rooms';
import { num, pick, wsLocale, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { isoWeek } from '@/lib/admin/kursplanung/weeks';
import { todayInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { deleteRoomAction } from '../actions';
import { EditRoomForm } from '../room-forms';

/**
 * One room: what it is, what runs in it, and the form that changes it.
 *
 * The record's head carries what a colleague looks a room up for — where it
 * is, how many it seats, whether courses can be booked into it. Under it the
 * room's week (2026-10-17): its lesson days by weekday and morning, afternoon
 * and evening, as each day's room is set — what is free reads off the gaps —
 * and the course numbers taught in it from today on, marked when they hold
 * more learners than the room seats.
 */
export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string; week?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireModule('rooms')]);
  const room = await getRoom(id);
  if (!room) notFound();
  const today = todayInputValue();
  const monday = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(query.week ?? '') ? query.week! : today);
  const [slots, courses, { t, lang }] = await Promise.all([roomWeek(room.id, monday), roomCourses(room.id, today), getI18n()]);
  const thisWeek = monday === mondayOf(today);

  return (
    <>
      <RecordHeader
        backHref="/admin/settings/rooms"
        backLabel={t('Alle Räume', 'All rooms')}
        title={room.nickname ? `${room.name} · ${room.nickname}` : room.name}
        subtitle={pick(lang, ROOM_KIND_LABELS[room.kind])}
        status={
          !room.isActive ? (
            <Badge tone="quiet">{t('Inaktiv', 'Inactive')}</Badge>
          ) : room.isBookable ? (
            <Badge tone="positive">{t('Buchbar', 'Bookable')}</Badge>
          ) : (
            <Badge tone="quiet">{t('Nicht buchbar', 'Not bookable')}</Badge>
          )
        }
        actions={
          <>
            {canAccess(user, 'rooms', 'edit') ? (
              <FormDialog icon={Icon.rooms} tint="ink" trigger={t('Bearbeiten', 'Edit')} title={room.name}>
                <EditRoomForm room={room} />
              </FormDialog>
            ) : null}
            {canAccess(user, 'rooms', 'full') ? (
              <form action={deleteRoomAction}>
                <input type="hidden" name="roomId" value={room.id} />
                <ConfirmSubmit
                  title={t(`${room.name} löschen?`, `Delete ${room.name}?`)}
                  description={t(
                    'Der Raum wird aus der Liste und aus jedem Termin entfernt, der auf ihn verwiesen hat. Das lässt sich nicht rückgängig machen.',
                    'The room is removed from the list and from every cohort that pointed at it. This cannot be undone.'
                  )}
                  size="md"
                >
                  {t('Löschen', 'Delete')}
                </ConfirmSubmit>
              </form>
            ) : null}
          </>
        }
        facts={[
          {
            label: t('Standort', 'Location'),
            icon: Icon.rooms,
            tint: 'ink',
            value: room.locationName,
            sub: floorLabel(room.floor, lang),
          },
          {
            label: t('Kapazität', 'Capacity'),
            icon: Icon.people,
            tint: 'green',
            value: room.capacity ?? '—',
            sub:
              room.capacityMax && room.capacityMax !== room.capacity
                ? t(`höchstens ${room.capacityMax}`, `${room.capacityMax} at most`)
                : undefined,
          },
          {
            label: thisWeek ? t('Diese Woche', 'This week') : t(`KW ${isoWeek(monday)}`, `Week ${isoWeek(monday)}`),
            icon: Icon.calendar,
            tint: 'blue',
            value: slots.length ? t(`${num(lang, slots.length)} Kurstage`, `${num(lang, slots.length)} lesson days`) : t('Frei', 'Free'),
          },
        ]}
      />

      {query.error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {query.error}
        </p>
      ) : null}
      {query.ok ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-[var(--casa-success-text)]/30 bg-[var(--casa-success-surface)]/8 px-4 py-3 text-sm text-[var(--casa-success-text)]"
        >
          {t('Gespeichert.', 'Saved.')}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <Card
            title={t('Belegung', 'In use')}
            icon={Icon.calendar}
            tint="blue"
            bleed
            actions={
              <span className="flex items-center gap-1 text-[0.8rem] font-semibold">
                <Link href={`?week=${addDays(monday, -7)}`} aria-label={t('Woche davor', 'Week before')} className="rounded-md px-2 py-1 text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]">
                  ‹
                </Link>
                <span className="min-w-[9.5rem] text-center tabular-nums">
                  {t(`KW ${isoWeek(monday)}`, `Week ${isoWeek(monday)}`)} · {dayRange(monday, addDays(monday, 6), lang)}
                </span>
                <Link href={`?week=${addDays(monday, 7)}`} aria-label={t('Woche danach', 'Week after')} className="rounded-md px-2 py-1 text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]">
                  ›
                </Link>
                {thisWeek ? null : (
                  <Link href="?" className="ml-1 rounded-md px-2 py-1 text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]">
                    {t('Heute', 'Today')}
                  </Link>
                )}
              </span>
            }
          >
            <RoomWeek monday={monday} slots={slots} today={today} t={t} lang={lang} />
          </Card>

          <Card title={t('Kurse ab heute', 'Courses from today')} icon={Icon.catalogue} tint="red" bleed>
            {courses.length === 0 ? (
              <p className="px-5 py-4 text-sm text-[var(--casa-text-subtle)]">{t('Ab heute ist hier kein Kurs geplant.', 'No course is planned here from today.')}</p>
            ) : (
              <ul className="divide-y divide-ws-line-soft">
                {courses.map((c) => {
                  const over = room.capacity !== null && c.learners !== null && c.learners > room.capacity;
                  return (
                    <li key={`${c.courseId}-${c.groupIndex}`}>
                      <Link href={courseHref(c.courseId, c.groupIndex)} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-2.5 text-[0.86rem] hover:bg-[var(--ws-row-hover)]">
                        <span className="min-w-0">
                          <span className="font-semibold text-[var(--casa-ink)]">
                            {c.label}
                            {c.number ? <span className="tabular-nums"> · {c.number}</span> : null}
                          </span>
                          <span className="text-[var(--casa-muted)]"> · {c.typeName}</span>
                        </span>
                        <span className="flex items-center gap-2 text-[var(--casa-muted)] tabular-nums">
                          {over ? <Badge tone="warning">{t(`${c.learners} Teilnehmende`, `${c.learners} learners`)}</Badge> : null}
                          {dayRange(c.first, c.last, lang)} · {t(`${num(lang, c.days)} Tage`, `${num(lang, c.days)} days`)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <Card title={t('Details', 'Details')} icon={Icon.note} tint="sun">
          <DetailList
            items={[
              { label: t('Zone', 'Zone'), value: room.zone },
              { label: t('Farbe', 'Colour'), value: room.colour },
              { label: t('Kurzname', 'Short name'), value: room.shortName },
              { label: t('Notizen', 'Notes'), value: room.notes, wide: true },
            ]}
          />
        </Card>
      </div>
    </>
  );
}

const SHIFTS: { key: RoomShift; label: Bilingual }[] = [
  { key: 'morning', label: { de: 'Vormittag', en: 'Morning' } },
  { key: 'afternoon', label: { de: 'Nachmittag', en: 'Afternoon' } },
  { key: 'evening', label: { de: 'Abend', en: 'Evening' } },
];

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** The Monday of the week a day falls in. */
function mondayOf(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** The week as a grid: weekdays across, morning, afternoon and evening down; a gap is a free slot. */
function RoomWeek({ monday, slots, today, t, lang }: { monday: string; slots: RoomSlot[]; today: string; t: T; lang: WsLang }) {
  // The weekend only when something is on it.
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d, i) => i < 5 || slots.some((s) => s.date === d));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] table-fixed border-collapse text-left text-[0.8rem]">
        <thead>
          <tr className="border-b border-ws-line text-xs text-[var(--casa-muted)]">
            <th className="w-[6.5rem] px-4 py-2 font-semibold" />
            {days.map((d) => (
              <th key={d} className={cn('px-2 py-2 font-semibold', d === today && 'text-[var(--casa-ink)]')}>
                {new Date(`${d}T12:00:00`).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SHIFTS.map((shift) => (
            <tr key={shift.key} className="border-b border-ws-line-soft align-top last:border-b-0">
              <th scope="row" className="px-4 py-2.5 text-xs font-semibold text-[var(--casa-muted)]">
                {pick(lang, shift.label)}
              </th>
              {days.map((d) => {
                const here = slots.filter((s) => s.date === d && s.shift === shift.key);
                return (
                  <td key={d} className={cn('px-1.5 py-1.5', d === today && 'bg-[#f4f8fc]')}>
                    {here.length ? (
                      <span className="flex flex-col gap-1">
                        {here.map((s, i) => {
                          const body = (
                            <>
                              <span className="block truncate font-semibold text-[var(--casa-ink)]">
                                {s.label}
                                {s.number ? <span className="tabular-nums"> · {s.number}</span> : null}
                              </span>
                              <span className="block truncate text-[0.72rem] text-[var(--casa-muted)] tabular-nums">
                                {[s.startsAt && s.endsAt ? `${s.startsAt}–${s.endsAt}` : null, s.teacher].filter(Boolean).join(' · ')}
                              </span>
                            </>
                          );
                          // Two courses in the room at the same time: a clash, in amber.
                          const clash = slots.some((o) => o !== s && o.date === s.date && (!o.startsAt || !s.startsAt || !o.endsAt || !s.endsAt || (o.startsAt < s.endsAt && o.endsAt > s.startsAt)));
                          const box = cn('block rounded-md px-2 py-1', clash ? 'bg-[#fff4e0] ring-1 ring-[#efd29a] ring-inset' : 'bg-[#eef3f9]');
                          return s.courseId ? (
                            <Link key={i} href={courseHref(s.courseId, s.groupIndex)} title={s.label} className={cn(box, 'hover:ring-1 hover:ring-[var(--casa-blue)]/40')}>
                              {body}
                            </Link>
                          ) : (
                            <span key={i} title={s.label} className={box}>
                              {body}
                            </span>
                          );
                        })}
                      </span>
                    ) : (
                      <span className="block px-2 py-1 text-[0.74rem] text-[var(--casa-text-subtle)]">{isSchoolClosed(d) ? t('geschlossen', 'closed') : t('frei', 'free')}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
