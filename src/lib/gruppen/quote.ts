import {
  GRUPPEN_MODULES,
  MAX_ACTIVITIES_PER_WEEK,
  TEACHING_UNITS_PER_WEEK,
  getActivity,
  type GruppenActivityId,
  type GruppenModuleId,
  type GruppenWeeks,
} from '@/config/gruppen/packages';

export type EselQuoteInput = {
  weeks: GruppenWeeks;
  /** Group head count. Drives the group total, never the per-person price. */
  participants: number;
  /** Modules switched on. The language class is always billed. */
  modules: GruppenModuleId[];
  activities: GruppenActivityId[];
};

export type QuoteLine = {
  id: string;
  kind: 'module' | 'activity';
  /** Per-person price in EUR. */
  amount: number;
};

export type EselQuote = {
  moduleLines: QuoteLine[];
  activityLines: QuoteLine[];
  moduleSubtotal: number;
  activitySubtotal: number;
  /** Per-person total in EUR. */
  perPerson: number;
  /** `perPerson` multiplied by the head count. */
  groupTotal: number;
  teachingUnits: number;
  activityAllowance: number;
  activitiesRemaining: number;
  overActivityAllowance: boolean;
};

/**
 * Prices the modular "Esel" package.
 *
 * Every figure comes from `Gruppenreise Esel_Auswahl.xlsx`: modules are priced per
 * person for the whole stay (not per week), and cultural activities are priced per
 * person per booking. The sheet caps activities at five per week, which we surface
 * rather than silently clamp — a group that wants a sixth should be able to ask.
 */
export function calculateEselQuote(input: EselQuoteInput): EselQuote {
  const weeks = input.weeks;
  const selected = new Set(input.modules);

  const moduleLines = GRUPPEN_MODULES.filter(
    (module) => module.required || selected.has(module.id)
  ).map<QuoteLine>((module) => ({
    id: module.id,
    kind: 'module',
    amount: module.priceByWeeks[weeks],
  }));

  // De-duplicate: a group cannot book the same museum twice in one quote.
  const activityLines = Array.from(new Set(input.activities)).map<QuoteLine>((id) => ({
    id,
    kind: 'activity',
    amount: getActivity(id).price,
  }));

  const moduleSubtotal = moduleLines.reduce((total, line) => total + line.amount, 0);
  const activitySubtotal = activityLines.reduce((total, line) => total + line.amount, 0);
  const perPerson = moduleSubtotal + activitySubtotal;
  const participants = Math.max(1, Math.floor(input.participants));
  const activityAllowance = weeks * MAX_ACTIVITIES_PER_WEEK;

  return {
    moduleLines,
    activityLines,
    moduleSubtotal,
    activitySubtotal,
    perPerson,
    groupTotal: perPerson * participants,
    teachingUnits: weeks * TEACHING_UNITS_PER_WEEK,
    activityAllowance,
    activitiesRemaining: activityAllowance - activityLines.length,
    overActivityAllowance: activityLines.length > activityAllowance,
  };
}
