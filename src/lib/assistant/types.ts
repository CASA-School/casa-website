export type AssistantUiLocale = 'en' | 'de' | 'es' | 'fr' | 'zh';
export type AssistantRuntimeLocale = 'en' | 'de';

export type AssistantIntent =
  | 'course_match'
  | 'placement'
  | 'exam_pathway'
  | 'accommodation'
  | 'visa'
  | 'registration'
  | 'contact'
  | 'career'
  | 'resource'
  | 'school'
  | 'smalltalk'
  | 'unknown';

export type AssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AssistantUserContext = {
  isAuthenticated: boolean;
};

export type AssistantCourseFilters = {
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  schedule?: 'intensive' | 'evening' | 'flexible';
  goal?: 'general' | 'exam' | 'medical' | 'career';
  startDate?: string;
};

export type AssistantCard = {
  type: 'course';
  id: string;
  title: string;
  description: string;
  href: string;
  badges: string[];
  meta: Array<{
    label: string;
    value: string;
  }>;
};

export type AssistantQuickLink = {
  label: string;
  href: string;
};

export type AssistantPlanStep = {
  id: string;
  label: string;
};

export type AssistantToolCall = {
  name: string;
  durationMs: number;
  ok: boolean;
};

export type AssistantResponsePayload = {
  locale: AssistantRuntimeLocale;
  intent?: AssistantIntent;
  message: string;
  cta: {
    label: string;
    href: string;
  };
  cards?: AssistantCard[];
  quickLinks?: AssistantQuickLink[];
  planSteps?: AssistantPlanStep[];
  basedOn?: string[];
  toolCalls: AssistantToolCall[];
};
