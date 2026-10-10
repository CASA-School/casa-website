'use client';

import { useEffect } from 'react';

import { dataSource, isDataKey, type FromPage, type Rect, type SlotMarker, type ToPage } from '@/lib/cms/protocol';
import { hasTag, readTags, stripTags } from '@/lib/cms/stega';

/**
 * The page half of the website editor. Rendered only in draft mode.
 *
 * Inside the editor's iframe it finds every tagged text (src/lib/cms/stega.ts),
 * takes the tag out of the DOM and remembers which element shows which slot.
 * Hovering outlines a text with its name, clicking selects it instead of
 * following a link, and the editor's messages paint the markers (draft, needs
 * update, comments, a colleague editing), patch a text live while it is typed
 * and reveal a slot chosen from the search. Everything it draws sits in one
 * fixed layer that takes no clicks, so the page underneath is the real page.
 *
 * Outside an iframe — the same browser on the public site with the draft cookie
 * still set — it shows a small pill instead, so drafts are never mistaken for
 * the live site.
 */

const LAYER_CSS = `
.cms-layer{position:fixed;inset:0;pointer-events:none;z-index:2147483646}
.cms-box{position:fixed;box-sizing:border-box;border-radius:7px}
.cms-hover{outline:1.5px solid #009fe3;outline-offset:3px}
.cms-hover.cms-data{outline:1.5px dashed #64748b}
.cms-selected{outline:2px solid #009fe3;outline-offset:3px;background:rgba(0,159,227,.07)}
.cms-chip{position:fixed;transform:translateY(calc(-100% - 8px));padding:5px 8px;border-radius:7px;background:#009fe3;color:#fff;font:600 11px/1.1 Manrope,'Plus Jakarta Sans',system-ui,sans-serif;letter-spacing:.01em;white-space:nowrap;box-shadow:0 6px 16px -8px rgba(15,23,42,.5)}
.cms-chip.cms-data{background:#475569}
.cms-dot{position:fixed;width:9px;height:9px;border-radius:50%;background:#ffd500;box-shadow:0 0 0 2px #fff,0 0 0 3px #c99a00}
.cms-dot.cms-stale{background:#fff;box-shadow:0 0 0 2.5px #c99a00}
.cms-dot.cms-upcoming{background:#009fe3;box-shadow:0 0 0 2px #fff,0 0 0 3px #006f9f}
.cms-bubble{position:fixed;min-width:19px;height:19px;padding:0 5px;box-sizing:border-box;border-radius:10px 10px 10px 3px;background:#111827;color:#fff;font:700 10px/19px Manrope,system-ui,sans-serif;text-align:center}
.cms-lock{position:fixed;height:20px;padding:0 7px;border-radius:10px;background:#111827;color:#ffd500;font:700 10px/20px Manrope,system-ui,sans-serif;box-shadow:0 0 0 2px #fff}
[data-cms-editable]{cursor:text}
[data-cms-key^="data:"]{cursor:pointer}
`;

const PILL_CSS = `
.cms-pill{position:fixed;left:16px;bottom:16px;z-index:2147483647;display:inline-flex;align-items:center;gap:10px;height:38px;padding:0 6px 0 14px;border-radius:999px;background:#111827;color:#fff;font:600 13px/1 'Plus Jakarta Sans',system-ui,sans-serif;box-shadow:0 12px 30px -12px rgba(15,23,42,.6)}
.cms-pill i{width:8px;height:8px;border-radius:50%;background:#ffd500}
.cms-pill a{display:inline-flex;align-items:center;height:28px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;text-decoration:none}
.cms-pill a:hover{background:rgba(255,255,255,.2)}
`;

const ATTRIBUTES = ['aria-label', 'title', 'alt', 'placeholder'] as const;

