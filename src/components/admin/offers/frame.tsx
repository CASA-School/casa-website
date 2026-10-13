'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import ui from './offers.module.css';

/**
 * The offers module's one toolbar — the website editor's frame. The way back
 * on the left, the offer's two sides in the middle, what can be done on the
 * right. Moving between the tabs saves first, so nothing typed is left behind.
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
  const go = async (href: string, before?: () => Promise<void>) => {
    if (before) await before();
    router.push(href);
  };
  return (
    <div className={`${ui.app} ${ui.tokens}`}>
      <header className={ui.bar}>
        <div className={ui.barLeft}>
          {back.before ? (
            <button type="button" className={ui.back} onClick={() => void go(back.href, back.before)}>
              ← {back.label}
            </button>
          ) : (
            <Link href={back.href} className={ui.back}>
              ← {back.label}
            </Link>
          )}
          <span className={ui.sep} />
          <span className={ui.who}>
            <b>{title}</b>
            {subtitle ? <span>{subtitle}</span> : null}
          </span>
        </div>
        <div className={ui.barCenter}>
          {tabs ? (
            <nav className={ui.tabs} aria-label="Offer">
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
                    {t === 'offer' ? 'Offer' : 'Letter'}
                  </a>
                );
              })}
            </nav>
          ) : null}
        </div>
        <div className={ui.barRight}>{right}</div>
      </header>
      {children}
    </div>
  );
}
