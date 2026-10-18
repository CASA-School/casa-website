"""The learner sample the readers share (2026-10-17, docs/schoolman/learner-transfer.md).

Rahman: a sample first, to see what the workspace is missing. Everyone in a course this week or
starting one in the next four weeks — a `DateBooking` period that runs then, of a booking that is not
„nein" or „storno". `read_learners.py` brings these people across; `read_organisations.py` the
agencies and companies they depend on. One rule, so the two never drift apart.
"""
import re
from datetime import date, timedelta

NOT_TAKEN = {'2', '3'}  # Booking._ID_EnrolmentDone: 2 nein, 3 storno


def _first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


def _iso(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def sample_persons(bookings, periods, today=None):
    """SchoolMan person ids of the sample, from `Booking` rows by id (with `_ID_Person`,
    `_ID_EnrolmentDone`) and `DateBooking` rows (with `_ID_Booking`, `ZStartDate`, `ZEndDate`)."""
    today = today or date.today()
    monday = (today - timedelta(days=today.weekday())).isoformat()
    until = (today + timedelta(days=28)).isoformat()
    chosen = set()
    for p in periods:
        b = bookings.get(_first(p['_ID_Booking']))
        s, e = _iso(p['ZStartDate']), _iso(p['ZEndDate'])
        if b and s and e and s <= until and e >= monday and _first(b['_ID_EnrolmentDone']) not in NOT_TAKEN and _first(b['_ID_Person']):
            chosen.add(_first(b['_ID_Person']))
    return chosen
