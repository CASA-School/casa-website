'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { useWsLang } from '@/components/admin/lang';

import ui from './offers.module.css';

/**
 * The head of an offer's page, inside the workspace's frame since 2026-10-17 (Rahman: Offers like
 * everything else, not full screen). The way back as the workspace's pill, the offer's name and
 * number, and on the right its two sides — the offer and its letter — and what can be done. Moving
 * between the sides, or back, saves first, so nothing typed is left behind.
 */
export function OfferFrame({
  back,
  title,
  subtitle,
  tabs,
  right,
  children,
}: {
  back: { href: string; label: string; before?: () => Promise<void> };
  title: string;
  subtitle?: string;
  tabs?: { id: string; active: 'offer' | 'letter'; before?: () => Promise<void> };
  right?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const { t: tr } = useWsLang();
  const go = async (href: string, before?: () => Promise<void>) => {
    if (before) await before();
    router.push(href);
  };
  const arrow = (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={ui.backIcon}>
      <path d="M6.5 3.5 2.5 8l4 4.5M2.5 8h11" />
    </svg>
  );
  return (
    <div className={`${ui.app} ${ui.tokens}`}>
      <header className={ui.head}>
        {back.before ? (
          <button type="button" className={ui.back} onClick={() => void go(back.href, back.before)}>
            {arrow}
            {back.label}
          </button>
        ) : (
          <Link href={back.href} className={ui.back}>
            {arrow}
            {back.label}
          </Link>
        )}
        {tabs ? (
          // An offer: its own head card carries the name, where it is renamed; here the two sides, its number and status, the actions.
          <div className={ui.headRow}>
            <h1 className="sr-only">{title}</h1>
            <div className={ui.headLeft}>
              <nav className={ui.tabs} aria-label={tr('Angebot', 'Offer')}>
                {(['offer', 'letter'] as const).map((t) => {
                  const href = t === 'offer' ? `/admin/offers/${tabs.id}` : `/admin/offers/${tabs.id}/letter`;
                  const on = tabs.active === t;
                  return (
                    <a
                      key={t}
                      href={href}
                      aria-current={on ? 'page' : undefined}
                      className={`${ui.tab} ${on ? ui.tabOn : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (!on) void go(href, tabs.before);
                      }}
                    >
                      {t === 'offer' ? tr('Angebot', 'Offer') : tr('Brief', 'Letter')}
                    </a>
                  );
                })}
              </nav>
              {subtitle ? <span className={ui.headMeta}>{subtitle}</span> : null}
            </div>
            <div className={ui.headRight}>{right}</div>
          </div>
        ) : (
          <div className={ui.headRow}>
            <div className={ui.headTitle}>
              <h1>{title}</h1>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
            <div className={ui.headRight}>{right}</div>
          </div>
        )}
      </header>
      {children}
    </div>
  );
}
