import type { Metadata } from 'next';

import { LegalUtilityTemplate } from '@/components/patterns/legal-utility-template';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getPageHero } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Terms & Conditions',
  description: 'Core contractual terms for courses, exams, and related services at CASA.',
  path: '/terms',
});

const termsSectionsEn = [
  {
    title: '1. Contractual Partners, Scope of Contract, and Contractual Language',
    body: [
      '(1.1) Your contractual partner is CASA - Internationale Sprachschule gemeinnützige GmbH (CASA - International Language School non-profit Ltd.), Am Dobben 14-16, 28203 Bremen, Germany, info@casa-bremen.de (herewith named "CASA").',
      '(1.2) The following business terms apply as legally binding basis for all contractual relations between CASA and you the consumer (herewith named "Participant").',
      '(1.3) The language of the contract is English. However, the legally binding version is the German "Geschäftsbedingungen und Kundeninformation".',
    ],
  },
  {
    title: '2. Registration and Contract Termination',
    body: [
      '(2.1) All of CASA\'s course offerings can be found online at www.casa-bremen.de. The course offerings are offered for consideration without obligation, up to the time of registration and payment. If the Participant wishes to register, he/she can enter their personal information, as well as the type of course, (e.g.: Evening course, Intensive, etc.), the level, and the starting and ending date in the registration form. This can be found at https://casa-bremen.de/en/registration/course-registration',
      '(2.2) The Participant can proof-read, change, correct or delete any information in the registration form any time up to the moment that it is sent. Mistakes can be corrected by navigating backwards in the web browser, or breaking off the process and beginning again. To finalize the registration, the Participant must accept CASA\'s business terms and click on the "Register" button. The registration form is then sent to CASA. It is no longer available to the Participant, but the participant will receive a copy of the sent form.',
      '(2.3) The course offerings from CASA in the internet, as well as in our brochures, are all without obligation until the Participant has registered. After receipt of the registration by CASA, the Participant will receive an offer (confirmation of registration). This confirmation includes statement of payment deadline. Payment in full is required for participants requiring residence visas; all others will be requested to pay a deposit. The contract is then finalized as soon as timely payment to CASA\'s bank account has been received.',
      'In the case that the Participant needs a residence visa, please see Point 7 below and the FAQ in our website.',
    ],
  },
  {
    title: '3. Consumers\' Right to Recall/Cancellation',
    body: [
      'Consumers have the right to withdraw within 14 days. The right of withdrawal applies exclusively to contracts concluded online via the registration form (except for registrations for telc B2 and telc C1 Hochschule exams). The right of withdrawal does not apply to contracts concluded at the office.',
      'Right to Recall/Cancellation: The Participant has the right to cancel the contract, without naming reasons, within 14 days. This time-period begins when the contract has been finalized. In order to claim this cancellation right, the Participant must send CASA a clear, written statement with his/her intentions to cancel the contract. This statement can be made by post, fax or e-mail: CASA Internationale Sprachschule Bremen gGmbH, Am Dobben 14-16, D-28203 Bremen, Germany, Fax: +49 421 460 414 340, E-Mail: info@casa-bremen.de. In order to ensure the right to recall/cancellation, it is, however, necessary to inform CASA before the expiration of the 14-day period.',
      'Consequences of Cancellation: If the Participant withdraws from the contract within the 14-day period, CASA will repay all payments received, including the costs of delivery (with the exception of additional costs arising from the fact that the Participant has chosen a different method of delivery than the cheapest standard delivery offered by CASA) immediately and no later than fourteen days from the date on which the notice of cancellation is received. Refunds will be made using the same method of payment which CASA originally received. Exception will only be made when CASA and the Participant have made other specific arrangement in advance. In no case will the Participant be charged compensation because of the refund. In the case that the Participant demands that services begin during the recall period, then payment for these services is required: the amount corresponding to the proportion of services already rendered, compared to the total volume of services stipulated in the contract, up to the date on which the Participant notifies CASA.',
    ],
  },
  {
    title: '4. School Holidays',
    body: [
      'At weekends and on legal holidays, tuition and classes will not take place. There will be no reimbursement for free days.',
    ],
  },
  {
    title: '5. Conditions of Payment',
    body: [
      '(5.1) The Participant is responsible for timely payment.',
      '(5.2) For Participants who already live in Germany, a deposit of €100.00 is required within one week of receipt of confirmation of course registration; in addition to €100.00 deposit for any requested living accommodations. Only the payment of a deposit guarantees reservation of placement in a course, and the search for accommodations; or, in the case of single tuition, an appropriate instructor.',
      'For first-time booking of classes, the remaining course and lodging fees must be paid within 4 weeks of the start of CASA\'s services.',
      'For subsequent bookings, payment must be made by the first day of tuition, at the latest, as long as no written request for installment payments has been made in advance. For such, the Participant must arrange a payment plan with the school\'s administration, specifying the amount to be paid, how many installments, as well as a date of completion of payments. The mutually-arranged payment dates are legally binding. The Participant has no right to request the settlement of an installment plan.',
      '(5.3) If, at the time of registration, the Participant is the resident of a foreign country, payment of complete course fees for the first course and lodging fees is required in full. After CASA has received payment of all the course and lodging fees, the Participant will receive a special registration confirmation form by E-mail. This form is to be given as proof to the German embassy or consulate. By request, the form can be sent to the Participant by post or – for additional fee – by DHL-Express.',
      '(5.4) Any bank fees are the sole responsibility of the Participant.',
      '(5.5) The Participant must pay all course and lodging fees in full. This also applies when the Participant fails to come to some or all of the lessons (for example, due to illness or termination).',
    ],
  },
  {
    title: '6. Termination of Contract / Change of Booking',
    body: [
      '(6.1) A booking may be cancelled by the Participant up to 4 weeks before the course begins. For this purpose, full weeks will be calculated. For cancellations up to 4 weeks before the beginning of the course, refunds will be made, minus administrative fees of €100.00, as well as any eventual bank fees and postage fees. A later cancellation will be charged the complete cost of all services booked that are within the scope of the 4-week period from the date of termination.',
      '(6.2) Any absence or failure to attend class/examination, or discontinuation for any reasons beyond the control of CASA, are not covered under the terms of cancellation. There will be no refund of any Participant\'s fees. Any outstanding fees must be paid in full.',
      '(6.3) CASA has the right to terminate the contract without notice for administrative reasons. A most notable reason being the Participant defaults on his/her payments.',
      '(6.4) Every cancellation must be made in writing. IN THE CASE THAT A RESIDENCE VISA IS NEEDED, PLEASE READ POINT 7 BELOW.',
      '(6.5) Changing an already booked course is possible at any time, as long as this occurs within the cancellation deadline (see above). For didactic reasons, CASA may instruct a change or a student may consult with CASA at any time in order to change a course. All fees paid will be applied to the new course or course type, with the exception of any eventual administration fees and handling charges.',
      '(6.6) If the Participant already knows that he/she cannot participate in a number of lessons from an Evening Course (or, in the case of Intensive Courses one or more full weeks of lessons) he/she must inform CASA at the time of registration. CASA can deduct this amount of time from the course fees. CASA reserves the right to refuse the Participant\'s absence for didactic reasons. If necessary, CASA also reserves the right to reclassify the Participant into a lower-level class upon his/her return.',
    ],
  },
  {
    title: '7. Residence Visa / Changes due to Visa Registration',
    body: [
      '(7.1) As soon as the Participant has received his/her residence visa, they must immediately inform CASA in writing.',
      '(7.2) If the residence visa is not available for the booked course, but for a later course starting date, a one-time postponement can be made until the deadline set by CASA, but no later than 3 weeks before the start of the course before the originally booked course. For any subsequent postponement, due to delays with the visa, the Participant will be charged a €100.00 administrative fee. Any further postponement will be charged the full amount under the usual terms of cancellation. In the case that the visa is not issued, CASA will refund the Participant the fees under the terms of the contract, minus an administration fee for the visa registration of €100.00, as well as any eventual additional costs for the postponement of the course, bank fees as well as postage fees and only upon presentation of an official rejection document.',
      '(7.3) If the entry to Germany was made with a visa for a language course or for studies, all language courses for which the visa was issued must be completed in full. An interruption or cancellation of parts of the booked language courses is not possible. The complete remaining (if partially not yet paid) course fee is to be paid to CASA.',
      '(7.4.) CASA states explicitly that we will provide information to authorized authorities upon request if the participant does not attend the course for the full period of the visa or has prematurely discontinued course attendance.',
    ],
  },
  {
    title: '8. Storage of Data',
    body: [
      'The Participant consents to the electronic storage of his/her personal data. This data will be used only for the completion of contract information. CASA never makes private data available to third parties. Participants have the right to all information regarding his/her data stored with CASA. The Participant has the additional right to demand that data be blocked or deleted. As well, they can recall the inquiry, storage, processing or use of any personal data.',
    ],
  },
  {
    title: '9. Liability',
    body: [
      '(9.1) CASA shall be liable to the participant for any damage incurred and shall only pay compensation in the event of intent and gross negligence. Further, CASA is liable for fundamental breach of essential contractual obligations (cardinal obligations), which violate the purposes of the contract, and on whose compliance the contracting partner may rely. In the case of negligent breach of essential obligations, CASA is only liable for the foreseeable contract damages.',
      '(9.2) The above mentioned legal disclaimer excludes damages to health, body and life. Liability, according to product damage laws, remains unaffected. Any exemption or limitations of liability which apply to CASA, also apply to their representatives, employees, consultants and vicarious third-party agents and suppliers.',
    ],
  },
  {
    title: '10. Severability Clause',
    body: [
      '(10.1) Should at any time, or for any reason, individual provisions of this contract become invalid or unenforceable; or at the conclusion of this contract become invalid or unenforceable, the remainder of the contract still remains intact and valid.',
      '(10.2) In the place of invalid or unenforceable provisions in this contract, the provisions which are still valid and enforceable shall occur, the effects of which come closest to the contract\'s objectives. The foregoing provisions shall apply correspondingly in the event that the contract proves to be incomplete.',
    ],
  },
  {
    title: '11. Choice of Law and Jurisdiction',
    body: [
      '(11.1) As far as there are no contradictory mandatory regulations which deprive the Participant\'s rights in his/her home country, German law is applicable.',
      '(11.2) Legal venue is the domicile of CASA (Bremen, Germany) in the case that the Participant is not a consumer, but a merchant; or if after the end of the contract the Participant moves their habitual residence to a foreign country; or if the place of residence is not known at the time of institution of legal proceedings.',
    ],
  },
];

