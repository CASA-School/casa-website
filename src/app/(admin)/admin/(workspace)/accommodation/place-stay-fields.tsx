'use client';

import { useState } from 'react';

import { useWsLang } from '@/components/admin/lang';
import { Field, Select } from '@/components/admin/ui';

type Choice = { id: string; name: string; kind: 'host_family' | 'casa_flat' | 'other'; rooms: { id: string; name: string }[] };

/** The place, then a room of it: the rooms follow the place chosen. */
export function PlaceStayFields({ choices, placeId, roomId, idPrefix }: { choices: Choice[]; placeId: string | null; roomId: string | null; idPrefix: string }) {
  const { t } = useWsLang();
  const [place, setPlace] = useState(placeId ?? '');
  const rooms = choices.find((c) => c.id === place)?.rooms ?? [];
  const flats = choices.filter((c) => c.kind === 'casa_flat');
  const others = choices.filter((c) => c.kind !== 'casa_flat');
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t('Unterkunft', 'Place')} htmlFor={`${idPrefix}-place`}>
        <Select id={`${idPrefix}-place`} name="accommodationId" value={place} onChange={(e) => setPlace(e.target.value)}>
          <option value="">{t('Noch keine', 'None yet')}</option>
          {flats.length ? (
            <optgroup label={t('CASA-WGs', 'CASA flats')}>
              {flats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label={t('Gastfamilien und andere', 'Host families and others')}>
            {others.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </optgroup>
        </Select>
      </Field>
      <Field label={t('Zimmer', 'Room')} htmlFor={`${idPrefix}-room`}>
        <Select id={`${idPrefix}-room`} name="roomId" defaultValue={roomId ?? ''} key={place} disabled={!rooms.length}>
          <option value="">—</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
