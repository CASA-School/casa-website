import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { describeActivity, type ActivityEntry } from '../activity';
import { formatBriefValue, ORGANISER_BRIEF_LABELS } from '../brief-labels';
import { formatFileSize } from '../format';
import { clampPage, firstParam, offsetFor, PAGE_SIZE, pageCount } from '../paging';
import { normaliseStatus, STATUS_LABELS, STATUS_TONES, WORK_STATUSES } from '../queues';
import { ORGANISER_CHOICES, organiserBriefFields } from '@/lib/validation/contact';

describe('queue status vocabulary', () => {
  it('labels and tones every status', () => {
    for (const status of WORK_STATUSES) {
      expect(STATUS_LABELS[status]).toBeTruthy();
      expect(STATUS_TONES[status]).toBeTruthy();
    }
  });

  it('gives colour only to `new` and the two closing states', () => {
    // A queue where every row is coloured tells you nothing. `new` earns the
    // accent because an unanswered record is the costliest thing in here.
    const coloured = WORK_STATUSES.filter((s) => STATUS_TONES[s] !== 'neutral');
    expect(coloured).toEqual(['new', 'done', 'declined', 'spam']);
  });

  it("maps the careers route's own `submitted` onto `new`", () => {
    // `career_applications.status` predates the workspace and defaults to
    // 'submitted', written by the public apply route. It means the same thing.
    expect(normaliseStatus('submitted')).toBe('new');
    expect(normaliseStatus('interview')).toBe('in_progress');
  });

  it('treats an unknown or missing status as new rather than throwing', () => {
    // A row from a future migration must still render in a list.
    expect(normaliseStatus(null)).toBe('new');
    expect(normaliseStatus(undefined)).toBe('new');
    expect(normaliseStatus('something_else')).toBe('new');
  });

  it('round-trips every real status unchanged', () => {
    for (const status of WORK_STATUSES) {
      expect(normaliseStatus(status)).toBe(status);
    }
  });
});

describe('activity copy', () => {
  const entry = (over: Partial<ActivityEntry>): ActivityEntry => ({
    id: '1',
    staffName: 'Someone',
    entity: 'enquiry',
    entityId: 'abc',
    action: 'status_changed',
    detail: { from: 'new', to: 'done' },
    createdAt: new Date(),
    ...over,
  });

  it('uses the right article for a vowel-initial noun', () => {
    // The trail is the most-read prose in the workspace; "a enquiry" in every
    // third line makes the whole screen look machine-generated.
    expect(describeActivity(entry({}))).toBe('moved an enquiry from New to Done');
    expect(describeActivity(entry({ entity: 'course_registration' }))).toContain(
      'a course registration'
    );
    expect(describeActivity(entry({ entity: 'career_application' }))).toContain('an application');
  });

  it('names statuses in their human form, not the enum', () => {
    expect(describeActivity(entry({ detail: { from: 'in_progress', to: 'waiting' } }))).toBe(
      'moved an enquiry from In progress to Waiting on them'
    );
  });

  it('describes every action it writes', () => {
    // The set here mirrors what the mutations actually insert. A new action with
    // no case falls through to the generic branch, which reads badly — this
    // catches the omission.
    const written = [
      'status_changed',
      'assigned',
      'unassigned',
      'note_added',
      'cv_downloaded',
      'placement_confirmed',
      'staff_invited',
      'staff_deactivated',
      'staff_reactivated',
      'staff_role_changed',
    ];

    for (const action of written) {
      const line = describeActivity(entry({ action, detail: { to: 'X', level: 'B1.2', email: 'a@b.c' } }));
      expect(line, action).not.toContain('_');
    }
  });

  it('falls back readably for an action it has never seen', () => {
    expect(describeActivity(entry({ action: 'some_new_thing' }))).toBe(
      'some new thing on an enquiry'
    );
  });
});

