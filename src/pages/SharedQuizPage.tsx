import React, { useEffect, useState } from 'react';
import { Share2, Loader2, AlertTriangle, BookOpen, Download, CheckCircle2, ArrowLeft, Eye } from 'lucide-react';
import { Quiz } from '../types/quiz';
import { getSharedQuiz, SharedQuizDoc, bumpSharedCounter } from '../lib/firebase';

interface Props {
  /** Bộ đề hiện có trên máy – để biết link này đã được lưu chưa */
  quizzes: Quiz[];
  /** Lưu một bản sao vào bộ đề của tôi, trả về bộ đề vừa lưu */
  onSaveCopy: (quiz: Quiz) => Quiz;
  onOpenQuiz: (quiz: Quiz) => void;
  onBack: () => void;
}

const readShareId = () => {
  const raw = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
  const [, qs] = raw.split('?');
  return new URLSearchParams(qs || '').get('id') || '';
};

/** Trang mở từ link chia sẻ: #shared?id=... */
export const SharedQuizPage: React.FC<Props> = ({ quizzes, onSaveCopy, onOpenQuiz, onBack }) => {
  const [shareId] = useState(readShareId);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error' | 'expired'>('loading');
  const [doc, setDoc] = useState<SharedQuizDoc | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!shareId) {
      setState('notfound');
      return;
    }
    let alive = true;
    getSharedQuiz(shareId)
      .then((d) => {
        if (!alive) return;
        if (!d || !d.quiz) setState('notfound');
        else if (d.expiresAtMs && d.expiresAtMs < Date.now()) setState('expired');
        else {
          setDoc(d);
          setState('ready');
          bumpSharedCounter(shareId, 'views');
        }
      })
      .catch((e) => alive && setState(String(e?.code || '').includes('permission') ? 'expired' : 'error'));
    return () => {
      alive = false;
    };
  }, [shareId]);

  const existing = quizzes.find((q) => q.sharedFrom === shareId);

  const handleSave = () => {
    if (!doc) return;
    if (existing) {
      onOpenQuiz(existing);
      return;
    }
    const now = new Date().toISOString();
    const stamp = Date.now();
    bumpSharedCounter(shareId, 'saves');
    const copy: Quiz = {
      ...doc.quiz,
      id: `quiz-shared-${stamp}`,
      sharedFrom: shareId,
      sharedClassMode: !!doc.classMode,
      createdAt: now,
      updatedAt: now,
      timesCompleted: 0,
      lastScore: undefined,
      lastTotal: undefined,
      lastAttemptDate: undefined,
      questions: (doc.quiz.questions || []).map((q, i) => ({
        ...q,
        id: q.id || `q-shared-${stamp}-${i}`,
        timesAnswered: 0,
        timesCorrect: 0,
        timesWrong: 0,
        mastered: false,
      })),
    };
    const saved = onSaveCopy(copy);
    onOpenQuiz(saved);
  };

  if (state === 'loading') {
    return (
      <div className="max-w-2xl mx-auto mt-16 p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        Đang mở bộ đề được chia sẻ…
      </div>
    );
  }

  if (state !== 'ready' || !doc) {
    return (
      <div className="max-w-2xl mx-auto mt-16 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          {state === 'notfound' ? 'Không tìm thấy bộ đề' : state === 'expired' ? 'Link đã hết hạn' : 'Không mở được bộ đề'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {state === 'notfound'
            ? 'Link chia sẻ không đúng hoặc bộ đề đã bị xóa. Hãy nhờ người gửi tạo lại link.'
            : state === 'expired'
            ? 'Người chia sẻ đã đặt hạn dùng cho link này. Hãy nhờ họ gia hạn hoặc gửi link mới.'
            : 'Không kết nối được máy chủ. Kiểm tra mạng rồi tải lại trang.'}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold cursor-pointer"
        >
          Về bộ đề của tôi
        </button>
      </div>
    );
  }

  const q = doc.quiz;
  const preview = showAll ? q.questions : q.questions.slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Về bộ đề của tôi
      </button>

      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-linear-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white shadow-xl">
        <Share2 className="absolute -right-6 -bottom-6 w-40 h-40 text-white/10" />
        <div className="relative space-y-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 text-[11px] font-black uppercase tracking-wider">
            <Share2 className="w-3.5 h-3.5" /> Bộ đề được chia sẻ
            {doc.ownerName ? ` · từ ${doc.ownerName}` : ''}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black leading-tight">{q.title}</h1>
          {q.description && <p className="text-sm text-indigo-100 max-w-xl">{q.description}</p>}
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {q.subject && <span className="px-2.5 py-1 rounded-lg bg-white/15">{q.subject}</span>}
            {q.topic && <span className="px-2.5 py-1 rounded-lg bg-white/15">{q.topic}</span>}
            <span className="px-2.5 py-1 rounded-lg bg-white/15">{q.questions.length} câu hỏi</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-indigo-700 text-sm font-black shadow-lg hover:bg-indigo-50 cursor-pointer"
            >
              {existing ? <BookOpen className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {existing ? 'Mở bộ đề đã lưu' : 'Lưu vào bộ đề của tôi'}
            </button>
          </div>
          {doc.classMode && (
            <p className="text-xs font-semibold text-amber-200">
              Chế độ lớp học: khi bạn đăng nhập và làm bài, điểm sẽ được gửi cho người chia sẻ{doc.ownerName ? ` (${doc.ownerName})` : ''}.
            </p>
          )}
          {doc.expiresAtMs ? (
            <p className="text-xs font-semibold text-indigo-200">Link dùng được đến {new Date(doc.expiresAtMs).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}.</p>
          ) : null}
          {existing && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Bạn đã lưu bộ đề này rồi.
            </p>
          )}
        </div>
      </div>

      {/* Xem trước câu hỏi (không lộ đáp án) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-500" /> Xem trước câu hỏi
          </h2>
          <span className="text-xs text-slate-400">Đáp án hiện sau khi lưu và làm bài</span>
        </div>
        <ol className="space-y-3">
          {preview.map((item, i) => (
            <li key={item.id || i} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-pre-line">
                <span className="text-indigo-500 mr-1.5">{i + 1}.</span>
                {item.question}
              </p>
              <div className="mt-2 grid sm:grid-cols-2 gap-1.5">
                {item.options.map((o, j) => (
                  <span key={j} className="text-xs text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <b className="text-slate-400 mr-1">{String.fromCharCode(65 + j)}.</b>
                    {o}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>
        {q.questions.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 cursor-pointer"
          >
            {showAll ? 'Thu gọn' : `Xem tất cả ${q.questions.length} câu`}
          </button>
        )}
      </div>
    </div>
  );
};
