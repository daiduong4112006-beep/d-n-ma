import { convertRomajiToKana } from './japaneseKana';

/**
 * Comprehensive dictionary of Japanese Kanji words and compounds mapped to Hiragana readings.
 * Used for flexible answer matching in grammar practice:
 * ensures typing in either Kanji or Hiragana is recognized as 100% correct.
 */
export const KANJI_TO_HIRAGANA_DICT: Record<string, string> = {
  // Địa danh & Tên riêng
  '東京': 'とうきょう',
  '京都': 'きょうと',
  '大阪': 'おおさか',
  '富士山': 'ふじさん',
  '箱根': 'はこね',
  '千葉': 'ちば',
  '日本': 'にほん',
  'ベトナム': 'べとなむ',
  'ハノイ': 'はのい',
  'ホーチミン': 'ほーちみん',

  // Thời gian & Số đếm
  '時間': 'じかん',
  '分': 'ふん',
  '半': 'はん',
  '時': 'じ',
  '年': 'ねん',
  '月': 'がつ',
  '日': 'にち',
  '今日': 'きょう',
  '明日': 'あした',
  '昨日': 'きのう',
  '毎日': 'まいにち',
  '毎週': 'まいしゅう',
  '毎月': 'まいつき',
  '毎年': 'まいとし',
  '今週': 'こんしゅう',
  '先週': 'せんしゅう',
  '来週': 'らいしゅう',
  '今月': 'こんげつ',
  '先月': 'せんげつ',
  '来月': 'らいげつ',
  '今年': 'ことし',
  '去年': 'きょねん',
  '来年': 'らいねん',
  '朝': 'あさ',
  '昼': 'ひる',
  '晩': 'ばん',
  '夜': 'よる',
  '春': 'はる',
  '夏': 'なつ',
  '秋': 'あき',
  '冬': 'ふゆ',
  '何時': 'なんじ',
  '何分': 'なんぷん',
  '何日': 'なんにち',
  '何曜日': 'なんようび',
  '何月': 'なんがつ',

  // Trường học, công sở, địa điểm
  '学校': 'がっこう',
  '大学': 'だいがく',
  '高校': 'こうこう',
  '会社': 'かいしゃ',
  '銀行': 'ぎんこう',
  '病院': 'びょういん',
  '郵便局': 'ゆうびんきょく',
  '図書館': 'としょかん',
  '美術館': 'びじゅつかん',
  '教室': 'きょうしつ',
  '食堂': 'しょくどう',
  '事務所': 'じむしょ',
  '部屋': 'へや',
  '受付': 'うけつけ',
  '会議室': 'かいぎしつ',
  '町': 'まち',
  '山': 'やま',
  '川': 'かわ',
  '海': 'うみ',
  '駅': 'えき',
  '道': 'みち',
  '店': 'みせ',
  '家': 'いえ',
  '寺': 'てら',
  'お寺': 'おてら',
  '神社': 'じんじゃ',
  '教会': 'きょうかい',
  '温泉': 'おんせん',
  '公園': 'こうえん',
  '国': 'くに',
  '外国': 'がいこく',
  '場所': 'ばしょ',

  // Con người, xưng hô
  '私': 'わたし',
  '人': 'ひと',
  '男の人': 'おとこのひと',
  '女の人': 'おんなのひと',
  '男の子': 'おとこのこ',
  '女の子': 'おんなのこ',
  '子供': 'こども',
  '友だち': 'ともだち',
  '友達': 'ともだち',
  '家族': 'かぞく',
  '両親': 'りょうしん',
  '父': 'ちち',
  '母': 'はは',
  '兄': 'あに',
  '姉': 'あね',
  '弟': 'おとうと',
  '妹': 'いもうと',
  'お父さん': 'おとうさん',
  'お母さん': 'おかあさん',
  'お兄さん': 'おにいさん',
  'お姉さん': 'おねえさん',
  '先生': 'せんせい',
  '学生': 'がくせい',
  '留学生': 'りゅうがくせい',
  '医者': 'いしゃ',
  '社員': 'しゃいん',
  '誰': 'だれ',
  '何': 'なに',

  // Đồ vật, ăn uống, phương tiện
  '本': 'ほん',
  '辞書': 'じしょ',
  '雑誌': 'ざっし',
  '新聞': 'しんぶん',
  '手紙': 'てがみ',
  '切手': 'きって',
  '写真': 'しゃしん',
  '車': 'くるま',
  '自動車': 'じどうしゃ',
  '電車': 'でんしゃ',
  '地下鉄': 'ちかてつ',
  '新幹線': 'しんかんせん',
  '自転車': 'じてんしゃ',
  '飛行機': 'ひこうき',
  '船': 'ふね',
  '時計': 'とけい',
  '傘': 'かさ',
  '靴': 'くつ',
  '服': 'ふく',
  '鞄': 'かばん',
  'お金': 'おかね',
  '荷物': 'にもつ',
  '料理': 'りょうり',
  'ご飯': 'ごはん',
  '朝ご飯': 'あさごはん',
  '昼ご飯': 'ひるごはん',
  '晩ご飯': 'ばんごはん',
  '肉': 'にく',
  '魚': 'さかな',
  '野菜': 'やさい',
  '果物': 'くだもの',
  '水': 'みず',
  'お茶': 'おちゃ',
  '酒': 'さけ',
  'お酒': 'おさけ',
  '卵': 'たまご',
  'パン': 'ぱん',
  '薬': 'くすり',

  // Tính từ
  '大きい': 'おおきい',
  '小さい': 'ちいさい',
  '新しい': 'あたらしい',
  '古い': 'ふるい',
  '良い': 'いい',
  '悪い': 'わるい',
  '暑い': 'あつい',
  '熱い': 'あつい',
  '寒い': 'さむい',
  '冷たい': 'つめたい',
  '難しい': 'むずかしい',
  '易しい': 'やさしい',
  '高い': 'たかい',
  '安い': 'やすい',
  '低い': 'ひくい',
  '面白い': 'おもしろい',
  '美味しい': 'おいしい',
  '忙しい': 'いそがしい',
  '楽しい': 'たのしい',
  '白い': 'しろい',
  '黒い': 'くろい',
  '赤い': 'あかい',
  '青い': 'あおい',
  '近い': 'ちかい',
  '遠い': 'とおい',
  '速い': 'はやい',
  '早い': 'はやい',
  '遅い': 'おそい',
  '多い': 'おおい',
  '少ない': 'すくない',
  '暖かい': 'あたたかい',
  '涼しい': 'すずしい',
  '静か': 'しずか',
  '賑やか': 'にぎやか',
  '有名': 'ゆうめい',
  '親切': 'しんせつ',
  '元気': 'げんき',
  '暇': 'ひま',
  '便利': 'べんり',
  '素敵': 'すてき',
  '好き': 'すき',
  '嫌い': 'きらい',
  '上手': 'じょうず',
  '下手': 'へた',

  // Động từ các thể (thể ます, ました, ません, て, る, ない)
  '食べます': 'たべます',
  '食べました': 'たべました',
  '食べません': 'たべません',
  '食べませんでした': 'たべませんでした',
  '食べましょう': 'たべましょう',
  '食べませんか': 'たべませんか',
  '食べる': 'たべる',
  '食べて': 'たべて',
  '食べない': 'たべない',
  '飲みます': 'のみます',
  '飲みました': 'のみました',
  '飲みません': 'のみません',
  '飲む': 'のむ',
  '飲んで': 'のんで',
  '買います': 'かいます',
  '買いました': 'かいました',
  '買いません': 'かいません',
  '買う': 'かう',
  '買って': 'かって',
  '見ます': 'みます',
  '見ました': 'みました',
  '見ません': 'みません',
  '見る': 'みる',
  '見て': 'みて',
  '聞きます': 'ききます',
  '聞きました': 'ききました',
  '聞く': 'きく',
  '聞いて': 'きいて',
  '読みます': 'よみます',
  '読みました': 'よみました',
  '読む': 'よむ',
  '読んで': 'よんで',
  '書きます': 'かきます',
  '書きました': 'かきました',
  '書く': 'かく',
  '書いて': 'かいて',
  '行きます': 'いきます',
  '行きました': 'いきました',
  '行きません': 'いきません',
  '行く': 'いく',
  '行って': 'いって',
  '来ます': 'きます',
  '来ました': 'きました',
  '来ません': 'きません',
  '来る': 'くる',
  '来て': 'きて',
  '帰ります': 'かえります',
  '帰りました': 'かえりました',
  '帰る': 'かえる',
  '帰って': 'かえって',
  '会います': 'あいます',
  '会いました': 'あいました',
  '会う': 'あう',
  '会って': 'あって',
  '待ちます': 'まちます',
  '待つ': 'まつ',
  '待って': 'まって',
  '話します': 'はなします',
  '話す': 'はなす',
  '話して': 'はなして',
  '作ります': 'つくります',
  '作りました': 'つくりました',
  '作る': 'つくる',
  '作って': 'つくって',
  '教えます': 'おしえます',
  '教えました': 'おしえました',
  '習います': 'ならいます',
  '習いました': 'ならいました',
  '貸します': 'かします',
  '借ります': 'かります',
  '借りました': 'かりました',
  '送ります': 'おくります',
  '切ります': 'きります',
  '手伝います': 'てつだいます',
  '手伝いましょうか': 'てつだいましょうか',
  '取ります': 'とります',
  '撮ります': 'とります',
  '撮りました': 'とりました',
  '入ります': 'はいります',
  '入りました': 'はいりました',
  '出ます': 'でます',
  '出ました': 'でました',
  '勉強します': 'べんきょうします',
  '勉強しました': 'べんきょうしました',
  '散歩します': 'さんぽします',
  '買い物します': 'かいものします',
  '旅行します': 'りょこうします',
  '働きます': 'はたらきます',
  '働きました': 'はたらきました',
  '休みます': 'やすみます',
  '終わります': 'おわります',
  '始まります': 'はじまります',

  // Hoạt động & Từ vựng khác
  '読書': 'どくしょ',
  '映画': 'えいが',
  '音楽': 'おんがく',
  '趣味': 'しゅみ',
  '仕事': 'しごと',
  '電話': 'でんわ',
  '手紙を書きます': 'てがみをかきます',
  '写真をとります': 'しゃしんをとります',
  '写真を撮ります': 'しゃしんをとります',
  '天気': 'てんき',
  '雨': 'あめ',
  '雪': 'ゆき',
  '手': 'て',
  '目': 'め',
  '足': 'あし',
};

