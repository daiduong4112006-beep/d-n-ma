import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Play, Pause, Trash2, Download, X, ChevronDown, Volume2 } from 'lucide-react';
import { speakJapanese, katakanaToHiragana } from '../../utils/japaneseKana';
import { convertKanjiToHiragana } from '../../utils/japaneseKanjiConverter';

/* ----------------------------------------------------------------------------
 * Máy ghi âm nổi cho phần Ôn SPK: ghi lại câu trả lời, nghe lại để so với giọng
 * mẫu, và (trên Chrome/Edge) nhận dạng giọng nói tiếng Nhật để tự chấm phần đọc.
 * Bản ghi chỉ nằm trong trình duyệt, không tải lên đâu cả.
 * ------------------------------------------------------------------------- */

interface Take {
  id: string;
  url: string;
  blob: Blob;
  seconds: number;
  transcript: string;
  target: string;
  score?: number;
  at: Date;
}

const getRecognition = (): any => {
  const W = window as any;
  return W.SpeechRecognition || W.webkitSpeechRecognition || null;
};

/** Chuẩn hóa về hiragana, bỏ dấu câu/khoảng trắng để so sánh */
const norm = (s: string) =>
  katakanaToHiragana(convertKanjiToHiragana(s || ''))
    .replace(/[\s、。，．・！？!?「」『』（）()\[\]【】〜~ー\-.,]/g, '')
    .toLowerCase();

