import { syncStudyProgressToFirestore } from '../lib/firebase';
import { realtimeSync } from './realtimeSync';

export interface FlashcardProgressState {
  currentIndex: number;
  cardIds?: string[];
  isFlipped?: boolean;
  direction?: 'jp-to-vi' | 'vi-to-jp';
  masteredIds: string[];
  savedAt: string;
}

export interface TypingProgressState {
  currentIndex: number;
  cardIds?: string[];
  score: number;
  wrongCardIds: string[];
  seconds: number;
  inputVal?: string;
  savedAt: string;
}

export interface MultiChoiceProgressState {
  currentIndex: number;
  cardIds?: string[];
  score: number;
  streak: number;
  seconds: number;
  missedCardIds: string[];
  savedAt: string;
}

export interface KanjiFlashcardProgressState {
  currentIndex: number;
  kanjiIds?: string[];
  isFlipped?: boolean;
  masteredIds: string[];
  savedAt: string;
}

// Keys
const FLASHCARD_PREFIX = 'jp_progress_flashcard_';
const TYPING_PREFIX = 'jp_progress_typing_';
const MULTICHOICE_PREFIX = 'jp_progress_multichoice_';
const KANJI_FLASHCARD_PREFIX = 'jp_progress_kanji_';

function getUserEmail(): string {
  try {
    const raw = localStorage.getItem('mcq_user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.email) return user.email.toLowerCase().trim();
    }
  } catch {}
  return '';
}

export function updateStudyProgressFromCloud(items: Record<string, any>): void {
  if (typeof window === 'undefined') return;
  try {
    Object.entries(items).forEach(([key, val]) => {
      localStorage.setItem(key, JSON.stringify(val));

      // Notify any currently active Japanese study component in this tab
      if (key.startsWith(FLASHCARD_PREFIX) && typeof val?.currentIndex === 'number') {
        const lessonId = key.substring(FLASHCARD_PREFIX.length);
        realtimeSync.notifyLocal('JP_FLASHCARD', lessonId, val.currentIndex, val);
      } else if (key.startsWith(TYPING_PREFIX) && typeof val?.currentIndex === 'number') {
        const lessonId = key.substring(TYPING_PREFIX.length);
        realtimeSync.notifyLocal('JP_TYPING', lessonId, val.currentIndex, val);
      } else if (key.startsWith(MULTICHOICE_PREFIX) && typeof val?.currentIndex === 'number') {
        const lessonId = key.substring(MULTICHOICE_PREFIX.length);
        realtimeSync.notifyLocal('JP_MULTICHOICE', lessonId, val.currentIndex, val);
      } else if (key.startsWith(KANJI_FLASHCARD_PREFIX) && typeof val?.currentIndex === 'number') {
        const folderId = key.substring(KANJI_FLASHCARD_PREFIX.length);
        realtimeSync.notifyLocal('JP_KANJI', folderId, val.currentIndex, val);
      }
    });
  } catch (e) {
    console.error('Error updating study progress from cloud:', e);
  }
}

// 1. Flashcard
export function saveFlashcardProgress(
  lessonId: string,
  state: Omit<FlashcardProgressState, 'savedAt'>,
  skipBroadcast = false
): void {
  if (typeof window === 'undefined' || !lessonId) return;
  try {
    const data: FlashcardProgressState = {
      ...state,
      savedAt: new Date().toISOString(),
    };
    const key = `${FLASHCARD_PREFIX}${lessonId}`;
    localStorage.setItem(key, JSON.stringify(data));

    // Broadcast to other tabs (< 5ms)
    if (!skipBroadcast) {
      realtimeSync.broadcast('JP_FLASHCARD', lessonId, data.currentIndex, data);
    }

    const email = getUserEmail();
    if (email) {
      syncStudyProgressToFirestore(email, key, data).catch(() => {});
    }
  } catch (e) {
    console.error('Failed to save flashcard progress:', e);
  }
}

