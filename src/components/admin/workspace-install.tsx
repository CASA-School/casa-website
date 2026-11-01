'use client';

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { workspaceApp } from '@/config/workspace-app';
import { Button } from './ui';
import { SidePanel } from './side-panel';
import { Icon } from './icons';
import { useWsLang } from './lang';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type Platform = 'ios' | 'mac' | 'android' | 'browser';
type InstallContext = { installed: boolean; installing: boolean; install: (returnFocus?: HTMLElement | null) => Promise<void> };
const Context = createContext<InstallContext | null>(null);
const standalone = () => typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
const subscribe = (change: () => void) => {
  const mode = window.matchMedia('(display-mode: standalone)');
  mode.addEventListener('change', change);
  return () => mode.removeEventListener('change', change);
};

export function useWorkspaceInstall() {
  return useContext(Context);
}

/** One deferred native prompt for both account menus. Nothing opens until a colleague asks. */
export function WorkspaceInstallProvider({ children }: { children: ReactNode }) {
  const { t } = useWsLang();
  const inApp = useSyncExternalStore(subscribe, standalone, () => false);
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);
  const [help, setHelp] = useState(false);
  const [platform, setPlatform] = useState<Platform>('browser');
  const returnTo = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const before = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const after = () => { setInstalled(true); setPrompt(null); setHelp(false); };
    window.addEventListener('beforeinstallprompt', before);
    window.addEventListener('appinstalled', after);
    return () => { window.removeEventListener('beforeinstallprompt', before); window.removeEventListener('appinstalled', after); };
  }, []);

  const install = async (target?: HTMLElement | null) => {
    returnTo.current = target ?? null;
    if (prompt && !installing) {
      setInstalling(true);
      setPrompt(null);
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === 'accepted') setInstalled(true);
        return;
      } catch {
        // A browser may revoke the event. The same requested action still offers manual help.
      } finally { setInstalling(false); }
    }
    const ua = navigator.userAgent;
    setPlatform(/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios'
      : /Android/.test(ua) ? 'android' : /Mac/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua) ? 'mac' : 'browser');
    setHelp(true);
  };
  const steps = platform === 'ios' ? [
    t('Öffne CASA Workspace in Safari.', 'Open CASA Workspace in Safari.'),
    t('Tippe auf „Teilen“, dann auf „Zum Home-Bildschirm“.', 'Tap Share, then Add to Home Screen.'),
    t('Lass „Als Web-App öffnen“ aktiviert, falls angezeigt, und tippe auf „Hinzufügen“.', 'Leave Open as Web App enabled if shown, then tap Add.'),
  ] : platform === 'mac' ? [
    t('Öffne CASA Workspace in Safari.', 'Open CASA Workspace in Safari.'),
    t('Wähle „Ablage“ → „Zum Dock hinzufügen“.', 'Choose File → Add to Dock.'),
    t('Bestätige den Namen „CASA Workspace“ und klicke auf „Hinzufügen“.', 'Confirm the name CASA Workspace and click Add.'),
  ] : platform === 'android' ? [
    t('Öffne CASA Workspace in Chrome.', 'Open CASA Workspace in Chrome.'),
    t('Öffne das Browsermenü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.', 'Open the browser menu and choose Install app or Add to Home screen.'),
    t('Bestätige die Installation. Danach findest du Workspace bei deinen Apps.', 'Confirm installation. Workspace will appear alongside your apps.'),
  ] : [
    t('Öffne CASA Workspace in Chrome oder Edge.', 'Open CASA Workspace in Chrome or Edge.'),
    t('Nutze das Installationssymbol in der Adressleiste oder die Installationsoption im Browsermenü.', 'Use the install icon in the address bar or the installation option in the browser menu.'),
    t('Auf dem Mac geht es auch in Safari über „Ablage“ → „Zum Dock hinzufügen“.', 'On Mac, Safari also supports File → Add to Dock.'),
  ];
  return <Context.Provider value={{ installed: installed || inApp, installing, install }}>
    {children}
    <SidePanel open={help} onOpenChange={setHelp} title={t(`${workspaceApp.name} installieren`, `Install ${workspaceApp.name}`)} icon={Icon.download}
      onCloseAutoFocus={event => { event.preventDefault(); returnTo.current?.focus(); }}
      footer={<Button type="button" onClick={() => setHelp(false)}>{t('Verstanden', 'Got it')}</Button>}>
      <div className="space-y-6 px-6 py-6 text-sm leading-relaxed">
        <p>{t('Workspace bekommt ein eigenes App-Fenster und ein Symbol auf deinem Gerät.', 'Workspace gets its own app window and an icon on your device.')}</p>
        <ol className="list-decimal space-y-4 pl-5 marker:font-semibold marker:text-[var(--casa-muted)]">{steps.map(step => <li key={step} className="pl-1">{step}</li>)}</ol>
        <p className="border-t border-ws-line-soft pt-4 text-xs text-[var(--casa-muted)]">{t('Melde dich mit deinem bestehenden CASA-Konto an. Für Buchungen und Änderungen brauchst du eine Verbindung.', 'Sign in with your existing CASA account. Bookings and changes need a connection.')}</p>
      </div>
    </SidePanel>
  </Context.Provider>;
}
