# Translations: Turkish, Arabic, Spanish, Italian, Russian, Ukrainian

Since 2026-10-11 every text of the public site, all 2,100-odd that the website editor can
edit, is translated into six more languages (Rahman: "the best quality out there, no
compromises"). They are **prepared, not published**: stored in the repository, shown and
editable in the website editor, and invisible to visitors until a language is switched on in
`src/i18n/routing.ts` (`docs/I18N_ROUTING.md`). The German is still being improved, so the
translations are re-run whenever it changes. This file is the process and the brief every run
follows.

## Where they live

- `src/config/cms/translation-locales.ts`: the six codes: `tr ar es it ru uk`.
- `src/config/cms/translations/<code>.json`: `{ "<slot key>": { "de": "<German it was made from>", "text": "<translation>" } }`.
- `src/lib/cms/translations.ts`: reads them. The catalog gives them to the editor as each
  slot's default in that language; `prepareCopy(locale)` serves them once a language is routed.
  An edit in the editor overrides the file, as it does for German and English.
- A slot key is made from the German and English defaults (`src/lib/cms/copy-key.ts`). When the
  German in the code changes, the key changes and the old translation stops matching. That is
  how a run knows what to do: exactly the texts whose German is new.

## The run (do this every time Rahman says the German changed, or "run the translations")

1. The German (and its English) are updated in the code. Then `npm run cms:extract`.
2. `npm run cms:translations`: how many texts each language is missing.
3. `npm run cms:translations -- todo`: writes the missing texts as batches,
   `output/translations/<code>/todo-NN.json` (`--size` sets the texts per batch, `--locale`
   limits the languages). Each item has the key, the German, the English, the kind of text
   (`label`, `button`, `lead`, `paragraph`, …), its character limit and where it appears.
4. Translate every batch into `done-NN.json` beside it (`{ "<key>": "<translation>" }`),
   following the brief below. **Two passes, by different agents:** a translator, then an
   independent reviewer who reads German, English and the translation side by side and
   corrects in place (accuracy, register, terminology, length, naturalness). For a big run, one
   translator and one reviewer per language and half; for a handful of texts, one agent per
   language, then a reviewer.
5. `npm run cms:translations -- merge`: refuses any text that lost or invented a `{placeholder}`,
   is empty, or is not in the language's script; stores the rest; drops translations whose text
   left the site. Fix what it refuses and merge again.
6. `npm run test` (`src/lib/cms/__tests__/translations.test.ts` checks every stored text), then
   commit, PR, merge. Deploying is a separate request.

## The brief

**Translate from the German.** It is the source of truth. The English beside it was written to
say the same thing and helps with meaning; where they differ, follow the German.

**CASA's voice in every language.** CASA is a non-profit language school in Bremen (since 1983).
It writes warmly and plainly, in complete sentences, with "we" for the school and the reader
addressed directly. No marketing clichés, no superlatives the German does not have, no
exclamation marks it does not have. It reads as if it was written in the language, not
translated: preserve meaning and facts, not sentence structure. Many readers are learning
German and read the site in their own language to be sure they understood, so clarity wins over
elegance.

**Form of address** (Rahman, 2026-10-11: each language's norm):

| Language | Address | Notes |
| --- | --- | --- |
| Spanish (es) | **tú** | Neutral international Spanish, understood in Spain and Latin America: no vosotros (plural: ustedes), no regionalisms. |
| Italian (it) | **tu** | |
| Turkish (tr) | **siz** | Warm, not stiff: "Size yardımcı olalım", not bureaucratic constructions. |
| Russian (ru) | **вы** (lowercase) | Modern, natural Russian. |
| Ukrainian (uk) | **ви** (lowercase) | Modern standard Ukrainian. Ukrainian vocabulary and syntax, never Russian calques. |
| Arabic (ar) | Second person singular, as the generic form | Modern Standard Arabic, contemporary and clear. Arabic punctuation (، ؛ ؟). Digits as in the German. |

**Never change**

- Every `{placeholder}`, character for character, including its braces. Dotted ones are live
  values: `{course.intensive-german.price}` becomes "ab 520 €" on the page. Keep each one
  exactly once if the German has it once, and move it to where the sentence needs it.
- Level codes (A1, A2, B1, B1+, B2, C1, A1.1 …), times (09:00–12:30), numbers, prices, dates,
  e-mail addresses, phone numbers, URLs, street names.
- Names: CASA, Bremen, telc Deutsch B2, telc Deutsch C1 Hochschule, Netzwerk neu, Kontext,
  Klett, Goethe, FileMaker, Google, WhatsApp. **Bildungszeit** keeps its German name; where the
  German explains it, explain it (Bremen's paid leave for further training). **Fachsprachprüfung**
  keeps its German name, with the language's word for it after it the first time a text uses it.

**Length.** Stay within each item's `max` characters; aim for the length of the German. A
`label`, a `button` or a `card-title` is short: a noun phrase or a short imperative, no full
stop. A heading has no full stop. Cards hold the short version of a text, never a longer one.

**Inclusive.** German writes Teilnehmende, Lehrkräfte. Use the language's natural inclusive
or collective form (participants, the teaching team), never slashes, asterisks or brackets.

**Quotation marks** as the language writes them: «…» in Spanish, Italian, Russian, Ukrainian
and Arabic; “…” in Turkish.

**Do not** add or drop information, explain what the German does not explain, translate a
`{placeholder}`, leave German words standing (except the names above), or write the formal
address in Spanish/Italian or the informal one in Turkish/Russian/Ukrainian.

## Glossary

One name for each thing, in every text of a language.

| German | English (site) | es | it | tr | ru | uk | ar |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Intensivkurs | intensive course | curso intensivo | corso intensivo | yoğun kurs | интенсивный курс | інтенсивний курс | دورة مكثفة |
| Abendkurs | evening course | curso vespertino | corso serale | akşam kursu | вечерний курс | вечірній курс | دورة مسائية |
| Spezialkurse, Modul | special courses, module | cursos especiales, módulo | corsi speciali, modulo | özel kurslar, modül | специальные курсы, модуль | спеціальні курси, модуль | دورات خاصة، وحدة |
| Deutsch für Pflege und Medizin | German for nursing and medicine | alemán para enfermería y medicina | tedesco per l’assistenza infermieristica e la medicina | hemşirelik ve tıp için Almanca | немецкий для медсестринского дела и медицины | німецька для медсестринства й медицини | الألمانية للتمريض والطب |
| Firmenunterricht | in-company teaching | clases en la empresa | corsi in azienda | şirkete özel ders | корпоративное обучение | корпоративне навчання | دروس داخل الشركات |
| Deutsch für Gruppen | classes for groups | clases para grupos | corsi per gruppi | gruplar için dersler | занятия для групп | заняття для груп | دروس للمجموعات |
| Prüfungsvorbereitung | exam preparation | preparación para el examen | preparazione all’esame | sınava hazırlık | подготовка к экзамену | підготовка до іспиту | التحضير للامتحان |
| Einstufungstest | placement test | prueba de nivel | test di livello | seviye tespit sınavı | тест на определение уровня | тест на визначення рівня | اختبار تحديد المستوى |
| Niveaustufe | level | nivel | livello | seviye | уровень | рівень | المستوى |
| Unterrichtseinheit (UE, 45 Min.) | lesson (45 minutes) | clase (de 45 minutos) | lezione (da 45 minuti) | ders saati (45 dakika) | академический час (45 минут) | академічна година (45 хвилин) | حصة دراسية (45 دقيقة) |
| Lehrwerk | textbook | libro de texto | libro di testo | ders kitabı | учебник | підручник | الكتاب الدراسي |
| Lehrkräfte | teachers | profesorado, docentes | insegnanti | öğretmenler | преподаватели | викладачі | المعلمون |
| Teilnehmende, Lernende | participants, learners | participantes, estudiantes | partecipanti, studenti | katılımcılar, öğrenciler | участники, учащиеся | учасники, слухачі | المشاركون، المتعلمون |
| Anmeldung, anmelden | registration, register | inscripción, inscribirse | iscrizione, iscriversi | kayıt, kayıt olmak | запись, записаться | реєстрація, зареєструватися | التسجيل، التسجيل |
| Kursgebühr | course fee | precio del curso | quota del corso | kurs ücreti | стоимость курса | вартість курсу | رسوم الدورة |
| Einschreibegebühr | enrolment fee | tasa de inscripción | quota d’iscrizione | kayıt ücreti | регистрационный взнос | реєстраційний внесок | رسوم التسجيل |
| Unterkunft | accommodation | alojamiento | alloggio | konaklama | проживание | проживання | السكن |
| CASA-WG (Wohngemeinschaft) | CASA shared flat | piso compartido de CASA | appartamento condiviso CASA | CASA paylaşımlı dairesi | квартира CASA для совместного проживания | спільна квартира CASA | سكن CASA المشترك |
| Gastfamilie | host family | familia de acogida | famiglia ospitante | konukçu aile | принимающая семья | приймальна сім’я | عائلة مضيفة |
| Kaution | deposit | depósito de garantía | cauzione | depozito | залог | застава | مبلغ التأمين |
| gemeinnützig (gGmbH) | non-profit | sin fines de lucro | senza scopo di lucro | kâr amacı gütmeyen | некоммерческий | неприбутковий | غير ربحي |
| Warteliste | waiting list | lista de espera | lista d’attesa | bekleme listesi | лист ожидания | список очікування | قائمة الانتظار |
| Teilnahmebestätigung | certificate of attendance | certificado de asistencia | attestato di frequenza | katılım belgesi | справка об участии | довідка про участь | شهادة حضور |
| Kostenrechner | cost calculator | calculadora de precios | calcolatore dei costi | ücret hesaplayıcı | калькулятор стоимости | калькулятор вартості | حاسبة التكاليف |
| Beratung | advice | asesoramiento | consulenza | danışmanlık | консультация | консультація | الاستشارة |

## Before a language goes live

- A native speaker at CASA reads the language's main pages: home, courses, one course page,
  exams, accommodation, contact. Machine-quality checks cannot replace that.
- The language is added to `src/i18n/routing.ts` and its URL map (`docs/I18N_ROUTING.md`),
  with hreflang, the sitemap and the language menu; Arabic needs its right-to-left layout
  checked page by page.
- What is not in the catalog still needs translating then: page titles and descriptions for
  search, the next-intl messages, form errors and emails. The legal pages stay German/English.
