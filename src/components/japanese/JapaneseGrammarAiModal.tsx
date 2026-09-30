import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  MessageSquare,
  Send,
  X,
  Volume2,
  Copy,
  Check,
  RefreshCw,
  Key,
  AlertTriangle,
} from 'lucide-react';
import { JapaneseGrammarPoint } from '../../data/jpd123Grammar';
import { speakJapanese } from '../../utils/japaneseKana';
import { callAiApi } from '../../utils/aiClient';
import { AiApiKeyModal } from '../AiApiKeyModal';

interface JapaneseGrammarAiModalProps {
  grammarPoint: JapaneseGrammarPoint | null;
  isOpen: boolean;
  onClose: () => void;
  initialContextSentence?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  '💡 Cho tôi các câu ví dụ thực tế kèm cách đọc và dịch nghĩa',
  '📖 Giải thích chi tiết cách dùng và cách kết nối ngữ pháp',
  '⚠️ Các lỗi sai thường gặp khi dùng ngữ pháp này',
  '🔄 Phân biệt cấu trúc này với các cấu trúc tương tự',
];

export const JapaneseGrammarAiModal: React.FC<JapaneseGrammarAiModalProps> = ({
  grammarPoint,
  isOpen,
  onClose,
  initialContextSentence = '',
}) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && grammarPoint) {
      setChatMessages([]);
      setChatInput('');
      setErrorMessage(null);
      setNeedsApiKey(false);

      if (initialContextSentence) {
        handleAskAboutSentence(initialContextSentence);
      }
      setTimeout(() => inputRef.current?.focus(), 200);
    }
    return () => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
    };
  }, [isOpen, grammarPoint?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isLoading]);

  if (!isOpen || !grammarPoint) return null;

  const handleAskAboutSentence = (sentence: string) => {
    const text = `Giải thích chi tiết giúp tôi câu ví dụ này trong cấu trúc: "${sentence}"`;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages([userMsg]);
    sendChatMessage(text, [userMsg]);
  };

  const handleSendChat = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : chatInput).trim();
    if (!text || isLoading) return;
    setChatInput('');

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    sendChatMessage(text, newHistory);
  };

  const sendChatMessage = async (text: string, currentHistory: ChatMessage[]) => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeControllerRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);
    setNeedsApiKey(false);

    try {
      const conversationHistory = currentHistory.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      const res = await callAiApi({
        endpoint: '/api/ai/grammar-tutor',
        payload: {
          grammarTitle: grammarPoint.title,
          formation: grammarPoint.formation,
          meaning: grammarPoint.meaning,
          mode: 'chat',
          userPrompt: text,
          conversationHistory,
        },
        signal: controller.signal,
        userPromptFallback: `Câu hỏi về ${grammarPoint.title} (${grammarPoint.meaning}): "${text}"`,
      });

      if (controller.signal.aborted) return;

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.reply || 'Đã nhận được câu trả lời từ AI.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      if (controller.signal.aborted || err.name === 'AbortError') return;
      console.error('Chat error:', err);
      const isKeyErr = err.needsApiKey || String(err.message).includes('GEMINI_API_KEY');
      setNeedsApiKey(isKeyErr);
      const errorReply: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: isKeyErr
          ? '⚠️ AI tạm thời chưa thể phản hồi do thiếu hoặc quá tải API Key. Bạn vui lòng bấm nút "Cài đặt API Key" ở góc trên để dùng tiếp.'
          : '⚠️ Không thể gửi câu hỏi lúc này. Bạn vui lòng thử lại nhé!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorReply]);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col h-[85vh] max-h-[750px] text-slate-100 overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Hỏi đáp AI Ngữ Pháp
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white truncate">{grammarPoint.title}</h3>
                </div>
                <p className="text-xs text-slate-400 font-medium truncate">
                  {grammarPoint.meaning} {grammarPoint.formation ? `• ${grammarPoint.formation}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cài đặt khóa Google Gemini API Key"
              >
                <Key className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Chat Messages List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-200">
            {/* API Key error banner if needed */}
            {needsApiKey && (
              <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-300">Cần cấu hình Google Gemini API Key</div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Hệ thống đang quá tải hoặc máy chủ chưa có khóa API. Bạn có thể nhập API Key miễn phí từ Google AI Studio để sử dụng không giới hạn.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Cài đặt API Key</span>
                  </button>
                </div>
              </div>
            )}

            {/* Welcoming Screen with Suggested Chips */}
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6 px-2 space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-inner">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h4 className="text-base font-black text-white">
                    Hỏi bất kỳ điều gì về "{grammarPoint.title}"
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Bạn có thể hỏi về cách dùng, xin thêm ví dụ thực tế, so sánh với ngữ pháp khác hoặc yêu cầu giải thích chi tiết.
                  </p>
                </div>

                {/* Quick suggestions */}
                <div className="w-full max-w-md pt-2 space-y-2">
                  <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider text-left px-1">
                    Gợi ý câu hỏi nhanh:
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-left">
                    {QUICK_PROMPTS.map((promptText, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendChat(promptText)}
                        className="p-3 rounded-2xl bg-slate-800/80 hover:bg-purple-950/60 border border-slate-700 hover:border-purple-500/50 text-xs font-semibold text-slate-200 hover:text-purple-200 transition-all text-left cursor-pointer active:scale-98 shadow-2xs"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {chatMessages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
                    >
                      <div
                        className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                          isUser
                            ? 'bg-purple-600 text-white rounded-br-xs'
                            : 'bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-bl-xs'
                        }`}
                      >
                        <div className="prose prose-invert prose-sm max-w-none text-xs sm:text-sm leading-relaxed space-y-2">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>

                        {!isUser && (
                          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-700/60 text-slate-400 text-[11px]">
                            <button
                              type="button"
                              onClick={() => speakJapanese(msg.text)}
                              className="inline-flex items-center gap-1 hover:text-purple-300 transition-colors cursor-pointer"
                              title="Nghe câu tiếng Nhật"
                            >
                              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                              <span>Nghe</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopy(msg.id, msg.text)}
                              className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                              title="Sao chép nội dung"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Sao chép</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex items-center gap-2.5 text-xs text-purple-400 py-2 px-3 rounded-2xl bg-purple-950/30 border border-purple-500/20 w-fit">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>AI đang phân tích và soạn câu trả lời...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Footer Input Bar */}
          <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/90 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Hỏi bất kỳ điều gì về ${grammarPoint.title}...`}
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={isLoading || !chatInput.trim()}
                className="p-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95"
                title="Gửi câu hỏi"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Embedded API Key Modal */}
      <AiApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSaved={() => {
          setNeedsApiKey(false);
        }}
      />
    </>
  );
};
