// Japanese Romaji <-> Kana Engine & Utilities

const HIRAGANA_MAP: Record<string, string> = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  sa: 'さ', shi: 'し', si: 'し', su: 'す', se: 'せ', so: 'そ',
  za: 'ざ', ji: 'じ', zi: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ta: 'た', chi: 'ち', ti: 'ち', tsu: 'つ', tu: 'つ', te: 'て', to: 'と',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', fu: 'ふ', hu: 'ふ', he: 'へ', ho: 'ほ',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  wa: 'わ', wo: 'を',
  nn: 'ん', "n'": 'ん',

  // Digraphs (Yoon)
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ',
  sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ',
  jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ',
  tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',

  // Small kana
  fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
  va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
  wi: 'うぃ', we: 'うぇ',
  '-': 'ー',
};

const KATAKANA_MAP: Record<string, string> = {
  a: 'ア', i: 'イ', u: 'ウ', e: 'エ', o: 'オ',
  ka: 'カ', ki: 'キ', ku: 'ク', ke: 'ケ', ko: 'コ',
  ga: 'ガ', gi: 'ギ', gu: 'グ', ge: 'ゲ', go: 'ゴ',
  sa: 'サ', shi: 'シ', si: 'シ', su: 'ス', se: 'セ', so: 'ソ',
  za: 'ザ', ji: 'ジ', zi: 'ジ', zu: 'ズ', ze: 'ゼ', zo: 'ゾ',
  ta: 'タ', chi: 'チ', ti: 'チ', tsu: 'ツ', tu: 'ツ', te: 'テ', to: 'ト',
  da: 'ダ', di: 'ヂ', du: 'ヅ', de: 'デ', do: 'ド',
  na: 'ナ', ni: 'ニ', nu: 'ヌ', ne: 'ネ', no: 'ノ',
  ha: 'ハ', hi: 'ヒ', fu: 'フ', hu: 'フ', he: 'ヘ', ho: 'ホ',
  ba: 'バ', bi: 'ビ', bu: 'ブ', be: 'ベ', bo: 'ボ',
  pa: 'パ', pi: 'ピ', pu: 'プ', pe: 'ペ', po: 'ポ',
  ma: 'マ', mi: 'ミ', mu: 'ム', me: 'メ', mo: 'モ',
  ya: 'ヤ', yu: 'ユ', yo: 'ヨ',
  ra: 'ラ', ri: 'リ', ru: 'ル', re: 'レ', ro: 'ロ',
  wa: 'ワ', wo: 'ヲ',
  nn: 'ン', "n'": 'ン',

  // Digraphs
  kya: 'キャ', kyu: 'キュ', kyo: 'キョ',
  gya: 'ギャ', gyu: 'ギュ', gyo: 'ギョ',
  sha: 'シャ', shu: 'シュ', sho: 'ショ',
  sya: 'シャ', syu: 'シュ', syo: 'ショ',
  ja: 'ジャ', ju: 'ジュ', jo: 'ジョ',
  jya: 'ジャ', jyu: 'ジュ', jyo: 'ジョ',
  cha: 'チャ', chu: 'チュ', cho: 'チョ',
  tya: 'チャ', tyu: 'チュ', tyo: 'チョ',
  nya: 'ニャ', nyu: 'ニュ', nyo: 'ニョ',
  hya: 'ヒャ', hyu: 'ヒュ', hyo: 'ヒョ',
  bya: 'ビャ', byu: 'ビュ', byo: 'ビョ',
  pya: 'ピャ', pyu: 'ピュ', pyo: 'ピョ',
  mya: 'ミャ', myu: 'ミュ', myo: 'ミョ',
  rya: 'リャ', ryu: 'リュ', ryo: 'リョ',

  fa: 'ファ', fi: 'フィ', fe: 'フェ', fo: 'フォ',
  va: 'ヴァ', vi: 'ヴィ', vu: 'ヴ', ve: 'ヴェ', vo: 'ヴォ',
  wi: 'ウィ', we: 'ウェ',
  '-': 'ー',
};

/**
 * Converts romaji input buffer into Hiragana or Katakana on-the-fly.
 * Handles double consonants (sokuon 'っ' or 'ッ') and 'n' rules.
 */
