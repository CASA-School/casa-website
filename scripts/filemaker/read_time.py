"""Read SchoolMan's working-time balances per colleague — by month and by year — read-only (AppleScript).

    python3 -I scripts/filemaker/read_time.py --stats    # counts only
    python3 -I scripts/filemaker/read_time.py | node scripts/filemaker/import-time.mjs [--dry-run]

Rahman, 2026-10-22: management sees each colleague's hours at one look on their page — the month's plus
or minus, the balance carried, the holidays left (docs/ADMIN_WORKSPACE.md §Staff, tab „Stunden").
SchoolMan keeps the month's time sheet (`SingleMonthStaff`: StaticBalanceWorkMonth, StaticBalanceWorkRunning,
StaticBalanceHolidayRunning, _ID_Approved) and the year (`SingleYearStaff`: NumberDayHolidayYear, the
carry-overs, StaticBalanceWorkRunning); the holidays left are worked out from the days (`holidays_taken`). The month's worked and target hours are not stored on it, and
summing the daily calculations (`SingleDayStaff.cal_*`) is too slow to read. This year and the two before.

2026-10-27 (completeness review, 0092): the rest of the time sheet — the day a month was approved, the hours
carried into a year (`OverhangWorkTime`; `OverhangWorkDay` is empty on every row) — and,
whole, the target hours per weekday of each contract period (`WeekDayWorkTime`), the time worked outside the
lessons (`AdminWork`, its kind from `TypeWorkReference` and never the free text `TypeWork_1`), and the leave
requests with their kind and the days approved (`DateHoliday`, `SingleDateHoliday`). Not a day's
`SingleDayStaff.Adjustment`: the Klassenbuch writes a teacher's correction there, and the office's adoption copies
it into `AdminWork` (`SetAdjustment.Loop_SingleDayStaff_SingleMonthStaff`) — 382 of the 443 corrections are there
with their day and hours; the rest wait in the Klassenbuch. Its `CommentAdjustment` also holds the kind of sick
note (`ak`/`pk`/`kk`, health data, not decided). The staff number, dates, hours, kinds
and these comments leave this script; all of it is seen in the workspace with `staff_private` only.
"""
import collections, json, os, re, sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column  # noqa: E402


def first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


def number(value):
    """SchoolMan writes „12,5", „-1.234,5" or „-3"; empty is none."""
    v = first(value)
    if ',' in v:
        v = v.replace('.', '').replace(',', '.')
    try:
        return round(float(v), 2) if v != '' else None
    except ValueError:
        return None


def month_of(start, year, month):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', start or '')
    if m:
        return f'{m.group(3)}-{int(m.group(2)):02d}'
    y, mo = first(year), first(month)
    return f'{y}-{int(mo):02d}' if y.isdigit() and mo.isdigit() and 1 <= int(mo) <= 12 else None


def iso(value):
    """`15.03.2021` → `2021-03-15`."""
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def clock(value):
    """`8:00` or `08:00:00` → `08:00`; anything else is no time."""
    m = re.match(r'\s*(\d{1,2}):(\d{2})', value or '')
    return f'{int(m.group(1)):02d}:{m.group(2)}' if m and int(m.group(1)) < 24 else None


def table(name, *fields):
    return [dict(zip(fields, row)) for row in zip(*[column(name, f) for f in fields])]


since = date.today().year - 2


def read():
    """The months and the years and the rest; a read FileMaker refuses leaves the step empty, not the bridge stopped."""
    try:
        return {'months': read_months(), 'years': read_years(), 'targets': read_targets(), 'work': read_work(), 'leave': read_leave(), 'complete': True}
    except RuntimeError as error:
        print(f'read_time: SchoolMan did not answer ({str(error)[:120]}); no working time this run', file=sys.stderr)
        return {'months': [], 'years': [], 'targets': [], 'work': [], 'leave': [], 'complete': False}


