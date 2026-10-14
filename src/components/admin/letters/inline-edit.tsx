'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { useWsLang } from '@/components/admin/lang';

import ui from './letter-edit.module.css';

/**
 * Editing on the letter itself, the website editor's way: a text shows a soft
 * outline under the pointer; a click turns it into the same text, editable,
 * with a small bar under it. Nothing moves around it, so what is typed is
 * already where it will print.
 */

function useOutside(ref: React.RefObject<HTMLElement | null>, active: boolean, onOutside: () => void) {
  useEffect(() => {
    if (!active) return;
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOutside();
    };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [ref, active, onOutside]);
}

/** Grows with its text where the browser cannot size a field to its content. */
function useAutoHeight(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}

export function InlineText({
  value,
  label,
  onChange,
  multiline,
  disabled,
  state,
  onUseStandard,
  onSaveStandard,
  tools,
  placeholder,
  onClose,
  startOpen,
}: {
  value: string;
  label: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  disabled?: boolean;
  /** "standard" or "changed": shown on the bar, for texts that have a standard. */
  state?: 'standard' | 'changed';
  onUseStandard?: () => void;
  onSaveStandard?: () => Promise<void>;
  tools?: ReactNode;
  placeholder?: string;
  onClose?: () => void;
  startOpen?: boolean;
}) {
  const { t } = useWsLang();
  const [editing, setEditing] = useState(Boolean(startOpen));
  const [saving, setSaving] = useState<'idle' | 'saving' | 'done'>('idle');
  const wrap = useRef<HTMLSpanElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  useAutoHeight(area, editing ? value : '');
  const close = () => {
    setEditing(false);
    setSaving('idle');
    onClose?.();
  };
  useOutside(wrap, editing, close);

  if (disabled || !editing) {
    return (
      <span
        className={disabled ? undefined : `${ui.editable} ${multiline ? ui.editableBlock : ''}`}
        role={disabled ? undefined : 'button'}
        tabIndex={disabled ? undefined : 0}
        aria-label={disabled ? undefined : t(`${label} ändern`, `Change ${label.toLowerCase()}`)}
        data-label={label}
        onClick={disabled ? undefined : () => setEditing(true)}
        onKeyDown={
          disabled
            ? undefined
            : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setEditing(true);
                }
              }
        }
      >
        {value || <span className={ui.placeholder}>{placeholder ?? '—'}</span>}
      </span>
    );
  }

  return (
    <span ref={wrap} className={`${ui.inlineWrap} ${multiline ? ui.inlineBlock : ''}`}>
      <textarea
        ref={area}
        aria-label={label}
        className={ui.inlineArea}
        rows={1}
        value={value}
        placeholder={placeholder}
        autoFocus
        onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
        onChange={(e) => onChange(multiline ? e.target.value : e.target.value.replace(/\n/g, ' '))}
        onKeyDown={(e) => {
          if (!multiline && e.key === 'Enter') {
            e.preventDefault();
            close();
          }
        }}
      />
      <span className={ui.bar} role="toolbar" aria-label={label}>
        <span className={ui.barLabel}>{label}</span>
        {state ? <span className={state === 'standard' ? ui.chipStandard : ui.chipChanged}>{state === 'standard' ? t('Standardtext', 'Standard text') : t('Nur dieser Brief', 'Only this letter')}</span> : null}
        {tools}
        {state === 'changed' && onUseStandard ? (
          <button type="button" className={ui.barBtn} onClick={onUseStandard}>
            {t('Standard verwenden', 'Use the standard')}
          </button>
        ) : null}
        {state === 'changed' && onSaveStandard ? (
          <button
            type="button"
            className={ui.barBtn}
            disabled={saving !== 'idle'}
            onClick={async () => {
              setSaving('saving');
              await onSaveStandard();
              setSaving('done');
            }}
          >
            {saving === 'done'
              ? t('Als Standard gespeichert', 'Saved as standard')
              : saving === 'saving'
                ? t('Speichert …', 'Saving …')
                : t('Als Standard speichern', 'Save as standard')}
          </button>
        ) : null}
        <button type="button" className={ui.barDone} onClick={close}>
          {t('Fertig', 'Done')}
        </button>
      </span>
    </span>
  );
}

/** A part of the letter that opens a small panel when clicked: the recipient, the date, the signature. */
export function InlinePanel({
  label,
  children,
  panel,
  disabled,
  block,
  width = 360,
}: {
  label: string;
  children: ReactNode;
  panel: (close: () => void) => ReactNode;
  disabled?: boolean;
  block?: boolean;
  width?: number;
}) {
  const { t } = useWsLang();
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  useOutside(wrap, open, () => setOpen(false));
  if (disabled) return <>{children}</>;
  // Near the foot of the window the panel opens upwards, not off the screen.
  const toggle = () => {
    const box = wrap.current?.getBoundingClientRect();
    if (!open && box) setUp(window.innerHeight - box.bottom < 420 && box.top > window.innerHeight - box.bottom);
    setOpen((v) => !v);
  };
  return (
    <span ref={wrap} className={`${ui.inlineWrap} ${block ? ui.inlineBlock : ''}`}>
      <span
        className={`${ui.editable} ${block ? ui.editableBlock : ''} ${open ? ui.editableOpen : ''}`}
        role="button"
        tabIndex={0}
        aria-label={t(`${label} ändern`, `Change ${label.toLowerCase()}`)}
        aria-expanded={open}
        data-label={label}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        {children}
      </span>
      {open ? (
        <span className={`${ui.panel} ${up ? ui.panelUp : ''}`} style={{ width }} role="dialog" aria-label={label}>
          <span className={ui.panelHead}>
            <span>{label}</span>
            <button type="button" className={ui.barDone} onClick={() => setOpen(false)}>
              {t('Fertig', 'Done')}
            </button>
          </span>
          {panel(() => setOpen(false))}
        </span>
      ) : null}
    </span>
  );
}
