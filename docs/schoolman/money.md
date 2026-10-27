# Money — charges, payments, instalments, invoices, commission, payouts

Part of the SchoolMan study (`README.md`). Live and read-only, 2026-10-15: counts only.

## The tables

| Table | Rows | 2026 | What a row is |
| --- | ---: | ---: | --- |
| `CostDetail` | 79,482 | 11,305 new | **A charge** on a booking: what (27 kinds), units, price, total |
| `CostDetailSample` | 1,780 | 279 new | A charge prepared on an offer or a course, before a booking exists |
| `PaymentIn` | 51,523 | 8,193 paid in 2026 | **A payment received** against a booking |
| `Instalment` | 4,128 | 567 new | One instalment of a payment plan, with its due date |
| `Invoice` | 1,335 | 218 new | An invoice (mostly to companies and groups) |
| `Commission` | 4,869 | 754 new | An agency's commission on one charge |
| `PaymentOut` | 6,348 | 1,591 new | **Money paid out**: rent to a host (1,997), commission to an agency (1,365), a refund to a learner (1,184) |
| `Order`, `OrderDetail` | 506, 2,139 | 22 / 68 new | Book orders to publishers |
| `BankAccount` | 1,945 | 228 new | An IBAN — learners (76%), hosts, agencies, staff |

## What is charged

`CostDetail._ID_CostDetailReference`: **books 36,372** (one line per book), course fee 24,840,
enrolment fee 4,431, accommodation 3,707, cancellation 2,374, deposit 2,124, exam fee 2,099,
accommodation placement 804 — 34 kinds in the vocabulary. The amounts (`Unit`, `CostGrossUnit`,
`CostGross`) are auto-entered fields: FileMaker fills in units × price, a colleague or a script may
change it. VAT is set on 17%.

## How payments arrive

`PaymentIn._ID_MethodPayment`: bank transfer 32,240 · card 8,819 · cash 5,524 · **carry-over 4,836**
(money moved from one booking to another, recorded as a payment) · offsetting 28. Every payment has
a date and an amount, and 98% point at a `StaffSchool` record (12 rows — what it stands for is to confirm).

## How it is made

- Course prices are **written by scripts from price tables typed into the script**:
  `WriteCoursePriceInternationalAirport_Booking` (weeks × a price, plus a 50 € registration fee
  once), `WriteCoursePriceCentralStation_Booking` (lessons × a rate per course type),
  `SetPrice_Exam_NationalAirport`, `WriteAccommodationPrice` (only the standard room; otherwise
  "calculate by hand"). Changing a price means editing a script (LESSONS §11.7).
- Books: one charge per book handed out (`SetNewBook_Booking`, `WriteBook.Parameter_Booking`).
- A mistake is corrected with a **reversing line** (`MakeReversal_CostDetail_Booking`), not a delete
  — the one habit worth keeping.
- Payments: `Write1CostDetail.PaymentIn` (one charge), `ImportSelectedCostDetail_PaymentIn_Booking`
  (several); instalment plans of 2 or 3 parts (`WriteInstalmentPlan.Dynamic.Platform_Booking`,
  refused under 50 €); invoices stamp their number onto the charges they cover.
- The booking's balance is **stored** (`Balance.Gross/Net/Com.Number`) and rewritten by scripts, beside
  the lines it sums (LESSONS §6).

The team works in `CostDetail`, `PaymentIn`, `PaymentIn_Form`, `Instalment`, `Invoice`, `PaymentOut`.

## Oddities

- Payment dates in 2029 and 2323 — typing slips nothing stopped.
- `Commission` copies the charge's amounts onto itself instead of pointing at them.

## Who works with it

**Finance** handles payouts, commission, time sheets and the payments to host families (Rahman,
2026-10-15). Finance's accounting system is **DATEV**: SchoolMan records what learners are charged
and pay, but no expenses and little else of the books — so finance depends on DATEV, and SchoolMan's
money tables are a learner ledger, not the accounts.

## In the workspace today

