"""Read SchoolMan's exam parts: the day and hours of each part of an exam, and who examines it — read-only (AppleScript).

    python3 -I scripts/filemaker/read_exams.py --stats   # counts only
    python3 -I scripts/filemaker/read_exams.py | DATABASE_URL=... node scripts/filemaker/import-exams.mjs [--dry-run]

Mapping review 2026-10-26 §5: a sitting's date came from `Exam::Exam.ZSingleDate_OneLine`, an unstored
calculation over `SingleDateExam`, and the parts and their examiners did not come across. A
`SingleDateExam` row is one part of an exam on its day: `_ID_PartExamReference` 1 written, 2 oral, 3 both,
its hours, and the examiner (`_ID_StaffMember`). Only ids and times leave this script.

Since 2026-10-27 (0093) also each exam's kind (`Exam._ID_ExamReference`) and places (`NumberPlace`), so every
sitting ahead comes across, not only those a learner of the sample booked; and the exam preparations that
lead to it (`Course._ID_Exam`).
"""
import collections, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column  # noqa: E402

PART = {'1': 'written', '2': 'oral', '3': 'full'}


def first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


def iso(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def hhmm(value):
    m = re.match(r'\s*(\d{1,2}):(\d{2})', value or '')
    return f'{int(m.group(1)):02d}:{m.group(2)}' if m else None


F = ['_ID_Exam', 'ZSingleDate', 'HourStart', 'HourEnd', '_ID_PartExamReference', '_ID_StaffMember']
parts = collections.defaultdict(list)
for row in zip(*[column('SingleDateExam', f) for f in F]):
    r = dict(zip(F, row))
    if first(r['_ID_Exam']) and iso(r['ZSingleDate']):
        parts[first(r['_ID_Exam'])].append(r)

exams = {r[0].strip(): r for r in zip(column('Exam', '__ID_Exam'), column('Exam', '_ID_ExamReference'), column('Exam', 'NumberPlace'))}
preparations = collections.defaultdict(list)
for course, exam in zip(column('Course', '__ID_Course'), column('Course', '_ID_Exam')):
    if first(exam) and course.strip():
        preparations[first(exam)].append(course.strip())

out = []
for exam, rows in sorted(parts.items()):
    starts = [hhmm(r['HourStart']) for r in rows if hhmm(r['HourStart'])]
    ends = [hhmm(r['HourEnd']) for r in rows if hhmm(r['HourEnd'])]
    examiners = collections.defaultdict(set)
    for r in rows:
        if first(r['_ID_StaffMember']) and PART.get(first(r['_ID_PartExamReference'])):
            examiners[first(r['_ID_StaffMember'])].add(PART[first(r['_ID_PartExamReference'])])
    _, ref, places = exams.get(exam, ('', '', ''))
    out.append({'exam': exam, 'ref': first(ref) or None, 'places': places.strip() or None, 'courses': preparations.get(exam, []),
                'day': min(iso(r['ZSingleDate']) for r in rows), 'from': min(starts) if starts else None, 'to': max(ends) if ends else None,
                # Examining the written and the oral part is examining the whole exam.
                'examiners': [{'staff': s, 'part': 'full' if 'full' in p or {'written', 'oral'} <= p else p.pop()} for s, p in sorted(examiners.items())]})

if '--stats' in sys.argv:
    print('exams with parts', len(out), '· with hours', sum(1 for o in out if o['from'] and o['to']), '· examiners', sum(len(o['examiners']) for o in out),
          '· by kind', collections.Counter(o['ref'] for o in out).most_common(), '· with a preparation course', sum(bool(o['courses']) for o in out))
    sys.exit(0)

json.dump(out, sys.stdout)
