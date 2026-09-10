export type ResourceGuideCta = {
  label: string;
  href: string;
};

export type ResourceGuideStep = {
  title: string;
  text: string;
  action?: string;
};

export type ResourceGuideSection = {
  title: string;
  intro: string;
  bullets: string[];
  /** Where to continue: another guide, or the placement test. */
  link?: ResourceGuideCta;
};

export type ResourceGuideFaqItem = {
  question: string;
  answer: string;
};

export type ResourceGuideOfficialLink = {
  label: string;
  description: string;
  url: string;
};

export type ResourceGuideData = {
  slug: 'study-in-germany' | 'living-in-germany' | 'why-germany';
  path: string;
  metaTitle: string;
  metaDescription: string;
  hero: {
    title: string;
    lead: string;
    /** The first entry is the hero's one action. */
    ctas: ResourceGuideCta[];
    heroImage: { src: string; alt: string };
  };
  quickFacts: string[];
  stepsTitle: string;
  steps: ResourceGuideStep[];
  sections: ResourceGuideSection[];
  faq: ResourceGuideFaqItem[];
  officialLinks: ResourceGuideOfficialLink[];
};

export const studyInGermanyGuide: ResourceGuideData = {
  slug: 'study-in-germany',
  path: '/resources/study-in-germany',
  metaTitle: 'Study & Life in Germany: A clear roadmap for international students | CASA Bremen',
  metaDescription:
    'A practical guide to studying and settling in Germany-applications, language, housing, daily life, finances, visa basics, and how CASA helps you prepare.',
  hero: {
    title: 'Study & Life in Germany',
    lead: "A simple roadmap from 'I want to study' to 'I can settle in' - with the application, language, housing, and daily-life steps international students usually miss.",
    ctas: [{ label: 'Explore CASA courses', href: '/courses' }],
    heroImage: {
      src: '/media/casa/study-materials-map.jpg',
      alt: 'CASA study materials placed on a map for course planning',
    },
  },
  quickFacts: [
    'Public universities usually charge a semester contribution, not full tuition.',
    'Many programmes require language proof, German or English, depending on the degree.',
    'Visa applicants usually need proof of funds and health insurance.',
    'Housing and city registration shape your first month as much as university paperwork.',
  ],
  stepsTitle: 'Your step-by-step roadmap',
  steps: [
    {
      title: 'Choose your path',
      text: 'University, University of Applied Sciences, or vocational training (Ausbildung). Your choice shapes language needs and timelines.',
      action: 'Write down your target degree + city + start semester (summer/winter).',
    },
    {
      title: 'Check admission requirements',
      text: 'Each program sets its own requirements: school certificates, grades, language certificates, and sometimes tests.',
      action: 'Make a list of required documents and deadlines for 3-5 programs.',
    },
    {
      title: 'Decide: German-taught or English-taught',
      text: 'German-taught programs often require higher German levels. English-taught programs may still recommend German for daily life and part-time work.',
      action: 'Pick your target language outcome (e.g., B1 for daily life, B2/C1 for study).',
    },
    {
      title: 'Build your language plan',
      text: 'Language takes time. Plan backwards from your intended start date.',
      action: 'Take a placement test and choose an intensive/evening pathway.',
    },
    {
      title: 'Prepare your application documents',
      text: 'Expect certified copies/translations depending on the university, plus a clear CV and motivation letter when required.',
      action: "Create a 'single folder' with all documents + translated versions.",
    },
    {
      title: 'Apply (uni-assist or direct)',
      text: 'Some universities use uni-assist; others handle applications directly.',
      action: 'Submit early: processing can take weeks.',
    },
    {
      title: 'Plan finances + visa basics',
      text: 'Many applicants must show financial proof and valid health insurance for visa/residence processes.',
      action: "Check your German embassy's exact checklist for your country.",
    },
    {
      title: 'Arrive, enrol, and settle in',
      text: 'After admission, you will handle enrolment, housing, registration, and residence permit steps.',
      action: "Follow the 'Living in Germany' guide for the first thirty days.",
    },
  ],
  sections: [
    {
      title: 'Choosing the right study path',
      intro: 'Germany offers multiple routes. Choose the one that matches your goals and learning style.',
      bullets: [
        'University (research-focused, academic degrees)',
        'University of Applied Sciences (practice-oriented, strong industry links)',
        'Ausbildung (paid vocational training, strong job pathway)',
      ],
    },
    {
      title: 'Applications & deadlines (what to expect)',
      intro: 'Deadlines vary by program and university, and missing one usually means waiting a semester.',
      bullets: [
        'Check whether you apply directly or through uni-assist.',
        "Expect processing time and don't wait until the last week.",
        'Keep digital and printed copies of everything.',
      ],
    },
    {
      title: 'Language requirements (and the fastest way to improve)',
      intro: 'Your language level is often the key to acceptance and success.',
      bullets: [
        'For German-taught degrees, plan for higher German proficiency.',
        'Even for English programs, German helps with housing, work, and paperwork.',
        'Consistency beats intensity, unless you are on a deadline. Then go intensive.',
        'CASA places you by level and runs intensive and evening formats from A1 to C1, with telc exam preparation when a certificate is required.',
      ],
      link: { label: 'Start with the placement test', href: '/placement-test' },
    },
    {
      title: 'Housing, budget, and first-month basics',
      intro: 'Your study plan only works if the arrival plan is realistic. Rent, insurance, registration, and deposits often decide how calm month one feels.',
      bullets: [
        'Semester contribution is common even when tuition is low/none.',
        'Living costs: rent is the biggest variable.',
        'Visa/residence processes may require formal financial proof.',
        'City registration, health insurance, and banking often depend on having the right documents ready.',
      ],
      link: { label: 'Read the Living in Germany guide', href: '/resources/living-in-germany' },
    },
  ],
  faq: [
    {
      question: 'Do I need German before coming to Germany?',
      answer:
        'Not always, but German makes daily life, housing, and work dramatically easier. If your degree is in German, plan early.',
    },
    {
      question: "Is studying in Germany 'free'?",
      answer:
        "Many public universities charge a semester contribution rather than full tuition. Always confirm your university's rules.",
    },
    {
      question: 'What is uni-assist?',
      answer:
        "A service used by many universities to process international applications. Some universities use it, others don't.",
    },
    {
      question: 'How early should I apply?',
      answer: 'As early as possible: processing and document fixes can take weeks.',
    },
    {
      question: 'Do I need proof of finances for a visa?',
      answer:
        'Often yes. Requirements vary by nationality and embassy, so always check the official checklist.',
    },
  ],
  officialLinks: [
    {
      label: 'Study in Germany (official portal)',
      description: 'Planning, requirements, finances, arrival',
      url: 'https://www.study-in-germany.com/en/',
    },
    {
      label: 'uni-assist',
      description: 'How to apply, if your university uses uni-assist',
      url: 'https://www.uni-assist.de/en/how-to-apply/apply-online/',
    },
    {
      label: 'Federal Foreign Office and your local embassy',
      description: 'Visa checklists and proof of funds',
      url: 'https://www.auswaertiges-amt.de/en/sperrkonto-388600',
    },
    {
      label: 'Studierendenwerke',
      description: 'Student services and practical guides',
      url: 'https://www.studierendenwerke.de/en/topics/student-finance/costs-of-study/insurances-for-students/studienvoraussetzung-kranken-und-pflegeversicherung',
    },
  ],
};

