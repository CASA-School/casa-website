# Data API layouts for the workspace sync (2026-10-26)

Rahman: the bridge should not depend on his laptop and FileMaker Pro. The sync service will run on the
office network and read SchoolMan through the **FileMaker Data API** as the account `WorkspaceSync`
(created 2026-10-26). The Data API only returns fields that are **on a layout**, so it needs one layout
per table. This is the list of those layouts and their fields. The same list, machine-readable, is
`scripts/filemaker/sync-layouts.json`: the layouts are built from it and the service reads by it.

**Where the list comes from.** Every reader of today's bridge (`scripts/filemaker/read_*.py`) was run
once against SchoolMan with its reads recorded (2026-10-26): 634 fields in 67 tables, each
with its own key (`__ID_…`) and its change field. No `SingleDayStaff::cal_*` field and no
`StaffMember::CommentsOnTeacher` is read, and none may be put on a layout.

**Built 2026-10-27, with Rahman's go:** all 69 layouts, 653 fields — the first list, plus the fields
the readers took up on 2026-10-26 (`DateCourse` with its start, end and course; `PaymentIn::
_ID_CostDetailReference`; `WorkFlow`'s links to agency, company, institution and management) and the
carry-overs of `SingleYearStaff`, from which the year's remaining holiday is now worked out
(`read_time.py`). Each is hidden from the layout menus. Read back over the Data API as WorkspaceSync:
69 of 69 complete. The JSON also carries each field's type (`types`), from which the copy's export
writes values as FileMaker Pro's AppleScript gives them (docs/FILEMAKER_BRIDGE.md §9).

## Rules for the layouts

- One layout per table, named **`Sync_<Table>`**, based on the table's **base table occurrence**, so the
  Data API answers with bare field names (as the readers use them). Plain field objects, no portals.
- Only the fields listed here. A field is added to the list (and the JSON) first, then to the layout.
- Built the way the FileMaker session adds layouts (handover `casa-microsoft-platform/notes/handover-
  filemaker-for-website-session-2026-10-26.md` §4): clipboard XML2 from a generator, exact field ids
  from the schema export, objects placed beyond the page width, a copy before and after, compared.
- One table first (`Sync_Booking`), read through the Data API and compared with today's reader; then
  the rest (done 2026-10-27). **Every layout change in SchoolMan needs Rahman's go.** The Klassenbuch's `*_API` layouts
  are not touched.

## How each table is polled

The service asks every 1–2 minutes for what changed since its last look; a full read once a night
(after 02:00) catches deletions and anything missed.

| Change field | Tables | Polling |
| --- | --- | --- |
| A timestamp (`TimeStampOfChange`, `TimestampChange`, `Timestamp.Change`, and six fields named `DateOfChange` that are timestamps) | 29 | find records changed since the last look, to the second |
| A date only (`DateOfChange`, `DateChange`) | 30 | find records changed today (and yesterday, around midnight), compare fingerprints, write what differs |
| None | 8: DateValidity, Flag, Letter, Order, OrderDetail, StatementLandlord, WeekDay, WorkFlowLetter | new records by their key above the last one seen; changes in the nightly full read |

Checked by the FileMaker session (`mapping-review-2026-10-26.md`): every change field is an auto-enter
modification value and no script sets one, except `Group::TimeStampOfChange` (a creation stamp: use
`DateOfChange`), `SingleMonthStaff::TimeStampOfChange` (empty: use `DateOfChange`) and
`WeekDay::DateOfChange` (empty: WeekDay has none). **The night jobs (00:00–01:05) touch thousands of
records** — every Person at 00:07, every Corporate, Agency, Accommodation and StaffMember daily — so a
change field says „perhaps changed": the service compares fingerprints of the fields it reads, and the
first pass after 02:00 sees the wave settled. Fields copied from related records, abandoned fields,
duplicate keys and the tables still missing are in the review, §4–§9.

## The layouts

| Layout | Key | Change field | Fields |
| --- | --- | --- | ---: |
| `Sync_Accommodation` | `__ID_Accommodation` | `DateOfChange` | 15 |
| `Sync_ActivityReference` | `__ID_ActivityReference` | `DateOfChange` | 3 |
| `Sync_Address` | `__ID_Address` | `TimeStampOfChange` | 15 |
| `Sync_Agency` | `__ID_Agency` | `DateOfChange` | 7 |
| `Sync_Agreement` | `__ID_Agreement` | `DateOfChange` | 17 |
| `Sync_AnimalAtHome` | `__ID_AnimalAtHome` | `TimestampOfChange` | 4 |
| `Sync_BankAccount` | `__ID_BankAccount` | `TimestampOfChange` | 10 |
| `Sync_Booking` | `__ID_Booking` | `TimeStampOfChange` | 15 |
| `Sync_Classroom` | `__ID_Classroom` | `DateOfChange` | 4 |
| `Sync_CleaningDetail` | `__ID_CleaningDetail` | `DateOfChange` | 6 |
| `Sync_Comment` | `__ID_Comment` | `TimeStampOfChange` | 12 |
| `Sync_Commission` | `__ID_Commission` | `DateOfChange` | 11 |
| `Sync_CommissionDetail` | `__ID_CommissionDetail` | `TimestampOfchange` | 7 |
| `Sync_Complaint` | `__ID_Complaint` | `TimeStampOfChange` | 11 |
| `Sync_Corporate` | `__ID_Corporate` | `DateOfChange` | 5 |
| `Sync_CostDetail` | `__ID_CostDetail` | `TimeStampOfChange` | 12 |
| `Sync_CostDetailSample` | `__ID_CostDetailSample` | `DateOfChange` | 11 |
| `Sync_Course` | `__ID_Course` | `DateOfChange` | 15 |
| `Sync_DateAccommodation` | `__ID_DateAccommodation` | `TimeStampOfChange` | 12 |
| `Sync_DateBooking` | `__ID_DateBooking` | `DateOfChange` | 8 |
| `Sync_DateOffer` | `__ID_DateOffer` | `DateOfChange` | 6 |
| `Sync_DatePlacement` | `__ID_DatePlacement` | `TimeStampOfChange` | 9 |
| `Sync_DateRent` | `__ID_DateRent` | `DateOfChange` | 10 |
| `Sync_DateTargetWorkTime` | `__ID_DateTargetWorkTime` | `DateOfChange` | 9 |
| `Sync_DateValidity` | `__ID_DateValidity` | — | 7 |
| `Sync_DayTime` | `__ID_DayTime` | `TimeStampOfChange` | 5 |
| `Sync_Editorial` | `__ID_Editorial` | `DateOfChange` | 4 |
| `Sync_Email` | `__ID_Email` | `TimeStampOfChange` | 12 |
| `Sync_Exam` | `__ID_Exam` | `DateOfChange` | 5 |
| `Sync_Flag` | `__ID_Flag` | — | 3 |
| `Sync_Group` | `__ID_Group` | `DateOfChange` | 21 |
| `Sync_Instalment` | `__ID_Instalment` | `DateOfChange` | 8 |
| `Sync_Institution` | `__ID_Institution` | `TimestampChange` | 6 |
| `Sync_Invoice` | `__ID_Invoice` | `TimeStampOfChange` | 11 |
| `Sync_Key` | `__ID_Key` | `DateOfChange` | 7 |
| `Sync_KeyTypeReference` | `__ID_KeyTypeReference` | `DateOfChange` | 3 |
| `Sync_Letter` | `__ID_Letter` | — | 16 |
| `Sync_Management` | `__ID_Management` | `TimeStampOfChange` | 3 |
| `Sync_Offer` | `__ID_Offer` | `TimeStampOfChange` | 16 |
| `Sync_Order` | `__ID_Order` | — | 6 |
| `Sync_OrderDetail` | `__ID_OrderDetail` | — | 7 |
| `Sync_PaymentIn` | `__ID_PaymentIn` | `TimeStampOfChange` | 11 |
| `Sync_PaymentOut` | `__ID_PaymentOut` | `DateOfChange` | 16 |
| `Sync_Person` | `__ID_Person` | `TimestampChange` | 28 |
| `Sync_Phone` | `__ID_Phone` | `TimeStampOfChange` | 13 |
| `Sync_PreBooking` | `__ID_PreBooking` | `Timestamp.Change` | 14 |
| `Sync_Purview` | `__ID_Purview` | `DateChange` | 8 |
| `Sync_Room` | `__ID_Room` | `DateOfChange` | 7 |
| `Sync_ServiceDetail` | `__ID_ServiceDetail` | `DateOfChange` | 7 |
| `Sync_ServiceDetailReference` | `__ID_ServiceDetailReference` | `DateOfChange` | 3 |
| `Sync_ServiceDetailSpecificationReference` | `__ID_ServiceDetailSpecificationReference` | `DateOfChange` | 3 |
| `Sync_SingleDateActivity` | `__ID_SingleDateActivity` | `DateOfChange` | 8 |
| `Sync_SingleDateControl` | `__ID_SingleDateControl` | `DateOfChange` | 7 |
| `Sync_SingleDateCourse` | `__ID_SingleDateCourse` | `DateOfChange` | 12 |
| `Sync_SingleDateOccupancy` | `__ID_SingleDateOccupancy` | `DateOfChange` | 5 |
| `Sync_SingleDateStudent` | `__ID_SingleDateStudent` | `TimeStampOfChange` | 12 |
| `Sync_SingleDayStaff` | `__ID_SingleDayStaff` | `DateOfChange` | 10 |
| `Sync_SingleMonthStaff` | `__ID_SingleMonthStaff` | `DateOfChange` | 10 |
| `Sync_SingleWeekCleaning` | `__ID_SingleWeekCleaning` | `DateOfChange` | 7 |
| `Sync_SingleYearStaff` | `__ID_SingleYearStaff` | `DateOfChange` | 7 |
| `Sync_StaffMember` | `__ID_StaffMember` | `DateOfChange` | 13 |
| `Sync_StatementLandlord` | `__ID_StatementLandlord` | — | 10 |
| `Sync_TestStudent` | `__ID_TestStudent` | `DateOfChange` | 11 |
| `Sync_WaitingRoom` | `__ID_WaitingRoom` | `Timestamp.Change` | 9 |
| `Sync_WeekDay` | `__ID_WeekDay` | — | 8 |
| `Sync_WorkFlow` | `__ID_Workflow` | `TimeStampOfChange` | 16 |
| `Sync_WorkFlowLetter` | `__ID_WorkFlowLetter` | — | 4 |

## The fields

**Accommodation** (15): `DateOfChange`, `DateOfCreation`, `DescriptionAccommodation_1`, `DescriptionAccommodation_2`, `SearchfieldAccommodation.Institution`, `_ID_AccommodationTypeOffer`, `_ID_Active`, `_ID_Management`, `_ID_Person`, `_ID_Pet`, `_ID_Quality`, `_ID_SchoolFlatShare`, `_ID_Smoker`, `_ID_WashingMachine`, `__ID_Accommodation`

**ActivityReference** (3): `ActivityReference_1`, `DateOfChange`, `__ID_ActivityReference`

**Address** (15): `City`, `HouseNumber`, `Street`, `TimeStampOfChange`, `TimeStampOfCreation`, `ZCountry_1`, `ZPostCode`, `_ID_Accommodation`, `_ID_Agency`, `_ID_Corporate`, `_ID_Institution`, `_ID_Management`, `_ID_Person`, `_ID_StaffMember`, `__ID_Address`

**Agency** (7): `Agreement`, `DateOfChange`, `InstitutionAgency`, `_ID_Active`, `_ID_Institution`, `_ID_Management`, `__ID_Agency`

**Agreement** (17): `AgreementComment_1`, `Agreement_1`, `Agreement_2`, `Agreement_3`, `Agreement_4`, `Agreement_5`, `DateOfChange`, `DateOfCreation`, `LengthDuration`, `Level`, `Recommendation`, `Subject`, `TypeAgreement_1`, `UserName`, `_ID_Booking`, `_ID_Person`, `__ID_Agreement`

**AnimalAtHome** (4): `Animal_1`, `TimestampOfChange`, `_ID_Accommodation`, `__ID_AnimalAtHome`

**BankAccount** (10): `AccountOwner`, `BIC`, `BankName`, `IBAN.Text`, `SWIFT.Text`, `TimestampOfChange`, `TimestampOfCreation`, `_ID_Person`, `_ID_StaffMember`, `__ID_BankAccount`

**Booking** (15): `DateOfCreation`, `FinalNote`, `TimeStampOfChange`, `TimeStampOfCreation`, `_ID_Agency`, `_ID_Corporate`, `_ID_CourseTypeReference`, `_ID_EnrolmentDone`, `_ID_Exam`, `_ID_Group`, `_ID_PaymentThird`, `_ID_Person`, `_ID_Student`, `_ID_VisaRequired`, `__ID_Booking`

**Classroom** (4): `CityClassRoom`, `DateOfChange`, `NumberRoom.Text`, `__ID_Classroom`

**CleaningDetail** (6): `CleaningDetail_1`, `CleaningDetail_2`, `DateOfChange`, `_ID_Accommodation`, `_ID_CleaningJobReference`, `__ID_CleaningDetail`

**Comment** (12): `Comment_1`, `Comment_2`, `Subject`, `TimeStampOfChange`, `TimeStampOfCreation`, `UserName`, `_ID_Accommodation`, `_ID_Booking`, `_ID_Group`, `_ID_Offer`, `_ID_Person`, `__ID_Comment`

**Commission** (11): `Commission`, `CostDetail_1`, `CostGross`, `DateOfChange`, `Percentage`, `_ID_Agency`, `_ID_Booking`, `_ID_Corporate`, `_ID_CostDetail`, `_ID_PaymentCommission`, `__ID_Commission`

**CommissionDetail** (7): `CommentPercentage`, `Percentage`, `TimestampOfchange`, `_ID_Agency`, `_ID_Booking`, `_ID_CostDetailReference`, `__ID_CommissionDetail`

**Complaint** (11): `CommentNote`, `ComplaintReference_1`, `Complaint_1`, `Complaint_2`, `Subject`, `TimeStampOfChange`, `TimeStampOfCreation`, `UserName`, `_ID_Booking`, `_ID_Person`, `__ID_Complaint`

**Corporate** (5): `DateOfChange`, `HeaderCorporate.Text`, `_ID_Active`, `_ID_Management`, `__ID_Corporate`

**CostDetail** (12): `CostDetailComment_1`, `CostDetail_1`, `CostGross`, `CostGrossUnit`, `TimeStampOfChange`, `TimeStampOfCreation`, `Unit`, `_ID_Booking`, `_ID_CostDetailReference`, `_ID_ProductDelivered`, `_ID_SerialNumberInvoice`, `__ID_CostDetail`

**CostDetailSample** (11): `CostDetailComment_1`, `CostDetailComment_2`, `CostDetail_1`, `CostDetail_2`, `CostGrossUnit`, `DateOfChange`, `Unit`, `_ID_CostDetailReference`, `_ID_Offer`, `_ID_Sort`, `__ID_CostDetailSample`

**Course** (15): `CapStudent`, `CoursePrice`, `CourseTitle`, `DateOfChange`, `LevelShort`, `LevelShown`, `ZEndDate`, `ZStartDate`, `_ID_Active`, `_ID_Bookable`, `_ID_Corporate`, `_ID_CourseTypeReference`, `_ID_DayTimeReference`, `_ID_Group`, `__ID_Course`

**DateAccommodation** (12): `TimeStampOfChange`, `ZEndDate`, `ZStartDate`, `_ID_Accommodation`, `_ID_AccommodationCatering`, `_ID_AccommodationRoom`, `_ID_AccommodationType`, `_ID_Booking`, `_ID_DepartureConfirmed`, `_ID_EnrolmentDone`, `_ID_Room`, `__ID_DateAccommodation`

**DateBooking** (8): `CommentBooking`, `DateOfChange`, `DateOfCreation`, `ZEndDate`, `ZStartDate`, `_ID_Booking`, `_ID_Course`, `__ID_DateBooking`

**DateOffer** (6): `DateOfChange`, `ZEndDate`, `ZStartDate`, `_ID_Offer`, `_ID_TypeOfferReference`, `__ID_DateOffer`

**DatePlacement** (9): `Institution`, `TimeStampOfChange`, `ZEndDate`, `ZStartDate`, `_ID_Group`, `_ID_Management`, `__ID_DatePlacement`, `max_NumberStudent`, `min_NumberStudent`

**DateRent** (10): `DateOfChange`, `DescriptionRent.Short`, `ZEndDate`, `ZStartDate`, `_ID_Accommodation`, `_ID_Group`, `_ID_Room`, `__ID_DateRent`, `max_NumberStudent`, `min_NumberStudent`

**DateTargetWorkTime** (9): `DateOfChange`, `TargetWorkTime.Teaching.Week`, `TargetWorkTime.Week`, `ZEndDate`, `ZStartDate`, `_ID_Person`, `_ID_StaffMember`, `_ID_StatusSalarylReference`, `__ID_DateTargetWorkTime`

**DateValidity** (7): `LicenseNumber`, `ZEndDate`, `ZStartDate`, `_ID_LicenseReference`, `_ID_Person`, `_ID_StaffMember`, `__ID_DateValidity`

**DayTime** (5): `HourEnd`, `HourStart`, `TimeStampOfChange`, `_ID_Course`, `__ID_DayTime`

**Editorial** (4): `DateOfChange`, `InstitutionEditorial`, `_ID_Management`, `__ID_Editorial`

**Email** (12): `Email`, `TimeStampOfChange`, `TimeStampOfCreation`, `_ID_Accommodation`, `_ID_Agency`, `_ID_Corporate`, `_ID_Institution`, `_ID_Management`, `_ID_Person`, `_ID_StaffMember`, `_ID_Use`, `__ID_Email`

**Exam** (5): `DateOfChange`, `Exam.ZSingleDate_OneLine`, `NumberPlace`, `_ID_ExamReference`, `__ID_Exam`

**Flag** (3): `CountryLong_1`, `Country_1`, `__ID_Flag`

**Group** (21): `AgeStudent`, `CommentArrival_Departure`, `CommentArrival_Departure_Short`, `DateOfChange`, `NumberStudent`, `NumberTeacher`, `TimeStampOfCreation`, `TitleGroup`, `UserName`, `ZEndDateAcco`, `ZEndDateTuition`, `ZStartDateAcco`, `ZStartDateTuition`, `_ID_Agency`, `_ID_Corporate`, `_ID_Country`, `_ID_CourseTypeReference`, `_ID_Level`, `_ID_Platform`, `_ID_StatusGroup`, `__ID_Group`

**Instalment** (8): `DateOfChange`, `Instalment`, `InstalmentDetail_1`, `OrdinalNumber`, `Z_DatePaymentDue`, `_ID_Booking`, `_ID_PaymentDone`, `__ID_Instalment`

**Institution** (6): `Institution`, `TimestampChange`, `_ID_Agency`, `_ID_Corporate`, `_ID_Management`, `__ID_Institution`

**Invoice** (11): `AddressHeader`, `Amount`, `DateOfCreation`, `Subject`, `TimeStampOfChange`, `_ID_Agency`, `_ID_Booking`, `_ID_Corporate`, `_ID_Person`, `_ID_SerialNumberInvoice`, `__ID_Invoice`

**Key** (7): `Comment`, `DateOfChange`, `KeyNumber`, `_ID_Active`, `_ID_KeyTypeReference`, `_ID_StaffMember`, `__ID_Key`

**KeyTypeReference** (3): `DateOfChange`, `KeyTypeReference_1`, `__ID_KeyTypeReference`

**Letter** (16): `AddressHeader`, `DateOfEmission`, `Date_LetterSent`, `Email`, `FreeField`, `ScriptName`, `ScriptParameter`, `Subject`, `TimeStampOfCreation`, `UserName`, `_ID_Agency`, `_ID_Booking`, `_ID_Corporate`, `_ID_Offer`, `_ID_Person`, `__ID_Letter`

**Management** (3): `TimeStampOfChange`, `_ID_StatusManagementReference`, `__ID_Management`

**Offer** (16): `DateOfCreation`, `Email`, `Subject`, `TimeStampOfChange`, `TimeStampOfCreation`, `UserName`, `_ID_ActiveTemplate`, `_ID_Address`, `_ID_Agency`, `_ID_Booking`, `_ID_Corporate`, `_ID_Group`, `_ID_Invoice`, `_ID_Person`, `_ID_PreBooking`, `__ID_Offer`

**Order** (6): `DateOfEmission`, `Email`, `UserName`, `_ID_Editorial`, `_ID_OrderDone`, `__ID_Order`

**OrderDetail** (7): `CostNet`, `CostNetUnit`, `OrderDetail_OneLine`, `Unit`, `_ID_BookReference`, `_ID_Order`, `__ID_OrderDetail`

**PaymentIn** (11): `CommentPaymentIn_1`, `CommentPaymentIn_2`, `CostDetailReference_1`, `DateOfPayment`, `MethodPayment_1`, `PaymentIn`, `TimeStampOfChange`, `TimeStampOfCreation`, `_ID_Booking`, `_ID_MethodPayment`, `__ID_PaymentIn`

**PaymentOut** (16): `Comment`, `DateOfChange`, `DatePaymentOut`, `MethodPayment_1`, `PaymentOut`, `PaymentOutComment_1`, `PaymentOutDetailReference_1`, `TimeStampOfCreation`, `ZSingleDatePayment`, `_ID_Accommodation`, `_ID_Agency`, `_ID_Booking`, `_ID_Corporate`, `_ID_DateAccommodation`, `_ID_PaymentOutReference`, `__ID_PaymentOut`

**Person** (28): `BirthPlace`, `CountryBirth_1`, `DateOfBirth`, `DateOfCreation`, `Function`, `Gender_1`, `MotherTongue_1`, `NickName`, `NumberAgeInsurance`, `NumberHealthInsurance`, `NumberTaxe`, `Occupation`, `TimestampChange`, `TimestampCreation`, `ZFirstName`, `ZSurName`, `ZSurName2`, `_ID_Accommodation`, `_ID_Agency`, `_ID_Client`, `_ID_Corporate`, `_ID_GenderReference`, `_ID_Homeland`, `_ID_Institution`, `_ID_Management`, `_ID_Status_Family`, `_ID_Student`, `__ID_Person`

**Phone** (13): `AreaCode`, `Phone`, `TimeStampOfChange`, `TimeStampOfCreation`, `_ID_Accommodation`, `_ID_Agency`, `_ID_Corporate`, `_ID_Institution`, `_ID_Management`, `_ID_Person`, `_ID_StaffMember`, `_ID_Use`, `__ID_Phone`

**PreBooking** (14): `DateOfCreation`, `Timestamp.Change`, `Timestamp.Creation`, `UserName`, `_ID_Booking`, `_ID_Course`, `_ID_CourseTypeReference`, `_ID_DayTimeReference`, `_ID_Level`, `_ID_LevelStepReference`, `_ID_Person`, `_ID_StatusPreBooking`, `_ID_VisaRequired`, `__ID_PreBooking`

**Purview** (8): `DateChange`, `Z_EndDate`, `Z_StartDate`, `_ID_Active`, `_ID_Person`, `_ID_PurviewReference`, `_ID_StaffMember`, `__ID_Purview`

**Room** (7): `CommentRoom_1`, `DateOfChange`, `NumberPerson`, `RoomName`, `_ID_Accommodation`, `_ID_TypeRoom`, `__ID_Room`

**ServiceDetail** (7): `DateOfChange`, `ServiceDetailComment_1`, `ServiceDetail_1`, `_ID_Group`, `_ID_ServiceDetailReference`, `_ID_ServiceDetailSpecificationReference`, `__ID_ServiceDetail`

**ServiceDetailReference** (3): `DateOfChange`, `ServiceDetailReference_1`, `__ID_ServiceDetailReference`

**ServiceDetailSpecificationReference** (3): `DateOfChange`, `ServiceDetailSpecificationReference_1`, `__ID_ServiceDetailSpecificationReference`

**SingleDateActivity** (8): `Activity_1`, `DateOfChange`, `HourStart`, `MeetingPoint_1`, `ZSingleDate`, `_ID_ActivityReference`, `_ID_Group`, `__ID_SingleDateActivity`

**SingleDateControl** (7): `DateOfChange`, `ScriptName`, `TimeStampOfCreation`, `UserName`, `ZSingleDate`, `_ID_Booking`, `__ID_SingleDateControl`

**SingleDateCourse** (12): `DateOfChange`, `HourEnd`, `HourStart`, `NumberLesson`, `ZSingleDateCourse`, `_ID_Classroom`, `_ID_Course`, `_ID_Holiday`, `_ID_Particularity`, `_ID_PersonSubstituted`, `_ID_StaffMember`, `__ID_SingleDateCourse`

**SingleDateOccupancy** (5): `DateOfChange`, `_ID_Classroom`, `_ID_ClassroomSubstituted`, `_ID_SingleDateCourse`, `__ID_SingleDateOccupancy`

**SingleDateStudent** (12): `Comment`, `DelayMinute`, `NumberLesson`, `TimeStampOfChange`, `ZSingleDateStudent`, `_ID_Absence`, `_ID_Booking`, `_ID_Excuse`, `_ID_IllnessDetail`, `_ID_Presence`, `_ID_SingleDateCourse`, `__ID_SingleDateStudent`

**SingleDayStaff** (10): `DateOfChange`, `HourEnd`, `HourStart`, `ZSingleDay`, `_ID_Absence`, `_ID_AbsenceDetail`, `_ID_Holiday`, `_ID_Illness`, `_ID_StaffMember`, `__ID_SingleDayStaff`  
*Never on the layout:* `cal_*`

**SingleMonthStaff** (10): `DateOfChange`, `MonthSingleDay`, `StaticBalanceHolidayRunning`, `StaticBalanceWorkMonth`, `StaticBalanceWorkRunning`, `YearSingleDay`, `ZStartDate`, `_ID_Approved`, `_ID_StaffMember`, `__ID_SingleMonthStaff`

**SingleWeekCleaning** (7): `DateOfChange`, `ZEndDate`, `ZStartDate`, `_ID_Accommodation`, `_ID_CleaningJobReference`, `_ID_Room`, `__ID_SingleWeekCleaning`

**SingleYearStaff** (7): `DateOfChange`, `NumberDayHolidayYear`, `RemainingHoliday`, `StaticBalanceWorkRunning`, `YearSingleDay`, `_ID_StaffMember`, `__ID_SingleYearStaff`

**StaffMember** (13): `DateOfChange`, `SearchFieldTeacherFirstName`, `SearchFieldTeacherSurName`, `TeacherFirstName.Surname.Short`, `_ID_ActiveAdministration`, `_ID_ActiveStaff`, `_ID_ActiveTeacher`, `_ID_CourseTypeReference`, `_ID_DayTimeReference`, `_ID_Person`, `_ID_ShiftReception`, `_ID_WeekDay`, `__ID_StaffMember`  
*Never on the layout:* `CommentsOnTeacher`

**StatementLandlord** (10): `DateOfEmission`, `FreeField`, `HeaderAccommodation`, `HeaderLandlord`, `Subject`, `TimeStampOfCreation`, `UserName`, `_ID_Accommodation`, `_ID_Booking`, `__ID_StatementLandlord`

**TestStudent** (11): `CommentTest`, `DateOfChange`, `DateOfCreation`, `DateOfTest`, `LevelShort`, `Result`, `TestReference`, `User`, `_ID_Booking`, `_ID_Person`, `__ID_TestStudent`

**WaitingRoom** (9): `DateOfCreation`, `Timestamp.Change`, `Timestamp.Creation`, `UserName`, `_ID_Booking`, `_ID_Course`, `_ID_Person`, `_ID_PreBooking`, `__ID_WaitingRoom`

**WeekDay** (8): `HourEnd`, `HourStart`, `NumberLesson`, `_ID_ClassRoom`, `_ID_Course`, `_ID_StaffMember`, `_ID_WeekDayReference`, `__ID_WeekDay`

**WorkFlow** (16): `CommentWorkflow`, `FollowUp`, `HourEnd`, `HourStart`, `TimeStampOfChange`, `TimeStampOfCreation`, `UserName`, `Workflow_1`, `ZSingleDayCalendar`, `_ID_Booking`, `_ID_Completed`, `_ID_Group`, `_ID_Offer`, `_ID_Person`, `_ID_PublicCalendar`, `__ID_Workflow`

**WorkFlowLetter** (4): `DateOfCreation`, `FormCommunication`, `_ID_Letter`, `__ID_WorkFlowLetter`
