import { convertRomajiToKana, katakanaToHiragana } from './japaneseKana';
import { convertKanjiToHiragana, checkGrammarSentenceAnswer } from './japaneseKanjiConverter';

export interface DiffPart {
  text: string;
  type: 'correct' | 'wrong' | 'missing' | 'extra';
}

export interface DetailedDiffResult {
  userParts: DiffPart[];
  targetParts: DiffPart[];
  firstErrorHint?: string;
  hasErrors: boolean;
}

/**
 * Normalizes a single character for relaxed comparison (ignoring full/half-width and kata/hira).
 */
function normalizeCharForDiff(c: string): string {
  if (!c) return '';
  // Unicode NFKC converts full-width ASCII to half-width, full-width space to half-width space, etc.
  let ch = c.normalize('NFKC');
  // Convert Katakana to Hiragana for comparison
  ch = katakanaToHiragana(ch);
  return ch.toLowerCase();
}

/**
 * Checks if two characters match flexibly.
 */
function isCharMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const na = normalizeCharForDiff(a);
  const nb = normalizeCharForDiff(b);
  if (na === nb) return true;
  // Match common punctuation variations
  if ((na === ' ' || na === '') && (nb === ' ' || nb === '')) return true;
  if ((na === '。' || na === '.') && (nb === '。' || nb === '.')) return true;
  if ((na === '、' || na === ',') && (nb === '、' || nb === ',')) return true;
  if ((na === '？' || na === '?') && (nb === '？' || nb === '?')) return true;
  if ((na === '！' || na === '!') && (nb === '！' || nb === '!')) return true;
  return false;
}

/**
 * Computes an alignment between two strings using Longest Common Subsequence (LCS).
 */
