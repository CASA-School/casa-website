import { createPlaceAction, placeStayAction, saveMemberAction, saveRoomAction, updatePlaceAction } from './actions';
import { PlaceStayFields } from './place-stay-fields';
import { DialogFooter } from '@/components/admin/dialogs';
import { OptionalSection } from '@/components/admin/optional-section';
import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import type { PlaceDetail, PlaceMember, PlaceRoom, placementChoices } from '@/lib/admin/accommodation';
import { ACCOMMODATION_KIND_LABELS, ACCOMMODATION_KINDS, MEMBER_ROLE_LABELS, MEMBER_ROLES } from '@/lib/admin/accommodation-labels';
import { pick, type Bilingual } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * The accommodation module's forms, each in a dialog. A new place needs its name and what it is; how to
 * reach it opens once both are in. The rest — the house, the family, the rooms — is on its page.
 */

const yesNoValue = (v: boolean | null | undefined) => (v === true ? 'yes' : v === false ? 'no' : '');

async function YesNo({ id, name, label, value }: { id: string; name: string; label: string; value: boolean | null | undefined }) {
  const { t } = await getI18n();
  return (
    <Field label={label} htmlFor={id}>
      <Select id={id} name={name} defaultValue={yesNoValue(value)}>
        <option value="">—</option>
        <option value="yes">{t('Ja', 'Yes')}</option>
        <option value="no">{t('Nein', 'No')}</option>
      </Select>
    </Field>
  );
}

async function KindSelect({ id, value, required = false }: { id: string; value?: string; required?: boolean }) {
  const { t, lang } = await getI18n();
  return (
    <Select id={id} name="kind" required={required} defaultValue={value ?? ''}>
      {value ? null : (
        <option value="" disabled>
          {t('Bitte wählen', 'Choose')}
        </option>
      )}
      {ACCOMMODATION_KINDS.map((k) => (
        <option key={k} value={k}>
          {pick(lang, ACCOMMODATION_KIND_LABELS[k])}
        </option>
      ))}
    </Select>
  );
}

/** How to reach it: the same fields when it is made and when it is changed. */
async function ReachFields({ place, prefix }: { place?: PlaceDetail; prefix: string }) {
  const { t } = await getI18n();
  const id = (f: string) => `${prefix}-${f}`;
  return (
    <div className="space-y-3">
      <Field label={t('Ansprechperson', 'Contact')} htmlFor={id('contact')}>
        <Input id={id('contact')} name="contactName" maxLength={200} defaultValue={place?.contactName ?? ''} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('E-Mail', 'Email')} htmlFor={id('email')}>
          <Input id={id('email')} name="email" type="email" maxLength={200} defaultValue={place?.email ?? ''} />
        </Field>
        <Field label={t('Telefon', 'Phone')} htmlFor={id('phone')}>
          <Input id={id('phone')} name="phone" maxLength={60} defaultValue={place?.phone ?? ''} />
        </Field>
      </div>
      <Field label={t('Adresse', 'Address')} htmlFor={id('address')}>
        <Textarea id={id('address')} name="address" rows={2} maxLength={500} defaultValue={place?.address ?? ''} />
      </Field>
    </div>
  );
}

