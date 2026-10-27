# Mapping completeness — money, letters and history (2026-10-27)

Read-only review. Sources: the gap lists, the profiles, the 26.10 field definitions, the 1,360 scripts, the local
copy (`schoolman_records`, keyed by each table's `__ID_` field — its `record_id` is FileMaker's internal record id),
the local workspace database, and one batch of column reads from SchoolMan through `fm_read.column` (ids, codes and
dates only; about 30 seconds, nothing written). „Since 2025" below is by `TimeStampOfCreation` (charges: `DateOfCreation`,
see finding 2), so a few figures differ slightly from `gaps.txt`. No personal data in this file.

## 1. Summary

**173 gap fields in 10 tables:** MAP 46 · ALREADY 7 · COPY 63 · PLUMBING 38 · ABANDONED 15 · DECIDE 4.
**42 not-covered tables of this area, in 31 rows** (§3): MAP 3 · ALREADY 5 · COPY 2 · PLUMBING 9 · ABANDONED 6 · DECIDE 3 · another area's 3.

The most important missing facts and defects, first:

1. **Letters that name several bookings land on the first one only.** `Letter._ID_Booking` is a list on 6,497 letters
   (a learner's confirmation or visa letter for several bookings; course-wide letters — room change, course start, a letter
   to a whole course, exam invitations — with every learner's booking). The readers take `first()`. In the workspace now:
   4,960 letters sit on one of the learner's bookings, and **929 course-wide letters sit on one learner** (the first
   booking's), invisible to the others. Not a gap field — a reading defect (`read_learners.py` `owner()`/`first()`).
2. **3,856 imported charges have `created_at` in the year 1.** `MakeReversal_CostDetail_Booking` writes
   `TimeStampOfCreation = Get(CurrentTime)` (a time into a timestamp) on every „Storno" line; its real day is in
   `DateOfCreation` (set to `$$_Today`), which no layout carries. 4,992 reversal lines since 2025.
3. **Which charge a payment settles** (`PaymentIn._ID_CostDetail`): 11,350 payments since 2025 in the workspace name a
   charge that is also there. Receipts and open items per line need it. Plus who booked the payment (`_ID_StaffSchool`,
   resolvable for 18,317 of 18,464) and which instalment it paid (`_ID_Instalment`).
4. **The kind of every history line** (`WorkFlow._ID_ProcessReference`): accounting 21,094, learning progress 12,669,
   intake 5,843, accommodation 2,917 … since 2025. History arrives as one undifferentiated stream. With it: whether a
   colleague typed the line or a script wrote it (`_ID_History`), and the 421 absence notices' day, lessons and „excused".
5. **Certificates of participation sent** (`WorkFlowLetter._ID_CertificateDone`): 2,259 since 2025 (1,910 on bookings in
   the workspace) — no `Letter` row exists for them, so the workspace does not know a certificate went out.
6. **Payouts with no kind are misread.** 1,799 older payouts (2020–2024) name no `_ID_PaymentOutReference`; the workspace
   holds 635 of them as `other`. `_ID_BalanceCount` + `_ID_CostDetailReference` classify them (charge type 16 + balance 1
   + no agency = a refund to the learner) — today those refunds are missing from the learner's account, so open amounts
   of 2022–2024 bookings are off.
7. **2,581 confirmations in the workspace lack their totals paragraph** (`Letter.FreeField_2`: Gesamtbetrag / Kommission /
   Nettobetrag).
8. **Host letters are filed as letters to the learner**: 1,176 letters in the workspace name a workspace place
   (`Letter._ID_Accommodation`) and have `accommodation_id` empty; the addressee party is in `_ID_Management`.
9. **Notes on courses** (`Comment._ID_Course`, 379 since 2025, none in the workspace) and **notes on parties** (52 since 2025).
10. Smaller facts: the rent period of a host payout (`ZStartDate`/`ZEndDate`, 1,153 of 1,159), a cancelled invoice number
    (`Invoice._ID_Reversal`, 25 in the workspace look valid), the book on a book charge (`_ID_BookReference`, 8,662),
    a charge's reversal pair (`_ID_CancellationSet`), waiting-list letters on their entry, invoice letters on their invoice,
    the signer of a letter, and a calendar task's title and addressee.

**Policy questions for Rahman (DECIDE):** the payee bank account of payouts; letters and notes about colleagues (HR);
the document links (`Url`); the office handbook (`Emanuel` + `Medium`). Three confirmations inside MAP groups are in §5.

## 2. Field verdicts per table

„recent" = filled on records created since 2025 (from `gaps.txt`).

### CostDetail — charges (21 fields: COPY 12 · PLUMBING 6 · MAP 3)

| Field | recent | Verdict | Meaning | Target in workspace | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Provider` | 25,284 | **PLUMBING** | A second serial number under a link's name | — | SERIAL in the schema; 78,950 distinct values on 78,950 rows; no script writes it |
| `_ID_Platform` | 25,258 | **COPY** | Business line of the booking (1 intensive, 4 evening/special, 2 exams) | the booking | `$_ID_Platform` = `Booking::_ID_Platform` in all 14 charge scripts |
| `_ID_Person` | 22,067 | **COPY** | The learner | via `booking_charges.booking_id` | `Booking::_ID_Person` (NewCostDetail_Booking, Write…Price, WriteBook…); only 24 of 79,929 charges have no booking |
| `_ID_Student` | 17,839 | **COPY** | Learner number | the person's `filemaker_links` (ID_Student) | `Booking::_ID_Student` in 10 scripts |
| `_ID_Course` | 17,501 | **COPY** | The booking's current course at the moment the line was written (on company-course charges: that course) | `booking_periods` | `$_ID_Course = Booking::_ID_Course` (NewCostDetail_Booking, WriteBook…, SetNewBook…); the course-price scripts do not set it, so it is a snapshot, not the period a charge pays for |
| `_ID_InternationalAirport` | 16,559 | **PLUMBING** | Key of the booking's intensive-line record | — | `Booking::_ID_InternationalAirport` |
| `_ID_Client` | 16,061 | **COPY** | Customer number | person's customer number (0061) | `Booking::_ID_Client` |
| `_ID_BookReference` | 12,031 | **MAP** | Which book a book charge (type 20) is for | `booking_charges.material_id` → `materials` (all 36 books have `filemaker_id`) | written by WriteBook.Parameter_Booking / SetNewBook_Booking from `BookReference`; since 2025 9,780 book lines name a book, 8,662 of them are charges in the workspace |
| `_ID_CourseTypeReference` | 11,099 | **COPY** | Course type of the booking | the booking | `Booking::_ID_CourseTypeReference` (3 scripts) |
| `_ID_Selected` | 9,862 | **PLUMBING** | Selection mark for "pay / reverse the selected lines" | — | SelectAllCostDetail…, MakeReversal…; 44,224 of 44,427 values are 1 |
| `_ID_CancellationSet` | 9,192 | **MAP** | The line belongs to a reversal pair: set on the original and on its „Storno" copy | `booking_charges.reversed` (new, boolean) | only writer MakeReversal_CostDetail_Booking (steps 8 and 12: original, then the duplicate); 9,362 lines since 2025 by `DateOfCreation` |
| `_ID_CostDetailReferenceComment` | 4,915 | **MAP** | Standard sub-label of a charge (29-row vocabulary: Halbpension, Pick up, Sommerkursaufschlag … 21 = Storno); `CostDetailComment_1` is its auto-entered copy | read the id with the vocabulary; 21 marks the reversal line (`reversed`) | auto-enter `CostDetailComment_1 = CostDetailReferenceComment::…_1`; since 2025 4,992 lines, all 21 (Storno) |
| `_ID_Level` | 4,762 | **COPY** | Level of the book | `materials.level_code` | `$_Level = BookReference::_ID_Level` (WriteBook…) |
| `_ID_LevelStep` | 4,422 | **COPY** | Level step of the book | `materials` | `BookReference::_ID_LevelStep` |
| `_ID_CostDetailSet` | 3,027 | **PLUMBING** | Flag "a payment was written for this line" | derive from `payments.charge_id` | set to 1 by Write1CostDetail.PaymentIn / WriteAll… / WriteSelected…; since 2025 9,449 lines a payment names do not carry it |
| `_ID_Corporate` | 2,564 | **COPY** | Company of the booking | `bookings.payer_organisation_id` | `Booking::_ID_Corporate` (company-course charges: `Course::_ID_Corporate`) |
| `_ID_CentralStation` | 1,931 | **PLUMBING** | Key of the booking's evening-line record | — | `Booking::_ID_CentralStation` |
| `_ID_NationalAirport` | 538 | **PLUMBING** | Key of the booking's exam-line record | — | `Booking::_ID_NationalAirport` |
| `_ID_Group` | 134 | **COPY** | Group of the booking | the booking | `Booking::_ID_Group` / `Group::__ID_Group` (NewCostDetailGroup) |
| `_ID_Management` | 21 | **COPY** | Party billed on a line written on an invoice (no booking) | the invoice (`Invoice::_ID_Management`) | `$_ID_Management = Invoice::_ID_Management` (NewCostDetail_Invoice); the 21 lines are 21 of the 24 booking-less charges — the lines themselves are a reader gap (notes §B) |
| `_ID_Institution` | 21 | **COPY** | Institution of that invoice line | the invoice | `Invoice::_ID_Institution` / `Course::_ID_Institution` |

### PaymentIn — payments received (18 fields: COPY 9 · PLUMBING 5 · MAP 3 · ABANDONED 1)

| Field | recent | Verdict | Meaning | Target in workspace | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Platform` | 18,937 | **COPY** | Business line | the booking | `Booking::_ID_Platform` (9 scripts) |
| `_ID_StaffSchool` | 18,870 | **MAP** | The colleague who booked the payment (`StaffSchool` row → `StaffMember`) | `payments.recorded_by_staff_id` (new, → `staff_members`) | `$$_ID_Account` (StartScript: the signed-in account → StaffSchool number) in the 4 scripts that write payments; since 2025 18,317 of 18,464 resolve to a StaffSchool row whose StaffMember is in the workspace register; 10 colleagues |
| `_ID_Provider` | 17,440 | **PLUMBING** | Second serial number | — | SERIAL; distinct on every row |
| `_ID_Person` | 15,677 | **COPY** | The learner | via the booking | `Booking::_ID_Person`; every payment has a booking |
| `_ID_CostDetail` | 13,439 | **MAP** | The charge a payment settles | `payments.charge_id` (new, → `booking_charges`) | Write1CostDetail.PaymentIn, WriteAll…, WriteSelected… (`$_ID_CostDetail`); since 2025 11,350 payments in the workspace name a charge that is also there; carry-overs (method 7) never name one |
| `_ID_InternationalAirport` | 13,067 | **PLUMBING** | Line-record key | — | Booking |
| `_ID_Client` | 11,382 | **COPY** | Customer number | person | Booking |
| `_ID_Course` | 11,382 | **COPY** | Booking's course when the payment was written | — | `Booking::_ID_Course` |
| `_ID_Selected` | 10,970 | **PLUMBING** | Selection for the receipt | — | all 29,274 values are 1; cleared by `Replace Field Contents` before each new payment |
| `_ID_CourseTypeReference` | 4,171 | **COPY** | Course type | booking | NewPaymentIn_Booking only |
| `_ID_Level` | 4,167 | **COPY** | Level | booking | `Booking::_ID_Level` |
| `_ID_CentralStation` | 1,881 | **PLUMBING** | Line-record key | — | Booking |
| `_ID_Agency` | 1,184 | **COPY** | Agency of the booking (not who paid) | `bookings.payer_organisation_id` | `Booking::_ID_Agency` / `Group::` / `Invoice::` in NewPaymentIn_* |
| `_ID_EnrolmentDone` | 844 | **COPY** | Booking's enrolment status carried by payments imported in bulk | — | no script sets it; 2,381 of its 2,459 rows have no `TimeStampOfCreation` (Import.Parameter_Booking, P3 ImportPaymentIn: group imports) |
| `_ID_NationalAirport` | 367 | **PLUMBING** | Line-record key | — | Booking |
| `_ID_Instalment` | 221 | **MAP** | The instalment a payment paid | `payments.instalment_id` (new, → `booking_instalments`) | NewPaymentIn.Instalment_Booking; 226 since 2025, 202 of their instalments are in the workspace |
| `_ID_Corporate` | 203 | **COPY** | Company of the booking | booking | Booking / Group / Invoice |
| `_ID_SerialNumberInvoice` | 2 | **ABANDONED** | Payment entered on an invoice | — | 4 rows ever (NewPaymentIn_Invoice) |

### PaymentOut — money paid out (16 fields: COPY 5 · MAP 4 · ABANDONED 3 · PLUMBING 2 · DECIDE 1 · ALREADY 1)

| Field | recent | Verdict | Meaning | Target in workspace | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Provider` | 2,866 | **PLUMBING** | Second serial number | — | SERIAL; distinct on every row |
| `_ID_BalanceCount` | 2,866 | **MAP** | Whether the payout counts in the learner's balance: 1 yes (refund, agency commission, direct payment), 2 no (rent to a host) | importer rule: classify the payouts that name no kind (§C) | `Booking::Balance.Com` subtracts the BalanceCount-1 payouts; since 2025 fixed by the kind (kind 1 ↔ 2 on 1,159; kinds 2/3/4 ↔ 1 on 1,837 of 1,838); the only classifier on the 1,799 older payouts without a kind — 635 sit in the workspace as `other` |
| `_ID_Course` | 2,808 | **COPY** | Booking's course | — | `Booking::_ID_Course` |
| `_ID_BankAccount` | 2,659 | **DECIDE** | The account the money went to (host, agency or learner) | `payouts.bank_account_id` if decided | NewPaymentOut_DateAccommodation takes `BankAccount_Accommodation::__ID_BankAccount`; since 2025 on 2,789 of 2,999 payouts; 589 of those accounts are people's accounts already in the workspace, host accounts are not |
| `_ID_Person` | 2,107 | **COPY** | The learner of the booking (not the payee) | via the booking | `$_ID_Person = Booking::_ID_Person` in every payout script |
| `_ID_MethodPayment` | 1,748 | **ALREADY** | How it was paid (5 transfer, 2 cash, 9 offsetting) | `payouts.method` | read today as the label copy `MethodPayment_1` (3,949 vs 3,954 ids); read the id instead (mapping review §4) |
| `_ID_CostDetailReference` | 1,747 | **MAP** | Charge type of the payout: 16 refund/commission, 3 rent | with `_ID_BalanceCount`: classifier for kind-less payouts | set to 16 or 3 by the payout scripts; since 2025 empty on rent, 16 on kinds 2 and 3 |
| `_ID_CourseTypeReference` | 1,118 | **COPY** | Course type | — | NewPaymentOut_DateAccommodation |
| `ZStartDate` | 1,112 | **MAP** | First day of the period a rent payout covers | `payouts.period_start` (new) | no script writes it (typed on the payout); since 2025 on 1,153 of 1,159 rent payouts |
| `ZEndDate` | 1,112 | **MAP** | Last day of that period | `payouts.period_end` (new) | as `ZStartDate` |
| `_ID_Platform` | 657 | **COPY** | Business line | — | Booking |
| `_ID_Client` | 371 | **COPY** | Customer number | — | Booking |
| `_ID_Selected` | 5 | **PLUMBING** | Selection mark | — | no writer; 56 rows ever |
| `_ID_StaffSchool` | 5 | **ABANDONED** | Colleague who booked the payout | — | no writer; 1,014 rows ever, 5 since 2025 |
| `HeaderPaymentOut` | 1 | **ABANDONED** | Address header of a payout letter | — | SetHeader_PaymentOut; 5 rows ever (holds an address: never carried) |
| `Email` | 1 | **ABANDONED** | E-mail of that letter | — | SetHeader_PaymentOut; 3 rows ever |

### Instalment — payment plans (8 fields: COPY 5 · PLUMBING 2 · ABANDONED 1)

| Field | recent | Verdict | Meaning | Target in workspace | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Student` | 1,307 | **COPY** | Learner number | — | `Booking::_ID_Student` (NewInstalment_Booking, WriteInstalmentPlan…) |
| `_ID_Platform` | 1,307 | **COPY** | Business line | — | Booking |
| `_ID_Person` | 1,307 | **COPY** | The learner | via the booking | every instalment has a booking (4,151 of 4,151) |
| `_ID_InternationalAirport` | 965 | **PLUMBING** | Line-record key | — | Booking |
| `_ID_Client` | 881 | **COPY** | Customer number | — | Booking |
| `_ID_Course` | 364 | **COPY** | Booking's course | — | NewInstalment_Booking |
| `_ID_CentralStation` | 314 | **PLUMBING** | Line-record key | — | Booking |
| `_ID_CostDetail` | 37 | **ABANDONED** | Not a charge: values 2 / 3 / 28 are charge-type codes typed by hand | — | no writer; 480 rows ever, 472 of them „2" |

### Invoice — invoices (10 fields: MAP 5 · PLUMBING 4 · COPY 1)

| Field | recent | Verdict | Meaning | Target in workspace | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Provider` | 442 | **PLUMBING** | Second serial number | — | SERIAL |
| `_ID_Address` | 432 | **PLUMBING** | Address record used to compose the header | — (`AddressHeader` is read) | set beside `AddressHeader` by the 7 invoice scripts |
| `_ID_Email` | 393 | **PLUMBING** | E-mail record used for sending | — | pointer; the address belongs to the person / organisation |
| `_ID_Student` | 334 | **COPY** | Learner number | — | Booking |
| `_ID_Phone` | 263 | **PLUMBING** | Phone record for the header | — | pointer |
| `_ID_Management` | 106 | **MAP** | The party billed when it is no Corporate/Agency (Jobcenter, schools, partners) | `invoices.organisation_id` fallback through `filemaker_links` (Management) | since 2025: 72 invoices already linked through `_ID_Corporate`; 34 invoices not in the workspace because only this field names their party |
| `_ID_Institution` | 106 | **MAP** | Same, through the institution | `invoices.organisation_id` fallback (Institution) | as above |
| `_ID_Reversal` | 26 | **MAP** | The invoice number was cancelled (ReversalSerialNumber_Invoice clears it from its charges and logs „Rechnungsnummer … storniert") | `invoices.cancelled` (new, boolean) | 26 since 2025, 25 of them in the workspace shown as ordinary invoices |
| `_ID_Offer` | 8 | **MAP** | Invoice made from an offer | `invoices.offer_id` (new, → `offers`) | MakeInvoice_Offer; the 8 offers are in the workspace |
| `_ID_Group` | 6 | **MAP** | Invoice for a group visit | `invoices.group_visit_id` (new, → `group_visits`) | MakeInvoice_Offer; groups in the workspace |

### Commission — agency commission per charge (2 fields: COPY 2)

| Field | recent | Verdict | Meaning | Target in workspace | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_CostDetailReference` | 1,773 | **COPY** | Charge type of the commissioned line (2 course fee on 4,867 of 4,868) | through `booking_commissions.charge_id` | `$_ID_CostDetailReference = CostDetail::_ID_CostDetailReference` (NewCommission…, MakeReversal…) |
| `_ID_Client` | 565 | **COPY** | Customer number | — | Booking |

### Letter — letters as composed (37 fields: COPY 12 · MAP 10 · PLUMBING 7 · ALREADY 3 · ABANDONED 3 · DECIDE 2)

| Field | recent | Verdict | Meaning | Target in workspace | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_LetterSent` | 28,642 | **COPY** | „Sent" flag | `letters.sent_at` (from `Date_LetterSent`) | set with `Date_LetterSent` by SendEmail…; the two coincide on all 33,744 letters (29,120 both, 4,624 neither) |
| `_ID_EmailSent` | 28,421 | **COPY** | „E-mailed" flag | `letters.sent_via` (from `WorkFlowLetter.FormCommunication`) | set with `_ID_LetterSent` by the same scripts |
| `_ID_Student` | 27,814 | **COPY** | Learner number | person | `$_ID_Student` beside `_ID_Person` in 112 scripts |
| `Provenience` | 27,735 | **PLUMBING** | Layout the letter was made from | — | `$_Layout = Get(LayoutName)` in 143 scripts |
| `_ID_Platform` | 21,964 | **COPY** | Business line | — | Booking |
| `_ID_Client` | 18,040 | **COPY** | Customer number | — | Booking |
| `_ID_InternationalAirport` | 16,510 | **PLUMBING** | Line-record key | — | Booking |
| `_ID_Course` | 12,319 | **COPY** | Course(s) of the booking(s) the letter covers (may be a list) | — | confirmations and visa letters copy the bookings' courses; on course-wide letters (room change, course start) it is empty — `$_ID_Course` is never set there — so the course is reached only through the bookings listed |
| `Email.All` | 6,911 | **COPY** | All addresses the letter went to (the learner's, or every learner's of a course) | — | `$_AllEmailStudent`, `$_ListeEmail…` in 66 scripts |
| `FreeField_2` | 2,827 | **MAP** | Second text block: the totals paragraph (Gesamtbetrag / Kommission / Nettobetrag) of confirmations; on ReceiptMultiplePaymentIn a list of booking numbers | appended to `letters.document.body` | 2,868 confirmations carry the paragraph (2,181 individual, 684 agency, 3 company); 2,581 of them are in the workspace without it; 19 receipts hold booking numbers (a copy of `_ID_Booking`) |
| `_ID_Signature` | 2,640 | **MAP** | Colleague whose signature is printed (a StaffMember id, related through `Signature`) | `letters.document.signature` (name from `staff_members`) | no script writes it (picked on the letter); 2,633 of 2,681 values resolve to the staff register |
| `_ID_PositionSignature` | 2,602 | **PLUMBING** | Which of three signature placements | — | relationship to `SelectionDetail` list 25 |
| `_ID_PreBooking` | 2,485 | **ALREADY** | Letter written at intake | person / booking | such letters carry `_ID_Person`; Go_PreBooking_Booking.Parameter writes the booking onto them when the booking is made |
| `_ID_Management` | 1,640 | **MAP** | The addressee party when it is not the learner: the host's, agency's or institution's party | `letters.organisation_id` (Management link) or, for a host, `letters.accommodation_id` | host letters (AnnouncementHost, CheckInHost …) file the learner in `_ID_Person` and the host here; 166 values are lists |
| `_ID_CourseType` | 1,616 | **COPY** | Course type on course letters | — | `$_ID_CourseTypeReference` (7 course scripts) |
| `_ID_Contact` | 1,390 | **ALREADY** | First-contact record | person | waiting-list letters set it beside `_ID_Person` |
| `_ID_DateAccommodation` | 1,385 | **MAP** | The stay a host or stay letter is about | `letters.source` (stay → `booking_stays.filemaker_id`) | 22 accommodation scripts |
| `_ID_Accommodation` | 1,369 | **MAP** | The place the letter went to or is about | `letters.accommodation_id` (exists, 0067) | 1,176 letters in the workspace name a workspace place and have the column empty |
| `_ID_CentralStation` | 1,233 | **PLUMBING** | Line-record key | — | Booking |
| `_ID_WaitingRoom` | 1,203 | **MAP** | The waiting-list entry a waiting-list letter is for | `letters.waitlist_entry_id` + kinds `waitlist_*` (exist) | ConfirmationWaitingList.*, FreePlaceWaitingList.*, Maybenexttime_*; 677 such letters are in the workspace as kind `schoolman`, 147 with their entry there |
| `_ID_NationalAirport` | 715 | **PLUMBING** | Line-record key | — | Booking |
| `_ID_Address` | 665 | **PLUMBING** | Address record behind `AddressHeader` | — | pointer (FreeLetter_Management, invoices, holiday letters) |
| `_ID_Email` | 505 | **PLUMBING** | E-mail record behind `Email` | — | pointer |
| `Email.BlindCopy` | 505 | **MAP** | BCC recipients of the letter as sent | `letters.source.schoolman.bcc` | InformAuthorityDeparture_DateAccommodation, WeMustTalk |
| `_ID_SerialNumberInvoice` | 480 | **MAP** | The letter is invoice N (or its cancellation, or a receipt for it) | `letters.invoice_id` (new, → `invoices`) | WriteInvoice_Invoice 412, WriteStornoInvoice_Invoice 24, InvoiceStudent… 42 |
| `_ID_Agreement` | 453 | **ALREADY** | Learning-agreement letter | person / booking; the agreement comes as a note | Go_Agreement_Letter |
| `_ID_Exam` | 403 | **COPY** | Exam of the booking(s) the letter covers | — | confirmations and visa letters only; empty on exam invitations to all candidates |
| `_ID_Institution` | 220 | **MAP** | Institution of the addressee party | with `_ID_Management` → `letters.organisation_id` | FreeLetter_Management, LetterTraining…, offer and invoice letters |
| `_ID_StaffMember` | 92 | **DECIDE** | Letter to colleagues (exam-duty invitations 41, time-sheet letters 18, teacher mails 7; lists of ids) | staff register, if decided | InvitationTeacher_SingleDateExamReference_Exam, SameProcedure.*_SingleMonthStaff, SendEmailTeacher… |
| `_ID_EnquiryHost` | 73 | **COPY** | Marks a host enquiry; holds the booking id | — | `_ID_EnquiryHost = $_ID_Booking` and `_ID_Booking = $_ID_Booking` in EnquiryHost.Parameter_DateAccommodation |
| `_ID_Level` | 36 | **COPY** | Booking's level on refund letters | — | `Booking::_ID_Level` (DevolutionStudent.*) |
| `Email.Copy` | 28 | **MAP** | CC recipients of the letter as sent | `letters.source.schoolman.cc` | InformAuthorityDeparture (accommodation@), WishYouWereHere 2 (intensiv@), WeMustTalk |
| `_ID_Group` | 23 | **COPY** | Booking's group | — | `$_ID_Group = Booking::_ID_Group` in 33 scripts |
| `_ID_SingleMonthStaff` | 17 | **DECIDE** | Time-sheet month a letter to a colleague is about | staff time, if decided | Adjustment.Adopted.±, SameProcedure.*_SingleMonthStaff |
| `_ID_Existent` | 4 | **ABANDONED** | — | — | no writer; 4 rows |
| `_ID_TimeMachine` | 2 | **ABANDONED** | — | — | no writer; 2 rows |
| `_ID_WeekOfCourse` | 1 | **ABANDONED** | Course week of a course mail | — | 1 row |

### WorkFlow — the history (work log) (35 fields: MAP 12 · PLUMBING 9 · COPY 7 · ABANDONED 4 · ALREADY 3)

| Field | recent | Verdict | Meaning | Target in workspace | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_ProcessReference` | 44,540 | **MAP** | Kind of the history line: 0 intake (not in the vocabulary), 1 Buchhaltung, 2 Lernentwicklung, 3 Unterkunft, 4 Tagestermin, 5 Kursplanung, 6 PushInfoCourse, 7 Praktikum, 8 OfficeTalk, 9 Bestellung, 10 Wartung, 11 Datenbank, 12 Examen, 13 HHRR, 14 uO | `staff_activity.detail.process` + vocabulary table (new, from `ProcessReference`) | since 2025: 1 21,094 · 2 12,669 · 0 5,843 · 3 2,917 · 4 2,392 · 8 207 · 11 91 · empty 537 (absence notices, invoice lines); „De"/„En" on 531 rows before 2025 (a language passed as the parameter) |
| `_ID_Student` | 38,939 | **COPY** | Learner number | — | Booking / Person |
| `_ID_Platform` | 35,954 | **COPY** | Business line | — | Booking |
| `_ID_InternationalAirport` | 28,758 | **PLUMBING** | Line-record key | — | Booking |
| `_ID_Client` | 27,946 | **COPY** | Customer number | — | Booking |
| `_ID_History` | 27,657 | **MAP** | 1 = written by a colleague (the booking's history portal), an absence or authority notice; empty = written by a letter or system script | `staff_activity.detail.note` (boolean) | set to 1 by 7 scripts only (NewWorkFlow.Parameter_Booking …); since 2025 on 28,118 lines: 27,667 written through the history portal (they also carry `_ID_WorkFlowReference`), 421 absence notices, ~30 authority notices |
| `_ID_WorkFlowReference` | 27,267 | **COPY** | Second kind field | — | same `Get(ScriptParameter)` as `_ID_ProcessReference` (since 2025: 12,663 „2/2", 12,449 „1/1", 2,555 „3/3"); alone only on 58 invoice lines |
| `_ID_Course` | 26,102 | **COPY** | Booking's course | — | `Booking::_ID_Course`; since 2025 every line naming a course also names a booking or person (no course-only log) |
| `_ID_SingleDateControl` | 6,980 | **PLUMBING** | Link to the follow-up the letter script made (reverse of `SingleDateControl::_ID_WorkFlow`) | — (follow-ups come with their own day and reason) | 24 letter scripts; 7,011 lines since 2025, all accounting |
| `_ID_PreBooking` | 5,770 | **ALREADY** | Intake line (process 0) | person / booking | NewWorkFlow_PreBooking sets `_ID_Person`; Go_PreBooking_Booking writes the booking on (5,835 of 5,848 since 2025 have a person) |
| `_ID_Selected` | 4,029 | **PLUMBING** | Mark for „send the marked lines to teachers / accounting / accommodation" | — | SendListEmailWorkFlow.IDSelected_*, CancelAlert_Booking |
| `_ID_CentralStation` | 3,157 | **PLUMBING** | Line-record key | — | Booking |
| `_ID_Active` | 2,339 | **PLUMBING** | Calendar highlight on | — | NewWorkFlow.IDHighLight.Parameter_SingleDayCalendar |
| `_ID_NationalAirport` | 675 | **PLUMBING** | Line-record key | — | Booking |
| `Origen` | 625 | **PLUMBING** | „<layout> \| <table> \| <account>" | — | `$_Origen` in 12 scripts |
| `_ID_SerialNumberInvoice` | 464 | **MAP** | The invoice a line is about | `detail.invoice`; lines naming no booking/person/party go on the invoice's organisation | NewWorkFlow_Invoice, WriteInvoice…, ReversalSerialNumber…; since 2025 99 such lines name nothing else (invoice reminders on invoices to institutions) |
| `_ID_DateAccommodation` | 443 | **MAP** | Stay the line is about (Text field, may list several) | with `_ID_Accommodation`: the line also on the place's history | InformAuthority*, StayOrLeave*, StudHostLetter… |
| `_ID_Absence` | 421 | **MAP** | Absence notice (button „Abwesenheit") | `detail.absence` on the booking's history line | NewWorkFlow.IDAbsence_Booking_InternationalAirport; 421 since 2025, all on a booking |
| `SingleDateAbsence` | 421 | **MAP** | Day of the absence | `detail.absence.day` | same script (`SingleDayCalendar…::ZSingleDayCalendar`) |
| `NumberMinute` | 421 | **MAP** | Minutes missed (lessons × 45) | `detail.absence.minutes` | same script (`DayTime::NumberLesson * 45`) |
| `_ID_Excuse` | 420 | **MAP** | Excused: 2 no (at creation), 1 yes (ticked later by hand) | `detail.absence.excused` | 428 „1", 381 „2" of 809 |
| `Subject` | 305 | **MAP** | Title of a calendar entry („Einstufung", „Show up \| Stay or go", an exam, an institution, „Buchbestellung") | `day_tasks.body` (prefix) | NewDailyChat, NewOfficeTalk, NewWorkFlowCalendar…, NewWorkFlow_Exam |
| `NumberLesson` | 203 | **MAP** | Lessons of the absence day | `detail.absence.lessons` | same absence script |
| `_ID_Accommodation` | 147 | **MAP** | The place the line is about | `staff_activity` on entity `accommodation` | since 2025: 518 lines also name a booking, 42 name only the host's party |
| `_ID_BusStop` | 53 | **PLUMBING** | Key of the closed-group line record | — | Booking |
| `_ID_HighLightCalendar` | 38 | **PLUMBING** | Calendar highlight | — | 5 calendar scripts |
| `_ID_Adressee` | 21 | **MAP** | Colleague(s) a calendar task is for (StaffSchool ids; lists) | `day_tasks.assignee_id` (exists) via StaffSchool → staff | no script writes it; 239 of 422 values resolve to a StaffSchool row |
| `_ID_CourseLanguage` | 16 | **COPY** | Language of a course/group line | — | NewWorkFlow.IDProcess6_Course, _Group, _WeekOfCourse |
| `_ID_Internship` | 15 | **ALREADY** | Internship party | organisation history (the line also names `_ID_Management`) | NewWorkFlow_Management |
| `_ID_CourseTypeReference` | 14 | **COPY** | Course type | — | course/group scripts |
| `_ID_Provider` | 14 | **ABANDONED** | A serial on older rows; 14 since 2025 copy a supplier role | — | NewWorkFlow_Management (beside `_ID_Management`) |
| `_ID_StaffMember` | 5 | **ABANDONED** | Colleague a line is about | — | 5 since 2025 (HR / teacher push lines) |
| `_ID_Exam` | 5 | **ABANDONED** | Exam calendar entry | — | last 2025 |
| `_ID_Editorial` | 4 | **ALREADY** | Publisher | organisation history (beside `_ID_Management`) | NewWorkFlow_Management |
| `_ID_Relation` | 1 | **ABANDONED** | — | — | 1 row, no writer |

### WorkFlowLetter — how a letter went (12 fields: COPY 7 · PLUMBING 2 · MAP 2 · ABANDONED 1)

| Field | recent | Verdict | Meaning | Target in workspace | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Provider` | 18,965 | **PLUMBING** | Second serial number | — | SERIAL |
| `_ID_Person` | 17,864 | **COPY** | Person of the letter / booking | — | `$_ID_Person` from the letter or the booking |
| `_ID_Booking` | 17,355 | **MAP** | Booking of a certificate sending (rows without a letter) | see `_ID_CertificateDone` | on letter rows a copy of `Letter::_ID_Booking`; on the 2,259 certificate rows the only link |
| `_ID_Student` | 16,327 | **COPY** | Learner number | — | — |
| `_ID_FileExistent` | 13,777 | **PLUMBING** | The PDF existed when sending | — | `$_ID_Existent` (SendEmail.Parameter_Letter) |
| `Email` | 13,650 | **COPY** | Address used | `letters.email` | `$_Email = Letter::Email` (SendEmail.Parameter_Letter) |
| `_ID_Platform` | 11,464 | **COPY** | Business line | — | — |
| `_ID_Client` | 8,692 | **COPY** | Customer number | — | — |
| `_ID_Print` | 3,123 | **COPY** | Printed | `letters.sent_via = print` | set with `FormCommunication = "Print"` (PrintOne.Long*) |
| `_ID_EmailSent` | 2,058 | **COPY** | E-mailed | `sent_via` | set with `FormCommunication` (EmailSMPT / EmailClient) |
| `_ID_CertificateDone` | 2,058 | **MAP** | The certificate of participation was sent as PDF | `letters` row of a new kind `participation_certificate` on the booking (`sent_at`, `sent_via`) | SendCertificatePDF.SMTP*, .EmailClient, .WhatsApp; 2,259 since 2025 (2,237 SMTP, 22 mail client), 1,910 on bookings in the workspace; no `Letter` row exists for them |
| `_ID_LetterServices` | 10 | **ABANDONED** | Sending of a book-order letter | — | 10 rows |

### Comment — notes (14 fields: MAP 7 · COPY 3 · ABANDONED 2 · PLUMBING 1 · DECIDE 1)

| Field | recent | Verdict | Meaning | Target in workspace | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `_ID_Course` | 380 | **MAP** | Note on a course (class) | `staff_notes` entity `course` (new) on `courses` | NewComment_Course; since 2025 379 notes name only a course, 135 of those courses are in the workspace (`filemaker_course_id` / `filemaker_group_ids`) |
| `_ID_Management` | 170 | **MAP** | Note made on a party's screen (agency, company, institution, host, publisher) | organisation notes (0089) through `filemaker_links`; on a host → accommodation notes | NewComment_Management / _Offer / _Person; since 2025 52 party notes (26 parties in the workspace), 32 host notes with a person that no reader takes |
| `_ID_Corporate` | 45 | **MAP** | Company a note is on (a copy of the group's company on group notes) | organisation notes | NewComment_Management; NewCommentGroup_Group copies `Group::_ID_Corporate` |
| `_ID_Agency` | 8 | **MAP** | Agency a note is on | organisation notes | as above |
| `_ID_Platform` | 4 | **COPY** | Business line | — | NewComment_Booking |
| `_ID_Student` | 4 | **COPY** | Learner number | — | NewComment_Booking |
| `_ID_Client` | 4 | **COPY** | Customer number | — | NewComment_Booking |
| `_ID_InternationalAirport` | 4 | **PLUMBING** | Line-record key | — | NewComment_Booking |
| `_ID_StaffMember` | 3 | **DECIDE** | Note on a colleague (HR) | staff register, if decided | NewComment_Management on a StaffMember party; 7 rows ever |
| `_ID_Editorial` | 3 | **MAP** | Note on a publisher | organisation notes (Editorial link) | NewComment_Management |
| `_ID_Internship` | 2 | **MAP** | Note on an internship party | organisation notes | NewComment_Management |
| `_ID_Institution` | 1 | **MAP** | Institution a note is on | organisation notes | NewComment_Management / _Offer / _Touch |
| `_ID_Contact` | 1 | **ABANDONED** | — | — | 1 row ever |
| `_ID_Provider` | 1 | **ABANDONED** | Supplier note | — | 1 row ever |

### Links that run „the other way round" (or are not what they look like)

| Link | What SchoolMan does | Consequence for the readers |
| --- | --- | --- |
| Letter → booking | `_ID_Booking` holds a **list** on 6,497 letters; `_ID_Person` a list on 424, `_ID_Management` on 166, `_ID_Accommodation` on 51 | read every id, not `first()` (finding 1) |
| Letter → course | course-wide letters (RoomChange_SingleDateCourse, CourseStartMail.*, CourseReStartMail_*) never set `_ID_Course` (`$_ID_Course` is never assigned) | the course is reached only through the bookings listed |
| Letter → addressee | host, agency and stay letters file the **learner** in `_ID_Person`/`_ID_Booking` and the addressee in `_ID_Accommodation` / `_ID_Management` | the workspace shows them as letters to the learner (finding 8) |
| WorkFlowLetter → Letter | `_ID_Letter` also holds `StatementLandlord` ids (7 rows, SendEmailAttachment_StatementLandlord) and is empty on the 2,259 certificate sendings | key ranges do not collide today (statements ≤ 772, letters ≥ 160,964); the reader should not trust the field alone |
| Payment → charge | the link is on the payment (`PaymentIn._ID_CostDetail`); the charge's `_ID_CostDetailSet` is a stale reverse flag (missing on 9,449 paid charges since 2025) | read the payment's link, never the flag |
| Payment → instalment | on the payment (`PaymentIn._ID_Instalment`); `Instalment._ID_PaymentDone` is the flag; `Instalment._ID_CostDetail` is not a link (charge-type codes) | as above |
| Payout → commission line | none: `PaymentOut._ID_Commission` is empty on every row; `Commission._ID_PaymentCommission` says paid (685 yes, 545 no since 2025) | a payout cannot be tied to the commission it paid |
| Invoice ↔ charges | by number on the charge (`CostDetail._ID_SerialNumberInvoice`); the number equals the invoice key on 1,249 of 1,337 invoices; 7 stamped charges match no invoice | match on `_ID_SerialNumberInvoice`, as the reader does |
| Carry-over (*Übertrag*) | two hand-typed payments with method 7: minus on the source booking, plus on the target (1,101 / 1,120 since 2025); nothing links them | answers the TODO in `money.md`: pair them by learner + amount + day to fill `transfer_id` / `counterpart_booking_id` |
| History ↔ follow-up | both directions (`WorkFlow._ID_SingleDateControl`, `SingleDateControl::_ID_WorkFlow`) | nothing to do |
| Written later onto old rows | `Go_PreBooking_Booking.Parameter` writes `_ID_Booking`/`_ID_Student` onto the intake's WorkFlow and Letter rows when the booking is made; `Go_Management_*` writes the new role id onto a party's WorkFlow lines | Letter has no change field: only fingerprints or the 14-day re-read (mapping review §7) see this |
| Colleagues | `PaymentIn._ID_StaffSchool` and `WorkFlow._ID_Adressee` point to `StaffSchool`, which points to `StaffMember` (never the reverse); `Letter._ID_Signature` points straight to `StaffMember` | bring `StaffSchool` (14 rows) to resolve them |

## 3. Not-covered tables of this area

| Table(s) | Rows · since 2025 | What it is | Verdict | What to bring |
| --- | --- | --- | --- | --- |
| `StaffSchool` | 14 · 4 | One row per office account: the colleague (`_ID_StaffMember`, all 14 set, 13 in the register), active | **MAP** | `__ID_StaffSchool`, `_ID_StaffMember`, `_ID_Active` — resolves who booked a payment and a calendar task's addressee. Its name, signature and stamp images stay |
| `CostDetailReferenceComment` | 29 | Sub-labels of charges (Frühstück … Storno 21 … Option Gastfamilie 30) | **MAP** | key and both labels; the source of `CostDetailComment_1` |
| `ProcessReference` | 14 (one row new in 2026) | Kinds of history lines | **MAP** | key, both labels, `_ID_Active` → a vocabulary table; add „0 Anfrage" (used on 5,843 intake lines since 2025, not in the table) |
| `CostDetailReference` | 34 | Charge types | **ALREADY** | `charge_types` holds the 21 codes with a `filemaker_id`; every code used since 2025 is covered. Codes used only before 2025 have no charge type: 21 Storno (2,374 lines), 28 (792), 26 (73), 2.5, 33, 7, 32, 10, 29 — map them (21 → `cancellation`) when older years come |
| `CostTypeReference` | 6 | Category of a charge type | **ALREADY** | `charge_categories.filemaker_id` |
| `MethodPaymentReference` | 6 | Payment methods (1 card, 2 cash, 5 transfer, 7 carry-over, 8 agency, 9 offsetting) | **ALREADY** | `payments.method` (import-learners maps label, then id) |
| `PaymentOutReference` | 3 | Payout kinds | **ALREADY** | `payouts.kind`; the data also hold 4 „Direktzahlung an Agentur" (1) and 7 (2) that are not in the table |
| `BookReference` | 36 | The books | **ALREADY** | `materials.filemaker_id` (36) |
| `PaymentDetailReference` | 3 | Kurs / Miete CASA-WG / Buchverkauf | **ABANDONED** | nothing: no relationship and no script uses it |
| `CurrencyReference` | 2 | € / $ | **PLUMBING** | nothing (all amounts are euros; `payments.currency` exists) |
| `WorkFlowReference` | 8 (last 2021) | Second kind list for history lines | **COPY** | nothing: its values mirror `ProcessReference` |
| `LetterServices` | 252 · 66 in 2025, 46 in 2026 | Book-order letters to publishers (157 with an `_ID_Order`; 95 empty drafts) | **COPY** | nothing: the text is composed from `Order`/`OrderDetail`, which come across as `book_orders` |
| `Signature` | 18 · 4 | Scanned handwritten signatures and stamps per colleague | **PLUMBING** | never the images; the signer comes through `Letter._ID_Signature` → staff register |
| `TextModule` | 9 (2022) | Text modules for letters | **ABANDONED** | nothing (texts live in the scripts; the workspace has `letter_texts`) |
| `Log` | 3,421 since 2026-08 | One row per night job / server run | **PLUMBING** | nothing |
| `PlaceHolder` | 336 · 3 in 2025, 0 in 2026 | Old placeholder / reminder list (subject, reminder and completion days) | **ABANDONED** | nothing |
| `JunkMall` | 479 (last 2024) | Holding table records were moved into instead of being deleted | **ABANDONED** | nothing |
| `Url`, `UrlReference` | 104 · 37 (33 in 2026) | Links to documents or pages on parties (59, older), groups (12), bookings (9), party contacts (13), colleagues (5), trainings (2); kind list Vertrag, Einstufung, Bescheinigung, Krankmeldung, Anderes (set on 1 row) | **DECIDE** | if yes: `__ID_Url`, `Url`, `Description`, `Comment`, `_ID_UrlReference`, `_ID_Booking`, `_ID_Person`, `_ID_Group`, `_ID_Management`, `DateOfChange` → a link note on the record; the colleagues' ones only with the HR decision |
| `Emanuel` | 92 · 33 | The office's own knowledge base: titled entries with theme, keywords and text, linked to no record | **DECIDE** | not record data; leave, or export once for the team |
| `Medium`, `MediumReference` | 129 · 51 | Files stored inside SchoolMan; 49 of the 51 recent are attachments of `Emanuel` entries, 7 older on bookings | **DECIDE** | with `Emanuel` |
| `Script`, `ScriptReference` | 52 · 0 (2022) | Script catalogue for quality management | **PLUMBING** | nothing |
| `MailAccount` | 6 (2013) | Mail accounts with stored passwords | **PLUMBING** | never |
| `SalaryDetail`, `SalaryDetailReference`, `StatusSalaryReference` | 189 / 10 / 5 (2017–2020) | Salary payment lines | **ABANDONED** | nothing (HR, nothing since 2020) |
| `SimpleCalculator` | 18 (2022–2023) | Price drafts for offers | **ABANDONED** | nothing (offers took over) |
| `GlobalValue` | 1 | Global settings record | **PLUMBING** | nothing |
| `SingleDateControlReference` | 3 | FirstCall / SecondCall / LastCall | **PLUMBING** | nothing (follow-up reasons come from the script name) |
| `SelectionDetail`, `SelectionReference` | 85 / 23 | Pick lists (list 25: signature positions) | **PLUMBING** | nothing |
| `Logo`, `Graphic`, `Colour`, `ColourDetail`, `LayoutNavigation` | — | Screen furniture | **PLUMBING** | nothing |
| `OperationField` | 553 | Which course types a teacher teaches (StaffMember + CourseTypeReference) | another area (staff) | hand to the staff review |
| `Hades` | 171 · 2 | Archive of former staff (BackToLife_Hades restores one) | another area (staff) | hand to the staff review |
| `CodeNumber`, `CodeNumberReference` | 48 / 8 (0 in 2026) | Codes per learner / exam | another area (exams, intake) | hand over |

## 4. Fields the readers need on the Sync layouts

```json
{
  "add_to_layouts": {
    "CostDetail": ["_ID_BookReference", "_ID_CancellationSet", "_ID_CostDetailReferenceComment", "DateOfCreation"],
    "PaymentIn": ["_ID_CostDetail", "_ID_StaffSchool", "_ID_Instalment"],
    "PaymentOut": ["ZStartDate", "ZEndDate", "_ID_BalanceCount", "_ID_CostDetailReference", "_ID_MethodPayment"],
    "Invoice": ["_ID_Management", "_ID_Institution", "_ID_Reversal", "_ID_Offer", "_ID_Group"],
    "Letter": ["FreeField_2", "_ID_Accommodation", "_ID_DateAccommodation", "_ID_Management", "_ID_Institution", "_ID_WaitingRoom",
               "_ID_SerialNumberInvoice", "_ID_Signature", "Email.Copy", "Email.BlindCopy"],
    "WorkFlow": ["_ID_ProcessReference", "_ID_History", "_ID_SerialNumberInvoice", "_ID_Accommodation", "_ID_DateAccommodation",
                 "_ID_Absence", "SingleDateAbsence", "NumberMinute", "NumberLesson", "_ID_Excuse", "Subject", "_ID_Adressee"],
    "WorkFlowLetter": ["_ID_CertificateDone", "_ID_Booking"],
    "Comment": ["_ID_Course", "_ID_Management", "_ID_Corporate", "_ID_Agency", "_ID_Institution", "_ID_Editorial", "_ID_Internship"],
    "StaffSchool": ["__ID_StaffSchool", "_ID_StaffMember", "_ID_Active"],
    "CostDetailReferenceComment": ["__ID_CostDetailReferenceComment", "CostDetailReferenceComment_1", "CostDetailReferenceComment_2"],
    "ProcessReference": ["__ID_ProcessReference", "ProcessReference_1", "ProcessReference_2", "_ID_Active"]
  }
}
```

Notes: `CostDetail.DateOfCreation` is not a gap field (auto-entered) but is the only true day of a reversal line (finding 2).
`PaymentOut._ID_MethodPayment` replaces the label copy `MethodPayment_1` the reader uses now. The three new tables have no
change field: read them whole each pass (14, 29 and 14 rows). `Letter` and `WorkFlowLetter` have no change field either
(mapping review §7). If the DECIDE items are answered yes, add `Letter._ID_StaffMember`, `_ID_SingleMonthStaff`,
`Comment._ID_StaffMember`, `PaymentOut._ID_BankAccount` and the `Url` fields listed in §3.

## 5. Implementation notes

Readers and importers named are in `scripts/filemaker/`. „Small" = fits existing columns or adds a column; „new" = a new
table, kind or screen part.

**A. Payments: the charge, the instalment, who booked it** — small.
`read_learners.py`: add `_ID_CostDetail`, `_ID_Instalment`, `_ID_StaffSchool` to the `PaymentIn` read, and read `StaffSchool`
(14 rows) to turn the number into a `StaffMember`. Migration: `payments.charge_id uuid REFERENCES booking_charges ON DELETE SET
NULL`, `payments.instalment_id uuid REFERENCES booking_instalments ON DELETE SET NULL`, `payments.recorded_by_staff_id uuid
REFERENCES staff_members`. `import-learners.mjs` sets `charge_id` after the booking's charges are written (same booking, by
`filemaker_cost_detail_id`); `import-money.mjs` sets `instalment_id` after the instalments. Shows: the booking's money tab
(„für Kurspreis …" on a payment line, a receipt per charge), „gebucht von" on the payment.

**B. Charges: the book, the reversal pair, the true day** — small.
`read_learners.py`: add `_ID_BookReference`, `_ID_CancellationSet`, `_ID_CostDetailReferenceComment`, `DateOfCreation`.
Migration: `booking_charges.material_id uuid REFERENCES materials`, `booking_charges.reversed boolean NOT NULL DEFAULT false`.
Importer: `created_at` from `TimeStampOfCreation` unless its year is before 1900, then `DateOfCreation` at noon; the upsert
must also update `created_at` so the 3,856 rows already in year 1 are repaired. Shows: a reversal pair folded as one struck-
through line, the book's title from `materials`. The 24 charges with no booking (21 of them lines of invoices to
institutions) are a reader gap: their sum already reaches `invoices.amount`; carrying the lines needs a small `invoice_lines`
table — not urgent.

**C. Payouts: the period, the kind of the kind-less ones** — small.
`read_money.py` and `read_learners.py`: add `ZStartDate`, `ZEndDate`, `_ID_BalanceCount`, `_ID_CostDetailReference`,
`_ID_MethodPayment`. Rule for a payout without `_ID_PaymentOutReference`: an agency on it → `agency_commission`; a host place
or stay on it, or balance 2, or charge type 3 → `host_rent`; charge type 16 with balance 1 (or empty) and no agency → a refund,
read by `read_learners.py` as a payment below zero like kind 3. Migration: `payouts.period_start date`, `payouts.period_end
date`. Shows: the rent period on the place's payouts. Confirm with finance first (§ questions).

**D. Invoices** — small.
`read_money.py`: add `_ID_Management`, `_ID_Institution`, `_ID_Reversal`, `_ID_Offer`, `_ID_Group`; take an invoice also when
its Management / Institution is an organisation here. Migration: `invoices.cancelled boolean NOT NULL DEFAULT false`,
`invoices.offer_id uuid REFERENCES offers`, `invoices.group_visit_id uuid REFERENCES group_visits`. `import-money.mjs`:
organisation = Agency → Corporate → Management → Institution link. Shows: „storniert" on the invoice; the invoice on the offer
and the group.

**E. Letters** — mixed.
- *Several bookings* (new, the most important): `read_learners.py` keeps every id of `_ID_Booking` and `_ID_Person`; a letter
  with no person and several bookings is a course-wide letter. Recommended shape: one `letters` row per SchoolMan letter plus a
  join table `letter_bookings (letter_id, booking_id)`, so a booking shows every letter that names it; `booking_id` stays the
  first for the existing checks. The importer re-files the 929 course-wide letters now on one learner.
- *Totals paragraph* (small): read `FreeField_2` (in ranges, like `FreeField`); append it to the body unless the script is
  ReceiptMultiplePaymentIn_Booking (there it is a list of booking numbers).
- *Addressee* (small): `_ID_Accommodation` → `letters.accommodation_id` (exists); `_ID_Management` / `_ID_Institution` →
  `letters.organisation_id` through `filemaker_links`; `_ID_DateAccommodation` into `source`.
- *Waiting list* (small): `_ID_WaitingRoom` → `letters.waitlist_entry_id` and the kinds `waitlist_confirmation` /
  `waitlist_place_free` / `waitlist_no_place` by script name (ConfirmationWaitingList.*, FreePlaceWaitingList.*, Maybenexttime_*).
- *Invoice letters* (small): migration `letters.invoice_id uuid REFERENCES invoices`; set from `_ID_SerialNumberInvoice`.
- *Signer, CC, BCC* (small): `_ID_Signature` → the colleague's name from `staff_members` (`filemaker_staff_id`) into
  `document.signature`; `Email.Copy`/`Email.BlindCopy` into `source.schoolman`.
- *Certificates sent* (new kind): `read_letters_extra.py` reads `WorkFlowLetter` rows with `_ID_CertificateDone` = 1 and no
  `_ID_Letter` (`_ID_Booking`, `DateOfCreation`, `FormCommunication`); migration adds the kind `participation_certificate` to
  `letters_kind_check` / `letters_subject_check` (booking required); the row has a stub document (subject „Teilnahmebescheinigung",
  no body), `sent_via` email. Rows from SendInvoice_Invoice also carry the flag — skip those with `_ID_Invoice`.

**F. History** — small columns, one small vocabulary table, one filter on the screen.
`read_learners.py`, `read_organisations.py`, `read_offers.py`, `read_groups.py`: add `_ID_ProcessReference`, `_ID_History`,
`_ID_SerialNumberInvoice` and the absence fields to the WorkFlow read; put them in `staff_activity.detail` (`process`, `note`,
`invoice`, `absence: {day, lessons, minutes, excused}`). Migration: a vocabulary table (e.g. `history_processes`: code,
name_de, name_en, filemaker_id) seeded from `ProcessReference` plus 0 „Anfrage"; „De"/„En" (531 rows before 2025) read as
unknown. `read_accommodation.py`: WorkFlow lines naming the place (`_ID_Accommodation` / `_ID_DateAccommodation`) also go on
the accommodation's history (560 since 2025). Lines that name only an invoice (99 since 2025) go on the invoice's organisation.
Never put a process-13 (HHRR) line on a learner (25 rows, 2022). Shows: a kind filter on „Notizen und Verlauf" (Buchhaltung,
Lernentwicklung, Unterkunft, Anfrage …), „Abwesenheit gemeldet" on the booking's attendance day.

**G. Notes** — small migration, one notes panel.
Migration: add `course` to `staff_notes_entity_check`. `read_courses.py` (or a new step) reads `Comment` rows whose only link
is `_ID_Course` onto `courses` (`filemaker_course_id` or `filemaker_group_ids`); the course page gets the notes panel.
`read_organisations.py` reads `Comment` rows on a party (`_ID_Management`, `_ID_Corporate`, `_ID_Agency`, `_ID_Institution`,
`_ID_Editorial`, `_ID_Internship`; none of person / booking / group / offer) as organisation notes (0089), after the screen
for credentials (bridge-gaps decision 7). `read_accommodation.py`: take a place's comment even when it also names the host's
person (the 32 host notes now lost).

**H. Tagesplan** — small.
`read_day.py`: put `Subject` before the text of a calendar task; `_ID_Adressee` → `day_tasks.assignee_id` through StaffSchool
→ staff (several ids: the first, the rest in the text).

**Questions for Rahman**
1. *(DECIDE)* Should the workspace hold which bank account each payout went to (`PaymentOut._ID_BankAccount`)? 589 of the
   recent accounts are people's accounts already there; hosts' accounts are not (the accommodation privacy decision).
2. *(DECIDE)* Letters and notes about colleagues — exam-duty invitations, time-sheet and holiday letters, notes on a staff
   member (`Letter._ID_StaffMember` 92, `_ID_SingleMonthStaff` 17, `Comment._ID_StaffMember` 3): onto the staff register
   (HR access), or leave them in SchoolMan?
3. *(DECIDE)* Document links (`Url`, 33 new in 2026): bring them as links on groups, organisations and bookings? The
   colleagues' ones only with question 2.
4. *(DECIDE)* The office handbook (`Emanuel` + its files in `Medium`, 33 entries since 2025): leave in SchoolMan, or export
   once for the team?
5. *(confirm, group C)* Count the kind-less refunds of 2022–2024 on the learner's account? This changes open amounts against
   SchoolMan's own `Balance.Gross`, which subtracts kind-3 refunds only — ask finance to check two or three bookings.
6. *(confirm, group G)* Party notes: is decision 7 of `bridge-gaps.md` (import after a credentials screen) a yes?
7. *(confirm, group E)* One letter with a `letter_bookings` join, rather than a copy of a course-wide letter per learner?
