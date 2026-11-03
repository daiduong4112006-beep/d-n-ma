import { subscribeStorageKeys } from '../../utils/storageEvents';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Volume2, Eye, RotateCcw, Trophy, Sparkles, Settings2 } from 'lucide-react';
import { JapaneseCourse } from '../../types/japanese';
import { SectionHeader, ToneButton, TONE } from './courseUi';
import {
  SM2Grade,
  SM2State,
  getSM2Records,
  newSM2Item,
  computeNext,
  reviewSM2Item,
  describeInterval,
  isDue,
  isMastered,
  forecast,
  getDailyCounter,
  getNewPerDay,
  setNewPerDay,
  pullSrsFromCloud,
  subscribeSrsFromCloud,
} from '../../utils/spacedRepetition';
import { speakJapanese } from '../../utils/japaneseKana';
import { sound } from '../../utils/audio';

export type SrsScope = 'all' | 'vocab' | 'kanji';

/** Một thẻ ôn tập đã chuẩn hóa (từ vựng hoặc chữ Hán) */
export interface SrsCard {
  id: string;
  kind: 'word' | 'kanji';
  front: string;
  reading?: string;
  meaning: string;
  extra?: string;
  extraMeaning?: string;
  tag: string;
}

export const buildSrsCards = (course: JapaneseCourse, scope: SrsScope = 'all'): SrsCard[] => {
  const out: SrsCard[] = [];
  const seen = new Set<string>();
  if (scope !== 'kanji') {
    for (const l of course.lessons || []) {
      const tag = (l.lessonCode || l.title).match(/(\d+)/)?.[1];
      for (const c of l.cards || []) {
        const id = `v:${c.id}`;
        if (seen.has(id) || !c.term) continue;
        seen.add(id);
        out.push({
          id,
          kind: 'word',
          front: c.term,
          reading: c.reading && c.reading !== c.term ? c.reading : undefined,
          meaning: c.definition,
          extra: c.example,
          extraMeaning: c.exampleMeaning,
          tag: tag ? `Từ vựng · Bài ${tag}` : 'Từ vựng',
        });
      }
    }
  }
  if (scope !== 'vocab') {
    for (const k of course.kanjiList || []) {
      const id = `k:${k.id}`;
      if (seen.has(id) || !k.kanji) continue;
      seen.add(id);
      out.push({
        id,
        kind: 'kanji',
        front: k.kanji,
        reading: [k.onyomi && `On: ${k.onyomi}`, k.kunyomi && `Kun: ${k.kunyomi}`].filter(Boolean).join(' · ') || undefined,
        meaning: `${k.hanViet ? k.hanViet + ' – ' : ''}${k.meaning}`,
        extra: (k.examples || [])
          .slice(0, 3)
          .map((e) => `${e.word}（${e.reading}）${e.meaning}`)
          .join('\n') || undefined,
        tag: `Chữ Hán · Bài ${(k.lessonTag || 'L4').replace('L', '')}`,
      });
    }
  }
  return out;
};

/** Số thẻ cần ôn hôm nay theo từng phạm vi (để hiện trên thanh bên) */
export const computeSrsTodayCounts = (course: JapaneseCourse): Record<SrsScope, number> => {
  const r = getSM2Records();
  const newLeft = Math.max(0, getNewPerDay() - getDailyCounter().new);
  const all = buildSrsCards(course, 'all');
  const calc = (list: SrsCard[]) =>
    list.filter((c) => isDue(r[c.id])).length + Math.min(newLeft, list.filter((c) => !r[c.id]?.lastReviewedDate).length);
  return { all: calc(all), vocab: calc(all.filter((c) => c.kind === 'word')), kanji: calc(all.filter((c) => c.kind === 'kanji')) };
};

