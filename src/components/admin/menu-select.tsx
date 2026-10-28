'use client';

import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
  type SelectHTMLAttributes,
} from 'react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';

import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { menuItem, menuPanel } from './choice-menu';
import { Icon } from './icons';

/**
 * The workspace's dropdowns in CASA's own menu (Rahman, 2026-10-21: „check all the dropdowns in the
 * dashboard and make sure they open properly and properly branded"): the panel of „Weiter mit …" and
 * Zuständig, opened from a field — grouped under headings, each option with a quiet detail, the chosen
 * one ticked, typing a letter jumps to it. In a dialog, a side panel or a calendar it is portalled into
 * it, as `Floating` is: a dialog's scroll lock lets the wheel scroll only what is inside it, and a
 * calendar closes on a click outside itself.
 *
 * `Select` is the form field every workspace form uses (`ui.tsx`): its `<option>`s, `name`, `required`,
 * `defaultValue` or `value` and `onChange` stay on a real `<select>` under the field, so a form posts,
 * validates, resets and announces its changes as before. `MenuSelect` is the same menu for a value a
 * client component holds, with a detail per option.
 */

export type MenuOption = {
  value: string;
  label: string;
  /** Said quietly after the label: a room's seats, what else is on at that time. */
  detail?: string;
  /** `warn` when the choice clashes: taken, or away. */
  tone?: 'warn';
  /** Options with the same group sit under its heading, in the order they come. */
  group?: string;
  disabled?: boolean;
};

const fieldClass =
  'flex h-10 w-full items-center gap-2 rounded-lg border border-ws-line bg-white px-3 text-left text-sm font-medium text-[var(--casa-ink)] transition-colors outline-none hover:border-ws-line-firm focus-visible:border-[var(--casa-blue)] focus-visible:ring-[3px] focus-visible:ring-[var(--casa-blue)]/25 disabled:cursor-not-allowed disabled:opacity-55 data-[state=open]:border-ws-line-firm aria-invalid:border-[#d14343] [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-[var(--casa-muted)]';

/** Where the menu is drawn: the dialog, side panel or calendar the field sits in, or the page. */
const hostOf = (field: HTMLElement | null) => field?.closest<HTMLElement>('[data-menu-host], [data-slot="dialog-content"]') ?? null;

/** A long list (the years, the countries) opens at the choice it holds, ready for the arrow keys. */
function openAtChoice(list: HTMLDivElement | null) {
  if (!list) return;
  requestAnimationFrame(() => {
    const current = list.querySelector<HTMLElement>('[data-current]');
    if (!current) return;
    const box = list.getBoundingClientRect();
    const at = current.getBoundingClientRect();
    list.scrollTop += at.top - box.top - (list.clientHeight - at.height) / 2;
    current.focus({ preventScroll: true });
  });
}

function useHost(field: RefObject<HTMLElement | null>) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  return [host, (open: boolean) => open && setHost(hostOf(field.current))] as const;
}

