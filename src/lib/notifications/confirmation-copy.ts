/**
 * The confirmation the person who sent a form receives, in both languages.
 *
 * Written 2026-10-01 from the repository's own facts (site copy, the terms,
 * the privacy policy) by three independent drafts, judged, then checked for
 * truth, German and English. It is a receipt, never an acceptance: a course or
 * exam contract forms only with CASA's own Anmeldebestätigung and the payment
 * (AGB 2.2), and an appointment only once the contact person confirms it.
 *
 * Shortened 2026-10-26 (Rahman: "a lot of text"): no reference code (nobody
 * at CASA looks a request up by it), no status row the steps already say, at
 * most three short steps, one closing line, a two-line footer with only what a
 * GmbH's business mail must carry and the privacy link. The exam receipt shows the name it
 * asks the candidate to check; never the date of birth, which a mistyped
 * address would receive.
 *
 * `{placeholders}` are filled by `buildConfirmationMail` from values the server
 * produced or checked, never from the sender's free text; a line whose
 * placeholder has no value is left out.
 *
 * Address: everyone reads „du“ and is greeted by first name — learners and
 * applicants since 2026-10-07, group organisers and companies since 2026-10-08
 * (Rahman: du all over). English greets the same way: "Hello {firstName},".
 *
 * An appointment request sent without a database (`held: false` in the
 * payload) takes the "unheld" variant: nothing holds the time then, so it never
 * says the time is reserved or will be released.
 */
