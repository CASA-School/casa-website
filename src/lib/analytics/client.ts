'use client';

type CasaEventName = 'cta_click' | 'form_submit' | 'form_success' | 'form_error';

type CasaEventPayload = {
  label?: string;
  href?: string;
  section?: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'unknown';
  form?: string;
  step?: string;
  reason?: string;
  locale?: string;
  path?: string;
};

type CasaTrackedEvent = {
  event: 'casa_event';
  eventName: CasaEventName;
  timestamp: string;
  payload: CasaEventPayload;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    __casaEvents?: CasaTrackedEvent[];
  }
}

function toSafePayload(payload: CasaEventPayload): CasaEventPayload {
  return {
    ...payload,
    label: payload.label?.trim().slice(0, 120),
    href: payload.href?.trim().slice(0, 240),
    section: payload.section?.trim().slice(0, 80),
    form: payload.form?.trim().slice(0, 80),
    reason: payload.reason?.trim().slice(0, 160),
    locale: payload.locale?.trim().slice(0, 12),
    path: payload.path?.trim().slice(0, 160),
    step: payload.step?.trim().slice(0, 40),
  };
}

export function trackCasaEvent(eventName: CasaEventName, payload: CasaEventPayload = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const entry: CasaTrackedEvent = {
    event: 'casa_event',
    eventName,
    timestamp: new Date().toISOString(),
    payload: toSafePayload(payload),
  };

  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }
  window.dataLayer.push(entry);

  if (!Array.isArray(window.__casaEvents)) {
    window.__casaEvents = [];
  }
  window.__casaEvents.push(entry);

  window.dispatchEvent(new CustomEvent('casa:analytics', { detail: entry }));
}

