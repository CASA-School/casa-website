export type CompareType = 'course' | 'exam';

export type CompareItem = {
  id: string;
  title: string;
  href: string;
  meta?: string;
};

const STORAGE_KEY: Record<CompareType, string> = {
  course: 'casa-compare-course',
  exam: 'casa-compare-exam',
};
const MAX_COMPARE_ITEMS = 2;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function parseStoredItems(value: string | null): CompareItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as CompareItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => Boolean(item?.id && item?.title && item?.href))
      .slice(0, MAX_COMPARE_ITEMS);
  } catch {
    return [];
  }
}

export function getCompareItems(type: CompareType): CompareItem[] {
  if (!canUseStorage()) {
    return [];
  }

  return parseStoredItems(window.localStorage.getItem(STORAGE_KEY[type]));
}

export function setCompareItems(type: CompareType, items: CompareItem[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY[type], JSON.stringify(items));
}

export function toggleCompareItem(type: CompareType, item: CompareItem, maxItems = MAX_COMPARE_ITEMS): CompareItem[] {
  const current = getCompareItems(type);
  const exists = current.some((entry) => entry.id === item.id);

  if (exists) {
    const next = current.filter((entry) => entry.id !== item.id);
    setCompareItems(type, next);
    emitCompareUpdated(type);
    return next;
  }

  const safeMaxItems = Math.max(1, maxItems);
  if (current.length >= safeMaxItems) {
    return current;
  }

  const next = [...current, item];
  setCompareItems(type, next);
  emitCompareUpdated(type);
  return next;
}

export function removeCompareItem(type: CompareType, itemId: string): CompareItem[] {
  const next = getCompareItems(type).filter((item) => item.id !== itemId);
  setCompareItems(type, next);
  emitCompareUpdated(type);
  return next;
}

export function clearCompareItems(type: CompareType) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY[type]);
  emitCompareUpdated(type);
}

export function emitCompareUpdated(type: CompareType) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('casa:compare-updated', { detail: { type } }));
}
