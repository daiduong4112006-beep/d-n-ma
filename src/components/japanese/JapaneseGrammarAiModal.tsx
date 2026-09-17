import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  BookOpen,
  PlusCircle,
  PenTool,
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
import { speakJapanese } from '../../utils/soundEffects';
import { callAiApi } from '../../utils/aiClient';
import { AiApiKeyModal } from '../AiApiKeyModal';

interface JapaneseGrammarAiModalProps {
  grammarPoint: JapaneseGrammarPoint | null;
  isOpen: boolean;
  onClose: () => void;
  initialContextSentence?: string;
}

type TabMode = 'explain' | 'generate-examples' | 'check-sentence' | 'chat';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const JapaneseGrammarAiModal: React.FC<JapaneseGrammarAiModalProps> = ({
  grammarPoint,
  isOpen,
  onClose,
  initialContextSentence = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('explain');
  const [explanationContent, setExplanationContent] = useState('');
  const [examplesContent, setExamplesContent] = useState('');
  const [userSentence, setUserSentence] = useState('');
  const [sentenceReviewResult, setSentenceReviewResult] = useState('');

  // Chat tab state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Loading & error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen && grammarPoint) {
      // Reset or initialize
      setExplanationContent('');
      setExamplesContent('');
      setUserSentence('');
      setSentenceReviewResult('');
      setChatMessages([]);
      setErrorMessage(null);
      setNeedsApiKey(false);

      if (initialContextSentence) {
        setActiveTab('chat');
        handleAskAboutSentence(initialContextSentence);
      } else {
        setActiveTab('explain');
        fetchGrammarAi('explain');
      }
    }
    return () => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
    };
  }, [isOpen, grammarPoint?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, explanationContent, examplesContent, sentenceReviewResult]);

  if (!isOpen || !grammarPoint) return null;

  const fetchGrammarAi = async (mode: TabMode, extraPayload: Record<string, any> = {}) => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeControllerRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);
    setNeedsApiKey(false);

    const systemPromptFallback = `Bạn là giáo viên tiếng Nhật thông minh và nhiệt huyết. Giải thích ngữ pháp tiếng Nhật bằng Tiếng Việt chi tiết, dễ hiểu, sinh động.`;
    const userPromptFallback = `Cấu trúc: ${grammarPoint.title}. Ý nghĩa: ${grammarPoint.meaning}. Cấu trúc nối: ${grammarPoint.formation}. Yêu cầu: ${mode}.`;

    try {
      const res = await callAiApi({
        endpoint: '/api/ai/grammar-tutor',
        payload: {
          grammarTitle: grammarPoint.title,
          formation: grammarPoint.formation,
          meaning: grammarPoint.meaning,
          explanation: grammarPoint.explanation,
          examples: grammarPoint.examples,
          mode,
          ...extraPayload,
        },
        signal: controller.signal,
        systemPromptFallback,
        userPromptFallback,
      });

      if (controller.signal.aborted) return;

      const reply = res.reply || 'Đã xử lý thành công.';

      if (mode === 'explain') {
        setExplanationContent(reply);
      } else if (mode === 'generate-examples') {
        setExamplesContent(reply);
      } else if (mode === 'check-sentence') {
        setSentenceReviewResult(reply);
      }
    } catch (err: any) {
      if (controller.signal.aborted || err.name === 'AbortError') return;
      console.error('Error in Grammar AI Tutor:', err);
      const isKeyErr = err.needsApiKey || String(err.message).includes('GEMINI_API_KEY');
      setNeedsApiKey(isKeyErr);
      setErrorMessage(
        isKeyErr
          ? 'Hệ thống AI chưa có khóa kết nối hoặc đã hết hạn mức miễn phí.'
          : err.message || 'Không thể kết nối với dịch vụ AI. Bạn vui lòng thử lại sau.'
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  const handleTabChange = (tab: TabMode) => {
    setActiveTab(tab);
    setErrorMessage(null);
    if (tab === 'explain' && !explanationContent) {
      fetchGrammarAi('explain');
    } else if (tab === 'generate-examples' && !examplesContent) {
      fetchGrammarAi('generate-examples');
    }
  };

  const handleCheckSentence = () => {
    if (!userSentence.trim()) return;
    fetchGrammarAi('check-sentence', { userSentence: userSentence.trim() });
  };

  const handleAskAboutSentence = (sentence: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: `Giải thích chi tiết giúp tôi câu ví dụ này trong cấu trúc: "${sentence}"`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages([userMsg]);
    sendChatMessage(userMsg.text, [userMsg]);
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || isLoading) return;
    const text = chatInput.trim();
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
    setIsLoading(true);
    setErrorMessage(null);

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
        userPromptFallback: `Câu hỏi của học viên về ${grammarPoint.title}: "${text}"`,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.reply || 'Đã nhận được câu trả lời từ AI.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
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
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1500);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] text-slate-100 overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Trợ lý AI Ngữ Pháp
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">{grammarPoint.title}</h3>
                </div>
                <p className="text-xs text-slate-400 font-medium line-clamp-1">
                  {grammarPoint.meaning} • {grammarPoint.formation}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
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

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-2 bg-slate-950/60 border-b border-slate-800 shrink-0 overflow-x-auto no-scrollbar text-xs font-bold">
            <button
              type="button"
              onClick={() => handleTabChange('explain')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'explain'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Phân tích & Sắc thái</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('generate-examples')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'generate-examples'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Thêm câu ví dụ</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('check-sentence')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'check-sentence'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Luyện đặt câu</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('chat')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'chat'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Hỏi đáp tự do</span>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-200">
            {/* API Key error banner if needed */}
            {needsApiKey && (
              <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-300">Cần cấu hình Google Gemini API Key</div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Hệ thống đang quá tải hoặc máy chủ chưa có khóa API. Bạn có thể lấy API Key hoàn toàn miễn phí tại Google AI Studio và nhập vào để sử dụng không giới hạn.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Nhập API Key miễn phí</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchGrammarAi(activeTab)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Thử lại</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: Phân tích & Sắc thái */}
            {activeTab === 'explain' && (
              <div className="space-y-4">
                {isLoading && !explanationContent ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                    <p className="text-xs font-bold text-slate-400">
                      AI đang phân tích chuyên sâu cấu trúc "{grammarPoint.title}"...
                    </p>
                  </div>
                ) : explanationContent ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-[11px] font-black uppercase text-purple-400 tracking-wider">
                        Phân tích chuyên sâu từ AI
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(explanationContent)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedText ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed space-y-2">
                      <ReactMarkdown>{explanationContent}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <button
                      type="button"
                      onClick={() => fetchGrammarAi('explain')}
                      className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 cursor-pointer"
                    >
                      Bắt đầu phân tích ngữ pháp
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Thêm câu ví dụ */}
            {activeTab === 'generate-examples' && (
              <div className="space-y-4">
                {isLoading && !examplesContent ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                    <p className="text-xs font-bold text-slate-400">
                      AI đang tạo 4 câu ví dụ giao tiếp mới phong phú...
                    </p>
                  </div>
                ) : examplesContent ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-[11px] font-black uppercase text-purple-400 tracking-wider">
                        4 câu ví dụ mới thực tế
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fetchGrammarAi('generate-examples')}
                          disabled={isLoading}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs flex items-center gap-1 font-bold cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isLoading ? 'animate-spin' : ''}`} />
                          <span>Tạo bộ ví dụ khác</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(examplesContent)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed space-y-2">
                      <ReactMarkdown>{examplesContent}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <button
                      type="button"
                      onClick={() => fetchGrammarAi('generate-examples')}
                      className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 cursor-pointer"
                    >
                      Tạo 4 câu ví dụ mới
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Luyện đặt câu & Chấm điểm */}
            {activeTab === 'check-sentence' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <label className="text-[11px] font-black uppercase text-purple-400 tracking-wider flex items-center justify-between">
                    <span>Nhập câu tiếng Nhật bạn tự đặt:</span>
                    <span className="text-slate-400 font-normal">Dùng cấu trúc: {grammarPoint.title}</span>
                  </label>
                  <textarea
                    rows={3}
                    value={userSentence}
                    onChange={(e) => setUserSentence(e.target.value)}
                    placeholder="Ví dụ: わたしは がくせい です。(hoặc gõ chữ Hán, Romaji)..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none font-medium placeholder:text-slate-500"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => speakJapanese(userSentence)}
                      disabled={!userSentence.trim()}
                      className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/60 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Nghe thử câu này</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCheckSentence}
                      disabled={isLoading || !userSentence.trim()}
                      className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Chấm điểm & Nhận xét</span>
                    </button>
                  </div>
                </div>

                {sentenceReviewResult && (
                  <div className="space-y-2 p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30">
                    <div className="flex items-center justify-between pb-1 border-b border-purple-500/20">
                      <span className="text-[11px] font-black uppercase text-purple-300 tracking-wider">
                        Đánh giá & Lời khuyên của AI
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(sentenceReviewResult)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed space-y-2">
                      <ReactMarkdown>{sentenceReviewResult}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Hỏi đáp tự do */}
            {activeTab === 'chat' && (
              <div className="space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 mx-auto flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-300">
                      Hỏi bất kỳ điều gì về cấu trúc "{grammarPoint.title}"
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Ví dụ: "Phân biệt với cấu trúc tương đương?", "Khi nào dùng trong đời sống?", "Chia thể bị động như thế nào?"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-purple-600 text-white rounded-br-xs shadow-md'
                              : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-xs'
                          }`}
                        >
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex items-center gap-2 text-xs text-purple-400 py-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>AI đang soạn câu trả lời...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Input Bar (for Chat Tab) */}
          {activeTab === 'chat' && (
            <div className="p-3 border-t border-slate-800 bg-slate-950/80 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Đặt câu hỏi về ${grammarPoint.title}...`}
                  className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={isLoading || !chatInput.trim()}
                  className="p-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Embedded API Key Modal */}
      <AiApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSaved={() => {
          setNeedsApiKey(false);
          fetchGrammarAi(activeTab);
        }}
      />
    </>
  );
};
