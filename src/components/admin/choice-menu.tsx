'use client';

import { useTransition, type ReactNode } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { Icon } from './icons';

/** A menu's panel: white, a fine edge, a soft lift. Shared with the top bar's menus. */
export const menuPanel =
  'casa-ws-menu min-w-56 rounded-ws-inner border-ws-line bg-white p-1.5 text-[var(--casa-ink)] shadow-[0_1px_2px_rgba(16,24,40,0.05),0_16px_36px_-12px_rgba(16,24,40,0.22)]';

/** A menu's item: the workspace's quiet list-row surface under the pointer. */
export const menuItem =
  'cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[0.84rem] font-medium text-[var(--casa-ink)] focus:bg-[var(--ws-row-hover)] focus:text-[var(--casa-ink)] [&_svg]:size-4 [&_svg]:text-[var(--casa-muted)]';

export type Choice = { value: string; label: ReactNode; current?: boolean; icon?: ReactNode };

/**
 * One value of a record, changed from a menu: the status's rarer states, who
 * has the record. The menu floats above the page (a panel inside a card would
 * be cut off by its edge) and aligns to its trigger; choosing posts the
 * record's fields and the choice to a server action, which revalidates the page.
 */
export function ChoiceMenu({
  action,
  fields,
  name,
  choices,
  label,
  trigger,
  triggerClassName,
  align = 'start',
}: {
  action: (formData: FormData) => Promise<void>;
  /** The record the choice is about: posted with it. */
  fields: Record<string, string>;
  /** The field the choice is posted as. */
  name: string;
  choices: readonly Choice[];
  /** The menu's heading, and the trigger's accessible name. */
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  align?: 'start' | 'end';
}) {
  const [pending, start] = useTransition();

  const choose = (value: string) => {
    const data = new FormData();
    for (const [key, field] of Object.entries(fields)) data.set(key, field);
    data.set(name, value);
    start(async () => {
      await action(data);
    });
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger aria-label={label} disabled={pending} className={cn(triggerClassName, pending && 'opacity-60')}>
        {trigger}
      </DropdownMenuTrigger>
      {/* Above a side panel or dialog (z-[1000]) when the menu sits in one, as MenuSelect's does. */}
      <DropdownMenuContent align={align} sideOffset={8} className={cn(menuPanel, 'z-[1100] max-h-[min(60vh,420px)]')}>
        <DropdownMenuLabel className="px-2.5 pt-1.5 pb-1 text-[0.72rem] font-bold text-[var(--casa-muted)]">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-1 my-1 bg-ws-line-soft" />
        {choices.map((choice) => (
          <DropdownMenuItem
            key={choice.value}
            className={cn(menuItem, choice.current && 'bg-[var(--ws-head)] font-semibold')}
            onSelect={() => {
              if (!choice.current) choose(choice.value);
            }}
          >
            {choice.icon}
            <span className="min-w-0 flex-1 truncate">{choice.label}</span>
            {choice.current ? (
              <span aria-hidden="true" className="text-[var(--fm-navy)] [&_svg]:!text-[var(--fm-navy)]">
                {Icon.check}
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
