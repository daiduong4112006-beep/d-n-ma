import {projectStorage as localStorage} from './projectStorage';
import {readAccountState,saveAccountState} from './accountState';
// Ôn tập ngắt quãng (SRS) – dựa trên SM-2, có bước "học lại" ngắn cho thẻ quên.
// Lưu trên máy theo từng tài khoản và đồng bộ lên Firestore: srs_progress/{email}.
import { doc, getDoc, onSnapshot } from '../lib/supabaseDocuments';
import { db, auth, currentEmail, writeCloudDocument as setDoc } from '../lib/cloud';

export type SM2Grade = 1 | 2 | 3 | 4; // 1: Quên, 2: Khó, 3: Nhớ, 4: Dễ

export interface SM2State {
  id: string;
  repetition: number;
  interval: number; // ngày (0 = đang học lại trong ngày)
  easeFactor: number;
  nextReviewDate: string; // ISO
  lastReviewedDate?: string;
  reviewCount: number;
  lapses?: number;
  type: 'word' | 'kanji' | 'question';
}

const DAY = 24 * 60 * 60 * 1000;
const RELEARN_MINUTES = 10;
const MASTERED_DAYS = 21;

const userKey = () => {
  const email = (currentEmail() || 'guest').toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `dun_srs_v2_${email}`;
};