// Sort dictionary keys by length descending to ensure longer compounds are replaced first
const SORTED_KANJI_KEYS = Object.keys(KANJI_TO_HIRAGANA_DICT).sort(
  (a, b) => b.length - a.length
);

/**
 * Converts all known Kanji words/compounds in a sentence to Hiragana.
 * Leaves Hiragana, Katakana, Romaji, and numbers intact.
 */
export function convertKanjiToHiragana(sentence: string): string {
  if (!sentence) return '';
  let result = sentence;
  for (const kanji of SORTED_KANJI_KEYS) {
    if (result.includes(kanji)) {
      result = result.split(kanji).join(KANJI_TO_HIRAGANA_DICT[kanji]);
    }
  }
  return result;
}

/**
 * Normalizes Japanese text for grammar comparison:
 * - Converts Kanji to Hiragana
 * - Removes tildes (~, ～, 〜)
 * - Removes spaces and Japanese/English punctuation (。, 、, ?, !, :, ;)
 * - Converts Katakana to Hiragana for flexible matching
 */
export function normalizeGrammarText(str: string): string {
  if (!str) return '';

  // 1. Convert Kanji to Hiragana
  let s = convertKanjiToHiragana(str);

  // 2. Remove tildes and wave dashes
  s = s.replace(/[~～〜⁓〰^]/g, '');

  // 3. Remove punctuation, dialogue tags, and whitespaces
  s = s.replace(/^[AB][：:]\s*/i, '');
  s = s.replace(/[\s\-_—–.,/／()（）[\]{}<>《》「」『』・、。!?:;"'‘’“”]/g, '');

  return s.trim().toLowerCase();
}

/**
 * Strips polite / declarative sentence endings (です, だ, 。) for flexible dialogue matching.
 * E.g., user can type either "にぎやかなまち" or "にぎやかなまちです" for line B.
 */
export function stripPoliteEndings(str: string): string {
  let s = str.trim();
  // Strip ending punctuation
  s = s.replace(/[。？！?!.]+$/g, '');
  // Strip ending desu / da / desuka
  s = s.replace(/(ですか|でした|です|だ|よ|ね)$/g, '');
  return s.trim();
}

/**
 * Checks if user answer matches target Japanese sentence.
 * Supports:
 * - Typing in Kanji (matches directly)
 * - Typing in Hiragana (matches via Kanji-to-Hiragana converter)
 * - Typing in Romaji (matches via convertRomajiToKana)
 * - Optional polite endings like "です", "だ", or omitting them (e.g. にぎやかなまち vs にぎやかなまちです)
 */
export function checkGrammarSentenceAnswer(
  userInput: string,
  targetSentence: string,
  allowOmitDesu: boolean = true
): boolean {
  if (!userInput.trim() || !targetSentence.trim()) return false;

  // Clean speaker prefixes like A： or B： from user input if present
  const cleanInput = userInput.replace(/^[AB][：:]\s*/i, '').trim();

  // Convert user input (handles Romaji typing)
  const userDirect = normalizeGrammarText(cleanInput);
  const userHira = normalizeGrammarText(convertRomajiToKana(cleanInput, 'hiragana'));
  const userKata = normalizeGrammarText(convertRomajiToKana(cleanInput, 'katakana'));

  // Target normalized
  const targetNorm = normalizeGrammarText(targetSentence);

  // Direct check
  if (userDirect === targetNorm || userHira === targetNorm || userKata === targetNorm) {
    return true;
  }

  // Also check without Kanji conversion in case target has Kanji and user typed exact Kanji
  const rawTargetNorm = targetSentence
    .replace(/[~～〜⁓〰^]/g, '')
    .replace(/^[AB][：:]\s*/i, '')
    .replace(/[\s\-_—–.,/／()（）[\]{}<>《》「」『』・、。!?:;"'‘’“”]/g, '')
    .trim()
    .toLowerCase();

  if (userDirect === rawTargetNorm || userHira === rawTargetNorm || userKata === rawTargetNorm) {
    return true;
  }

  // Check with flexible endings (e.g. omitting です, だ, ね, よ)
  if (allowOmitDesu) {
    const targetStripped = normalizeGrammarText(stripPoliteEndings(targetSentence));
    const userDirectStripped = normalizeGrammarText(stripPoliteEndings(cleanInput));
    const userHiraStripped = normalizeGrammarText(
      stripPoliteEndings(convertRomajiToKana(cleanInput, 'hiragana'))
    );

    if (
      userDirect === targetStripped ||
      userHira === targetStripped ||
      userDirectStripped === targetStripped ||
      userHiraStripped === targetStripped
    ) {
      return true;
    }
  }

  return false;
}

export interface ParsedDialogue {
  isDialogue: boolean;
  partA?: {
    japanese: string;
    vietnamese: string;
  };
  partB?: {
    japanese: string;
    vietnamese: string;
  };
  singleJa?: string;
  singleVi?: string;
}

/**
 * Parses an example into dialogue parts (A and B) or a single sentence.
 */
export function parseDialogueExample(japanese: string, vietnamese: string): ParsedDialogue {
  const isDialogue =
    japanese.includes('A：') ||
    japanese.includes('A:') ||
    japanese.includes('/ B：') ||
    japanese.includes('/ B:');

  if (!isDialogue) {
    return {
      isDialogue: false,
      singleJa: japanese.trim(),
      singleVi: vietnamese.trim(),
    };
  }

  // Split Japanese by / B: or / B：
  const jaParts = japanese.split(/\s*[/／]\s*(?=B[：:])/i);
  let jaA = (jaParts[0] || '').replace(/^A[：:]\s*/i, '').trim();
  let jaB = (jaParts[1] || '').replace(/^B[：:]\s*/i, '').trim();

  // Parse Vietnamese
  let viA = '';
  let viB = '';

  if (vietnamese.includes('/ B:') || vietnamese.includes('/ B：') || vietnamese.includes('B:')) {
    const viParts = vietnamese.split(/\s*[/／]?\s*(?=B[：:])/i);
    viA = (viParts[0] || '').replace(/^A[：:]\s*/i, '').trim();
    viB = (viParts[1] || '').replace(/^B[：:]\s*/i, '').trim();
  } else if (vietnamese.includes('?')) {
    // Split by question mark if A is question and B is answer
    const qIdx = vietnamese.indexOf('?');
    viA = vietnamese.substring(0, qIdx + 1).replace(/^A[：:]\s*/i, '').trim();
    viB = vietnamese.substring(qIdx + 1).replace(/^B[：:]\s*/i, '').trim();
  } else {
    viA = vietnamese;
    viB = '';
  }

  return {
    isDialogue: true,
    partA: {
      japanese: jaA,
      vietnamese: viA || vietnamese,
    },
    partB: {
      japanese: jaB,
      vietnamese: viB || '',
    },
  };
}
