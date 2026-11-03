import { subscribeStorageKeys } from '../../utils/storageEvents';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Timer, Flag, Send, Trophy, RotateCcw, History, ChevronLeft, ChevronRight, Star, Play } from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { sound } from '../../utils/audio';

/* ----------------------------------------------------------------------------
 * Thi thử FE: bốc ngẫu nhiên N câu theo đúng tỉ lệ các dạng, có đồng hồ,
 * chấm điểm thang 10, lưu lịch sử (máy + Firestore fe_mock_exams/{email}).
 * ------------------------------------------------------------------------- */

export interface MockQuestion {
  id: string;
  category: string;
  html: string;
  answer?: { key?: string; text?: string; why?: string; unsure?: boolean };
}

export interface MockAttempt {
  id: string;
  date: string;
  total: number;
  correct: number;
  minutes: number;
  usedSeconds: number;
  byCat: Record<string, { total: number; correct: number }>;
  wrongIds: string[];
}

const HISTORY_KEY = 'jpd-fe-mock-history';
const EXCLUDE_CATS = new Set(['Cần xem lại / nhiều câu']);

const loadHistory = (): MockAttempt[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
};
const saveHistory = (h: MockAttempt[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 30)));
  } catch {}
  const email = (auth.currentUser?.email || '').toLowerCase();
  if (email) setDoc(doc(db, 'fe_mock_exams', email), { email, history: h.slice(0, 30), updatedAt: new Date().toISOString() }).catch(() => {});
};

const shuffle = <T,>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/** Bốc n câu, chia theo tỉ lệ số câu của từng dạng (phương pháp phần dư lớn nhất) */
export const sampleExam = (pool: MockQuestion[], n: number): MockQuestion[] => {
  const byCat = new Map<string, MockQuestion[]>();
  pool.forEach((q) => byCat.set(q.category, [...(byCat.get(q.category) || []), q]));
  const total = pool.length;
  const quotas = [...byCat.entries()].map(([c, qs]) => {
    const exact = (qs.length / total) * n;
    return { c, qs, take: Math.floor(exact), rem: exact - Math.floor(exact) };
  });
  let left = n - quotas.reduce((s, q) => s + q.take, 0);
  quotas.sort((a, b) => b.rem - a.rem).forEach((q) => {
    if (left > 0 && q.take < q.qs.length) {
      q.take++;
      left--;
    }
  });
  return shuffle(quotas.flatMap((q) => shuffle(q.qs).slice(0, q.take)));
};

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const score10 = (a: { correct: number; total: number }) => (a.total ? Math.round((a.correct / a.total) * 100) / 10 : 0);

/** Câu hỏi trong phòng thi: chọn đáp án nhưng KHÔNG hiện đúng/sai */
const ExamQuestion: React.FC<{ q: MockQuestion; chosen?: string; onChoose: (k: string) => void; review?: boolean }> = ({
  q,
  chosen,
  onChoose,
  review,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelectorAll<HTMLElement>('.q-option').forEach((el) => {
      const key = (el.querySelector('b')?.textContent || '').trim();
      el.dataset.key = key;
      el.classList.remove('is-sel', 'is-ok', 'is-no', 'is-pickable');
      if (review) {
        if (key === q.answer?.key) el.classList.add('is-ok');
        else if (key === chosen) el.classList.add('is-no');
      } else {
        el.classList.add('is-pickable');
        if (key === chosen) el.classList.add('is-sel');
      }
    });
  }, [chosen, q.id, review, q.answer?.key]);
  return (
    <div
      ref={ref}
      onClick={(e) => {
        if (review) return;
        const opt = (e.target as HTMLElement).closest<HTMLElement>('.q-option');
        if (opt?.dataset.key) onChoose(opt.dataset.key);
      }}
      className="fe-question text-slate-800 dark:text-slate-100 font-japanese"
      dangerouslySetInnerHTML={{ __html: q.html }}
    />
  );
};

