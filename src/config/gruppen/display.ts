import type { EselPriceDisplay } from '@/components/gruppen/esel-builder';

/**
 * How much of the Esel price sheet the builder reveals, inside the CASA Gruppen
 * section of /courses/german-for-groups.
 *
 * Both treatments were built and compared side by side. The decision went to
 * totals: a per-line price on all sixteen afternoons is more detail than an
 * organiser needs, it turns a programme into a menu, and it lets a reader
 * rebuild a fixed package from its parts and find it cheaper. The per-person
 * and group totals still move as the selection changes, which is the part that
 * has to stay visible. Flipping back is a one-word change here.
 */
export const ESEL_PRICE_DISPLAY: EselPriceDisplay = 'total';
