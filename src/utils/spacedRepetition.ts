// SuperMemo SM-2 Spaced Repetition Algorithm Engine

export type SM2Grade = 1 | 2 | 3 | 4; // 1: Quên, 2: Khó, 3: Nhớ tốt, 4: Rất dễ

export interface SM2State {
  id: string;
  repetition: number;
  interval: number; // in days
  easeFactor: number; // typically 1.3 to 2.5+
  nextReviewDate: string; // ISO date string
  lastReviewedDate?: string;
  reviewCount: number;
  type: 'word' | 'question';
}

const STORAGE_KEY = 'mcq_spaced_repetition_v1';

export const getSM2Records = (): Record<string, SM2State> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const saveSM2Records = (records: Record<string, SM2State>): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new Event('mcq_sm2_updated'));
  } catch (e) {
    console.error('Error saving SM-2 records', e);
  }
};

export const getSM2Item = (id: string, type: 'word' | 'question' = 'word'): SM2State => {
  const records = getSM2Records();
  if (records[id]) {
    return records[id];
  }
  return {
    id,
    repetition: 0,
    interval: 0,
    easeFactor: 2.5,
    nextReviewDate: new Date().toISOString(),
    reviewCount: 0,
    type,
  };
};

/**
 * Calculates new interval, repetition, and ease factor using SM-2 algorithm
 */
export const reviewSM2Item = (
  id: string,
  grade: SM2Grade,
  type: 'word' | 'question' = 'word'
): SM2State => {
  const current = getSM2Item(id, type);
  let { repetition, interval, easeFactor } = current;

  if (grade === 1) {
    // Forgot / Blackout
    repetition = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (grade === 2) {
    // Hard
    repetition = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (grade === 3) {
    // Good
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
    easeFactor = Math.max(1.3, easeFactor + 0.05);
  } else if (grade === 4) {
    // Easy
    if (repetition === 0) {
      interval = 2;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor * 1.3);
    }
    repetition += 1;
    easeFactor = Math.max(1.3, easeFactor + 0.15);
  }

  // Calculate next review timestamp (interval days from now)
  const now = new Date();
  const nextDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  const updated: SM2State = {
    id,
    repetition,
    interval,
    easeFactor: Number(easeFactor.toFixed(2)),
    nextReviewDate: nextDate.toISOString(),
    lastReviewedDate: now.toISOString(),
    reviewCount: current.reviewCount + 1,
    type,
  };

  const records = getSM2Records();
  records[id] = updated;
  saveSM2Records(records);

  return updated;
};

/**
 * Check if an item is due for review today or overdue
 */
export const isItemDue = (id: string, type: 'word' | 'question' = 'word'): boolean => {
  const item = getSM2Item(id, type);
  if (!item.lastReviewedDate) return true; // Never reviewed -> due immediately
  const nextTime = new Date(item.nextReviewDate).getTime();
  const now = Date.now();
  return now >= nextTime;
};

/**
 * Get all due items from the SM-2 record store
 */
export const getSM2DueItems = (): SM2State[] => {
  const records = getSM2Records();
  const now = Date.now();
  return Object.values(records).filter((item) => {
    if (!item.lastReviewedDate) return true;
    return now >= new Date(item.nextReviewDate).getTime();
  });
};

/**
 * Get count of due items for a given list of item IDs
 */
export const countDueItems = (ids: string[], type: 'word' | 'question' = 'word'): number => {
  return ids.filter((id) => isItemDue(id, type)).length;
};

