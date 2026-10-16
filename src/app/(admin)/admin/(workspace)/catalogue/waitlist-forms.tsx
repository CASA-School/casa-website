import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { CLOSE_REASON_LABELS, CLOSE_REASONS, freePlaces, type LevelGroup, type WaitlistEntry } from '@/lib/admin/waitlist';
import { addToWaitlistAction, closeEntryAction, moveEntryAction, moveToStartAction, setPlacesAction } from './actions';

/**
 * The waiting list's forms, rendered inside dialogs (docs/ADMIN_WORKSPACE.md §Waiting list). Each
 * level choice says how that level stands in the start — free places, or full with how many wait —
 * so the colleague sees the queue before choosing it.
 */

/** A level's state in a start, for a select's option: „B1.1 · voll · 3 warten". */
async function levelOption(code: string, group: LevelGroup | undefined) {
  const { t } = await getI18n();
  const free = group ? freePlaces(group) : 14;
  const waiting = group ? group.waiting + group.offered : 0;
  return [
    code,
    free === 0 ? t('voll', 'full') : t(`${free} frei`, `${free} free`),
    waiting ? t(`${waiting} auf der Warteliste`, `${waiting} on the waiting list`) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Puts a known person into a level's queue of one start: from a registration, or the start's page. */
export async function WaitlistForm({
  personId,
  courseInstanceId,
  levels,
  groups,
  registrationId,
  defaultLevel,
  returnTo,
}: {
  personId: string;
  courseInstanceId: string;
  levels: readonly string[];
  groups: readonly LevelGroup[];
  registrationId?: string | null;
  defaultLevel?: string | null;
  returnTo: string;
}) {
  const { t } = await getI18n();
  const options = await Promise.all(levels.map(async (code) => ({ code, label: await levelOption(code, groups.find((g) => g.levelCode === code)) })));
  return (
    <form action={addToWaitlistAction} className="space-y-3">
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="courseInstanceId" value={courseInstanceId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {registrationId ? <input type="hidden" name="registrationId" value={registrationId} /> : null}
      <Field label={t('Niveau', 'Level')} htmlFor="waitlist-level">
        <Select id="waitlist-level" name="levelCode" required defaultValue={defaultLevel && levels.includes(defaultLevel) ? defaultLevel : ''}>
          <option value="" disabled>
            {t('Bitte wählen', 'Choose')}
          </option>
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('Notiz', 'Note')} htmlFor="waitlist-note">
        <Textarea id="waitlist-note" name="note" rows={2} maxLength={300} />
      </Field>
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Auf die Warteliste', 'Add to waiting list')}</Button>
      </div>
    </form>
  );
}

/** A place further up or down the queue, always with the reason; or the same wish for another start. */
export async function MoveForm({
  entry,
  queueLength,
  starts,
  levels,
  returnTo,
}: {
  entry: WaitlistEntry;
  queueLength: number;
  starts: readonly { id: string; label: string }[];
  levels: readonly string[];
  returnTo: string;
}) {
  const { t } = await getI18n();
  return (
    <div className="space-y-6">
      {queueLength > 1 ? (
        <form action={moveEntryAction} className="space-y-3">
          <input type="hidden" name="entryId" value={entry.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <h3 className="text-sm font-bold text-[var(--casa-ink)]">{t('Platz in der Warteliste', 'Place in the queue')}</h3>
          <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
            <Field label={t('Neuer Platz', 'New place')} htmlFor={`move-pos-${entry.id}`}>
              <Input id={`move-pos-${entry.id}`} name="position" type="number" min={1} max={queueLength} required defaultValue={entry.position ?? 1} />
            </Field>
            <Field label={t('Grund', 'Reason')} htmlFor={`move-reason-${entry.id}`}>
              <Input id={`move-reason-${entry.id}`} name="reason" required maxLength={300} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary">
              {t('Platz ändern', 'Change place')}
            </Button>
          </div>
        </form>
      ) : null}
      <form action={moveToStartAction} className="space-y-3 border-t border-ws-line-soft pt-5 first:border-t-0 first:pt-0">
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <h3 className="text-sm font-bold text-[var(--casa-ink)]">{t('Anderer Termin oder anderes Niveau', 'Another start or level')}</h3>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <Field label={t('Termin', 'Start')} htmlFor={`move-start-${entry.id}`}>
            <Select id={`move-start-${entry.id}`} name="courseInstanceId" defaultValue={entry.courseInstanceId}>
              {starts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('Niveau', 'Level')} htmlFor={`move-level-${entry.id}`}>
            <Select id={`move-level-${entry.id}`} name="levelCode" defaultValue={entry.levelCode}>
              {levels.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="text-xs text-[var(--casa-muted)]">{t('Die Person behält den Tag, an dem sie auf die Liste kam.', 'They keep the day they joined the list.')}</p>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary">
            {t('Verschieben', 'Move')}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Off the list: the reason, and a note when it is something else. An offered place declined, or no longer waiting. */
export async function CloseForm({ entry, returnTo }: { entry: WaitlistEntry; returnTo: string }) {
  const { t, lang } = await getI18n();
  return (
    <form action={closeEntryAction} className="space-y-3">
      <input type="hidden" name="entryId" value={entry.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="status" value={entry.status === 'offered' ? 'declined' : 'withdrawn'} />
      <fieldset>
        <legend className="mb-2 text-[0.8rem] font-semibold text-[var(--casa-ink)]">{t('Grund', 'Reason')}</legend>
        <div className="grid grid-cols-2 gap-2">
          {CLOSE_REASONS.map((reason, i) => (
            <label
              key={reason}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-ws-line px-3 py-2 text-sm has-[:checked]:border-[var(--casa-ink-deep)] has-[:checked]:bg-ws-sunk"
            >
              <input type="radio" name="reason" value={reason} defaultChecked={i === 0} className="accent-[var(--casa-ink-deep)]" />
              {pick(lang, CLOSE_REASON_LABELS[reason])}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t('Notiz', 'Note')} htmlFor={`close-note-${entry.id}`}>
        <Textarea id={`close-note-${entry.id}`} name="note" rows={2} maxLength={300} />
      </Field>
      <div className="flex justify-end pt-1">
        <Button type="submit">{entry.status === 'offered' ? t('Als abgesagt eintragen', 'Mark as declined') : t('Von der Liste nehmen', 'Take off the list')}</Button>
      </div>
    </form>
  );
}

/** How many groups a level has in this start, and how many learners a group takes. */
export async function PlacesForm({ group, returnTo }: { group: LevelGroup; returnTo: string }) {
  const { t } = await getI18n();
  return (
    <form action={setPlacesAction} className="space-y-3">
      <input type="hidden" name="courseInstanceId" value={group.courseInstanceId} />
      <input type="hidden" name="levelCode" value={group.levelCode} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Gruppen', 'Groups')} htmlFor={`places-groups-${group.levelCode}`}>
          <Input id={`places-groups-${group.levelCode}`} name="groups" type="number" min={0} max={9} required defaultValue={group.groups} />
        </Field>
        <Field label={t('Plätze pro Gruppe', 'Places per group')} htmlFor={`places-per-${group.levelCode}`}>
          <Input id={`places-per-${group.levelCode}`} name="placesPerGroup" type="number" min={1} max={40} required defaultValue={group.placesPerGroup} />
        </Field>
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </div>
    </form>
  );
}

/** A level not yet in a start: its places, set before anyone books or waits. */
export async function NewLevelForm({ courseInstanceId, levels, returnTo }: { courseInstanceId: string; levels: readonly string[]; returnTo: string }) {
  const { t } = await getI18n();
  return (
    <form action={setPlacesAction} className="space-y-3">
      <input type="hidden" name="courseInstanceId" value={courseInstanceId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Field label={t('Niveau', 'Level')} htmlFor="new-level">
        <Select id="new-level" name="levelCode" required defaultValue="">
          <option value="" disabled>
            {t('Bitte wählen', 'Choose')}
          </option>
          {levels.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Gruppen', 'Groups')} htmlFor="new-level-groups">
          <Input id="new-level-groups" name="groups" type="number" min={0} max={9} required defaultValue={1} />
        </Field>
        <Field label={t('Plätze pro Gruppe', 'Places per group')} htmlFor="new-level-places">
          <Input id="new-level-places" name="placesPerGroup" type="number" min={1} max={40} required defaultValue={14} />
        </Field>
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </div>
    </form>
  );
}
