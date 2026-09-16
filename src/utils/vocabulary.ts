import { syncStarredVocabularyToFirestore } from '../lib/firebase';

export interface StarredWord {
  id: string;
  word: string;
  translation: string;
  quizId?: string;
  quizTitle?: string;
  subject?: string;
  topic?: string;
  contextSentence?: string;
  createdAt: string;
  userNote?: string;
}

const STORAGE_KEY = 'mcq_starred_vocabulary_v1';

export const getStarredWords = (): StarredWord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    // Normalize and ensure each item has quizTitle and subject
    return parsed.map((item) => {
      const qTitle = item.quizTitle?.trim() || item.subject?.trim() || 'Chung';
      return {
        ...item,
        quizTitle: qTitle,
        subject: item.subject?.trim() || qTitle,
      };
    });
  } catch (e) {
    console.error('Error reading starred vocabulary', e);
    return [];
  }
};

export const saveStarredWords = (words: StarredWord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    window.dispatchEvent(new Event('mcq_vocabulary_updated'));

    // Real-time Cloud Sync across PC and Mobile
    let email = '';
    try {
      const u = localStorage.getItem('mcq_user');
      if (u) email = JSON.parse(u)?.email || '';
    } catch {}
    if (email) {
      syncStarredVocabularyToFirestore(email, words).catch((e) =>
        console.warn('Sync vocabulary error:', e)
      );
    }
  } catch (e) {
    console.error('Error saving starred vocabulary', e);
  }
};

export const updateStarredWordsFromCloud = (cloudWords: StarredWord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudWords));
    window.dispatchEvent(new Event('mcq_vocabulary_updated'));
  } catch (e) {
    console.error('Error updating starred vocabulary from cloud', e);
  }
};

export const isWordStarred = (rawWord: string, quizTitle?: string): boolean => {
  if (!rawWord) return false;
  const clean = rawWord.trim().toLowerCase();
  const words = getStarredWords();
  if (quizTitle && quizTitle.trim()) {
    const targetQ = quizTitle.trim().toLowerCase();
    return words.some(
      (w) => w.word.toLowerCase() === clean && (w.quizTitle || 'Chung').toLowerCase() === targetQ
    );
  }
  return words.some((w) => w.word.toLowerCase() === clean);
};

export const getStarredWord = (rawWord: string, quizTitle?: string): StarredWord | undefined => {
  if (!rawWord) return undefined;
  const clean = rawWord.trim().toLowerCase();
  const words = getStarredWords();
  if (quizTitle && quizTitle.trim()) {
    const targetQ = quizTitle.trim().toLowerCase();
    const matchQuiz = words.find(
      (w) => w.word.toLowerCase() === clean && (w.quizTitle || 'Chung').toLowerCase() === targetQ
    );
    if (matchQuiz) return matchQuiz;
  }
  return words.find((w) => w.word.toLowerCase() === clean);
};

