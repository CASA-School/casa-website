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
 *
 * Address: everyone reads „du“ and is greeted by first name — learners and
 * applicants since 2026-10-07, group organisers since 2026-10-08 (Rahman: du
 * all over). Companies keep „Sie“ for now: their kind carries
 * `"address": "Sie"`, which swaps the shared lines for `sharedSie`. English has
 * one register, so there the swap changes only the greeting: "Hello
 * {firstName}," for everyone, "Dear {name}," for companies.
 */
export const CONFIRMATION_COPY = {
  "kinds": [
    {
      "kind": "contact",
      "variant": "",
      "de": {
        "subject": "Deine Anfrage ist bei CASA angekommen",
        "preheader": "Jemand aus unserem Team antwortet dir persönlich per E-Mail.",
        "heading": "Danke für deine Nachricht",
        "intro": "schön, dass du uns geschrieben hast. Deine Nachricht ist gut bei uns angekommen, und wir nehmen uns gern Zeit für dein Anliegen.",
        "summaryTitle": "Deine Anfrage",
        "summaryRows": [
          {
            "label": "Referenz",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Unser Team in Bremen liest deine Nachricht und antwortet dir so bald wie möglich persönlich per E-Mail."
          },
          {
            "text": "Eilt es? Dann ruf uns gern während unserer Bürozeiten unter {phone} an."
          }
        ],
        "closing": "Wir helfen dir gern weiter."
      },
      "en": {
        "subject": "Your enquiry has reached CASA",
        "preheader": "Someone from our team will reply to you personally by email.",
        "heading": "Thank you for your message",
        "intro": "It’s good to hear from you. We’ve received your message, and we’re happy to take the time to help.",
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
        "subject": "Deine Gruppenanfrage ist bei CASA angekommen",
        "preheader": "Wir melden uns per E-Mail und planen das Programm gern gemeinsam mit dir.",
        "heading": "Danke für deine Gruppenanfrage",
        "intro": "schön, dass du für deine Gruppe an CASA denkst. Deine Angaben sind gut bei uns angekommen, und deine Anfrage ist selbstverständlich unverbindlich.",
        "summaryTitle": "Deine Anfrage",
        "summaryRows": [
          {
            "label": "Referenz",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "So geht es weiter",
        "nextSteps": [
          {
            "text": "Wir sehen uns deine Angaben an, melden uns so bald wie möglich per E-Mail und klären mit dir, was noch offen ist."
          },
          {
            "text": "Gemeinsam planen wir den Unterricht so, wie es zu deiner Gruppe passt, und wenn du möchtest, auch Kulturprogramm und Unterkunft."
          },
          {
            "text": "Wenn alles zusammenpasst, erhältst du ein Angebot mit allen Leistungen und Kosten. Auch das Angebot ist unverbindlich."
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
            "text": "Together we’ll plan the lessons to suit your group and, if you wish, a culture programme and accommodation as well."
          },
          {
            "text": "If it all comes together, you’ll receive a quote with everything that’s included and what it costs. The quote doesn’t commit you to anything either."
          }
        ],
        "closing": "We look forward to planning your group’s programme with you."
      }
    },
    {
      "kind": "groups",
      "variant": "company",
      "address": "Sie",
      "de": {
        "subject": "Ihre Anfrage zum Firmenunterricht ist angekommen",
        "preheader": "Wir melden uns per E-Mail und klären gemeinsam mit Ihnen, was Ihr Team braucht.",
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
        "subject": "Your enquiry about in-company teaching has reached CASA",
        "preheader": "We’ll be in touch by email, and together we’ll work out what your team needs.",
        "heading": "Thank you for your enquiry about in-company teaching",
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
            "text": "In a consultation with you, we’ll find out about your team’s learning needs, goals and language levels, and draw up a teaching plan to match."
          },
          {
            "text": "If it all comes together, you’ll receive a quote. Neither the consultation nor the quote commits you to anything."
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
        "preheader": "Wir prüfen deine Anmeldung persönlich und melden uns per E-Mail bei dir.",
        "heading": "Schön, dass du bei uns Deutsch lernen möchtest",
        "intro": "vielen Dank für deine Anmeldung. Wir haben sie gut erhalten und kümmern uns persönlich darum.",
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
            "text": "Wir sehen uns deine Angaben an und prüfen, ob noch ein Platz frei ist und der Kurs gut zu dir passt. Wenn wir Fragen haben, melden wir uns bei dir."
          },
          {
            "text": "Wenn alles in Ordnung ist, bekommst du per E-Mail deine Anmeldebestätigung mit der Zahlungsfrist und den Details zum Kursstart."
          },
          {
            "text": "Fest reserviert ist dein Platz, sobald die angeforderte Zahlung fristgerecht auf unserem Konto eingegangen ist."
          }
        ],
        "closing": "Unsere Geschäftsbedingungen mit der Widerrufsbelehrung findest du unter {siteUrl}/agb.\n\nIm Moment musst du nichts weiter tun. Wir melden uns so bald wie möglich per E-Mail bei dir."
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
          },
          {
            "label": "Status",
            "value": "Received, place not yet reserved"
          },
          {
            "label": "Reference",
            "value": "{reference}"
          }
        ],
        "nextStepsTitle": "What happens next",
        "nextSteps": [
          {
            "text": "We’ll look at your details and check whether a place is still free and whether the course suits you. If we have any questions, we’ll get in touch."
          },
          {
            "text": "If everything is in order, we’ll email you your confirmation of registration, with the payment deadline and the details of your course start."
          },
          {
            "text": "Your place is reserved once the requested payment reaches our account by the deadline."
          }
        ],
        "closing": "Our terms and conditions, including the right of withdrawal, are at {siteUrl}/en/terms.\n\nThere’s nothing more you need to do for now. We’ll be in touch by email as soon as we can."
      }
    },
    {
      "kind": "exam",
      "variant": "",
      "de": {
        "subject": "Deine Prüfungsanmeldung ist bei CASA eingegangen",
        "preheader": "Wir prüfen deine Anmeldung und melden uns per E-Mail bei dir.",
        "heading": "Danke für deine Prüfungsanmeldung",
        "intro": "deine Anmeldung ist gut bei uns angekommen, und wir kümmern uns persönlich darum.",
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
            "text": "Wir prüfen deine Angaben und sehen nach, ob zum gewählten Termin noch ein Platz frei ist."
          },
          {
            "text": "Ist das der Fall, bekommst du per E-Mail die Fristen für Zahlung und Dokumente."
          },
          {
            "text": "Deinen Prüfungsplatz können wir erst bestätigen, wenn deine Zahlung eingegangen ist und deine Angaben und Dokumente stimmen."
          },
          {
            "text": "Vor dem Prüfungstag schicken wir dir die nötigen Unterlagen und Hinweise per E-Mail."
          }
        ],
        "closing": "Unsere Geschäftsbedingungen mit der Widerrufsbelehrung findest du unter {siteUrl}/agb.\n\nBitte prüfe, ob Vor- und Nachname und Geburtsdatum, so wie du sie im Formular angegeben hast, genau mit deinem Pass oder amtlichen Ausweis übereinstimmen. Falls nicht, antworte bitte einfach auf diese E-Mail. Für deine Vorbereitung wünschen wir dir schon jetzt alles Gute."
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
            "label": "Type of entry",
            "value": "{examPart}"
          },
          {
            "label": "Location",
            "value": "{location}"
          },
          {
            "label": "Status",
            "value": "Received, place not yet confirmed"
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
        "subject": "Deine Terminanfrage bei CASA: {dayShort}, {time} Uhr",
        "preheader": "Wir halten dir die Zeit vorerst frei, und {contactPerson} meldet sich persönlich per E-Mail bei dir.",
        "heading": "Deine Wunschzeit ist vorerst reserviert",
        "intro": "vielen Dank für deine Anfrage. Schön, dass du mit uns über deine Gruppe sprechen möchtest.",
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
            "text": "{contactPerson} prüft deine Anfrage und meldet sich persönlich per E-Mail bei dir. Erst mit der Bestätigung steht der Termin fest. Darin erfährst du auch, wie das Gespräch stattfindet."
          },
          {
            "text": "Notier dir gern schon deine Ideen, offenen Fragen und Wünsche für deine Gruppe."
          },
          {
            "text": "Passt dir die Zeit doch nicht, oder brauchst du den Termin nicht mehr? Antworte einfach auf diese E-Mail. Dann suchen wir gemeinsam einen anderen Termin oder geben die Zeit wieder frei."
          }
        ],
        "closing": "Wir freuen uns, von deiner Gruppe zu hören."
      },
      "en": {
        "subject": "Your CASA appointment request: {dayShort}, {time}",
        "preheader": "We’re holding the time for you for now, and {contactPerson} will email you personally.",
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
            "text": "{contactPerson} will check your request and email you personally. Only that email confirms the appointment. It will also tell you how the conversation will take place."
          },
          {
            "text": "If you like, you can already note down your ideas, questions and what your group needs."
          },
          {
            "text": "If the time turns out not to suit you, or you no longer need the appointment, simply reply to this email. We’ll then look for another time together or release the slot."
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
        "intro": "deine Unterlagen sind gut bei uns angekommen. Wir freuen uns über dein Interesse an CASA und wissen die Zeit zu schätzen, die du dir dafür genommen hast.",
        "summaryTitle": "Deine Bewerbung",
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
      "greetingNamed": "Hallo {firstName},",
      "greetingNeutral": "Hallo,",
      "replyNote": "Möchtest du noch etwas ergänzen oder hast du eine Frage? Antworte einfach auf diese E-Mail. Deine Antwort geht direkt an unser Team.",
      "signoff": "Herzliche Grüße aus Bremen",
      "team": "Dein CASA-Team",
      "footer": "Gemeinnützige Sprachschule in Bremen. Seit 1983.\nCASA – Internationale Sprachschule gGmbH · Am Dobben 14–16 · 28203 Bremen\nTelefon +49 421 460 414 3-0 · {siteHost}\nBürozeiten: Montag bis Donnerstag 08:30–19:00 Uhr, Freitag 08:30–13:00 Uhr\nAmtsgericht Bremen, HRB 32761 HB · Geschäftsführerin: Bettina Rick\nDu bekommst diese E-Mail, weil auf {siteHost} ein Formular mit deiner E-Mail-Adresse abgeschickt wurde. Falls du das nicht warst, antworte bitte kurz auf diese E-Mail. Dann löschen wir die Angaben. Wie wir mit deinen Daten umgehen, liest du unter {siteUrl}/datenschutz."
    },
    "en": {
      "greetingNamed": "Hello {firstName},",
      "greetingNeutral": "Hello,",
      "replyNote": "Would you like to add something, or do you have a question? Simply reply to this email. Your reply goes straight to our team.",
      "signoff": "Best wishes from Bremen",
      "team": "The CASA team",
      "footer": "Non-profit language school in Bremen. Since 1983.\nCASA – Internationale Sprachschule gGmbH · Am Dobben 14–16 · 28203 Bremen, Germany\nPhone +49 421 460 414 30 · {siteHost}/en\nOffice hours: Monday to Thursday 08:30–19:00, Friday 08:30–13:00 (Bremen time)\nAmtsgericht Bremen, HRB 32761 HB · Managing director: Bettina Rick\nYou’re receiving this email because this address was entered in a form on {siteHost}. If that wasn’t you, please reply briefly to this email and we’ll delete the details. You can read how we handle your data at {siteUrl}/en/privacy."
    }
  },
  /**
   * The shared lines for the kinds marked `"address": "Sie"`: „Sie“ in German,
   * and in English the formal greeting by name.
   */
  "sharedSie": {
    "de": {
      "greetingNamed": "Guten Tag {name},",
      "greetingNeutral": "Guten Tag,",
      "replyNote": "Möchten Sie noch etwas ergänzen oder haben Sie eine Frage? Antworten Sie einfach auf diese E-Mail. Ihre Antwort geht direkt an unser Team.",
      "signoff": "Herzliche Grüße aus Bremen",
      "team": "Ihr CASA-Team",
      "footer": "Gemeinnützige Sprachschule in Bremen. Seit 1983.\nCASA – Internationale Sprachschule gGmbH · Am Dobben 14–16 · 28203 Bremen\nTelefon +49 421 460 414 3-0 · {siteHost}\nBürozeiten: Montag bis Donnerstag 08:30–19:00 Uhr, Freitag 08:30–13:00 Uhr\nAmtsgericht Bremen, HRB 32761 HB · Geschäftsführerin: Bettina Rick\nSie erhalten diese E-Mail, weil auf {siteHost} ein Formular mit Ihrer E-Mail-Adresse abgeschickt wurde. Falls nicht Sie es waren, antworten Sie bitte kurz auf diese E-Mail. Dann löschen wir die Angaben. Wie wir mit Ihren Daten umgehen, lesen Sie unter {siteUrl}/datenschutz."
    },
    "en": {
      "greetingNamed": "Dear {name},",
      "greetingNeutral": "Hello,",
      "replyNote": "Would you like to add something, or do you have a question? Simply reply to this email. Your reply goes straight to our team.",
      "signoff": "Best wishes from Bremen",
      "team": "The CASA team",
      "footer": "Non-profit language school in Bremen. Since 1983.\nCASA – Internationale Sprachschule gGmbH · Am Dobben 14–16 · 28203 Bremen, Germany\nPhone +49 421 460 414 30 · {siteHost}/en\nOffice hours: Monday to Thursday 08:30–19:00, Friday 08:30–13:00 (Bremen time)\nAmtsgericht Bremen, HRB 32761 HB · Managing director: Bettina Rick\nYou’re receiving this email because this address was entered in a form on {siteHost}. If that wasn’t you, please reply briefly to this email and we’ll delete the details. You can read how we handle your data at {siteUrl}/en/privacy."
    }
  }
} as const;