describe('organiser brief labels', () => {
  it('labels every field the public contact form can send', () => {
    // `organiserBriefFields` is the source of truth. A field added there and
    // not here would render with its raw camelCase key.
    const fields = new Set([
      ...organiserBriefFields('group-booking'),
      ...organiserBriefFields('company-courses'),
    ]);

    for (const field of fields) {
      expect(ORGANISER_BRIEF_LABELS[field], field).toBeTruthy();
    }
  });

  it('spells out every choice value the schema accepts', () => {
    // The same contract in the other direction. The stored values are machine
    // tokens picked to feed the group price model (`half-board-plus-canteen`,
    // `public-funder`), so an unmapped one reaches a coordinator raw — which is
    // the failure this catches. Every mapping differs from its token at least
    // in capitalisation, so "did not come back verbatim" proves it is mapped.
    for (const [field, values] of Object.entries(ORGANISER_CHOICES)) {
      for (const value of values) {
        expect(formatBriefValue(value), `${field}=${value} is unmapped`).not.toBe(value);
      }
    }
  });

  it('keeps an age range readable rather than de-hyphenating it', () => {
    // "14 17" is not an age band.
    expect(formatBriefValue('14-17')).toBe('14–17');
    expect(formatBriefValue('26-plus')).toBe('26 and over');
  });

  it('shows an unmapped token exactly as stored', () => {
    // A visibly raw value says "the form gained a field and nobody labelled
    // it". A plausible-looking guess hides that.
    expect(formatBriefValue('some-new-token')).toBe('some-new-token');
  });

  it('renders booleans and numbers', () => {
    expect(formatBriefValue(true)).toBe('Yes');
    expect(formatBriefValue(false)).toBe('No');
    expect(formatBriefValue(18)).toBe('18');
  });
});

describe('paging', () => {
  it('clamps anything a URL can carry to a usable page number', () => {
    // `LIMIT NaN` is a syntax error, so a mistyped query string must not reach
    // SQL as one.
    expect(clampPage(undefined)).toBe(1);
    expect(clampPage('0')).toBe(1);
    expect(clampPage('-4')).toBe(1);
    expect(clampPage('not a number')).toBe(1);
    expect(clampPage('3')).toBe(3);
    expect(clampPage(['5', '9'])).toBe(5);
    expect(clampPage('999999999')).toBe(10_000);
  });

  it('computes offsets and page counts', () => {
    expect(offsetFor(1)).toBe(0);
    expect(offsetFor(3)).toBe(PAGE_SIZE * 2);
    expect(pageCount(0)).toBe(1);
    expect(pageCount(PAGE_SIZE)).toBe(1);
    expect(pageCount(PAGE_SIZE + 1)).toBe(2);
  });

  it('treats a blank search term as no search', () => {
    expect(firstParam('   ')).toBeUndefined();
    expect(firstParam('')).toBeUndefined();
    expect(firstParam(' amara ')).toBe('amara');
  });
});

describe('file sizes', () => {
  it('reads the way an operating system reports them', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 kB');
    expect(formatFileSize(1024 * 400)).toBe('400 kB');
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });

  it('does not invent a size it does not have', () => {
    expect(formatFileSize(Number.NaN)).toBe('—');
    expect(formatFileSize(-1)).toBe('—');
  });
});

describe('table markup', () => {
  it('renders the row link inside a real cell, not an extra one', () => {
    // An extra zero-width `<td>` for the anchor shifted every row one column
    // right of its header — a placement recommendation appeared under
    // "Confidence". The counts have to stay equal.
    const source = readFileSync(
      path.resolve(process.cwd(), 'src/components/admin/ui.tsx'),
      'utf8'
    );

    const tableRow = source.slice(
      source.indexOf('export function TableRow'),
      source.indexOf('export function Cell')
    );

    expect(tableRow).not.toContain('<td');
    expect(source.slice(source.indexOf('export function Cell'))).toContain('absolute inset-0');
  });
});
