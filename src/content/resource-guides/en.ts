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
 *
 * Brought in line with the German rewrite on 2026-10-07: the same facts in the
 * same order, in plain British English.
 */

export const studyInGermanyGuideEn: ResourceGuideData = {
  slug: 'study-in-germany',
  path: '/resources/study-in-germany',
  metaTitle: 'Study and life in Germany: your next steps',
  metaDescription:
    'What you need to study in Germany, from choosing a degree programme to your first month here. It covers admission, language level, applications, funding and housing.',
  hero: {
    title: 'Study & life in Germany',
    summary: 'Help with choosing what to study, applying and your first steps in Germany.',
    lead: 'Would you like to study in Germany? This guide helps you plan, from choosing what to study and taking a language course to arriving here.',
    photo: {
      src: '/media/casa/study-learners-attentive.webp',
      alt: 'Two learners listening attentively',
    },
    ctas: [{ label: 'See our courses', href: '/courses' }],
  },
  quickFacts: [
    'Many public degree programmes have no tuition fees, but there are exceptions. For the programme you want, check the tuition fees and the semester contribution separately.',
    'Which proof of language skills you need depends on the programme and the language it is taught in. What your university says is what counts.',
    'For a student visa, you usually need proof of funds and health insurance before you even travel.',
    'As well as getting to know your new city, you will need time to register your address, open a bank account, sort out insurance and enrol at university.',
  ],
  stepsTitle: 'The steps in the right order',
  steps: [
    {
      title: 'Choose the kind of programme',
      text: 'Universities and universities of applied sciences put different weight on research and practical work. Vocational training, called Ausbildung, also leads to a profession, and company-based training is usually paid.',
      action: 'Write down your goal, with the subject, the city and the semester you would like to start in.',
    },
    {
      title: 'Check the entry requirements',
      text: 'Every programme sets its own requirements. These can include school certificates, grades, a language certificate and sometimes an aptitude test. Even two programmes at the same university can ask for different things.',
      action: 'Pick three to five programmes and note down what each one requires.',
    },
    {
      title: 'Consider the teaching language',
      text: 'To study in German, you usually need advanced German and a recognised certificate. Programmes taught in English have their own requirements. Either way, German helps you in everyday life.',
      action: 'Check which certificate and which result you need, and plan from your current level.',
    },
    {
      title: 'Allow time to learn German',
      text: 'How much time you need depends on what you already know and how much you study each week. Work back from the date you want to start your degree, and remember to allow for exam dates and the wait for results.',
      action: 'A placement test shows you where you stand, so you can plan realistically.',
    },
    {
      title: 'Get all your documents together early',
      text: 'Check which documents your university needs and whether you need certified copies or translations. If you start early, you will have enough time to sort out any questions before the application deadline.',
      action: 'Keep one folder for your originals, certified copies, translations, CV and passport.',
    },
    {
      title: 'Apply, directly or through uni-assist',
      text: 'Some universities handle international applications themselves, others have them checked by uni-assist, and at some it depends on the programme. Either way, the checks take several weeks.',
      action: 'Apply as soon as the application period opens, and don’t wait until just before the deadline.',
    },
    {
      title: 'Prove your funding and arrange insurance',
      text: 'For a student visa, you usually have to show that you can pay for your first year, normally with a blocked account (Sperrkonto). You also need health insurance that is valid in Germany. What counts as proof depends on your nationality.',
      action: 'Use the current checklist from the German embassy or consulate that handles your application.',
    },
    {
      title: 'Arrive, register, enrol',
      text: 'Check the deadlines for registering your address, for enrolling and for your residence permit, if you need one. You can do some of these at the same time. Your university and the relevant offices can help you plan.',
      action: 'The Living in Germany guide has tips for preparing the practical side of your arrival.',
    },
  ],
  sections: [
    {
      title: 'Which kind of study suits you',
      intro: 'Think about which subject interests you, how you like to learn and the field you would like to work in later.',
      bullets: [
        'Universities usually put particular emphasis on academic work and research.',
        'Universities of applied sciences often combine study with practical projects and work placements.',
        'Company-based vocational training combines working and learning. Find out about the entry requirements, the pay and the qualification for the training that interests you.',
      ],
    },
    {
      title: 'Applications and deadlines',
      intro: 'Put the application periods and the deadlines for your documents in one calendar. That way you can plan your preparation well.',
      bullets: [
        'Check for each programme whether you apply directly or through uni-assist. One university can have both.',
        'Deadlines for the winter semester usually fall in the summer, and deadlines for the summer semester in the winter. Double-check every deadline directly with the university.',
        'Allow a few weeks for your application to be checked, and more weeks if documents come back incomplete.',
        'Keep every document both digitally and on paper. You will be asked for both at different times.',
      ],
    },
    {
      title: 'How much German you need',
      intro: 'Your level of German decides which programmes are open to you and how much of everyday life you can manage without help.',
      bullets: [
        'Your university decides which German certificates and results it accepts for admission.',
        'Even if your programme is taught in English, German helps you find somewhere to live, deal with appointments and meet new people.',
        'Choose a pace of learning that fits your everyday life. An intensive course gives you more class time, and an evening course fits well around other commitments.',
        'At CASA, we talk through your level and your plans with you in person. Together we find the right German course for you and, if you need it, extra preparation for your telc exam.',
      ],
      link: { label: 'Take the placement test', href: '/placement-test' },
    },
    {
      title: 'Funding, housing and the first month',
      intro: 'Plan your arrival as well as your studies. Accommodation, insurance and your first purchases can all fall in the same few weeks.',
      bullets: [
        'Budget for the semester contribution, even if there are no tuition fees. It often includes a semester ticket for local transport.',
        'Compare local rents and check the deposit, payment dates and any extra costs in your tenancy agreement.',
        'Ask your university, bank and insurer which documents they need and when. That way you can fit the different steps together.',
        'Some money in reserve helps with your first purchases and unexpected costs in the first few weeks.',
      ],
      link: { label: 'Read the Living in Germany guide', href: '/resources/living-in-germany' },
    },
  ],
  faq: [
    {
      question: 'Do I need German before I arrive?',
      answer:
        'That depends on the entry requirements of your programme. Even if your programme is taught in English, a little German helps, for example in everyday conversations, at appointments and when you meet new people.',
    },
    {
      question: 'Is studying in Germany free?',
      answer:
        'Many public programmes have no tuition fees. There are exceptions, though, depending on the university, the programme and your personal status. The semester contribution comes on top as a separate cost. Ask your university about the current total costs.',
    },
    {
      question: 'What is uni-assist?',
      answer:
        'It is a joint service that checks international applications on behalf of many German universities. Some universities use it, others handle applications themselves, and at some it depends on the programme.',
    },
    {
      question: 'How early should I apply?',
      answer:
        'As soon as the application period opens. Documents sometimes come back for correction, translations take time, and once you have been admitted, you often have to wait several weeks for a visa appointment.',
    },
    {
      question: 'Do I have to prove that I can pay for my studies?',
      answer:
        'For the visa, usually yes, most often with a blocked account. The amount and the proof that is accepted depend on your nationality, so use your embassy’s current list.',
    },
  ],
  officialLinks: [
    {
      label: 'Study in Germany',
      description: 'The official portal on degree programmes, requirements, funding and arrival.',
      url: 'https://www.study-in-germany.com/en/',
    },
    {
      label: 'uni-assist',
      description: 'How applying through the joint application service works.',
      url: 'https://www.uni-assist.de/en/how-to-apply/apply-online/',
    },
    {
      label: 'Federal Foreign Office: blocked account',
      description: 'What counts as proof of funds for a student visa.',
      url: 'https://www.auswaertiges-amt.de/en/sperrkonto-388600',
    },
    {
      label: 'Studierendenwerke',
      description: 'The student services organisations explain halls of residence, insurance and everyday costs.',
      url: 'https://www.studierendenwerke.de/en/topics/student-finance/costs-of-study/insurances-for-students/studienvoraussetzung-kranken-und-pflegeversicherung',
    },
  ],
};

