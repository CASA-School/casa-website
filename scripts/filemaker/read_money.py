"""Read the rest of SchoolMan's learner ledger — read-only (AppleScript).

    python3 -I scripts/filemaker/read_money.py --stats    # counts only
    python3 -I scripts/filemaker/read_money.py | node scripts/filemaker/import-money.mjs [--dry-run]

For the sample's bookings (`sample.py`): the payment plans (`Instalment`: the part, its day, its amount,
paid — `_ID_PaymentDone` 1 ja, 2 nein), an agency's commission on a charge (`Commission`: the charge, its
amount, the share, the commission, paid out — `_ID_PaymentCommission`), the money paid out
(`PaymentOut` by `_ID_PaymentOutReference`: 1 rent to a host — its place, or its stay
(`_ID_DateAccommodation`) on the newer ones — 2 commission to an agency, 4 straight to an
agency, none said — a refund, 3, came with the learners as a payment below zero), the invoice numbers
stamped on their charges (`CostDetail._ID_SerialNumberInvoice`); and the invoices (`Invoice`) of those
bookings and to the agencies and companies.

The JSON goes to stdout and straight into the importer: nothing is written to a file.
"""
import collections, json, os, re, sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column  # noqa: E402
from sample import sample_persons  # noqa: E402


def table(name, *fields):
    cols = [column(name, f) for f in fields]
    return [dict(zip(fields, row)) for row in zip(*cols)]


def first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


def iso(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def number(value):
    v = (value or '').strip().replace(' ', '').replace('€', '')
    if not v:
        return None
    if ',' in v:
        v = v.replace('.', '').replace(',', '.')
    try:
        return round(float(v), 2)
    except ValueError:
        return None


def text(*parts):
    return '\n'.join(p.strip() for p in parts if p and p.strip())


def yes_no(value):
    return {'1': True, '2': False}.get(first(value))


bookings = {b['__ID_Booking'].strip(): b for b in table('Booking', '__ID_Booking', '_ID_Person', '_ID_EnrolmentDone', '_ID_Group') if b['__ID_Booking'].strip()}
chosen = sample_persons(bookings, table('DateBooking', '_ID_Booking', 'ZStartDate', 'ZEndDate'), date.today())
ours = {bid for bid, b in bookings.items() if first(b['_ID_Person']) in chosen}

instalments = [{'id': r['__ID_Instalment'].strip(), 'booking': first(r['_ID_Booking']), 'position': int(first(r['OrdinalNumber'])) if first(r['OrdinalNumber']).isdigit() else None,
                'label': r['InstalmentDetail_1'].strip() or None, 'due': iso(r['Z_DatePaymentDue']), 'amount': number(r['Instalment']), 'paid': yes_no(r['_ID_PaymentDone'])}
               for r in table('Instalment', '__ID_Instalment', '_ID_Booking', 'OrdinalNumber', 'InstalmentDetail_1', 'Z_DatePaymentDue', 'Instalment', '_ID_PaymentDone')
               if first(r['_ID_Booking']) in ours and number(r['Instalment']) is not None]

commissions = [{'id': r['__ID_Commission'].strip(), 'booking': first(r['_ID_Booking']), 'agency': first(r['_ID_Agency']) or None, 'company': first(r['_ID_Corporate']) or None,
                'charge': first(r['_ID_CostDetail']) or None, 'label': r['CostDetail_1'].strip() or None, 'base': number(r['CostGross']),
                'percentage': number(r['Percentage']), 'amount': number(r['Commission']), 'paid': yes_no(r['_ID_PaymentCommission'])}
               for r in table('Commission', '__ID_Commission', '_ID_Booking', '_ID_Agency', '_ID_Corporate', '_ID_CostDetail', 'CostDetail_1', 'CostGross', 'Percentage',
                              'Commission', '_ID_PaymentCommission')
               if first(r['_ID_Booking']) in ours and number(r['Commission']) is not None]

KIND = {'1': 'host_rent', '2': 'agency_commission', '4': 'agency_direct'}
payouts = []
for r in table('PaymentOut', '__ID_PaymentOut', '_ID_Booking', '_ID_PaymentOutReference', '_ID_Accommodation', '_ID_DateAccommodation', '_ID_Agency', '_ID_Corporate', 'PaymentOut',
               'ZSingleDatePayment', 'MethodPayment_1', 'PaymentOutDetailReference_1', 'PaymentOutComment_1', 'Comment'):
    kind = first(r['_ID_PaymentOutReference'])
    if first(r['_ID_Booking']) not in ours or kind == '3' or number(r['PaymentOut']) is None:
        continue
    payouts.append({'id': r['__ID_PaymentOut'].strip(), 'booking': first(r['_ID_Booking']), 'kind': KIND.get(kind, 'other'), 'accommodation': first(r['_ID_Accommodation']) or None,
                    # The newer rent payouts name the stay, not the place.
                    'stay': first(r['_ID_DateAccommodation']) or None, 'agency': first(r['_ID_Agency']) or None, 'company': first(r['_ID_Corporate']) or None, 'amount': number(r['PaymentOut']),
                    'paid': iso(r['ZSingleDatePayment']), 'method': r['MethodPayment_1'].strip() or None,
                    'note': text(r['PaymentOutDetailReference_1'], r['PaymentOutComment_1'], r['Comment']) or None})

stamps = [{'charge': r['__ID_CostDetail'].strip(), 'invoice': first(r['_ID_SerialNumberInvoice'])}
          for r in table('CostDetail', '__ID_CostDetail', '_ID_Booking', '_ID_SerialNumberInvoice') if first(r['_ID_Booking']) in ours and first(r['_ID_SerialNumberInvoice'])]

invoices = []
for r in table('Invoice', '__ID_Invoice', '_ID_SerialNumberInvoice', '_ID_Booking', '_ID_Person', '_ID_Agency', '_ID_Corporate', 'Amount', 'DateOfCreation', 'AddressHeader',
               'Subject'):
    booking, agency, company = first(r['_ID_Booking']), first(r['_ID_Agency']), first(r['_ID_Corporate'])
    if not (booking in ours or agency or company) or not first(r['_ID_SerialNumberInvoice']):
        continue
    invoices.append({'id': r['__ID_Invoice'].strip(), 'number': first(r['_ID_SerialNumberInvoice']), 'booking': booking if booking in ours else None,
                     'person': first(r['_ID_Person']) or None, 'agency': agency or None, 'company': company or None, 'amount': number(r['Amount']),
                     'issued': iso(r['DateOfCreation']), 'recipient': r['AddressHeader'].strip() or None, 'subject': r['Subject'].strip() or None})

out = {'instalments': instalments, 'commissions': commissions, 'payouts': payouts, 'stamps': stamps, 'invoices': invoices}

if '--stats' in sys.argv:
    print('sample bookings', len(ours), '· instalments', len(instalments), '· commissions', len(commissions), '· payouts', len(payouts),
          dict(collections.Counter(p['kind'] for p in payouts)), '· charges on an invoice', len(stamps), '· invoices', len(invoices),
          '(of the sample', sum(1 for i in invoices if i['booking']), ')')
    sys.exit(0)

json.dump(out, sys.stdout, ensure_ascii=False)
