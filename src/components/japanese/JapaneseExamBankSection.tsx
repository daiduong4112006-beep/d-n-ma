import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Star,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  FileStack,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shuffle,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { sound } from '../../utils/audio';
import { SectionHeader, FilterChip } from './courseUi';

/* ----------------------------------------------------------------------------
 * Source FE – Ngân hàng câu hỏi thi cuối kỳ JPD123 (880 mục, 10 nhóm, 35 bộ đề)
 * Dữ liệu nằm ở src/data/jpd123ExamBank.json, chỉ tải khi mở tab.
 * ------------------------------------------------------------------------- */

interface BankAnswer {
  key?: string;
  text?: string;
  why?: string;
  note?: string;
  unsure?: boolean;
}
interface BankQuestion {
  id: string;
  category: string;
  text: string;
  html: string;
  sources: { file: string; page: number }[];
  answer?: BankAnswer;
}
interface BankData {
  stats: {
    sourceFiles: number;
    sourceItems: number;
    uniqueItems: number;
    merged: number;
    categories: Record<string, number>;
    answer_note?: string;
  };
  questions: BankQuestion[];
}

const PAGE_SIZE = 20;
const MARK_KEY = 'jpd-bank-marks';
const PICK_KEY = 'jpd-bank-picks';

const prettySource = (f: string) => f.replace('JPD123_', '').replace('.html', '').replace(/_/g, ' ');

const loadJSON = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