export const livingInGermanyGuideEn: ResourceGuideData = {
  slug: 'living-in-germany',
  path: '/resources/living-in-germany',
  metaTitle: 'Living in Germany: arriving and settling in',
  metaDescription:
    'How to register your address, open a bank account, get health insurance and find a room, and what makes your first month in Germany easier.',
  hero: {
    title: 'Living in Germany',
    summary: 'Practical tips on accommodation, appointments and your new everyday life.',
    lead: 'A new home brings questions as well as new possibilities. This guide helps you get the essentials ready, so that you have time for the people and places around you.',
    photo: {
      src: '/media/casa/bremen-schnoor-houses.jpg',
      alt: 'Gabled houses in the Schnoor quarter of Bremen',
    },
    ctas: [{ label: 'See our accommodation', href: '/accommodation' }],
  },
  quickFacts: [
    'After you move, registering your address, called the Anmeldung, is one of the first important things to do. Find out about the local rules and which appointments are available.',
    'Without health insurance, you cannot enrol at university or get a residence permit.',
    'Start looking for somewhere to live early, and have your documents ready for enquiries and viewings.',
    'Most public offices work by appointment, and appointments are often booked up weeks in advance.',
  ],
  stepsTitle: 'Plan your first weeks',
  steps: [
    {
      title: 'Before you fly',
      text: 'If you can, arrange somewhere to stay where you are allowed to register your address, and bring your documents as originals and as certified copies.',
      action: 'Book any office appointments that you can already make from abroad.',
    },
    {
      title: 'Make sure people can reach you',
      text: 'A working phone number, email address and postal address make a lot of things easier. Universities, banks and public authorities also send important information by post.',
      action: 'Make sure your name appears on your letterbox and that you can receive calls and messages.',
    },
    {
      title: 'Register your address',
      text: 'Your local citizens’ office (Bürgeramt) will tell you how to register your address and which documents you need. Keep the registration certificate (Meldebescheinigung) somewhere safe, because you will need it for other appointments.',
      action: 'Bring your passport, the landlord’s confirmation (Wohnungsgeberbestätigung) and the completed form.',
    },
    {
      title: 'Set up your everyday banking',
      text: 'Work out how you will pay your rent and regular bills. If you need a new account, compare the fees, the services and the documents the bank asks for.',
      action: 'Decide beforehand whether you want a local branch or an account that only works through an app.',
    },
    {
      title: 'Sort out insurance and your residence permit',
      text: 'Check that your health insurance is enough for your status. Then apply for a residence permit, if your nationality means you need one.',
      action: 'Keep every confirmation, because you will be asked for each one again later.',
    },
    {
      title: 'From a temporary to a permanent home',
      text: 'If you start somewhere temporary, allow time to look for a permanent home. A short introduction about yourself and the right documents help with every enquiry.',
      action: 'Write a few sentences about yourself and put all your documents in one file.',
    },
    {
      title: 'Settle into everyday life',
      text: 'A chat with the neighbours, a meal together or a regular activity can help you settle in. Small chances to speak German count too.',
      action: 'Think of one everyday situation in which you would like to try out your German this week.',
    },
  ],
  sections: [
    {
      title: 'Find the right place to live',
      intro: 'Think about your budget, how you will get to your course and how much of your everyday life you would like to share with others.',
      bullets: [
        'A student hall of residence can be an affordable option. Check the requirements and apply early, because waiting lists can be long.',
        'In a shared flat, known as a WG, you have your own room and share spaces such as the kitchen with others.',
        'A flat of your own gives you independence. For that you need a deposit, proof of income and patience while you look.',
        'If you are on an intensive course at CASA, we can find you a room with a private host or in a shared flat, depending on availability.',
      ],
      link: { label: 'See CASA’s accommodation', href: '/accommodation' },
    },
    {
      title: 'What the first month costs',
      intro: 'In the first few weeks, one-off costs often come on top of your regular expenses. A little room in your budget makes the start easier.',
      bullets: [
        'Compare rents in the parts of town you are considering, and include your travel costs.',
        'Check the deposit and payment arrangements in your tenancy agreement, and note the conditions for getting your deposit back.',
        'Remember first purchases such as bedding, basic kitchen equipment and travel tickets.',
        'A reserve helps with unexpected costs, or if you stay longer in temporary accommodation.',
      ],
    },
    {
      title: 'Keep important documents to hand',
      intro: 'A folder with your important documents and digital copies makes appointments and applications easier.',
      bullets: [
        'You need health insurance to enrol and to get your residence permit.',
        'Travel insurance is usually not accepted for a longer stay, even if it covers the right dates.',
        'It is common in Germany to have personal liability insurance (Haftpflichtversicherung), although it is not compulsory, and many landlords ask about it.',
        'Keep one folder for your registration certificate, insurance confirmation, tenancy agreement and certificate of enrolment.',
      ],
    },
    {
      title: 'Working while you study',
      intro: 'A part-time job can fit alongside your studies. Check beforehand which rules apply to your nationality and residence status.',
      bullets: [
        'How much you are allowed to work depends on your residence permit and your nationality. The conditions are written on the permit itself.',
        'Your university’s International Office can help you find your way. The immigration office (Ausländerbehörde) can confirm the conditions of your residence permit.',
        'With German, you have more options when dealing with colleagues and customers.',
        'When you choose your working hours, leave time for classes, independent study and rest.',
      ],
    },
  ],
  faq: [
    {
      question: 'What do I need for the Anmeldung?',
      answer:
        'You need your passport, the confirmation from your landlord (Wohnungsgeberbestätigung) and the completed form. Book the appointment as soon as you have the confirmation, because appointments go quickly.',
    },
    {
      question: 'Do I need health insurance straight away?',
      answer:
        'For a longer stay, yes. You need valid insurance cover to enrol and for your residence permit, and ordinary travel insurance is usually not enough.',
    },
    {
      question: 'Is finding somewhere to live really that hard?',
      answer:
        'In the popular student cities, unfortunately, yes. It helps to ask early, reply on the same day and have all your documents in one file, so that a viewing can turn into a tenancy agreement.',
    },
    {
      question: 'Can I work while I study?',
      answer:
        'Usually yes, but only within certain limits that depend on your residence permit and your nationality. Read the conditions on your own residence permit and have the immigration office confirm them. Don’t rely on what other students tell you.',
    },
    {
      question: 'What should I bring from home?',
      answer:
        'Bring your original certificates and certified copies, as well as several passport photos and paperwork for any medication you take. You should also have a digital copy of everything.',
    },
  ],
  officialLinks: [
    {
      label: 'Studierendenwerke',
      description: 'The student services organisations explain halls of residence, insurance and everyday costs.',
      url: 'https://www.studierendenwerke.de/en/topics/student-finance/costs-of-study/insurances-for-students/studienvoraussetzung-kranken-und-pflegeversicherung',
    },
    {
      label: 'Make it in Germany',
      description: 'The federal government’s portal on residence and work.',
      url: 'https://www.make-it-in-germany.com/en/',
    },
    {
      label: 'Federal Foreign Office: blocked account',
      description: 'What counts as proof of funds for a student visa.',
      url: 'https://www.auswaertiges-amt.de/en/sperrkonto-388600',
    },
  ],
};

