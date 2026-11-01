'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { workspaceApp } from '@/config/workspace-app';
import { ConfirmSubmit } from './dialogs';
import { Icon } from './icons';
import { useWsLang } from './lang';

const online = () => typeof navigator === 'undefined' || navigator.onLine;
const subscribe = (change: () => void) => {
  window.addEventListener('online', change);
  window.addEventListener('offline', change);
  return () => { window.removeEventListener('online', change); window.removeEventListener('offline', change); };
};

/** Live records stay on the server. Connection and build changes never reload or replay a form. */
export function WorkspaceStatus({ initialVersion }: { initialVersion: string | null }) {
  const { t } = useWsLang();
  const connected = useSyncExternalStore(subscribe, online, () => true);
  const [updated, setUpdated] = useState(false);
  useEffect(() => {
    if (!initialVersion) return;
    let stopped = false, checking = false;
    let request: AbortController | null = null;
    let deadline: number | undefined;
    const check = async () => {
      if (stopped || checking || !navigator.onLine || document.visibilityState === 'hidden') return;
      checking = true;
      request = new AbortController();
      const pending = request;
      deadline = window.setTimeout(() => pending.abort(), 8_000);
      try {
        const response = await fetch(workspaceApp.versionUrl, { cache: 'no-store', credentials: 'same-origin', signal: request.signal });
        if (response.status === 401) { stopped = true; return; }
        if (!response.ok) return;
        const result = await response.json();
        if (!stopped && typeof result?.data?.version === 'string' && result.data.version !== initialVersion) {
          stopped = true;
          setUpdated(true);
        }
      } catch { /* A failed update check leaves the current work and its values alone. */ }
      finally { window.clearTimeout(deadline); checking = false; }
    };
    void check();
    const timer = window.setInterval(() => void check(), 60_000);
    const resume = () => void check();
    window.addEventListener('focus', resume);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      stopped = true; request?.abort(); window.clearTimeout(deadline); window.clearInterval(timer);
      window.removeEventListener('focus', resume); window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [initialVersion]);

  if (connected && !updated) return null;
  return <aside aria-label={t('Workspace-Verbindung', 'Workspace connection')} className="fixed right-3 bottom-3 left-3 z-[70] mx-auto flex max-w-2xl flex-wrap items-center gap-x-4 gap-y-2 rounded-ws-inner border border-ws-line bg-white px-4 py-3 shadow-lg sm:bottom-4">
    <div role="status" className="flex min-w-0 flex-1 items-start gap-2.5 text-sm">
      <span aria-hidden="true" className="mt-0.5 text-[var(--casa-muted)] [&_svg]:size-4">{Icon.attention}</span>
      <span><strong className="block text-[0.84rem] font-semibold">{!connected ? t('Du bist offline', 'You are offline') : t('Neue Version verfügbar', 'New version available')}</strong>
        <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">{!connected
          ? t('Zum Laden und Speichern brauchst du eine Verbindung. Deine offenen Eingaben bleiben hier.', 'A connection is needed to load and save. Your open inputs stay here.')
          : t('Speichere deine Änderungen und lade Workspace danach neu.', 'Save your changes, then reload Workspace.')}</span>
      </span>
    </div>
    {connected && updated ? <form onSubmit={event => { event.preventDefault(); window.location.reload(); }}>
      <ConfirmSubmit variant="secondary" title={t('Workspace neu laden?', 'Reload Workspace?')}
        description={t('Speichere zuerst deine Änderungen. Nicht gespeicherte Eingaben gehen beim Neuladen verloren.', 'Save your changes first. Unsaved inputs will be lost when you reload.')}
        confirmLabel={t('Jetzt neu laden', 'Reload now')}>
        {t('Neu laden', 'Reload')}
      </ConfirmSubmit>
    </form> : null}
  </aside>;
}