export const CONFIRMATION_COPY = {
  "kinds": [
    {
      "kind": "contact",
      "variant": "",
      "de": {
        "subject": "Deine Anfrage ist bei CASA angekommen",
        "preheader": "Wir antworten dir so bald wie möglich persönlich per E-Mail.",
        "heading": "Danke für deine Nachricht",
        "intro": "deine Nachricht ist bei uns angekommen. Jemand aus unserem Team in Bremen liest sie und antwortet dir so bald wie möglich per E-Mail.",
        "summaryTitle": "",
        "summaryRows": [],
        "nextStepsTitle": "",
        "nextSteps": [],
        "closing": "Eilt es? Dann ruf uns gern während der Bürozeiten an: {phone}."
      },
      "en": {
        "subject": "Your enquiry has reached CASA",
        "preheader": "We’ll reply to you personally by email as soon as we can.",
        "heading": "Thank you for your message",
        "intro": "We’ve received your message. Someone from our team in Bremen will read it and reply to you by email as soon as we can.",
        "summaryTitle": "",
        "summaryRows": [],
        "nextStepsTitle": "",
        "nextSteps": [],
        "closing": "If it’s urgent, call us during office hours on {phone}."
      }
    },
    {
      "kind": "interest",
      "variant": "",
      "de": {
        "subject": "Du stehst auf unserer Interessentenliste",
        "preheader": "Sobald die Termine feststehen, melden wir uns bei dir.",
        "heading": "Danke für dein Interesse",
        "intro": "du stehst jetzt auf der Interessentenliste für „{course}“. Der Eintrag ist unverbindlich und kostet nichts.",
        "summaryTitle": "",
        "summaryRows": [],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Sobald genug Interessierte zusammen sind, legen wir die Termine fest und melden uns per E-Mail oder Telefon bei dir."
          },
          {
            "text": "Dann entscheidest du, ob du dich anmeldest."
          }
        ],
        "closing": "Wir freuen uns darauf, dich im Kurs zu begrüßen."
      },
      "en": {
        "subject": "You’re on our interest list",
        "preheader": "As soon as the dates are set, we’ll get in touch.",
        "heading": "Thank you for your interest",
        "intro": "You’re now on the interest list for “{course}”. Being on the list is free and doesn’t commit you to anything.",
        "summaryTitle": "",
        "summaryRows": [],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "As soon as enough people have signed up, we’ll set the dates and get in touch by email or phone."
          },
          {
            "text": "Then you decide whether to register."
          }
        ],
        "closing": "We look forward to welcoming you to the course."
      }
    },
    {
      "kind": "groups",
      "variant": "",
      "de": {
        "subject": "Deine Gruppenanfrage ist bei CASA angekommen",
        "preheader": "Wir melden uns per E-Mail und planen den Aufenthalt gern mit dir.",
        "heading": "Danke für deine Gruppenanfrage",
        "intro": "schön, dass du für deine Gruppe an CASA denkst. Deine Anfrage ist bei uns angekommen und natürlich unverbindlich.",
        "summaryTitle": "Deine Anfrage",
        "summaryRows": [
          {
            "label": "Gruppe",
            "value": "{groupSize} Personen"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Wir melden uns so bald wie möglich per E-Mail und klären mit dir, was noch offen ist."
          },
          {
            "text": "Gemeinsam planen wir den Unterricht und, wenn du möchtest, Kulturprogramm und Unterkunft. Danach bekommst du ein unverbindliches Angebot."
          }
        ],
        "closing": "Wir freuen uns auf die gemeinsame Planung."
      },
      "en": {
        "subject": "Your group enquiry has reached CASA",
        "preheader": "We’ll be in touch by email and would be glad to plan the stay with you.",
        "heading": "Thank you for your group enquiry",
        "intro": "We’re glad you’re thinking of CASA for your group. We’ve received your enquiry, and there’s no obligation at this stage.",
        "summaryTitle": "Your enquiry",
        "summaryRows": [
          {
            "label": "Group",
            "value": "{groupSize} people"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "We’ll reply by email as soon as we can and clear up anything we still need to know."
          },
          {
            "text": "Together we’ll plan the lessons and, if you wish, a culture programme and accommodation. Then you’ll receive a quote, with no obligation."
          }
        ],
        "closing": "We look forward to planning your group’s programme with you."
      }
    },
    {
      "kind": "groups",
      "variant": "company",
      "de": {
        "subject": "Deine Anfrage zum Firmenunterricht ist angekommen",
        "preheader": "Wir melden uns per E-Mail und klären mit dir, was dein Team braucht.",
        "heading": "Danke für deine Anfrage",
        "intro": "schön, dass du dein Team beim Deutschlernen unterstützen möchtest. Deine Anfrage ist bei uns angekommen und natürlich unverbindlich.",
        "summaryTitle": "Deine Anfrage",
        "summaryRows": [
          {
            "label": "Teilnehmende",
            "value": "{groupSize}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Wir melden uns so bald wie möglich per E-Mail und vereinbaren ein Gespräch mit dir."
          },
          {
            "text": "Darin klären wir Ziele, Sprachniveaus und Zeiten deines Teams. Danach bekommst du ein unverbindliches Angebot."
          }
        ],
        "closing": "Wir freuen uns auf das Gespräch mit dir."
      },
      "en": {
        "subject": "Your enquiry about in-company teaching has reached CASA",
        "preheader": "We’ll be in touch by email, and together we’ll work out what your team needs.",
        "heading": "Thank you for your enquiry",
        "intro": "It’s good to hear you’d like to help your team learn German. We’ve received your enquiry, and there’s no obligation at this stage.",
        "summaryTitle": "Your enquiry",
        "summaryRows": [
          {
            "label": "Participants",
            "value": "{groupSize}"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "We’ll reply by email as soon as we can and arrange a conversation with you."
          },
          {
            "text": "In it, we’ll talk about your team’s goals, language levels and times. Then you’ll receive a quote, with no obligation."
          }
        ],
        "closing": "We look forward to speaking with you."
      }
    },
    {
      "kind": "course",
      "variant": "",
      "de": {
        "subject": "Deine Kursanmeldung ist bei CASA eingegangen",
        "preheader": "Wir prüfen deine Anmeldung und melden uns per E-Mail bei dir.",
        "heading": "Schön, dass du bei uns Deutsch lernen möchtest",
        "intro": "deine Anmeldung ist bei uns angekommen.",
        "summaryTitle": "Deine Anmeldung",
        "summaryRows": [
          {
            "label": "Kurs",
            "value": "{course}"
          },
          {
            "label": "Niveau",
            "value": "{courseLevel}"
          },
          {
            "label": "Zeitraum",
            "value": "{dates}"
          },
          {
            "label": "Unterrichtszeiten",
            "value": "{schedule}"
          },
          {
            "label": "Ort",
            "value": "{location}"
          },
          {
            "label": "Weiterer Kurs",
            "value": "{moreCourses}"
          },
          {
            "label": "Prüfung",
            "value": "{addedExam}"
          },
          {
            "label": "Unterkunft",
            "value": "{accommodation} – angefragt"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Wir prüfen, ob noch ein Platz frei ist und der Kurs zu dir passt. Wenn wir Fragen haben, melden wir uns."
          },
          {
            "text": "Danach bekommst du per E-Mail deine Anmeldebestätigung mit der Zahlungsfrist und allen Infos zum Kursstart."
          },
          {
            "text": "Fest reserviert ist dein Platz, sobald deine Zahlung fristgerecht bei uns eingegangen ist."
          }
        ],
        "closing": "Du musst jetzt nichts weiter tun. Unsere AGB mit der Widerrufsbelehrung findest du unter {siteUrl}/agb."
      },
      "en": {
        "subject": "Your course registration has reached CASA",
        "preheader": "We’ll review your registration and be in touch by email.",
        "heading": "We’re glad you’d like to learn German with us",
        "intro": "We’ve received your registration.",
        "summaryTitle": "Your registration",
        "summaryRows": [
          {
            "label": "Course",
            "value": "{course}"
          },
          {
            "label": "Level",
            "value": "{courseLevel}"
          },
          {
            "label": "Dates",
            "value": "{dates}"
          },
          {
            "label": "Class times",
            "value": "{schedule}"
          },
          {
            "label": "Location",
            "value": "{location}"
          },
          {
            "label": "Another course",
            "value": "{moreCourses}"
          },
          {
            "label": "Exam",
            "value": "{addedExam}"
          },
          {
            "label": "Accommodation",
            "value": "{accommodation} (requested)"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "We’ll check that a place is free and that the course suits you. If we have questions, we’ll get in touch."
          },
          {
            "text": "Then we’ll email you your confirmation of registration, with the payment deadline and everything about your course start."
          },
          {
            "text": "Your place is reserved once your payment reaches us by the deadline."
          }
        ],
        "closing": "There’s nothing more you need to do for now. Our terms and conditions, including the right of withdrawal, are at {siteUrl}/en/terms."
      }
    },
    {
      "kind": "exam",
      "variant": "",
      "de": {
        "subject": "Deine Prüfungsanmeldung ist bei CASA eingegangen",
        "preheader": "Wir prüfen deine Anmeldung und melden uns per E-Mail bei dir.",
        "heading": "Danke für deine Prüfungsanmeldung",
        "intro": "deine Anmeldung ist bei uns angekommen.",
        "summaryTitle": "Deine Anmeldung",
        "summaryRows": [
          {
            "label": "Prüfung",
            "value": "{exam}"
          },
          {
            "label": "Termin",
            "value": "{examDate}"
          },
          {
            "label": "Prüfungsteil",
            "value": "{examPart}"
          },
          {
            "label": "Ort",
            "value": "{location}"
          },
          {
            "label": "Name",
            "value": "{firstName} {lastName}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Wir prüfen, ob zu deinem Termin noch ein Platz frei ist, und schicken dir dann die Fristen für Zahlung und Dokumente."
          },
          {
            "text": "Fest ist dein Platz, sobald deine Zahlung eingegangen ist und deine Angaben stimmen."
          },
          {
            "text": "Vor der Prüfung bekommst du alle Unterlagen und Hinweise per E-Mail."
          }
        ],
        "closing": "Bitte prüfe deinen Namen und dein Geburtsdatum: Sie müssen genau so wie in deinem Pass oder Ausweis geschrieben sein. Stimmt etwas nicht, antworte einfach auf diese E-Mail.\n\nUnsere AGB mit der Widerrufsbelehrung findest du unter {siteUrl}/agb. Wir wünschen dir viel Erfolg bei der Vorbereitung."
      },
      "en": {
        "subject": "Your exam registration has reached CASA",
        "preheader": "We’ll review your registration and be in touch by email.",
        "heading": "Thank you for your exam registration",
        "intro": "We’ve received your registration.",
        "summaryTitle": "Your registration",
        "summaryRows": [
          {
            "label": "Exam",
            "value": "{exam}"
          },
          {
            "label": "Date",
            "value": "{examDate}"
          },
          {
            "label": "Type of entry",
            "value": "{examPart}"
          },
          {
            "label": "Location",
            "value": "{location}"
          },
          {
            "label": "Name",
            "value": "{firstName} {lastName}"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "We’ll check that a place is still free on your date, then email you the deadlines for payment and documents."
          },
          {
            "text": "Your place is confirmed once your payment has arrived and your details are in order."
          },
          {
            "text": "Before the exam, we’ll email you everything you need for the day."
          }
        ],
        "closing": "Please check your name and date of birth: they must be written exactly as in your passport or ID. If anything is wrong, simply reply to this email.\n\nOur terms and conditions, including the right of withdrawal, are at {siteUrl}/en/terms. We wish you every success with your preparation."
      },
      "replyNote": false
    },
    {
      "kind": "appointment",
      "variant": "",
      "de": {
        "subject": "Deine Terminanfrage bei CASA: {dayShort}, {time} Uhr",
        "preheader": "Wir halten dir die Zeit vorerst frei, und {contactPerson} meldet sich per E-Mail bei dir.",
        "heading": "Deine Wunschzeit ist vorerst reserviert",
        "intro": "danke für deine Anfrage. Schön, dass du mit uns über deine Gruppe sprechen möchtest.",
        "summaryTitle": "Deine Wunschzeit",
        "summaryRows": [
          {
            "label": "Datum",
            "value": "{day}"
          },
          {
            "label": "Uhrzeit",
            "value": "{time} Uhr (Ortszeit Bremen)"
          },
          {
            "label": "Dauer",
            "value": "{duration} Minuten"
          },
          {
            "label": "Gespräch mit",
            "value": "{contactPerson}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "{contactPerson} meldet sich per E-Mail bei dir. Erst damit steht der Termin fest, und du erfährst, wie ihr sprecht."
          },
          {
            "text": "Passt die Zeit doch nicht? Antworte einfach auf diese E-Mail. Dann finden wir eine andere Zeit oder geben sie wieder frei."
          }
        ],
        "closing": "Wir freuen uns, von deiner Gruppe zu hören."
      },
      "en": {
        "subject": "Your CASA appointment request: {dayShort}, {time}",
        "preheader": "We’re holding the time for you for now, and {contactPerson} will email you.",
        "heading": "Your chosen time is reserved for now",
        "intro": "Thank you for your request. We’re glad you’d like to talk to us about your group.",
        "summaryTitle": "Your chosen time",
        "summaryRows": [
          {
            "label": "Date",
            "value": "{day}"
          },
          {
            "label": "Time",
            "value": "{time} (Bremen time)"
          },
          {
            "label": "Duration",
            "value": "{duration} minutes"
          },
          {
            "label": "With",
            "value": "{contactPerson}"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "{contactPerson} will email you. Only that email confirms the appointment, and it will tell you how you’ll talk."
          },
          {
            "text": "If the time doesn’t suit you after all, simply reply to this email. We’ll find another time or release the slot."
          }
        ],
        "closing": "We look forward to hearing about your group."
      },
      "replyNote": false
    },
    {
      "kind": "appointment",
      "variant": "unheld",
      "de": {
        "subject": "Deine Terminanfrage bei CASA: {dayShort}, {time} Uhr",
        "preheader": "{contactPerson} prüft deine Wunschzeit und meldet sich per E-Mail bei dir.",
        "heading": "Deine Terminanfrage ist angekommen",
        "intro": "danke für deine Anfrage. Schön, dass du mit uns über deine Gruppe sprechen möchtest.",
        "summaryTitle": "Deine Wunschzeit",
        "summaryRows": [
          {
            "label": "Datum",
            "value": "{day}"
          },
          {
            "label": "Uhrzeit",
            "value": "{time} Uhr (Ortszeit Bremen)"
          },
          {
            "label": "Dauer",
            "value": "{duration} Minuten"
          },
          {
            "label": "Gespräch mit",
            "value": "{contactPerson}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "{contactPerson} prüft, ob die Zeit passt, und meldet sich per E-Mail bei dir. Erst damit steht der Termin fest, und du erfährst, wie ihr sprecht."
          },
          {
            "text": "Passt die Zeit doch nicht? Antworte einfach auf diese E-Mail. Dann finden wir eine andere Zeit."
          }
        ],
        "closing": "Wir freuen uns, von deiner Gruppe zu hören."
      },
      "en": {
        "subject": "Your CASA appointment request: {dayShort}, {time}",
        "preheader": "{contactPerson} will check your chosen time and email you.",
        "heading": "Your appointment request has reached us",
        "intro": "Thank you for your request. We’re glad you’d like to talk to us about your group.",
        "summaryTitle": "Your chosen time",
        "summaryRows": [
          {
            "label": "Date",
            "value": "{day}"
          },
          {
            "label": "Time",
            "value": "{time} (Bremen time)"
          },
          {
            "label": "Duration",
            "value": "{duration} minutes"
          },
          {
            "label": "With",
            "value": "{contactPerson}"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "{contactPerson} will check that the time works and email you. Only that email confirms the appointment, and it will tell you how you’ll talk."
          },
          {
            "text": "If the time doesn’t suit you after all, simply reply to this email. We’ll find another time."
          }
        ],
        "closing": "We look forward to hearing about your group."
      },
      "replyNote": false
    },
    {
      "kind": "careers",
      "variant": "",
      "de": {
        "subject": "Deine Bewerbung ist bei CASA angekommen",
        "preheader": "Wir lesen deine Unterlagen sorgfältig und melden uns bei dir.",
        "heading": "Danke für deine Bewerbung",
        "intro": "deine Bewerbung ist bei uns angekommen. Danke für dein Interesse an CASA und die Zeit, die du dir dafür genommen hast.",
        "summaryTitle": "Deine Bewerbung",
        "summaryRows": [
          {
            "label": "Stelle",
            "value": "{position}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Wir lesen deine Bewerbung sorgfältig und melden uns so bald wie möglich bei dir."
          },
          {
            "text": "Wenn dein Profil zu uns passt, laden wir dich zu einem Gespräch ein."
          }
        ],
        "closing": "Schön, dass du Teil unseres Teams werden möchtest."
      },
      "en": {
        "subject": "Your application has reached CASA",
        "preheader": "We’ll read your application carefully and get back to you.",
        "heading": "Thank you for your application",
        "intro": "We’ve received your application. Thank you for your interest in CASA and the time you put into it.",
        "summaryTitle": "Your application",
        "summaryRows": [
          {
            "label": "Position",
            "value": "{position}"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "We’ll go through your application carefully and get back to you as soon as we can."
          },
          {
            "text": "If your profile is a good match, we’ll invite you to an interview."
          }
        ],
        "closing": "We’re glad you’d like to join our team."
      }
    }
  ],
  "shared": {
    "de": {
      "greetingNamed": "Hallo {firstName},",
      "greetingNeutral": "Hallo,",
      "replyNote": "Fragen oder etwas vergessen? Antworte einfach auf diese E-Mail.",
      "signoff": "Herzliche Grüße aus Bremen",
      "team": "Dein CASA-Team",
      "footer": "CASA – Internationale Sprachschule gGmbH · Am Dobben 14–16 · 28203 Bremen · {siteHost}\nAmtsgericht Bremen, HRB 32761 HB · Geschäftsführerin: Bettina Rick · Datenschutz: {siteUrl}/datenschutz"
    },
    "en": {
      "greetingNamed": "Hello {firstName},",
      "greetingNeutral": "Hello,",
      "replyNote": "Questions, or something to add? Simply reply to this email.",
      "signoff": "Best wishes from Bremen",
      "team": "The CASA team",
      "footer": "CASA – Internationale Sprachschule gGmbH · Am Dobben 14–16 · 28203 Bremen, Germany · {siteHost}/en\nAmtsgericht Bremen, HRB 32761 HB · Managing director: Bettina Rick · Privacy: {siteUrl}/en/privacy"
    }
  }
} as const;