export const whyGermanyGuideEn: ResourceGuideData = {
  slug: 'why-germany',
  path: '/resources/why-germany',
  metaTitle: 'Why study and learn German in Germany?',
  metaDescription:
    'What studying in Germany offers you, what it costs, which qualifications are recognised, how study and work fit together and where German helps you.',
  hero: {
    title: 'Why Germany',
    summary: 'What Germany can offer you in your studies and in everyday life, and where German helps.',
    lead: 'What could studying and living in Germany mean for you? This guide helps you find out.',
    photo: {
      src: '/media/casa/group-course-walking-bremen.jpg',
      alt: 'CASA learners walking through Bremen together',
      // The group spans the whole width: shown as its full 3:2 frame, no head cut.
      aspectRatio: '3 / 2',
    },
    ctas: [{ label: 'See our courses', href: '/courses' }],
  },
  quickFacts: [
    'Many public degree programmes have no tuition fees. Even so, check for possible exceptions and budget for semester contributions and living costs.',
    'Compare academic study and vocational training, and find out where the qualification you are aiming for is recognised.',
    'You can combine study and work, as long as you keep to the conditions in your residence permit.',
    'With German, you have more options in everyday life, in conversations with your neighbours just as much as at work.',
  ],
  stepsTitle: 'How to decide',
  steps: [
    {
      title: 'What do you want to achieve?',
      text: 'Perhaps you want to study, get on in your career, improve your German or make a new home. What you want is a good starting point for exploring the options.',
    },
    {
      title: 'Which city can you afford?',
      text: 'Compare rents, travel costs and everyday spending, and also the education on offer and the opportunities in each city.',
    },
    {
      title: 'Which path suits you?',
      text: 'An academic degree, a practical degree programme and vocational training each give you different ways to develop your skills.',
    },
    {
      title: 'How much German do you need?',
      text: 'Check the requirements for your programme or your profession. Think about your everyday life too. Which conversations would you like to have, and what would you like to be able to do on your own?',
    },
    {
      title: 'When do you want to start, and what does that mean today?',
      text: 'Work back from the date you want to start, and allow time for learning German, applications, exams and, if you need one, your visa.',
    },
  ],
  sections: [
    {
      title: 'What it really costs',
      intro: 'Look at your whole budget, including fees, rent, insurance, travel and everyday spending.',
      bullets: [
        'Check tuition fees and the semester contribution separately. Public programmes can also charge fees in certain circumstances.',
        'Rent shapes your monthly budget. How much you pay depends on the city you live in.',
        'If you need a student visa, find out about the current funding requirements and the accepted proof before you apply.',
      ],
    },
    {
      title: 'Get to know the different qualifications',
      intro: 'Which qualification suits you depends on your goals and on where you would like to work later.',
      bullets: [
        'Compare the course content and the amount of practical work at universities and at universities of applied sciences.',
        'Company-based vocational training combines learning with paid work and leads to a vocational qualification.',
        'Before you book a language exam, check which certificate and which result your university or employer accepts.',
      ],
      link: { label: 'See our exams', href: '/exams' },
    },
    {
      title: 'Where German helps you',
      intro: 'With German, you can join in, ask questions and get to know people. Even small conversations can make a big difference.',
      bullets: [
        'At home, German helps you talk to your flatmates, understand letters and get to know the neighbourhood.',
        'At appointments and with official letters, German can help you understand the details and ask the right questions.',
        'At work, German makes it easier to deal with colleagues and customers, and you have a wider choice of jobs.',
        'Shared interests, local activities and everyday conversations can lead to new contacts and friendships.',
      ],
      link: { label: 'Find a course that fits your schedule', href: '/courses' },
    },
  ],
  faq: [
    {
      question: 'Is Germany a good choice if I do not speak German yet?',
      answer:
        'Yes, and it gets even better the more German you speak. It makes sense to start learning before you arrive.',
    },
    {
      question: 'Is studying here expensive?',
      answer:
        'Costs vary by programme and city. Check tuition fees, the semester contribution and living costs together, including rent and insurance.',
    },
    {
      question: 'Do I need to prove how I will pay for my studies?',
      answer:
        'For the visa, usually yes. Your embassy publishes the current amount and the kinds of proof it accepts.',
    },
    {
      question: 'Why should I start learning German before I arrive?',
      answer:
        'Even a little German can help you with conversations and appointments. Start as soon as you can, and keep learning once you arrive.',
    },
    {
      question: 'Why Bremen?',
      answer:
        'Bremen offers city life, places to explore along the Weser and the chance to meet people from all over the world. At CASA, you learn German, take part in activities with others and get personal support as you settle in.',
    },
  ],
  officialLinks: [
    {
      label: 'Study in Germany',
      description: 'The official portal for degree programmes and planning.',
      url: 'https://www.study-in-germany.com/en/',
    },
    {
      label: 'Make it in Germany',
      description: 'The federal government’s portal on working and living in Germany.',
      url: 'https://www.make-it-in-germany.com/en/',
    },
    {
      label: 'Federal Foreign Office: blocked account',
      description: 'What counts as proof of funds for a student visa.',
      url: 'https://www.auswaertiges-amt.de/en/sperrkonto-388600',
    },
  ],
};

export const resourceGuidesEn: Record<ResourceGuideSlug, ResourceGuideData> = {
  'study-in-germany': studyInGermanyGuideEn,
  'living-in-germany': livingInGermanyGuideEn,
  'why-germany': whyGermanyGuideEn,
};