export const getSM2Records = (): Record<string, SM2State> => {
  try {
    const raw = localStorage.getItem(userKey());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveSM2Records = (records: Record<string, SM2State>, opts: { skipCloud?: boolean } = {}): void => {
  try {
    localStorage.setItem(userKey(), JSON.stringify(records));
    window.dispatchEvent(new Event('mcq_sm2_updated'));
  } catch (e) {
    console.error('Error saving SRS records', e);
  }
  if (!opts.skipCloud) scheduleCloudSave();
};

export const newSM2Item = (id: string, type: SM2State['type'] = 'word'): SM2State => ({
  id,
  repetition: 0,
  interval: 0,
  easeFactor: 2.5,
  nextReviewDate: new Date().toISOString(),
  reviewCount: 0,
  lapses: 0,
  type,
});

export const getSM2Item = (id: string, type: SM2State['type'] = 'word'): SM2State =>
  getSM2Records()[id] || newSM2Item(id, type);

/** Tính trạng thái mới sau khi chấm (không lưu) – dùng cho cả xem trước khoảng cách */
export const computeNext = (current: SM2State, grade: SM2Grade, now = new Date()): SM2State => {
  let { repetition, interval, easeFactor } = current;
  let lapses = current.lapses || 0;
  let next: number;

  if (grade === 1) {
    if (repetition > 0) lapses += 1;
    repetition = 0;
    interval = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    next = now.getTime() + RELEARN_MINUTES * 60 * 1000;
  } else {
    if (grade === 2) {
      interval = repetition === 0 ? 1 : Math.max(1, Math.round(Math.max(interval, 1) * 1.2));
      easeFactor = Math.max(1.3, easeFactor - 0.15);
    } else if (grade === 3) {
      interval = repetition === 0 ? 1 : repetition === 1 ? 3 : Math.round(Math.max(interval, 1) * easeFactor);
    } else {
      interval = repetition === 0 ? 3 : repetition === 1 ? 6 : Math.round(Math.max(interval, 1) * easeFactor * 1.3);
      easeFactor = easeFactor + 0.15;
    }
    repetition += 1;
    next = now.getTime() + interval * DAY;
  }

  return {
    ...current,
    repetition,
    interval,
    lapses,
    easeFactor: Number(easeFactor.toFixed(2)),
    nextReviewDate: new Date(next).toISOString(),
    lastReviewedDate: now.toISOString(),
    reviewCount: current.reviewCount + 1,
  };
};

export const reviewSM2Item = (id: string, grade: SM2Grade, type: SM2State['type'] = 'word'): SM2State => {
  const records = getSM2Records();
  const updated = computeNext(records[id] || newSM2Item(id, type), grade);
  records[id] = updated;
  saveSM2Records(records);
  bumpDailyCounter(updated.reviewCount === 1 ? 'new' : 'review');
  return updated;
};

/** Mô tả ngắn khoảng cách tới lần ôn sau, vd. "10 phút", "3 ngày", "2 tháng" */
export const describeInterval = (s: SM2State, now = Date.now()): string => {
  const ms = new Date(s.nextReviewDate).getTime() - now;
  if (ms < 60 * 60 * 1000) return `${Math.max(1, Math.round(ms / 60000))} phút`;
  const d = Math.round(ms / DAY);
  if (d < 1) return `${Math.round(ms / 3600000)} giờ`;
  if (d < 30) return `${d} ngày`;
  if (d < 365) return `${Math.round(d / 30)} tháng`;
  return `${(d / 365).toFixed(1)} năm`;
};

const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

/** Thẻ đã học và đến hạn ôn (thẻ học lại tính theo phút, thẻ thường tính theo ngày) */
export const isDue = (s: SM2State | undefined, now = Date.now()): boolean => {
  if (!s || !s.lastReviewedDate) return false;
  const t = new Date(s.nextReviewDate).getTime();
  return s.interval === 0 ? t <= now : t <= endOfToday();
};

export const isMastered = (s?: SM2State) => !!s && s.interval >= MASTERED_DAYS;

// Tương thích với tên cũ
export const isItemDue = (id: string): boolean => isDue(getSM2Records()[id]);
export const getSM2DueItems = (): SM2State[] => Object.values(getSM2Records()).filter((s) => isDue(s));
export const countDueItems = (ids: string[]): number => {
  const r = getSM2Records();
  return ids.filter((id) => isDue(r[id])).length;
};

/** Số thẻ đến hạn trong N ngày tới (để vẽ lịch ôn) */
export const forecast = (ids: string[], days = 7): number[] => {
  const r = getSM2Records();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const out = new Array(days).fill(0);
  for (const id of ids) {
    const s = r[id];
    if (!s || !s.lastReviewedDate) continue;
    const t = new Date(s.nextReviewDate).getTime();
    const idx = Math.max(0, Math.floor((t - start.getTime()) / DAY));
    if (idx < days) out[idx] += 1;
  }
  return out;
};

// ---------------- Giới hạn thẻ mới mỗi ngày ----------------
const todayStr = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD theo giờ máy
const dailyKey = () => `${userKey()}_daily`;

export const getDailyCounter = (): { date: string; new: number; review: number } => {
  try {
    const d = readAccountState<any>('srs-daily',null,dailyKey());
    if (d && d.date === todayStr()) return d;
  } catch {}
  return { date: todayStr(), new: 0, review: 0 };
};

const bumpDailyCounter = (kind: 'new' | 'review') => {
  const d = getDailyCounter();
  d[kind] += 1;
  try {
    saveAccountState('srs-daily',d);
  } catch {}
};

export const getNewPerDay = (): number => {
  const n = Number(readAccountState('srs-new-per-day',20,'dun_srs_new_per_day'));
  return n > 0 ? n : 20;
};
export const setNewPerDay = (n: number) => saveAccountState('srs-new-per-day',n);

// ---------------- Đồng bộ đám mây ----------------
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const cloudEmail = () => (auth.currentUser?.email || '').toLowerCase();

const canonical=(value:any)=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);

export const mergeRecords = (a: Record<string, SM2State>, b: Record<string, SM2State>) => {
  const out: Record<string, SM2State> = { ...a };
  for (const [id, s] of Object.entries(b || {})) {
    const cur = out[id];
    if (!cur || (s.lastReviewedDate || '') > (cur.lastReviewedDate || '')) out[id] = s;
  }
  return out;
};

const scheduleCloudSave = () => {if(cloudEmail())void flushSrsToCloud().catch(()=>{});};

export const flushSrsToCloud = async () => {
  const email = cloudEmail();
  if (!email) return;
  await setDoc(doc(db, 'srs_progress', email), {
    email,
    records: getSM2Records(),
    updatedAt: new Date().toISOString(),
  });
};

/** Lấy tiến độ trên đám mây và gộp với bản trên máy (giữ lần ôn mới nhất của mỗi thẻ) */
export const pullSrsFromCloud = async (): Promise<boolean> => {
  const email = cloudEmail();
  if (!email) return false;
  try {
    const snap = await getDoc(doc(db, 'srs_progress', email));
    const remote = (snap.exists() && (snap.data() as any).records) || {};
    const local = getSM2Records();
    const merged = mergeRecords(local, remote);
    saveSM2Records(merged, { skipCloud: true });
    if (canonical(merged)!==canonical(remote)) scheduleCloudSave();
    return true;
  } catch {
    return false;
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      flushSrsToCloud().catch(() => {});
    }
  });
}

export const subscribeSrsFromCloud = (): (()=>void) => {
  const email=cloudEmail();if(!email)return ()=>{};
  return onSnapshot(doc(db,'srs_progress',email),snapshot=>{
    if(!snapshot.exists())return;
    const local=getSM2Records();const remote=snapshot.data().records||{};const merged=mergeRecords(local,remote);
    if(canonical(local)!==canonical(merged))saveSM2Records(merged,{skipCloud:true});
    if(canonical(merged)!==canonical(remote))scheduleCloudSave();
  },error=>console.warn('SRS sync unavailable:',error));
};
