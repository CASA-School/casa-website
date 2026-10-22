"""Read SchoolMan's working-time balances per colleague — by month and by year — read-only (AppleScript).

    python3 -I scripts/filemaker/read_time.py --stats    # counts only
    python3 -I scripts/filemaker/read_time.py | node scripts/filemaker/import-time.mjs [--dry-run]

Rahman, 2026-10-22: management sees each colleague's hours at one look on their page — the month's plus
or minus, the balance carried, the holidays left (docs/ADMIN_WORKSPACE.md §Staff, tab „Stunden").
SchoolMan keeps the month's time sheet (`SingleMonthStaff`: StaticBalanceWorkMonth, StaticBalanceWorkRunning,
StaticBalanceHolidayRunning, _ID_Approved) and the year (`SingleYearStaff`: NumberDayHolidayYear,
RemainingHoliday, StaticBalanceWorkRunning). The month's worked and target hours are not stored on it, and
summing the daily calculations (`SingleDayStaff.cal_*`) is too slow to read. This year and the two before.
Only the staff number, the month and the numbers leave this script.
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


since = date.today().year - 2


def read():
    """The months and the years; a read FileMaker refuses leaves the step empty, not the bridge stopped."""
    try:
        return read_months(), read_years()
    except RuntimeError as error:
        print(f'read_time: SchoolMan did not answer ({str(error)[:120]}); no working time this run', file=sys.stderr)
        return [], []


def read_months():
    M = ['__ID_SingleMonthStaff', '_ID_StaffMember', 'ZStartDate', 'YearSingleDay', 'MonthSingleDay',
         'StaticBalanceWorkMonth', 'StaticBalanceWorkRunning', 'StaticBalanceHolidayRunning', '_ID_Approved']
    months = []
    for r in (dict(zip(M, v)) for v in zip(*[column('SingleMonthStaff', f) for f in M])):
        staff, month = first(r['_ID_StaffMember']), month_of(r['ZStartDate'], r['YearSingleDay'], r['MonthSingleDay'])
        if not staff or not month or int(month[:4]) < since:
            continue
        months.append({'ref': first(r['__ID_SingleMonthStaff']), 'staff': staff, 'month': month,
                       'balance': number(r['StaticBalanceWorkMonth']), 'running': number(r['StaticBalanceWorkRunning']),
                       'holidayLeft': number(r['StaticBalanceHolidayRunning']), 'approved': first(r['_ID_Approved']) == '1'})
    return months


def read_years():
    Y = ['__ID_SingleYearStaff', '_ID_StaffMember', 'YearSingleDay', 'NumberDayHolidayYear', 'RemainingHoliday', 'StaticBalanceWorkRunning']
    years = []
    for r in (dict(zip(Y, v)) for v in zip(*[column('SingleYearStaff', f) for f in Y])):
        staff, year = first(r['_ID_StaffMember']), first(r['YearSingleDay'])
        if not staff or not year.isdigit() or int(year) < since:
            continue
        years.append({'ref': first(r['__ID_SingleYearStaff']), 'staff': staff, 'year': int(year), 'holidays': number(r['NumberDayHolidayYear']),
                      'holidaysLeft': number(r['RemainingHoliday']), 'running': number(r['StaticBalanceWorkRunning'])})
    return years


months, years = read()

if '--stats' in sys.argv:
    print('months', len(months), sorted(collections.Counter(m['month'][:4] for m in months).items()),
          '· with a balance', sum(m['balance'] is not None for m in months), '· approved', sum(m['approved'] for m in months))
    print('years', len(years), sorted(collections.Counter(y['year'] for y in years).items()), '· with holidays', sum(y['holidays'] is not None for y in years))
    sys.exit(0)

json.dump({'months': months, 'years': years}, sys.stdout)