const GRADES: { g: SM2Grade; label: string; cls: string }[] = [
  { g: 1, label: 'Quên', cls: 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/30' },
  { g: 2, label: 'Khó', cls: 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30' },
  { g: 3, label: 'Nhớ', cls: 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30' },
  { g: 4, label: 'Dễ', cls: 'bg-sky-500 hover:bg-sky-400 shadow-sky-500/30' },
];

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

interface Props {
  course: JapaneseCourse;
  scope: SrsScope;
  onCounts?: (counts: Record<SrsScope, number>) => void;
}

export const JapaneseSrsSection: React.FC<Props> = ({ course, scope, onCounts }) => {
  const [version, setVersion] = useState(0);
  const [newPerDay, setNewPerDayState] = useState(getNewPerDay);
  const [queue, setQueue] = useState<SrsCard[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState({ total: 0, again: 0 });

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    pullSrsFromCloud().then((ok) => ok && refresh());
    const h = () => refresh();
    const stopCloud=subscribeSrsFromCloud();const stopStorage=subscribeStorageKeys(key=>key.startsWith('dun_srs_v2_'),h);
    window.addEventListener('mcq_sm2_updated', h);
    return () => {stopCloud();stopStorage();window.removeEventListener('mcq_sm2_updated', h);};
  }, [refresh]);

  const allCards = useMemo(() => buildSrsCards(course, 'all'), [course]);
  const cards = useMemo(() => buildSrsCards(course, scope), [course, scope]);

  const stats = useMemo(() => {
    const r = getSM2Records();
    const daily = getDailyCounter();
    const newLeft = Math.max(0, newPerDay - daily.new);
    const calc = (list: SrsCard[]) => {
      const due = list.filter((c) => isDue(r[c.id]));
      const unseen = list.filter((c) => !r[c.id]?.lastReviewedDate);
      return {
        due,
        unseen,
        learning: list.filter((c) => r[c.id]?.lastReviewedDate && !isMastered(r[c.id])).length,
        mastered: list.filter((c) => isMastered(r[c.id])).length,
        todayCount: due.length + Math.min(newLeft, unseen.length),
      };
    };
    const cur = calc(cards);
    const per: Record<SrsScope, number> = {
      all: calc(allCards).todayCount,
      vocab: calc(allCards.filter((c) => c.kind === 'word')).todayCount,
      kanji: calc(allCards.filter((c) => c.kind === 'kanji')).todayCount,
    };
    return { ...cur, newLeft, daily, per, records: r, fc: forecast(cards.map((c) => c.id), 7) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, allCards, newPerDay, version]);

  useEffect(() => {
    onCounts?.(stats.per);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.per.all, stats.per.vocab, stats.per.kanji]);

  const startSession = () => {
    const r = getSM2Records();
    const due = [...stats.due].sort(
      (a, b) => new Date(r[a.id].nextReviewDate).getTime() - new Date(r[b.id].nextReviewDate).getTime()
    );
    const fresh = stats.unseen.slice(0, stats.newLeft);
    // Xen kẽ thẻ mới vào giữa thẻ ôn để đỡ nhàm
    const q: SrsCard[] = [];
    let i = 0;
    let j = 0;
    while (i < due.length || j < fresh.length) {
      if (i < due.length) q.push(due[i++]);
      if (i < due.length) q.push(due[i++]);
      if (j < fresh.length) q.push(fresh[j++]);
    }
    if (!q.length) return;
    setQueue(q);
    setRevealed(false);
    setDone({ total: 0, again: 0 });
    sound.playClick();
  };

  const current = queue?.[0];

  const grade = useCallback(
    (g: SM2Grade) => {
      if (!current || !queue) return;
      const s = reviewSM2Item(current.id, g, current.kind);
      g === 1 ? sound.playWrong() : sound.playCorrect();
      const rest = queue.slice(1);
      if (s.interval === 0) {
        // Quên → đưa lại sau vài thẻ trong cùng buổi
        rest.splice(Math.min(rest.length, 4), 0, current);
      }
      setDone((d) => ({ total: d.total + 1, again: d.again + (g === 1 ? 1 : 0) }));
      setQueue(rest);
      setRevealed(false);
    },
    [current, queue]
  );

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!revealed && (e.code === 'Space' || e.key === 'Enter')) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        grade(Number(e.key) as SM2Grade);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, revealed, grade]);

  const tone = 'violet' as const;
  const speakText = (c: SrsCard) => (c.kind === 'word' ? c.reading || c.front : c.front);

  // ================= Đang ôn =================
  if (queue && current) {
    const st: SM2State = getSM2Records()[current.id] || newSM2Item(current.id, current.kind);
    const isNew = !st.lastReviewedDate;
    const total = done.total + queue.length;
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setQueue(null);
              refresh();
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            ← Dừng ôn
          </button>
          <span className="text-xs font-black text-slate-500">
            Còn {queue.length} thẻ · đã chấm {done.total}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className={`h-full ${TONE[tone].bar} transition-all`} style={{ width: `${total ? (done.total / total) * 100 : 0}%` }} />
        </div>

        <div className="mx-auto max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 text-[11px] font-black uppercase tracking-wider">
            <span className="text-slate-400">{current.tag}</span>
            <span className={isNew ? 'text-sky-500' : st.interval === 0 ? 'text-rose-500' : 'text-emerald-500'}>
              {isNew ? 'Thẻ mới' : st.interval === 0 ? 'Học lại' : 'Ôn tập'}
            </span>
          </div>
          <div className="px-6 py-10 text-center space-y-4">
            <div className={`font-japanese font-black text-slate-900 dark:text-white ${current.kind === 'kanji' ? 'text-8xl' : 'text-5xl'}`}>
              {current.front}
            </div>
            {revealed ? (
              <div className="space-y-3 animate-in fade-in duration-150">
                {current.reading && <div className="font-japanese text-lg font-bold text-violet-600 dark:text-violet-400">{current.reading}</div>}
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">{current.meaning}</div>
                {current.extra && (
                  <div className="mx-auto max-w-lg whitespace-pre-line rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-left text-sm">
                    <div className="font-japanese text-slate-700 dark:text-slate-200">{current.extra}</div>
                    {current.extraMeaning && <div className="mt-1 text-slate-500 dark:text-slate-400">{current.extraMeaning}</div>}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => speakJapanese(speakText(current))}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" /> Nghe
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Nhớ lại nghĩa và cách đọc, rồi bấm Hiện đáp án.</p>
            )}
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 p-4">
            {!revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 text-sm font-black cursor-pointer active:scale-[0.99]"
              >
                <Eye className="w-4 h-4" /> Hiện đáp án <span className="text-[10px] opacity-60">(Space)</span>
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map(({ g, label, cls }) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => grade(g)}
                    className={`rounded-2xl py-3 text-white shadow-md cursor-pointer active:scale-95 transition-all ${cls}`}
                  >
                    <span className="block text-sm font-black">{label}</span>
                    <span className="block text-[10px] font-bold opacity-85">{describeInterval(computeNext(st, g))} · {g}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= Tổng quan =================
  const maxFc = Math.max(1, ...stats.fc);
  const finished = queue && !current;
  const scopeLabel = scope === 'vocab' ? 'từ vựng' : scope === 'kanji' ? 'chữ Hán' : 'từ vựng và chữ Hán';

  return (
    <div className="space-y-5">
      <SectionHeader
        tone={tone}
        icon={<CalendarClock className="w-6 h-6" />}
        eyebrow="Ôn tập ngắt quãng"
        title="Ôn hôm nay"
        desc={`Thẻ ${scopeLabel} hay quên sẽ quay lại sớm, thẻ đã nhớ sẽ giãn ra vài ngày rồi vài tuần. Mỗi ngày chỉ cần ôn hết phần đến hạn.`}
        actions={
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Settings2 className="w-4 h-4" />
            Thẻ mới/ngày
            <select
              value={newPerDay}
              onChange={(e) => {
                const n = Number(e.target.value);
                setNewPerDay(n);
                setNewPerDayState(n);
              }}
              className="bg-transparent font-black focus:outline-none cursor-pointer"
            >
              {[5, 10, 20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        }
      />

      {finished && (
        <div className="flex items-center gap-4 rounded-3xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 p-5">
          <Trophy className="w-10 h-10 text-emerald-500 shrink-0" />
          <div className="text-sm">
            <div className="font-black text-emerald-800 dark:text-emerald-200">Xong buổi ôn! Bạn đã chấm {done.total} lượt.</div>
            <div className="text-emerald-700/80 dark:text-emerald-300/80">
              {done.again ? `${done.again} lần chọn "Quên", các thẻ đó sẽ quay lại sớm.` : 'Không quên thẻ nào, tuyệt vời!'}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Đến hạn ôn', value: stats.due.length, cls: 'text-violet-600 dark:text-violet-400' },
          { label: 'Thẻ mới hôm nay', value: Math.min(stats.newLeft, stats.unseen.length), cls: 'text-sky-600 dark:text-sky-400' },
          { label: 'Đang học', value: stats.learning, cls: 'text-amber-600 dark:text-amber-400' },
          { label: 'Đã thuộc (≥21 ngày)', value: stats.mastered, cls: 'text-emerald-600 dark:text-emerald-400' },
        ].map((t) => (
          <div key={t.label} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className={`text-3xl font-black ${t.cls}`}>{t.value}</div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="rounded-3xl bg-slate-900 text-white p-6 flex flex-col justify-between gap-5 relative overflow-hidden">
          <Sparkles className="absolute -right-4 -top-4 w-32 h-32 text-white/5" />
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-violet-300">Hôm nay</div>
            <div className="mt-1 text-4xl font-black">{stats.todayCount} thẻ</div>
            <p className="mt-1 text-sm text-slate-400">
              {stats.due.length} thẻ ôn + {Math.min(stats.newLeft, stats.unseen.length)} thẻ mới · hôm nay đã ôn {stats.daily.review + stats.daily.new} lượt
            </p>
          </div>
          {stats.todayCount > 0 ? (
            <ToneButton tone={tone} onClick={startSession} className="self-start !px-6 !py-3 !text-sm">
              Bắt đầu ôn
            </ToneButton>
          ) : (
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
              <RotateCcw className="w-4 h-4" />
              {stats.unseen.length
                ? 'Đã hết phần hôm nay. Muốn học thêm, tăng số thẻ mới/ngày.'
                : 'Không còn thẻ đến hạn. Quay lại vào ngày mai nhé!'}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs font-black text-slate-700 dark:text-slate-200">Lịch ôn 7 ngày tới</div>
          <div className="mt-4 flex items-end gap-2 h-28">
            {stats.fc.map((n, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] font-black text-slate-500">{n || ''}</span>
                  <div
                    className={`w-full rounded-md ${i === 0 ? TONE[tone].bar : 'bg-violet-200 dark:bg-violet-500/30'}`}
                    style={{ height: `${Math.max(4, (n / maxFc) * 80)}%` }}
                  />
                  <span className="text-[10px] font-bold text-slate-400">{i === 0 ? 'Nay' : WEEKDAY[d.getDay()]}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Tổng {cards.length} thẻ · chưa học {stats.unseen.length}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        Mẹo: phím Space để hiện đáp án, phím 1–4 để chấm Quên / Khó / Nhớ / Dễ. Tiến độ được lưu trên máy và đồng bộ lên tài khoản.
      </p>
    </div>
  );
};
