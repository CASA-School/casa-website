/**
 * The confirmation the person who sent a form receives, in both languages.
 *
 * Written 2026-10-01 from the repository's own facts (site copy, the terms,
 * the privacy policy) by three independent drafts, judged, then checked for
 * truth, German and English. It is a receipt, never an acceptance: a course or
 * exam contract forms only with CASA's own Anmeldebestätigung and the payment
 * (AGB 2.2), and an appointment only once the contact person confirms it.
 *
 * `{placeholders}` are filled by `buildConfirmationMail` from values the server
 * produced or checked, never from the sender's free text; a line whose
 * placeholder has no value is left out.
 */
export const CONFIRMATION_COPY = {
  "kinds": [
    {
      "kind": "contact",
      "variant": "",
      "de": {
        "subject": "Ihre Anfrage ist bei CASA angekommen",
        "preheader": "Jemand aus unserem Team antwortet Ihnen persönlich per E-Mail.",
        "heading": "Danke für Ihre Nachricht",
        "intro": "schön, dass Sie uns geschrieben haben. Ihre Nachricht ist gut bei uns angekommen, und wir nehmen uns gern Zeit für Ihr Anliegen.",
        "summaryTitle": "Ihre Anfrage",
        "summaryRows": [
          {
            "label": "Referenz",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Unser Team in Bremen liest Ihre Nachricht und antwortet Ihnen so bald wie möglich persönlich per E-Mail."
          },
          {
            "text": "Eilt es? Dann rufen Sie uns gern während unserer Öffnungszeiten an: {phone}."
          }
        ],
        "closing": "Wir helfen Ihnen gern weiter."
      },
      "en": {
        "subject": "Your enquiry has reached CASA",
        "preheader": "Someone from our team will reply to you personally by email.",
        "heading": "Thank you for your message",
        "intro": "It’s good to hear from you. We’ve received your message, and we’ll gladly take the time it needs.",
        "summaryTitle": "Your enquiry",
        "summaryRows": [
          {
            "label": "Reference",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "Someone from our team in Bremen will read your message and send you a personal reply by email as soon as we can."
          },
          {
            "text": "If it’s urgent, call us during office hours on {phone}."
          }
        ],
        "closing": "We look forward to helping you."
      }
    },
    {
      "kind": "groups",
      "variant": "",
      "de": {
        "subject": "Ihre Gruppenanfrage ist bei CASA angekommen",
        "preheader": "Wir melden uns per E-Mail und planen das Programm gern gemeinsam mit Ihnen.",
        "heading": "Danke für Ihre Gruppenanfrage",
        "intro": "schön, dass Sie für Ihre Gruppe an CASA denken. Ihre Angaben sind gut bei uns angekommen, und Ihre Anfrage ist selbstverständlich unverbindlich.",
        "summaryTitle": "Ihre Anfrage",
        "summaryRows": [
          {
            "label": "Referenz",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Wir sehen uns Ihre Angaben an, melden uns so bald wie möglich per E-Mail und klären mit Ihnen, was noch offen ist."
          },
          {
            "text": "Gemeinsam planen wir den Unterricht – und, wenn Sie möchten, auch Kulturprogramm und Unterkunft – so, wie es zu Ihrer Gruppe passt."
          },
          {
            "text": "Wenn alles zusammenpasst, erhalten Sie ein Angebot mit allen Leistungen und Kosten – ebenfalls unverbindlich."
          }
        ],
        "closing": "Wir freuen uns auf die gemeinsame Planung."
      },
      "en": {
        "subject": "Your group enquiry has reached CASA",
        "preheader": "We’ll be in touch by email and would be glad to plan the programme with you.",
        "heading": "Thank you for your group enquiry",
        "intro": "We’re glad you’re thinking of CASA for your group. We’ve received your details, and there’s no obligation at this stage.",
        "summaryTitle": "Your enquiry",
        "summaryRows": [
          {
            "label": "Reference",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "We’ll look through your details, reply by email as soon as we can and clear up anything we still need to know."
          },
          {
            "text": "Together we’ll plan the lessons — and, if you need them, a cultural programme and accommodation — to suit your group."
          },
          {
            "text": "If it all comes together, you’ll receive a quote setting out everything that’s included — again with no obligation."
          }
        ],
        "closing": "We look forward to planning your group’s programme with you."
      }
    },
    {
      "kind": "groups",
      "variant": "company",
      "de": {
        "subject": "Ihre Anfrage zum Firmenunterricht ist angekommen",
        "preheader": "Wir melden uns per E-Mail – gemeinsam klären wir, was Ihr Team braucht.",
        "heading": "Danke für Ihre Anfrage zum Firmenunterricht",
        "intro": "schön, dass Sie Ihre Mitarbeitenden beim Deutschlernen unterstützen möchten. Ihre Angaben sind gut bei uns angekommen, und Ihre Anfrage ist selbstverständlich unverbindlich.",
        "summaryTitle": "Ihre Anfrage",
        "summaryRows": [
          {
            "label": "Referenz",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Wir sehen uns Ihre Angaben an, melden uns so bald wie möglich per E-Mail und klären mit Ihnen, was noch offen ist."
          },
          {
            "text": "In einer gemeinsamen Beratung ermitteln wir Lernbedürfnisse, Ziele und Sprachniveaus in Ihrem Team und entwickeln daraus einen passenden Unterrichtsplan."
          },
          {
            "text": "Wenn alles zusammenpasst, erhalten Sie ein Angebot. Beratung und Angebot sind für Sie unverbindlich."
          }
        ],
        "closing": "Wir freuen uns auf das Gespräch mit Ihnen."
      },
      "en": {
        "subject": "Your company training enquiry has reached CASA",
        "preheader": "We’ll be in touch by email — together we’ll work out what your team needs.",
        "heading": "Thank you for your company training enquiry",
        "intro": "It’s good to hear you’d like to help your staff learn German. We’ve received your details, and there’s no obligation at this stage.",
        "summaryTitle": "Your enquiry",
        "summaryRows": [
          {
            "label": "Reference",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "We’ll look through your details, reply by email as soon as we can and clear up anything we still need to know."
          },
          {
            "text": "We’ll then talk it through with you — your team’s learning needs, goals and current levels — and build a training plan from there."
          },
          {
            "text": "If it all comes together, you’ll receive a quote. Neither the conversation nor the quote commits you to anything."
          }
        ],
        "closing": "We look forward to speaking with you."
      }
    },
    {
      "kind": "course",
      "variant": "",
      "de": {
        "subject": "Ihre Kursanmeldung ist bei CASA eingegangen",
        "preheader": "Wir prüfen Ihre Anmeldung persönlich und melden uns per E-Mail bei Ihnen.",
        "heading": "Schön, dass Sie bei uns Deutsch lernen möchten",
        "intro": "vielen Dank für Ihre Anmeldung – sie ist gut bei uns angekommen, und wir kümmern uns persönlich darum.",
        "summaryTitle": "Ihre Anmeldung",
        "summaryRows": [
          {
            "label": "Kurs",
            "value": "{course}"
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
            "label": "Unterkunft",
            "value": "{accommodation} – angefragt"
          },
          {
            "label": "Status",
            "value": "Eingegangen – Platz noch nicht reserviert"
          },
          {
            "label": "Referenz",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Wir sehen uns Ihre Angaben an und prüfen, ob noch ein Platz frei ist und der Kurs gut zu Ihnen passt. Bei Rückfragen kommen wir auf Sie zu."
          },
          {
            "text": "Wenn alles in Ordnung ist, erhalten Sie per E-Mail Ihre Anmeldebestätigung mit der Zahlungsfrist und den Details zum Kursstart."
          },
          {
            "text": "Fest reserviert ist Ihr Platz, sobald die angeforderte Zahlung fristgerecht auf unserem Konto eingegangen ist."
          }
        ],
        "closing": "Unsere Geschäftsbedingungen mit der Widerrufsbelehrung finden Sie unter {siteUrl}/agb.\n\nIm Moment müssen Sie nichts weiter tun – wir melden uns so bald wie möglich per E-Mail bei Ihnen."
      },
      "en": {
        "subject": "Your course registration has reached CASA",
        "preheader": "A member of our team will review your registration and be in touch by email.",
        "heading": "We’re glad you’d like to learn German with us",
        "intro": "Thank you for your registration. We’ve received it, and a member of our team will review it personally.",
        "summaryTitle": "Your registration",
        "summaryRows": [
          {
            "label": "Course",
            "value": "{course}"
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
            "label": "Accommodation",
            "value": "{accommodation} — requested"
          },
          {
            "label": "Status",
            "value": "Received — place not yet reserved"
          },
          {
            "label": "Reference",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "We’ll check your details, whether a place is available and whether the course suits you. If we have any questions, we’ll ask you."
          },
          {
            "text": "If everything is in order, we’ll email you your confirmation of registration, with the payment deadline and the details of your course start."
          },
          {
            "text": "Your place is reserved once the requested payment reaches our account by the deadline."
          }
        ],
        "closing": "Our terms and conditions, including the right of withdrawal, are at {siteUrl}/en/terms.\n\nThere’s nothing more you need to do for now — we’ll be in touch by email as soon as we can."
      }
    },
    {
      "kind": "exam",
      "variant": "",
      "de": {
        "subject": "Ihre Prüfungsanmeldung ist bei CASA eingegangen",
        "preheader": "Wir prüfen Ihre Anmeldung und melden uns per E-Mail bei Ihnen.",
        "heading": "Danke für Ihre Prüfungsanmeldung",
        "intro": "Ihre Anmeldung ist gut bei uns angekommen, und wir kümmern uns persönlich darum.",
        "summaryTitle": "Ihre Anmeldung",
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
            "label": "Prüfungsweg",
            "value": "{examPart}"
          },
          {
            "label": "Ort",
            "value": "{location}"
          },
          {
            "label": "Status",
            "value": "Eingegangen – Platz noch nicht bestätigt"
          },
          {
            "label": "Referenz",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Wir prüfen Ihre Angaben und sehen nach, ob zum gewählten Termin noch ein Platz frei ist."
          },
          {
            "text": "Ist das der Fall, erhalten Sie per E-Mail die Fristen für Zahlung und Dokumente."
          },
          {
            "text": "Ihren Prüfungsplatz können wir erst bestätigen, wenn Ihre Zahlung eingegangen ist und Ihre Angaben und Dokumente stimmen."
          },
          {
            "text": "Vor dem Prüfungstag senden wir Ihnen die nötigen Unterlagen und Hinweise per E-Mail."
          }
        ],
        "closing": "Unsere Geschäftsbedingungen mit der Widerrufsbelehrung finden Sie unter {siteUrl}/agb.\n\nBitte prüfen Sie, ob Vor- und Nachname und Geburtsdatum, wie Sie sie im Formular angegeben haben, genau mit Ihrem Pass oder amtlichen Ausweis übereinstimmen. Falls nicht, antworten Sie bitte einfach auf diese E-Mail. Für Ihre Vorbereitung wünschen wir Ihnen schon jetzt alles Gute."
      },
      "en": {
        "subject": "Your exam registration has reached CASA",
        "preheader": "We’ll review your registration and be in touch by email.",
        "heading": "Thank you for your exam registration",
        "intro": "We’ve received your registration, and a member of our team will review it personally.",
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
            "label": "Registered for",
            "value": "{examPart}"
          },
          {
            "label": "Location",
            "value": "{location}"
          },
          {
            "label": "Status",
            "value": "Received — place not yet confirmed"
          },
          {
            "label": "Reference",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "We’ll check your details and whether a place is still free on your chosen date."
          },
          {
            "text": "If so, we’ll email you the deadlines for payment and for any documents we need from you."
          },
          {
            "text": "We can only confirm your exam place once your payment has arrived and your details and documents are in order."
          },
          {
            "text": "Before the exam, we’ll email you everything you need for the day."
          }
        ],
        "closing": "Our terms and conditions, including the right of withdrawal, are at {siteUrl}/en/terms.\n\nPlease check that your first name, surname and date of birth, as you entered them in the form, match your passport or official ID exactly. If they don’t, simply reply to this email. We wish you all the best with your preparation."
      },
      "replyNote": false
    },
    {
      "kind": "appointment",
      "variant": "",
      "de": {
        "subject": "Ihre Terminanfrage bei CASA: {dayShort}, {time} Uhr",
        "preheader": "Wir halten Ihnen die Zeit vorerst frei – {contactPerson} meldet sich persönlich per E-Mail bei Ihnen.",
        "heading": "Ihre Wunschzeit ist vorerst reserviert",
        "intro": "vielen Dank – schön, dass Sie mit uns über Ihre Gruppe sprechen möchten.",
        "summaryTitle": "Ihre Wunschzeit",
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
          },
          {
            "label": "Status",
            "value": "Angefragt, noch nicht bestätigt"
          },
          {
            "label": "Referenz",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "{contactPerson} prüft Ihre Anfrage und meldet sich persönlich per E-Mail bei Ihnen. Erst mit der Bestätigung steht der Termin fest – darin erfahren Sie auch, wie das Gespräch stattfindet."
          },
          {
            "text": "Notieren Sie sich gern schon Ihre Ideen, offenen Fragen und Wünsche für Ihre Gruppe."
          },
          {
            "text": "Passt Ihnen die Zeit doch nicht, oder brauchen Sie den Termin nicht mehr? Antworten Sie einfach auf diese E-Mail – dann suchen wir gemeinsam einen anderen Termin oder geben die Zeit wieder frei."
          }
        ],
        "closing": "Wir freuen uns, von Ihrer Gruppe zu hören."
      },
      "en": {
        "subject": "Your CASA appointment request: {dayShort}, {time}",
        "preheader": "We’re holding the time for you — {contactPerson} will email you personally.",
        "heading": "Your chosen time is reserved for now",
        "intro": "Thank you for your request — we’re glad you’d like to talk to us about your group.",
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
          },
          {
            "label": "Status",
            "value": "Requested, not yet confirmed"
          },
          {
            "label": "Reference",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "{contactPerson} will check your request and email you personally. Only that email confirms the appointment — and it will tell you how the conversation will take place."
          },
          {
            "text": "If you like, you can already note down your ideas, questions and what your group needs."
          },
          {
            "text": "If the time turns out not to suit you, or you no longer need the appointment, simply reply to this email — we’ll look for another time together, or release the slot."
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
        "subject": "Ihre Bewerbung ist bei CASA angekommen",
        "preheader": "Wir lesen Ihre Unterlagen sorgfältig und melden uns bei Ihnen.",
        "heading": "Danke für Ihre Bewerbung",
        "intro": "Ihre Unterlagen sind gut bei uns angekommen. Wir freuen uns über Ihr Interesse an CASA und wissen die Zeit zu schätzen, die Sie sich dafür genommen haben.",
        "summaryTitle": "Ihre Bewerbung",
        "summaryRows": [
          {
            "label": "Stelle",
            "value": "{position}"
          },
          {
            "label": "Referenz",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Wir lesen Ihre Bewerbung sorgfältig und melden uns so bald wie möglich bei Ihnen."
          },
          {
            "text": "Wenn Ihr Profil zu uns passt, laden wir Sie zu einem Gespräch ein."
          }
        ],
        "closing": "Schön, dass Sie Teil unseres Teams werden möchten."
      },
      "en": {
        "subject": "Your application has reached CASA",
        "preheader": "We’ll read your application carefully and get back to you.",
        "heading": "Thank you for your application",
        "intro": "We’ve received your application. We appreciate your interest in CASA and the time you put into it.",
        "summaryTitle": "Your application",
        "summaryRows": [
          {
            "label": "Position",
            "value": "{position}"
          },
          {
            "label": "Reference",
            "value": "{reference}"
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
      "greetingNamed": "Guten Tag {name},",
      "greetingNeutral": "Guten Tag,",
      "replyNote": "Möchten Sie noch etwas ergänzen oder haben Sie eine Frage? Antworten Sie einfach auf diese E-Mail – Ihre Antwort geht direkt an unser Team.",
      "signoff": "Herzliche Grüße aus Bremen",
      "team": "Ihr CASA-Team",
      "footer": "Gemeinnützige Sprachschule in Bremen. Seit 1983.\nCASA – Internationale Sprachschule gGmbH · Am Dobben 14–16 · 28203 Bremen\nTelefon +49 421 460 414 3-0 · {siteHost}\nÖffnungszeiten: Montag bis Donnerstag 08:30–19:00 Uhr, Freitag 08:30–13:00 Uhr\nAmtsgericht Bremen, HRB 32761 HB · Geschäftsführerin: Bettina Rick\nSie erhalten diese E-Mail, weil auf {siteHost} ein Formular mit Ihrer E-Mail-Adresse abgeschickt wurde. Falls nicht Sie es waren, antworten Sie bitte kurz auf diese E-Mail – dann löschen wir die Angaben. Wie wir mit Ihren Daten umgehen, lesen Sie unter {siteUrl}/datenschutz."
    },
    "en": {
      "greetingNamed": "Dear {name},",
      "greetingNeutral": "Hello,",
      "replyNote": "Anything to add, or a question in the meantime? Simply reply to this email — your reply goes straight to our team.",
      "signoff": "Best wishes from Bremen",
      "team": "The CASA team",
      "footer": "Non-profit language school in Bremen. Since 1983.\nCASA – Internationale Sprachschule gGmbH · Am Dobben 14–16 · 28203 Bremen, Germany\nPhone +49 421 460 414 30 · {siteHost}/en\nOffice hours: Monday to Thursday 08:30–19:00, Friday 08:30–13:00 (Bremen time)\nAmtsgericht Bremen, HRB 32761 HB · Managing director: Bettina Rick\nYou’re receiving this email because this address was entered in a form on {siteHost}. If that wasn’t you, just reply and let us know — we’ll delete the details. How we handle your data: {siteUrl}/en/privacy"
    }
  }
} as const;
