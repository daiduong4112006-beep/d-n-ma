import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Question } from '../types/quiz';
import { Bot, Sparkles, Send, X, RefreshCw, Copy, Check, MessageSquare } from 'lucide-react';
import { cleanLatexText } from '../utils/textCleaner';

interface AiQuestionModalProps {
  question: Question;
  isOpen: boolean;
  onClose: () => void;
  selectedAnswer?: number | null;
  initialOptionIndex?: number | null;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AiQuestionModal: React.FC<AiQuestionModalProps> = ({
  question,
  isOpen,
  onClose,
  selectedAnswer = null,
  initialOptionIndex = null,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeOptionIndex, setActiveOptionIndex] = useState<number | null>(() => {
    if (typeof initialOptionIndex === 'number' && initialOptionIndex >= 0) {
      return initialOptionIndex;
    }
    if (typeof selectedAnswer === 'number' && selectedAnswer >= 0) {
      return selectedAnswer;
    }
    return null;
  });

  const activeControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const correctList = question.correctAnswers && question.correctAnswers.length > 0
    ? question.correctAnswers
    : [question.correctAnswer];
  const correctAnswerText = correctList
    .map((i) => `[${letters[i] || i}] ${question.options[i] || ''}`)
    .join('; ');

  const fetchExplanationForOption = async (optionIdx: number | null) => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeControllerRef.current = controller;

    setIsLoading(true);
    const hasOption = typeof optionIdx === 'number' && optionIdx >= 0 && question.options[optionIdx];
    const optionLetter = hasOption ? letters[optionIdx] || String(optionIdx + 1) : '';
    const optionText = hasOption ? question.options[optionIdx] : '';
    const isOptionCorrect = hasOption ? correctList.includes(optionIdx) : false;

    const initialText = hasOption
      ? `Xin chào! Tôi là Trợ lý AI. Đang phân tích phương án [${optionLetter}]: "${optionText}" (${isOptionCorrect ? 'ĐÚNG' : 'SAI'})...`
      : 'Xin chào! Tôi là Trợ lý AI. Đang phân tích toàn bộ câu hỏi và chuẩn bị lời giải thích cặn kẽ cho bạn...';

    const welcomeMsg: Message = {
      id: 'msg-welcome',
      sender: 'ai',
      text: initialText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([welcomeMsg]);

    const userPrompt = hasOption
      ? `Tôi đã bấm vào phương án [${optionLetter}]: "${optionText}". Phương án này là ${isOptionCorrect ? 'ĐÚNG' : 'SAI'}. Hãy giải thích cặn kẽ vì sao phương án [${optionLetter}] lại ${isOptionCorrect ? 'chính xác' : 'chưa chính xác'}, phân tích bản chất kiến thức và so sánh với các đáp án khác.`
      : 'Hãy giải thích cặn kẽ vì sao đáp án đúng lại là đáp án đó, và tại sao các phương án khác chưa chính xác. Đưa ra mẹo ghi nhớ nếu có.';

    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          questionText: question.question,
          options: question.options,
          correctAnswerText,
          explanation: question.explanation,
          note: question.note,
          difficulty: question.difficulty,
          selectedOptionIndex: optionIdx,
          selectedOptionText: optionText,
          isOptionCorrect,
          userPrompt,
        }),
      });
      clearTimeout(timeoutId);

      if (controller.signal.aborted) return;

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      if (controller.signal.aborted) return;

      const aiReplyMsg: Message = {
        id: `msg-ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sender: 'ai',
        text: data.reply || 'Dưới đây là giải thích chi tiết cho phương án này.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== 'msg-welcome'), aiReplyMsg]);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (controller.signal.aborted || err.name === 'AbortError') {
        // Aborted gracefully due to new request or close
        return;
      }
      console.error('Error fetching AI explanation:', err);
      const errorMsg: Message = {
        id: `msg-err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sender: 'ai',
        text: '⚠️ Chưa thể kết nối với server AI lúc này. Bạn vui lòng bấm nút "Phân tích lại" hoặc thử lại sau chốc lát.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== 'msg-welcome'), errorMsg]);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  const handleSelectOption = (optIdx: number | null) => {
    setActiveOptionIndex(optIdx);
    fetchExplanationForOption(optIdx);
  };

  // Trigger fetch ONCE when modal opens
  useEffect(() => {
    if (isOpen) {
      const targetOpt = typeof initialOptionIndex === 'number' && initialOptionIndex >= 0
        ? initialOptionIndex
        : typeof selectedAnswer === 'number' && selectedAnswer >= 0
        ? selectedAnswer
        : null;
      setActiveOptionIndex(targetOpt);
      fetchExplanationForOption(targetOpt);
    } else {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
      setMessages([]);
      setIsLoading(false);
    }
  }, [isOpen, question.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    const userMsg: Message = {
      id: `msg-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const conversation = messages
        .filter((m) => m.id !== 'msg-welcome' && !m.id.startsWith('msg-err-') && !m.text.includes('Chưa thể kết nối'))
        .map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          text: m.text,
        }));

      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          questionText: question.question,
          options: question.options,
          correctAnswerText,
          explanation: question.explanation,
          note: question.note,
          userPrompt: userText,
          conversationHistory: conversation,
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Server status ${res.status}`);
      }

      const data = await res.json();
      const aiReply: Message = {
        id: `msg-ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sender: 'ai',
        text: data.reply || 'Tôi đã tiếp nhận câu hỏi của bạn.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Error sending message to AI:', err);
      const isAbort = err.name === 'AbortError';
      const errorMsg: Message = {
        id: `msg-err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sender: 'ai',
        text: isAbort
          ? '⏳ Phản hồi AI bị quá thời gian chờ (timeout). Vui lòng thử gửi lại tin nhắn.'
          : 'Có lỗi xảy ra khi trao đổi với AI. Vui lòng thử lại!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-2xl h-[90vh] max-h-[700px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-linear-to-r from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  Trợ lý AI Hướng dẫn
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/80 dark:text-indigo-300">
                  <Sparkles className="w-3 h-3" />
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Giải thích cặn kẽ & trao đổi trực tiếp về câu hỏi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchExplanationForOption(activeOptionIndex)}
              disabled={isLoading}
              title="Phân tích lại"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Question & Option Context Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 px-5 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[80%]">
              Câu hỏi: {question.question}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
              ✓ {correctAnswerText}
            </div>
          </div>

          {/* Option Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">Bấm chọn mục để AI giải thích:</span>
            <button
              type="button"
              onClick={() => handleSelectOption(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                activeOptionIndex === null
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
              }`}
            >
              Tổng quan
            </button>
            {question.options.map((opt, idx) => {
              const letter = letters[idx] || String(idx + 1);
              const isCorrectOpt = correctList.includes(idx);
              const isSelected = activeOptionIndex === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(idx)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 max-w-[180px] truncate cursor-pointer ${
                    isSelected
                      ? isCorrectOpt
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                  }`}
                  title={`Phân tích lựa chọn [${letter}] ${opt}`}
                >
                  <span className="font-black">[{letter}]</span>
                  <span className="truncate">{opt}</span>
                  {isCorrectOpt ? (
                    <span className="text-[9px] opacity-80">(Đúng)</span>
                  ) : (
                    <span className="text-[9px] opacity-80">(Sai)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`group relative max-w-[85%] space-y-1`}>
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white font-medium rounded-tr-xs shadow-xs whitespace-pre-wrap'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60 shadow-xs'
                  }`}
                >
                  {msg.sender === 'ai' ? (
                    <div className="markdown-content">
                      <ReactMarkdown>{cleanLatexText(msg.text)}</ReactMarkdown>
                      {(msg.text.includes('Chưa thể kết nối') ||
                        msg.text.includes('thời gian') ||
                        msg.text.includes('lỗi') ||
                        msg.text.includes('thử lại')) && (
                        <div className="pt-2.5 mt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fetchExplanationForOption(activeOptionIndex)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            <span>Phân tích lại ngay</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    cleanLatexText(msg.text)
                  )}
                </div>

                <div
                  className={`flex items-center gap-2 text-[10px] text-slate-400 px-1 ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(msg.id, msg.text)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 shadow-xs mt-1 font-bold text-xs">
                  Bạn
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 px-4 rounded-2xl rounded-tl-xs text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-100" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-200" />
                <span className="ml-1 font-medium">AI đang soạn lời giải ngắn gọn...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setInput('Tại sao các phương án còn lại lại sai?');
            }}
            className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-indigo-500 shrink-0 cursor-pointer"
          >
            Tại sao phương án khác sai?
          </button>
          <button
            type="button"
            onClick={() => {
              setInput('Cho tôi mẹo ghi nhớ câu này dễ nhất');
            }}
            className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-indigo-500 shrink-0 cursor-pointer"
          >
            Mẹo ghi nhớ nhanh
          </button>
          <button
            type="button"
            onClick={() => {
              setInput('Cho tôi 1 ví dụ thực tế minh họa cho kiến thức này');
            }}
            className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-indigo-500 shrink-0 cursor-pointer"
          >
            Ví dụ thực tế
          </button>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi thêm AI điều bạn chưa hiểu về câu này..."
            disabled={isLoading}
            className="flex-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 sm:px-4 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Gửi</span>
          </button>
        </form>
      </div>
    </div>
  );
};
