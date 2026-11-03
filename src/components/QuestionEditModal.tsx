import React from 'react';
import { Edit3, Trash2, X, Image, UploadCloud, Plus, Save } from 'lucide-react';

export interface QuestionEditForm {
  question: string;
  imageUrl: string;
  options: string[];
  correctAnswers: number[];
  explanation: string;
  note: string;
}

const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

interface Props {
  editingQuestionIndex: number;
  qEditForm: QuestionEditForm;
  setQEditForm: React.Dispatch<React.SetStateAction<QuestionEditForm>>;
  onClose: () => void;
  handleSaveQuestionEdit: () => void;
  handleProcessImage: (fileOrBlobOrUrl: File | Blob | string) => void | Promise<void>;
}

/** Cửa sổ chỉnh sửa một câu hỏi trong trang chi tiết bộ đề (tách từ QuizDetailPage) */
export const QuestionEditModal: React.FC<Props> = ({
  editingQuestionIndex,
  qEditForm,
  setQEditForm,
  onClose,
  handleSaveQuestionEdit,
  handleProcessImage,
}) => (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-indigo-600" />
            <span>Chỉnh sửa Câu hỏi #{editingQuestionIndex + 1}</span>
          </h3>
          <button
            type="button"
            onClick={() => onClose()}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Question Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nội dung câu hỏi:
            </label>
            <textarea
              rows={3}
              value={qEditForm.question}
              onChange={(e) => setQEditForm((prev) => ({ ...prev, question: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Question Image (URL / File / Paste / Drag & Drop) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ảnh đính kèm câu hỏi (URL, Tải file, hoặc Dán ảnh Ctrl+V)</span>
              </span>
              {qEditForm.imageUrl && (
                <button
                  type="button"
                  onClick={() => setQEditForm((prev) => ({ ...prev, imageUrl: '' }))}
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
                      handleProcessImage(blob);
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
                  handleProcessImage(file);
                }
              }}
              className="space-y-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qEditForm.imageUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('data:image/')) {
                      handleProcessImage(val);
                    } else {
                      setQEditForm((prev) => ({ ...prev, imageUrl: val }));
                    }
                  }}
                  placeholder="Dán URL ảnh hoặc nhấn Ctrl+V để dán ảnh từ bộ nhớ tạm..."
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
                        handleProcessImage(file);
                      }
                    }}
                  />
                </label>
              </div>

              {qEditForm.imageUrl ? (
                <div className="relative p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl max-h-[160px] flex items-center justify-center overflow-hidden">
                  <img src={qEditForm.imageUrl} alt="Preview" className="max-h-[140px] w-auto object-contain rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setQEditForm((prev) => ({ ...prev, imageUrl: '' }))}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                    title="Xóa ảnh này"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  💡 Mẹo: Bạn có thể sao chép ảnh từ màn hình/web rồi nhấn <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded text-[10px] font-mono">Ctrl + V</kbd> hoặc kéo thả tệp ảnh vào đây!
                </p>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Các lựa chọn (Tích chọn 1 hoặc NHIỀU đáp án đúng):
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Đã chọn {qEditForm.correctAnswers.length} đáp án đúng
                </span>
                <button
                  type="button"
                  onClick={() => setQEditForm((prev) => ({ ...prev, options: [...prev.options, ''] }))}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm phương án</span>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {qEditForm.options.map((opt, oIdx) => {
                const letter = letters[oIdx] || `${oIdx + 1}`;
                const isChecked = qEditForm.correctAnswers.includes(oIdx);
                return (
                  <div key={oIdx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setQEditForm((prev) => {
                          const exists = prev.correctAnswers.includes(oIdx);
                          let nextAns: number[];
                          if (exists) {
                            nextAns = prev.correctAnswers.filter((i) => i !== oIdx);
                          } else {
                            nextAns = [...prev.correctAnswers, oIdx];
                          }
                          return { ...prev, correctAnswers: nextAns };
                        });
                      }}
                      className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center cursor-pointer shrink-0 transition-all ${
                        isChecked
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                      title={isChecked ? 'Bấm để hủy chọn đáp án đúng' : 'Bấm để chọn làm đáp án đúng'}
                    >
                      {letter}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQEditForm((prev) => {
                          const nextOpts = [...prev.options];
                          nextOpts[oIdx] = val;
                          return { ...prev, options: nextOpts };
                        });
                      }}
                      placeholder={`Lựa chọn ${letter}...`}
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    {qEditForm.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          setQEditForm((prev) => {
                            const nextOpts = prev.options.filter((_, i) => i !== oIdx);
                            const nextCorrect = prev.correctAnswers
                              .filter((i) => i !== oIdx)
                              .map((i) => (i > oIdx ? i - 1 : i));
                            return { ...prev, options: nextOpts, correctAnswers: nextCorrect };
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation & Note */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Giải thích chi tiết:
              </label>
              <textarea
                rows={2}
                value={qEditForm.explanation}
                onChange={(e) => setQEditForm((prev) => ({ ...prev, explanation: e.target.value }))}
                placeholder="Giải thích vì sao đáp án này đúng..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Ghi chú / Mẹo nhớ:
              </label>
              <textarea
                rows={2}
                value={qEditForm.note}
                onChange={(e) => setQEditForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Mẹo nhớ nhanh..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onClose()}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSaveQuestionEdit}
            className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </div>
    </div>
);
