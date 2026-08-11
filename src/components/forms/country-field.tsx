'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { getData } from 'country-list';
import { cn } from '@/lib/utils';

const countryNames = getData()
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

type CountryFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
};

export function CountryField({
  id,
  value,
  onChange,
  placeholder = 'Select nationality',
  searchPlaceholder = 'Search...',
  emptyLabel = 'No results found.',
  className,
  disabled,
}: CountryFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return countryNames;
    const lower = query.toLowerCase();
    return countryNames.filter((c) => c.toLowerCase().includes(lower));
  }, [query]);

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
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-4 text-left text-sm text-[var(--casa-ink)] transition-all',
          'focus:border-[var(--casa-blue)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--casa-blue)]/10',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isOpen && 'border-[var(--casa-blue)] bg-white ring-2 ring-[var(--casa-blue)]/10',
          className
        )}
      >
        <span className={cn(!value && 'text-slate-500')}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-[var(--casa-text-subtle)] transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown panel — styled identically to the DatePicker popover */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-[var(--shadow-modal)] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
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
                      : 'text-[var(--casa-ink)] hover:bg-slate-50'
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
