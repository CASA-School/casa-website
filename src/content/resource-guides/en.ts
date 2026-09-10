import type { ResourceGuideData, ResourceGuideSlug } from './types';

/*
 * The three guides in English.
 *
 * Rewritten 2026-09-10. The previous version was written to a template: half
 * the bullets were single words ("Rent", "Food", "Transport", "Housing",
 * "Paperwork"), every topic ended in an "Action:" line, and each guide carried
 * a "How CASA helps" section that sold rather than informed. A category label
 * is not information — a reader who does not know what to budget for is not
 * helped by the word "Rent".
 *
 * Rules for editing these:
 *   - Every bullet is a sentence that tells the reader something they did not
 *     already know from the heading above it.
 *   - No figure that is not verified. Rents, blocked-account amounts, permitted
 *     working hours and insurance premiums all change and all differ by
 *     nationality, city or year: point at the official source instead.
 *   - CASA appears where it is the answer to the reader's question, once per
 *     guide, and never as a section of its own.
 *   - German terms a reader will meet on a form (Anmeldung,
 *     Wohnungsgeberbestätigung, Ausbildung, WG) are given in German, because
 *     that is what the form says.
 */

export const studyInGermanyGuideEn: ResourceGuideData = {
  slug: 'study-in-germany',
  path: '/resources/study-in-germany',
  metaTitle: 'Study & Life in Germany: the steps in the order they happen',
  metaDescription:
    'What it takes to study in Germany, from choosing a programme to your first month here: entry requirements, language levels, applications, funding and housing.',
  hero: {
    title: 'Study & Life in Germany',
    summary: 'Applications, language, funding and housing, in the order they actually happen.',
    lead: 'The route from deciding to study in Germany to your first month here, written for people organising it from abroad.',
    photo: {
      src: '/media/casa/study-materials-map.jpg',
      alt: 'Study materials and a map laid out for planning a course',
    },
    ctas: [{ label: 'Explore CASA courses', href: '/courses' }],
  },
  quickFacts: [
    'Public universities charge a semester contribution rather than tuition, so living costs decide your budget, not fees.',
    'Almost every programme asks for proof of language: German for German-taught degrees, English for the rest.',
    'A student visa usually requires proof of funds and health insurance before you travel, not after you arrive.',
    'Your first month here is mostly administrative: registering your address, a bank account, insurance, enrolment.',
  ],
  stepsTitle: 'The steps, in order',
  steps: [
    {
      title: 'Choose the kind of programme',
      text: 'A university is research-led, a University of Applied Sciences is practice-led, and an Ausbildung is paid vocational training with a company. The choice changes both your language requirement and your timeline.',
      action: 'Write down one target: subject, city, and the semester you want to start.',
    },
    {
      title: 'Read the entry requirements yourself',
      text: 'Every programme sets its own: school certificates, grades, a language certificate, sometimes an entrance test. Two programmes at the same university can ask for different things.',
      action: 'Shortlist three to five programmes and list what each one requires.',
    },
    {
      title: 'Decide German-taught or English-taught',
      text: 'A German-taught degree asks for a high level of German, usually C1 with a recognised certificate. An English-taught degree asks for English, and still leaves you living in German.',
      action: 'Set a target level: B1 to live comfortably, C1 for a German-taught degree.',
    },
    {
      title: 'Plan the language backwards from your start date',
      text: 'Levels take months rather than weeks. Counting back from the semester you want shows you whether an intensive course or evening classes fit the time you have.',
      action: 'Take a placement test first. Guessing your own level is how plans slip.',
    },
    {
      title: 'Get the documents in order early',
      text: 'Certified copies and sworn translations take time, and universities differ on what they accept. A missing translation is the most common reason an application stalls.',
      action: 'Keep one folder: originals, certified copies, translations, CV, passport.',
    },
    {
      title: 'Apply, directly or through uni-assist',
      text: 'Some universities take international applications themselves, others route them through uni-assist, and a few do both depending on the programme. Either way, processing takes weeks.',
      action: 'Apply when the window opens rather than near the deadline.',
    },
    {
      title: 'Prove your funding and arrange insurance',
      text: 'Most student visa applications require evidence that you can cover your first year, usually through a blocked account, plus health insurance valid in Germany. What counts as evidence depends on your nationality.',
      action: "Work from your own embassy's current checklist, not from a forum.",
    },
    {
      title: 'Arrive, register, enrol',
      text: 'The first weeks are paperwork in a fixed order: register your address, open an account, confirm insurance, enrol, then apply for your residence permit.',
      action: 'The Living in Germany guide takes that month week by week.',
    },
  ],
  sections: [
    {
      title: 'Which programme type fits you',
      intro: 'The three routes lead to different places, and the entry requirements follow from that rather than the other way round.',
      bullets: [
        'A university is academic and research-led, and it is the usual route on to a master’s degree and a doctorate.',
        'A University of Applied Sciences teaches the same subjects toward practice, is closer to industry, and often includes a mandatory internship semester.',
        'An Ausbildung pays you while you train inside a company, and leads into a trade or profession rather than into academia. It is the route most often overlooked from abroad.',
      ],
    },
    {
      title: 'Applications and deadlines',
      intro: 'Missing a deadline usually costs a whole semester, so the calendar is part of the application rather than a detail around it.',
      bullets: [
        'Check per programme whether you apply directly or through uni-assist. Both can exist at one university.',
        'Deadlines for the winter semester generally fall in summer, and for the summer semester in winter. Confirm each one at the source.',
        'Allow weeks for processing, and allow again for whatever comes back incomplete.',
        'Keep every document both digitally and on paper. You will be asked for each at different points.',
      ],
    },
    {
      title: 'Language: how much, and how fast',
      intro: 'Your German level decides which degrees are open to you, and how much of daily life you can handle without help.',
      bullets: [
        'German-taught degrees generally require C1, evidenced by a recognised certificate rather than by self-assessment.',
        'An English-taught degree still leaves you renting a flat, sitting in offices and working part-time in German.',
        'Steady weekly classes beat short bursts, unless you have a deadline. Then intensive is the honest answer.',
        'CASA places you by level and runs intensive and evening courses from A1 to C1, with telc preparation when a certificate is what you need.',
      ],
      link: { label: 'Start with a placement test', href: '/placement-test' },
    },
    {
      title: 'Funding, housing and the first month',
      intro: 'A study plan only holds if the arrival plan does. The deposit, the first rent and the insurance all land in the same few weeks.',
      bullets: [
        'Budget for the semester contribution even where there is no tuition. It often includes a local transport pass.',
        'Rent is the largest difference between German cities, and the deposit is usually several months of it, paid before you move in.',
        'Address registration, a bank account and health insurance depend on one another, so the order you do them in matters.',
        'Keep a buffer rather than a precise plan for month one. It always costs more than the months that follow.',
      ],
      link: { label: 'Read the Living in Germany guide', href: '/resources/living-in-germany' },
    },
  ],
  faq: [
    {
      question: 'Do I need German before I arrive?',
      answer:
        'Only a German-taught degree requires it formally. But housing, public offices and part-time work all happen in German, so arriving at around B1 makes the first months considerably easier.',
    },
    {
      question: 'Is studying in Germany free?',
      answer:
        'Public universities generally charge a semester contribution instead of tuition, and that contribution often includes local public transport. Private universities charge fees. Confirm the figure with the university itself.',
    },
    {
      question: 'What is uni-assist?',
      answer:
        'A shared service that checks international applications on behalf of many German universities. Some use it, others handle applications themselves, and a few do both depending on the programme.',
    },
    {
      question: 'How early should I apply?',
      answer:
        'As soon as the application window opens. Documents come back for correction, translations take time, and a visa appointment can add weeks after you have the offer.',
    },
    {
      question: 'Do I have to prove that I can pay?',
      answer:
        'Most student visa applicants do, usually through a blocked account. The amount and the accepted evidence depend on your nationality, so use your embassy’s current checklist.',
    },
  ],
  officialLinks: [
    {
      label: 'Study in Germany',
      description: 'The official portal: programmes, requirements, funding, arrival.',
      url: 'https://www.study-in-germany.com/en/',
    },
    {
      label: 'uni-assist',
      description: 'How to apply through the shared application service.',
      url: 'https://www.uni-assist.de/en/how-to-apply/apply-online/',
    },
    {
      label: 'Federal Foreign Office: blocked account',
      description: 'What counts as proof of funds for a student visa.',
      url: 'https://www.auswaertiges-amt.de/en/sperrkonto-388600',
    },
    {
      label: 'Studierendenwerke',
      description: 'Student services: halls of residence, insurance, everyday costs.',
      url: 'https://www.studierendenwerke.de/en/topics/student-finance/costs-of-study/insurances-for-students/studienvoraussetzung-kranken-und-pflegeversicherung',
    },
  ],
};

