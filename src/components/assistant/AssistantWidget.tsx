'use client';

import { Link, usePathname } from '@/i18n/navigation';
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ArrowRight, ArrowUp, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Icon3D } from '@/components/ui/icon-3d';
import { claraStartIcons3d } from '@/config/icons-3d';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';
import { useSiteCopy } from '@/components/cms/site-copy-provider';

export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** The language CLARA answered in, so her labels follow the conversation rather than the page. */
  locale?: ContentLocale;
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
  /** The page's language: CLARA greets in it until a question is asked in another. */
  locale: ContentLocale;
  /** Held by the launcher, so the conversation outlives the panel and the page (in memory only). */
  messages: AssistantMessage[];
  onMessages: Dispatch<SetStateAction<AssistantMessage[]>>;
  /** True while the panel plays its way out. */
  closing: boolean;
  /** `false` when a link was followed: the focus goes with the visitor, not back to CLARA's button. */
  onClose: (returnFocus?: boolean) => void;
};

/*
 * The greeting is two short lines (Rahman, 2026-10-29: the introduction was too long). What CLARA
 * can help with is shown by the four starting points under it, not listed in a sentence.
 */
const dictionary = {
  en: {
    title: 'CLARA',
    subtitle: 'Your questions about CASA',
    placeholder: 'Ask CLARA …',
    send: 'Send',
    quickActions: [
      { label: 'The right course', prompt: 'Help me find a CASA course that suits my level and my weekly routine.' },
      { label: 'Exams', prompt: 'Which suits me better, telc B2 or C1 Hochschule?' },
      { label: 'Accommodation', prompt: 'Which suits me better, a shared flat or a host family?' },
      { label: 'Contact', prompt: 'I’d like to contact CASA. How can I reach you by phone or email?' },
    ],
    greetingTitle: 'Hi, I’m CLARA.',
    greetingText: 'What would you like to know about CASA?',
    processingStages: ['Reading your question …', 'Looking through the pages …', 'Putting your answer together …'],
    closeLabel: 'Close CLARA',
    restartLabel: 'New conversation',
    planLabel: 'Next steps',
    linksLabel: 'Useful links',
    detailsLabel: 'Details',
    courseTypeLabel: 'course',
  },
  de: {
    title: 'CLARA',
    subtitle: 'Deine Fragen zu CASA',
    placeholder: 'Frag CLARA …',
    send: 'Senden',
    quickActions: [
      { label: 'Passender Kurs', prompt: 'Hilf mir, einen CASA-Kurs zu finden, der zu meinem Niveau und meinem Wochenrhythmus passt.' },
      { label: 'Prüfungen', prompt: 'Was passt besser zu mir, telc B2 oder C1 Hochschule?' },
      { label: 'Unterkunft', prompt: 'Was passt besser zu mir, eine WG oder eine Gastfamilie?' },
      { label: 'Kontakt', prompt: 'Ich möchte CASA kontaktieren. Wie erreiche ich euch per Telefon oder E-Mail?' },
    ],
    greetingTitle: 'Hallo, ich bin CLARA.',
    greetingText: 'Was möchtest du über CASA wissen?',
    processingStages: ['Ich lese deine Frage …', 'Ich suche auf den Seiten …', 'Ich stelle dir die Antwort zusammen …'],
    closeLabel: 'CLARA schließen',
    restartLabel: 'Neues Gespräch',
    planLabel: 'Nächste Schritte',
    linksLabel: 'Nützliche Links',
    detailsLabel: 'Details',
    courseTypeLabel: 'Kurs',
  },
} as const;

/** Phones get a sheet the height of what is visible, so the keyboard never covers the field. */
const SHEET_QUERY = '(max-width: 639px)';
const MAX_FIELD_HEIGHT = 128;
/** How long each step of „what CLARA is doing" stays before the next. */
const STAGE_MS = 1200;

function makeMessage(role: 'user' | 'assistant', content: string): AssistantMessage {
  return {
    id: `${role}-${crypto.randomUUID()}`,
    role,
    content,
  };
}

/** Her face beside each of her messages: still, flat, no gradient (one per message). */
function ClaraFace() {
  return (
    <svg viewBox="0 0 64 64" className="mt-1 h-7 w-7 shrink-0" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="26" fill="#e3f1fd" />
      <circle cx="24" cy="28" r="4" fill="#0f172a" />
      <circle cx="40" cy="28" r="4" fill="#0f172a" />
      <path d="M22 41C24.8 44 28 45.4 32 45.4C36 45.4 39.2 44 42 41" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M17 18C21.2 12.5 26.1 9.6 32 9.6C37.9 9.6 42.8 12.5 47 18" stroke="#009fe3" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="15" r="4.5" fill="var(--casa-sun)" />
    </svg>
  );
}

