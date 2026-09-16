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
  metaTitle: 'Study and life in Germany: planning your next steps',
  metaDescription:
    'What it takes to study in Germany, from choosing a programme to your first month here: entry requirements, language levels, applications, funding and housing.',
  hero: {
    title: 'Study & Life in Germany',
    summary: 'A guide to choosing a course of study, preparing your application and settling in.',
    lead: 'Planning to study in Germany brings plenty of questions. Start with your goals, then work through the language, application and practical arrangements at your own pace.',
    photo: {
      src: '/media/casa/study-materials-map.jpg',
      alt: 'Study materials and a map laid out for planning a course',
    },
    ctas: [{ label: 'Explore CASA courses', href: '/courses' }],
  },
  quickFacts: [
    'Many public degree programmes have no tuition fees, but exceptions apply. Check both tuition fees and the semester contribution for your chosen programme.',
    'Check which language certificates your chosen programme accepts; requirements vary by course and teaching language.',
    'A student visa usually requires proof of funds and health insurance before you travel, not after you arrive.',
    'Alongside meeting people and exploring your new city, allow time for address registration, banking, insurance and enrolment.',
  ],
  stepsTitle: 'The steps, in order',
  steps: [
    {
      title: 'Choose the kind of programme',
      text: 'Universities and universities of applied sciences offer different balances of research and practical study. Vocational training, known as Ausbildung, is another route into a profession; company-based programmes usually include pay.',
      action: 'Write down one target: subject, city, and the semester you want to start.',
    },
    {
      title: 'Check the entry requirements',
      text: 'Every programme sets its own: school certificates, grades, a language certificate, sometimes an entrance test. Two programmes at the same university can ask for different things.',
      action: 'Shortlist three to five programmes and list what each one requires.',
    },
    {
      title: 'Decide German-taught or English-taught',
      text: 'German-taught degrees usually require advanced German and an accepted certificate. English-taught degrees have their own language requirements; German is still useful for life outside university.',
      action: 'Check the exact certificate and result your programme requires, then plan from your current level.',
    },
    {
      title: 'Plan the language backwards from your start date',
      text: 'Learning takes time, and the right pace depends on your starting level and weekly study time. Work back from your intended start date and leave room for exams and their results.',
      action: 'A placement test gives you a useful starting point for a realistic language plan.',
    },
    {
      title: 'Get the documents in order early',
      text: 'Check which documents your university needs and whether it requires certified copies or translations. Preparing these early gives you time to resolve questions before the deadline.',
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
      action: 'Use the current checklist from the German embassy or consulate responsible for your application.',
    },
    {
      title: 'Arrive, register, enrol',
      text: 'Check the deadlines for address registration, enrolment and any residence permit you need. Some arrangements can run in parallel; your university and the relevant offices can explain what applies to you.',
      action: 'Use the Living in Germany guide to plan the practical side of your arrival.',
    },
  ],
  sections: [
    {
      title: 'Which programme type fits you',
      intro: 'Think about the subject you enjoy, how you like to learn and the work you might want to do afterwards.',
      bullets: [
        'Universities usually place a strong emphasis on academic study and research.',
        'Universities of applied sciences often combine academic study with practical projects and placements.',
        'Company-based vocational training combines work and learning. Check the entry requirements, pay and qualification for the programme that interests you.',
      ],
    },
    {
      title: 'Applications and deadlines',
      intro: 'Keep the application period and any document deadlines together in one calendar so you can prepare in good time.',
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
        'Your chosen university decides which German certificates and results it accepts for admission.',
        'German can help with finding a home, making appointments and getting to know people, even if your degree is taught in English.',
        'Choose a learning schedule you can sustain. An intensive course offers more class time; evening classes can fit around other commitments.',
        'At CASA, we discuss your level and plans with you, then help you choose a German course and, if needed, separate telc preparation.',
      ],
      link: { label: 'Start with a placement test', href: '/placement-test' },
    },
    {
      title: 'Funding, housing and the first month',
      intro: 'Plan for your arrival as well as your studies: housing, insurance and initial purchases can fall due close together.',
      bullets: [
        'Budget for the semester contribution even where there is no tuition. It often includes a local transport pass.',
        'Compare local rents and check your tenancy agreement for the deposit, payment dates and any additional costs.',
        'Ask the university, bank and insurer which documents they need and when, so you can coordinate your arrangements.',
        'Leave some room in your budget for one-off purchases and unexpected costs in the first weeks.',
      ],
      link: { label: 'Read the Living in Germany guide', href: '/resources/living-in-germany' },
    },
  ],
  faq: [
    {
      question: 'Do I need German before I arrive?',
      answer:
        'Check the language requirements of your chosen programme. Even for an English-taught degree, some German can make everyday conversations, appointments and meeting people easier.',
    },
    {
      question: 'Is studying in Germany free?',
      answer:
        'Many public programmes have no tuition fees, but there are exceptions by institution, programme and student status. A semester contribution is a separate cost. Ask your university for the full current fees.',
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
  metaTitle: 'Living in Germany: settling into everyday life',
  metaDescription:
    'Registering your address, opening a bank account, health insurance, finding a room and the daily habits that make the first month in Germany easier.',
  hero: {
    title: 'Living in Germany',
    summary: 'Practical help with accommodation, appointments and everyday life as you settle in.',
    lead: 'A new home brings practical tasks as well as new possibilities. This guide helps you prepare the essentials and leave time to get to know the place and the people around you.',
    photo: {
      src: '/media/casa/bremen-schnoor-houses.jpg',
      alt: 'Gabled houses in the Schnoor quarter of Bremen',
    },
    ctas: [{ label: 'See CASA accommodation', href: '/accommodation' }],
  },
  quickFacts: [
    'Address registration, called Anmeldung, is one of the practical tasks to arrange after moving. Check the local requirements and available appointments.',
    'Health insurance is a condition of enrolment and of your permit, not an optional extra.',
    'Start looking for accommodation early and keep the documents you need ready for enquiries and viewings.',
    'Most public offices work by appointment, and appointments are often booked weeks ahead.',
  ],
  stepsTitle: 'Planning your first weeks',
  steps: [
    {
      title: 'Before you fly',
      text: 'Arrange somewhere to stay that you are allowed to register at if you can, and bring your documents as originals plus certified copies.',
      action: 'Book whatever office appointments can be booked from abroad.',
    },
    {
      title: 'Make sure people can reach you',
      text: 'Keep a working phone number and email address, and check how you will receive post. Universities, banks and public offices may send important letters.',
      action: 'Make sure your name appears on your letterbox and that you can receive calls and messages.',
    },
    {
      title: 'Arrange your address registration',
      text: 'Your local citizens’ office explains how to register your address and which documents to bring. Keep the registration certificate for later appointments.',
      action: 'Bring your passport, the landlord’s confirmation (Wohnungsgeberbestätigung) and the form.',
    },
    {
      title: 'Arrange everyday banking',
      text: 'Check how you will pay rent and other regular bills. If you need a new account, compare fees, services and the documents the bank requires.',
      action: 'Decide whether you want a branch you can walk into or an app-only account before you choose.',
    },
    {
      title: 'Confirm insurance and residence requirements',
      text: 'Confirm that your health cover meets the requirement for your status, then apply for your residence permit if your nationality needs one.',
      action: 'Keep every confirmation letter. Each one gets asked for again later.',
    },
    {
      title: 'Move from temporary to permanent housing',
      text: 'If you start in temporary accommodation, allow time to look for a longer-term home. Prepare a short introduction and check what each landlord or shared household needs from you.',
      action: 'Write a short introduction and keep your documents together in one file.',
    },
    {
      title: 'Make room for everyday life',
      text: 'A conversation with a neighbour, a shared meal or a regular activity can help you feel more at ease. Small opportunities to use German count, too.',
      action: 'Choose one everyday situation in which you would like to try speaking German this week.',
    },
  ],
  sections: [
    {
      title: 'Finding a place to live',
      intro: 'Think about your budget, the journey to your course and how much you would like to share daily life with others.',
      bullets: [
        'Student residences can be an affordable option. Check eligibility and apply early, as waiting lists may be long.',
        'In a shared flat, or WG, you have your own room and share spaces such as the kitchen with your housemates.',
        'A private flat gives you independence and asks for a deposit, proof of income and patience with the market.',
        'For intensive-course participants, CASA arranges rooms with local hosts or in shared flats, subject to availability.',
      ],
      link: { label: 'See the accommodation CASA arranges', href: '/accommodation' },
    },
    {
      title: 'Budgeting for the real first month',
      intro: 'The first weeks often include one-off costs alongside your usual living expenses. A little room in your budget can help.',
      bullets: [
        'Compare rents in the neighbourhoods you are considering and include transport costs in your budget.',
        'Check the deposit and payment arrangements in your tenancy agreement, including the conditions for its return.',
        'Remember initial purchases such as bedding, kitchen essentials and travel tickets.',
        'Keep a reserve for unexpected costs or a longer period in temporary accommodation.',
      ],
    },
    {
      title: 'Keep your documents together',
      intro: 'A folder with your important documents and digital copies makes appointments and applications easier to manage.',
      bullets: [
        'Health insurance is required both for enrolment and for the residence permit.',
        'Travel insurance is generally not accepted for a long stay, even when the dates cover it.',
        'Personal liability insurance, Haftpflichtversicherung, is not compulsory but is normal here, and landlords ask about it.',
        'Keep one folder: registration certificate, insurance confirmation, tenancy contract, enrolment certificate.',
      ],
    },
    {
      title: 'Working while you study',
      intro: 'A part-time job may fit alongside your studies. Check the rules that apply to your nationality and residence status before making plans.',
      bullets: [
        'What you are allowed to work depends on your residence title and your nationality. The conditions are printed on the permit itself.',
        'Your university’s international office can help you find advice; the immigration authority can confirm the conditions of your residence permit.',
        'Speaking German can open up more opportunities to work with colleagues and customers.',
        'Allow enough time for classes, independent study and rest when deciding how much work to take on.',
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
  metaTitle: 'Why study and learn German in Germany?',
  metaDescription:
    'What Germany offers a student in practice: what it costs, which qualifications are recognised, how study and work fit together, and where speaking German changes the outcome.',
  hero: {
    title: 'Why Germany',
    summary: 'What Germany offers a student in practice, and where German changes the outcome.',
    lead: 'Explore what studying and living in Germany could mean for you, from choosing a programme to building friendships and feeling at home in a new city.',
    photo: {
      src: '/media/casa/group-course-walking-bremen.jpg',
      alt: 'CASA learners walking through Bremen together',
    },
    ctas: [{ label: 'Explore CASA courses', href: '/courses' }],
  },
  quickFacts: [
    'Many public degree programmes have no tuition fees, but check for exceptions and budget for semester contributions and living costs.',
    'Compare academic study and vocational training, and check where your intended qualification will be recognised.',
    'Studying and working can be combined, within the conditions written on your residence permit.',
    'German can help you join in more of everyday life, from conversations with neighbours to opportunities at work.',
  ],
  stepsTitle: 'A way to decide',
  steps: [
    {
      title: 'What would you like to do?',
      text: 'You may want to study, begin a career, develop your German or make a new home. Your goal is a useful starting point for exploring the options.',
    },
    {
      title: 'Which city can you actually afford?',
      text: 'Look at rent, transport and everyday costs alongside the courses and opportunities each city offers.',
    },
    {
      title: 'Which route fits the way you learn?',
      text: 'Compare academic study, applied degree programmes and vocational training. Each offers a different way to develop your skills.',
    },
    {
      title: 'What German will you need?',
      text: 'Check the requirements of your course or profession. Think about everyday life too: the conversations you would like to have and the tasks you want to handle independently.',
    },
    {
      title: 'When do you want to start, and what does that mean today?',
      text: 'Work back from your intended start date, allowing time for language learning, applications, exams and any visa arrangements.',
    },
  ],
  sections: [
    {
      title: 'What it actually costs',
      intro: 'Compare the complete budget, including fees, rent, insurance, travel and day-to-day spending.',
      bullets: [
        'Check tuition fees and the semester contribution separately; public programmes can also charge tuition in some circumstances.',
        'Rent sets your monthly budget, and it is decided by the city you choose rather than by the university.',
        'If you need a student visa, check the current funding requirements and accepted evidence before you apply.',
      ],
    },
    {
      title: 'Explore different qualifications',
      intro: 'The right qualification depends on what you want to do and where you hope to use it.',
      bullets: [
        'Compare the content and practical experience offered by universities and universities of applied sciences.',
        'Company-based vocational training combines learning with paid work towards a professional qualification.',
        'Before booking a language exam, check which certificate and result your university or employer accepts.',
      ],
      link: { label: 'See the exam pathways', href: '/exams' },
    },
    {
      title: 'Where German changes the outcome',
      intro: 'German creates more opportunities to take part, ask questions and get to know the people around you. You can begin with small conversations.',
      bullets: [
        'At home, German helps you speak with housemates, understand correspondence and get to know your neighbours.',
        'For appointments and official letters, German can help you understand the details and ask for clarification.',
        'At work, German helps you communicate with colleagues and customers and explore a wider range of roles.',
        'Through shared interests, local activities and everyday conversations, you can meet people and build friendships.',
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
        'Costs vary by programme and city. Check tuition fees, the semester contribution and living costs together, including rent and insurance.',
    },
    {
      question: 'Do I need to prove my funding?',
      answer:
        'Most student visa applicants do. Your embassy publishes the current amount and the forms of evidence it accepts.',
    },
    {
      question: 'Why start German before arriving?',
      answer:
        'Even a little German can help with your first conversations and appointments. Start when you can, then build on it once you arrive.',
    },
    {
      question: 'Why Bremen?',
      answer:
        'Bremen offers city life, places to explore by the Weser and opportunities to meet people from around the world. At CASA, you can learn German, join activities and get personal help finding your feet.',
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