`booking_charges`, `payments`, `rates` (the price lists, Settings → Prices) and `charge_types`. Prices
are rows with a validity, not script text. Since 2026-10-18 (migration 0063) also, read as SchoolMan has
them and written by nothing: payment plans (`booking_instalments`), an agency's commission per charge
(`booking_commissions`), money paid out (`payouts`: rent to hosts — found through the stay on the newer
ones —, commission to agencies), invoices (`invoices`, with their number stamped on the charges) —
docs/ADMIN_WORKSPACE.md §Money from SchoolMan. `PaymentOutReference`: 1 Mietzahlung an Gastgeber,
2 Auszahlung Kommission Agentur, 3 Rückzahlung Student, 4 Direktzahlung an Agentur; 1,799 payouts name no
kind. `_ID_Payment_Done` on payouts is „nein" on 6,338 of 6,348 — read as nothing.

## For the bridge

- Money moves last, because finance works there every day and depends on DATEV beside it. Until then
  the workspace **reads** a booking's charges, payments and open balance for display, and writes
  nothing.
- Never carry the stored balances; sum the lines.
- When money moves, the question is what goes to DATEV and how — the export, not the screen, is the
  hard part. Rahman will ask finance what they export today; the aim is an **automated link between
  DATEV and the workspace** that saves finance the work, designed with them.

## Carry-over

When a booking is overpaid or carries a credit (*Guthaben*), the money is carried over to another
booking (Rahman, 2026-10-16) — 4,836 payments are recorded that way.

**Built (2026-10-16, migration 0030):** „Guthaben übertragen" on a booking that holds a credit moves
it to another booking of the same learner as two linked payment lines, minus and plus, voided
together (`docs/ADMIN_WORKSPACE.md` §Lists 20).

Checked 2026-10-27 (completeness review): a carry-over in SchoolMan is two hand-typed payments with
method 7, minus on the source booking and plus on the target (1,101 / 1,120 since 2025), and nothing links
them. Both come across as payments; pairing them (by learner, amount and day) into `transfer_id` /
`counterpart_booking_id` is not done — it would be an inference, not a SchoolMan fact.

## Completeness (2026-10-27, migration 0094)

What the completeness review found SchoolMan holds on its own money records, and the bridge now reads:

- **A payment** names the charge it settles (`PaymentIn._ID_CostDetail` → `payments.charge_id`; shown as
  „für …" on the payment line), the instalment it paid (`_ID_Instalment` → `payments.instalment_id`; „bezahlt
  am …" on the instalment) and the office account that booked it (`_ID_StaffSchool`; `StaffSchool` names the
  colleague of the register → `payments.recorded_by_staff_id`; „gebucht von …" on the line). The charge's own
  flag `_ID_CostDetailSet` is a stale copy and is not read.
- **A charge** names its book (`_ID_BookReference` → `booking_charges.material_id`) and whether it is one of a
  reversal pair (`_ID_CancellationSet`, or the sub-label „Storno" of `CostDetailReferenceComment` →
  `booking_charges.reversed`): the booking page folds a marked pair only with each other. A „Storno" line's
  `TimeStampOfCreation` is `Get(CurrentTime)` — the year 1 —, so its day comes from `DateOfCreation` (3,806
  lines repaired locally; 50 more sit on bookings outside the sample and are repaired when their learner is read).
- **A payout** keeps the period a rent covers (`ZStartDate`/`ZEndDate`) and how it was paid by its method number,
  not the label copied beside it. The 1,799 older payouts with no kind are classified by their own facts
  (`scripts/filemaker/payout_kind.py`: an agency → commission; a host's place or stay, balance „no", or charge
  type 3 → rent; charge type 16 counting in the balance → a refund to the learner). The refunds are payments below
  zero on the learner's account, as kind 3 always was. **This changes balances of 2019–2024 bookings**: measured
  locally, 161 bookings in the workspace change — 78 credits close, 75 bookings that were settled now show an
  amount owing (mostly 2023) — to be checked with finance against SchoolMan's `Balance.Gross`, which subtracts
  kind-3 refunds only.
- **An invoice** says whether its number was cancelled (`_ID_Reversal`), the offer it was made from and the group
  visit it is for, and bills the party (`_ID_Management`) or its institution when it names no agency or company.
  The booking's and the organisation's invoices say „storniert"; the offer and the group show theirs.

Left for Rahman: the bank account a payout went to (`PaymentOut._ID_BankAccount`).

## Open questions

1. What finance exports to DATEV today — to discuss with finance later, not now.
