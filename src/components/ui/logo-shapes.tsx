import { cn } from '@/lib/utils';

type CasaShapeTone = 'blue' | 'sun' | 'red' | 'amber' | 'coral' | 'ink' | 'white';
type TriangleDirection = 'up' | 'right' | 'down' | 'left';

type CasaLogoShapeProps = {
  className?: string;
  tone?: CasaShapeTone;
  decorative?: boolean;
};

type CasaTriangleShapeProps = CasaLogoShapeProps & {
  direction?: TriangleDirection;
};

const toneClassByKey: Record<CasaShapeTone, string> = {
  blue: 'text-[var(--casa-accent-text)]',
  sun: 'text-[var(--casa-sun)]',
  red: 'text-[var(--casa-red)]',
  amber: 'text-[var(--casa-amber)]',
  coral: 'text-[var(--casa-coral)]',
  ink: 'text-[var(--casa-ink-deep)]',
  white: 'text-white',
};

const triangleDirectionClassByKey: Record<TriangleDirection, string> = {
  up: '',
  right: 'rotate-90',
  down: 'rotate-180',
  left: '-rotate-90',
};

function shapeAccessibilityProps(decorative: boolean) {
  if (decorative) {
    return { 'aria-hidden': true as const };
  }

  return { role: 'img' as const };
}

export function CasaRoundedShape({
  className,
  tone = 'sun',
  decorative = true,
}: CasaLogoShapeProps) {
  return (
    <svg
      viewBox="0 0 168 112"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-16 w-24', toneClassByKey[tone], className)}
      fill="none"
      {...shapeAccessibilityProps(decorative)}
    >
      <path
        d="M16 62.5C16 34.1 37.9 12 65.8 12H101.4C129.8 12 152 34.3 152 62.3C152 88.4 131.8 100 106.7 100H62.7C34.7 100 16 86.7 16 62.5Z"
        fill="currentColor"
      />
      <path
        d="M64.5 24.5C49.3 27.1 36.5 37.2 32.1 52.9"
        stroke="white"
        strokeOpacity="0.34"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CasaTriangleShape({
  className,
  tone = 'red',
  direction = 'up',
  decorative = true,
}: CasaTriangleShapeProps) {
  return (
    <svg
      viewBox="0 0 120 106"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-14 w-14 transform-gpu', toneClassByKey[tone], triangleDirectionClassByKey[direction], className)}
      fill="none"
      {...shapeAccessibilityProps(decorative)}
    >
      <path
        d="M59.8 12.5L103.1 80H16.8L59.8 12.5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinejoin="round"
      />
      <path d="M60.1 30.2L80.7 66.5H39.3L60.1 30.2Z" fill="white" fillOpacity="0.2" />
    </svg>
  );
}
