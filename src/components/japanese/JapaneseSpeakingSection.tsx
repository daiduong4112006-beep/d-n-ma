import {readAccountState,saveAccountState,subscribeAccountState} from '../../utils/accountState';
import {getCurrentUserEmail} from '../../utils/storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic,
  Maximize2,
  Minimize2,
  Home,
  Compass,
  BookOpen,
  BookText,
  MessageCircleQuestion,
  Image as ImageIcon,
  Zap,
  ClipboardCheck,
  PenLine,
} from 'lucide-react';
import { SectionHeader, FilterChip } from './courseUi';
import { SpeakingRecorder } from './SpeakingRecorder';

/* ----------------------------------------------------------------------------
 * Ôn SPK – bộ ôn thi nói JPD123. Toàn bộ tính năng của bản gốc chạy trong khung
 * riêng (public/jpd123-speaking/), còn thanh điều hướng do app vẽ để cùng một kiểu
 * với các mục Từ vựng / Chữ Hán / Ngữ pháp / Source FE.
 * ------------------------------------------------------------------------- */

interface Props {
  /** Đường dẫn tới bản Speaking (mặc định trong thư mục public) */
  src?: string;
  /** Dùng cho bản demo một file: nội dung HTML nhúng sẵn */
  srcDoc?: string;
  /** Mục đang mở (điều khiển từ thanh bên trái của khóa học) */
  route?: string;
  onRouteChange?: (route: string) => void;
  /** Báo số tiến độ (vd. Câu hỏi 3/48) để thanh bên trái hiển thị */
  onCounts?: (c: Record<string, string>) => void;
}

type SpkWindow = Window & {
  zoom?: (src: string) => void;
  __IMG?: Record<string, string>;
  go?: (k: string, arg?: unknown) => void;
  counts?: () => Record<string, string>;
  __dmPatched?: boolean;
  __dmPersist?:(value:any)=>void;
  __dmGetState?:()=>any;
  __dmApplyState?:(value:any)=>void;
};

