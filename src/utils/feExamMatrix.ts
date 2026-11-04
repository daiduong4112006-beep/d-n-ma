/** Practice blueprint inferred from past FE papers, not an official department matrix. */
export interface FeQuestion {
  id: string;
  category: string;
  html: string;
  text?: string;
  sources?: { file: string; page: number }[];
  answer?: { key?: string; why?: string; unsure?: boolean };
}

export const FE_MATRIX = [
  { category: 'Ngữ pháp', count: 8 },
  { category: 'Từ vựng', count: 5 },
  { category: 'Đọc Kanji', count: 4 },
  { category: 'Viết Kanji', count: 3 },
  { category: 'Hội thoại', count: 3 },
  { category: 'Trợ từ', count: 3 },
  { category: 'Đọc hiểu', count: 3 },
  { category: 'Từ khác nhóm', count: 1 },
] as const;
export type FeCategory = typeof FE_MATRIX[number]['category'];

const strip = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const options = (q: FeQuestion) => [...q.html.matchAll(/<b[^>]*>[A-D][.．]?<\/b>\s*<span[^>]*>([\s\S]*?)<\/span>/g)].map(m => strip(m[1]));

/** Split the legacy combined category; labels are heuristic and may be refined manually. */
export function feCategory(q: FeQuestion): FeCategory | null {
  const text = q.text || strip(q.html);
  if (/khác (?:loại|nhóm)/i.test(text)) return 'Từ khác nhóm';
  if (q.category === 'Đọc hiểu') return 'Đọc hiểu';
  if (q.category === 'Đọc Kanji') return 'Đọc Kanji';
  if (q.category === 'Chọn chữ Kanji') return 'Viết Kanji';
  if (q.category === 'Trợ từ') return 'Trợ từ';
  if (q.category === 'Hội thoại & phản hồi') return 'Hội thoại';
  if (q.category === 'Từ khác nhóm') return 'Từ khác nhóm';
  if (q.category === 'Chia thể & biến đổi từ') return 'Ngữ pháp';
  if (q.category !== 'Từ vựng & ngữ pháp tổng hợp') return null;
  if (/nghĩa tiếng Việt|sắp xếp|dịch/i.test(text)) return null;
  const opts = options(q);
  if (opts.length === 4 && opts.every(o => /^(?:は|が|を|に|へ|で|と|の|も|から|まで|より|や|・|、|\s)+$/.test(o))) return 'Trợ từ';
  if (/(?:^|\s)[ABＡＢ]\s*[:：]|「.*」.*「/s.test(text)) return 'Hội thoại';
  const why = q.answer?.why || '';
  if (/quá khứ|phủ định|chia thể|thể て|thể た|từ để hỏi|liên từ|mẫu câu|mục đích|so sánh|đếm.*まい|Vます|Vて|Vたい|Vたかった/i.test(why)
    || opts.some(o => /どのくらい|どちら|どこか|なにか|だれ|どうして|どんな|どれ|どの|いちばん|そして|それから|あまり|ませんか|ましょう|たい|かった|くない|じゃ|ています/.test(o))) return 'Ngữ pháp';
  return 'Từ vựng';
}

/** Estimated lesson from the tested pattern, deliberately not an official classification. */
export function feLesson(q: FeQuestion): 4 | 5 | 6 | 7 | 0 {
  const s = (q.answer?.why || '') + ' ' + (q.text || strip(q.html));
  if (/てください|ています|ましょうか|だれが|つくりかた|きって|ひいて|thể て|phương tiện|dụng cụ/.test(s)) return 7;
  if (/ませんか|ましょう|ちょっと|どちら|のほうが|より|いちばん|もう|まだ|まい|sự kiện/.test(s)) return 6;
  if (/どこか|なにか|なにも|どこも|かった|どうして|ほしい|たい|に行|に 行|mục đích/.test(s)) return 5;
  if (/どのくらい|きれいな|よくない|じゃありません|そして|あまり|tính từ|phủ định/.test(s)) return 4;
  return 0;
}

export function eligibleFeQuestion(q: FeQuestion): boolean {
  if (!q.answer?.key || q.answer.unsure || !feCategory(q)) return false;
  // A merged question remains usable when at least one FE source exists.
  return !q.sources?.length || q.sources.some(s => !/(?:^|[_\s-])PT(?:[_\s.-]|$)/i.test(s.file));
}