export function convertRomajiToKana(text: string, mode: 'hiragana' | 'katakana' = 'hiragana'): string {
  const map = mode === 'hiragana' ? HIRAGANA_MAP : KATAKANA_MAP;
  const sokuon = mode === 'hiragana' ? 'っ' : 'ッ';
  const nKana = mode === 'hiragana' ? 'ん' : 'ン';

  let result = '';
  let i = 0;
  const lower = text.toLowerCase();

  while (i < lower.length) {
    // Check if the current character is already a Japanese character (Hiragana, Katakana, Kanji, punctuation)
    const code = lower.charCodeAt(i);
    const isAsciiAlphabet = (code >= 97 && code <= 122) || code === 45; // a-z or '-'

    if (!isAsciiAlphabet) {
      result += text[i];
      i++;
      continue;
    }

    // Try match length 4, 3, 2, 1
    let matched = false;

    // Sokuon check: e.g. "kk", "tt", "ss", "pp", "tch"
    if (
      i + 1 < lower.length &&
      lower[i] !== 'n' &&
      lower[i] !== 'a' &&
      lower[i] !== 'i' &&
      lower[i] !== 'u' &&
      lower[i] !== 'e' &&
      lower[i] !== 'o'
    ) {
      if (lower[i] === lower[i + 1] || (lower[i] === 't' && lower.startsWith('tch', i))) {
        result += sokuon;
        i++;
        continue;
      }
    }

    // Single 'n' check: followed by consonant (except y or vowel) or end of string
    if (lower[i] === 'n') {
      const nextChar = lower[i + 1];
      if (
        nextChar &&
        nextChar !== 'a' &&
        nextChar !== 'i' &&
        nextChar !== 'u' &&
        nextChar !== 'e' &&
        nextChar !== 'o' &&
        nextChar !== 'y'
      ) {
        result += nKana;
        i++;
        // If next is another n, continue so it doesn't double
        if (nextChar === 'n') {
          i++;
        }
        continue;
      }
    }

    for (let len = 4; len >= 1; len--) {
      if (i + len <= lower.length) {
        const sub = lower.substring(i, i + len);
        if (map[sub]) {
          result += map[sub];
          i += len;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Keep character as is (e.g. pending incomplete syllable like 'k', 's')
      result += text[i];
      i++;
    }
  }

  return result;
}

/**
 * Text-to-speech for Japanese pronunciation using Web Speech Synthesis API
 */
export function speakJapanese(text: string, rate: number = 0.9): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // Stop any pending speech

    // Remove parenthesis explanation for cleaner pronunciation
    const cleanText = text.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ja-JP';
    utterance.rate = rate;

    // Find a native Japanese voice if available
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(
      (v) => v.lang.startsWith('ja') || v.name.toLowerCase().includes('japanese') || v.name.toLowerCase().includes('japan')
    );
    if (jaVoice) {
      utterance.voice = jaVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

/**
 * Checks if user answer matches target Japanese card
 */
export function checkJapaneseAnswer(
  userRawInput: string,
  card: { term: string; reading?: string; romaji?: string }
): boolean {
  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[\s\-_.,/()（）[\]]/g, '');

  const u = norm(userRawInput);
  if (!u) return false;

  const targetTerm = norm(card.term);
  const targetReading = card.reading ? norm(card.reading) : '';
  const targetRomaji = card.romaji ? norm(card.romaji) : '';

  // Also test if user typed Romaji that converts to target reading
  const userConvertedHiragana = norm(convertRomajiToKana(userRawInput, 'hiragana'));
  const userConvertedKatakana = norm(convertRomajiToKana(userRawInput, 'katakana'));

  if (u === targetTerm || (targetReading && u === targetReading) || (targetRomaji && u === targetRomaji)) {
    return true;
  }

  if (
    targetReading &&
    (userConvertedHiragana === targetReading || userConvertedKatakana === targetReading)
  ) {
    return true;
  }

  if (
    userConvertedHiragana === targetTerm ||
    userConvertedKatakana === targetTerm
  ) {
    return true;
  }

  return false;
}

/**
 * Remove Vietnamese accents for flexible fuzzy matching
 */
export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Checks if user answer matches target Vietnamese definition
 */
export function checkVietnameseAnswer(
  userRawInput: string,
  targetDefinition: string
): boolean {
  const clean = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[.,;:!?/\\()（）[\]"'`~]/g, ' ')
      .replace(/\s+/g, ' ');

  const u = clean(userRawInput);
  if (!u) return false;

  const target = clean(targetDefinition);
  if (u === target) return true;

  // Split synonyms by comma, semicolon, slash, or parentheses
  const segments = targetDefinition
    .split(/[,;/+]+/)
    .map((seg) => clean(seg.replace(/\([^)]*\)/g, '')))
    .filter(Boolean);

  for (const seg of segments) {
    if (u === seg) return true;
  }

  // Also check without accents
  const uNoAcc = removeVietnameseAccents(u);
  const targetNoAcc = removeVietnameseAccents(target);
  if (uNoAcc === targetNoAcc) return true;

  for (const seg of segments) {
    if (uNoAcc === removeVietnameseAccents(seg)) return true;
  }

  return false;
}