export function getFlashcardProgress(lessonId: string): FlashcardProgressState | null {
  if (typeof window === 'undefined' || !lessonId) return null;
  try {
    const raw = localStorage.getItem(`${FLASHCARD_PREFIX}${lessonId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearFlashcardProgress(lessonId: string): void {
  if (typeof window === 'undefined' || !lessonId) return;
  try {
    localStorage.removeItem(`${FLASHCARD_PREFIX}${lessonId}`);
    realtimeSync.broadcast('JP_FLASHCARD', lessonId, 0, { currentIndex: 0, masteredIds: [] });
  } catch (e) {
    console.error(e);
  }
}

// 2. Typing
export function saveTypingProgress(
  lessonId: string,
  state: Omit<TypingProgressState, 'savedAt'>,
  skipBroadcast = false
): void {
  if (typeof window === 'undefined' || !lessonId) return;
  try {
    const data: TypingProgressState = {
      ...state,
      savedAt: new Date().toISOString(),
    };
    const key = `${TYPING_PREFIX}${lessonId}`;
    localStorage.setItem(key, JSON.stringify(data));

    // Broadcast to other tabs (< 5ms)
    if (!skipBroadcast) {
      realtimeSync.broadcast('JP_TYPING', lessonId, data.currentIndex, data);
    }

    const email = getUserEmail();
    if (email) {
      syncStudyProgressToFirestore(email, key, data).catch(() => {});
    }
  } catch (e) {
    console.error('Failed to save typing progress:', e);
  }
}

export function getTypingProgress(lessonId: string): TypingProgressState | null {
  if (typeof window === 'undefined' || !lessonId) return null;
  try {
    const raw = localStorage.getItem(`${TYPING_PREFIX}${lessonId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearTypingProgress(lessonId: string): void {
  if (typeof window === 'undefined' || !lessonId) return;
  try {
    localStorage.removeItem(`${TYPING_PREFIX}${lessonId}`);
    realtimeSync.broadcast('JP_TYPING', lessonId, 0, { currentIndex: 0 });
  } catch (e) {
    console.error(e);
  }
}

// 3. Multichoice
export function saveMultiChoiceProgress(
  lessonId: string,
  state: Omit<MultiChoiceProgressState, 'savedAt'>,
  skipBroadcast = false
): void {
  if (typeof window === 'undefined' || !lessonId) return;
  try {
    const data: MultiChoiceProgressState = {
      ...state,
      savedAt: new Date().toISOString(),
    };
    const key = `${MULTICHOICE_PREFIX}${lessonId}`;
    localStorage.setItem(key, JSON.stringify(data));

    // Broadcast to other tabs (< 5ms)
    if (!skipBroadcast) {
      realtimeSync.broadcast('JP_MULTICHOICE', lessonId, data.currentIndex, data);
    }

    const email = getUserEmail();
    if (email) {
      syncStudyProgressToFirestore(email, key, data).catch(() => {});
    }
  } catch (e) {
    console.error('Failed to save multichoice progress:', e);
  }
}

export function getMultiChoiceProgress(lessonId: string): MultiChoiceProgressState | null {
  if (typeof window === 'undefined' || !lessonId) return null;
  try {
    const raw = localStorage.getItem(`${MULTICHOICE_PREFIX}${lessonId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearMultiChoiceProgress(lessonId: string): void {
  if (typeof window === 'undefined' || !lessonId) return;
  try {
    localStorage.removeItem(`${MULTICHOICE_PREFIX}${lessonId}`);
    realtimeSync.broadcast('JP_MULTICHOICE', lessonId, 0, { currentIndex: 0 });
  } catch (e) {
    console.error(e);
  }
}

// 4. Kanji Flashcard
export function saveKanjiFlashcardProgress(
  folderId: string,
  state: Omit<KanjiFlashcardProgressState, 'savedAt'>,
  skipBroadcast = false
): void {
  if (typeof window === 'undefined' || !folderId) return;
  try {
    const data: KanjiFlashcardProgressState = {
      ...state,
      savedAt: new Date().toISOString(),
    };
    const key = `${KANJI_FLASHCARD_PREFIX}${folderId}`;
    localStorage.setItem(key, JSON.stringify(data));

    // Broadcast to other tabs (< 5ms)
    if (!skipBroadcast) {
      realtimeSync.broadcast('JP_KANJI', folderId, data.currentIndex, data);
    }

    const email = getUserEmail();
    if (email) {
      syncStudyProgressToFirestore(email, key, data).catch(() => {});
    }
  } catch (e) {
    console.error('Failed to save kanji flashcard progress:', e);
  }
}

export function getKanjiFlashcardProgress(folderId: string): KanjiFlashcardProgressState | null {
  if (typeof window === 'undefined' || !folderId) return null;
  try {
    const raw = localStorage.getItem(`${KANJI_FLASHCARD_PREFIX}${folderId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearKanjiFlashcardProgress(folderId: string): void {
  if (typeof window === 'undefined' || !folderId) return;
  try {
    localStorage.removeItem(`${KANJI_FLASHCARD_PREFIX}${folderId}`);
    realtimeSync.broadcast('JP_KANJI', folderId, 0, { currentIndex: 0 });
  } catch (e) {
    console.error(e);
  }
}