export const livingInGermanyGuideEn: ResourceGuideData = {
  slug: 'living-in-germany',
  path: '/resources/living-in-germany',
  metaTitle: 'Living in Germany: your first thirty days',
  metaDescription:
    'Registering your address, opening a bank account, health insurance, finding a room and the daily habits that make the first month in Germany easier.',
  hero: {
    title: 'Living in Germany',
    summary: 'Registration, banking, insurance and housing, in the order the first month demands them.',
    lead: 'The practical month: what to do in which week after you land, and which tasks block the others until they are done.',
    photo: {
      src: '/media/casa/bremen-schnoor-houses.jpg',
      alt: 'Gabled houses in the Schnoor quarter of Bremen',
    },
    ctas: [{ label: 'See CASA accommodation', href: '/accommodation' }],
  },
  quickFacts: [
    'Registering your address, the Anmeldung, unlocks nearly everything else: the bank, the insurer, the residence permit.',
    'Health insurance is a condition of enrolment and of your permit, not an optional extra.',
    'Rooms in student cities go quickly, and being organised beats being early.',
    'Most public offices work by appointment, and appointments are often booked weeks ahead.',
  ],
  stepsTitle: 'Your first thirty days, week by week',
  steps: [
    {
      title: 'Before you fly',
      text: 'Arrange somewhere to stay that you are allowed to register at if you can, and bring your documents as originals plus certified copies.',
      action: 'Book whatever office appointments can be booked from abroad.',
    },
    {
      title: 'Days one to three: become reachable',
      text: 'A German mobile number and a fixed address make every later step possible. Messaging apps are not enough for the forms.',
      action: 'Buy a SIM card, and note your address exactly as it appears on the letterbox.',
    },
    {
      title: 'Week one: register your address',
      text: 'The Anmeldung at the citizens’ office produces a registration certificate. The bank, the insurer and the immigration office all ask to see it.',
      action: 'Bring your passport, the landlord’s confirmation (Wohnungsgeberbestätigung) and the form.',
    },
    {
      title: 'Week one to two: open a bank account',
      text: 'Rent, insurance and a phone contract are all paid by direct debit from a German account, so this unblocks the rest of the month.',
      action: 'Decide whether you want a branch you can walk into or an app-only account before you choose.',
    },
    {
      title: 'Week two to four: insurance and the residence permit',
      text: 'Confirm that your health cover meets the requirement for your status, then apply for your residence permit if your nationality needs one.',
      action: 'Keep every confirmation letter. Each one gets asked for again later.',
    },
    {
      title: 'Move from temporary to permanent housing',
      text: 'A temporary room buys you the time to view real ones. Shared flats and landlords decide quickly, so the paperwork has to be ready before the viewing.',
      action: 'Write a short introduction and keep your documents together in one file.',
    },
    {
      title: 'Then build the routine',
      text: 'The language stops being a subject when it becomes the day: the shops, the appointments, the neighbours, the course.',
      action: 'Pick one thing each week that you will do in German rather than in English.',
    },
  ],
  sections: [
    {
      title: 'Where students actually live',
      intro: 'Four models, and they differ in cost, in independence, and in how much help you get when something goes wrong.',
      bullets: [
        'A hall of residence is usually the cheapest option and the most contested. Apply the day you have an offer, not once you arrive.',
        'A shared flat, a WG, is the normal way to live here, and the room is chosen by the people already living in it.',
        'A private flat gives you independence and asks for a deposit, proof of income and patience with the market.',
        'A host family gives you a household and the language every day, which is why CASA arranges them for course participants.',
      ],
      link: { label: 'See the accommodation CASA arranges', href: '/accommodation' },
    },
    {
      title: 'Budgeting for the real first month',
      intro: 'Month one is not a typical month, and planning it as though it were is the usual mistake.',
      bullets: [
        'Rent is the variable that separates cities. Most other costs are broadly comparable across Germany.',
        'The deposit is normally several months of rent, paid before you move in and returned when you leave the flat in good order.',
        'Add the one-off costs nobody plans for: bedding and kitchen basics, a transport pass, the trips to offices.',
        'Keep a buffer rather than an exact plan. Something always arrives later or costs more than expected.',
      ],
    },
    {
      title: 'The documents that gate everything else',
      intro: 'Two or three pieces of paper decide how quickly the rest of the month goes, so get them early and keep copies.',
      bullets: [
        'Health insurance is required both for enrolment and for the residence permit.',
        'Travel insurance is generally not accepted for a long stay, even when the dates cover it.',
        'Personal liability insurance, Haftpflichtversicherung, is not compulsory but is normal here, and landlords ask about it.',
        'Keep one folder: registration certificate, insurance confirmation, tenancy contract, enrolment certificate.',
      ],
    },
    {
      title: 'Working while you study',
      intro: 'Working alongside a course is normal, and the rules attach to your residence permit rather than to your course.',
      bullets: [
        'What you are allowed to work depends on your residence title and your nationality. The conditions are printed on the permit itself.',
        'Your university’s international office and the immigration office are the two places that give binding answers.',
        'A job in German pays the same as a job in English and teaches considerably more.',
        'Protect the study rhythm. Repeating a semester costs far more than the extra shifts pay.',
      ],
    },
  ],
  faq: [
    {
      question: 'What do I need for the Anmeldung?',
      answer:
        'Your passport, the confirmation from your landlord that you live at the address (Wohnungsgeberbestätigung), and the completed form. Book the appointment as soon as you have the confirmation, because slots go quickly.',
    },
    {
      question: 'Do I need health insurance immediately?',
      answer:
        'For a long stay, yes. Enrolment and the residence permit both require valid cover, and ordinary travel insurance usually does not qualify.',
    },
    {
      question: 'Is finding a room really that hard?',
      answer:
        'In the popular student cities it is. What helps is applying early, answering the same day, and having your documents in a single file so a viewing can turn into a contract.',
    },
    {
      question: 'May I work while I study?',
      answer:
        'Usually, within limits that depend on your residence title and your nationality. Read the conditions on your own permit and confirm them with the immigration office rather than with other students.',
    },
    {
      question: 'What should I bring from home?',
      answer:
        'Original certificates with certified copies, several passport photographs, documentation for any medication you take, and digital copies of all of it.',
    },
  ],
  officialLinks: [
    {
      label: 'Studierendenwerke',
      description: 'Student services: halls of residence, insurance, everyday costs.',
      url: 'https://www.studierendenwerke.de/en/topics/student-finance/costs-of-study/insurances-for-students/studienvoraussetzung-kranken-und-pflegeversicherung',
    },
    {
      label: 'Make it in Germany',
      description: 'The federal portal on residence and working rules.',
      url: 'https://www.make-it-in-germany.com/en/',
    },
    {
      label: 'Federal Foreign Office: blocked account',
      description: 'Proof of funds for a student visa.',
      url: 'https://www.auswaertiges-amt.de/en/sperrkonto-388600',
    },
  ],
};