export const livingInGermanyGuide: ResourceGuideData = {
  slug: 'living-in-germany',
  path: '/resources/living-in-germany',
  metaTitle: 'Living in Germany: Your first 30 days made simple | CASA Bremen',
  metaDescription:
    'A practical arrival guide for international students: budget, health insurance, housing, registration, work rules, and everyday life tips.',
  hero: {
    title: 'Living in Germany',
    lead: 'A practical guide for your first weeks, so you spend less time confused and more time building your new life.',
    ctas: [
      { label: 'Explore Accommodation Options', href: '/accommodation' },
      { label: 'Explore CASA Courses', href: '/courses' },
    ],
    heroImage: {
      src: '/media/casa/bremen-schnoor-houses.jpg',
      alt: 'historic houses in the Schnoor quarter of Bremen',
    },
  },
  quickFacts: [
    'Budget realistically: rent is the biggest variable.',
    'Health insurance is mandatory for enrolment and often for residence procedures.',
    'City registration (Anmeldung) unlocks many essentials.',
    'Student work rules depend on your residence status-check your permit.',
    "Keep a 'paperwork folder': Germany still loves documents.",
  ],
  stepsTitle: 'Your first 30 days: a simple timeline',
  steps: [
    {
      title: 'Before you arrive',
      text: 'Print key documents, book temporary housing, and arrange initial insurance coverage.',
      action: 'Create one folder (digital + paper) for all documents.',
    },
    {
      title: 'Day 1-3: Get connected',
      text: 'SIM, transport, groceries, basic routines. Keep it simple.',
      action: 'Save emergency numbers and your local embassy contact.',
    },
    {
      title: 'Week 1: Register your address (Anmeldung)',
      text: 'If required in your situation, registration is often needed for bank accounts and other admin steps.',
      action: 'Book appointments early-slots can be limited.',
    },
    {
      title: 'Week 1-2: Banking and payments',
      text: 'A German bank account helps with rent, fees, and everyday life.',
      action: 'Set up basic monthly budgeting categories.',
    },
    {
      title: 'Week 2-4: Health insurance & residence admin',
      text: 'Make sure your health coverage meets requirements for your status.',
      action: 'Keep proof documents handy.',
    },
    {
      title: 'Housing: move from temporary to stable',
      text: 'Rooms can be competitive. Apply early, respond fast, and be organized.',
      action: "Prepare a short 'renter profile' (intro, documents, references).",
    },
    {
      title: 'Build your routine',
      text: 'Language improves when it becomes daily. A course + real-life practice is the fastest combo.',
      action: 'Join a course and set a weekly speaking goal.',
    },
  ],
  sections: [
    {
      title: 'Housing options (what works for students)',
      intro: 'Find the housing model that fits your budget, independence level, and support needs.',
      bullets: [
        'Student dorms',
        'WG/shared flat',
        'Private apartment',
        'Host family',
      ],
    },
    {
      title: 'Budgeting that actually works',
      intro: 'Build a budget based on real categories so your plan works in month one.',
      bullets: [
        'Rent',
        'Food',
        'Transport',
        'Insurance',
        'Phone/internet',
        'Learning materials',
      ],
    },
    {
      title: "Health insurance (don't wing this)",
      intro: 'Insurance details can affect enrolment and residence processes, so confirm early.',
      bullets: [
        'Required for enrolment',
        'Choose coverage appropriate for long stays',
        'Travel insurance may not be enough for long-stay visas',
      ],
    },
    {
      title: 'Working while studying (the safe approach)',
      intro: 'Work rules are practical but specific, so follow your permit conditions exactly.',
      bullets: [
        'Rules vary',
        'Check your residence title',
        'Keep work hours within permitted limits',
        'Prioritize study rhythm',
      ],
    },
    {
      title: 'Everyday life: quick wins',
      intro: 'Small practical habits make your transition smoother and reduce avoidable stress.',
      bullets: [
        'Public transport passes',
        'Recycling basics',
        'Cash/card expectations',
        'Appointments',
        'Punctuality',
      ],
    },
    {
      title: 'How CASA supports your settling-in',
      intro: 'Language + structure + support gives you momentum in your new environment.',
      bullets: [
        'Placement + course plan',
        'Exam pathway',
        'Staff support',
        'Community opportunities',
      ],
    },
  ],
  faq: [
    {
      question: 'How much money do I need per month?',
      answer: 'It depends on city and rent. Plan conservatively and adjust once settled.',
    },
    {
      question: 'Do I need health insurance right away?',
      answer:
        'For long stays, yes-make sure your coverage fits your visa/residence requirements.',
    },
    {
      question: 'Is it hard to find housing?',
      answer: 'In many cities, yes. Apply early, stay organized, and respond quickly.',
    },
    {
      question: 'Can I work while studying?',
      answer:
        'Often yes, within limits: your residence title and nationality matter. Always verify your exact allowance.',
    },
    {
      question: 'What should I bring from home?',
      answer:
        'Original documents, certified copies if needed, and a few passport photos-plus digital backups.',
    },
    {
      question: 'How can CASA help?',
      answer:
        'We help you build German fast and navigate course/exam steps with a clear plan.',
    },
  ],
  officialLinks: [
    {
      label: 'Studierendenwerke',
      description: 'Student life, insurance, practical guides',
      url: 'https://www.studierendenwerke.de/en/topics/student-finance/costs-of-study/insurances-for-students/studienvoraussetzung-kranken-und-pflegeversicherung',
    },
    {
      label: 'Make it in Germany',
      description: 'Rules and updates around working while studying',
      url: 'https://www.make-it-in-germany.com/en/visa-residence/skilled-immigration-act',
    },
    {
      label: 'German embassy/consulate',
      description: 'Visa and insurance requirements',
      url: 'https://www.auswaertiges-amt.de/en/sperrkonto-388600',
    },
  ],
};