/** Độ giống nhau theo dãy con chung dài nhất (0–100) */
const similarity = (a: string, b: string) => {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  const dp = new Array(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    let prev = 0;
    for (let j = 1; j <= y.length; j++) {
      const tmp = dp[j];
      dp[j] = x[i - 1] === y[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return Math.round((dp[y.length] / Math.max(x.length, y.length)) * 100);
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const SpeakingRecorder: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState('');
  const [target, setTarget] = useState('');
  const [takes, setTakes] = useState<Take[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const srRef = useRef<any>(null);
  const chunks = useRef<Blob[]>([]);
  const startAt = useRef(0);
  const finalText = useRef('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canRecognize = !!getRecognition();

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed((Date.now() - startAt.current) / 1000), 200);
    return () => clearInterval(t);
  }, [recording]);

  // Giải phóng bộ nhớ khi rời mục
  useEffect(
    () => () => {
      takes.forEach((t) => URL.revokeObjectURL(t.url));
      recRef.current?.stream.getTracks().forEach((t) => t.stop());
      try {
        srRef.current?.abort();
      } catch {}
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Trình duyệt này không hỗ trợ ghi âm.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      finalText.current = '';
      setLive('');
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        const seconds = (Date.now() - startAt.current) / 1000;
        // đợi nhận dạng giọng nói trả kết quả cuối
        setTimeout(() => {
          const transcript = finalText.current.trim();
          setTakes((p) =>
            [
              {
                id: String(Date.now()),
                url: URL.createObjectURL(blob),
                blob,
                seconds,
                transcript,
                target: target.trim(),
                score: target.trim() && transcript ? similarity(transcript, target) : undefined,
                at: new Date(),
              },
              ...p,
            ].slice(0, 12)
          );
        }, canRecognize ? 600 : 0);
      };
      recRef.current = rec;
      rec.start();
      startAt.current = Date.now();
      setElapsed(0);
      setRecording(true);

      const SR = getRecognition();
      if (SR) {
        const sr = new SR();
        sr.lang = 'ja-JP';
        sr.continuous = true;
        sr.interimResults = true;
        sr.onresult = (e: any) => {
          let fin = '';
          let interim = '';
          for (let i = 0; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) fin += r[0].transcript;
            else interim += r[0].transcript;
          }
          finalText.current = fin || interim;
          setLive(fin + interim);
        };
        sr.onerror = () => {};
        try {
          sr.start();
          srRef.current = sr;
        } catch {}
      }
    } catch (e: any) {
      setError(e?.name === 'NotAllowedError' ? 'Bạn chưa cho phép dùng micro. Bấm biểu tượng ổ khóa trên thanh địa chỉ để cho phép.' : 'Không mở được micro.');
    }
  };

  const stop = () => {
    setRecording(false);
    try {
      srRef.current?.stop();
    } catch {}
    srRef.current = null;
    recRef.current?.state !== 'inactive' && recRef.current?.stop();
  };

  const play = (t: Take) => {
    if (playing === t.id) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    audioRef.current?.pause();
    const a = new Audio(t.url);
    audioRef.current = a;
    a.onended = () => setPlaying(null);
    a.play().catch(() => {});
    setPlaying(t.id);
  };

  const remove = (t: Take) => {
    URL.revokeObjectURL(t.url);
    setTakes((p) => p.filter((x) => x.id !== t.id));
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[65] inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 px-5 py-3 text-sm font-black text-white shadow-xl shadow-emerald-500/30 cursor-pointer"
      >
        <Mic className="w-4 h-4" /> Ghi âm luyện nói
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[65] w-[min(380px,calc(100vw-2.5rem))] max-h-[75vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="inline-flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400">
          <Mic className="w-4 h-4" /> Ghi âm luyện nói
        </span>
        <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Thu gọn">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 space-y-2">
        <textarea
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          rows={2}
          placeholder="(Tùy chọn) Dán câu mẫu tiếng Nhật để máy chấm độ giống khi bạn đọc…"
          className="w-full resize-none rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-japanese text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-400"
        />
        <div className="flex items-center gap-2">
          {recording ? (
            <button type="button" onClick={stop} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 hover:bg-rose-400 py-3 text-sm font-black text-white cursor-pointer">
              <Square className="w-4 h-4 fill-white" /> Dừng · {fmt(elapsed)}
            </button>
          ) : (
            <button type="button" onClick={start} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 py-3 text-sm font-black text-white cursor-pointer">
              <Mic className="w-4 h-4" /> Bắt đầu ghi
            </button>
          )}
          {target.trim() && (
            <button type="button" onClick={() => speakJapanese(target)} title="Nghe câu mẫu" className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3 text-slate-500 cursor-pointer">
              <Volume2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {recording && canRecognize && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-xs font-japanese text-emerald-800 dark:text-emerald-200 min-h-[2rem]">
            {live || 'Đang nghe…'}
          </div>
        )}
        {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}
        {!canRecognize && <p className="text-[11px] text-slate-400">Trình duyệt này không có nhận dạng giọng nói, vẫn ghi âm và nghe lại được. Dùng Chrome hoặc Edge để máy chấm.</p>}
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {takes.length === 0 && <p className="text-center text-[11px] text-slate-400 py-2">Chưa có bản ghi. Bản ghi chỉ lưu trong tab này.</p>}
        {takes.map((t, i) => (
          <div key={t.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => play(t)} className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center cursor-pointer">
                {playing === t.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0 text-[11px] font-bold text-slate-500">
                Lần {takes.length - i} · {fmt(t.seconds)} · {t.at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
              {t.score !== undefined && (
                <span className={`px-2 py-0.5 rounded-lg text-xs font-black text-white ${t.score >= 80 ? 'bg-emerald-500' : t.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}>{t.score}%</span>
              )}
              <a href={t.url} download={`spk-${t.id}.webm`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white" title="Tải về">
                <Download className="w-4 h-4" />
              </a>
              <button type="button" onClick={() => remove(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer" title="Xóa">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {t.transcript && (
              <div className="text-xs font-japanese text-slate-700 dark:text-slate-200">
                <span className="font-sans font-bold text-slate-400">Máy nghe được: </span>
                {t.transcript}
              </div>
            )}
            {t.target && (
              <div className="text-xs font-japanese text-slate-500">
                <span className="font-sans font-bold text-slate-400">Câu mẫu: </span>
                {t.target}
              </div>
            )}
          </div>
        ))}
        {takes.length > 0 && (
          <button
            type="button"
            onClick={() => {
              takes.forEach((t) => URL.revokeObjectURL(t.url));
              setTakes([]);
            }}
            className="w-full inline-flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
          >
            <X className="w-3 h-3" /> Xóa hết bản ghi
          </button>
        )}
      </div>
    </div>
  );
};