export const SPK_GROUPS: { label: string; items: { k: string; label: string; icon: React.ReactNode; count?: string }[] }[] = [
  {
    label: 'Bắt đầu',
    items: [
      { k: 'home', label: 'Tổng quan', icon: <Home className="w-3.5 h-3.5" /> },
      { k: 'guide', label: 'Cách thi', icon: <Compass className="w-3.5 h-3.5" /> },
      { k: 'vocab', label: 'Từ vựng', icon: <BookOpen className="w-3.5 h-3.5" /> },
    ],
  },
  {
    label: 'Luyện',
    items: [
      { k: 'read', label: 'Luyện đọc', icon: <BookText className="w-3.5 h-3.5" /> },
      { k: 'questions', label: 'Câu hỏi', icon: <MessageCircleQuestion className="w-3.5 h-3.5" /> },
      { k: 'pictures', label: 'Bộ tranh', icon: <ImageIcon className="w-3.5 h-3.5" /> },
      { k: 'flash', label: 'Hỏi nhanh', icon: <Zap className="w-3.5 h-3.5" /> },
    ],
  },
  {
    label: 'Kiểm tra',
    items: [
      { k: 'exam', label: 'Thi thử', icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
      { k: 'mine', label: 'Câu không tranh', icon: <PenLine className="w-3.5 h-3.5" /> },
    ],
  },
];

const useIsDark = () => {
  const get = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [dark, setDark] = useState(get);
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(get()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
};

export const JapaneseSpeakingSection: React.FC<Props> = ({
  src = '/jpd123-speaking/index.html',
  srcDoc,
  route: routeProp,
  onRouteChange,
  onCounts,
}) => {
  const dark = useIsDark();
  const theme = dark ? 'dark' : 'light';
  const [full, setFull] = useState(false);
  const [localRoute, setLocalRoute] = useState('home');
  const route = routeProp ?? localRoute;
  const setRoute = (k: string) => (onRouteChange ? onRouteChange(k) : setLocalRoute(k));
  const onCountsRef = useRef(onCounts);
  onCountsRef.current = onCounts;
  const setRouteRef = useRef(setRoute);
  setRouteRef.current = setRoute;
  const [counts, setCounts] = useState<Record<string, string>>({});
  const writingState=useRef(false);
  useEffect(()=>subscribeAccountState('jpd-speaking',()=>{if(writingState.current)return;const value=readAccountState<any>('jpd-speaking',null);if(value){frameRef.current?.contentWindow&&((frameRef.current.contentWindow as SpkWindow).__dmApplyState?.(value));refreshCounts();}}),[]);
  const [height, setHeight] = useState(900);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const routeRef = useRef('home');
  routeRef.current = route;
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!zoomSrc) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoomSrc(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomSrc]);

  useEffect(() => {
    if (!full || zoomSrc) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full, zoomSrc]);

  const win = () => frameRef.current?.contentWindow as SpkWindow | null;

  const refreshCounts = () => {
    try {
      const c = win()?.counts?.();
      if (c) {
        setCounts(c);
        onCountsRef.current?.(c);
      }
    } catch {}
  };

  // Khi khung tải xong: bắt mọi lần chuyển mục bên trong để đồng bộ thanh điều hướng của app,
  // và tự giãn chiều cao khung theo nội dung (không bị 2 thanh cuộn).
  const onLoad = useCallback(() => {
    const w = win();
    if (!w) return;
    try {
      w.__dmPersist=value=>{writingState.current=true;try{saveAccountState('jpd-speaking',value);}finally{writingState.current=false;}refreshCounts();};
      const saved=readAccountState<any>('jpd-speaking',null,'jpd123_v1');if(saved)w.__dmApplyState?.(saved);
      if (w.go && !w.__dmPatched) {
        const orig = w.go;
        w.go = (k: string, arg?: unknown) => {
          orig(k, arg);
          setRouteRef.current(k);
          setTimeout(refreshCounts, 0);
        };
        // Phóng to tranh bằng lớp phủ của app (khung tự giãn nên lớp phủ bên trong sẽ lệch)
        w.zoom = (src: string) => {
          try {
            setZoomSrc(w.__IMG?.[src] || new URL(src, w.location.href).href);
          } catch {
            setZoomSrc(src);
          }
        };
        w.__dmPatched = true;
      }
      // Khung tải lại (vd. đổi sáng/tối) → quay lại đúng mục đang xem
      if (routeRef.current !== 'home') w.go?.(routeRef.current);
      refreshCounts();
      const doc = w.document;
      const measure = () => setHeight(Math.max(560, doc.documentElement.scrollHeight));
      measure();
      const ro = new (w as unknown as typeof globalThis).ResizeObserver(measure);
      ro.observe(doc.body);
      // ghi nhớ tiến độ cũng cập nhật lại số đếm
      doc.addEventListener('click', () => setTimeout(refreshCounts, 50));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Thanh bên trái đổi mục → chuyển mục trong khung
  useEffect(() => {
    try {
      const w = win();
      if (w?.go && w.__dmPatched) {
        const cur = (w.location.hash || '').slice(1);
        if (cur !== route) w.go(route);
      }
    } catch {}
    if (!full) wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  const navigate = (k: string) => {
    try {
      win()?.go?.(k);
    } catch {}
    setRoute(k);
    if (!full) wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const doc = srcDoc ? srcDoc.replace('<html', `<html data-theme="${theme}" data-embed="1"`) : undefined;

  const nav = (
    <div className="flex gap-1.5 overflow-x-auto pb-1 items-center">
      {SPK_GROUPS.map((g, gi) => (
        <React.Fragment key={g.label}>
          {gi > 0 && <span className="shrink-0 w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1.5" />}
          <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 hidden md:inline">
            {g.label}
          </span>
          {g.items.map((it) => (
            <FilterChip
              key={it.k}
              tone="emerald"
              active={route === it.k}
              onClick={() => navigate(it.k)}
              label={
                <span className="inline-flex items-center gap-1.5">
                  {it.icon}
                  {it.label}
                  {counts[it.k] && (
                    <span className={`text-[10px] font-black ${route === it.k ? 'text-white/80' : 'text-slate-400'}`}>
                      {counts[it.k]}
                    </span>
                  )}
                </span>
              }
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <SectionHeader
        tone="emerald"
        icon={<Mic className="w-6 h-6" />}
        eyebrow="Mục 4 · Ôn SPK"
        title="Ôn thi nói Bài 4 – 7"
        desc="18 bài đọc, 48 câu hỏi, 29 bộ tranh và 10 đề thi thử có đồng hồ. Bấm loa để nghe giọng Nhật mẫu, bấm Ghi âm luyện nói (góc phải) để thu câu trả lời và nghe lại so với mẫu."
        actions={
          <button
            type="button"
            onClick={() => setFull(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" /> Toàn màn hình
          </button>
        }
      />

      <div ref={wrapRef} className="scroll-mt-4" />

      <div className={full ? 'fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-950 flex flex-col' : ''}>
        {full && (
          <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-wider text-emerald-500">ÔN SPK · JPD123</span>
              <button
                type="button"
                onClick={() => setFull(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" /> Thu nhỏ (Esc)
              </button>
            </div>
            {nav}
          </div>
        )}
        <iframe
          ref={frameRef}
          key={theme}
          title="Ôn thi nói JPD123"
          src={doc ? undefined : `${src}?v=spk-20261105-sync&theme=${theme}&embed=1&account=${encodeURIComponent(getCurrentUserEmail())}#${route}`}
          srcDoc={doc}
          onLoad={onLoad}
          allow="autoplay"
          className={full ? 'flex-1 w-full border-0 bg-transparent px-4' : 'w-full border-0 block bg-transparent'}
          style={full ? { overflow: 'auto' } : { height }}
        />
      </div>
      <SpeakingRecorder />
      {zoomSrc && (
        <div
          role="dialog"
          aria-label="Phóng to tranh"
          onClick={() => setZoomSrc(null)}
          className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img src={zoomSrc} alt="" className="max-w-full max-h-full rounded-2xl shadow-2xl bg-white" />
        </div>
      )}
    </div>
  );
};