export const whyGermanyGuideEn: ResourceGuideData = {
  slug: 'why-germany',
  path: '/resources/why-germany',
  metaTitle: 'Why Germany, and why German',
  metaDescription:
    'What Germany offers a student in practice: what it costs, which qualifications are recognised, how study and work fit together, and where speaking German changes the outcome.',
  hero: {
    title: 'Why Germany',
    summary: 'What Germany offers a student in practice, and where German changes the outcome.',
    lead: 'A page for deciding rather than for persuading: what is genuinely good here, what takes effort, and how much of it depends on the language.',
    photo: {
      src: '/media/casa/group-course-walking-bremen.jpg',
      alt: 'CASA learners walking through Bremen together',
    },
    ctas: [{ label: 'Explore CASA courses', href: '/courses' }],
  },
  quickFacts: [
    'Public higher education is comparatively affordable, so the cost you plan for is living here rather than studying here.',
    'German qualifications are widely recognised, including the vocational routes that start outside a university.',
    'Studying and working can be combined, within the conditions written on your residence permit.',
    'Nearly every advantage on this page gets larger once you speak German.',
  ],
  stepsTitle: 'A way to decide',
  steps: [
    {
      title: 'What is the outcome you want?',
      text: 'A degree, a profession, a language level, or a move. Each one implies a different route through the system and a different amount of German.',
    },
    {
      title: 'Which city can you actually afford?',
      text: 'Rent varies far more between German cities than anything else does, and a smaller city usually buys you both time and quiet.',
    },
    {
      title: 'Which route fits the way you learn?',
      text: 'Academic, applied, or paid vocational training. The applied and vocational routes are the ones most undervalued from abroad.',
    },
    {
      title: 'How much German do you honestly need?',
      text: 'Around B1 to live comfortably, C1 for a German-taught degree, and somewhere between the two for most workplaces.',
    },
    {
      title: 'When do you want to start, and what does that mean today?',
      text: 'Count backwards: enrolment, visa, offer, application, language level. The language is the longest item on that list, so it is the one that starts first.',
    },
  ],
  sections: [
    {
      title: 'What it actually costs',
      intro: 'Germany is unusually affordable in the place people look at, which is fees, and entirely ordinary in the place they forget, which is rent.',
      bullets: [
        'Public universities charge a semester contribution instead of tuition, and it frequently includes a local transport pass.',
        'Rent sets your monthly budget, and it is decided by the city you choose rather than by the university.',
        'A student visa usually asks you to show a year of funding in advance. That is a planning question more than a wealth question.',
      ],
    },
    {
      title: 'Recognition, and the routes people overlook',
      intro: 'The qualification is recognised internationally, and so are the routes that do not begin at a university.',
      bullets: [
        'Degrees from universities and from universities of applied sciences carry comparable weight in the labour market.',
        'An Ausbildung pays you while you train and leads directly into a trade or a profession.',
        'telc and comparable certificates are the accepted evidence of a language level, which is why exam preparation belongs in a course plan rather than after it.',
      ],
      link: { label: 'See the exam pathways', href: '/exams' },
    },
    {
      title: 'Where German changes the outcome',
      intro: 'This is the part that is hardest to see from abroad. Here the language is not a subject you study, it is the access you have.',
      bullets: [
        'Housing: the viewing, the contract and the neighbours are all in German, including in cities full of international students.',
        'Public offices: registration, insurance and the immigration office all assume you can follow the conversation.',
        'Work: a part-time job in German pays what one in English pays, and teaches you considerably more.',
        'People: it is the difference between being a guest here for three years and living here.',
      ],
      link: { label: 'Find a course that fits your timeline', href: '/courses' },
    },
  ],
  faq: [
    {
      question: 'Is Germany a good choice if I do not speak German yet?',
      answer:
        'Yes, and it becomes a considerably better one as your German improves. The useful move is to start before you arrive rather than afterwards.',
    },
    {
      question: 'Is studying here expensive?',
      answer:
        'Fees at public universities are low by international comparison. Living costs are ordinary European ones and are driven mostly by rent.',
    },
    {
      question: 'Do I need to prove my funding?',
      answer:
        'Most student visa applicants do. Your embassy publishes the current amount and the forms of evidence it accepts.',
    },
    {
      question: 'Why start German before arriving?',
      answer:
        'Because everything administrative happens in your first month here, and that is precisely the month in which you have the least German.',
    },
    {
      question: 'Why Bremen?',
      answer:
        'A working port city rather than a tourist one: rents that are manageable by German standards, a real student population, and enough going on. CASA has taught German here since 1983.',
    },
  ],
  officialLinks: [
    {
      label: 'Study in Germany',
      description: 'The official portal for programmes and planning.',
      url: 'https://www.study-in-germany.com/en/',
    },
    {
      label: 'Make it in Germany',
      description: 'The federal portal on working and living in Germany.',
      url: 'https://www.make-it-in-germany.com/en/',
    },
    {
      label: 'Federal Foreign Office: blocked account',
      description: 'Proof of funds for a student visa.',
      url: 'https://www.auswaertiges-amt.de/en/sperrkonto-388600',
    },
  ],
};

export const resourceGuidesEn: Record<ResourceGuideSlug, ResourceGuideData> = {
  'study-in-germany': studyInGermanyGuideEn,
  'living-in-germany': livingInGermanyGuideEn,
  'why-germany': whyGermanyGuideEn,
};