function rectOf(element: Element): Rect {
  const r = element.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

function el(className: string, style: Partial<CSSStyleDeclaration>, text?: string): HTMLDivElement {
  const node = document.createElement('div');
  node.className = className;
  Object.assign(node.style, style);
  if (text) node.textContent = text;
  return node;
}

function mountPill(): () => void {
  const style = document.createElement('style');
  style.textContent = PILL_CSS;
  const pill = document.createElement('div');
  pill.className = 'cms-pill';
  pill.setAttribute('role', 'status');
  pill.innerHTML = '<i></i><span>Draft preview</span>';
  const exit = document.createElement('a');
  exit.href = `/api/cms/preview/exit?path=${encodeURIComponent(location.pathname)}`;
  exit.textContent = 'Exit';
  pill.append(exit);
  document.head.append(style);
  document.body.append(pill);
  return () => {
    pill.remove();
    style.remove();
  };
}

function mountBridge(origins: string[]): () => void {
  const nodes = new Map<string, Set<Text>>();
  const elements = new Map<string, Set<Element>>();
  let markers: Record<string, SlotMarker> = {};
  let hovered: Element | null = null;
  let selected: string | null = null;
  let selectedElement: Element | null = null;
  let frame = 0;
  let lastRect = '';

  const style = document.createElement('style');
  style.textContent = LAYER_CSS;
  document.head.append(style);
  const layer = el('cms-layer', {});
  document.body.append(layer);

  // The editor's origin, where the browser says it (Chrome, Safari); else every allowed one.
  const ancestor = (location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins?.[0];
  const targets = ancestor && origins.includes(ancestor) ? [ancestor] : origins;

  const send = (message: FromPage) => {
    for (const origin of targets) {
      try {
        window.parent.postMessage(message, origin);
      } catch {
        // A wrong target origin is dropped by the browser; nothing to do.
      }
    }
  };

  const keyOf = (element: Element | null) => element?.getAttribute('data-cms-key') ?? null;
  // Once the editor has said which texts it knows, any other tagged text stays inert.
  let described = false;
  const editable = (element: Element | null) => {
    const key = keyOf(element);
    return Boolean(key && (!described || markers[key]));
  };
  const live = (key: string) => [...(elements.get(key) ?? [])].filter((node) => node.isConnected);

  function scan(): string[] {
    const found: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node as Text;
      if (!hasTag(text.data)) continue;
      const parent = text.parentElement;
      const { clean, keys } = readTags(text.data);
      text.data = clean;
      if (!parent || parent.closest('script,style,noscript') || !keys[0]) continue;
      const key = keys[0];
      if (!nodes.has(key)) nodes.set(key, new Set());
      if (!elements.has(key)) elements.set(key, new Set());
      nodes.get(key)!.add(text);
      elements.get(key)!.add(parent);
      if (!parent.hasAttribute('data-cms-key')) parent.setAttribute('data-cms-key', key);
      found.push(key);
    }
    for (const attribute of ATTRIBUTES) {
      document.querySelectorAll(`[${attribute}]`).forEach((node) => {
        const value = node.getAttribute(attribute);
        if (value && hasTag(value)) node.setAttribute(attribute, stripTags(value));
      });
    }
    if (hasTag(document.title)) document.title = stripTags(document.title);
    return found;
  }

  function paint() {
    frame = 0;
    const children: HTMLElement[] = [];

    for (const [key, marker] of Object.entries(markers)) {
      if (!marker.state && !marker.comments && !marker.lockedBy) continue;
      const [first] = live(key);
      if (!first) continue;
      const r = first.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (marker.state) {
        const x = r.left >= 16 ? r.left - 15 : r.left + 2;
        children.push(el(`cms-dot cms-${marker.state}`, { left: `${x}px`, top: `${r.top + 5}px` }));
      }
      if (marker.lockedBy) {
        children.push(el('cms-lock', { left: `${r.right - 6}px`, top: `${r.top - 12}px` }, marker.lockedBy));
      } else if (marker.comments) {
        children.push(el('cms-bubble', { left: `${r.right - 4}px`, top: `${r.top - 12}px` }, String(marker.comments)));
      }
    }

    const draw = (element: Element, className: string, chip?: string) => {
      const r = element.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      children.push(
        el(className, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
      );
      if (chip) children.push(el(`cms-chip${className.includes('cms-data') ? ' cms-data' : ''}`, { left: `${r.left - 3}px`, top: `${r.top}px` }, chip));
    };

    const hoverKey = keyOf(hovered);
    if (hovered && hoverKey && hoverKey !== selected) {
      const data = isDataKey(hoverKey);
      const label = markers[hoverKey]?.label ?? (data ? `From ${dataSource(hoverKey)}` : 'Text');
      draw(hovered, `cms-box cms-hover${data ? ' cms-data' : ''}`, label);
    }
    if (selected) {
      const targets = live(selected);
      targets.forEach((target, index) =>
        draw(target, 'cms-box cms-selected', index === 0 ? markers[selected!]?.label : undefined)
      );
      const anchor = selectedElement?.isConnected ? selectedElement : targets[0];
      const rect = anchor ? rectOf(anchor) : null;
      const signature = `${selected}|${rect ? [rect.x, rect.y, rect.width, rect.height].map(Math.round).join(',') : ''}`;
      if (signature !== lastRect) {
        lastRect = signature;
        send({ type: 'cms:rect', key: selected, rect });
      }
    }

    layer.replaceChildren(...children);
  }

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(paint);
  };

  const onOver = (event: MouseEvent) => {
    const found = (event.target as Element | null)?.closest?.('[data-cms-key]') ?? null;
    const target = editable(found) ? found : null;
    if (target !== hovered) {
      hovered = target;
      schedule();
    }
  };
  const onLeave = () => {
    hovered = null;
    schedule();
  };
  const onClick = (event: MouseEvent) => {
    const target = (event.target as Element | null)?.closest?.('[data-cms-key]') ?? null;
    const key = keyOf(target);
    if (!target || !key || !editable(target)) return;
    event.preventDefault();
    event.stopPropagation();
    selected = key;
    selectedElement = target;
    send({ type: 'cms:select', key, rect: rectOf(target), text: (target.textContent ?? '').trim().slice(0, 240) });
    schedule();
  };
  const onMessage = (event: MessageEvent) => {
    if (!origins.includes(event.origin)) return;
    const message = event.data as ToPage;
    switch (message?.type) {
      case 'cms:markers':
        markers = message.markers;
        described = true;
        for (const [key, set] of elements) {
          for (const element of set) {
            if (markers[key]) element.setAttribute('data-cms-editable', '');
            else element.removeAttribute('data-cms-editable');
          }
        }
        break;
      case 'cms:select':
        selected = message.key;
        selectedElement = message.key ? (live(message.key)[0] ?? null) : null;
        break;
      case 'cms:preview':
        nodes.get(message.key)?.forEach((node) => {
          if (node.isConnected) node.data = message.value;
        });
        break;
      case 'cms:reveal': {
        const [target] = live(message.key);
        selected = message.key;
        selectedElement = target ?? null;
        target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        break;
      }
      case 'cms:reload':
        location.reload();
        return;
      default:
        return;
    }
    schedule();
  };

  let known = new Set<string>();
  const announce = (type: 'cms:ready' | 'cms:keys') => {
    const keys = [...elements.keys()].filter((key) => live(key).length > 0);
    known = new Set(keys);
    if (type === 'cms:ready') {
      send({ type, path: location.pathname, title: document.title, lang: document.documentElement.lang, keys });
    } else {
      send({ type, keys });
    }
  };

  const observer = new MutationObserver(() => {
    const found = scan();
    if (found.some((key) => !known.has(key))) announce('cms:keys');
    schedule();
  });

  const start = window.setTimeout(() => {
    scan();
    announce('cms:ready');
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    schedule();
  }, 200);

  document.addEventListener('mouseover', onOver, true);
  document.documentElement.addEventListener('mouseleave', onLeave);
  document.addEventListener('click', onClick, true);
  window.addEventListener('message', onMessage);
  window.addEventListener('scroll', schedule, { passive: true, capture: true });
  window.addEventListener('resize', schedule);

  return () => {
    window.clearTimeout(start);
    if (frame) cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener('mouseover', onOver, true);
    document.documentElement.removeEventListener('mouseleave', onLeave);
    document.removeEventListener('click', onClick, true);
    window.removeEventListener('message', onMessage);
    window.removeEventListener('scroll', schedule, { capture: true });
    window.removeEventListener('resize', schedule);
    layer.remove();
    style.remove();
  };
}

export function EditBridge({ allowedOrigins }: { allowedOrigins: string }) {
  useEffect(() => {
    if (window.parent === window) return mountPill();
    return mountBridge(allowedOrigins.split(' ').filter(Boolean));
  }, [allowedOrigins]);

  return null;
}