function MenuList({
  options,
  value,
  onPick,
  host,
  fit = 'field',
}: {
  options: readonly MenuOption[];
  value: string;
  onPick: (value: string) => void;
  host: HTMLElement | null;
  /** `field`: as wide as the field, as a form's dropdown; `content`: as wide as the options need, for a small field. */
  fit?: 'field' | 'content';
}) {
  // „Auswählen …": a disabled empty option is the field's empty state, not a choice.
  const choices = options.filter((o) => !(o.disabled && o.value === ''));
  const groups = [...new Set(choices.map((o) => o.group ?? ''))];
  return (
    <DropdownMenuPrimitive.Portal container={host ?? undefined}>
      <DropdownMenuPrimitive.Content
        align="start"
        sideOffset={6}
        collisionPadding={8}
        ref={openAtChoice}
        className={cn(
          menuPanel,
          fit === 'field' ? 'w-(--radix-dropdown-menu-trigger-width) min-w-0' : 'max-w-[22rem] min-w-(--radix-dropdown-menu-trigger-width)',
          'z-[1100] max-h-[min(60vh,440px,var(--radix-dropdown-menu-content-available-height))] overflow-x-hidden overflow-y-auto overscroll-contain border data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95'
        )}
      >
        {groups.map((group, i) => (
          <Fragment key={group || '_'}>
            {i > 0 ? <DropdownMenuSeparator className="mx-1 my-1 bg-ws-line-soft" /> : null}
            {group ? <DropdownMenuLabel className="px-2.5 pt-1.5 pb-1 text-[0.72rem] font-bold text-[var(--casa-muted)]">{group}</DropdownMenuLabel> : null}
            {choices
              .filter((o) => (o.group ?? '') === group)
              .map((o) => (
                <DropdownMenuItem
                  key={o.value || '_'}
                  data-current={o.value === value ? '' : undefined}
                  disabled={o.disabled}
                  textValue={o.label}
                  className={cn(menuItem, o.value === value && 'bg-[var(--ws-head)] font-semibold')}
                  onSelect={() => onPick(o.value)}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.detail ? <span className={cn('max-w-[55%] shrink-0 truncate text-[0.76rem]', o.tone === 'warn' ? 'font-semibold text-[#9a5b00]' : 'text-[var(--casa-muted)]')}>{o.detail}</span> : null}
                  {o.value === value ? (
                    <span aria-hidden="true" className="text-[var(--fm-navy)] [&_svg]:!text-[var(--fm-navy)]">
                      {Icon.check}
                    </span>
                  ) : null}
                </DropdownMenuItem>
              ))}
          </Fragment>
        ))}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

/** A value a client component holds, chosen from the menu; it posts under `name` from a hidden input. */
export function MenuSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
  label,
}: {
  id?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly MenuOption[];
  placeholder: string;
  /** The field's accessible name. */
  label: string;
}) {
  const current = options.find((o) => o.value === value);
  const field = useRef<HTMLButtonElement>(null);
  const [host, onOpenChange] = useHost(field);
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <DropdownMenu modal={false} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger ref={field} id={id} aria-label={label} className={fieldClass}>
          <span className={cn('min-w-0 flex-1 truncate', !current && 'font-normal text-[var(--casa-text-subtle)]')}>{current?.label ?? placeholder}</span>
          {current?.detail ? <span className={cn('max-w-[45%] shrink-0 truncate text-[0.78rem]', current.tone === 'warn' ? 'font-semibold text-[#9a5b00]' : 'text-[var(--casa-muted)]')}>{current.detail}</span> : null}
          {Icon.chevronDown}
        </DropdownMenuTrigger>
        <MenuList options={options} value={value} onPick={onChange} host={host} />
      </DropdownMenu>
    </>
  );
}

const textOf = (node: ReactNode): string =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join('')
      : isValidElement<{ children?: ReactNode }>(node)
        ? textOf(node.props.children)
        : '';

/** The `<option>`s and `<optgroup>`s of a select's children, through fragments, arrays and conditions. */
function collect(children: ReactNode, group?: string, into: MenuOption[] = []): MenuOption[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ value?: string | number; disabled?: boolean; label?: string; children?: ReactNode }>;
    if (el.type === 'option') {
      const label = textOf(el.props.children);
      into.push({ value: el.props.value === undefined ? label : String(el.props.value), label, disabled: el.props.disabled, group });
    } else if (el.type === 'optgroup') collect(el.props.children, el.props.label, into);
    else collect(el.props.children, group, into);
  });
  return into;
}

type Shown = { value: string; label: string; placeholder: boolean; name: string };

/** The field's name: its label's text, without the field itself when the label wraps it. */
function labelOf(select: HTMLSelectElement): string {
  const label = select.labels?.[0];
  if (!label) return '';
  const copy = label.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[data-menu-select]').forEach((node) => node.remove());
  return copy.textContent?.trim() ?? '';
}

/**
 * A form's dropdown: the menu over a real `<select>`, which keeps the value, the form's post, `required`,
 * `onChange` and a reset. A choice sets the select and announces a change, as a person's would.
 * `bare` keeps a module's own field look (Kursplanung's `.sel`, the offers' `.fi`, the calendar's
 * month and year) on the trigger, `className`; otherwise `className` sizes the field.
 */