export const toggleStarredWord = (
  rawWord: string,
  translation: string,
  contextSentence?: string,
  quizTitle?: string,
  quizId?: string,
  subject?: string
): boolean => {
  if (!rawWord) return false;
  const clean = rawWord.trim();
  const cleanLower = clean.toLowerCase();
  const words = getStarredWords();

  const effectiveQuizTitle = quizTitle && quizTitle.trim() ? quizTitle.trim() : 'Chung';
  const effectiveSubject = subject && subject.trim() ? subject.trim() : effectiveQuizTitle;

  // Match by word and same quiz if quizTitle is specified
  const existingIndex = words.findIndex((w) => {
    const sameWord = w.word.toLowerCase() === cleanLower;
    if (!sameWord) return false;
    if (quizTitle) {
      return (w.quizTitle || 'Chung').toLowerCase() === effectiveQuizTitle.toLowerCase();
    }
    return true;
  });

  if (existingIndex >= 0) {
    // Remove if already starred in this quiz
    words.splice(existingIndex, 1);
    saveStarredWords(words);
    return false; // Now unstarred
  } else {
    // Add new starred word
    const newWordItem: StarredWord = {
      id: `word_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      word: clean,
      translation: translation || 'Chưa có bản dịch',
      quizId: quizId || undefined,
      quizTitle: effectiveQuizTitle,
      subject: effectiveSubject,
      contextSentence: contextSentence ? contextSentence.substring(0, 180) : undefined,
      createdAt: new Date().toISOString(),
    };
    words.unshift(newWordItem);
    saveStarredWords(words);
    return true; // Now starred
  }
};

export const addOrUpdateStarredWord = (
  wordData: Partial<StarredWord> & { word: string; translation: string }
): StarredWord => {
  const words = getStarredWords();
  const clean = wordData.word.trim();
  const cleanLower = clean.toLowerCase();
  const effectiveQuizTitle = wordData.quizTitle?.trim() || wordData.subject?.trim() || 'Chung';
  const effectiveSubject = wordData.subject?.trim() || effectiveQuizTitle;

  const existingIndex = words.findIndex((w) => {
    return (
      w.word.toLowerCase() === cleanLower &&
      (w.quizTitle || 'Chung').toLowerCase() === effectiveQuizTitle.toLowerCase()
    );
  });

  if (existingIndex >= 0) {
    const updatedItem: StarredWord = {
      ...words[existingIndex],
      ...wordData,
      word: clean,
      quizTitle: effectiveQuizTitle,
      subject: effectiveSubject,
    };
    words[existingIndex] = updatedItem;
    saveStarredWords(words);
    return updatedItem;
  } else {
    const newItem: StarredWord = {
      id: wordData.id || `word_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      word: clean,
      translation: wordData.translation.trim() || 'Chưa có bản dịch',
      quizId: wordData.quizId,
      quizTitle: effectiveQuizTitle,
      subject: effectiveSubject,
      topic: wordData.topic?.trim() || undefined,
      contextSentence: wordData.contextSentence?.trim() || undefined,
      userNote: wordData.userNote?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    words.unshift(newItem);
    saveStarredWords(words);
    return newItem;
  }
};

export const updateWordDetails = (id: string, updates: Partial<StarredWord>): void => {
  const words = getStarredWords();
  const targetIndex = words.findIndex((w) => w.id === id);
  if (targetIndex >= 0) {
    const prev = words[targetIndex];
    const newQuizTitle = updates.quizTitle !== undefined ? (updates.quizTitle.trim() || 'Chung') : prev.quizTitle;
    const newSubject = updates.subject !== undefined ? (updates.subject.trim() || newQuizTitle || 'Chung') : prev.subject;

    words[targetIndex] = {
      ...prev,
      ...updates,
      quizTitle: newQuizTitle,
      subject: newSubject,
    };
    saveStarredWords(words);
  }
};

export const updateWordQuiz = (id: string, quizTitle: string, quizId?: string): void => {
  const cleanQ = quizTitle.trim() || 'Chung';
  updateWordDetails(id, { quizTitle: cleanQ, quizId, subject: cleanQ });
};

export const updateWordSubject = (id: string, subject: string): void => {
  updateWordDetails(id, { subject: subject.trim() || 'Chung' });
};

export const updateWordNote = (id: string, note: string): void => {
  const words = getStarredWords();
  const target = words.find((w) => w.id === id);
  if (target) {
    target.userNote = note;
    saveStarredWords(words);
  }
};

export const removeStarredWordById = (id: string): void => {
  const words = getStarredWords();
  const updated = words.filter((w) => w.id !== id);
  saveStarredWords(updated);
};

export const clearAllStarredWords = (quizFilter?: string): void => {
  if (!quizFilter || quizFilter === 'ALL') {
    saveStarredWords([]);
  } else {
    const words = getStarredWords();
    const cleanFilter = quizFilter.toLowerCase();
    const updated = words.filter(
      (w) =>
        (w.quizTitle || 'Chung').toLowerCase() !== cleanFilter &&
        (w.subject || 'Chung').toLowerCase() !== cleanFilter
    );
    saveStarredWords(updated);
  }
};

export const getAllQuizTitlesWithWords = (): string[] => {
  const words = getStarredWords();
  const set = new Set<string>();
  words.forEach((w) => {
    const qTitle = w.quizTitle?.trim() || w.subject?.trim() || 'Chung';
    set.add(qTitle);
  });
  return Array.from(set).sort();
};

export const getSuggestedQuizzes = (): { id?: string; title: string }[] => {
  const map = new Map<string, string | undefined>();

  // Collect from cached quizzes
  try {
    const user = localStorage.getItem('mcq_user');
    const userEmail = user ? JSON.parse(user)?.email : '';
    const sanitized = userEmail ? userEmail.replace(/[^a-z0-9]/g, '_') : 'guest';
    const raw = localStorage.getItem(`mcq_master_quizzes_v1_${sanitized}`);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((q: any) => {
          if (q.title && q.title.trim()) {
            map.set(q.title.trim(), q.id);
          }
        });
      }
    }
  } catch (e) {
    // Ignore error
  }

  // Collect from starred words
  const words = getStarredWords();
  words.forEach((w) => {
    const title = w.quizTitle?.trim() || w.subject?.trim() || 'Chung';
    if (!map.has(title)) {
      map.set(title, w.quizId);
    }
  });

  if (!map.has('Chung')) {
    map.set('Chung', undefined);
  }

  return Array.from(map.entries()).map(([title, id]) => ({ title, id }));
};

export const getAllWordSubjects = (): string[] => {
  return getAllQuizTitlesWithWords();
};

export const getSuggestedSubjects = (): string[] => {
  return getSuggestedQuizzes().map((q) => q.title);
};