export const whyGermanyGuide: ResourceGuideData = {
  slug: 'why-germany',
  path: '/resources/why-germany',
  metaTitle: 'Why Germany: A smart choice for study and life | CASA Bremen',
  metaDescription:
    'Why students choose Germany: value, quality, career options, and a great base for Europe-plus why learning German early matters.',
  hero: {
    title: 'Why Germany',
    lead: 'Germany is a practical choice: strong education, a structured society, and real opportunities, especially when you speak the language.',
    ctas: [
      { label: 'Explore CASA Courses', href: '/courses' },
      { label: 'Talk to CASA', href: '/contact' },
    ],
    heroImage: {
      src: '/media/casa/bremen-schnoor-houses.jpg',
      alt: 'historic Bremen street architecture in the Schnoor quarter',
    },
  },
  quickFacts: [
    'Planable costs (semester contribution + living expenses).',
    'International environment: many cities are used to students from everywhere.',
    'Central location for travel and opportunities across Europe.',
    'German language unlocks daily life, work, and integration.',
    'Clear systems: once you learn them, life gets easier.',
  ],
  stepsTitle: "If you're deciding: a simple decision framework",
  steps: [
    {
      title: 'Define your goal',
      text: 'Degree, career, language level, timeframe.',
    },
    {
      title: 'Pick your city strategy',
      text: 'Budget vs opportunities vs lifestyle.',
    },
    {
      title: 'Choose your study path',
      text: 'University/UAS/Ausbildung.',
    },
    {
      title: 'Set your German target',
      text: 'Daily life vs academic/professional.',
    },
    {
      title: 'Build a timeline',
      text: 'Application + visa + housing + course plan.',
    },
    {
      title: 'Start early',
      text: 'Language progress compounds.',
    },
  ],
  sections: [
    {
      title: 'Value you can plan for',
      intro: 'Germany is known for affordable higher education compared to many countries.',
      bullets: [
        'Semester contribution is common',
        'Budget depends on rent',
        'Plan proof-of-funds if needed',
      ],
    },
    {
      title: 'Quality and credibility',
      intro: 'Germany combines academic quality with practical training pathways recognized worldwide.',
      bullets: [
        'Strong institutions',
        'Structured programs',
        'Practical pathways',
        'Recognized certificates',
      ],
    },
    {
      title: 'Career pathways',
      intro: 'Study and work pathways can align well when you plan language and timing together.',
      bullets: [
        'Internships',
        'Working-student jobs (within permitted rules)',
        'Professional German advantages',
      ],
    },
    {
      title: 'Quality of life',
      intro: 'Daily life balance is one reason many students choose Germany long term.',
      bullets: [
        'Public transport',
        'Safety',
        'Culture',
        'Student discounts',
        'Nature/cities balance',
      ],
    },
    {
      title: 'Why German matters (even if your degree is in English)',
      intro: 'German helps far beyond class: it unlocks confidence, independence, and options.',
      bullets: [
        'Housing',
        'Paperwork',
        'Work',
        'Friendships',
        'Confidence',
      ],
    },
  ],
  faq: [
    {
      question: "Is Germany a good choice if I don't speak German yet?",
      answer: 'Yes, but start early. German is a multiplier for daily life and work.',
    },
    {
      question: 'Is studying expensive?',
      answer:
        'Often more affordable than many countries, but you still need to budget for living costs.',
    },
    {
      question: 'Do I need proof of funds?',
      answer: 'Many visa applicants do-check official requirements for your nationality.',
    },
    {
      question: 'Why start German before I arrive?',
      answer: "You'll settle faster, avoid stress, and access more opportunities.",
    },
    {
      question: 'Can CASA help with exam certificates?',
      answer: 'Yes-choose the right level path and exam route based on your goal.',
    },
    {
      question: 'Why Bremen?',
      answer:
        'A welcoming city with a strong student vibe-great for focused language progress.',
    },
  ],
  officialLinks: [
    {
      label: 'Study in Germany (official portal)',
      description: 'Why Germany + planning resources',
      url: 'https://www.study-in-germany.com/en/',
    },
    {
      label: 'Federal Foreign Office / embassy',
      description: 'Visa, proof of funds, insurance',
      url: 'https://www.auswaertiges-amt.de/en/sperrkonto-388600',
    },
    {
      label: 'uni-assist',
      description: 'Application steps (if needed)',
      url: 'https://www.uni-assist.de/en/how-to-apply/apply-online/',
    },
  ],
};

export const resourcesGuidesEn: Record<ResourceGuideData['slug'], ResourceGuideData> = {
  'study-in-germany': studyInGermanyGuide,
  'living-in-germany': livingInGermanyGuide,
  'why-germany': whyGermanyGuide,
};
