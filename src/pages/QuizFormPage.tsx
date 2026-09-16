import React, { useState } from 'react';
import { Quiz, Question, Difficulty } from '../types/quiz';
import { Plus, Trash2, Edit, Save, ArrowLeft, MoveUp, MoveDown, Zap, FileText, Image, UploadCloud, X } from 'lucide-react';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { parseTextFormat } from '../utils/parser';
import { compressImage } from '../utils/imageCompressor';

interface QuizFormPageProps {
  quizToEdit?: Quiz | null;
  onSaveQuiz: (quiz: Quiz) => void;
  onCancel: () => void;
}

export const QuizFormPage: React.FC<QuizFormPageProps> = ({
  quizToEdit,
  onSaveQuiz,
  onCancel,
}) => {
  const [title, setTitle] = useState(quizToEdit?.title || '');
  const [description, setDescription] = useState(quizToEdit?.description || '');
  const [subject, setSubject] = useState(quizToEdit?.subject || 'Computer Science');
  const [topic, setTopic] = useState(quizToEdit?.topic || '');
  const [questions, setQuestions] = useState<Question[]>(quizToEdit?.questions || []);

  // Add Question mode: 'quick' or 'manual'
  const [addMode, setAddMode] = useState<'quick' | 'manual'>('quick');
  const [quickText, setQuickText] = useState('');

  // Single Question Form State
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState('');
  const [qImageUrl, setQImageUrl] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState<number[]>([0]);
  const [explanation, setExplanation] = useState('');
  const [note, setNote] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');

  const [formError, setFormError] = useState<string | null>(null);

  const quickSampleText = `Thủ đô của Việt Nam là gì?
A. Hà Nội
B. TP Hồ Chí Minh
C. Đà Nẵng
D. Cần Thơ
@ A
!
Binary Search có độ phức tạp thuật toán là bao nhiêu?
A. O(n)
B. O(log n)
C. O(n²)
D. O(1)
@ B
!`;

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQText('');
    setQImageUrl('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrectAnswers([0]);
    setExplanation('');
    setNote('');
    setDifficulty('Medium');
    setFormError(null);
  };

  const loadQuestionForEdit = (q: Question) => {
    setEditingQuestionId(q.id);
    setQText(q.question);
    setQImageUrl(q.imageUrl || '');
    setOptA(q.options[0] || '');
    setOptB(q.options[1] || '');
    setOptC(q.options[2] || '');
    setOptD(q.options[3] || '');
    setCorrectAnswers(
      q.correctAnswers && q.correctAnswers.length > 0
        ? [...q.correctAnswers]
        : [q.correctAnswer ?? 0]
    );
    setExplanation(q.explanation || '');
    setNote(q.note || '');
    setDifficulty(q.difficulty || 'Medium');
    setFormError(null);
  };

  const handleQuickImportSubmit = () => {
    const parsed = parseTextFormat(quickText);
    const validList = parsed.filter((q) => q.valid);
    if (validList.length === 0) {
      alert('Không tìm thấy câu hỏi hợp lệ nào. Vui lòng kiểm tra lại cấu trúc câu hỏi!');
      return;
    }

    const newQuestions: Question[] = validList.map((q, idx) => ({
      id: `q-quick-${Date.now()}-${idx}`,
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
    }));

    setQuestions((prev) => [...prev, ...newQuestions]);
    setQuickText('');
    alert(`Đã thêm thành công ${validList.length} câu hỏi vào danh sách bên dưới!`);
  };

  const handleProcessFormImage = async (fileOrBlobOrUrl: File | Blob | string) => {
    try {
      const compressed = await compressImage(fileOrBlobOrUrl, 960, 960, 0.8);
      if (compressed) {
        setQImageUrl(compressed);
      }
    } catch (err) {
      console.error('Error processing quiz form image:', err);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim()) {
      setFormError('Vui lòng nhập nội dung câu hỏi.');
      return;
    }
    const optionsList = [optA.trim(), optB.trim(), optC.trim(), optD.trim()].filter(Boolean);
    if (optionsList.length < 2) {
      setFormError('Vui lòng nhập ít nhất 2 phương án lựa chọn (Ví dụ: Lựa chọn A và Lựa chọn B).');
      return;
    }

    const validCorrect = correctAnswers.filter((idx) => idx < optionsList.length);
    if (validCorrect.length === 0) {
      validCorrect.push(0);
    }

    let finalImg = qImageUrl.trim();
    if (finalImg && finalImg.startsWith('data:image/')) {
      finalImg = await compressImage(finalImg, 960, 960, 0.8);
    }

    const newQuestion: Question = {
      id: editingQuestionId || `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      question: qText.trim(),
      options: optionsList,
      correctAnswer: validCorrect[0],
      correctAnswers: validCorrect,
      explanation: explanation.trim() || 'Không có giải thích chi tiết.',
      note: note.trim(),
      difficulty,
      imageUrl: finalImg || undefined,
      timesAnswered: editingQuestionId ? questions.find((q) => q.id === editingQuestionId)?.timesAnswered || 0 : 0,
      timesCorrect: editingQuestionId ? questions.find((q) => q.id === editingQuestionId)?.timesCorrect || 0 : 0,
      timesWrong: editingQuestionId ? questions.find((q) => q.id === editingQuestionId)?.timesWrong || 0 : 0,
      mastered: editingQuestionId ? questions.find((q) => q.id === editingQuestionId)?.mastered || false : false,
    };

    if (editingQuestionId) {
      setQuestions(questions.map((q) => (q.id === editingQuestionId ? newQuestion : q)));
    } else {
      setQuestions([...questions, newQuestion]);
    }

    resetQuestionForm();
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
    if (editingQuestionId === id) {
      resetQuestionForm();
    }
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const copy = [...questions];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setQuestions(copy);
  };

  const handleFinalSaveQuiz = () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên bộ câu hỏi.');
      return;
    }
    if (questions.length === 0) {
      alert('Vui lòng thêm ít nhất 1 câu hỏi vào bộ đề.');
      return;
    }

    const updatedQuiz: Quiz = {
      id: quizToEdit?.id || `quiz-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim() || 'General',
      topic: topic.trim() || 'General',
      createdAt: quizToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions,
      timesCompleted: quizToEdit?.timesCompleted || 0,
      ...(quizToEdit?.lastScore !== undefined && { lastScore: quizToEdit.lastScore }),
      ...(quizToEdit?.lastTotal !== undefined && { lastTotal: quizToEdit.lastTotal }),
      ...(quizToEdit?.lastAttemptDate !== undefined && { lastAttemptDate: quizToEdit.lastAttemptDate }),
    };

    onSaveQuiz(updatedQuiz);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {quizToEdit ? 'Edit Quiz Set' : 'Create New Quiz Set'}
            </h2>
            <p className="text-xs text-slate-400">
              Nhập thông tin bộ câu hỏi MCQ và các tùy chọn đáp án, giải thích
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleFinalSaveQuiz}
          className="inline-flex items-center gap-2 px-6 py-2.5 font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save Entire Quiz Set</span>
        </button>
      </div>

      {/* Quiz Metadata Inputs */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          1. General Information / Thông tin chung
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Quiz Title / Tên bộ đề <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Data Structures & Algorithms Foundations"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Subject / Môn học
            </label>
            <input
              type="text"
              placeholder="e.g., Computer Science, Mathematics, Medical"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Topic / Chủ đề
            </label>
            <input
              type="text"
              placeholder="e.g., Trees & Graphs, Time Complexity"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description / Mô tả bộ đề
            </label>
            <textarea
              rows={2}
              placeholder="Mô tả tóm tắt mục tiêu hoặc phạm vi bài trắc nghiệm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Question Form Editor */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              2. Thêm câu hỏi vào bộ đề
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chọn phương thức thêm nhanh bằng văn bản hoặc nhập thủ công
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setAddMode('quick');
                resetQuestionForm();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                addMode === 'quick'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Thêm Nhanh Văn Bản</span>
            </button>

            <button
              type="button"
              onClick={() => setAddMode('manual')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                addMode === 'manual'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Nhập Thủ Công</span>
            </button>
          </div>
        </div>

        {addMode === 'quick' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Cấu trúc Thêm Nhanh (Dùng ký tự @ và !):
                </span>
                <button
                  type="button"
                  onClick={() => setQuickText(quickSampleText)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Dán mẫu ví dụ
                </button>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-mono space-y-1">
                <p>Nội dung câu hỏi</p>
                <p>A. Đáp án A</p>
                <p>B. Đáp án B</p>
                <p>C. Đáp án C</p>
                <p>D. Đáp án D</p>
                <p className="text-indigo-600 font-bold">@ đáp án (ví dụ @ A hoặc @ Hà Nội)</p>
                <p className="text-rose-500 font-bold">! (dấu phân cách câu hỏi)</p>
              </div>
            </div>

            <textarea
              rows={9}
              placeholder={`Thủ đô của Việt Nam là gì?\nA. Hà Nội\nB. TP Hồ Chí Minh\nC. Đà Nẵng\nD. Cần Thơ\n@ A\n!\nThủ đô của Nhật Bản là gì?\nA. Kyoto\nB. Tokyo\nC. Osaka\nD. Nagoya\n@ B\n!`}
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              className="w-full p-4 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                {quickText.trim() ? 'Sẵn sàng phân tích danh sách câu hỏi...' : 'Nhập văn bản theo cấu trúc mẫu ở trên'}
              </span>

              <button
                type="button"
                onClick={handleQuickImportSubmit}
                disabled={!quickText.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Phân Tích & Thêm Hàng Loạt</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {formError && (
              <div className="mb-4 p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-5">
              {/* Question text */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Question Text / Nội dung câu hỏi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., What is the time complexity of Binary Search?"
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Question Image URL / Upload / Paste */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Ảnh đính kèm (URL, Tải file, hoặc Dán ảnh Ctrl+V)</span>
                  </span>
                  {qImageUrl && (
                    <button
                      type="button"
                      onClick={() => setQImageUrl('')}
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
                          handleProcessFormImage(blob);
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
                      handleProcessFormImage(file);
                    }
                  }}
                  className="space-y-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Dán URL ảnh hoặc nhấn Ctrl+V để dán ảnh trực tiếp từ bộ nhớ tạm..."
                      value={qImageUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('data:image/')) {
                          handleProcessFormImage(val);
                        } else {
                          setQImageUrl(val);
                        }
                      }}
                      className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                            handleProcessFormImage(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {qImageUrl ? (
                    <div className="relative p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl max-h-[160px] flex items-center justify-center overflow-hidden group">
                      <img src={qImageUrl} alt="Preview" className="max-h-[140px] w-auto object-contain rounded-lg" />
                      <button
                        type="button"
                        onClick={() => setQImageUrl('')}
                        className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                        title="Xóa ảnh này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      💡 Mẹo: Bạn có thể sao chép ảnh từ web/màn hình rồi nhấn <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded text-[10px] font-mono">Ctrl + V</kbd> ở ô trên hoặc kéo thả ảnh vào đây!
                    </p>
                  )}
                </div>
              </div>

              {/* Options Grid */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Các phương án lựa chọn (Tích chọn 1 hoặc NHIỀU đáp án đúng) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Đã chọn {correctAnswers.length} đáp án đúng
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'A', val: optA, setVal: setOptA, idx: 0 },
                    { label: 'B', val: optB, setVal: setOptB, idx: 1 },
                    { label: 'C', val: optC, setVal: setOptC, idx: 2 },
                    { label: 'D', val: optD, setVal: setOptD, idx: 3 },
                  ].map((opt) => {
                    const isChecked = correctAnswers.includes(opt.idx);
                    return (
                      <div
                        key={opt.label}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                          isChecked
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setCorrectAnswers((prev) =>
                              prev.includes(opt.idx)
                                ? prev.filter((i) => i !== opt.idx)
                                : [...prev, opt.idx]
                            );
                          }}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                          }`}
                          title={isChecked ? 'Bấm để hủy chọn đáp án đúng' : 'Bấm để chọn làm đáp án đúng'}
                        >
                          {opt.label}
                        </button>
                        <input
                          type="text"
                          placeholder={`Nội dung lựa chọn ${opt.label}...`}
                          value={opt.val}
                          onChange={(e) => opt.setVal(e.target.value)}
                          className="w-full text-xs font-medium bg-transparent border-none focus:outline-none text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanation, Note, and Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Explanation / Giải thích chi tiết
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ví dụ: Binary Search chia đôi không gian tìm kiếm ở mỗi bước..."
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    className="w-full px-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Difficulty / Độ khó
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-4 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Easy">Easy / Dễ</option>
                    <option value="Medium">Medium / Trung bình</option>
                    <option value="Hard">Hard / Khó</option>
                  </select>

                  <div className="pt-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Note / Mẹo ghi nhớ
                    </label>
                    <input
                      type="text"
                      placeholder="Ghi chú ngắn gọn cho câu hỏi..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingQuestionId ? 'Cập Nhật Câu Hỏi' : 'Thêm Câu Hỏi'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          3. Added Questions / Danh sách câu hỏi ({questions.length})
        </h3>

        {questions.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-6">
            Chưa có câu hỏi nào. Nhập thông tin ở form trên để thêm câu hỏi đầu tiên!
          </p>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const isEditingThis = editingQuestionId === q.id;

              if (isEditingThis) {
                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl border-2 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-4 shadow-sm animate-in fade-in duration-200"
                  >
                    <div className="flex items-center justify-between border-b border-indigo-200/60 dark:border-indigo-800/60 pb-2">
                      <span className="font-extrabold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        ✏️ Đang sửa câu hỏi Q{idx + 1} trực tiếp bên dưới:
                      </span>
                      <button
                        type="button"
                        onClick={resetQuestionForm}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        Đóng / Hủy
                      </button>
                    </div>

                    {formError && (
                      <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                        {formError}
                      </div>
                    )}

                    {/* Question Text Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Nội dung câu hỏi Q{idx + 1} <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={qText}
                        onChange={(e) => setQText(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Question Image URL / Upload / Paste / Drag & Drop */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Image className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Ảnh đính kèm câu hỏi Q{idx + 1} (URL, Tải file, hoặc Dán ảnh Ctrl+V)</span>
                        </span>
                        {qImageUrl && (
                          <button
                            type="button"
                            onClick={() => setQImageUrl('')}
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
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  if (ev.target?.result) setQImageUrl(ev.target.result as string);
                                };
                                reader.readAsDataURL(blob);
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
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) setQImageUrl(ev.target.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="space-y-2"
                      >
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Dán URL ảnh hoặc nhấn Ctrl+V để dán ảnh trực tiếp từ bộ nhớ tạm..."
                            value={qImageUrl}
                            onChange={(e) => setQImageUrl(e.target.value)}
                            className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    if (ev.target?.result) {
                                      setQImageUrl(ev.target.result as string);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>

                        {qImageUrl ? (
                          <div className="relative p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl max-h-[160px] flex items-center justify-center overflow-hidden group">
                            <img src={qImageUrl} alt="Preview" className="max-h-[140px] w-auto object-contain rounded-lg" />
                            <button
                              type="button"
                              onClick={() => setQImageUrl('')}
                              className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                              title="Xóa ảnh này"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            💡 Mẹo: Bạn có thể sao chép ảnh từ web/màn hình rồi nhấn <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded text-[10px] font-mono">Ctrl + V</kbd> ở ô trên hoặc kéo thả tệp ảnh vào đây!
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Options Grid */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Các lựa chọn (Tích chọn 1 hoặc NHIỀU đáp án đúng):
                        </label>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Đã chọn {correctAnswers.length} đáp án đúng
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {[
                          { label: 'A', val: optA, setVal: setOptA, idxOpt: 0 },
                          { label: 'B', val: optB, setVal: setOptB, idxOpt: 1 },
                          { label: 'C', val: optC, setVal: setOptC, idxOpt: 2 },
                          { label: 'D', val: optD, setVal: setOptD, idxOpt: 3 },
                        ].map((opt) => {
                          const isChecked = correctAnswers.includes(opt.idxOpt);
                          return (
                            <div
                              key={opt.label}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                                isChecked
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setCorrectAnswers((prev) =>
                                    prev.includes(opt.idxOpt)
                                      ? prev.filter((i) => i !== opt.idxOpt)
                                      : [...prev, opt.idxOpt]
                                  );
                                }}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                                }`}
                                title={isChecked ? 'Bấm để hủy chọn đáp án' : 'Bấm để chọn làm đáp án đúng'}
                              >
                                {opt.label}
                              </button>
                              <input
                                type="text"
                                placeholder={`Lựa chọn ${opt.label}...`}
                                value={opt.val}
                                onChange={(e) => opt.setVal(e.target.value)}
                                className="w-full text-xs font-medium bg-transparent border-none focus:outline-none text-slate-900 dark:text-slate-100"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation, Note & Difficulty */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Giải thích chi tiết:
                        </label>
                        <textarea
                          rows={2}
                          value={explanation}
                          onChange={(e) => setExplanation(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                            Độ khó:
                          </label>
                          <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                            className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                          >
                            <option value="Easy">Easy / Dễ</option>
                            <option value="Medium">Medium / Trung bình</option>
                            <option value="Hard">Hard / Khó</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                            Mẹo ghi nhớ:
                          </label>
                          <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save / Cancel buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60">
                      <button
                        type="button"
                        onClick={resetQuestionForm}
                        className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveQuestion}
                        className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu Cập Nhật Q{idx + 1}</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        Q{idx + 1}.
                      </span>
                      <DifficultyBadge difficulty={q.difficulty} />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        • Correct:{' '}
                        {(q.correctAnswers && q.correctAnswers.length > 0
                          ? q.correctAnswers
                          : [q.correctAnswer ?? 0]
                        )
                          .map((c) => `[${['A', 'B', 'C', 'D', 'E', 'F'][c] || c}] ${q.options[c] || ''}`)
                          .join('  •  ')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {q.question}
                    </p>
                  </div>

                  {/* Question Row Controls */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                    >
                      <MoveUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(idx, 'down')}
                      disabled={idx === questions.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                    >
                      <MoveDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => loadQuestionForEdit(q)}
                      title="Chỉnh sửa câu hỏi trực tiếp"
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
