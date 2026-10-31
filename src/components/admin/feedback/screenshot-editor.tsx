'use client';

import { Dialog as Primitive } from 'radix-ui';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { DIALOG_OVERLAY } from '../dialogs';
import { Icon } from '../icons';
import { useWsLang } from '../lang';
import { Button } from '../ui';
import { shotFromCanvas, type Shot } from './capture';

/**
 * Drawing on a screenshot before it is sent (0112): a frame round the place that matters, an arrow at it,
 * a line by hand, and a black block over what nobody else should read — a learner's address, a bank
 * account. Drawn in the picture's own pixels and burnt into it on „Übernehmen", so what arrives is what
 * the colleague saw; the original is not kept.
 */

type Tool = 'frame' | 'arrow' | 'pen' | 'redact';
type Mark =
  | { tool: 'frame' | 'arrow' | 'redact'; from: [number, number]; to: [number, number] }
  | { tool: 'pen'; points: [number, number][] };

const RED = '#e5243b';

function drawMark(ctx: CanvasRenderingContext2D, mark: Mark, line: number) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = RED;
  ctx.fillStyle = RED;
  ctx.lineWidth = line;
  // A soft halo keeps red legible on a red or dark screen.
  ctx.shadowColor = 'rgba(255,255,255,0.85)';
  ctx.shadowBlur = line * 0.9;
  if (mark.tool === 'pen') {
    ctx.beginPath();
    mark.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  } else {
    const [x1, y1] = mark.from;
    const [x2, y2] = mark.to;
    if (mark.tool === 'redact') {
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#111827';
      ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    } else if (mark.tool === 'frame') {
      const r = Math.min(line * 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2);
      ctx.beginPath();
      ctx.roundRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1), r);
      ctx.stroke();
    } else {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = line * 5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2 - Math.cos(angle) * head * 0.6, y2 - Math.sin(angle) * head * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 7), y2 - head * Math.sin(angle - Math.PI / 7));
      ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 7), y2 - head * Math.sin(angle + Math.PI / 7));
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

export function ScreenshotEditor({
  shot,
  onClose,
  onSave,
}: {
  shot: Shot | null;
  onClose: () => void;
  onSave: (next: Shot) => void;
}) {
  const { t } = useWsLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>('frame');
  const [marks, setMarks] = useState<Mark[]>([]);
  const drawing = useRef<Mark | null>(null);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  // A stroke that reads at the size the picture is shown in the workspace and in the mail.
  const line = shot ? Math.max(4, Math.round(Math.max(shot.width, shot.height) / 240)) : 5;

  const paint = useCallback(
    (extra?: Mark | null) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      if (!canvas || !image) return;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const mark of extra ? [...marks, extra] : marks) drawMark(ctx, mark, line);
    },
    [marks, line]
  );

  // The picture to draw on; a new picture is a new editor (keyed by its id), so the marks start empty.
  useEffect(() => {
    if (!shot) return;
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setReady(true);
    };
    image.src = shot.url;
  }, [shot]);

  useEffect(() => {
    if (ready) paint();
  }, [ready, paint]);

  const at = (event: ReactPointerEvent<HTMLCanvasElement>): [number, number] => {
    const canvas = event.currentTarget;
    const box = canvas.getBoundingClientRect();
    return [((event.clientX - box.left) * canvas.width) / box.width, ((event.clientY - box.top) * canvas.height) / box.height];
  };

  const down = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = at(event);
    drawing.current = tool === 'pen' ? { tool, points: [point] } : { tool, from: point, to: point };
  };
  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const mark = drawing.current;
    if (!mark) return;
    const point = at(event);
    drawing.current = mark.tool === 'pen' ? { ...mark, points: [...mark.points, point] } : { ...mark, to: point };
    paint(drawing.current);
  };
  const up = () => {
    const mark = drawing.current;
    drawing.current = null;
    if (!mark) return;
    // A click without a drag draws nothing.
    const size = mark.tool === 'pen' ? mark.points.length : Math.hypot(mark.to[0] - mark.from[0], mark.to[1] - mark.from[1]);
    if (size < 3) return paint();
    setMarks((all) => [...all, mark]);
  };

  const undo = useCallback(() => setMarks((all) => all.slice(0, -1)), []);

  useEffect(() => {
    if (!shot) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shot, undo]);

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !shot) return;
    if (!marks.length) return onClose();
    setSaving(true);
    try {
      paint();
      onSave(await shotFromCanvas(canvas));
    } finally {
      setSaving(false);
    }
  };

  const tools: { id: Tool; label: string; icon: ReactNode }[] = [
    { id: 'frame', label: t('Markieren', 'Highlight'), icon: Icon.frame },
    { id: 'arrow', label: t('Pfeil', 'Arrow'), icon: Icon.arrow },
    { id: 'pen', label: t('Stift', 'Pen'), icon: Icon.pen },
    { id: 'redact', label: t('Schwärzen', 'Redact'), icon: Icon.redact },
  ];

  return (
    <Primitive.Root open={!!shot} onOpenChange={(open) => (open ? null : onClose())}>
      <Primitive.Portal>
        <Primitive.Overlay className={cn('fixed inset-0 z-[1100] data-[state=open]:animate-in data-[state=open]:fade-in-0', DIALOG_OVERLAY)} />
        <Primitive.Content
          aria-describedby={undefined}
          className="casa-ws-dialog fixed inset-2 z-[1100] flex flex-col overflow-hidden rounded-3xl bg-[#0f1b2e] shadow-2xl outline-none sm:inset-5 data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0"
        >
          <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
            <Primitive.Title className="mr-2 text-[0.95rem] font-bold text-white">{t('Screenshot bearbeiten', 'Edit screenshot')}</Primitive.Title>
            <div role="toolbar" aria-label={t('Werkzeuge', 'Tools')} className="flex items-center gap-1 rounded-full bg-white/8 p-1 ring-1 ring-white/10">
              {tools.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={tool === entry.id}
                  onClick={() => setTool(entry.id)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8rem] font-semibold text-white/75 transition-colors outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 [&_svg]:size-3.5',
                    tool === entry.id && 'bg-white text-[#0f1b2e] hover:text-[#0f1b2e]'
                  )}
                >
                  {entry.icon}
                  <span className="hidden sm:inline">{entry.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={undo}
              disabled={!marks.length}
              title={t('Rückgängig (⌘Z)', 'Undo (⌘Z)')}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8rem] font-semibold text-white/75 transition-colors outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-35 [&_svg]:size-3.5"
            >
              {Icon.undo}
              <span className="hidden sm:inline">{t('Rückgängig', 'Undo')}</span>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <Primitive.Close className="inline-flex h-9 items-center rounded-full px-4 text-[0.84rem] font-semibold text-white/80 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50">
                {t('Abbrechen', 'Cancel')}
              </Primitive.Close>
              {/* On the dark ground the one action is white. */}
              <Button type="button" onClick={save} disabled={saving || !ready} className="bg-white text-[#0f1b2e] hover:bg-white/90">
                {t('Übernehmen', 'Apply')}
              </Button>
            </div>
          </header>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6">
            {shot ? (
              <canvas
                ref={canvasRef}
                width={shot.width}
                height={shot.height}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                aria-label={t('Screenshot zum Bemalen', 'Screenshot to draw on')}
                className="max-h-full max-w-full cursor-crosshair touch-none rounded-lg bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/15"
                style={{ aspectRatio: `${shot.width} / ${shot.height}` }}
              />
            ) : null}
          </div>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
