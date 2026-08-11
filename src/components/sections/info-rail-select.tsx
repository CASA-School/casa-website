'use client';

import { useRouter } from 'next/navigation';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type InfoRailSelectOption = {
  value: string;
  label: string;
  href: string;
};

type InfoRailSelectProps = {
  label: string;
  selectedValue: string;
  options: InfoRailSelectOption[];
};

export function InfoRailSelect({ label, selectedValue, options }: InfoRailSelectProps) {
  const router = useRouter();
  const currentValue =
    options.some((option) => option.value === selectedValue) && selectedValue
      ? selectedValue
      : (options[0]?.value ?? '');

  if (!currentValue) {
    return null;
  }

  return (
    <Select
      value={currentValue}
      onValueChange={(value) => {
        const nextOption = options.find((option) => option.value === value);
        if (nextOption) {
          router.push(nextOption.href, { scroll: false });
        }
      }}
    >
      <SelectTrigger
        aria-label={label}
        className="h-10 w-full rounded-xl border-[color:var(--casa-sand)] bg-white text-left text-sm font-semibold text-[var(--casa-ink)] focus-visible:ring-[var(--casa-blue)]/30"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