function shuffled<T>(a: readonly T[], random: () => number): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** Small integral flow: satisfy both question-type quotas and estimated lesson quotas. */
function lessonAllocation<T extends FeQuestion>(pool: T[], random: () => number): T[] {
  const categories = ['Ngữ pháp', 'Hội thoại', 'Trợ từ'] as const;
  const lessons = [4, 5, 6, 7, 0] as const;
  const target = [2, 4, 4, 3, 1];
  const capacity = Array.from({length: 10}, () => Array(10).fill(0));
  const flow = capacity.map(row => row.map(() => 0));
  const buckets = categories.map(cat => lessons.map(lesson => shuffled(pool.filter(q => feCategory(q) === cat && feLesson(q) === lesson), random)));
  categories.forEach((cat, i) => {
    capacity[0][i+1] = FE_MATRIX.find(m => m.category === cat)!.count;
    lessons.forEach((_, j) => { capacity[i+1][j+4] = buckets[i][j].length; });
  });
  target.forEach((n, j) => { capacity[j+4][9] = n; });
  let total = 0;
  while (true) {
    const parents = Array(10).fill(-1), queue = [0]; parents[0] = 0;
    for (let k = 0; k < queue.length && parents[9] === -1; k++) {
      const u = queue[k];
      for (let v=1; v<10; v++) if (parents[v] === -1 && capacity[u][v] - flow[u][v] > 0) { parents[v] = u; queue.push(v); }
    }
    if (parents[9] === -1) break;
    for (let v=9; v!==0; v=parents[v]) { flow[parents[v]][v]++; flow[v][parents[v]]--; }
    total++;
  }
  if (total !== 14) throw new Error('Thiếu câu theo bài để đáp ứng đồng thời ma trận dạng câu và Bài 4–7.');
  return buckets.flatMap((row,i) => row.flatMap((qs,j) => qs.slice(0, flow[i+1][j+4])));
}

/** Reading questions must come from one contiguous source block (SP26 onwards). */
export function feReadingBlocks<T extends FeQuestion>(pool: T[]): T[][] {
  const sources = new Map<string, Map<number, T>>();
  for (const q of pool) {
    if (feCategory(q) !== 'Đọc hiểu') continue;
    for (const source of q.sources || []) {
      if (!/(?:SP|SU|FA)\s*2[6-9]/i.test(source.file) || /(?:^|_)PT(?:_|\.)/i.test(source.file)) continue;
      if (!sources.has(source.file)) sources.set(source.file, new Map());
      sources.get(source.file)!.set(source.page, q);
    }
  }
  const blocks: T[][] = [];
  for (const pages of sources.values()) {
    const ordered = [...pages.entries()].sort((a, b) => a[0] - b[0]);
    // Never mix sources or silently select isolated reading questions.
    let block: T[] = [], last = -2;
    const flush = () => { if (block.length >= 3 && block.length <= 4) blocks.push(block); };
    for (const [page, q] of ordered) {
      if (page !== last + 1) { flush(); block = []; }
      block.push(q); last = page;
    }
    flush();
  }
  return blocks;
}

export function sampleExam<T extends FeQuestion>(pool: T[], n = 30, random = Math.random): T[] {
  if (n !== 30) throw new Error('Ma trận FE hiện tại dùng đề 30 câu.');
  const unique = [...new Map(pool.filter(eligibleFeQuestion).map(q => [q.id, q])).values()];
  const blocks = feReadingBlocks(unique).filter(b => b.length === 3);
  if (!blocks.length) throw new Error('Thiếu đoạn đọc hiểu gồm 3 câu liên tiếp có đáp án; chưa thể tạo đề đúng ma trận.');
  const reading = shuffled(blocks, random)[0];
  const selected: T[] = [];
  // 14 grammar/particle/dialogue questions: approx. 16/30/26/19/9 percent by lesson.
  const byLesson = lessonAllocation(unique, random);
  for (const item of FE_MATRIX) {
    if (item.category === 'Đọc hiểu') continue;
    if (['Ngữ pháp', 'Trợ từ', 'Hội thoại'].includes(item.category)) {
      selected.push(...byLesson.filter(q => feCategory(q) === item.category));
      continue;
    }
    const candidates = shuffled(unique.filter(q => feCategory(q) === item.category), random);
    if (candidates.length < item.count) throw new Error(`Thiếu câu ${item.category}: cần ${item.count}, có ${candidates.length}.`);
    for (let i = 0; i < item.count; i++) {
      const q = candidates.shift()!;
      selected.push(q);
    }
  }
  // Keep the reading block together and in source order at the end.
  return [...shuffled(selected, random), ...reading];
}
