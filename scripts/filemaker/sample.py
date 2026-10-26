"""The learner sample the readers share (2026-10-17, docs/schoolman/learner-transfer.md).

Rahman: a sample first, to see what the workspace is missing. Everyone in a course this week or
starting one later — a `DateBooking` period that runs then, of a booking that is not „nein" or „storno". `read_learners.py` brings these people across; `read_organisations.py` the
agencies and companies they depend on. One rule, so the two never drift apart.

Since 2026-10-18 also the participants of this year's group visits (`Booking._ID_Group`, a period in
this calendar year), so a group's page has its people: `read_groups.py` brings the groups.

Since 2026-10-21 also everyone with a booking taken whose period began in 2024 or 2025 (Rahman: „all of
2024 and 2025", for what is still open from those years — Buchungen's year row). Their other bookings
come with them, as every chosen person's do.

Since 2026-10-26 everyone with a booking that runs this week or later, however far ahead, and everyone
with a booking set to „nein" or „storno" whose period ran in the last four weeks or later. A learner moved
to a course months ahead, or cancelled, used to fall out of the sample and keep their old place in the
workspace: the start day's B1.1 showed 17 learners where SchoolMan had 15.
"""
import re
from datetime import date, timedelta

NOT_TAKEN = {'2', '3'}  # Booking._ID_EnrolmentDone: 2 nein, 3 storno
HISTORY_YEARS = ('2024', '2025')  # whole years brought across (2026-10-21)


def _first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


def _iso(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def sample_persons(bookings, periods, today=None):
    """SchoolMan person ids of the sample, from `Booking` rows by id (with `_ID_Person`,
    `_ID_EnrolmentDone`, `_ID_Group`) and `DateBooking` rows (with `_ID_Booking`, `ZStartDate`, `ZEndDate`)."""
    today = today or date.today()
    monday = (today - timedelta(days=today.weekday())).isoformat()
    since = (today - timedelta(days=today.weekday() + 28)).isoformat()
    new_year = date(today.year, 1, 1).isoformat()
    chosen = set()
    for p in periods:
        b = bookings.get(_first(p['_ID_Booking']))
        s, e = _iso(p['ZStartDate']), _iso(p['ZEndDate'])
        if not (b and s and e and _first(b['_ID_Person'])):
            continue
        # A booking that did not work out still comes, so the workspace learns it was cancelled.
        if _first(b['_ID_EnrolmentDone']) in NOT_TAKEN:
            if e >= since:
                chosen.add(_first(b['_ID_Person']))
            continue
        if e >= monday or (_first(b.get('_ID_Group')) and e >= new_year) or s[:4] in HISTORY_YEARS:
            chosen.add(_first(b['_ID_Person']))
    return chosen