const termsSectionsDe = [
  {
    title: '1. Vertragspartner, Geltungsbereich, Vertragssprache',
    body: [
      '(1.1) Ihr Vertragspartner ist die CASA - Internationale Sprachschule gemeinnützige GmbH, Am Dobben 14-16, D-28203 Bremen, info@casa-bremen.de (nachfolgend „CASA").',
      '(1.2) Die nachfolgenden Geschäftsbedingungen gelten als verbindliche Grundlage für sämtliche Vertragsbeziehungen zwischen CASA und Ihnen (nachfolgend „der/die Teilnehmende").',
      '(1.3) Die Vertragssprache ist Deutsch.',
    ],
  },
  {
    title: '2. Anmeldung und Vertragsschluss',
    body: [
      '(2.1) Die Kursangebote von CASA sind im Internet unter http://www.casa-bremen.de erreichbar. Dem/der Teilnehmenden steht das Kursangebot unverbindlich zur Auswahl. Will der/die Teilnehmende sich anmelden, trägt er/sie den Kurs, die Stufe, Kursbeginn und Kursende sowie seine/ihre Daten in das Anmeldeformular https://casa-bremen.de/anmeldung/anmeldeformular ein.',
      '(2.2) Der/die Teilnehmende kann die Angaben bis zur endgültigen Absendung des Anmeldeformulars überprüfen, korrigieren, ändern oder löschen. Eingabefehler können auch dadurch berichtigt werden, dass der/die Teilnehmende im Browser rückwärts navigiert oder den Vorgang abbricht und von vorn beginnt. Um die Anmeldung abzuschließen, muss der/die Teilnehmende die Geschäftsbedingungen von CASA akzeptieren und auf den Button „anmelden" drücken. Damit versendet er/sie das Anmeldeformular an CASA. Es steht dem/der Teilnehmenden dann nicht mehr zur Verfügung, er/sie erhält jedoch eine Kopie der Anmeldung per E-Mail.',
      '(2.3) Die Kursangebote von CASA im Internet sowie in den Broschüren stellen ein unverbindliches Angebot an den/die Teilnehmende/n dar. Nach dem Eingang des Anmeldeformulars übersendet CASA dem/der Teilnehmenden ein Angebot (Anmeldebestätigung). Mit der Anmeldebestätigung wird der/die Teilnehmende unter Angabe einer Frist zur Zahlung des Gesamtpreises (bei Visapflicht) bzw. einer Anzahlung gebeten. Der Vertrag kommt mit dem fristgerechten Eingang der angeforderten Zahlung auf dem Konto von CASA zu Stande.',
      'Falls Sie für die Teilnahme an dem gebuchten Kurs ein Visum beantragen müssen, siehe Punkt 7. unten und FAQ auf der Website.',
    ],
  },
  {
    title: '3. Widerrufsrecht für Verbraucher',
    body: [
      'Verbraucher haben ein vierzehntägiges Widerrufsrecht. Das Widerrufsrecht gilt ausschließlich für Verträge, die online über das Anmeldeformular geschlossen werden (ausgenommen Anmeldungen für telc B2 und telc C1 Hochschule Prüfungen). Bei Verträgen, die vor Ort geschlossen wurden, entfällt das Widerrufsrecht.',
      'Widerrufsrecht: Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen online geschlossenen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses. Als Tag des Vertragsschlusses gilt der Zeitpunkt, an dem das Online-Anmeldeformular abgeschickt wurde.',
      'Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (CASA - Internationale Sprachschule gemeinnützige GmbH, Am Dobben 14-16, D-28203 Bremen, Fax: +49 421 460 414 340, E-Mail: info@casa-bremen.de) mittels einer eindeutigen Erklärung (z.B. ein mit der Post versandter Brief, Telefax oder E-Mail) über ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf des Widerrufs absenden.',
      'Folgen des Widerrufs: Wenn Sie diesen Vertrag widerrufen, werden wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene günstigste Standardlieferung gewählt haben) unverzüglich und spätestens vierzehn Tage ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrages bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet. Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen sollen, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis dem Zeitpunkt, zu dem Sie uns von der Ausübung des Widerrufsrechts hinsichtlich dieses Vertrags unterrichten, bereits erbrachten Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.',
    ],
  },
  {
    title: '4. Tage ohne Unterricht',
    body: [
      'Am Wochenende und an gesetzlichen Feiertagen im Land Bremen findet kein Unterricht statt. Feiertage werden nicht erstattet.',
    ],
  },
  {
    title: '5. Zahlungsbedingungen',
    body: [
      '(5.1) Die/der Teilnehmende verpflichtet sich zur rechtzeitigen Zahlung.',
      '(5.2) Bei Anmeldung eines/einer Teilnehmenden mit inländischem Wohnsitz wird mit der Bestätigung der Anmeldung innerhalb einer Woche eine Anzahlung für den Kurs in Höhe von 100,00 € fällig, sowie auch 100,00 € Anzahlung für die Unterkunft, falls angefragt. Erst die geleistete Anzahlung garantiert eine definitive Platzreservierung bzw. die Suche nach einer Unterkunft oder - bei Einzelunterricht - nach einem Lehrer. Die restlichen Kurs- und Unterkunftsgebühren müssen bei einer Erstbuchung bis 4 Wochen vor Inanspruchnahme der Leistung, bei einer Folgebuchung spätestens bis zum 1. Kurstag bezahlt werden, sofern nicht ausdrücklich eine schriftliche Ratenzahlung vereinbart wurde. Dabei klärt die/der Teilnehmende in Absprache mit der Verwaltung, in welchen Raten und zu welchem Zeitpunkt die Gebühren bezahlt werden. Die so vereinbarten Zahlungstermine sind bindend. Es besteht kein Anspruch des/der Teilnehmenden auf Abschluss einer Ratenzahlungsvereinbarung.',
      '(5.3) Sofern der/die Teilnehmende zum Zeitpunkt seiner/ihrer Anmeldung den Wohnsitz im Ausland hat, werden mit der Anmeldung der Gesamtbetrag der Kursgebühren für den ersten Kurs und ggf. die anfallenden Unterkunftskosten fällig. Nach Erhalt der Zahlung der gesamten Kursgebühren und ggf. der Kosten für die Unterbringung wird dem/der Teilnehmenden per E-Mail eine gesonderte Anmeldebestätigung zur Vorlage bei der Botschaft / dem Konsulat zugeschickt. Die Zusendung ist auf Anfrage auch per Post bzw. gegen Aufpreis auch per DHL-Express möglich.',
      '(5.4) Die/der Teilnehmende muss alle anfallenden Bankgebühren übernehmen.',
      '(5.5) Die Verpflichtung zur Zahlung der Kurs- und Unterkunftsgebühren in voller Höhe besteht auch dann, wenn der Unterricht nicht oder nur teilweise besucht wird (z.B. im Falle von Krankheit bzw. Kündigung).',
    ],
  },
  {
    title: '6. Kündigung / Absage / Umbuchung',
    body: [
      '(6.1) Eine Buchung kann mit einer Kündigungsfrist von 4 Wochen durch die/den Teilnehmenden gekündigt werden. Dabei werden immer volle Wochen gerechnet. Bei einer Kündigung bis zu 4 Wochen vor Kursbeginn erstatten wir die gezahlten Gebühren abzüglich einer Bearbeitungsgebühr von 100,00€, etwaiger Bank- und Versandgebühren. Eine spätere Kündigung verpflichtet zur Zahlung aller gebuchten Leistungen, die im Rahmen der 4 Wochenfrist ab dem Kündigungsdatum liegen.',
      '(6.2) Nichtantritt eines Kurses/einer Prüfung bzw. Fernbleiben oder Kursabbruch aus Gründen, die CASA nicht zu vertreten hat, gilt nicht als Kündigung. Es werden dann keine Teilnahmebeträge, auch nicht teilweise, erstattet. Noch nicht gezahlte Gebühren sind zu zahlen.',
      '(6.3) Unbenommen bleibt das Recht von CASA, das Vertragsverhältnis aus organisatorischem Grund fristlos zu kündigen. Ein Grund liegt vor allem vor, wenn der/die Teilnehmende mit seiner/ihrer Zahlungspflicht in Verzug gerät.',
      '(6.4) Jede Kündigung bedarf der Schriftform. Falls ein Visum beantragt wurde, beachten Sie bitte Punkt 7.',
      '(6.5) Die Umbuchung eines bereits gebuchten Kurses ist jederzeit unter Einhaltung der Stornofrist (s.o.) möglich. Aus didaktischen Gründen ist eine Umbuchung des Teilnehmenden in Absprache mit CASA oder auch durch CASA jederzeit möglich. Bereits bezahlte Gebühren werden, abzgl. von evtl. anfallenden Bearbeitungsgebühren übertragen auf einen anderen Kurs, ggfs. auch auf eine andere Kursart als die von der/dem Teilnehmenden gebuchte.',
      '(6.6) Wenn bei der Anmeldung bereits angekündigt wird, dass mehrere zusammenhängende Termine (Abendkurs/Spezialkurs) bzw. eine oder mehrere volle Wochen (Intensivkurs) von dem Teilnehmenden nicht wahrgenommen werden können, kann CASA diesen Zeitraum von den Kursgebühren abziehen. CASA behält sich vor, dies aus didaktischen Gründen abzulehnen, bzw. nach der Rückkehr ggfs. eine Umstufung in eine niedrigere Klasse vorzunehmen.',
    ],
  },
  {
    title: '7. Visum / Umbuchung bei Visumsanmeldungen',
    body: [
      '(7.1) Sobald der/die Teilnehmende das Visum erhalten hat, informiert er/sie umgehend schriftlich CASA.',
      '(7.2) Wird ein Visum nicht zum gebuchten Kurs ausgestellt, sondern für einen späteren Kursbeginn, kann bis zur von CASA gesetzten Frist, spätestens aber 3 Wochen vor dem ursprünglich gebuchten Kurs, einmalig eine kostenlose Umbuchung (=Terminverschiebung) vorgenommen werden. Für jede weitere visumbedingte Verschiebung entsteht eine Bearbeitungsgebühr in Höhe von 100,00 €. Eine spätere Verschiebung verpflichtet zur vollständigen Zahlung im Rahmen der üblichen Kündigungsbedingungen. Falls das Visum nicht erteilt wird, wird CASA dem/der Teilnehmenden die bezahlten Gebühren im Rahmen der üblichen Kündigungsbedingungen erstatten, abzüglich einer Bearbeitungsgebühr für Visumsanmeldungen in Höhe von 100,00 €, der evtl. gezahlten Zusatzkosten für Kursstartverschiebungen, sowie etwaiger Bank- und Versandgebühren und nur unter Vorlage eines offiziellen Ablehnungsdokuments.',
      '(7.3) Ist die Einreise nach Deutschland mit einem Visum für einen Sprachkurs oder für ein Studium erfolgt, sind sämtliche Sprachkurse, für die das Visum ausgestellt wurde, vollständig zu absolvieren. Eine Unterbrechung oder Kündigung von Teilen der gebuchten Sprachkurse ist ausgeschlossen. Die vollständige restliche (sofern teilweise noch nicht bezahlte) Kursgebühr ist an CASA zu zahlen.',
      '(7.4.) CASA weist ausdrücklich darauf hin, dass wir autorisierten Behörden auf Anfrage darüber Auskunft geben werden, falls der/die Teilnehmende an dem Kurs nicht für den vollständigen Zeitraum des Visums teilnimmt bzw. die Kursteilnahme vorzeitig abgebrochen hat.',
    ],
  },
  {
    title: '8. Datenspeicherung',
    body: [
      'Der/die Teilnehmende erklärt sich mit der elektronischen Speicherung seiner/ihrer personenbezogenen Daten einverstanden. Die Daten werden nur zur Erfüllung des Vertragszweckes verwendet. Eine Weitergabe an Dritte ist ausgeschlossen. Der/die Teilnehmende ist berechtigt, Auskunft über sämtliche seiner/ihrer bei CASA gespeicherten Daten zu erhalten. Sie können ferner die Berichtigung, Löschung oder Sperrung Ihrer Daten verlangen bzw. die Einwilligung zur Erhebung, Speicherung, Verarbeitung und Nutzung Ihrer personenbezogenen Daten widerrufen.',
    ],
  },
  {
    title: '9. Haftung',
    body: [
      '(9.1) CASA haftet gegenüber der/dem Teilnehmenden für entstandene Schäden und leistet Schadensersatz nur bei Vorsatz und grober Fahrlässigkeit. CASA haftet ferner für die fahrlässige Verletzung von wesentlichen Vertragspflichten (Kardinalpflichten), d.h. solchen Pflichten, deren Verletzung die Erreichung des Vertragszweckes gefährdet und auf deren Einhaltung ein Vertragspartner regelmäßig vertrauen darf. Im Falle der fahrlässigen Verletzung von Kardinalpflichten haftet CASA jedoch nur für den vorhersehbaren, vertragstypischen Schaden.',
      '(9.2) Die vorstehenden Haftungsausschlüsse gelten nicht bei der Verletzung von Leben, Körper und Gesundheit. Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt. Ein Ausschluss oder eine Begrenzung der Haftung von CASA wirkt auch auf die persönliche Haftung seiner gesetzlichen Vertreter, Angestellten und sonstigen Erfüllungsgehilfen.',
    ],
  },
  {
    title: '10. Salvatorische Klausel',
    body: [
      '(10.1) Sollten einzelne Bestimmungen dieses Vertrages unwirksam oder undurchführbar sein oder nach Vertragsschluss unwirksam oder undurchführbar werden, bleibt davon die Wirksamkeit des Vertrages im Übrigen unberührt.',
      '(10.2) An die Stelle der unwirksamen oder undurchführbaren Bestimmung soll diejenige wirksame und durchführbare Regelung treten, deren Wirkungen der wirtschaftlichen Zielsetzung am nächsten kommen, die die Vertragsparteien mit der unwirksamen bzw. undurchführbaren Bestimmung verfolgt haben. Die vorstehenden Bestimmungen gelten entsprechend für den Fall, dass sich der Vertrag als lückenhaft erweist.',
    ],
  },
  {
    title: '11. Rechtswahl und Gerichtsstand',
    body: [
      '(11.1) Es gilt deutsches Recht soweit hierdurch der durch zwingende Bestimmungen des Rechts des Staates des gewöhnlichen Aufenthaltes des/der Teilnehmenden gewährte Schutz nicht entzogen wird.',
      '(11.2) Gerichtsstand ist der Sitz von CASA, soweit der/die Teilnehmende nicht Verbraucher, sondern Kaufmann ist oder soweit der/die Teilnehmende nach Vertragsschluss seinen/ihren Wohnsitz oder gewöhnlichen Aufenthaltsort ins Ausland verlegt hat oder sein/ihr Wohnsitz oder gewöhnlicher Aufenthalt zum Zeitpunkt der Klageerhebung nicht bekannt ist.',
    ],
  },
];

export default async function TermsPage() {
  const locale = await getContentLocale();
  const pageConfig = getPublicPageConfig('terms', locale);
  const hero = { ...getPageHero('terms', locale), ctas: pageConfig.ctas };
  const sections = locale === 'de' ? termsSectionsDe : termsSectionsEn;

  return (
    <LegalUtilityTemplate
      hero={hero}
      breadcrumbs={[
        { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
        { label: locale === 'de' ? 'AGB' : 'Terms' },
      ]}
      sections={sections}
      notice={
        locale === 'de'
          ? 'Rechtlicher Hinweis: Diese AGB entsprechen den offiziellen Geschäftsbedingungen von CASA.'
          : 'Legal notice: These terms correspond to the official terms and conditions of CASA.'
      }
    />
  );
}
