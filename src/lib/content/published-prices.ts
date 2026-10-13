import {
  ACCOMMODATION_FEES,
  BOOK_PRICE_LOWER,
  BOOK_PRICE_UPPER,
  ENROLLMENT_FEE,
  EVENING_TRIMESTER_PRICES,
  EXAM_FEES,
  INTENSIVE_FULL_LEVEL_8_WEEKS,
  INTENSIVE_HALF_LEVEL_4_WEEKS,
  SPECIAL_COURSE_DEFAULT_PRICE,
  type CasaCalculatorPricing,
} from '@/config/calculator/pricing';
import { priceAt, tariffPrice, type PriceList } from '@/lib/admin/prices/price-list';

/**
 * The prices the public website shows. Pure.
 *
 * CASA's price list (Settings → Prices, src/lib/admin/prices) holds every
 * price an offer or a booking can need — the intensive course for each number
 * of weeks, short stays, every book. The website publishes a handful of them:
 * these. Each is one entry of the list in force today, so a price changed on
 * the Prices screen, or next year's list taking over on 1 January, changes the
 * site with it. Without a database, and for anything the list does not hold
 * (the preparation courses), the site shows the published figures in
 * src/config/calculator/pricing.ts.
 */
export type PublishedPrices = {
  intensive4Weeks: number;
  intensive8Weeks: number;
  /** The cheapest evening term still to come: "ab 378 €". */
  eveningFrom: number;
  /** The longest evening term's price, the calculator's planning basis. */
  eveningTerm: number;
  /** One special-course evening: two lessons. */
  specialPerEvening: number;
  /** A module of twelve evenings. */
  specialModule: number;
  enrolmentFee: number;
  rent4Weeks: number;
  rentExtraWeek: number;
  placementFee: number;
  deposit: number;
  exams: Record<'telc_b2' | 'telc_c1_hochschule', { full: number; part: number; prep: number }>;
  /** The cheapest and dearest course book. */
  books: [number, number];
};

const LESSONS_PER_EVENING = 2;
// A module has twelve evenings (special-course-modules.ts). Not imported from
// there: that module reads the copy layer, which reads these prices.
const EVENINGS_PER_MODULE = 12;

/** The published figures, for a site without a database. */
export const DEFAULT_PUBLISHED_PRICES: PublishedPrices = {
  intensive4Weeks: INTENSIVE_HALF_LEVEL_4_WEEKS,
  intensive8Weeks: INTENSIVE_FULL_LEVEL_8_WEEKS,
  eveningFrom: EVENING_TRIMESTER_PRICES.spring,
  eveningTerm: EVENING_TRIMESTER_PRICES.autumn,
  specialPerEvening: SPECIAL_COURSE_DEFAULT_PRICE / EVENINGS_PER_MODULE,
  specialModule: SPECIAL_COURSE_DEFAULT_PRICE,
  enrolmentFee: ENROLLMENT_FEE,
  rent4Weeks: ACCOMMODATION_FEES.base4Weeks,
  rentExtraWeek: ACCOMMODATION_FEES.perAdditionalWeek,
  placementFee: ACCOMMODATION_FEES.commissionFee,
  deposit: ACCOMMODATION_FEES.deposit,
  exams: {
    telc_b2: { full: EXAM_FEES.telcB2.examFull, part: EXAM_FEES.telcB2.examPartial, prep: EXAM_FEES.telcB2.prep },
    telc_c1_hochschule: { full: EXAM_FEES.telcC1.examFull, part: EXAM_FEES.telcC1.examPartial, prep: EXAM_FEES.telcC1.prep },
  },
  books: [BOOK_PRICE_LOWER, BOOK_PRICE_UPPER],
};

/**
 * The entries of a price list the website shows, by the Prices screen's slot
 * names — so the screen can say which prices a visitor sees.
 */
export const PUBLISHED_SLOTS: readonly string[] = [
  'course:intensive-german:4',
  'course:intensive-german:8',
  'course:evening-german:rate',
  'course:special-courses:rate',
  'rent:rate',
  'fee:enrolment_fee',
  'fee:accommodation_placement_fee',
  'fee:deposit',
  'exam:telc_b2:2',
  'exam:telc_b2:1',
  'exam:telc_c1_hochschule:2',
  'exam:telc_c1_hochschule:1',
];