function ClaraAvatar({ active, size = 'md' }: { active: boolean; size?: 'md' | 'lg' }) {
  return (
    <div
      className={cn(
        'clara-avatar relative shrink-0 rounded-xl border border-white/45 bg-white/65 shadow-[var(--shadow-soft)]',
        size === 'lg' ? 'h-16 w-16 rounded-2xl' : 'h-10 w-10',
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

export function AssistantWidget({ locale, messages, onMessages, closing, onClose }: AssistantWidgetProps) {
  const { pickTree, say } = useSiteCopy();
  // The page the visitor asks from: "what does this cost?" on a course page means that course.
  const pagePath = usePathname();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [sheet, setSheet] = useState<{ top: number; height: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);
  const hasScrolled = useRef(false);

  // CLARA speaks the language of her last answer, and the page's until then.
  const displayLocale = messages.findLast((message) => message.locale)?.locale ?? locale;
  const copy = pickTree(displayLocale, dictionary);

  // To the newest message: at once when the panel opens on an earlier conversation, smoothly after.
  useEffect(() => {
    const container = scrollRef.current;
    // The welcome is read from its top; there is nothing newer to scroll to.
    if (!container || (messages.length === 0 && !loading)) {
      return;
    }
    container.scrollTo({ top: container.scrollHeight, behavior: hasScrolled.current ? 'smooth' : 'auto' });
    hasScrolled.current = true;
  }, [messages.length, loading]);

  // While she looks: what she is doing, a step at a time, staying on the last.
  useEffect(() => {
    if (!loading) {
      return;
    }
    const timer = window.setInterval(() => {
      setStage((current) => Math.min(current + 1, copy.processingStages.length - 1));
    }, STAGE_MS);
    return () => window.clearInterval(timer);
  }, [loading, copy.processingStages.length]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const media = window.matchMedia(SHEET_QUERY);
    const update = () => {
      if (!media.matches) {
        setSheet(null);
        return;
      }
      // What is visible above the keyboard, less a strip of the page at the top.
      const top = (viewport?.offsetTop ?? 0) + 8;
      const height = Math.floor((viewport?.height ?? window.innerHeight) - 8);
      setSheet({ top, height });
    };

    update();
    media.addEventListener('change', update);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      media.removeEventListener('change', update);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // With a mouse, straight into the field; on a phone the keyboard waits for a tap.
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) {
      fieldRef.current?.focus({ preventScroll: true });
    }
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

  function resizeField() {
    const field = fieldRef.current;
    if (!field) {
      return;
    }
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, MAX_FIELD_HEIGHT)}px`;
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || loading) {
      return;
    }

    const userMessage = makeMessage('user', trimmed);
    const nextMessages = [...messages, userMessage];
    onMessages(nextMessages);
    setText('');
    requestAnimationFrame(resizeField);
    setStage(0);
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
          // The language comes from the question itself (the API reads it), whatever the page's.
          locale: null,
          pagePath,
        }),
      });

      const payload = (await response.json()) as AssistantApiResponse;
      if (!response.ok || payload.status !== 'ok' || !payload.data) {
        throw new Error(payload.message || 'Assistant request failed');
      }

      const assistantMessage: AssistantMessage = {
        ...makeMessage('assistant', payload.data.message),
        locale: payload.data.locale,
        cta: payload.data.cta,
        cards: payload.data.cards,
        quickLinks: payload.data.quickLinks,
        planSteps: payload.data.planSteps,
      };

      onMessages((current) => [...current, assistantMessage]);
    } catch {
      const fallbackText =
        say(displayLocale, 'Da bin ich mir gerade nicht sicher. Am besten wendest du dich direkt an unser Team.', 'I’m not sure about that right now. It’s best to contact our team directly.');

      onMessages((current) => [
        ...current,
        {
          ...makeMessage('assistant', fallbackText),
          cta: {
            label: say(displayLocale, 'Zum Kontaktformular', 'Go to the contact form'),
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
      {/* Phones only: the page dims behind the sheet, and a tap on it closes CLARA. */}
      <div
        className="clara-backdrop pointer-events-auto absolute inset-0 bg-[rgba(10,18,30,0.28)] sm:hidden"
        data-closing={closing || undefined}
        onClick={() => onClose()}
        aria-hidden="true"
      />
      <div
        id="casa-assistant-panel"
        role="dialog"
        aria-labelledby="casa-assistant-title"
        data-closing={closing || undefined}
        style={sheet ? { top: `${sheet.top}px`, height: `${sheet.height}px` } : undefined}
        /*
          Any link inside: the visitor is going somewhere, and CLARA steps aside as the page
          changes. Animated, not at once: taking the link out of the page in the same click
          turned Next's navigation into a full reload, which lost the conversation.
        */
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest('a[href]')) {
            onClose(false);
          }
        }}
        className={cn(
          'clara-panel pointer-events-auto absolute flex flex-col overflow-hidden border border-[color:var(--casa-sand)] bg-white shadow-[var(--shadow-modal)]',
          // Phone: a sheet from the bottom edge. From `sm`: a panel above her button.
          'inset-x-0 bottom-0 h-[calc(100dvh-0.5rem)] rounded-t-3xl',
          'sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100svh-7rem))] sm:w-[min(420px,calc(100vw-3rem))] sm:rounded-3xl'
        )}
      >
        <header className="flex items-center gap-3 border-b border-[color:var(--casa-sand)] bg-white bg-[radial-gradient(130%_120%_at_0%_0%,color-mix(in_srgb,var(--casa-blue)_7%,transparent),transparent_55%)] py-3 pl-4 pr-3">
          <ClaraAvatar active={loading} />
          <div className="min-w-0 flex-1">
            <p id="casa-assistant-title" className="text-sm font-bold tracking-tight text-[var(--casa-ink)]">{copy.title}</p>
            <p className="truncate text-xs text-[var(--casa-muted)]">{copy.subtitle}</p>
          </div>
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                onMessages([]);
                setText('');
                fieldRef.current?.focus({ preventScroll: true });
              }}
              disabled={loading}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-[var(--casa-muted)] transition-colors duration-200 hover:bg-[var(--casa-warm-soft)] hover:text-[var(--casa-ink)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--casa-blue)]/20 disabled:opacity-40"
            >
              {copy.restartLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onClose()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--casa-muted)] transition-colors duration-200 hover:bg-[var(--casa-warm-soft)] hover:text-[var(--casa-ink)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--casa-blue)]/20"
            aria-label={copy.closeLabel}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          className="clara-scroll flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[var(--casa-canvas)] px-4 py-4"
        >
          {/*
            Before the first question: her face, two short lines, and four starting points with the
            site's 3D icons, which play their motion on hover as everywhere else.
          */}
          {messages.length === 0 ? (
            // Centred by auto margins, not `justify-center`: on a short screen it scrolls from its top.
            <div className="clara-message flex min-h-full flex-col">
              <div className="my-auto py-2">
              <div className="flex flex-col items-center text-center">
                {/* Her big face only where there is height for it; the header already shows her. */}
                <div className="mb-4 [@media(max-height:620px)]:hidden">
                  <ClaraAvatar active={false} size="lg" />
                </div>
                <p className="text-lg font-bold tracking-tight text-[var(--casa-ink)]">{copy.greetingTitle}</p>
                <p className="mt-1 text-sm text-[var(--casa-muted)]">{copy.greetingText}</p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {copy.quickActions.map((action, index) => (
                  <button
                    key={action.label}
                    type="button"
                    data-icon-3d-host
                    onClick={() => sendMessage(action.prompt)}
                    className="flex min-h-16 items-center gap-3 rounded-2xl border border-[color:var(--casa-sand)] bg-white px-3 py-3 text-left text-sm font-semibold leading-snug text-[var(--casa-ink)] shadow-[var(--shadow-soft)] transition duration-200 ease-casa hover:border-[color:var(--casa-blue)]/30 hover:shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--casa-blue)]/20 motion-safe:hover:-translate-y-0.5"
                  >
                    {claraStartIcons3d[index] ? <Icon3D icon={claraStartIcons3d[index]} size="md" /> : null}
                    <span className="min-w-0">{action.label}</span>
                  </button>
                ))}
              </div>
              </div>
            </div>
          ) : null}

          {messages.map((message) =>
            message.role === 'user' ? (
              <p
                key={message.id}
                className="clara-message ml-auto w-fit max-w-[85%] whitespace-pre-line rounded-2xl rounded-tr-md bg-[var(--casa-ink-deep)] px-4 py-2.5 text-sm leading-relaxed text-white"
              >
                {message.content}
              </p>
            ) : (
              <div key={message.id} className="clara-message flex items-start gap-2">
              <ClaraFace />
              <article className="min-w-0 max-w-[88%] rounded-2xl rounded-tl-md border border-[color:var(--casa-sand)] bg-white px-4 py-3 text-sm leading-relaxed text-[var(--casa-ink)] shadow-[var(--shadow-soft)]">
                <p className="whitespace-pre-line">{message.content}</p>

                {message.planSteps && message.planSteps.length > 0 ? (
                  <div className="mt-3 rounded-xl bg-[var(--casa-warm-panel)] px-3 py-2.5">
                    <p className="mb-1.5 text-xs font-semibold text-[var(--casa-muted)]">{copy.planLabel}</p>
                    <ol className="space-y-1.5">
                      {message.planSteps.map((step, index) => (
                        <li key={step.id} className="flex items-start gap-2 text-sm text-[var(--casa-ink)]">
                          <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--casa-accent-surface)] text-xs font-bold text-white">
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
                    <p className="mb-1.5 text-xs font-semibold text-[var(--casa-muted)]">{copy.linksLabel}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {message.quickLinks.map((link) => (
                        <Link
                          key={`${message.id}-${link.href}`}
                          href={link.href}
                          className="group inline-flex min-h-8 items-center gap-1 rounded-full border border-[color:var(--casa-sand)] bg-white px-3 py-1 text-xs font-semibold text-[var(--casa-ink)] transition-colors duration-200 hover:border-[color:var(--casa-blue)]/40 hover:bg-[var(--casa-warm-soft)]"
                        >
                          {link.label}
                          <ArrowRight className="h-3 w-3 text-[var(--casa-accent-text)] transition-transform duration-200 ease-casa group-hover:translate-x-0.5" aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {message.cards && message.cards.length > 0 ? (
                  <div className="mt-3 divide-y divide-[color:var(--casa-sand)] overflow-hidden rounded-xl border border-[color:var(--casa-sand)]">
                    {message.cards.map((card) => (
                      <Link
                        key={card.id}
                        href={card.href}
                        className="group block bg-white p-3 text-[var(--casa-ink)] transition-colors duration-200 hover:bg-[var(--casa-warm-panel)]"
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[var(--casa-accent-text)]">
                              {card.type === 'course' ? copy.courseTypeLabel : card.type}
                            </p>
                            <p className="mt-0.5 text-sm font-bold leading-snug">{card.title}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--casa-muted)]">{card.description}</p>
                          </div>
                          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--casa-muted)] transition-transform duration-200 ease-casa group-hover:translate-x-0.5 group-hover:text-[var(--casa-accent-text)]" aria-hidden="true" />
                        </div>
                        {card.badges.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {card.badges.map((badge) => (
                              <span
                                key={`${card.id}-${badge}`}
                                className="rounded-full bg-[var(--casa-canvas)] px-2 py-0.5 text-xs font-semibold text-[var(--casa-muted)]"
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
                                <dt className="truncate text-xs text-[var(--casa-muted)]">{item.label}</dt>
                                <dd className="truncate text-xs font-semibold text-[var(--casa-ink)]">{item.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                        <span className="sr-only">{copy.detailsLabel}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {message.cta ? (
                  <Button
                    asChild
                    size="sm"
                    className="mt-3 h-9 rounded-full bg-[var(--casa-ink-deep)] px-4 text-xs font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)]"
                  >
                    <Link href={message.cta.href}>{message.cta.label}</Link>
                  </Button>
                ) : null}
              </article>
              </div>
            )
          )}

          {loading ? (
            <div className="clara-message flex items-start gap-2">
              <ClaraFace />
              <div className="inline-flex min-w-0 items-center gap-2.5 rounded-2xl rounded-tl-md border border-[color:var(--casa-sand)] bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
                <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
                  <span className="clara-typing-dot" />
                  <span className="clara-typing-dot" />
                  <span className="clara-typing-dot" />
                </span>
                <span key={stage} className="clara-message text-xs text-[var(--casa-muted)]">
                  {copy.processingStages[stage]}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(text);
          }}
          className="border-t border-[color:var(--casa-sand)] bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-[color:var(--casa-sand)] bg-white py-1.5 pl-3.5 pr-1.5 transition-shadow duration-200 focus-within:border-[color:var(--casa-blue)]/50 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--casa-blue)_14%,transparent)]">
            <textarea
              ref={fieldRef}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                resizeField();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void sendMessage(text);
                }
              }}
              rows={1}
              maxLength={1000}
              aria-label={copy.placeholder}
              placeholder={copy.placeholder}
              className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-base leading-snug text-[var(--casa-ink)] placeholder:text-[var(--casa-muted)] focus:outline-none sm:text-sm"
            />
            <button
              type="submit"
              disabled={loading || text.trim().length === 0}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--casa-ink-deep)] text-white transition-[background-color,opacity] duration-200 hover:bg-[var(--casa-ink-deep-hover)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--casa-blue)]/20 disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{copy.send}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
