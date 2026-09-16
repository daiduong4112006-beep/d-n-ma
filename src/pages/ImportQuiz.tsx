import React, { useState } from 'react';
import { Quiz } from '../types/quiz';
import { parseTextFormat, ParsedQuestion } from '../utils/parser';
import { FileText, Upload, CheckCircle, AlertCircle, Plus, Copy, Sparkles, BookOpen, Edit3, Trash2, X, Check, Bot, Loader2, Wand2, Image, UploadCloud } from 'lucide-react';
import { ClickableText } from '../components/ClickableText';
import { compressImage } from '../utils/imageCompressor';

interface ImportQuizProps {
  quizzes: Quiz[];
  onSaveImportedQuiz: (newQuiz: Quiz) => void;
  onAppendToQuiz: (targetQuizId: string, questions: ParsedQuestion[]) => void;
}

export const ImportQuiz: React.FC<ImportQuizProps> = ({
  quizzes,
  onSaveImportedQuiz,
  onAppendToQuiz,
}) => {
  const [rawContent, setRawContent] = useState('');
  const [targetType, setTargetType] = useState<'new' | 'existing'>('new');
  const [quizTitle, setQuizTitle] = useState('');
  const [subject, setSubject] = useState('Khác');
  const [selectedQuizId, setSelectedQuizId] = useState<string>(quizzes[0]?.id || '');

  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Sample template formatted according to user requested syntax
  const sampleText = `The stored-program concept means a computer could get its instructions by reading them from memory, and a program could be set or altered by setting the values of a portion of memory.
A. True
B. False
@ A
#Giải thích chi tiết
Đây là định nghĩa gốc của khái niệm stored-program: CPU lấy lệnh từ bộ nhớ, và chương trình có thể thay đổi hành vi máy bằng cách ghi lại giá trị trong vùng nhớ đó. Phát biểu đúng.
$Ghi chú ghi nhớ
Đáp án: A. Đây là định nghĩa gốc của khái niệm stored-program: CPU lấy lệnh từ bộ nhớ, và chương trình có thể thay đổi hành vi máy bằng cách ghi lại giá trị trong...
!
Indirect addressing, the length of the address field is usually greater than the word length, because unlimiting the address range.
A. True
B. False
@ B
#Giải thích chi tiết
Sai. Với định địa chỉ gián tiếp, trường địa chỉ trong lệnh thường NGẮN HƠN độ dài từ nhớ (word length), vì nó chỉ cần trỏ đến một ô nhớ chứa địa chỉ thật (địa chỉ thật mới đủ dài để đánh địa chỉ toàn bộ bộ nhớ). Nhờ vậy vẫn mở rộng được vùng địa chỉ mà không cần tăng độ dài trường địa chỉ.
$Ghi chú ghi nhớ
Đáp án: B. Sai.
!
How many check bits are needed if the Hamming error correction code Is used to detect single bit error in a 128-bit data word?
A. 6bits
B. 7bits
C. 8bits
D. 9bits
E. 5bits
@ C
#Giải thích chi tiết
Công thức Hamming: 2^r >= m + r + 1 (m = số bit dữ liệu, r = số bit kiểm tra). Với m=128: r=7 → 2^7=128 < 128+7+1=136 (không đủ); r=8 → 2^8=256 >= 128+8+1=137 (đủ). Vậy cần 8 bit kiểm tra.
$Ghi chú ghi nhớ
Đáp án: C. Công thức Hamming: 2^r >= m + r + 1 (m = số bit dữ liệu, r = số bit kiểm tra).
!
How many check bits are needed for a Hamming error correction code to detect single-error correction In a 1 KByte data word?
A. 11bits
B. 12bits
C. 13bits
D. 14bits
E. 15bits
@ D
#Giải thích chi tiết
1 KByte = 8192 bit dữ liệu (m=8192). Áp dụng 2^r >= m+r+1: r=13 → 2^13=8192 < 8192+13+1=8206 (không đủ); r=14 → 2^14=16384 >= 8192+14+1=8207 (đủ). Vậy cần 14 bit kiểm tra.
$Ghi chú ghi nhớ
Đáp án: D. 1 KByte = 8192 bit dữ liệu (m=8192).
!
How many bytes of data does each sector in the Winchester hard drive disk have?
A. 128 bytes
B. 256 bytes
C. 512bytes
D. 1024 bytes
E. 4096 bytes
@ C
#Giải thích chi tiết
512 là kích thước tiêu chuẩn công nghiệp nhé
$Ghi chú ghi nhớ
Đáp án: C. 512 là kích thước tiêu chuẩn công nghiệp nhé
!
A byte addressable microprocessor has 24 bit address. What is maximum memory capacity?
A. 4MegaByte
B. 8 MegaByte
C. 16 MegaByte
D. 32 MegaByte
@ C
#Giải thích chi tiết
24 bit địa chỉ tương ứng 2^24 ô nhớ. Vì hệ thống byte addressable, số địa chỉ tương ứng số byte.
Dung lượng bộ nhớ max = 2^24 / 2^20 = 16 MB.
$Ghi chú ghi nhớ
Đáp án: C. Dung lượng bộ nhớ tối đa là 16 MB.
!
What is the primary role of the IO module? (choose two correct answers)
A. Its role is data transfer, it will transfer data to and from peripheral devices.
B. Its role is device communication control, it manages and controls the flow of data between the CPU and peripherals.
C. Its role is data formatting and converting analog signals into digital audio data for CPU.
D. Its role is protecting data from user, ensuring that sensitive information is not lost or intercepted.
@ A, B
#Giải thích chi tiết
Mô-đun I/O chịu trách nhiệm vận chuyển và kiểm soát luồng dữ liệu giữa CPU và thiết bị ngoại vi.
$Ghi chú ghi nhớ
Đáp án chọn 2 đáp án: A và B.
!`;

  // Edit Question Modal State
  // editingIndex can be a number (editing existing index) or 'new' (creating a new manual question)
  const [editingIndex, setEditingIndex] = useState<number | 'new' | null>(null);
  const [insertPosition, setInsertPosition] = useState<'start' | 'end'>('end');
  const [editForm, setEditForm] = useState<{
    question: string;
    options: string[];
    correctAnswers: number[];
    explanation: string;
    note: string;
    imageUrl: string;
  }>({
    question: '',
    options: ['', '', '', ''],
    correctAnswers: [0],
    explanation: '',
    note: '',
    imageUrl: '',
  });

  const handleOpenEdit = (idx: number) => {
    const q = parsedQuestions[idx];
    setEditingIndex(idx);
    setEditForm({
      question: q.question,
      options: q.options.length > 0 ? [...q.options] : ['', ''],
      correctAnswers: q.correctAnswers && q.correctAnswers.length > 0 ? [...q.correctAnswers] : [q.correctAnswer || 0],
      explanation: q.explanation || '',
      note: q.note || '',
      imageUrl: q.imageUrl || '',
    });
  };

  const handleOpenAddNew = (pos: 'start' | 'end' = 'end') => {
    setInsertPosition(pos);
    setEditingIndex('new');
    setEditForm({
      question: '',
      options: ['', '', '', ''],
      correctAnswers: [0],
      explanation: '',
      note: '',
      imageUrl: '',
    });
  };

  const handleProcessImportImage = async (fileOrBlobOrUrl: File | Blob | string) => {
    try {
      const compressed = await compressImage(fileOrBlobOrUrl, 960, 960, 0.8);
      if (compressed) {
        setEditForm((prev) => ({ ...prev, imageUrl: compressed }));
      }
    } catch (err) {
      console.error('Error processing import image:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null) return;
    const cleanOpts = editForm.options.map((o) => o.trim()).filter(Boolean);

    let isValid = true;
    let errStr: string | undefined = undefined;

    if (!editForm.question.trim()) {
      isValid = false;
      errStr = 'Thiếu nội dung câu hỏi';
    } else if (cleanOpts.length < 2) {
      isValid = false;
      errStr = 'Cần ít nhất 2 đáp án lựa chọn';
    } else if (editForm.correctAnswers.length === 0) {
      isValid = false;
      errStr = 'Chưa chọn đáp án đúng';
    }

    const validCorrectAns = editForm.correctAnswers.filter((i) => i < cleanOpts.length);
    if (validCorrectAns.length === 0 && cleanOpts.length > 0) {
      validCorrectAns.push(0);
    }

    let finalImageUrl = editForm.imageUrl.trim();
    if (finalImageUrl && finalImageUrl.startsWith('data:image/')) {
      finalImageUrl = await compressImage(finalImageUrl, 960, 960, 0.8);
    }

    const updated: ParsedQuestion = {
      question: editForm.question.trim() || 'Chưa có nội dung',
      options: cleanOpts.length >= 2 ? cleanOpts : ['Lựa chọn 1', 'Lựa chọn 2'],
      correctAnswer: validCorrectAns[0] || 0,
      correctAnswers: validCorrectAns,
      explanation: editForm.explanation.trim() || 'Không có giải thích thêm.',
      note: editForm.note.trim(),
      difficulty: typeof editingIndex === 'number' ? (parsedQuestions[editingIndex]?.difficulty || 'Medium') : 'Medium',
      imageUrl: finalImageUrl || undefined,
      valid: isValid,
      error: errStr,
    };

    if (editingIndex === 'new') {
      if (insertPosition === 'start') {
        setParsedQuestions([updated, ...parsedQuestions]);
      } else {
        setParsedQuestions([...parsedQuestions, updated]);
      }
      setHasParsed(true);
    } else {
      const nextList = [...parsedQuestions];
      nextList[editingIndex] = updated;
      setParsedQuestions(nextList);
    }
    setEditingIndex(null);
  };

  const handleDeleteParsed = (idx: number) => {
    setParsedQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Sample messy unformatted text for AI parsing test
  const messySampleText = `--- BÀI TẬP VÀ GHI CHÚ BỘ NHỚ CÂU HỎI LỘN XỘN ---

Câu 1. Khái niệm bộ nhớ RAM là gì trong máy tính?
A) Random Access Memory - Bộ nhớ truy xuất ngẫu nhiên
B) Read Access Memory - Bộ nhớ chỉ đọc
C) Rapid Action Memory - Bộ nhớ hành động nhanh
D) Real Active Memory - Bộ nhớ hoạt động thực
(Lưu ý học sinh: Đáp án đúng câu 1 là A nhé. RAM sẽ mất dữ liệu khi tắt máy!)
Giải thích: RAM là bộ nhớ chính cho phép đọc ghi dữ liệu ngẫu nhiên với tốc độ cao.

câu 2: Ngôn ngữ lập trình nào sau đây phổ biến nhất cho trí tuệ nhân tạo AI?
A. Java
B. C++
C. Python
D. PHP
Đáp án đúng là C. Giải thích: Python có hệ sinh thái thư viện phong phú như PyTorch, TensorFlow, NumPy rất mạnh về AI và Khoa học dữ liệu.

[Ghi chú phần mạng máy tính]
Địa chỉ IPv4 gồm bao nhiêu bit?
16 bits
32 bits
64 bits
128 bits
(Đáp án đúng: 32 bits. Lời giải: IPv4 gồm 32 bit chia làm 4 octet 8 bit, còn IPv6 gồm 128 bit).
`;

  const handleLoadSample = () => {
    setRawContent(sampleText);
    setQuizTitle('Bộ đề mẫu - Cú pháp chuẩn');
    setSubject('Tổng hợp');
    setHasParsed(false);
  };

  const handleLoadMessySample = () => {
    setRawContent(messySampleText);
    setQuizTitle('Bộ đề AI trích xuất từ văn bản thô');
    setSubject('Công nghệ thông tin');
    setHasParsed(false);
    setAiError(null);
  };

  const handleParse = () => {
    if (!rawContent.trim()) return;
    setAiError(null);
    const results = parseTextFormat(rawContent);
    setParsedQuestions(results);
    setHasParsed(true);
  };

  const handleAiParse = async () => {
    if (!rawContent.trim()) {
      alert('Vui lòng dán văn bản hoặc tải file .txt trước!');
      return;
    }

    setIsAiParsing(true);
    setAiError(null);

    try {
      const res = await fetch('/api/parse-quiz-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawContent }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi gọi AI phân tích.');
      }

      if (data.questions && Array.isArray(data.questions)) {
        setParsedQuestions(data.questions);
        setHasParsed(true);
      } else {
        throw new Error('Dữ liệu trả về từ AI không hợp lệ.');
      }
    } catch (err: any) {
      console.error('Error parsing with AI:', err);
      setAiError(err.message || 'Không thể kết nối dịch vụ AI. Vui lòng thử lại!');
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawContent(text);
      if (!quizTitle && file.name) {
        setQuizTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setHasParsed(false);
    };
    reader.readAsText(file);
  };

  const handleFinalImport = () => {
    const validQuestions = parsedQuestions.filter((q) => q.valid);
    if (validQuestions.length === 0) {
      alert('Không có câu hỏi hợp lệ nào để nhập.');
      return;
    }

    if (targetType === 'new') {
      const finalTitle = quizTitle.trim() || 'Bộ đề mới nhập';
      const newQuiz: Quiz = {
        id: `quiz-imp-${Date.now()}`,
        title: finalTitle,
        description: `Tạo tự động từ văn bản gồm ${validQuestions.length} câu hỏi.`,
        subject: subject.trim() || 'Khác',
        topic: 'Nhập nhanh',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timesCompleted: 0,
        questions: validQuestions.map((q, idx) => ({
          id: `q-imp-${Date.now()}-${idx}`,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          correctAnswers: q.correctAnswers || [q.correctAnswer],
          explanation: q.explanation,
          note: q.note,
          difficulty: q.difficulty,
          imageUrl: q.imageUrl,
          timesAnswered: 0,
          timesCorrect: 0,
          timesWrong: 0,
          mastered: false,
        })),
      };

      onSaveImportedQuiz(newQuiz);
      alert(`Đã tạo thành công bộ đề "${newQuiz.title}" với ${validQuestions.length} câu hỏi!`);
    } else {
      const targetQuiz = quizzes.find((q) => q.id === selectedQuizId);
      if (!targetQuiz) {
        alert('Vui lòng chọn bộ đề cần thêm câu hỏi.');
        return;
      }
      onAppendToQuiz(selectedQuizId, validQuestions);
      alert(`Đã thêm ${validQuestions.length} câu hỏi vào bộ đề "${targetQuiz.title}"!`);
    }

    setRawContent('');
    setParsedQuestions([]);
    setHasParsed(false);
    setQuizTitle('');
  };

  const validCount = parsedQuestions.filter((q) => q.valid).length;
  const invalidCount = parsedQuestions.length - validCount;

  const handleDeleteInvalidParsed = () => {
    if (window.confirm(`Bạn có chắc muốn xóa toàn bộ ${invalidCount} câu hỏi không hợp lệ / lỗi này không?`)) {
      setParsedQuestions((prev) => prev.filter((q) => q.valid));
    }
  };

  const handleClearAllParsed = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ danh sách câu hỏi đã phân tích này không?')) {
      setParsedQuestions([]);
      setHasParsed(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>Thêm Nhanh Bộ Câu Hỏi Từ Văn Bản</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dán văn bản theo định dạng đơn giản để tạo ngay bộ đề thi trắc nghiệm.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLoadMessySample}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Nạp mẫu văn bản thô, lộn xộn để thử AI lọc tự động"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>✨ Mẫu văn bản AI lộn xộn</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer"
            title="Nạp mẫu có cấu trúc định dạng chuẩn"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Mẫu cú pháp chuẩn</span>
          </button>

          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-all">
            <Upload className="w-3.5 h-3.5" />
            <span>Tải file (.txt / doc)</span>
            <input
              type="file"
              accept=".txt,.text,.csv,.json,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Target Destination Settings */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
          1. Đích đến của câu hỏi
        </h3>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="radio"
              name="targetType"
              checked={targetType === 'new'}
              onChange={() => setTargetType('new')}
              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Tạo bộ đề mới hoàn toàn</span>
          </label>

          {quizzes.length > 0 && (
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="radio"
                name="targetType"
                checked={targetType === 'existing'}
                onChange={() => setTargetType('existing')}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Thêm vào bộ đề có sẵn</span>
            </label>
          )}
        </div>

        {targetType === 'new' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tên bộ đề mới <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Nhập tên bộ đề (ví dụ: An toàn thông tin Ch.1)"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Môn học / Chủ đề
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Công nghệ thông tin, Lịch sử, Tiếng Anh..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1 max-w-md pt-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Chọn bộ đề cần bổ sung câu hỏi
            </label>
            <select
              value={selectedQuizId}
              onChange={(e) => setSelectedQuizId(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.questions.length} câu) - Môn: {q.subject}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Textarea & Syntax instructions */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            2. Nội dung văn bản
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            Phân cách giữa các câu bằng dấu !
          </span>
        </div>

        {/* Syntax Helper Ribbon */}
        <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs space-y-1.5 font-mono text-indigo-950 dark:text-indigo-200">
          <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Cấu trúc nhập nhanh (Hỗ trợ 1 hoặc nhiều đáp án đúng):</span>
          </div>
          <div className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 pl-5">
            [Tên câu hỏi]<br />
            <span className="font-bold text-emerald-600 dark:text-emerald-400">[Ảnh: https://link-anh.com/image.png] (Tùy chọn)</span><br />
            A. [Lựa chọn 1]<br />
            B. [Lựa chọn 2]<br />
            C. [Lựa chọn 3]<br />
            D. [Lựa chọn 4]<br />
            <span className="font-bold text-indigo-600 dark:text-indigo-400">@ [Đáp án đúng, vd: @ C hoặc nhiều đáp án @ c,d / @ a, b]</span><br />
            <span className="font-bold text-indigo-700 dark:text-indigo-300">Giải thích chi tiết</span><br />
            [Nội dung giải thích]<br />
            <span className="font-bold text-amber-600 dark:text-amber-400">Ghi chú ghi nhớ</span><br />
            [Nội dung ghi chú]<br />
            <span className="font-bold text-rose-600 dark:text-rose-400">! (Dấu chấm cảm để phân cách câu)</span>
          </div>
        </div>

        <textarea
          rows={11}
          placeholder="Dán hoặc tải file văn bản thô, lộn xộn tại đây (có thể từ file Word, TXT, PDF, câu hỏi lẫn lộn đáp án, ghi chú...)..."
          value={rawContent}
          onChange={(e) => {
            setRawContent(e.target.value);
            setHasParsed(false);
            setAiError(null);
          }}
          className="w-full p-4 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
        />

        {aiError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {/* Action buttons: AI Smart Parse vs Manual Syntax Parse vs Manual Create */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            type="button"
            onClick={handleAiParse}
            disabled={!rawContent.trim() || isAiParsing}
            className="py-3.5 px-4 font-bold text-xs text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isAiParsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>AI đang phân tích...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-amber-300" />
                <span>✨ Dùng AI trích xuất</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleParse}
            disabled={!rawContent.trim() || isAiParsing}
            className="py-3.5 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Phân tích cú pháp chuẩn</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddNew('end')}
            className="py-3.5 px-4 font-bold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            title="Tự tạo hoặc chèn câu hỏi thủ công mà không cần định dạng trước"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>+ Tạo câu hỏi thủ công</span>
          </button>
        </div>
      </div>

      {/* Parsed Preview Section */}
      {hasParsed && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                3. Kết quả phân tích ({validCount} câu hợp lệ / {parsedQuestions.length} câu)
              </h3>
              <p className="text-xs text-slate-400">
                Vui lòng kiểm tra lại trước khi nhấn lưu vào hệ thống.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto justify-end">
              {invalidCount > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteInvalidParsed}
                  className="inline-flex items-center gap-1.5 px-3 py-2 font-bold text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-800 rounded-xl transition-all cursor-pointer shadow-2xs"
                  title="Xóa toàn bộ các câu không hợp lệ chỉ với 1 bấm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa {invalidCount} câu lỗi</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenAddNew('end')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Chèn thủ công thêm 1 câu hỏi vào cuối danh sách"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Chèn thêm câu thủ công</span>
              </button>

              <button
                type="button"
                onClick={handleClearAllParsed}
                className="inline-flex items-center gap-1 px-3 py-2 font-semibold text-xs text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Hủy kết quả phân tích hiện tại"
              >
                <span>Hủy kết quả</span>
              </button>

              <button
                type="button"
                onClick={handleFinalImport}
                disabled={validCount === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Lưu {validCount} câu hỏi này ngay</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {parsedQuestions.map((q, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                  q.valid
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
                    : 'border-rose-300 bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex-1">
                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold mr-1">Câu {idx + 1}.</span>
                    <ClickableText text={q.question} isExamMode={false} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {q.valid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md">
                        <CheckCircle className="w-3.5 h-3.5" /> Hợp lệ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-md">
                        <AlertCircle className="w-3.5 h-3.5" /> {q.error || 'Lỗi'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(idx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-lg transition-all cursor-pointer"
                      title="Sửa chi tiết câu hỏi này"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{q.imageUrl ? 'Sửa câu (Đã có ảnh)' : 'Sửa / Thêm ảnh'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteParsed(idx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 rounded-lg transition-all cursor-pointer"
                      title="Xóa câu hỏi này khỏi danh sách nhập"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>

                {q.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[160px] bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-2">
                    <img
                      src={q.imageUrl}
                      alt="Ảnh đính kèm"
                      referrerPolicy="no-referrer"
                      className="max-h-[140px] w-auto object-contain rounded-lg"
                    />
                  </div>
                )}

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = (q.correctAnswers || [q.correctAnswer]).includes(optIdx);
                    return (
                      <div
                        key={optIdx}
                        className={`p-2 rounded-lg border flex items-center gap-2 ${
                          isCorrect
                            ? 'bg-emerald-100/80 dark:bg-emerald-950/80 font-bold text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation display */}
                {q.explanation && (
                  <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[11px] text-indigo-900 dark:text-indigo-200 font-medium flex items-start gap-1.5">
                    <span className="font-bold shrink-0"># Giải thích:</span>
                    <span className="whitespace-pre-line">{q.explanation}</span>
                  </div>
                )}

                {/* Note display */}
                {q.note && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200 font-medium flex items-start gap-1.5">
                    <span className="font-bold shrink-0">$ Ghi chú:</span>
                    <span className="whitespace-pre-line">{q.note}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Add Question Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleOpenAddNew('end')}
              className="w-full py-3.5 px-4 font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 hover:bg-indigo-100/90 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border-2 border-dashed border-indigo-300 dark:border-indigo-800 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs hover:shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Chèn thêm câu hỏi thủ công vào danh sách</span>
            </button>
          </div>
        </div>
      )}

      {/* EDIT / ADD NEW QUESTION MODAL */}
      {editingIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {editingIndex === 'new' ? (
                  <>
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>Thêm Câu Hỏi Mới Thủ Công (Câu #{parsedQuestions.length + 1})</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 text-indigo-600" />
                    <span>Chỉnh Sửa Câu Hỏi #{editingIndex + 1}</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setEditingIndex(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nội dung câu hỏi <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={editForm.question}
                onChange={(e) => setEditForm((prev) => ({ ...prev, question: e.target.value }))}
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Question Image */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ảnh đính kèm (URL, Tải file, hoặc Dán ảnh Ctrl+V)</span>
                </span>
                {editForm.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setEditForm((prev) => ({ ...prev, imageUrl: '' }))}
                    className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                  >
                    Xóa ảnh
                  </button>
                )}
              </label>
              <div
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type.startsWith('image/')) {
                      const blob = items[i].getAsFile();
                      if (blob) {
                        handleProcessImportImage(blob);
                        e.preventDefault();
                      }
                    }
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    handleProcessImportImage(file);
                  }
                }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.imageUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('data:image/')) {
                        handleProcessImportImage(val);
                      } else {
                        setEditForm((prev) => ({ ...prev, imageUrl: val }));
                      }
                    }}
                    placeholder="Dán URL ảnh hoặc nhấn Ctrl+V để dán ảnh trực tiếp từ bộ nhớ tạm..."
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <label className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer flex items-center gap-1.5 shrink-0 transition-all">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Chọn file</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleProcessImportImage(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {editForm.imageUrl ? (
                  <div className="relative p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl max-h-[150px] flex items-center justify-center overflow-hidden">
                    <img src={editForm.imageUrl} alt="Preview" className="max-h-[130px] w-auto object-contain rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, imageUrl: '' }))}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                      title="Xóa ảnh này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    💡 Mẹo: Bạn có thể sao chép ảnh rồi nhấn <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded text-[10px] font-mono">Ctrl + V</kbd> hoặc kéo thả tệp ảnh vào đây!
                  </p>
                )}
              </div>
            </div>

            {/* Options List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Các lựa chọn đáp án (Tích chọn đáp án đúng):
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setEditForm((prev) => ({
                      ...prev,
                      options: [...prev.options, ''],
                    }))
                  }
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  + Thêm đáp án
                </button>
              </div>

              <div className="space-y-2">
                {editForm.options.map((optText, optIdx) => {
                  const isChecked = editForm.correctAnswers.includes(optIdx);
                  return (
                    <div key={optIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm((prev) => {
                            const exists = prev.correctAnswers.includes(optIdx);
                            let nextAns: number[];
                            if (exists) {
                              nextAns = prev.correctAnswers.filter((a) => a !== optIdx);
                            } else {
                              nextAns = [...prev.correctAnswers, optIdx];
                            }
                            return { ...prev, correctAnswers: nextAns };
                          });
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={isChecked ? 'Đáp án đúng (Bấm để hủy chọn)' : 'Bấm để chọn làm đáp án đúng'}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </button>

                      <input
                        type="text"
                        value={optText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditForm((prev) => {
                            const nextOpts = [...prev.options];
                            nextOpts[optIdx] = val;
                            return { ...prev, options: nextOpts };
                          });
                        }}
                        placeholder={`Lựa chọn ${String.fromCharCode(65 + optIdx)}`}
                        className={`flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                          isChecked
                            ? 'border-emerald-500 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/30 font-semibold'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />

                      {editForm.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm((prev) => {
                              const nextOpts = prev.options.filter((_, i) => i !== optIdx);
                              const nextAns = prev.correctAnswers
                                .filter((a) => a !== optIdx)
                                .map((a) => (a > optIdx ? a - 1 : a));
                              return { ...prev, options: nextOpts, correctAnswers: nextAns };
                            });
                          }}
                          className="p-2 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation & Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Giải thích chi tiết (#)
                </label>
                <textarea
                  rows={3}
                  value={editForm.explanation}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, explanation: e.target.value }))}
                  placeholder="Nội dung giải thích chi tiết..."
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ghi chú ghi nhớ ($)
                </label>
                <textarea
                  rows={3}
                  value={editForm.note}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Nội dung ghi chú quan trọng..."
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Save Actions */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              {editingIndex !== 'new' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof editingIndex === 'number') {
                      handleDeleteParsed(editingIndex);
                      setEditingIndex(null);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa câu này</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingIndex === 'new' ? 'Thêm câu hỏi này' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