export async function NewPlaceForm() {
  const { t } = await getI18n();
  return (
    <form action={createPlaceAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Field label={t('Name', 'Name')} htmlFor="place-name">
          <Input id="place-name" name="name" required maxLength={200} autoFocus placeholder={t('Familie Meyer', 'Meyer family')} />
        </Field>
        <Field label={t('Art', 'Kind')} htmlFor="place-kind">
          <KindSelect id="place-kind" value="host_family" required />
        </Field>
      </div>
      <OptionalSection requires={['name', 'kind']} heading={t('Kontakt und Adresse', 'Contact and address')}>
        <ReachFields prefix="place-new" />
      </OptionalSection>
      <DialogFooter>
        <Button type="submit">{t('Anlegen', 'Create')}</Button>
      </DialogFooter>
    </form>
  );
}

export async function EditPlaceForm({ place }: { place: PlaceDetail }) {
  const { t } = await getI18n();
  return (
    <form action={updatePlaceAction} className="space-y-4">
      <input type="hidden" name="placeId" value={place.id} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Field label={t('Name', 'Name')} htmlFor="place-edit-name">
          <Input id="place-edit-name" name="name" required maxLength={200} defaultValue={place.name} />
        </Field>
        <Field label={t('Art', 'Kind')} htmlFor="place-edit-kind">
          <KindSelect id="place-edit-kind" value={place.kind} />
        </Field>
      </div>
      <ReachFields place={place} prefix="place-edit" />
      <div className="grid gap-3 sm:grid-cols-3">
        <YesNo id="place-edit-smoker" name="smoker" label={t('Raucherhaushalt', 'Smoking household')} value={place.smoker} />
        <YesNo id="place-edit-washing" name="washingMachine" label={t('Waschmaschine', 'Washing machine')} value={place.washingMachine} />
        <Field label={t('Haustiere', 'Pets')} htmlFor="place-edit-pets">
          <Input id="place-edit-pets" name="pets" maxLength={200} defaultValue={place.pets ?? ''} />
        </Field>
      </div>
      <Field label={t('Beschreibung (Deutsch)', 'Description (German)')} htmlFor="place-edit-de">
        <Textarea id="place-edit-de" name="descriptionDe" rows={3} maxLength={4000} defaultValue={place.descriptionDe ?? ''} />
      </Field>
      <Field label={t('Beschreibung (Englisch)', 'Description (English)')} htmlFor="place-edit-en">
        <Textarea id="place-edit-en" name="descriptionEn" rows={3} maxLength={4000} defaultValue={place.descriptionEn ?? ''} />
      </Field>
      <Field label={t('Notiz', 'Note')} htmlFor="place-edit-note">
        <Textarea id="place-edit-note" name="note" rows={2} maxLength={2000} defaultValue={place.note ?? ''} />
      </Field>
      <DialogFooter>
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </DialogFooter>
    </form>
  );
}

export async function RoomForm({ placeId, room, types }: { placeId: string; room?: PlaceRoom; types: readonly { code: string; name: Bilingual }[] }) {
  const { t, lang } = await getI18n();
  const id = (f: string) => `room-${room?.id ?? 'new'}-${f}`;
  return (
    <form action={saveRoomAction} className="space-y-3">
      <input type="hidden" name="placeId" value={placeId} />
      {room ? <input type="hidden" name="roomId" value={room.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_6rem]">
        <Field label={t('Name', 'Name')} htmlFor={id('name')}>
          <Input id={id('name')} name="name" maxLength={80} defaultValue={room?.name ?? ''} autoFocus={!room} />
        </Field>
        <Field label={t('Zimmerart', 'Room type')} htmlFor={id('type')}>
          <Select id={id('type')} name="roomTypeCode" defaultValue={room?.roomTypeCode ?? ''}>
            <option value="">—</option>
            {types.map((r) => (
              <option key={r.code} value={r.code}>
                {pick(lang, r.name)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('Betten', 'Beds')} htmlFor={id('beds')}>
          <Input id={id('beds')} name="beds" inputMode="numeric" maxLength={2} defaultValue={room?.beds ?? ''} />
        </Field>
      </div>
      <Field label={t('Notiz', 'Note')} htmlFor={id('note')}>
        <Textarea id={id('note')} name="note" rows={2} maxLength={500} defaultValue={room?.note ?? ''} />
      </Field>
      <Field label={t('Wird vergeben', 'In use')} htmlFor={id('active')}>
        <Select id={id('active')} name="isActive" defaultValue={room && !room.isActive ? '0' : '1'}>
          <option value="1">{t('Ja', 'Yes')}</option>
          <option value="0">{t('Nein, nicht mehr', 'No longer')}</option>
        </Select>
      </Field>
      <DialogFooter>
        <Button type="submit">{room ? t('Speichern', 'Save') : t('Zimmer hinzufügen', 'Add room')}</Button>
      </DialogFooter>
    </form>
  );
}

export async function MemberForm({ placeId, member }: { placeId: string; member?: PlaceMember }) {
  const { t, lang } = await getI18n();
  const id = (f: string) => `member-${member?.id ?? 'new'}-${f}`;
  return (
    <form action={saveMemberAction} className="space-y-3">
      <input type="hidden" name="placeId" value={placeId} />
      {member ? <input type="hidden" name="memberId" value={member.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_11rem]">
        <Field label={t('Vorname', 'First name')} htmlFor={id('first')}>
          <Input id={id('first')} name="firstName" maxLength={80} defaultValue={member?.firstName ?? ''} autoFocus={!member} />
        </Field>
        <Field label={t('Nachname', 'Last name')} htmlFor={id('last')}>
          <Input id={id('last')} name="lastName" maxLength={80} defaultValue={member?.lastName ?? ''} />
        </Field>
        <Field label={t('In der Familie', 'In the family')} htmlFor={id('role')}>
          <Select id={id('role')} name="role" defaultValue={member?.role ?? 'mother'}>
            {MEMBER_ROLES.map((r) => (
              <option key={r} value={r}>
                {pick(lang, MEMBER_ROLE_LABELS[r])}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <DialogFooter>
        <Button type="submit">{member ? t('Speichern', 'Save') : t('Hinzufügen', 'Add')}</Button>
      </DialogFooter>
    </form>
  );
}

/** Where a stay is: a place and a room of it, from the stays list. */
export async function PlaceStayForm({
  stayId,
  placeId,
  roomId,
  choices,
  back,
}: {
  stayId: string;
  placeId: string | null;
  roomId: string | null;
  choices: Awaited<ReturnType<typeof placementChoices>>;
  back: string;
}) {
  const { t } = await getI18n();
  return (
    <form action={placeStayAction} className="space-y-4">
      <input type="hidden" name="stayId" value={stayId} />
      <input type="hidden" name="back" value={back} />
      <PlaceStayFields choices={choices} placeId={placeId} roomId={roomId} idPrefix={`stay-${stayId}`} />
      <DialogFooter>
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </DialogFooter>
    </form>
  );
}
