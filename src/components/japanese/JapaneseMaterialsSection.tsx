import React, { useState, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  FolderOpen,
  UploadCloud,
  FileText,
  File,
  Download,
  Eye,
  Trash2,
  ExternalLink,
  Plus,
  Search,
  X,
  Image as ImageIcon,
  Link as LinkIcon,
  BookOpen,
  Copy,
  Check,
  Printer,
  Sparkles,
  Share2,
} from 'lucide-react';
import { JapaneseMaterial, AttachedFile } from '../../types/japanese';
import { readFileAsDataUrl } from '../../utils/japaneseStorage';
import { sound } from '../../utils/audio';

interface Props {
  materials: JapaneseMaterial[];
  onUpdateMaterials: (updated: JapaneseMaterial[], deletedId?: string) => void;
}

function downloadTextAsFile(content: string, filename: string) {
  const safeName = filename.endsWith('.md') || filename.endsWith('.txt') ? filename : `${filename}.md`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export const JapaneseMaterialsSection: React.FC<Props> = ({
  materials,
  onUpdateMaterials,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLessonTag, setSelectedLessonTag] = useState<string>('ALL');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<JapaneseMaterial | null>(null);

  // Active material reader modal (handles both textContent, file and external links)
  const [activeMaterial, setActiveMaterial] = useState<JapaneseMaterial | null>(null);
  const [copied, setCopied] = useState(false);
  const [readerFontSize, setReaderFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link Form
  const [linkForm, setLinkForm] = useState({
    title: '',
    description: '',
    url: '',
    lessonTag: 'Tổng hợp',
    category: 'LINK' as const,
  });

  const categories = [
    { key: 'ALL', label: 'Tất cả loại' },
    { key: 'DOC', label: 'Tài liệu / Đọc ngay' },
    { key: 'PDF', label: 'Tài liệu PDF' },
    { key: 'SLIDE', label: 'Slide bài giảng' },
    { key: 'IMAGE', label: 'Hình ảnh' },
    { key: 'LINK', label: 'Liên kết ngoài' },
  ];

  const lessonTags = [
    { key: 'ALL', label: 'Tất cả bài' },
    { key: 'Bài 4', label: 'Bài 4' },
    { key: 'Bài 5', label: 'Bài 5' },
    { key: 'Bài 6', label: 'Bài 6' },
    { key: 'Bài 7', label: 'Bài 7' },
    { key: 'Tổng hợp', label: 'Tổng hợp' },
  ];

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newMaterials: JapaneseMaterial[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let category: JapaneseMaterial['category'] = 'OTHER';
        let textContent: string | undefined = undefined;

        if (file.type.includes('pdf') || ext === 'pdf') {
          category = 'PDF';
        } else if (ext === 'doc' || ext === 'docx') {
          category = 'DOC';
        } else if (ext === 'txt' || ext === 'md') {
          category = 'DOC';
          try {
            textContent = await readFileAsText(file);
          } catch {
            // fallback
          }
        } else if (ext === 'ppt' || ext === 'pptx') {
          category = 'SLIDE';
        } else if (file.type.startsWith('image/')) {
          category = 'IMAGE';
        }

        const dataUrl = await readFileAsDataUrl(file);

        newMaterials.push({
          id: `mat-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          description: `Định dạng: .${ext.toUpperCase() || 'FILE'} • ${formatFileSize(file.size)}`,
          category,
          lessonTag: 'Tự tải lên',
          uploadedAt: new Date().toISOString(),
          textContent,
          file: {
            id: `f-${Date.now()}-${i}`,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            uploadedAt: new Date().toISOString(),
            dataUrl,
          },
        });
      } catch (err) {
        console.error('Lỗi khi đọc file tài liệu:', err);
      }
    }

    if (newMaterials.length > 0) {
      onUpdateMaterials([...newMaterials, ...materials]);
      sound.playCorrect();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const getNormalizedFileUrl = (raw: string): string => {
    const clean = (raw || '').trim();
    if (!clean) return '';
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
      return clean;
    }
    if (clean.startsWith('file://')) {
      return clean;
    }
    return `file:///${clean.replace(/\\/g, '/')}`;
  };

  const handleOpenLocalFileInNewTab = (rawPath: string, mat?: JapaneseMaterial) => {
    const cleanPath = decodeURIComponent(rawPath.replace(/^file:\/\/\/?/, ''));
    try {
      navigator.clipboard.writeText(cleanPath);
    } catch {
      // ignore
    }

    if (mat) {
      setActiveMaterial(mat);
    }

    sound.playCorrect();
    setToastNotice('🔒 Trình duyệt Chrome/Edge chặn web tự mở ổ cứng (file://). ĐÃ SAO CHÉP ĐƯỜNG DẪN: Bạn chỉ cần mở tab mới (Ctrl+T) và ấn Ctrl+V rồi Enter!');
    setTimeout(() => setToastNotice(null), 6000);
  };

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkForm.title.trim() || !linkForm.url.trim()) return;

    const rawUrl = linkForm.url.trim();
    const isLocalFile = rawUrl.startsWith('file://') || /^[a-zA-Z]:[\\/]/.test(rawUrl);
    const finalLink = isLocalFile
      ? (rawUrl.startsWith('file://') ? rawUrl : `file:///${rawUrl.replace(/\\/g, '/')}`)
      : rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
      ? rawUrl
      : `https://${rawUrl}`;

    let finalCategory: JapaneseMaterial['category'] = 'LINK';
    const lower = rawUrl.toLowerCase();
    if (lower.endsWith('.pdf') || lower.includes('.pdf')) finalCategory = 'PDF';
    else if (lower.endsWith('.doc') || lower.endsWith('.docx') || lower.includes('.doc')) finalCategory = 'DOC';
    else if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) finalCategory = 'SLIDE';
    else if (lower.match(/\.(png|jpe?g|webp|gif|svg)$/)) finalCategory = 'IMAGE';

    const newMat: JapaneseMaterial = {
      id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: linkForm.title.trim(),
      description:
        linkForm.description.trim() ||
        (isLocalFile ? 'Đường dẫn file trên máy / OneDrive cá nhân' : 'Liên kết tài liệu trực tuyến'),
      category: finalCategory,
      lessonTag: linkForm.lessonTag || 'Tổng hợp',
      externalLink: finalLink,
      uploadedAt: new Date().toISOString(),
    };

    onUpdateMaterials([newMat, ...materials]);
    setIsAddingLink(false);
    setLinkForm({ title: '', description: '', url: '', lessonTag: 'Tổng hợp', category: 'LINK' });
    sound.playCorrect();
    setToastNotice(`Đã thêm liên kết tài liệu: "${newMat.title}"! Bấm nút "Mở tab mới" trên thẻ để truy cập.`);
    setTimeout(() => setToastNotice(null), 4000);
  };

  const handleDeleteConfirm = () => {
    if (!materialToDelete) return;
    const deletedId = materialToDelete.id;
    const updated = materials.filter((m) => m.id !== deletedId);
    onUpdateMaterials(updated, deletedId);
    if (activeMaterial?.id === deletedId) {
      setActiveMaterial(null);
    }
    setMaterialToDelete(null);
    sound.playClick();
  };

  const handleOpenMaterial = (mat: JapaneseMaterial) => {
    sound.playClick();
    setActiveMaterial(mat);
    setCopied(false);
    if (mat.externalLink && (mat.externalLink.startsWith('file://') || /^[a-zA-Z]:[\\/]/.test(mat.externalLink))) {
      const clean = decodeURIComponent(mat.externalLink.replace(/^file:\/\/\/?/, ''));
      try {
        navigator.clipboard.writeText(clean);
        setToastNotice('Đã tự động sao chép đường dẫn file vào bộ nhớ tạm (Ctrl+V)!');
        setTimeout(() => setToastNotice(null), 4000);
      } catch {
        // ignore
      }
    }
  };

  const handleCopyContent = () => {
    if (!activeMaterial) return;
    const content = activeMaterial.textContent || activeMaterial.description || activeMaterial.title;
    navigator.clipboard.writeText(content);
    setCopied(true);
    sound.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadActive = () => {
    if (!activeMaterial) return;
    if (activeMaterial.file?.dataUrl) {
      const a = document.createElement('a');
      a.href = activeMaterial.file.dataUrl;
      a.download = activeMaterial.file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (activeMaterial.textContent) {
      downloadTextAsFile(activeMaterial.textContent, activeMaterial.title);
    }
    sound.playClick();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filtered = materials.filter((m) => {
    // Search query
    const q = searchTerm.toLowerCase().trim();
    const matchSearch =
      !q ||
      m.title.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      (m.lessonTag && m.lessonTag.toLowerCase().includes(q));

    // Category filter
    const matchCategory =
      selectedCategory === 'ALL' || m.category === selectedCategory;

    // Lesson tag filter
    const matchLesson =
      selectedLessonTag === 'ALL' ||
      (m.lessonTag && m.lessonTag.includes(selectedLessonTag)) ||
      m.title.includes(selectedLessonTag);

    return matchSearch && matchCategory && matchLesson;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px]">
              📂 TÀI LIỆU HỌC TẬP JPD 123
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              {materials.length} tài liệu lưu trữ
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Kho Tài Liệu & Giáo Trình
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bấm vào bất kỳ tài liệu nào để <span className="text-emerald-600 dark:text-emerald-400 font-bold">đọc trực tiếp</span>, tải file về máy hoặc mở file trong tab mới.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAddingLink(true)}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Thêm liên kết</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Tải tài liệu lên</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Toast Notice */}
      {toastNotice && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-800 dark:text-indigo-200 flex items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <span>{toastNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="p-1 hover:bg-indigo-200/50 rounded-lg text-indigo-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-6 sm:p-8 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2.5 select-none ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10'
        }`}
      >
        <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-800 dark:text-slate-200">
            Kéo và thả file tài liệu vào đây, hoặc <span className="text-emerald-600 dark:text-emerald-400 underline">chọn từ máy tính</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Hỗ trợ PDF, Word (.doc, .docx), Slide (.ppt, .pptx), Ảnh (.png, .jpg), Text / Markdown (.txt, .md)
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="space-y-3">
        {/* Lesson tag pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {lessonTags.map((tag) => {
            const isSelected = selectedLessonTag === tag.key;
            return (
              <button
                key={tag.key}
                type="button"
                onClick={() => {
                  setSelectedLessonTag(tag.key);
                  sound.playClick();
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>

        {/* Categories & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.key);
                    sound.playClick();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm tài liệu..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Materials Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
              {searchTerm ? 'Không tìm thấy tài liệu phù hợp' : 'Chưa có tài liệu nào trong thư mục'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Hãy tải lên tài liệu giáo trình hoặc liên kết học tập để ôn luyện khi cần.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mat) => {
            const isLink = mat.category === 'LINK' || Boolean(mat.externalLink);
            const isPdf = mat.category === 'PDF';
            const isImage = mat.category === 'IMAGE';
            const hasText = Boolean(mat.textContent);
            const hasFile = Boolean(mat.file?.dataUrl);

            return (
              <div
                key={mat.id}
                onClick={() => handleOpenMaterial(mat)}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between space-y-4 cursor-pointer group hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                      isPdf
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400'
                        : isImage
                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400'
                        : isLink
                        ? 'bg-sky-100 text-sky-600 dark:bg-sky-950/80 dark:text-sky-400'
                        : hasText
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400'
                        : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400'
                    }`}
                  >
                    {isPdf ? (
                      <FileText className="w-6 h-6" />
                    ) : isImage ? (
                      <ImageIcon className="w-6 h-6" />
                    ) : isLink ? (
                      <LinkIcon className="w-6 h-6" />
                    ) : hasText ? (
                      <BookOpen className="w-6 h-6" />
                    ) : (
                      <File className="w-6 h-6" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                        {mat.category}
                      </span>
                      {mat.lessonTag && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold">
                          {mat.lessonTag}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {new Date(mat.uploadedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <h4
                      className="text-sm font-black text-slate-900 dark:text-white line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
                      title={mat.title}
                    >
                      {mat.title}
                    </h4>
                    {mat.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {mat.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div
                  className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    {/* Primary Button: Open Reader / View / Link */}
                    {hasText ? (
                      <button
                        type="button"
                        onClick={() => handleOpenMaterial(mat)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1.5 cursor-pointer shadow-xs shadow-emerald-600/20 active:scale-95 transition-all"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Đọc tài liệu</span>
                      </button>
                    ) : hasFile ? (
                      <button
                        type="button"
                        onClick={() => handleOpenMaterial(mat)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1.5 cursor-pointer shadow-xs shadow-emerald-600/20 active:scale-95 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem file</span>
                      </button>
                    ) : isLink ? (
                      mat.externalLink?.startsWith('file://') || /^[a-zA-Z]:[\\/]/.test(mat.externalLink || '') ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenMaterial(mat)}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black flex items-center gap-1.5 cursor-pointer shadow-xs shadow-indigo-600/20 active:scale-95 transition-all text-xs"
                            title="Mở hướng dẫn xem file & sao chép đường dẫn"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Mở file</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const raw = mat.externalLink || '';
                              const clean = decodeURIComponent(raw.replace(/^file:\/\/\/?/, ''));
                              navigator.clipboard.writeText(clean);
                              sound.playCorrect();
                              setToastNotice('Đã sao chép đường dẫn file vào bộ nhớ tạm (Ctrl+V)!');
                              setTimeout(() => setToastNotice(null), 3000);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-bold cursor-pointer transition-colors"
                            title="Sao chép đường dẫn file"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={mat.externalLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black flex items-center gap-1.5 cursor-pointer shadow-xs shadow-sky-600/20 active:scale-95 transition-all text-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Mở tab mới</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleOpenMaterial(mat)}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/60 text-slate-600 dark:text-slate-300 hover:text-sky-600 font-bold cursor-pointer transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenMaterial(mat)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Xem chi tiết</span>
                      </button>
                    )}

                    {/* Secondary Button: Download if available */}
                    {hasFile ? (
                      <a
                        href={mat.file!.dataUrl}
                        download={mat.file!.name}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-bold cursor-pointer transition-colors"
                        title="Tải file về máy"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : hasText ? (
                      <button
                        type="button"
                        onClick={() => downloadTextAsFile(mat.textContent!, mat.title)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-bold cursor-pointer transition-colors"
                        title="Tải tài liệu (.md) về máy"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMaterialToDelete(mat);
                    }}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                    title="Xóa tài liệu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL READER / PREVIEW MODAL */}
      {activeMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  {activeMaterial.category === 'LINK' ? (
                    <LinkIcon className="w-5 h-5" />
                  ) : activeMaterial.textContent ? (
                    <BookOpen className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px]">
                      {activeMaterial.category}
                    </span>
                    {activeMaterial.lessonTag && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                        {activeMaterial.lessonTag}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                    {activeMaterial.title}
                  </h3>
                </div>
              </div>

              {/* Reader Controls Toolbar */}
              <div className="flex items-center gap-1.5 shrink-0">
                {activeMaterial.textContent && (
                  <>
                    <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setReaderFontSize('sm')}
                        className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          readerFontSize === 'sm'
                            ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs'
                            : 'text-slate-500'
                        }`}
                        title="Chữ nhỏ"
                      >
                        A-
                      </button>
                      <button
                        type="button"
                        onClick={() => setReaderFontSize('base')}
                        className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          readerFontSize === 'base'
                            ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs'
                            : 'text-slate-500'
                        }`}
                        title="Chữ vừa"
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => setReaderFontSize('lg')}
                        className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          readerFontSize === 'lg'
                            ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs'
                            : 'text-slate-500'
                        }`}
                        title="Chữ to"
                      >
                        A+
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyContent}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                      title="Sao chép nội dung tài liệu"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Sao chép</span>
                        </>
                      )}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleDownloadActive}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-all"
                  title="Tải file về máy"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tải về</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMaterial(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-7">
              {activeMaterial.textContent ? (
                <div
                  className={`markdown-content select-text leading-relaxed text-slate-800 dark:text-slate-100 ${
                    readerFontSize === 'sm'
                      ? 'text-xs'
                      : readerFontSize === 'lg'
                      ? 'text-base sm:text-lg'
                      : 'text-sm'
                  }`}
                >
                  <Markdown>{activeMaterial.textContent}</Markdown>
                </div>
              ) : activeMaterial.file?.dataUrl ? (
                <div className="space-y-4 flex flex-col items-center justify-center min-h-[350px]">
                  {activeMaterial.file.type.startsWith('image/') ? (
                    <img
                      src={activeMaterial.file.dataUrl}
                      alt={activeMaterial.file.name}
                      className="max-h-[65vh] max-w-full object-contain rounded-2xl shadow-md border border-slate-200 dark:border-slate-800"
                    />
                  ) : activeMaterial.file.type.includes('pdf') ? (
                    <iframe
                      src={activeMaterial.file.dataUrl}
                      title={activeMaterial.file.name}
                      className="w-full h-[65vh] rounded-2xl border border-slate-200 dark:border-slate-800"
                    />
                  ) : (
                    <div className="text-center space-y-4 p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-md mx-auto">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                        <File className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-slate-900 dark:text-white">
                          {activeMaterial.file.name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Định dạng: {activeMaterial.file.type || 'Tài liệu'} • {formatFileSize(activeMaterial.file.size)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        File định dạng này có thể tải về để mở trực tiếp bằng Microsoft Office hoặc ứng dụng trên máy tính của bạn.
                      </p>
                      <a
                        href={activeMaterial.file.dataUrl}
                        download={activeMaterial.file.name}
                        className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs inline-flex items-center gap-2 shadow-md shadow-emerald-600/30"
                      >
                        <Download className="w-4 h-4" />
                        <span>Tải file về máy</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : activeMaterial.externalLink ? (
                (() => {
                  const link = activeMaterial.externalLink;
                  const isLocal = link.startsWith('file://') || /^[a-zA-Z]:[\\/]/.test(link);
                  const cleanLocalPath = decodeURIComponent(link.replace(/^file:\/\/\/?/, ''));
                  const isWordDoc = link.toLowerCase().endsWith('.doc') || link.toLowerCase().endsWith('.docx') || link.toLowerCase().includes('.docx') || link.toLowerCase().includes('.doc');
                  const isPdfLink = link.toLowerCase().endsWith('.pdf') || link.toLowerCase().includes('.pdf');

                  if (isLocal) {
                    return (
                      <div className="space-y-4 p-5 sm:p-7 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-2xl mx-auto my-2 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px]">
                                File máy tính / OneDrive
                              </span>
                            </div>
                            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate pt-0.5">
                              {activeMaterial.title}
                            </h4>
                          </div>
                        </div>

                        {/* Security notice banner */}
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                          <span className="text-base shrink-0">🔒</span>
                          <div className="space-y-1">
                            <p className="font-bold text-[11px]">
                              Tại sao Chrome / Edge không cho web tự mở ổ cứng?
                            </p>
                            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                              Để bảo vệ an toàn máy tính của bạn, mọi trình duyệt đều chặn các trang web tự ý truy cập hay mở trực tiếp ổ đĩa (<code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono">file:///</code>). <b>Hệ thống đã tự động sao chép đường dẫn file của bạn vào bộ nhớ tạm (Ctrl+V)!</b>
                            </p>
                          </div>
                        </div>

                        {/* Path box with copy button */}
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-black text-slate-400">
                              Đường dẫn file (Đã copy sẵn):
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(cleanLocalPath);
                                setCopied(true);
                                sound.playCorrect();
                                setTimeout(() => setCopied(false), 2500);
                              }}
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              <span>{copied ? 'Đã sao chép!' : 'Sao chép lại'}</span>
                            </button>
                          </div>
                          <div className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all select-all bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                            {cleanLocalPath}
                          </div>
                        </div>

                        {/* Action cards: 3 easy ways */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {/* Option 1: Open blank tab to paste */}
                          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-2.5 shadow-2xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-black text-xs">
                                <ExternalLink className="w-4 h-4" />
                                <span>Cách 1: Mở tab mới & dán</span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                Bấm nút bên dưới để mở tab mới, sau đó chỉ việc nhấn <b>Ctrl + V</b> rồi ấn <b>Enter</b>.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const fullFileUri = link.startsWith('file://')
                                  ? link
                                  : `file:///${cleanLocalPath.replace(/\\/g, '/')}`;
                                navigator.clipboard.writeText(cleanLocalPath);
                                sound.playCorrect();

                                // Try to open the file:// protocol directly
                                const newWindow = window.open(fullFileUri, '_blank');
                                if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                                  // In case the browser blocked file:// navigation
                                  window.open('about:blank', '_blank');
                                  setToastNotice('Trình duyệt bảo mật chặn file://! Hãy dán (Ctrl + V) đường dẫn vào thanh địa chỉ rồi Enter.');
                                } else {
                                  setToastNotice('Đang mở file... Nếu tab trắng do trình duyệt chặn, hãy ấn Ctrl + V rồi Enter.');
                                }
                                setTimeout(() => setToastNotice(null), 6000);
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Mở link file (hoặc Ctrl+V)</span>
                            </button>
                          </div>

                          {/* Option 2: Upload file to read inside app */}
                          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 flex flex-col justify-between space-y-2.5 shadow-2xs bg-emerald-50/20 dark:bg-emerald-950/10">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                                <UploadCloud className="w-4 h-4" />
                                <span>Cách 2: Đọc trực tiếp trong App</span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                Chọn nạp file PDF này vào web để xem, lật trang, tìm từ vựng trực tiếp không cần mở ứng dụng ngoài.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Chọn file để đọc ngay</span>
                            </button>
                          </div>
                        </div>

                        {/* Windows Win+R and OneDrive hint */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 space-y-1">
                            <span className="font-bold flex items-center gap-1 text-[11px] text-slate-900 dark:text-white">
                              ⚡ Cách 3: Mở bằng Windows (Win + R)
                            </span>
                            <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                              Nhấn tổ hợp phím <b>Win + R</b>, nhấn <b>Ctrl + V</b> và ấn <b>Enter</b> để bật file bằng ứng dụng PDF trên máy.
                            </p>
                          </div>

                          <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-2xl border border-sky-200/80 dark:border-sky-800/80 text-sky-900 dark:text-sky-200 space-y-1">
                            <span className="font-bold flex items-center gap-1 text-[11px] text-sky-700 dark:text-sky-300">
                              ☁️ Cách 4: Lấy link OneDrive trực tuyến
                            </span>
                            <p className="text-[10.5px] leading-relaxed text-sky-700 dark:text-sky-400">
                              Chuột phải vào file ➜ <b>Chia sẻ (Share)</b> ➜ <b>Sao chép liên kết</b> rồi dán vào app để mở trực tiếp trên web 100%!
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Web Word doc or PDF preview
                  if (link.startsWith('http') && (isWordDoc || isPdfLink)) {
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {isWordDoc ? '📄 Xem trước văn bản Word' : '📕 Xem trước tài liệu PDF'}
                          </div>
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-sky-600 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Mở trong tab mới</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <iframe
                          src={
                            isPdfLink
                              ? link
                              : `https://docs.google.com/viewer?url=${encodeURIComponent(link)}&embedded=true`
                          }
                          title={activeMaterial.title}
                          className="w-full h-[65vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white"
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="text-center space-y-5 p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-md mx-auto my-6">
                      <div className="w-16 h-16 rounded-3xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center mx-auto shadow-xs">
                        <ExternalLink className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-slate-900 dark:text-white">
                          {activeMaterial.title}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {activeMaterial.description || 'Liên kết ngoài phục vụ học tập'}
                        </p>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 truncate max-w-sm mx-auto">
                        {link}
                      </div>
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs inline-flex items-center gap-2 shadow-md shadow-sky-600/30"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Mở liên kết trong tab mới</span>
                      </a>
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {activeMaterial.description || 'Không có nội dung văn bản chi tiết.'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs text-slate-400">
                Ngày đăng: {new Date(activeMaterial.uploadedAt).toLocaleString('vi-VN')}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMaterial(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD LINK */}
      {isAddingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-emerald-600" />
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Thêm liên kết tài liệu trực tuyến
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingLink(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLink} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Tên tài liệu *
                </label>
                <input
                  type="text"
                  required
                  value={linkForm.title}
                  onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                  placeholder="VD: Google Drive bài giảng JPD123..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Đường dẫn liên kết hoặc file (URL / Path) *
                  </label>
                  <span className="text-[10px] text-emerald-600 font-bold">Hỗ trợ cả web & file máy</span>
                </div>
                <input
                  type="text"
                  required
                  value={linkForm.url}
                  onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                  placeholder="https://drive.google.com/... hoặc file:///C:/Users/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      setLinkForm((prev) => ({
                        ...prev,
                        title: prev.title || 'New words list - Dekiru Nihongo Beginner_2',
                        url: 'file:///C:/Users/daidu/OneDrive/T%C3%A0i%20li%E1%BB%87u/AI2107/K%C3%8C%203/JPD123/%20t%E1%BB%95ng%20h%C6%A1p/New%20words%20list%20-%20Dekiru%20Nihongo%20Beginner_2.pdf',
                        description: 'Tài liệu từ vựng Dekiru Nihongo',
                      }))
                    }
                    className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-bold hover:bg-indigo-100"
                  >
                    + Mẫu link file máy tính (file:///)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLinkForm((prev) => ({
                        ...prev,
                        url: 'https://',
                      }))
                    }
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-200"
                  >
                    + https://
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Thuộc bài học
                </label>
                <select
                  value={linkForm.lessonTag}
                  onChange={(e) => setLinkForm({ ...linkForm, lessonTag: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Tổng hợp">Tổng hợp</option>
                  <option value="Bài 4">Bài 4</option>
                  <option value="Bài 5">Bài 5</option>
                  <option value="Bài 6">Bài 6</option>
                  <option value="Bài 7">Bài 7</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  value={linkForm.description}
                  onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                  placeholder="VD: Thư mục chứa slide & bài tập hàng tuần"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingLink(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer shadow-md shadow-emerald-600/30"
                >
                  Thêm liên kết
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {materialToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Xóa tài liệu này?
                </h4>
                <p className="text-xs text-slate-500 truncate max-w-[200px]">
                  {materialToDelete.title}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tài liệu sẽ bị xóa khỏi khóa học. Bạn có chắc chắn muốn tiếp tục không?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMaterialToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