export function Select({
  className,
  bare = false,
  children,
  disabled,
  'aria-label': ariaLabel,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { bare?: boolean }) {
  const native = useRef<HTMLSelectElement>(null);
  const field = useRef<HTMLButtonElement>(null);
  const [host, onOpenChange] = useHost(field);
  const options = useMemo(() => collect(children), [children]);
  // Before the page is live, what the browser will show: the option asked for, or the first that can be chosen.
  const [shown, setShown] = useState<Shown>(() => {
    const want = props.value ?? props.defaultValue;
    const first = want === undefined ? options.find((o) => !o.disabled) : options.find((o) => o.value === String(want));
    return { value: first?.value ?? '', label: first?.label ?? '', placeholder: !first || Boolean(first.disabled), name: ariaLabel ?? '' };
  });
  const [invalid, setInvalid] = useState(false);

  // What the select holds now — after a render (a controlled value), a choice, a reset or a test.
  const read = useCallback(() => {
    const select = native.current;
    if (!select) return;
    const option = select.selectedOptions[0];
    const next: Shown = {
      value: select.value,
      label: option?.text ?? '',
      placeholder: !option || option.disabled,
      name: ariaLabel ?? labelOf(select),
    };
    setShown((was) => (was.value === next.value && was.label === next.label && was.placeholder === next.placeholder && was.name === next.name ? was : next));
    // `validity.valid`, not checkValidity(): that fires `invalid`, and an empty required field turned red on its second render.
    if (select.validity.valid) setInvalid(false);
  }, [ariaLabel]);
  useLayoutEffect(read);
  useEffect(() => {
    const select = native.current;
    if (!select) return;
    const reset = () => setTimeout(read);
    const flag = () => setInvalid(true);
    const form = select.form;
    select.addEventListener('change', read);
    select.addEventListener('invalid', flag);
    form?.addEventListener('reset', reset);
    return () => {
      select.removeEventListener('change', read);
      select.removeEventListener('invalid', flag);
      form?.removeEventListener('reset', reset);
    };
  }, [read]);

  const choose = (value: string) => {
    const select = native.current;
    if (!select || select.value === value) return;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    read();
  };

  return (
    <span data-menu-select="" className={cn('relative', bare ? 'inline-flex max-w-full' : 'flex w-full', !bare && className)}>
      <select
        ref={native}
        {...props}
        disabled={disabled}
        aria-label={ariaLabel}
        tabIndex={-1}
        // Under the field: a label's click, or the form's „fill this in", lands on the field.
        onFocus={() => field.current?.focus()}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      >
        {children}
      </select>
      <DropdownMenu modal={false} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger
          ref={field}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={bare ? cn('inline-flex min-w-0 items-center text-left', className) : fieldClass}
        >
          {/* The field's name, read with the choice; the label itself belongs to the select underneath. */}
          {shown.name ? <span className="sr-only">{`${shown.name}: `}</span> : null}
          {bare ? (
            // A select is as wide as its longest option: the field keeps that width whatever is chosen.
            <span className="grid min-w-0">
              <span className="col-start-1 row-start-1 truncate">{shown.label}</span>
              {options.length <= 80
                ? options.map((o) => (
                    <span key={o.value || '_'} aria-hidden="true" className="invisible col-start-1 row-start-1 h-0 overflow-hidden whitespace-nowrap">
                      {o.label}
                    </span>
                  ))
                : null}
            </span>
          ) : (
            <>
              <span className={cn('min-w-0 flex-1 truncate', shown.placeholder && 'font-normal text-[var(--casa-text-subtle)]')}>{shown.label || '—'}</span>
              {Icon.chevronDown}
            </>
          )}
        </DropdownMenuTrigger>
        <MenuList options={options} value={shown.value} onPick={choose} host={host} fit={bare ? 'content' : 'field'} />
      </DropdownMenu>
    </span>
  );
}
