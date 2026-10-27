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

Since 2026-10-27 (Rahman: „bring them all") also everyone the periods miss: a booking for an exam — it has
no period — whose sitting is in 2024 or later (taken) or ran in the last four weeks or later (not taken), and
everyone with an open place on the waiting list (no booking yet) from the last twelve months. The telc B2
sitting of 13.11. showed 7 booked where SchoolMan had 21, and „Platz anbieten" could have offered a full date.
"""
import functools
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
    return chosen | _missed_by_periods(today)


@functools.lru_cache(maxsize=1)
def _missed_by_periods(today):
    """Exam bookings and open waiting-list places: read once per reader, from SchoolMan or its copy."""
    from fm_read import column  # the readers put scripts/filemaker on the path first

    since = (today - timedelta(days=today.weekday() + 28)).isoformat()
    year_ago = (today - timedelta(days=365)).isoformat()
    sitting = {}
    for exam, day in zip(column('SingleDateExam', '_ID_Exam'), column('SingleDateExam', 'ZSingleDate')):
        on = _iso(day)
        if _first(exam) and on and on > sitting.get(_first(exam), ''):
            sitting[_first(exam)] = on
    chosen = set()
    for person, exam, done in zip(column('Booking', '_ID_Person'), column('Booking', '_ID_Exam'), column('Booking', '_ID_EnrolmentDone')):
        on = sitting.get(_first(exam))
        if not (_first(person) and on):
            continue
        if (on >= since) if _first(done) in NOT_TAKEN else (on >= since or on[:4] >= HISTORY_YEARS[0]):
            chosen.add(_first(person))
    pre_person = dict(zip((_first(v) for v in column('PreBooking', '__ID_PreBooking')), (_first(v) for v in column('PreBooking', '_ID_Person'))))
    for person, pre, booking, made in zip(column('WaitingRoom', '_ID_Person'), column('WaitingRoom', '_ID_PreBooking'),
                                          column('WaitingRoom', '_ID_Booking'), column('WaitingRoom', 'DateOfCreation')):
        who = _first(person) or pre_person.get(_first(pre), '')
        if who and not _first(booking) and (_iso(made) or '') >= year_ago:
            chosen.add(who)
    return chosen