def read_months():
    M = ['__ID_SingleMonthStaff', '_ID_StaffMember', 'ZStartDate', 'YearSingleDay', 'MonthSingleDay',
         'StaticBalanceWorkMonth', 'StaticBalanceWorkRunning', 'StaticBalanceHolidayRunning', '_ID_Approved', 'DateApproval']
    months = []
    for r in (dict(zip(M, v)) for v in zip(*[column('SingleMonthStaff', f) for f in M])):
        staff, month = first(r['_ID_StaffMember']), month_of(r['ZStartDate'], r['YearSingleDay'], r['MonthSingleDay'])
        if not staff or not month or int(month[:4]) < since:
            continue
        months.append({'ref': first(r['__ID_SingleMonthStaff']), 'staff': staff, 'month': month,
                       'balance': number(r['StaticBalanceWorkMonth']), 'running': number(r['StaticBalanceWorkRunning']),
                       'holidayLeft': number(r['StaticBalanceHolidayRunning']), 'approved': first(r['_ID_Approved']) == '1',
                       'approvedOn': iso(r['DateApproval'])})
    return months


# SchoolMan's weekdays (`DayNumberReference`), 1 Sunday … 7 Saturday, as ISO weekdays (1 Monday).
ISO_WEEKDAY = {'1': 7, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6}


def read_targets():
    """The target hours per weekday, in the period of the contract row (`DateTargetWorkTime`) they belong to."""
    periods = {r['__ID_DateTargetWorkTime'].strip(): r for r in table('DateTargetWorkTime', '__ID_DateTargetWorkTime', 'ZStartDate', 'ZEndDate')}
    out = []
    for r in table('WeekDayWorkTime', '__ID_WeekDayWorkTime', '_ID_StaffMember', '_ID_DateTargetWorkTime', '_ID_DayNumberReference', 'TargetWorkTime',
                   'HourStartWorkTime', 'HourEndWorkTime', 'Break.Minute'):
        staff, weekday = first(r['_ID_StaffMember']), ISO_WEEKDAY.get(first(r['_ID_DayNumberReference']))
        hours = number(r['TargetWorkTime'])
        if not staff or not weekday or (hours is None and not clock(r['HourStartWorkTime'])):
            continue
        period = periods.get(first(r['_ID_DateTargetWorkTime']), {})
        out.append({'ref': first(r['__ID_WeekDayWorkTime']), 'staff': staff, 'weekday': weekday, 'hours': hours if hours is None or 0 <= hours <= 24 else None,
                    'from': iso(period.get('ZStartDate')), 'to': iso(period.get('ZEndDate')),
                    'start': clock(r['HourStartWorkTime']), 'end': clock(r['HourEndWorkTime']), 'break': number(r['Break.Minute'])})
    return out


# SchoolMan's kinds of work (`TypeWorkReference`); its eighth row, Elternzeit, has no id.
WORK_KIND = {'1': 'teaching', '2': 'administration', '3': 'correction', '4': 'material', '5': 'placement', '6': 'exam', '7': 'short_time', '9': 'compensation'}


def read_work():
    out = []
    for r in table('AdminWork', '__ID_AdminWork', '_ID_StaffMember', 'ZSingleDay', '_ID_TypeWorkReference', 'AdminWork', 'HourStart', 'HourEnd',
                   'CommentAdminWork', '_ID_Exam', '_ID_Course'):
        staff, day = first(r['_ID_StaffMember']), iso(r['ZSingleDay'])
        if not staff or not day:
            continue
        hours = number(r['AdminWork'])
        out.append({'ref': first(r['__ID_AdminWork']), 'staff': staff, 'date': day, 'kind': WORK_KIND.get(first(r['_ID_TypeWorkReference'])),
                    'hours': hours if hours is None or abs(hours) < 1000 else None, 'start': clock(r['HourStart']), 'end': clock(r['HourEnd']),
                    'note': (r['CommentAdminWork'] or '').strip() or None, 'exam': first(r['_ID_Exam']) or None, 'course': first(r['_ID_Course']) or None})
    return out



# SchoolMan's kinds of leave (`HolidayReference`).
LEAVE_KIND = {'1': 'holiday', '2': 'special', '3': 'unpaid', '4': 'overtime', '5': 'closure', '6': 'maternity', '7': 'parental'}


