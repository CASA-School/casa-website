'use client';

import { useState } from 'react';

import { Button, Field, Input, Select } from '@/components/admin/ui';
import { RATE_UNIT_LABELS } from '@/lib/admin/configuration-labels';
import { createRateAction } from './actions';
import { todayInputValue } from '@/lib/dates';

type Targets = {
  courseTypes: { id: string; name: string }[];
  examTypes: { id: string; name: string }[];
  materials: { id: string; title: string }[];
  accommodationTypes: { code: string; name: string }[];
  chargeTypes: { code: string; name: string }[];
  levels: string[];
  dayTimes: { code: string; name: string }[];
  catering: { code: string; name: string }[];
  roomTypes: { code: string; name: string }[];
};

const SCOPES = [
  ['course_type', 'A course'],
  ['accommodation', 'Accommodation'],
  ['exam_type', 'An exam'],
  ['material', 'A book'],
  ['charge_type', 'A fee or charge'],
] as const;

/**
 * A new price.
 *
 * The one client component in the setup screen, because which "what" select to
 * show follows from the scope, and offering all five at once is the FileMaker
 * mistake in miniature. Everything below the amount is progressive: the
 * conditions that narrow a price are a step of their own.
 */
export function RateForm({ targets }: { targets: Targets }) {
  const [scope, setScope] = useState<(typeof SCOPES)[number][0]>('course_type');

  const unitDefault =
    scope === 'course_type' ? 'week' : scope === 'accommodation' ? 'week' : 'item';

  return (
    <form action={createRateAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Price for" htmlFor="rate-scope">
          <Select
            id="rate-scope"
            name="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as (typeof SCOPES)[number][0])}
          >
            {SCOPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        {scope === 'course_type' ? (
          <Field label="Which course" htmlFor="rate-course">
            <Select id="rate-course" name="courseTypeId" required defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {targets.courseTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        {scope === 'exam_type' ? (
          <Field label="Which exam" htmlFor="rate-exam">
            <Select id="rate-exam" name="examTypeId" required defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {targets.examTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        {scope === 'material' ? (
          <Field label="Which book" htmlFor="rate-material">
            <Select id="rate-material" name="materialId" required defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {targets.materials.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        {scope === 'accommodation' ? (
          <Field label="Which type" htmlFor="rate-acc">
            <Select id="rate-acc" name="accommodationTypeCode" required defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {targets.accommodationTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        {scope === 'charge_type' ? (
          <Field label="Which charge" htmlFor="rate-charge">
            <Select id="rate-charge" name="chargeTypeCode" required defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {targets.chargeTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Amount" htmlFor="rate-amount">
          <Input
            id="rate-amount"
            name="amount"
            inputMode="decimal"
            required
            className="text-right"
          />
        </Field>
        <Field label="Per" htmlFor="rate-unit">
          <Select id="rate-unit" name="unit" key={unitDefault} defaultValue={unitDefault}>
            {Object.entries(RATE_UNIT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="From" htmlFor="rate-from">
          <Input
            id="rate-from"
            name="validFrom"
            type="date"
            required
            defaultValue={todayInputValue()}
          />
        </Field>
      </div>

      <details className="group">
        <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--casa-text-subtle)] hover:text-[var(--casa-ink)]">
          <span className="group-open:hidden">More</span>
          <span className="hidden group-open:inline">Less</span>
        </summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Until" hint="empty = open" htmlFor="rate-to">
              <Input id="rate-to" name="validTo" type="date" />
            </Field>
            <Field label="VAT %" htmlFor="rate-vat">
              <Input
                id="rate-vat"
                name="vatRate"
                inputMode="decimal"
                className="text-right"
                defaultValue="0"
              />
            </Field>
          </div>
          {scope === 'course_type' ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Level" hint="any" htmlFor="rate-level">
                <Select id="rate-level" name="levelCode" defaultValue="">
                  <option value="">Any</option>
                  {targets.levels.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Session" hint="any" htmlFor="rate-session">
                <Select id="rate-session" name="dayTimeCode" defaultValue="">
                  <option value="">Any</option>
                  {targets.dayTimes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : null}
          {scope === 'accommodation' ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Room" hint="any" htmlFor="rate-room">
                <Select id="rate-room" name="roomTypeCode" defaultValue="">
                  <option value="">Any</option>
                  {targets.roomTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Catering" hint="any" htmlFor="rate-catering">
                <Select id="rate-catering" name="cateringCode" defaultValue="">
                  <option value="">Any</option>
                  {targets.catering.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : null}
          {scope === 'exam_type' ? (
            <Field label="Parts sat" hint="any" htmlFor="rate-parts">
              <Select id="rate-parts" name="parts" defaultValue="">
                <option value="">Any</option>
                <option value="1">One part</option>
                <option value="2">Both parts</option>
              </Select>
            </Field>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="From quantity" hint="e.g. 5 weeks" htmlFor="rate-min">
              <Input
                id="rate-min"
                name="minQuantity"
                type="number"
                min={0}
                max={999}
                className="text-right"
              />
            </Field>
            <Field label="To quantity" htmlFor="rate-max">
              <Input
                id="rate-max"
                name="maxQuantity"
                type="number"
                min={0}
                max={999}
                className="text-right"
              />
            </Field>
          </div>
          <Field label="Note" htmlFor="rate-note">
            <Input id="rate-note" name="note" maxLength={200} />
          </Field>
        </div>
      </details>

      <div className="flex justify-end pt-1">
        <Button type="submit">Add price</Button>
      </div>
    </form>
  );
}
