'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { getData } from 'country-list';
import { formControlClassName, formControlOpenClassName } from '@/components/forms/form-styles';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

/*
 * Countries in the page's language (2026-10-05). The list printed
 * `country-list`'s English ISO names on the German form too ("Germany",
 * "Korea (the Republic of)"). Each code is now named as the platform names it
 * in the page's language ("Deutschland", "Südkorea"; "South Korea" in
 * English) and sorted the way that language sorts. The name chosen is what is
 * sent; lib/admin/normalize.ts reads it back to its code in either language.
 */
const namesByLocale = new Map<ContentLocale, string[]>();

function countryNames(locale: ContentLocale): string[] {
  const cached = namesByLocale.get(locale);
  if (cached) return cached;
  const display = new Intl.DisplayNames([locale], { type: 'region' });
  const names = [...new Set(getData().map((entry) => display.of(entry.code) ?? entry.name))].sort((a, b) => a.localeCompare(b, locale));
  namesByLocale.set(locale, names);
  return names;
}

/** For the search: no accents, one apostrophe, lower case, so "osterr" finds Österreich and "cote d'" Côte d’Ivoire. */
const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").toLowerCase();

type CountryFieldProps = {
  id: string;
  /** The page's language, which the countries are named in. */
  locale: ContentLocale;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  'aria-describedby'?: string;
  /** Draws the field in its error state; a button may not carry aria-invalid. */
  invalid?: boolean;
};

export function CountryField({
  id,
  locale,
  value,
  onChange,
  placeholder = 'Select nationality',
  searchPlaceholder = 'Search...',
  emptyLabel = 'No results found.',
  className,
  disabled,
  'aria-describedby': ariaDescribedBy,
  invalid,
}: CountryFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const names = countryNames(locale);
    const wanted = fold(query.trim());
    return wanted ? names.filter((name) => fold(name).includes(wanted)) : names;
  }, [locale, query]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setQuery('');
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleSelect = (country: string) => {
    onChange(country);
    setQuery('');
    setIsOpen(false);
  };

  const toggleOpen = () => {
    if (isOpen) {
      setQuery('');
    }
    setIsOpen((current) => !current);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger — styled identically to the DatePicker trigger */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        aria-describedby={ariaDescribedBy}
        data-invalid={invalid || undefined}
        className={cn(
          formControlClassName,
          'flex items-center justify-between gap-2 disabled:cursor-not-allowed disabled:opacity-50',
          isOpen && formControlOpenClassName,
          className
        )}
      >
        {/* One line: German names run long ("St. Vincent und die Grenadinen"). */}
        <span className={cn('min-w-0 truncate', !value && 'text-[var(--casa-muted)]')}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--casa-accent-text)] transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown panel — styled identically to the DatePicker popover */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-full rounded-lg border border-[color:var(--casa-sand)] bg-white shadow-[var(--shadow-modal)] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-[color:var(--casa-sand)]/70 px-3 py-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--casa-text-subtle)]" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-[var(--casa-ink)] placeholder:text-[var(--casa-text-subtle)] outline-none"
            />
          </div>

          {/* List */}
          <ul className="max-h-60 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--casa-text-subtle)]">{emptyLabel}</li>
            ) : (
              filtered.map((country) => (
                <li
                  key={country}
                  role="option"
                  aria-selected={country === value}
                  onMouseDown={() => handleSelect(country)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors',
                    country === value
                      ? 'bg-[var(--casa-blue)]/8 font-semibold text-[var(--casa-accent-text)]'
                      : 'text-[var(--casa-ink)] hover:bg-[var(--casa-canvas)]'
                  )}
                >
                  {country}
                  {country === value && <Check className="h-3.5 w-3.5 shrink-0" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
