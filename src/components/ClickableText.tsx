import React, { useState, useEffect } from 'react';
import { lookupWordDefinition, translateWordOnline, translateSentenceOnline } from '../utils/dictionary';
import { Volume2, X, BookOpen, Loader2, Globe, Star, Copy, Check, Code, Folder, ChevronDown } from 'lucide-react';
import {
  isWordStarred,
  toggleStarredWord,
  getStarredWord,
  getSuggestedQuizzes,
  addOrUpdateStarredWord,
} from '../utils/vocabulary';

interface ClickableTextProps {
  text: string;
  isExamMode?: boolean;
  className?: string;
  enableSentenceTranslation?: boolean;
  subject?: string;
  quizId?: string;
  quizTitle?: string;
}

interface Segment {
  type: 'code-block' | 'inline-code' | 'text';
  content: string;
  language?: string;
}

const CodeBlockItem: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="my-3 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-md text-left font-normal not-italic select-text"
    >
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800/90 border-b border-slate-700/80 text-[11px] text-slate-300 font-mono">
        <span className="font-bold text-indigo-400 uppercase flex items-center gap-1.5">
          <Code className="w-3.5 h-3.5 text-emerald-400" />
          <span>{language || 'CODE'}</span>
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
          title="Sao chép toàn bộ đoạn mã này"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Đã chép</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>Chép code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 text-xs md:text-[13px] font-mono text-emerald-300 bg-slate-950 overflow-x-auto leading-relaxed whitespace-pre select-text">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const ClickableText: React.FC<ClickableTextProps> = ({
  text,
  isExamMode = false,
  className = '',
  enableSentenceTranslation = true,
  subject: defaultSubject,
  quizId: propQuizId,
  quizTitle: propQuizTitle,
}) => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [definition, setDefinition] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isStarred, setIsStarred] = useState(false);

  const effectiveDefaultQuiz = propQuizTitle?.trim() || defaultSubject?.trim() || 'Chung';
  const [selectedQuizTitle, setSelectedQuizTitle] = useState<string>(effectiveDefaultQuiz);
  const [selectedQuizId, setSelectedQuizId] = useState<string | undefined>(propQuizId);
  const [isSelectingQuiz, setIsSelectingQuiz] = useState(false);
  const [customQuizInput, setCustomQuizInput] = useState('');

  // Sentence level translation state
  const [showSentenceTranslation, setShowSentenceTranslation] = useState(false);
  const [translatedSentence, setTranslatedSentence] = useState<string | null>(null);
  const [isTranslatingSentence, setIsTranslatingSentence] = useState(false);

  // Reset translation and popup state when text prop changes
  useEffect(() => {
    setShowSentenceTranslation(false);
    setTranslatedSentence(null);
    setSelectedWord(null);
    setDefinition(null);
    setPopoverPos(null);
    setIsSelectingQuiz(false);
  }, [text]);

  // Sync quiz selection when selectedWord changes
  useEffect(() => {
    if (selectedWord) {
      const existing = getStarredWord(selectedWord, propQuizTitle);
      if (existing) {
        setIsStarred(true);
        setSelectedQuizTitle(existing.quizTitle || propQuizTitle || defaultSubject || 'Chung');
        setSelectedQuizId(existing.quizId || propQuizId);
      } else {
        setIsStarred(false);
        setSelectedQuizTitle(propQuizTitle || defaultSubject || 'Chung');
        setSelectedQuizId(propQuizId);
      }
    }
  }, [selectedWord, propQuizTitle, propQuizId, defaultSubject]);

  if (!text) {
    return null;
  }

  // Parse text into code blocks, inline code, and normal text segments
  const segments: Segment[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }
    segments.push({
      type: 'code-block',
      language: match[1] || '',
      content: match[2],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  const handleSpeak = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleWordClick = async (e: React.MouseEvent<HTMLSpanElement>, rawWord: string) => {
    if (isExamMode) return;
    e.stopPropagation();

    // Clean word: remove surrounding punctuation
    const clean = rawWord.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
    if (!clean || clean.length < 2) return;

    // Get click coordinates relative to viewport
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });

    setSelectedWord(clean);
    const targetQ = propQuizTitle || defaultSubject || 'Chung';
    const existing = getStarredWord(clean, targetQ);
    if (existing) {
      setIsStarred(true);
      setSelectedQuizTitle(existing.quizTitle || targetQ);
      setSelectedQuizId(existing.quizId || propQuizId);
    } else {
      setIsStarred(false);
      setSelectedQuizTitle(targetQ);
      setSelectedQuizId(propQuizId);
    }

    const localDef = lookupWordDefinition(clean);
    if (localDef) {
      setDefinition(localDef);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setDefinition('Đang tra từ điển...');
      const onlineDef = await translateWordOnline(clean);
      setDefinition(onlineDef);
      setIsLoading(false);
    }
  };

  const handleToggleStar = () => {
    if (!selectedWord) return;
    const targetQ = selectedQuizTitle || propQuizTitle || defaultSubject || 'Chung';
    const nowStarred = toggleStarredWord(
      selectedWord,
      definition || 'Chưa có bản dịch',
      text,
      targetQ,
      selectedQuizId || propQuizId,
      targetQ
    );
    setIsStarred(nowStarred);
  };

  const handleChangeQuiz = (quizItem: { title: string; id?: string }) => {
    setSelectedQuizTitle(quizItem.title);
    setSelectedQuizId(quizItem.id);
    setIsSelectingQuiz(false);
    if (selectedWord && isStarred) {
      addOrUpdateStarredWord({
        word: selectedWord,
        translation: definition || 'Chưa có bản dịch',
        quizTitle: quizItem.title,
        quizId: quizItem.id,
        subject: quizItem.title,
        contextSentence: text,
      });
    }
  };

  const handleCreateCustomQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (customQuizInput.trim()) {
      const cleanQuiz = customQuizInput.trim();
      handleChangeQuiz({ title: cleanQuiz });
      setCustomQuizInput('');
    }
  };

  // Full Sentence Translation Handler
  const handleTranslateWholeSentence = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showSentenceTranslation) {
      setShowSentenceTranslation(false);
      return;
    }

    setShowSentenceTranslation(true);
    if (!translatedSentence) {
      setIsTranslatingSentence(true);
      const res = await translateSentenceOnline(text);
      setTranslatedSentence(res);
      setIsTranslatingSentence(false);
    }
  };

  const isPureEnglish = /[a-zA-Z]{3,}/.test(text);

  return (
    <span className={`inline relative ${className}`}>
      {segments.map((seg, sIdx) => {
        if (seg.type === 'code-block') {
          return <CodeBlockItem key={sIdx} code={seg.content} language={seg.language} />;
        }

        // Tokenize text into words and delimiters (spaces, punctuation)
        const parts = seg.content.split(/(\s+|[.,!?;:()[\]{}"'\n])/);

        return (
          <span key={sIdx}>
            {parts.map((part, index) => {
              const isWord = /[a-zA-Z0-9_-]{2,}/.test(part);
              const cleanPart = part.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
              const starredInCurrent = isWord && isWordStarred(cleanPart, propQuizTitle);

              if (isWord && !isExamMode) {
                return (
                  <span
                    key={index}
                    onClick={(e) => handleWordClick(e, part)}
                    className={`cursor-pointer transition-colors duration-150 rounded-sm px-0.5 inline-block ${
                      starredInCurrent
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-medium decoration-amber-400 underline decoration-wavy decoration-1 hover:bg-amber-200'
                        : 'hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                    title="Nhấp để tra từ & lưu ghi nhớ"
                  >
                    {part}
                  </span>
                );
              }
              return <span key={index}>{part}</span>;
            })}
          </span>
        );
      })}

      {/* Sentence translation toggle button if text is English */}
      {enableSentenceTranslation && !isExamMode && isPureEnglish && (
        <button
          type="button"
          onClick={handleTranslateWholeSentence}
          className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer align-middle select-none shadow-2xs"
          title="Dịch toàn bộ câu / đoạn văn sang Tiếng Việt"
        >
          <Globe className="w-3 h-3" />
          <span>{showSentenceTranslation ? 'Ẩn dịch câu' : 'Dịch câu'}</span>
        </button>
      )}

      {/* Inline full-sentence translation card */}
      {showSentenceTranslation && (
        <div className="block mt-2 mb-2 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800/80 border border-indigo-200/70 dark:border-indigo-900/60 rounded-xl text-xs text-slate-800 dark:text-slate-200 shadow-xs animate-in fade-in duration-200 not-italic font-normal">
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-indigo-100 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>Bản dịch Tiếng Việt:</span>
            </span>
            <button
              type="button"
              onClick={() => setShowSentenceTranslation(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {isTranslatingSentence ? (
            <div className="flex items-center gap-2 py-1 text-slate-500 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>Đang dịch câu tiếng Anh...</span>
            </div>
          ) : (
            <p className="leading-relaxed font-medium">{translatedSentence || 'Không thể dịch đoạn này.'}</p>
          )}
        </div>
      )}

      {/* Dictionary Popover for clicked single word */}
      {selectedWord && popoverPos && (
        <div
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-2 w-72 md:w-80 p-3.5 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150 select-none not-italic font-normal text-left"
          style={{
            left: `${Math.max(160, Math.min(window.innerWidth - 160, popoverPos.x))}px`,
            top: `${Math.max(80, popoverPos.y)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar: Word, Audio, Star & Close */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm text-indigo-400 truncate">{selectedWord}</span>
              <button
                type="button"
                onClick={() => handleSpeak(selectedWord)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer shrink-0"
                title="Nghe phát âm (US)"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleStar}
                className={`p-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                  isStarred
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                }`}
                title={isStarred ? 'Bỏ lưu từ này' : 'Lưu từ cần lưu ý cho bộ đề này'}
              >
                <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span>{isStarred ? 'Đã lưu' : 'Lưu từ'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedWord(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Definition Content */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Nghĩa Tiếng Việt:
            </div>
            <div className="text-slate-200 font-medium leading-relaxed max-h-24 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center gap-2 text-slate-400 py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Đang tra từ điển...</span>
                </div>
              ) : (
                definition || 'Chưa tìm thấy bản dịch'
              )}
            </div>
          </div>

          {/* Quiz / Subject category selector */}
          <div className="pt-1 border-t border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <Folder className="w-3 h-3 text-indigo-400" />
                <span>Lưu vào Bộ đề:</span>
              </span>

              <button
                type="button"
                onClick={() => setIsSelectingQuiz(!isSelectingQuiz)}
                className="text-[10px] font-bold text-indigo-300 hover:text-indigo-200 bg-slate-800 hover:bg-slate-700/80 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors border border-slate-700"
                title="Thay đổi bộ đề lưu từ này"
              >
                <span className="max-w-[120px] truncate">{selectedQuizTitle}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
            </div>

            {isSelectingQuiz && (
              <div className="p-2 bg-slate-800/95 border border-slate-700 rounded-lg space-y-1.5 animate-in fade-in duration-150">
                <div className="text-[10px] text-slate-400">Chọn Bộ đề lưu từ:</div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {getSuggestedQuizzes().map((qItem) => (
                    <button
                      key={qItem.title}
                      type="button"
                      onClick={() => handleChangeQuiz(qItem)}
                      className={`px-2 py-0.5 text-[10px] rounded-md font-semibold transition-all cursor-pointer ${
                        selectedQuizTitle === qItem.title
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      }`}
                    >
                      {qItem.title}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleCreateCustomQuiz} className="flex items-center gap-1 pt-1">
                  <input
                    type="text"
                    placeholder="+ Tên bộ đề khác..."
                    value={customQuizInput}
                    onChange={(e) => setCustomQuizInput(e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-[10px] text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded cursor-pointer"
                  >
                    Chọn
                  </button>
                </form>
              </div>
            )}
          </div>

          {isStarred && (
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-semibold flex items-center justify-between gap-1">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                <span>Đã lưu vào bộ đề</span>
              </span>
              <span className="text-[9px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200 font-bold truncate max-w-[100px]">
                {selectedQuizTitle}
              </span>
            </div>
          )}

          <div className="text-[10px] text-slate-400 text-right italic pt-0.5">
            Nhấp bất kỳ đâu bên ngoài để đóng
          </div>
        </div>
      )}

      {/* Backdrop to close popover */}
      {selectedWord && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setSelectedWord(null)}
        />
      )}
    </span>
  );
};
