import { JPD_READINGS } from '../data/jpdReadings';
import { JPD123_EXAMPLE_KANA } from '../data/jpd123ExampleKana';
import { convertKanjiToHiragana, convertNumbersAndCountersToHiragana } from './japaneseKanjiConverter';

const KANJI = /[㐀-鿿々]/;
const MAX_KEY = Math.max(...Object.keys(JPD_READINGS).map((k) => k.length));

/**
 * Đổi một câu tiếng Nhật sang toàn kana (hiragana), không còn chữ Hán.
 * 1) Câu ví dụ JPD123 đã soát sẵn → dùng luôn.
 * 2) Số + lượng từ (10時, 3つ…) → hiragana.
 * 3) Khớp từ dài nhất theo bảng đọc JPD123, phần còn lại dùng bộ đổi cũ.
 * Katakana, chữ số, chữ Latin và dấu câu giữ nguyên.
 */
export function toKanaReading(text?: string): string {
  if (!text) return '';
  const t = text.trim();
  const pre = JPD123_EXAMPLE_KANA[t];
  if (pre) return pre;
  if (!KANJI.test(t)) return t;

  const s = convertNumbersAndCountersToHiragana(t);
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (!KANJI.test(s[i])) {
      out += s[i++];
      continue;
    }
    let hit = false;
    for (let len = Math.min(MAX_KEY, s.length - i); len >= 1; len--) {
      const r = JPD_READINGS[s.slice(i, i + len)];
      if (r) {
        out += r;
        i += len;
        hit = true;
        break;
      }
    }
    if (hit) continue;
    // Không có trong bảng: lấy cả cụm chữ Hán + đuôi kana đi kèm cho bộ đổi cũ
    let j = i;
    while (j < s.length && KANJI.test(s[j])) j++;
    while (j < s.length && /[ぁ-ゖ]/.test(s[j]) && j - i < 6) j++;
    out += convertKanjiToHiragana(s.slice(i, j));
    i = j;
  }
  return out;
}