export const FeMockExam: React.FC<{
  questions: MockQuestion[];
  onMarkForReview?: (ids: string[]) => void;
}> = ({ questions, onMarkForReview }) => {
  const pool = useMemo(
    () => questions.filter((q) => q.answer?.key && !q.answer.unsure && !EXCLUDE_CATS.has(q.category)),
    [questions]
  );
  const [count, setCount] = useState(50);
  const [minutes, setMinutes] = useState(50);
  const [exam, setExam] = useState<MockQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [idx, setIdx] = useState(0);
  const [endAt, setEndAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<MockAttempt | null>(null);
  const [history, setHistory] = useState<MockAttempt[]>(loadHistory);
  const [reviewIdx, setReviewIdx] = useState(0);

  useEffect(()=>{
    const stopStorage=subscribeStorageKeys(key=>key===HISTORY_KEY,()=>setHistory(loadHistory()));
    const email=(auth.currentUser?.email||'').toLowerCase();
    const stopCloud=email?onSnapshot(doc(db,'fe_mock_exams',email),snapshot=>{
      const remote:MockAttempt[]=snapshot.exists()?snapshot.data().history||[]:[];
      const map=new Map([...loadHistory(),...remote].map(a=>[a.id,a]));
      const merged=[...map.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);
      if(JSON.stringify(merged)!==JSON.stringify(loadHistory())){localStorage.setItem(HISTORY_KEY,JSON.stringify(merged));setHistory(merged);}
    },error=>console.warn('FE history sync unavailable:',error)):()=>{};
    return ()=>{stopStorage();stopCloud();};
  },[]);

  const remaining = exam && !result ? Math.max(0, Math.round((endAt - now) / 1000)) : 0;

  const submit = useCallback(() => {
    if (!exam) return;
    const byCat: MockAttempt['byCat'] = {};
    let correct = 0;
    const wrongIds: string[] = [];
    exam.forEach((q) => {
      const ok = answers[q.id] === q.answer?.key;
      byCat[q.category] = byCat[q.category] || { total: 0, correct: 0 };
      byCat[q.category].total++;
      if (ok) {
        correct++;
        byCat[q.category].correct++;
      } else wrongIds.push(q.id);
    });
    const att: MockAttempt = {
      id: `fe_${Date.now()}`,
      date: new Date().toISOString(),
      total: exam.length,
      correct,
      minutes,
      usedSeconds: Math.min(minutes * 60, Math.round((Date.now() - (endAt - minutes * 60000)) / 1000)),
      byCat,
      wrongIds,
    };
    const h = [att, ...history].slice(0, 30);
    setHistory(h);
    saveHistory(h);
    setResult(att);
    setReviewIdx(0);
    sound.playFinish();
  }, [exam, answers, minutes, endAt, history]);

  useEffect(() => {
    if (!exam || result) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [exam, result]);

  useEffect(() => {
    if (exam && !result && endAt && now >= endAt) submit();
  }, [now, endAt, exam, result, submit]);

  // Cảnh báo khi rời trang giữa giờ thi
  useEffect(() => {
    if (!exam || result) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [exam, result]);

  const start = () => {
    setExam(sampleExam(pool, Math.min(count, pool.length)));
    setAnswers({});
    setFlags(new Set());
    setIdx(0);
    setResult(null);
    setEndAt(Date.now() + minutes * 60000);
    setNow(Date.now());
    sound.playClick();
  };

  // Phím tắt trong phòng thi
  useEffect(() => {
    if (!exam || result) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', a: 'A', b: 'B', c: 'C', d: 'D' };
      const q = exam[idx];
      if (map[e.key.toLowerCase()]) {
        setAnswers((p) => ({ ...p, [q.id]: map[e.key.toLowerCase()] }));
      } else if (e.key === 'ArrowRight') setIdx((i) => Math.min(exam.length - 1, i + 1));
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      else if (e.key.toLowerCase() === 'f') toggleFlag(q.id);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exam, idx, result]);

  const toggleFlag = (id: string) =>
    setFlags((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // Dạng hay sai (gộp các lần thi gần nhất)
  const weak = useMemo(() => {
    const agg: Record<string, { total: number; correct: number }> = {};
    history.slice(0, 10).forEach((a) =>
      Object.entries(a.byCat).forEach(([c, v]) => {
        agg[c] = agg[c] || { total: 0, correct: 0 };
        agg[c].total += v.total;
        agg[c].correct += v.correct;
      })
    );
    return Object.entries(agg)
      .map(([c, v]) => ({ c, ...v, pct: Math.round((v.correct / v.total) * 100) }))
      .sort((a, b) => a.pct - b.pct);
  }, [history]);

  const card = 'rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800';

  // ======================= KẾT QUẢ =======================
  if (exam && result) {
    const wrongQs = exam.filter((q) => result.wrongIds.includes(q.id));
    const rq = wrongQs[Math.min(reviewIdx, wrongQs.length - 1)];
    const s10 = score10(result);
    return (
      <div className="space-y-5">
        <div className={`${card} p-6 flex flex-col md:flex-row md:items-center gap-6`}>
          <div className="flex items-center gap-5">
            <div className={`w-24 h-24 rounded-3xl flex flex-col items-center justify-center text-white ${s10 >= 8 ? 'bg-emerald-500' : s10 >= 5 ? 'bg-sky-500' : 'bg-rose-500'}`}>
              <span className="text-3xl font-black leading-none">{s10.toFixed(1)}</span>
              <span className="text-[10px] font-bold opacity-80">/ 10 điểm</span>
            </div>
            <div>
              <div className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                <Trophy className="w-5 h-5 text-amber-500" /> Kết quả thi thử
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Đúng {result.correct}/{result.total} câu · làm trong {fmt(result.usedSeconds)} / {result.minutes} phút
              </p>
            </div>
          </div>
          <span className="flex-1" />
          <div className="flex flex-wrap gap-2">
            {onMarkForReview && wrongQs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onMarkForReview(result.wrongIds);
                  sound.playClick();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-400/50 text-amber-600 dark:text-amber-400 text-xs font-black cursor-pointer"
              >
                <Star className="w-4 h-4" /> Đánh dấu {wrongQs.length} câu sai để ôn
              </button>
            )}
            <button type="button" onClick={start} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black cursor-pointer shadow-md shadow-sky-500/30">
              <RotateCcw className="w-4 h-4" /> Thi đề mới
            </button>
            <button type="button" onClick={() => { setExam(null); setResult(null); }} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-300 cursor-pointer">
              Xong
            </button>
          </div>
        </div>

        <div className={`${card} p-5`}>
          <div className="text-xs font-black text-slate-700 dark:text-slate-200 mb-3">Điểm theo dạng câu</div>
          <div className="space-y-2">
            {Object.entries(result.byCat)
              .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
              .map(([c, v]) => {
                const p = Math.round((v.correct / v.total) * 100);
                return (
                  <div key={c} className="flex items-center gap-3 text-xs">
                    <span className="w-48 shrink-0 truncate font-bold text-slate-600 dark:text-slate-300">{c}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className={`h-full rounded-full ${p >= 80 ? 'bg-emerald-500' : p >= 50 ? 'bg-sky-500' : 'bg-rose-500'}`} style={{ width: `${p}%` }} />
                    </div>
                    <span className="w-16 text-right font-black text-slate-500">
                      {v.correct}/{v.total}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {rq && (
          <div className={`${card} p-5 space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black text-rose-500">
                Câu sai {Math.min(reviewIdx, wrongQs.length - 1) + 1}/{wrongQs.length} · {rq.category}
              </span>
              <div className="flex gap-1">
                <button type="button" disabled={reviewIdx <= 0} onClick={() => setReviewIdx((i) => i - 1)} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" disabled={reviewIdx >= wrongQs.length - 1} onClick={() => setReviewIdx((i) => i + 1)} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <ExamQuestion q={rq} chosen={answers[rq.id]} onChoose={() => {}} review />
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 text-sm space-y-1">
              <div>
                <b className="text-slate-500">Bạn chọn:</b> {answers[rq.id] || 'bỏ trống'} · <b className="text-emerald-600">Đáp án:</b>{' '}
                <span className="font-japanese font-bold">
                  {rq.answer?.key} {rq.answer?.text}
                </span>
              </div>
              {rq.answer?.why && <p className="text-slate-600 dark:text-slate-300">{rq.answer.why}</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ======================= PHÒNG THI =======================
  if (exam) {
    const q = exam[idx];
    const answered = Object.keys(answers).length;
    const low = remaining <= 300;
    return (
      <div className="grid xl:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
            <span className="text-sky-500 font-black">
              Câu {idx + 1}/{exam.length}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">{q.category}</span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => toggleFlag(q.id)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border cursor-pointer ${flags.has(q.id) ? 'border-amber-400 text-amber-600 bg-amber-500/10' : 'border-slate-200 dark:border-slate-700'}`}
            >
              <Flag className="w-3.5 h-3.5" /> {flags.has(q.id) ? 'Đã cắm cờ' : 'Cắm cờ'}
            </button>
          </div>
          <div className={`${card} p-5 sm:p-6`}>
            <ExamQuestion q={q} chosen={answers[q.id]} onChoose={(k) => setAnswers((p) => ({ ...p, [q.id]: k }))} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <button type="button" disabled={idx <= 0} onClick={() => setIdx((i) => i - 1)} className="inline-flex items-center gap-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black disabled:opacity-40 cursor-pointer">
              <ChevronLeft className="w-4 h-4" /> Câu trước
            </button>
            <span className="hidden sm:inline text-[11px] font-semibold text-slate-400">
              Phím <b>1–4</b> chọn · <b>← →</b> chuyển câu · <b>F</b> cắm cờ
            </span>
            <button type="button" disabled={idx >= exam.length - 1} onClick={() => setIdx((i) => i + 1)} className="inline-flex items-center gap-1 px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black disabled:opacity-40 cursor-pointer">
              Câu sau <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <aside className={`xl:sticky xl:top-6 ${card} p-4 space-y-4`}>
          <div className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-2xl font-black tabular-nums ${low ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-900 dark:bg-slate-800 text-white'}`}>
            <Timer className="w-5 h-5" /> {fmt(remaining)}
          </div>
          <div className="text-[11px] font-bold text-slate-400">
            Đã làm {answered}/{exam.length} · cắm cờ {flags.size}
          </div>
          <div className="grid grid-cols-8 xl:grid-cols-6 gap-1.5 max-h-[45vh] overflow-y-auto pr-1">
            {exam.map((x, i) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setIdx(i)}
                className={`relative h-8 rounded-lg text-[11px] font-black cursor-pointer ${i === idx ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''} ${
                  answers[x.id] ? 'bg-sky-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {i + 1}
                {flags.has(x.id) && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900" />}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const miss = exam.length - answered;
              if (window.confirm(miss ? `Còn ${miss} câu chưa làm. Nộp bài luôn?` : 'Nộp bài?')) submit();
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-black cursor-pointer shadow-md shadow-emerald-500/30"
          >
            <Send className="w-4 h-4" /> Nộp bài
          </button>
        </aside>
      </div>
    );
  }

  // ======================= CHUẨN BỊ =======================
  const sel = 'px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer';
  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
        <div className="rounded-3xl bg-slate-900 text-white p-6 space-y-5">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-sky-300">Thi thử cuối kỳ</div>
            <div className="mt-1 text-2xl font-black">Làm một đề ngẫu nhiên có tính giờ</div>
            <p className="mt-1 text-sm text-slate-400">
              Câu hỏi được bốc từ {pool.length} câu có đáp án chắc chắn, chia theo đúng tỉ lệ các dạng. Không hiện đáp án cho tới khi nộp bài.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1">
              <span className="block text-[11px] font-bold text-slate-400">Số câu</span>
              <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={sel}>
                {[20, 30, 40, 50, 60].map((n) => (
                  <option key={n} value={n}>
                    {n} câu
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] font-bold text-slate-400">Thời gian</span>
              <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={sel}>
                {[15, 20, 30, 40, 50, 60, 90].map((n) => (
                  <option key={n} value={n}>
                    {n} phút
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={start} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-black cursor-pointer shadow-md shadow-sky-500/30">
              <Play className="w-4 h-4 fill-white" /> Bắt đầu thi
            </button>
          </div>
        </div>

        <div className={`${card} p-5`}>
          <div className="text-xs font-black text-slate-700 dark:text-slate-200">Dạng hay sai (10 lần thi gần nhất)</div>
          {weak.length ? (
            <div className="mt-3 space-y-2">
              {weak.slice(0, 6).map((w) => (
                <div key={w.c} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate font-bold text-slate-600 dark:text-slate-300">{w.c}</span>
                  <span className={`font-black ${w.pct >= 80 ? 'text-emerald-500' : w.pct >= 50 ? 'text-sky-500' : 'text-rose-500'}`}>{w.pct}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">Chưa có dữ liệu, hãy thi thử một đề.</p>
          )}
        </div>
      </div>

      <div className={`${card} p-5`}>
        <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200 mb-3">
          <History className="w-4 h-4" /> Lịch sử thi thử
        </div>
        {history.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 text-xs">
                <span className={`w-12 text-center rounded-lg py-1 font-black text-white ${score10(a) >= 8 ? 'bg-emerald-500' : score10(a) >= 5 ? 'bg-sky-500' : 'bg-rose-500'}`}>
                  {score10(a).toFixed(1)}
                </span>
                <span className="font-bold text-slate-600 dark:text-slate-300">
                  {a.correct}/{a.total} câu
                </span>
                <span className="text-slate-400">
                  {fmt(a.usedSeconds)} / {a.minutes} phút
                </span>
                <span className="flex-1" />
                <span className="text-slate-400">{new Date(a.date).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Chưa có lần thi nào.</p>
        )}
      </div>
    </div>
  );
};