/* -------------------------- one question card --------------------------- */
const QuestionCard: React.FC<{
  q: BankQuestion;
  index: number;
  marked: boolean;
  forceOpen: boolean;
  picked?: string;
  onToggleMark: () => void;
  onPick: (key: string) => void;
}> = ({ q, index, marked, forceOpen, picked, onToggleMark, onPick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const A = q.answer || {};
  const reveal = open || forceOpen || !!picked;
  const pickable = !!A.key && !A.unsure;

  // Biến các lựa chọn A/B/C/D trong đề thành nút bấm được để tự làm bài
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const opts = Array.from(root.querySelectorAll<HTMLElement>('.q-option'));
    opts.forEach((el) => {
      const key = (el.querySelector('b')?.textContent || '').trim();
      el.dataset.key = key;
      el.classList.remove('is-ok', 'is-no', 'is-pickable');
      if (pickable && !picked) el.classList.add('is-pickable');
      if (picked) {
        if (key === A.key) el.classList.add('is-ok');
        else if (key === picked) el.classList.add('is-no');
      }
    });
  }, [picked, pickable, A.key, q.id]);

  const handleClick = (e: React.MouseEvent) => {
    if (!pickable || picked) return;
    const opt = (e.target as HTMLElement).closest<HTMLElement>('.q-option');
    if (!opt || !opt.dataset.key) return;
    onPick(opt.dataset.key);
  };

  const result = picked ? (picked === A.key ? 'ok' : 'no') : null;

  return (
    <article
      className={`rounded-3xl border p-5 sm:p-6 space-y-4 transition-colors ${
        result === 'ok'
          ? 'bg-emerald-50/60 dark:bg-emerald-500/5 border-emerald-300 dark:border-emerald-500/40'
          : result === 'no'
          ? 'bg-rose-50/60 dark:bg-rose-500/5 border-rose-300 dark:border-rose-500/40'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 text-xs font-black flex items-center justify-center shrink-0">
            {index}
          </span>
          <span className="text-[11px] font-black text-slate-400 tracking-wider shrink-0">{q.id}</span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold truncate">
            {q.category}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleMark}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
            marked
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title={marked ? 'Bỏ đánh dấu' : 'Đánh dấu cần ôn'}
        >
          <Star className={`w-3.5 h-3.5 ${marked ? 'fill-amber-400 text-amber-400' : ''}`} />
          <span className="hidden sm:inline">{marked ? 'Cần ôn' : 'Đánh dấu'}</span>
        </button>
      </div>

      <div
        ref={ref}
        onClick={handleClick}
        className="fe-question text-slate-800 dark:text-slate-100 font-japanese"
        dangerouslySetInnerHTML={{ __html: q.html }}
      />

      {/* Đáp án + giải thích */}
      <div
        className={`rounded-2xl border ${
          A.unsure
            ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-black text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {result === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {result === 'no' && <XCircle className="w-4 h-4 text-rose-500" />}
            {A.unsure && <AlertTriangle className="w-4 h-4 text-amber-500" />}
            {A.unsure
              ? 'Ghi chú (đề lỗi)'
              : result === 'ok'
              ? 'Chính xác!'
              : result === 'no'
              ? `Chưa đúng – bạn chọn ${picked}`
              : 'Đáp án & giải thích'}
          </span>
          {reveal ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
        </button>
        {reveal && (
          <div className="px-4 pb-4 space-y-2 text-sm">
            {A.key ? (
              <div className="flex items-center gap-2">
                <span className="min-w-8 h-7 px-2 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center">
                  {A.key}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-100 font-japanese">{A.text}</span>
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-300">{A.note || 'Chưa có đáp án.'}</p>
            )}
            {A.why && (
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                <b className="text-emerald-700 dark:text-emerald-400">Vì sao: </b>
                {A.why}
              </p>
            )}
            {A.key && A.note && <p className="text-amber-700 dark:text-amber-400 text-xs">Lưu ý: {A.note}</p>}
          </div>
        )}
      </div>

      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer font-bold hover:text-slate-600 dark:hover:text-slate-200">
          Xuất hiện trong {q.sources.length} đề nguồn
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {q.sources.map((s, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-semibold"
            >
              {prettySource(s.file)} · mục {s.page}
            </span>
          ))}
        </div>
      </details>
    </article>
  );
};

/* ------------------------------ main section ----------------------------- */
export interface ExamBankStats {
  categories: Record<string, number>;
  total: number;
  done: number;
}

export const JapaneseExamBankSection: React.FC<{
  /** Dạng câu hỏi đang lọc ('' = tất cả), điều khiển từ thanh bên trái */
  category?: string;
  onCategoryChange?: (c: string) => void;
  onStats?: (s: ExamBankStats) => void;
}> = ({ category, onCategoryChange, onStats }) => {
  const [data, setData] = useState<BankData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<'practice' | 'list'>('practice');
  const [term, setTerm] = useState('');
  const [localCat, setLocalCat] = useState('');
  const cat = category ?? localCat;
  const setCat = (c: string) => (onCategoryChange ? onCategoryChange(c) : setLocalCat(c));
  const [src, setSrc] = useState('');
  const [onlyMarked, setOnlyMarked] = useState(false);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [shuffled, setShuffled] = useState<string[] | null>(null);
  const [page, setPage] = useState(0);
  const [pIdx, setPIdx] = useState(0);
  const [marked, setMarked] = useState<Set<string>>(() => new Set(loadJSON<string[]>(MARK_KEY, [])));
  const [picks, setPicks] = useState<Record<string, string>>(() => loadJSON(PICK_KEY, {}));
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    import('../../data/jpd123ExamBank.json')
      .then((m) => alive && setData((m.default || m) as unknown as BankData))
      .catch(() => alive && setError('Không tải được ngân hàng câu hỏi.'));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (data) onStats?.({ categories: data.stats.categories, total: data.stats.uniqueItems, done: Object.keys(picks).length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, picks]);

  // đổi bộ lọc → về đầu
  useEffect(() => {
    setPage(0);
    setPIdx(0);
  }, [cat, term, src, onlyMarked, onlyWrong, onlyTodo, shuffled]);

  const sources = useMemo(
    () => (data ? [...new Set(data.questions.flatMap((q) => q.sources.map((s) => s.file)))].sort() : []),
    [data]
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const t = term.trim().toLocaleLowerCase();
    let qs = data.questions.filter(
      (q) =>
        (!cat || q.category === cat) &&
        (!src || q.sources.some((s) => s.file === src)) &&
        (!onlyMarked || marked.has(q.id)) &&
        (!onlyWrong || (picks[q.id] && picks[q.id] !== q.answer?.key)) &&
        (!onlyTodo || !picks[q.id]) &&
        (!t || q.text.toLocaleLowerCase().includes(t) || q.id.toLowerCase().includes(t))
    );
    if (shuffled) {
      const order = new Map(shuffled.map((id, i) => [id, i]));
      qs = [...qs].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
    return qs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, term, cat, src, onlyMarked, onlyWrong, onlyTodo, shuffled]);

  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, maxPage - 1);
  const pageItems = filtered.slice(curPage * PAGE_SIZE, (curPage + 1) * PAGE_SIZE);
  const cur = filtered[Math.min(pIdx, Math.max(0, filtered.length - 1))];

  const answeredIds = Object.keys(picks);
  const correctCount = data
    ? answeredIds.filter((id) => data.questions.find((q) => q.id === id)?.answer?.key === picks[id]).length
    : 0;
  const inSetDone = filtered.filter((q) => picks[q.id]).length;
  const inSetRight = filtered.filter((q) => picks[q.id] && picks[q.id] === q.answer?.key).length;

  const goPage = (p: number) => {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleMark = (id: string) => {
    setMarked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        localStorage.setItem(MARK_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
    sound.playClick();
  };

  const pick = (q: BankQuestion, key: string) => {
    const ok = key === q.answer?.key;
    ok ? sound.playCorrect() : sound.playWrong();
    setPicks((prev) => {
      const next = { ...prev, [q.id]: key };
      try {
        localStorage.setItem(PICK_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const resetPicks = () => {
    setPicks({});
    try {
      localStorage.removeItem(PICK_KEY);
    } catch {}
    setOnlyWrong(false);
    sound.playClick();
  };

  // Phím tắt khi luyện từng câu: 1–4 / A–D chọn đáp án, ← → chuyển câu, S đánh dấu
  useEffect(() => {
    if (view !== 'practice') return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.ctrlKey || e.metaKey || e.altKey || !cur) return;
      const k = e.key.toUpperCase();
      const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', A: 'A', B: 'B', C: 'C', D: 'D' };
      if (map[k] && cur.answer?.key && !cur.answer.unsure && !picks[cur.id]) {
        pick(cur, map[k]);
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || (e.key === 'Enter' && picks[cur.id])) {
        setPIdx((i) => Math.min(i + 1, filtered.length - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        setPIdx((i) => Math.max(i - 1, 0));
        e.preventDefault();
      } else if (k === 'S') {
        toggleMark(cur.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cur, picks, filtered.length]);

  if (error) {
    return <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 text-rose-500 font-bold">{error}</div>;
  }
  if (!data) {
    return (
      <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Đang tải ngân hàng câu hỏi…
      </div>
    );
  }

  const st = data.stats;
  const toggleCls = (on: boolean, tone: string) =>
    `inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
      on ? tone : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
    }`;

  return (
    <div className="space-y-5" ref={topRef}>
      <SectionHeader
        tone="sky"
        icon={<FileStack className="w-6 h-6" />}
        eyebrow="Mục 5 · Source FE"
        title={cat || 'Ngân hàng đề thi cuối kỳ'}
        desc={`${st.uniqueItems} câu · ${Object.keys(st.categories).length} dạng · ${st.sourceFiles} bộ đề nguồn (đã gộp ${st.merged} câu trùng). Chọn dạng câu ở thanh mục của khóa học.`}
        actions={
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Đã làm', `${answeredIds.length}`, 'text-sky-500'],
              ['Đúng', answeredIds.length ? `${Math.round((correctCount / answeredIds.length) * 100)}%` : '—', 'text-emerald-500'],
              ['Cần ôn', `${marked.size}`, 'text-amber-500'],
            ].map(([l, v, c]) => (
              <div
                key={l}
                className="min-w-[76px] px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center"
              >
                <span className={`text-lg font-black block leading-tight ${c}`}>{v}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{l}</span>
              </div>
            ))}
          </div>
        }
      />

      {/* Thanh công cụ */}
      <div className="p-3 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 shrink-0">
            {(
              [
                ['practice', 'Luyện từng câu'],
                ['list', 'Xem danh sách'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setView(v);
                  sound.playClick();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  view === v ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Tìm theo tiếng Việt, tiếng Nhật hoặc mã câu…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-sky-400"
            />
          </div>
          <select
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            className="md:w-52 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 outline-none"
            aria-label="Lọc theo bộ đề nguồn"
          >
            <option value="">Tất cả bộ đề ({sources.length})</option>
            {sources.map((f) => (
              <option key={f} value={f}>
                {prettySource(f)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setOnlyTodo((v) => !v)} className={toggleCls(onlyTodo, 'bg-sky-500/10 border-sky-500/40 text-sky-600 dark:text-sky-300')}>
            Chưa làm
          </button>
          <button type="button" onClick={() => setOnlyWrong((v) => !v)} className={toggleCls(onlyWrong, 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-300')}>
            <XCircle className="w-3.5 h-3.5" /> Câu làm sai
          </button>
          <button type="button" onClick={() => setOnlyMarked((v) => !v)} className={toggleCls(onlyMarked, 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-300')}>
            <Star className="w-3.5 h-3.5" /> Cần ôn
          </button>
          <button
            type="button"
            onClick={() => {
              setShuffled(shuffled ? null : [...data.questions.map((q) => q.id)].sort(() => Math.random() - 0.5));
              sound.playClick();
            }}
            className={toggleCls(!!shuffled, 'bg-purple-500/10 border-purple-500/40 text-purple-600 dark:text-purple-300')}
          >
            <Shuffle className="w-3.5 h-3.5" /> Trộn câu
          </button>
          <span className="flex-1" />
          {view === 'list' && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className={toggleCls(showAll, 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300')}>
              {showAll ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showAll ? 'Ẩn đáp án' : 'Hiện tất cả đáp án'}
            </button>
          )}
          {answeredIds.length > 0 && (
            <button type="button" onClick={resetPicks} className={toggleCls(false, '')}>
              <RotateCcw className="w-3.5 h-3.5" /> Làm lại từ đầu
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-500">
          Không có câu phù hợp với bộ lọc.
        </div>
      ) : view === 'practice' && cur ? (
        /* ======================= LUYỆN TỪNG CÂU ======================= */
        <div className="grid xl:grid-cols-[minmax(0,1fr)_260px] gap-5 items-start">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="text-sky-500 font-black">
                Câu {Math.min(pIdx, filtered.length - 1) + 1}/{filtered.length}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${((pIdx + 1) / filtered.length) * 100}%` }} />
              </div>
              <span>
                {inSetRight}/{inSetDone} đúng
              </span>
            </div>
            <QuestionCard
              key={cur.id}
              q={cur}
              index={Math.min(pIdx, filtered.length - 1) + 1}
              marked={marked.has(cur.id)}
              forceOpen={false}
              picked={picks[cur.id]}
              onToggleMark={() => toggleMark(cur.id)}
              onPick={(k) => pick(cur, k)}
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={pIdx <= 0}
                onClick={() => setPIdx((i) => Math.max(0, i - 1))}
                className="inline-flex items-center gap-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Câu trước
              </button>
              <span className="hidden sm:inline text-[11px] font-semibold text-slate-400">
                Phím <b>1–4</b> chọn đáp án · <b>← →</b> chuyển câu · <b>S</b> đánh dấu
              </span>
              <button
                type="button"
                disabled={pIdx >= filtered.length - 1}
                onClick={() => setPIdx((i) => Math.min(filtered.length - 1, i + 1))}
                className="inline-flex items-center gap-1 px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black shadow-md shadow-sky-500/30 disabled:opacity-40 cursor-pointer"
              >
                {picks[cur.id] ? 'Câu tiếp theo' : 'Bỏ qua'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bảng câu */}
          <aside className="xl:sticky xl:top-6 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Bảng câu</span>
              <span className="text-[11px] font-bold text-slate-400">{filtered.length} câu</span>
            </div>
            <div className="grid grid-cols-8 xl:grid-cols-6 gap-1.5 max-h-[52vh] overflow-y-auto pr-1">
              {filtered.map((q, i) => {
                const pk = picks[q.id];
                const st2 = pk ? (pk === q.answer?.key ? 'ok' : 'no') : '';
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setPIdx(i)}
                    title={`${q.id} · ${q.category}`}
                    className={`relative h-8 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                      i === pIdx ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''
                    } ${
                      st2 === 'ok'
                        ? 'bg-emerald-500 text-white'
                        : st2 === 'no'
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {i + 1}
                    {marked.has(q.id) && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900" />}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-400 pt-1">
              <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded bg-emerald-500" /> Đúng</span>
              <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded bg-rose-500" /> Sai</span>
              <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Cần ôn</span>
            </div>
          </aside>
        </div>
      ) : (
        /* ======================= XEM DANH SÁCH ======================= */
        <>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
            <span>
              {filtered.length} câu · Trang {curPage + 1}/{maxPage}
            </span>
            <span className="hidden md:inline">{st.answer_note}</span>
          </div>
          <div className="space-y-4">
            {pageItems.map((q, i) => (
              <QuestionCard
                key={q.id}
                q={q}
                index={curPage * PAGE_SIZE + i + 1}
                marked={marked.has(q.id)}
                forceOpen={showAll}
                picked={picks[q.id]}
                onToggleMark={() => toggleMark(q.id)}
                onPick={(k) => pick(q, k)}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              disabled={curPage === 0}
              onClick={() => goPage(curPage - 1)}
              className="inline-flex items-center gap-1 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Trang trước
            </button>
            <span className="px-3 text-xs font-black text-slate-500">
              {curPage + 1} / {maxPage}
            </span>
            <button
              type="button"
              disabled={curPage >= maxPage - 1}
              onClick={() => goPage(curPage + 1)}
              className="inline-flex items-center gap-1 px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black disabled:opacity-40 cursor-pointer"
            >
              Trang sau <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
