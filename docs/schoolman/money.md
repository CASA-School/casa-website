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

## In the workspace today

`booking_charges`, `payments`, `rates` (the price lists, Settings → Prices) and `charge_types`. Prices
are rows with a validity, not script text. There are no invoices, instalment plans, commissions or
payouts.

## For the bridge

- Money is where FileMaker stays the record longest — the finance team works there. The workspace
  should **read** a booking's charges, payments and open balance for display, and write nothing.
- Never carry the stored balances; sum the lines.

## Open questions for the team

1. Who works with payouts and commission, and would they ever move?
2. Is "carry-over" a payment or a transfer between bookings in the team's own words?
