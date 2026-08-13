'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Activity,
  ArrowRight,
  Bot,
  ChevronDown,
  Compass,
  Loader2,
  SendHorizonal,
  Sparkles,
  User,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type UiLocale = 'auto' | 'en' | 'de' | 'es' | 'fr' | 'zh';

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  cta?: {
    label: string;
    href: string;
  };
  quickLinks?: Array<{ label: string; href: string }>;
  planSteps?: Array<{ id: string; label: string }>;
  cards?: Array<{
    type: 'course';
    id: string;
    title: string;
    description: string;
    href: string;
    badges: string[];
    meta: Array<{ label: string; value: string }>;
  }>;
};

type AssistantApiData = {
  locale: 'en' | 'de';
  intent?: string;
  message: string;
  cta: {
    label: string;
    href: string;
  };
  quickLinks?: AssistantMessage['quickLinks'];
  planSteps?: AssistantMessage['planSteps'];
  cards?: AssistantMessage['cards'];
};

type AssistantApiResponse = {
  status: 'ok' | 'error';
  data?: AssistantApiData;
  message?: string;
};

type AssistantWidgetProps = {
  onClose: () => void;
};

type QuickAction = {
  label: string;
  prompt: string;
};

const localeOptions: Array<{ value: UiLocale; label: string; enabled: boolean }> = [
  { value: 'auto', label: 'Auto', enabled: true },
  { value: 'en', label: 'EN', enabled: true },
  { value: 'de', label: 'DE', enabled: true },
  { value: 'es', label: 'ES', enabled: false },
  { value: 'fr', label: 'FR', enabled: false },
  { value: 'zh', label: 'ZH', enabled: false },
];

const dictionary = {
  en: {
    title: 'CLARA',
    subtitle: 'Search and next steps',
    placeholder: 'Ask CLARA anything about CASA...',
    send: 'Send',
    quickActionsTitle: 'Start Fast',
    quickActions: [
      { label: 'Best course for me', prompt: 'Help me find the best CASA course for my level and weekly rhythm.' },
      { label: 'Exam route', prompt: 'Which exam route should I choose between telc B2 and C1 Hochschule?' },
      { label: 'Housing route', prompt: 'I need accommodation guidance between shared flat and host family.' },
      { label: 'Contact support', prompt: 'I need the right CASA contact path for my question.' },
    ],
    greeting:
      'Hi, I am CLARA. I can guide visitors through CASA courses, exams, accommodation, registration, and support routes. Tell me your goal and I will map your fastest next step.',
    localeLabel: 'Language',
    soon: 'Soon',
    thinking: 'CLARA is mapping your best route...',
    liveSuggestionsTitle: 'Live prompts',
    processingStages: [
      'Reading your goal...',
      'Matching CASA routes...',
      'Building your next best step...',
    ],
    assistantLabel: 'CLARA',
    userLabel: 'You',
    closeLabel: 'Close assistant',
    planLabel: 'Next steps',
    linksLabel: 'Useful shortcuts',
    resultsLabel: 'Showing',
    detailsLabel: 'Details',
    optionSingular: 'option',
    optionPlural: 'options',
    courseTypeLabel: 'course',
  },
  de: {
    title: 'CLARA',
    subtitle: 'Suche und nächste Schritte',
    placeholder: 'Fragen Sie CLARA alles zu CASA...',
    send: 'Senden',
    quickActionsTitle: 'Schnellstart',
    quickActions: [
      { label: 'Passender Kurs', prompt: 'Hilf mir, den besten CASA-Kurs für mein Niveau und meinen Wochenrhythmus zu finden.' },
      { label: 'Prüfungsweg', prompt: 'Welcher Weg passt besser: telc B2 oder C1 Hochschule?' },
      { label: 'Unterkunft', prompt: 'Ich brauche Orientierung zwischen WG und Gastfamilie.' },
      { label: 'Kontaktweg', prompt: 'Ich brauche den richtigen CASA-Kontaktweg für mein Anliegen.' },
    ],
    greeting:
      'Hallo, ich bin CLARA. Ich begleite Sie durch Kurse, Prüfungen, Unterkunft, Anmeldung und Supportwege bei CASA. Nennen Sie Ihr Ziel, dann liefere ich den schnellsten nächsten Schritt.',
    localeLabel: 'Sprache',
    soon: 'Bald',
    thinking: 'CLARA plant Ihren besten Weg...',
    liveSuggestionsTitle: 'Live-Prompts',
    processingStages: [
      'Ich lese Ihr Ziel...',
      'Ich gleiche CASA-Wege ab...',
      'Ich baue den besten nächsten Schritt...',
    ],
    assistantLabel: 'CLARA',
    userLabel: 'Sie',
    closeLabel: 'Assistent schließen',
    planLabel: 'Nächste Schritte',
    linksLabel: 'Nützliche Kurzwege',
    resultsLabel: 'Angezeigt',
    detailsLabel: 'Details',
    optionSingular: 'Option',
    optionPlural: 'Optionen',
    courseTypeLabel: 'Kurs',
  },
} as const;