def read_leave():
    """A leave request with its working days (`SingleDateHoliday`, one per day) and those approved (status 1; a
    day is made „requested", 2, and approved by hand). A day without a date or whose request is gone is left out."""
    days = collections.defaultdict(dict)
    for r in table('SingleDateHoliday', '_ID_DateHoliday', 'ZSingleDateHoliday', '_ID_StatusHoliday'):
        request, day = first(r['_ID_DateHoliday']), iso(r['ZSingleDateHoliday'])
        if request and day:
            days[request][day] = days[request].get(day, False) or first(r['_ID_StatusHoliday']) == '1'
    out = []
    for r in table('DateHoliday', '__ID_DateHoliday', '_ID_StaffMember', 'ZStartDate', 'ZEndDate', '_ID_HolidayReference', 'CommentOnHoliday'):
        ref, staff, start, end = first(r['__ID_DateHoliday']), first(r['_ID_StaffMember']), iso(r['ZStartDate']), iso(r['ZEndDate'])
        if not ref or not staff or not start or not end or end < start:
            continue
        mine = days.get(ref, {})
        out.append({'ref': ref, 'staff': staff, 'kind': LEAVE_KIND.get(first(r['_ID_HolidayReference'])), 'from': start, 'to': end,
                    'days': sorted(mine), 'approved': sorted(d for d, ok in mine.items() if ok), 'note': (r['CommentOnHoliday'] or '').strip() or None})
    return out


def holidays_taken():
    """Holiday days taken per colleague and year, from the days themselves (`SingleDayStaff::_ID_Holiday`, 1 or ½).

    SchoolMan's `RemainingHoliday` subtracts the holidays of the year chosen on screen (the relationship
    runs over the global `StaffMember::_adjustYear`), not of the row's own year: its value depends on who
    reads it and when (2026-10-27, the Data API and FileMaker Pro gave 35 and 12 for the same row). The
    year's remaining holiday is worked out here from the facts it is made of instead."""
    taken = collections.Counter()
    for staff, day, holiday in zip(*[column('SingleDayStaff', f) for f in ('_ID_StaffMember', 'ZSingleDay', '_ID_Holiday')]):
        n, year = number(holiday), re.search(r'\b(\d{4})\b', day or '')
        if n and first(staff) and year:
            taken[(first(staff), int(year.group(1)))] += n
    return taken


def read_years():
    Y = ['__ID_SingleYearStaff', '_ID_StaffMember', 'YearSingleDay', 'NumberDayHolidayYear', 'OverhangHoliday', 'OverhangWorkDay', 'StaticBalanceWorkRunning',
         'OverhangWorkTime']
    taken = holidays_taken()
    years = []
    for r in (dict(zip(Y, v)) for v in zip(*[column('SingleYearStaff', f) for f in Y])):
        staff, year = first(r['_ID_StaffMember']), first(r['YearSingleDay'])
        if not staff or not year.isdigit() or int(year) < since:
            continue
        holidays = number(r['NumberDayHolidayYear'])
        left = None if holidays is None else holidays - taken[(staff, int(year))] + (number(r['OverhangHoliday']) or 0) + (number(r['OverhangWorkDay']) or 0)
        years.append({'ref': first(r['__ID_SingleYearStaff']), 'staff': staff, 'year': int(year), 'holidays': holidays,
                      'holidaysLeft': left, 'running': number(r['StaticBalanceWorkRunning']), 'carried': number(r['OverhangWorkTime'])})
    return years


out = read()
months, years = out['months'], out['years']

if '--stats' in sys.argv:
    print('months', len(months), sorted(collections.Counter(m['month'][:4] for m in months).items()),
          '· with a balance', sum(m['balance'] is not None for m in months), '· approved', sum(m['approved'] for m in months),
          '· approval date', sum(bool(m['approvedOn']) for m in months))
    print('years', len(years), sorted(collections.Counter(y['year'] for y in years).items()), '· with holidays', sum(y['holidays'] is not None for y in years),
          '· hours carried', sum(y['carried'] is not None for y in years))
    print('target days', len(out['targets']), '· work entries', len(out['work']), collections.Counter(w['kind'] for w in out['work']).most_common(),
          '· without hours', sum(w['hours'] is None for w in out['work']))
    print('leave requests', len(out['leave']), collections.Counter(r['kind'] for r in out['leave']).most_common(), '· days', sum(len(r['days']) for r in out['leave']),
          '· approved', sum(len(r['approved']) for r in out['leave']), '· all approved', sum(bool(r['days']) and len(r['days']) == len(r['approved']) for r in out['leave']),
          '· open', sum(bool(r['days']) and not r['approved'] for r in out['leave']))
    sys.exit(0)

json.dump(out, sys.stdout)
