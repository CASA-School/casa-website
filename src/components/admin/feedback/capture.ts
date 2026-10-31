'use client';

import type { FeedbackContext } from '@/lib/admin/feedback-shared';

import { trailSnapshot } from '../nav-trail';

/**
 * The browser's half of a feedback (0112): a picture of the screen, a picture made small enough to send,
 * and what the page was — where, on what, and what went wrong on it.
 */

/** The long side a screenshot is kept at: sharp enough to read every label, small enough for the mail. */
const MAX_SIDE = 2200;
/** A PNG larger than this goes as a JPEG: a photo-heavy screen compresses badly as PNG. */
const PNG_BUDGET = 1_400_000;

export type Shot = { id: string; blob: Blob; url: string; width: number; height: number };

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export const canCaptureScreen = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function';

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/** A canvas as the smallest good file: PNG for a screen of text, JPEG when PNG would be heavy. */
async function canvasToShot(canvas: HTMLCanvasElement): Promise<Shot> {
  let blob = await toBlob(canvas, 'image/png');
  if (!blob || blob.size > PNG_BUDGET) blob = (await toBlob(canvas, 'image/jpeg', 0.88)) ?? blob;
  if (!blob) throw new Error('encode');
  return { id: newId(), blob, url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
}

/** Draws a source at most MAX_SIDE on its long side, on white (a transparent PNG reads badly as JPEG). */
function drawScaled(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** A picture the colleague added (pasted, dropped, chosen), made small enough to send. */
export async function shotFromFile(file: Blob): Promise<Shot> {
  const bitmap = await createImageBitmap(file);
  try {
    return await canvasToShot(drawScaled(bitmap, bitmap.width, bitmap.height));
  } finally {
    bitmap.close();
  }
}

/** A picture drawn on (screenshot-editor.tsx), as a new shot in the old one's place. */
export const shotFromCanvas = (canvas: HTMLCanvasElement) => canvasToShot(drawScaled(canvas, canvas.width, canvas.height));

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One picture of this tab, through the browser's own screen sharing: the browser asks once („Diesen Tab
 * teilen?"), one frame is taken, and the sharing ends at once. Chrome and Edge offer this tab first
 * (`preferCurrentTab`); Safari and Firefox let the colleague pick the window. Null when they decline.
 */
export async function captureScreen(): Promise<Shot | null> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser', frameRate: 10 },
      audio: false,
      // Chromium's options for sharing this very tab; other browsers ignore them.
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      surfaceSwitching: 'exclude',
      monitorTypeSurfaces: 'exclude',
    } as DisplayMediaStreamOptions);
  } catch {
    return null;
  }
  const video = document.createElement('video');
  try {
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    // Let the browser's sharing prompt leave the picture before the frame is taken.
    await wait(350);
    await nextFrame();
    if (!video.videoWidth || !video.videoHeight) return null;
    return await canvasToShot(drawScaled(video, video.videoWidth, video.videoHeight));
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}

/* ------------------------------------------------------------------ what the page was */

type PageError = { message: string; at: string };
const errors: PageError[] = [];
let listening = false;

/**
 * Remembers the last errors the page met — a failed script, a refused request — from the moment the
 * workspace opens, so a „Funktioniert nicht" arrives with them. Only the message, never a stack.
 */
export function listenForPageErrors() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  const keep = (message: string) => {
    const text = message.replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!text || errors.at(-1)?.message === text) return;
    errors.push({ message: text, at: new Date().toISOString() });
    if (errors.length > 8) errors.shift();
  };
  window.addEventListener('error', (event) => keep(event.message || String(event.error ?? '')));
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    keep(reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'Unhandled rejection');
  });
}

/** This page: its address and name, the visit before it, the window, the browser, the errors met. */
export function pageContext(lang: 'de' | 'en'): { pagePath: string; pageTitle: string; context: FeedbackContext } {
  const path = `${window.location.pathname}${window.location.search}`;
  const trail = trailSnapshot(8);
  const here = trail.at(-1);
  const heading = document.querySelector('main h1')?.textContent?.trim() ?? '';
  const pageTitle = (here && here.path === path && here.title) || heading || document.title;
  // On the admin host the tree is served at the root: the stored address is always the tree's own.
  const pagePath = path.startsWith('/admin') ? path : `/admin${path === '/' ? '' : path}`;
  return {
    pagePath,
    pageTitle: pageTitle.slice(0, 300),
    context: {
      url: path,
      viewport: `${window.innerWidth} × ${window.innerHeight}`,
      screen: `${window.screen.width} × ${window.screen.height} · ${Math.round(window.devicePixelRatio * 100) / 100}×`,
      userAgent: navigator.userAgent.slice(0, 400),
      lang,
      trail: trail.filter((entry) => entry.path !== path).slice(-6).map((e) => ({ path: e.path.slice(0, 500), title: e.title.slice(0, 200) })),
      errors: errors.slice(-8),
    },
  };
}