function makeMessage(role: 'user' | 'assistant', content: string): AssistantMessage {
  return {
    id: `${role}-${crypto.randomUUID()}`,
    role,
    content,
  };
}

function useDisplayLocale(selected: UiLocale, inferred: 'en' | 'de' | null) {
  if (selected === 'en' || selected === 'de') {
    return selected;
  }

  return inferred ?? 'de';
}

function normalizeInput(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function dedupeActions(actions: QuickAction[]) {
  const map = new Map(actions.map((action) => [action.label, action]));
  return Array.from(map.values());
}

function buildLiveSuggestions(locale: 'en' | 'de', input: string): QuickAction[] {
  const normalized = normalizeInput(input);
  if (!normalized) {
    return dictionary[locale].quickActions.map((action) => ({ ...action }));
  }

  if (locale === 'de') {
    const actions: QuickAction[] = [];
    if (/(kurs|niveau|b1|b2|c1|a1|a2|abend|intensiv)/.test(normalized)) {
      actions.push(
        { label: 'Passender Kurs', prompt: 'Ich suche den besten CASA-Kurs für mein Niveau und Zeitplan.' },
        { label: 'Einstufung starten', prompt: 'Hilf mir bei der Einstufung und gib mir danach den besten Kursweg.' }
      );
    }
    if (/(prüfung|prufung|telc|zertifikat)/.test(normalized)) {
      actions.push(
        { label: 'Prüfungsweg', prompt: 'Führe mich zum besten Prüfungsweg inklusive nächstem Termin.' },
        { label: 'Prüfung anmelden', prompt: 'Ich möchte eine Prüfung anmelden. Zeig mir den schnellsten Ablauf.' }
      );
    }
    if (/(unterkunft|wg|gastfamilie|wohnen)/.test(normalized)) {
      actions.push(
        { label: 'Unterkunft vergleichen', prompt: 'Vergleiche WG und Gastfamilie für mich und gib eine klare Empfehlung.' },
        { label: 'Unterkunftsanfrage', prompt: 'Ich brauche den schnellsten Weg zur Unterkunftsanfrage.' }
      );
    }
    if (/(portal|dashboard|konto|login)/.test(normalized)) {
      actions.push(
        { label: 'Kontaktweg', prompt: 'Ich brauche Hilfe bei einem Login- oder Kontothema auf der öffentlichen CASA-Seite.' },
        { label: 'Support kontaktieren', prompt: 'Zeig mir den schnellsten CASA-Kontaktweg für Supportfragen.' }
      );
    }
    if (/(visum|visa|botschaft|aufenthalt)/.test(normalized)) {
      actions.push({
        label: 'Visa Orientierung',
        prompt: 'Gib mir die wichtigsten CASA-Hinweise zum Sprachvisum und den sicheren nächsten Schritt.',
      });
    }

    return dedupeActions([...actions, ...dictionary.de.quickActions]).slice(0, 4);
  }

  const actions: QuickAction[] = [];
  if (/(course|level|b1|b2|c1|a1|a2|evening|intensive)/.test(normalized)) {
    actions.push(
      { label: 'Best-fit course', prompt: 'Find my best-fit CASA course using my level and schedule.' },
      { label: 'Placement first', prompt: 'Guide me through placement first, then recommend the right course.' }
    );
  }
  if (/(exam|telc|certificate)/.test(normalized)) {
    actions.push(
      { label: 'Exam pathway', prompt: 'Map the best exam pathway for me and suggest the fastest next step.' },
      { label: 'Exam registration', prompt: 'I want to register for an exam. Show the fastest route.' }
    );
  }
  if (/(accommodation|housing|host family|shared|flat|room)/.test(normalized)) {
    actions.push(
      { label: 'Housing compare', prompt: 'Compare shared flat vs host family for my situation.' },
      { label: 'Housing request', prompt: 'Take me to the fastest accommodation request path.' }
    );
  }
  if (/(portal|dashboard|account|login)/.test(normalized)) {
    actions.push(
      { label: 'Support route', prompt: 'I need the right CASA contact path for a login or account question.' },
      { label: 'Contact admissions', prompt: 'Show me the fastest CASA contact route for support.' }
    );
  }
  if (/(visa|embassy|residence)/.test(normalized)) {
    actions.push({
      label: 'Visa guidance',
      prompt: 'Give me CASA language-visa guidance and the safest next step.',
    });
  }

  return dedupeActions([...actions, ...dictionary.en.quickActions]).slice(0, 4);
}

function ClaraAvatar({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        'clara-avatar relative h-12 w-12 shrink-0 rounded-xl border border-white/45 bg-white/65 shadow-[var(--shadow-soft)] backdrop-blur-sm',
        active ? 'clara-avatar-thinking' : null
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="32" cy="32" r="22" fill="url(#claraHead)" />
        <circle cx="24" cy="28" r="4" fill="#0f172a" className="clara-eye" />
        <circle cx="40" cy="28" r="4" fill="#0f172a" className="clara-eye clara-eye-delay" />
        <path d="M22 41C24.8 44 28 45.4 32 45.4C36 45.4 39.2 44 42 41" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M17 18C21.2 12.5 26.1 9.6 32 9.6C37.9 9.6 42.8 12.5 47 18" stroke="#009fe3" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="15" r="4.5" fill="var(--casa-sun)" className="clara-orbit" />
        <defs>
          <linearGradient id="claraHead" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ebf8ff" />
            <stop offset="1" stopColor="#dbeafe" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function AssistantWidget({ onClose }: AssistantWidgetProps) {
  const [selectedLocale, setSelectedLocale] = useState<UiLocale>('auto');
  const [inferredLocale, setInferredLocale] = useState<'en' | 'de' | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [mobilePanelHeight, setMobilePanelHeight] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const displayLocale = useDisplayLocale(selectedLocale, inferredLocale);
  const copy = dictionary[displayLocale];
  const liveSuggestions = useMemo(
    () => buildLiveSuggestions(displayLocale, text),
    [displayLocale, text]
  );
  const panelStyle = useMemo(
    () => (mobilePanelHeight ? { height: `${mobilePanelHeight}px`, maxHeight: `${mobilePanelHeight}px` } : undefined),
    [mobilePanelHeight]
  );

  const initialMessage = useMemo(
    () => makeMessage('assistant', copy.greeting),
    [copy.greeting]
  );

  const visibleMessages = messages.length > 0 ? messages : [initialMessage];

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [visibleMessages.length, loading]);

  useEffect(() => {
    if (!loading) {
      setLoadingStageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingStageIndex((current) => (current + 1) % copy.processingStages.length);
    }, 850);

    return () => window.clearInterval(interval);
  }, [loading, copy.processingStages.length]);

  useEffect(() => {
    const updatePanelHeight = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const isMobile = window.matchMedia('(max-width: 639px)').matches;
      if (!isMobile) {
        setMobilePanelHeight(null);
        return;
      }

      setMobilePanelHeight(Math.max(420, Math.floor(viewportHeight - 12)));
    };

    updatePanelHeight();
    window.addEventListener('resize', updatePanelHeight);
    window.visualViewport?.addEventListener('resize', updatePanelHeight);

    return () => {
      window.removeEventListener('resize', updatePanelHeight);
      window.visualViewport?.removeEventListener('resize', updatePanelHeight);
    };
  }, []);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [onClose]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || loading) {
      return;
    }

    const userMessage = makeMessage('user', trimmed);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setText('');
    setLoading(true);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          locale: selectedLocale === 'auto' ? null : selectedLocale,
        }),
      });

      const payload = (await response.json()) as AssistantApiResponse;
      if (!response.ok || payload.status !== 'ok' || !payload.data) {
        throw new Error(payload.message || 'Assistant request failed');
      }

      setInferredLocale(payload.data.locale);

      const assistantMessage: AssistantMessage = {
        ...makeMessage('assistant', payload.data.message),
        cta: payload.data.cta,
        cards: payload.data.cards,
        quickLinks: payload.data.quickLinks,
        planSteps: payload.data.planSteps,
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch {
      const fallbackText =
        displayLocale === 'de'
          ? 'Ich bin gerade nicht ganz sicher. Der beste sichere Schritt ist der direkte Kontakt mit dem CASA-Team.'
          : 'I am not fully sure right now. The safest next step is direct contact with the CASA team.';

      setMessages((current) => [
        ...current,
        {
          ...makeMessage('assistant', fallbackText),
          cta: {
            label: displayLocale === 'de' ? 'Kontakt öffnen' : 'Open contact',
            href: '/contact',
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      <div className="absolute inset-0 bg-[rgba(10,18,30,0.08)] backdrop-blur-[1px] sm:hidden" onClick={onClose} />
      <div
        id="casa-assistant-panel"
        style={panelStyle}
        className="pointer-events-auto absolute inset-x-2 bottom-2 flex min-h-[520px] max-h-[calc(100svh-0.75rem)] h-[calc(100svh-0.75rem)] flex-col overflow-hidden rounded-3xl border border-[color:var(--casa-sand)] bg-white shadow-[var(--shadow-modal)] sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[min(86vh,680px)] sm:max-h-[86vh] sm:min-h-[560px] sm:w-[min(96vw,460px)]"
      >
      <header className="relative overflow-hidden border-b border-[color:var(--casa-sand)] bg-[radial-gradient(160%_120%_at_0%_0%,rgba(0,159,227,0.15),transparent_54%),radial-gradient(140%_140%_at_100%_0%,rgba(254,213,0,0.17),transparent_58%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 pb-3 pt-3.5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ClaraAvatar active={loading} />
            <div>
              <p className="text-sm font-bold tracking-tight text-[var(--casa-ink)]">{copy.title}</p>
              <p className="text-xs font-medium text-[var(--casa-muted)]">{copy.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--casa-sand)] bg-white/80 text-[var(--casa-muted)] transition-colors hover:bg-[var(--casa-warm-soft)]"
            aria-label={copy.closeLabel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.11em] text-[var(--casa-muted)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--casa-accent-text)]" />
            {copy.localeLabel}
          </span>
          <div className="relative">
            <select
              value={selectedLocale}
              onChange={(event) => setSelectedLocale(event.target.value as UiLocale)}
              className="appearance-none rounded-full border border-[color:var(--casa-sand)] bg-white pl-3 pr-7 py-1 text-xs font-semibold text-[var(--casa-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
            >
              {localeOptions.map((option) => (
                <option key={option.value} value={option.value} disabled={!option.enabled}>
                  {option.enabled ? option.label : `${option.label} (${copy.soon})`}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--casa-muted)]" />
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="clara-scroll flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#fefefe_0%,#f8fafc_100%)] px-4 py-3"
      >
        {visibleMessages.map((message) => (
          <article
            key={message.id}
            className={cn(
              'max-w-[95%] rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed',
              message.role === 'assistant'
                ? 'mr-auto border-[color:var(--casa-sand)] bg-white text-[var(--casa-ink)]'
                : 'ml-auto border-transparent bg-[var(--casa-ink-deep)] text-white'
            )}
          >
            <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold opacity-85">
              {message.role === 'assistant' ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              <span>{message.role === 'assistant' ? copy.assistantLabel : copy.userLabel}</span>
            </div>
            <p className="whitespace-pre-line">{message.content}</p>

            {message.planSteps && message.planSteps.length > 0 ? (
              <div className="mt-3 rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/35 px-3 py-2.5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--casa-muted)]">
                  {copy.planLabel}
                </p>
                <ol className="space-y-1.5">
                  {message.planSteps.map((step, index) => (
                    <li key={step.id} className="flex items-start gap-2 text-xs text-[var(--casa-ink)]">
                      <span className="mt-[1px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--casa-accent-surface)] text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <span>{step.label}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {message.quickLinks && message.quickLinks.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--casa-muted)]">
                  {copy.linksLabel}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {message.quickLinks.map((link) => (
                    <Link
                      key={`${message.id}-${link.href}`}
                      href={link.href}
                      className="inline-flex items-center gap-1 rounded-full border border-[color:var(--casa-sand)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--casa-ink)] transition-colors hover:bg-[var(--casa-warm-soft)]"
                    >
                      <Compass className="h-3 w-3 text-[var(--casa-accent-text)]" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {message.cards && message.cards.length > 0 ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--casa-sand)] bg-white">
                <div className="flex items-center justify-between gap-2 border-b border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/30 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--casa-muted)]">
                    {copy.resultsLabel}
                  </p>
                  <p className="text-[11px] font-semibold text-[var(--casa-muted)]">
                    {message.cards.length} {message.cards.length === 1 ? copy.optionSingular : copy.optionPlural}
                  </p>
                </div>
                {message.cards.map((card) => (
                  <Link
                    key={card.id}
                    href={card.href}
                    className="group block border-b border-[color:var(--casa-sand)]/70 bg-white p-3 text-[var(--casa-ink)] transition-colors last:border-b-0 hover:bg-[var(--casa-warm-soft)]/45"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 rounded-full bg-[var(--casa-blue)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--casa-accent-text)]">
                        {card.type === 'course' ? copy.courseTypeLabel : card.type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold leading-snug">{card.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--casa-muted)]">{card.description}</p>
                      </div>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--casa-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--casa-accent-text)]" />
                    </div>
                    {card.badges.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {card.badges.map((badge) => (
                          <span
                            key={`${card.id}-${badge}`}
                            className="rounded-full border border-[color:var(--casa-sand)] bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--casa-muted)]"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {card.meta.length > 0 ? (
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                        {card.meta.slice(0, 4).map((item) => (
                          <div key={`${card.id}-${item.label}`} className="min-w-0">
                            <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--casa-muted)]">
                              {item.label}
                            </dt>
                            <dd className="truncate text-[11px] font-semibold text-[var(--casa-ink)]">{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--casa-accent-text)]">
                      {copy.detailsLabel}
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}

            {message.role === 'assistant' && message.cta ? (
              <div className="mt-3">
                <Button
                  asChild
                  size="sm"
                  className="h-8 rounded-full bg-[var(--casa-ink-deep)] px-3 text-xs font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)]"
                >
                  <Link href={message.cta.href}>{message.cta.label}</Link>
                </Button>
              </div>
            ) : null}
          </article>
        ))}

        {messages.length === 0 ? (
          <div className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--casa-muted)]">{copy.quickActionsTitle}</p>
            <div className="flex flex-wrap gap-2">
              {copy.quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => sendMessage(action.prompt)}
                  className="rounded-full border border-[color:var(--casa-sand)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--casa-ink)] transition-colors hover:bg-[var(--casa-warm-soft)]"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {text.trim().length > 0 && !loading ? (
          <div className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-3">
            <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--casa-muted)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--casa-accent-text)]" />
              {copy.liveSuggestionsTitle}
            </p>
            <div className="flex flex-wrap gap-2">
              {liveSuggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => sendMessage(suggestion.prompt)}
                  className="rounded-full border border-[color:var(--casa-sand)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--casa-ink)] transition-colors hover:bg-[var(--casa-warm-soft)]"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--casa-sand)] bg-white px-3 py-1 text-xs text-[var(--casa-muted)]">
            <Activity className="clara-status-pulse h-3.5 w-3.5 text-[var(--casa-accent-text)]" />
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {copy.processingStages[loadingStageIndex]}
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage(text);
        }}
        className="border-t border-[color:var(--casa-sand)] bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage(text);
              }
            }}
            rows={2}
            placeholder={copy.placeholder}
            className="min-h-[44px] flex-1 resize-y rounded-xl border border-[color:var(--casa-sand)] bg-white px-3 py-2 text-sm text-[var(--casa-ink)] placeholder:text-[var(--casa-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
          />
          <Button
            type="submit"
            disabled={loading || text.trim().length === 0}
            className="h-10 rounded-xl bg-[var(--casa-ink-deep)] px-3 text-white hover:bg-[var(--casa-ink-deep-hover)]"
          >
            <SendHorizonal className="h-4 w-4" />
            <span className="sr-only">{copy.send}</span>
          </Button>
        </div>
      </form>
    </div>
    </div>
  );
}
