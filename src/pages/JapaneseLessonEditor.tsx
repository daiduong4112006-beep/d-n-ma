import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Image as ImageIcon,
  Save,
  FileText,
  ArrowUpDown,
  Sparkles,
  Check,
  Globe,
  UploadCloud,
  X,
} from 'lucide-react';
import { JapaneseLesson, JapaneseVocabCard } from '../types/japanese';
import { JapaneseBulkImportModal } from '../components/japanese/JapaneseBulkImportModal';
import { compressImage } from '../utils/imageCompressor';
import { sound } from '../utils/audio';

interface JapaneseLessonEditorProps {
  lessonToEdit?: JapaneseLesson | null;
  onSave: (lesson: JapaneseLesson) => void;
  onCancel: () => void;
}

export const JapaneseLessonEditor: React.FC<JapaneseLessonEditorProps> = ({
  lessonToEdit,
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState(lessonToEdit?.title || '');
  const [description, setDescription] = useState(lessonToEdit?.description || '');
  const [level, setLevel] = useState<JapaneseLesson['level']>(lessonToEdit?.level || 'N5');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const [cards, setCards] = useState<JapaneseVocabCard[]>(() => {
    if (lessonToEdit && lessonToEdit.cards.length > 0) {
      return lessonToEdit.cards;
    }
    // Default 3 initial empty cards
    return [
      { id: `jp-card-init-1`, term: '', reading: '', definition: '', example: '', mastered: false },
      { id: `jp-card-init-2`, term: '', reading: '', definition: '', example: '', mastered: false },
      { id: `jp-card-init-3`, term: '', reading: '', definition: '', example: '', mastered: false },
    ];
  });

  const handleCardChange = (index: number, field: keyof JapaneseVocabCard, value: string) => {
    setCards((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddCard = () => {
    setCards((prev) => [
      ...prev,
      {
        id: `jp-card-new-${Date.now()}-${prev.length}`,
        term: '',
        reading: '',
        definition: '',
        example: '',
        mastered: false,
      },
    ]);
  };

  const handleDeleteCard = (index: number) => {
    if (cards.length <= 1) {
      alert('Học phần cần có ít nhất 1 thẻ từ vựng!');
      return;
    }
    setCards((prev) => prev.filter((_, i) => i !== index));
  };

  // Swap Term and Definition across all cards
  const handleSwapAll = () => {
    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        term: c.definition,
        definition: c.term,
      }))
    );
  };

  // Handle Bulk Import
  const handleBulkImported = (importedCards: JapaneseVocabCard[]) => {
    // Filter out initial empty cards if any
    const nonEmpty = cards.filter((c) => c.term.trim() || c.definition.trim());
    setCards([...nonEmpty, ...importedCards]);
  };

  // Image Upload handler for specific card
  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      handleCardChange(index, 'imageUrl', compressed);
    } catch {
      alert('Không thể tải ảnh. Vui lòng thử ảnh khác!');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập Tiêu đề học phần!');
      return;
    }

    const validCards = cards.filter((c) => c.term.trim() || c.definition.trim());
    if (validCards.length === 0) {
      alert('Vui lòng nhập ít nhất 1 thẻ từ vựng!');
      return;
    }

    const payload: JapaneseLesson = {
      id: lessonToEdit?.id || `jp-lesson-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      level: level || 'N5',
      cards: validCards,
      createdAt: lessonToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timesPracticed: lessonToEdit?.timesPracticed || 0,
    };

    sound.playCorrect();
    onSave(payload);
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header Navigation (Matches Screenshot 1) */}
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {lessonToEdit ? 'Chỉnh sửa học phần' : 'Tạo một học phần mới'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-extrabold text-xs sm:text-sm text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{lessonToEdit ? 'Lưu thay đổi' : 'Tạo'}</span>
            </button>
          </div>
        </div>

        {/* Level / Visibility badge */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Công khai</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300">
            <span>Trình độ:</span>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as JapaneseLesson['level'])}
              className="bg-slate-800 text-white rounded-lg px-2 py-0.5 border border-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="N5">JLPT N5 (Cơ bản)</option>
              <option value="N4">JLPT N4 (Sơ cấp)</option>
              <option value="N3">JLPT N3 (Trung cấp)</option>
              <option value="N2">JLPT N2 (Thượng cấp)</option>
              <option value="N1">JLPT N1 (Cao cấp)</option>
              <option value="Cơ bản">Giao tiếp thường ngày</option>
              <option value="Khác">Chủ đề khác</option>
            </select>
          </div>
        </div>

        {/* Title and Description Inputs (Matches Screenshot 1) */}
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề (ví dụ: Từ vựng Minna no Nihongo Bài 1)"
            className="w-full px-5 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />

          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Thêm mô tả..."
            className="w-full px-5 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Toolbar (Matches Screenshot 1) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 font-extrabold text-xs text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Nhập (Dán danh sách từ vựng)</span>
            </button>

            <button
              type="button"
              onClick={handleSwapAll}
              className="p-2 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Đổi chỗ Thuật ngữ và Định nghĩa của tất cả các thẻ"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs font-extrabold text-slate-400">
            Tổng cộng: {cards.length} thẻ
          </span>
        </div>

        {/* Cards List (Matches Screenshot 1) */}
        <div className="space-y-4">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800/90 shadow-lg space-y-3 relative group"
            >
              {/* Card Index & Action */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="font-extrabold text-sm text-slate-400">
                  {index + 1}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteCard(index)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                    title="Xóa thẻ này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Inputs: THUẬT NGỮ | ĐỊNH NGHĨA | HÌNH ẢNH */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                {/* THUẬT NGỮ (Term - Kanji / Kana) */}
                <div className="md:col-span-5 space-y-1.5">
                  <input
                    type="text"
                    value={card.term}
                    onChange={(e) => handleCardChange(index, 'term', e.target.value)}
                    placeholder="ví dụ: 電車"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-bold">
                    <span>THUẬT NGỮ (KANJI / TỪ TIẾNG NHẬT)</span>
                  </div>

                  {/* Reading / Furigana helper */}
                  <input
                    type="text"
                    value={card.reading || ''}
                    onChange={(e) => handleCardChange(index, 'reading', e.target.value)}
                    placeholder="Phiên âm Kana: でんしゃ (tùy chọn)"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/50 border border-slate-800/70 text-xs text-cyan-300 placeholder-slate-600 focus:outline-none"
                  />
                </div>

                {/* ĐỊNH NGHĨA (Definition - Nghĩa tiếng Việt) */}
                <div className="md:col-span-5 space-y-1.5">
                  <input
                    type="text"
                    value={card.definition}
                    onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                    placeholder="ví dụ: Tàu điện"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-bold">
                    <span>ĐỊNH NGHĨA (NGHĨA TIẾNG VIỆT)</span>
                  </div>

                  {/* Example context */}
                  <input
                    type="text"
                    value={card.example || ''}
                    onChange={(e) => handleCardChange(index, 'example', e.target.value)}
                    placeholder="Ví dụ: Lên tàu điện. (tùy chọn)"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/50 border border-slate-800/70 text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                  />
                </div>

                {/* HÌNH ẢNH (Image) */}
                <div className="md:col-span-2 flex flex-col items-center justify-center">
                  {card.imageUrl ? (
                    <div className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-700 group/img">
                      <img
                        src={card.imageUrl}
                        alt="Ảnh minh họa"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleCardChange(index, 'imageUrl', '')}
                        className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-rose-400 hover:text-white"
                        title="Xóa ảnh"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/80 bg-slate-950/50 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-indigo-400 transition-all cursor-pointer p-2 text-center">
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-[10px] font-extrabold uppercase">Hình ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(index, e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Add Card Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAddCard}
            className="w-full py-4 rounded-3xl bg-slate-900 hover:bg-slate-850 border-2 border-dashed border-slate-800 hover:border-indigo-500/80 font-extrabold text-sm text-indigo-400 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>+ Thêm thẻ</span>
          </button>
        </div>

        {/* Bottom Floating Save Button */}
        <div className="sticky bottom-6 pt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 font-bold text-xs text-slate-300 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-extrabold text-sm text-white shadow-xl shadow-indigo-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{lessonToEdit ? 'Lưu thay đổi' : 'Hoàn tất & Tạo'}</span>
          </button>
        </div>

        {/* Bulk Import Modal */}
        {isBulkImportOpen && (
          <JapaneseBulkImportModal
            isOpen={isBulkImportOpen}
            onClose={() => setIsBulkImportOpen(false)}
            onImportCards={handleBulkImported}
          />
        )}
      </div>
    </div>
  );
};
