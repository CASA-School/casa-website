'use client';

import { useRouter } from '@/i18n/navigation';

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
      {/*
        The trigger takes the primitive's brand defaults — 44px, 4px control
        radius, sand border, accent chevron — rather than the h-10 / rounded-xl
        / bg-white set it used to override them with, which was a third trigger
        look on a site whose forms had already settled on one. What it adds is
        the card's own value type: `text-base font-semibold`, because this
        control sits in a column of values ("A1 – C1", "from €520") that are
        17px/600, and at the primitive's 14px it read as a smaller, secondary
        fact instead of the date it is.
      */}
      <SelectTrigger
        aria-label={label}
        className="w-full bg-[var(--casa-surface-wash)] text-left text-base font-semibold text-[var(--casa-ink)]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-base">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
