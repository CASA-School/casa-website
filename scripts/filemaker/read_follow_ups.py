"""Read SchoolMan's follow-up dates on bookings — read-only (AppleScript).

    python3 -I scripts/filemaker/read_follow_ups.py --stats    # counts only
    python3 -I scripts/filemaker/read_follow_ups.py | node scripts/filemaker/import-follow-ups.mjs [--dry-run]

SchoolMan's letter scripts set a „Wiedervorlage" when a letter goes out (`SingleDateControl`: the day, the
script that set it, the booking, who). It holds no text and no done mark; the reason is said from the
script („Nach der 2. Zahlungserinnerung"). Every row with a booking and a day; the importer keeps those
of the bookings that came across with the learners.

The JSON goes to stdout and straight into the importer: nothing is written to a file.
"""
import collections, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column  # noqa: E402


def first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


def iso(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def stamp(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?', value or '')
    if not m:
        return None
    hh, mm, ss = (int(m.group(4)), int(m.group(5)), int(m.group(6) or 0)) if m.group(4) else (12, 0, 0)
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}T{hh:02d}:{mm:02d}:{ss:02d}'


# The letter that set it, in words: what to look at again.
REASONS = [
    (r'^Confirmation\.First_Booking', 'Nach der Buchungsbestätigung: Anzahlung prüfen'),
    (r'^Confirmation\.Exam_Booking', 'Nach der Prüfungsbestätigung: Zahlung prüfen'),
    (r'^1\.Reminder', 'Nach der 1. Zahlungserinnerung'),
    (r'^2\.Reminder.*Unterkunft', 'Nach der 2. Zahlungserinnerung (Unterkunft)'),
    (r'^2\.Reminder', 'Nach der 2. Zahlungserinnerung'),
    (r'^Reminder_BookingExam', 'Nach der Prüfungserinnerung'),
    (r'^RightLevel', 'Nach dem Brief zum Niveau'),
    (r'^Cancel', 'Nach der Stornierung'),
    (r'^Deactivate', 'Nach der Deaktivierung'),
    (r'^(WriteInvoice|InvoiceStudent)', 'Nach der Rechnung: Zahlung prüfen'),
]


def reason(script):
    return next((text for pattern, text in REASONS if re.search(pattern, script or '')), 'Wiedervorlage aus SchoolMan')


F = ['__ID_SingleDateControl', '_ID_Booking', 'ZSingleDate', 'ScriptName', 'UserName', 'TimeStampOfCreation']
rows = [dict(zip(F, r)) for r in zip(*[column('SingleDateControl', f) for f in F])]
out = [{'id': r['__ID_SingleDateControl'].strip(), 'booking': first(r['_ID_Booking']), 'due': iso(r['ZSingleDate']), 'reason': reason(r['ScriptName'].strip()),
        'author': r['UserName'].strip() or None, 'created': stamp(r['TimeStampOfCreation'])}
       for r in rows if first(r['_ID_Booking']) and iso(r['ZSingleDate']) and r['__ID_SingleDateControl'].strip()]

if '--stats' in sys.argv:
    print('follow-ups', len(rows), '· with a booking and a day', len(out), '·', dict(collections.Counter(o['reason'] for o in out).most_common(6)))
    sys.exit(0)

json.dump(out, sys.stdout, ensure_ascii=False)
