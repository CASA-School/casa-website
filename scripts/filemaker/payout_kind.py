"""What a SchoolMan payout (`PaymentOut`) is — shared by `read_learners.py` (a refund is a payment below zero on
the learner's account) and `read_money.py` (the rest are payouts).

Since 2025 every payout names its kind (`_ID_PaymentOutReference`: 1 rent to a host, 2 commission to an
agency, 3 a refund to the learner, 4 a payment straight to an agency). 1,799 older ones (2019–2024) name
none; for them the payout's own facts say it (completeness review 2026-10-27, money-letters §C):
whether it counts in the learner's balance (`_ID_BalanceCount`: 1 yes, 2 no — SchoolMan's `Balance.Com`
subtracts the ones that count), the charge type it was written as (`_ID_CostDetailReference`: 16 refund or
commission, 3 rent), and who it went to (an agency, a host's place or stay).
"""

KINDS = {'1': 'host_rent', '2': 'agency_commission', '3': 'refund', '4': 'agency_direct'}


def _first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


def payout_kind(row):
    """`host_rent`, `agency_commission`, `agency_direct`, `refund` or `other`. The row needs `_ID_PaymentOutReference`,
    `_ID_Agency`, `_ID_Accommodation`, `_ID_DateAccommodation`, `_ID_BalanceCount` and `_ID_CostDetailReference`."""
    named = _first(row.get('_ID_PaymentOutReference'))
    if named:
        return KINDS.get(named, 'other')
    balance, charge = _first(row.get('_ID_BalanceCount')), _first(row.get('_ID_CostDetailReference'))
    if _first(row.get('_ID_Agency')):
        return 'agency_commission'
    if _first(row.get('_ID_Accommodation')) or _first(row.get('_ID_DateAccommodation')) or balance == '2' or charge == '3':
        return 'host_rent'
    if charge == '16':
        return 'refund'
    return 'other'