/**
 * The website's prices from the list in force. `eveningTerms` are the evening
 * course's coming terms as the list prices them; `courseBooks` the course
 * books' material ids. Whatever the list lacks keeps its published figure.
 */
export function publishedFromList(list: PriceList | null, extra: { eveningTerms: number[]; courseBooks: string[] }): PublishedPrices {
  if (!list) return DEFAULT_PUBLISHED_PRICES;
  const d = DEFAULT_PUBLISHED_PRICES;
  const intensive = list.courses['intensive-german'];
  const at = (slot: Parameters<typeof priceAt>[1]) => priceAt(list, slot)?.amount;
  const perLesson = (slug: string) => {
    const rate = list.courses[slug]?.rate;
    return rate?.unit === 'lesson' ? rate.amount : null;
  };
  const special = perLesson('special-courses');
  const exam = (code: 'telc_b2' | 'telc_c1_hochschule') => ({
    full: at({ kind: 'exam', code, parts: 2 }) ?? d.exams[code].full,
    part: at({ kind: 'exam', code, parts: 1 }) ?? d.exams[code].part,
    prep: d.exams[code].prep,
  });
  const books = extra.courseBooks.map((id) => list.books[id]?.amount).filter((n): n is number => n != null);
  const rent4 = tariffPrice(list.rent, { weeks: 4 })?.amount;
  const extraWeek = list.rent.rate?.unit === 'week' ? list.rent.rate.amount : null;

  return {
    intensive4Weeks: tariffPrice(intensive, { weeks: 4 })?.amount ?? d.intensive4Weeks,
    intensive8Weeks: tariffPrice(intensive, { weeks: 8 })?.amount ?? d.intensive8Weeks,
    eveningFrom: extra.eveningTerms.length ? Math.min(...extra.eveningTerms) : d.eveningFrom,
    eveningTerm: extra.eveningTerms.length ? Math.max(...extra.eveningTerms) : d.eveningTerm,
    specialPerEvening: special != null ? special * LESSONS_PER_EVENING : d.specialPerEvening,
    specialModule: special != null ? special * LESSONS_PER_EVENING * EVENINGS_PER_MODULE : d.specialModule,
    enrolmentFee: list.fees.enrolment_fee?.amount ?? d.enrolmentFee,
    rent4Weeks: rent4 ?? d.rent4Weeks,
    rentExtraWeek: extraWeek ?? d.rentExtraWeek,
    placementFee: list.fees.accommodation_placement_fee?.amount ?? d.placementFee,
    deposit: list.fees.deposit?.amount ?? d.deposit,
    exams: { telc_b2: exam('telc_b2'), telc_c1_hochschule: exam('telc_c1_hochschule') },
    books: books.length ? [Math.min(...books), Math.max(...books)] : d.books,
  };
}

/** The "from" price of a course the price list prices; undefined for one it does not. */
export function publishedCourseFrom(prices: PublishedPrices, slug: string): number | undefined {
  if (slug === 'intensive-german') return prices.intensive4Weeks;
  if (slug === 'evening-german') return prices.eveningFrom;
  if (slug === 'special-courses') return prices.specialModule;
  return undefined;
}

/** The calculator's prices. */
export function calculatorPricing(prices: PublishedPrices): CasaCalculatorPricing {
  return {
    currency: 'EUR',
    enrollmentFee: prices.enrolmentFee,
    intensive: { halfLevel4Weeks: prices.intensive4Weeks, fullLevel8Weeks: prices.intensive8Weeks, bookRangePerBook: prices.books },
    evening: { halfLevelTrimester: prices.eveningTerm, textbookStrategy: 'reuseIntensiveRange', textbookRangePerBook: prices.books },
    specialCourse: { unitPrice: prices.specialModule },
    exams: {
      telcB2: { prep: prices.exams.telc_b2.prep, examFull: prices.exams.telc_b2.full, examPartial: prices.exams.telc_b2.part },
      telcC1: { prep: prices.exams.telc_c1_hochschule.prep, examFull: prices.exams.telc_c1_hochschule.full, examPartial: prices.exams.telc_c1_hochschule.part },
    },
    accommodation: {
      base4Weeks: prices.rent4Weeks,
      perAdditionalWeek: prices.rentExtraWeek,
      commissionFee: prices.placementFee,
      deposit: prices.deposit,
      holidaySurchargeHostFamilyPerWeek: prices.rentExtraWeek,
      holidaySurchargeSharedFlatPerWeek: prices.rentExtraWeek,
    },
  };
}
