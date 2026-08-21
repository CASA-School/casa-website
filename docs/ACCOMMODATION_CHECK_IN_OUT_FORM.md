# Accommodation check-in / check-out form

Received from CASA 2026-08-21. Original: `docs/assets/CASA-Check-In-Out-Formular.docx`.
Structured record: `src/config/content/accommodation-checkin-form.ts`.

## What it is

A German Word form, headed **CASA Unterkunft**, that a host family and a student
complete **together** — once at arrival and again at departure. Eight sections:

| § | Section | Records |
| --- | --- | --- |
| 1 | Angaben zur Unterbringung | student, date of birth, host family, address, room, period, check-in and check-out dates |
| 2 | Hausregeln (Kurzfassung) | smoking, visitors, cleaning, other, plus the internet-use clause |
| 3 | Inventar & Zustand des Zimmers | bed, mattress, desk, chair, wardrobe, shelf on a four-step scale **at check-in and again at check-out**; lamp working/not; bed linen count |
| 4 | Zustand der Wände | no damage / signs of use / marks / drill holes / cracks / other, plus pre-existing and new damage |
| 5 | Schlüssel & Ausstattung | keys handed over and returned, WLAN access, what is shared (kitchen, bathroom, washing machine, WLAN), whether photos were taken |
| 6 | Reinigung & Gesamteindruck | clean / needs cleaning / heavily soiled, plus remarks |
| 7 | Haftung & Vereinbarungen | whether the student holds personal liability insurance, agreements on damage |
| 8 | Unterschriften | place, date and both signatures, at check-in and at check-out |

The form's own stated purpose: a joint record of the condition of the
accommodation, "für Transparenz, gegenseitige Absicherung sowie Vorbeugung
möglicher Missverständnisse" — transparency, mutual protection, and preventing
misunderstandings.

## Why it matters to the website

It is the mechanism behind a rule the site already publishes: the **€580 deposit
is refunded when the room and the keys come back as they were handed over**. Until
now the site asserted the rule with nothing behind it. The accommodation pages now
say the handover is documented jointly, which is both true and the reassurance a
student paying a €580 deposit is looking for.

**The form itself is not published.** House rules, liability and signature blocks
are between the host and the student. `checkInSummary()` in the config is the
public-safe extract — what gets recorded, not the record.

## Three things to confirm with CASA

1. **The internet-use paragraph ends mid-sentence.** Section 2 stops at
   *"...jedoch bei Verstößen (kostenpflichtige Downloads etc.) die in Deutschland
   geltenden gesetzlichen Bestimmungen für kostenpflichtige"* and then section 3
   begins. It is reproduced verbatim in the config with an explicit marker,
   because completing a liability sentence would mean inventing legal wording.
   **Ask CASA for the intended ending.**
2. **The phone number disagrees with the website.** The form's footer gives
   `+49 421 414 3-0`; this site publishes `+49 421 460 414 3-0`. One is wrong and
   it is the most consequential contact detail on the site. Not changed on a
   guess — needs confirming.
3. **`accommodation@casa-bremen.de`** appears in the form's footer and was not
   anywhere in this repository. It is now the accommodation Ansprechperson's
   address on `/accommodation/[type]`, replacing the general office inbox. Confirm
   it is monitored, and confirm whether it or a personal address should be shown.

## When the dashboard is built

`accommodationCheckInForm` is shaped for rendering, not for prose: every field
carries an `id`, a German and English label, and a `kind` the UI can switch on —
`conditionInOut` and `functionInOut` are the two that need a check-in value and a
check-out value side by side, which is the whole point of the document.

Do **not** build this into the public site. CLAUDE.md hard rule 1 keeps dashboard
surfaces out of this repository; this file and the config are the handover, so the
dashboard work starts from a structure rather than from a Word file.