function alignStrings(
  userStr: string,
  targetStr: string
): { userAligned: (string | null)[]; targetAligned: (string | null)[] } {
  const m = userStr.length;
  const n = targetStr.length;

  // DP table for LCS
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (isCharMatch(userStr[i - 1], targetStr[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find alignment
  let i = m;
  let j = n;
  const userRev: (string | null)[] = [];
  const targetRev: (string | null)[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && isCharMatch(userStr[i - 1], targetStr[j - 1])) {
      userRev.push(userStr[i - 1]);
      targetRev.push(targetStr[j - 1]);
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      userRev.push(null);
      targetRev.push(targetStr[j - 1]);
      j--;
    } else if (i > 0) {
      userRev.push(userStr[i - 1]);
      targetRev.push(null);
      i--;
    }
  }

  return {
    userAligned: userRev.reverse(),
    targetAligned: targetRev.reverse(),
  };
}

/**
 * Groups raw character alignment into grouped DiffPart segments for rendering.
 */
function buildDiffSegments(
  userAligned: (string | null)[],
  targetAligned: (string | null)[]
): { userParts: DiffPart[]; targetParts: DiffPart[]; firstErrorHint?: string } {
  const userParts: DiffPart[] = [];
  const targetParts: DiffPart[] = [];
  let firstErrorHint: string | undefined;

  const len = userAligned.length;
  let i = 0;

  while (i < len) {
    const uChar = userAligned[i];
    const tChar = targetAligned[i];

    if (uChar !== null && tChar !== null && isCharMatch(uChar, tChar)) {
      // MATCH
      let matchUser = uChar;
      let matchTarget = tChar;
      i++;
      while (
        i < len &&
        userAligned[i] !== null &&
        targetAligned[i] !== null &&
        isCharMatch(userAligned[i]!, targetAligned[i]!)
      ) {
        matchUser += userAligned[i]!;
        matchTarget += targetAligned[i]!;
        i++;
      }
      userParts.push({ text: matchUser, type: 'correct' });
      targetParts.push({ text: matchTarget, type: 'correct' });
    } else {
      // MISMATCH / GAP
      let wrongUser = '';
      let missingTarget = '';

      while (
        i < len &&
        (userAligned[i] === null || targetAligned[i] === null || !isCharMatch(userAligned[i]!, targetAligned[i]!))
      ) {
        if (userAligned[i] !== null) wrongUser += userAligned[i]!;
        if (targetAligned[i] !== null) missingTarget += targetAligned[i]!;
        i++;
      }

      // Check if mismatch only consists of formatting (spaces, periods at end)
      const meaningfulWrong = wrongUser.replace(/[\s。.,!?]/g, '');
      const meaningfulMissing = missingTarget.replace(/[\s。.,!?]/g, '');

      if (!meaningfulWrong && !meaningfulMissing) {
        // Purely spacing or punctuation difference: mark as correct
        if (wrongUser.length > 0) userParts.push({ text: wrongUser, type: 'correct' });
        if (missingTarget.length > 0) targetParts.push({ text: missingTarget, type: 'correct' });
      } else {
        if (wrongUser.length > 0) {
          userParts.push({ text: wrongUser, type: meaningfulWrong.length > 0 ? 'wrong' : 'correct' });
        }
        if (missingTarget.length > 0) {
          targetParts.push({ text: missingTarget, type: meaningfulMissing.length > 0 ? 'missing' : 'correct' });
        }

        if (!firstErrorHint) {
          if (meaningfulWrong && meaningfulMissing) {
            firstErrorHint = `Gõ nhầm "${meaningfulWrong}" ➔ cần là "${meaningfulMissing}"`;
          } else if (meaningfulMissing) {
            firstErrorHint = `Thiếu đoạn "${meaningfulMissing}"`;
          } else if (meaningfulWrong) {
            firstErrorHint = `Thừa ký tự "${meaningfulWrong}"`;
          }
        }
      }
    }
  }

  return { userParts, targetParts, firstErrorHint };
}

/**
 * Computes a user-friendly Japanese sentence diff between what the user typed and the target sentence.
 * Handles Romaji, Hiragana, Katakana, and Kanji variations smartly.
 */
export function computeJapaneseDiff(userInput: string, targetSentence: string): DetailedDiffResult {
  const cleanInput = (userInput || '').trim();
  const cleanTarget = (targetSentence || '').replace(/^[AB][：:]\s*/i, '').trim();

  if (!cleanInput) {
    return {
      userParts: [{ text: '(chưa nhập)', type: 'wrong' }],
      targetParts: [{ text: cleanTarget, type: 'missing' }],
      firstErrorHint: 'Bạn chưa nhập câu trả lời',
      hasErrors: true,
    };
  }

  // If answer matches under relaxed grammar check, it's 100% correct!
  if (checkGrammarSentenceAnswer(cleanInput, cleanTarget)) {
    return {
      userParts: [{ text: cleanInput, type: 'correct' }],
      targetParts: [{ text: cleanTarget, type: 'correct' }],
      hasErrors: false,
    };
  }

  // Convert Romaji in userInput if applicable
  let resolvedUser = cleanInput;
  if (/^[a-zA-Z0-9\s.,'?!-]+$/.test(cleanInput)) {
    resolvedUser = convertRomajiToKana(cleanInput, 'hiragana');
  }

  // Try matching directly first
  const directAlign = alignStrings(resolvedUser, cleanTarget);
  const directSegs = buildDiffSegments(directAlign.userAligned, directAlign.targetAligned);

  // Also try with Hiragana version of target if target has Kanji and user typed Hiragana
  const targetHira = convertKanjiToHiragana(cleanTarget);
  if (targetHira !== cleanTarget) {
    const hiraAlign = alignStrings(resolvedUser, targetHira);
    const hiraSegs = buildDiffSegments(hiraAlign.userAligned, hiraAlign.targetAligned);

    // Pick the alignment with fewer error segments
    const countErrors = (parts: DiffPart[]) => parts.filter((p) => p.type !== 'correct').length;
    if (countErrors(hiraSegs.userParts) < countErrors(directSegs.userParts)) {
      return {
        userParts: hiraSegs.userParts,
        targetParts: hiraSegs.targetParts,
        firstErrorHint: hiraSegs.firstErrorHint,
        hasErrors: hiraSegs.userParts.some((p) => p.type !== 'correct') || hiraSegs.targetParts.some((p) => p.type !== 'correct'),
      };
    }
  }

  return {
    userParts: directSegs.userParts,
    targetParts: directSegs.targetParts,
    firstErrorHint: directSegs.firstErrorHint,
    hasErrors: directSegs.userParts.some((p) => p.type !== 'correct') || directSegs.targetParts.some((p) => p.type !== 'correct'),
  };
}
