import { SectionHeader, ToneButton } from './courseUi';
import React, { useState, useRef } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  FileText,
  Upload,
  Download,
  Eye,
  File,
  Paperclip,
  Check,
  X,
  BookOpen,
  Sparkles,
  ExternalLink,
  Volume2,
  HelpCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Keyboard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { JapaneseGrammarPoint, AttachedFile } from '../../types/japanese';
import { JPD123_GRAMMAR_POINTS } from '../../data/jpd123Grammar';
import { readFileAsDataUrl } from '../../utils/japaneseStorage';
import { sound } from '../../utils/audio';
import { speakJapanese } from '../../utils/japaneseKana';
import { JapaneseGrammarPracticeMode } from './JapaneseGrammarPracticeMode';
import { JapaneseGrammarAiModal } from './JapaneseGrammarAiModal';

interface ParsedStructureLine {
  type: 'question' | 'answer' | 'affirmative' | 'negative' | 'agree' | 'decline' | 'contrast' | 'link' | 'note' | 'group' | 'formula';
  badge: string;
  badgeClass: string;
  text: string;
}

interface StructureLabelMatch {
  type: ParsedStructureLine['type'];
  badge: string;
  badgeClass: string;
  remainingText: string;
  isPureLabel: boolean;
}

const matchStructureLabel = (rawLine: string): StructureLabelMatch | null => {
  const line = rawLine.trim();
  if (!line) return null;

  // Pattern 1: Question (❓ Câu hỏi, (?), （？）, câu hỏi, hỏi, nghi vấn)
  // Support both emojis \u2753 (❓), \uFF1F (？), ?, and Vietnamese keywords
  const qMatch = line.match(/^(?:(?:[❓?？]\s*(?:câu\s*hỏi|hỏi|nghi\s*vấn)?|câu\s*hỏi|nghi\s*vấn|hỏi|[（(][？?][）)])(?:\s*\(([^)]+)\))?|\[(?:câu\s*hỏi|hỏi|nghi\s*vấn|[?？❓])\])[:：\s]*(.*)$/iu);
  if (qMatch) {
    const sub = qMatch[1]?.trim();
    const remaining = qMatch[2]?.trim() || '';
    return {
      type: 'question',
      badge: sub ? `❓ Câu hỏi (${sub})` : '❓ Câu hỏi',
      badgeClass: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      remainingText: remaining,
      isPureLabel: remaining.length === 0,
    };
  }

  // Pattern 2: Answer (💬/💭/🗨️ Trả lời, trả lời, đáp, câu trả lời, （＝）, (=), （→）, (->))
  const aMatch = line.match(/^(?:(?:[💬💭🗨🗯🗣=＝→]|->)\s*(?:trả\s*lời|câu\s*trả\s*lời|đáp|câu\s*đáp)?|trả\s*lời|câu\s*trả\s*lời|đáp|câu\s*đáp|[（(][＝=→\->][）)]|\[(?:trả\s*lời|đáp|[=＝])\])(?:\s*\(([^)]+)\))?[:：\s]*(.*)$/iu);
  if (aMatch) {
    const sub = aMatch[1]?.trim();
    const remaining = aMatch[2]?.trim() || '';
    return {
      type: 'answer',
      badge: sub ? `💬 Trả lời (${sub})` : '💬 Trả lời',
      badgeClass: 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      remainingText: remaining,
      isPureLabel: remaining.length === 0,
    };
  }

  // Pattern 3: Affirmative (✅ Khẳng định, khẳng định, câu khẳng định, （＋）, (+))
  const affMatch = line.match(/^(?:(?:[✅✔✓+＋]\s*(?:khẳng\s*định)?|khẳng\s*định|câu\s*khẳng\s*định|[（(][＋+][）)]|\[(?:khẳng\s*định|[+＋✅])\]))(?:\s*\(([^)]+)\))?[:：\s]*(.*)$/iu);
  if (affMatch) {
    const sub = affMatch[1]?.trim();
    const remaining = affMatch[2]?.trim() || '';
    return {
      type: 'affirmative',
      badge: sub ? `✅ Khẳng định (${sub})` : '✅ Khẳng định',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      remainingText: remaining,
      isPureLabel: remaining.length === 0,
    };
  }

  // Pattern 4: Negative (❌ Phủ định, phủ định, câu phủ định, （－）, (-))
  const negMatch = line.match(/^(?:(?:[❌✖✕\-－]\s*(?:phủ\s*định)?|phủ\s*định|câu\s*phủ\s*định|[（(][\-－][）)]|\[(?:phủ\s*định|[\-－❌])\]))(?:\s*\(([^)]+)\))?[:：\s]*(.*)$/iu);
  if (negMatch) {
    const sub = negMatch[1]?.trim();
    const remaining = negMatch[2]?.trim() || '';
    return {
      type: 'negative',
      badge: sub ? `❌ Phủ định (${sub})` : '❌ Phủ định',
      badgeClass: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      remainingText: remaining,
      isPureLabel: remaining.length === 0,
    };
  }

  // Pattern 5: Agree (🤝 Đồng ý, đồng ý, chấp nhận, tán thành)
  const agreeMatch = line.match(/^(?:(?:[🤝👍]\s*(?:đồng\s*ý|tán\s*thành)?|đồng\s*ý|chấp\s*nhận|tán\s*thành))(?:\s*\(([^)]+)\))?[:：\s]*(.*)$/iu);
  if (agreeMatch) {
    const sub = agreeMatch[1]?.trim();
    const remaining = agreeMatch[2]?.trim() || '';
    return {
      type: 'agree',
      badge: sub ? `🤝 Đồng ý (${sub})` : '🤝 Đồng ý',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      remainingText: remaining,
      isPureLabel: remaining.length === 0,
    };
  }

  // Pattern 6: Decline (✋ Từ chối, từ chối, khước từ)
  const decMatch = line.match(/^(?:(?:[✋🚫👎]\s*(?:từ\s*chối)?|từ\s*chối|khước\s*từ))(?:\s*\(([^)]+)\))?[:：\s]*(.*)$/iu);
  if (decMatch) {
    const remaining = decMatch[2]?.trim() || '';
    return {
      type: 'decline',
      badge: '✋ Từ chối',
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      remainingText: remaining,
      isPureLabel: remaining.length === 0,
    };
  }

  // Pattern 7: Contrast (🔄 Tương phản, tương phản, nối tương phản, đối lập)
  const contMatch = line.match(/^(?:(?:[🔄↔️]\s*(?:tương\s*phản)?|tương\s*phản|nối\s*tương\s*phản|đối\s*lập))(?:\s*\(([^)]+)\))?[:：\s]*(.*)$/iu);
  if (contMatch) {
    const remaining = contMatch[2]?.trim() || '';
    return {
      type: 'contrast',
      badge: '🔄 Tương phản',
      badgeClass: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      remainingText: remaining,
      isPureLabel: remaining.length === 0,
    };
  }

  // Pattern 8: Link (🔗 Liên kết, liên kết, nối thuận)
  const linkMatch = line.match(/^(?:(?:[🔗]\s*(?:liên\s*kết)?|nối\s*thuận|liên\s*kết|kết\s*nối))(?:\s*\(([^)]+)\))?[:：\s]*(.*)$/iu);
  if (linkMatch) {
    const remaining = linkMatch[2]?.trim() || '';
    return {
      type: 'link',
      badge: '🔗 Liên kết',
      badgeClass: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      remainingText: remaining,
      isPureLabel: remaining.length === 0,
    };
  }

  // Pattern 9: Note (💡 Lưu ý, lưu ý, chú ý, đặc biệt, ※)
  const noteMatch = line.match(/^(?:(?:[💡※⭐★]\s*(?:lưu\s*ý|chú\s*ý|đặc\s*biệt)?|lưu\s*ý|chú\s*ý|đặc\s*biệt))(?:\s*\(([^)]+)\))?[:：\s]*(.*)$/iu);
  if (noteMatch) {
    const remaining = noteMatch[2]?.trim() || '';
    return {
      type: 'note',
      badge: line.toLowerCase().includes('đặc biệt') ? '⭐ Đặc biệt' : '💡 Lưu ý',
      badgeClass: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      remainingText: remaining,
      isPureLabel: remaining.length === 0,
    };
  }

  // Pattern 10: Grouped bullet (・Động từ: ..., ・Nhóm I: ...)
  const grpMatch = line.match(/^[・*•\-]\s*([^:：]+)[:：]\s*(.*)$/u);
  if (grpMatch) {
    const groupName = grpMatch[1].trim();
    const remaining = grpMatch[2].trim();
    return {
      type: 'group',
      badge: `🔹 ${groupName}`,
      badgeClass: 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      remainingText: remaining,
      isPureLabel: remaining.length === 0,
    };
  }

  // Pattern 11: Explicit fallback for lines that contain answer keywords
  if (/(?:^|\s)(?:trả\s*lời|câu\s*trả\s*lời|đáp)[:：]\s*(.*)$/iu.test(line)) {
    const clean = line.replace(/^(?:.*?)(?:trả\s*lời|câu\s*trả\s*lời|đáp)[:：]\s*/iu, '').trim();
    return {
      type: 'answer',
      badge: '💬 Trả lời',
      badgeClass: 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      remainingText: clean,
      isPureLabel: clean.length === 0,
    };
  }

  return null;
};

const parseStructureLines = (raw: string): ParsedStructureLine[] => {
  if (!raw) return [];
  // Normalize newlines even if someone entered it in a single line with （？）/（＋）/（－）/（＝）
  const normalized = raw.replace(/\s*([（(][？?＋+\-－＝=][）)])/g, '\n$1');
  const rawLines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);

  const result: ParsedStructureLine[] = [];
  let pendingLabel: { type: ParsedStructureLine['type']; badge: string; badgeClass: string } | null = null;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const match = matchStructureLabel(line);

    if (match) {
      if (match.isPureLabel) {
        // The line is just a label header like "❓ Câu hỏi", "trả lời", "✅ Khẳng định"
        // Wait for the next line to take this badge!
        pendingLabel = {
          type: match.type,
          badge: match.badge,
          badgeClass: match.badgeClass,
        };
        continue;
      } else {
        // The line has label AND content on the same line
        pendingLabel = null;
        result.push({
          type: match.type,
          badge: match.badge,
          badgeClass: match.badgeClass,
          text: match.remainingText,
        });
        continue;
      }
    }

    // It's a content line
    if (pendingLabel) {
      result.push({
        type: pendingLabel.type,
        badge: pendingLabel.badge,
        badgeClass: pendingLabel.badgeClass,
        text: line,
      });
      pendingLabel = null;
      continue;
    }

    // Auto-detect question by typical Japanese question endings
    if (
      line.endsWith('ですか。') ||
      line.endsWith('ですか') ||
      line.endsWith('ですか？') ||
      line.endsWith('か。') ||
      line.endsWith('か？')
    ) {
      const cleanText = line.replace(/^(?:(?:[❓?？]\s*(?:câu\s*hỏi|hỏi|nghi\s*vấn)?|câu\s*hỏi|nghi\s*vấn|hỏi|[（(][？?][）)])[:：\s]*)/iu, '').trim();
      result.push({
        type: 'question',
        badge: '❓ Câu hỏi',
        badgeClass: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        text: cleanText || line,
      });
      continue;
    }

    // Auto-detect answer if previous line was a question and current line ends with です or contains answer patterns
    const prevWasQuestion = result.length > 0 && result[result.length - 1].type === 'question';
    if (
      prevWasQuestion ||
      /^(?:danh từ|đại từ|lượng\s*thời\s*gian|thời\s*gian|số\s*từ|tính\s*từ|\[lượng)/i.test(line) ||
      /(?:trả\s*lời|câu\s*trả\s*lời|đáp)/i.test(line)
    ) {
      const cleanText = line.replace(/^(?:(?:[💬💭🗨🗯🗣=＝→]|->)\s*(?:trả\s*lời|câu\s*trả\s*lời|đáp|câu\s*đáp)?|trả\s*lời|câu\s*trả\s*lời|đáp|câu\s*đáp|[（(][＝=→\->][）)])[:：\s]*/iu, '').trim();
      result.push({
        type: 'answer',
        badge: '💬 Trả lời',
        badgeClass: 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        text: cleanText || line,
      });
      continue;
    }

    // Default general structure line
    result.push({
      type: 'formula',
      badge: '📌 Cấu trúc',
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      text: line,
    });
  }

  // If there's a trailing label with no following line
  if (pendingLabel) {
    result.push({
      type: pendingLabel.type,
      badge: pendingLabel.badge,
      badgeClass: pendingLabel.badgeClass,
      text: '',
    });
  }

  return result;
};

interface Props {
  grammarPoints: JapaneseGrammarPoint[];
  onUpdateGrammarPoints: (updated: JapaneseGrammarPoint[]) => void;
  /** Điều khiển bộ lọc Bài 4–7 từ thanh bên trái của khóa học */
  lessonFilter?: string;
  onLessonFilterChange?: (v: string) => void;
}

export const JapaneseGrammarSection: React.FC<Props> = ({
  grammarPoints,
  onUpdateGrammarPoints,
  lessonFilter,
  onLessonFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localFilter, setLocalFilter] = useState<string>('ALL');
  const selectedLessonFilter = lessonFilter ?? localFilter;
  const setSelectedLessonFilter = (v: string) => (onLessonFilterChange ? onLessonFilterChange(v) : setLocalFilter(v));
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPoint, setEditingPoint] = useState<JapaneseGrammarPoint | null>(null);
  const [pointToDelete, setPointToDelete] = useState<JapaneseGrammarPoint | null>(null);

  // Preview file modal
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    structure: '',
    meaning: '',
    explanation: '',
    lessonTag: 'Bài 4',
    examples: [{ japanese: '', reading: '', vietnamese: '' }] as { japanese: string; reading?: string; vietnamese: string }[],
    attachedFiles: [] as AttachedFile[],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Filter
  const filtered = grammarPoints.filter((gp) => {
    if (selectedLessonFilter !== 'ALL') {
      if (gp.lessonTag !== selectedLessonFilter) return false;
    }
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      gp.title.toLowerCase().includes(q) ||
      gp.structure.toLowerCase().includes(q) ||
      gp.meaning.toLowerCase().includes(q) ||
      (gp.lessonTag && gp.lessonTag.toLowerCase().includes(q)) ||
      (gp.explanation && gp.explanation.toLowerCase().includes(q))
    );
  });

  const openAddModal = () => {
    setFormData({
      title: '',
      structure: '',
      meaning: '',
      explanation: '',
      lessonTag: selectedLessonFilter !== 'ALL' ? selectedLessonFilter : 'Bài 4',
      examples: [{ japanese: '', reading: '', vietnamese: '' }],
      attachedFiles: [],
    });
    setEditingPoint(null);
    setIsAdding(true);
  };

  const openEditModal = (gp: JapaneseGrammarPoint) => {
    setFormData({
      title: gp.title,
      structure: gp.structure,
      meaning: gp.meaning,
      explanation: gp.explanation || '',
      lessonTag: gp.lessonTag || 'Bài 4',
      examples:
        gp.examples && gp.examples.length > 0
          ? gp.examples
          : [{ japanese: '', reading: '', vietnamese: '' }],
      attachedFiles: gp.attachedFiles || [],
    });
    setEditingPoint(gp);
    setIsAdding(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newFiles: AttachedFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Read file data
        const dataUrl = await readFileAsDataUrl(file);
        newFiles.push({
          id: `file-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          uploadedAt: new Date().toISOString(),
          dataUrl,
        });
      }
      setFormData((prev) => ({
        ...prev,
        attachedFiles: [...prev.attachedFiles, ...newFiles],
      }));
      sound.playCorrect();
    } catch (err) {
      console.error('Lỗi khi đọc file đính kèm:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Direct quick upload into an existing grammar point without opening modal
  const handleDirectAttach = async (pointId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const newFiles: AttachedFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await readFileAsDataUrl(file);
        newFiles.push({
          id: `file-${Date.now()}-${i}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          uploadedAt: new Date().toISOString(),
          dataUrl,
        });
      }

      const updated = grammarPoints.map((gp) =>
        gp.id === pointId
          ? {
              ...gp,
              attachedFiles: [...(gp.attachedFiles || []), ...newFiles],
              isCustom: true,
              updatedAt: new Date().toISOString(),
            }
          : gp
      );
      onUpdateGrammarPoints(updated);
      sound.playCorrect();
    } catch (err) {
      console.error('Lỗi khi đính kèm file:', err);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setFormData((prev) => ({
      ...prev,
      attachedFiles: prev.attachedFiles.filter((f) => f.id !== fileId),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.structure.trim()) return;

    const cleanExamples = formData.examples.filter(
      (ex) => ex.japanese.trim() || ex.vietnamese.trim()
    );

    if (editingPoint) {
      const updated = grammarPoints.map((gp) =>
        gp.id === editingPoint.id
          ? {
              ...gp,
              title: formData.title.trim(),
              structure: formData.structure.trim(),
              meaning: formData.meaning.trim(),
              explanation: formData.explanation.trim(),
              lessonTag: formData.lessonTag.trim() || undefined,
              examples: cleanExamples,
              attachedFiles: formData.attachedFiles,
              isCustom: true,
              updatedAt: new Date().toISOString(),
            }
          : gp
      );
      onUpdateGrammarPoints(updated);
    } else {
      const newPoint: JapaneseGrammarPoint = {
        id: `grammar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: formData.title.trim(),
        structure: formData.structure.trim(),
        meaning: formData.meaning.trim(),
        explanation: formData.explanation.trim(),
        lessonTag: formData.lessonTag.trim() || undefined,
        examples: cleanExamples,
        attachedFiles: formData.attachedFiles,
        isCustom: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onUpdateGrammarPoints([newPoint, ...grammarPoints]);
    }

    setIsAdding(false);
    setEditingPoint(null);
    sound.playClick();
  };

  const handleDeleteConfirm = () => {
    if (!pointToDelete) return;
    const updated = grammarPoints.filter((gp) => gp.id !== pointToDelete.id);
    onUpdateGrammarPoints(updated);
    setPointToDelete(null);
    sound.playClick();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleSyncDefaultGrammar = () => {
    const customUserPoints = grammarPoints.filter((gp) => !gp.id.startsWith('g-b'));
    const updatedDefaults = JPD123_GRAMMAR_POINTS.map((defGp) => {
      const existing = grammarPoints.find((gp) => gp.id === defGp.id);
      return {
        ...defGp,
        attachedFiles: existing?.attachedFiles?.length ? existing.attachedFiles : defGp.attachedFiles,
      };
    });
    const combined = [...updatedDefaults, ...customUserPoints];
    onUpdateGrammarPoints(combined);
    sound.playCorrect();
    setSyncNotice('Đã đồng bộ 28 cấu trúc chuẩn JPD123 (Bài 4, 5, 6, 7) thành công!');
    setTimeout(() => setSyncNotice(null), 3500);
  };

  // Practice session state
  const [practiceSession, setPracticeSession] = useState<{
    title: string;
    grammarPointTitle?: string;
    examples: { japanese: string; reading?: string; vietnamese: string; grammarTitle?: string; lessonTag?: string }[];
  } | null>(null);

  const handleStartPracticePoint = (gp: JapaneseGrammarPoint) => {
    if (!gp.examples || gp.examples.length === 0) {
      alert('Cấu trúc này chưa có câu ví dụ để luyện tập.');
      return;
    }
    sound.playClick();
    setPracticeSession({
      title: `Luyện tập: ${gp.title}`,
      grammarPointTitle: gp.title,
      examples: gp.examples.map((ex) => ({
        ...ex,
        grammarTitle: gp.title,
        lessonTag: gp.lessonTag,
      })),
    });
  };

  const handleStartPracticeBatch = () => {
    const targetPoints = selectedLessonFilter === 'ALL'
      ? grammarPoints
      : grammarPoints.filter((g) => g.lessonTag === selectedLessonFilter);

    const allExamples: { japanese: string; reading?: string; vietnamese: string; grammarTitle?: string; lessonTag?: string }[] = [];
    for (const gp of targetPoints) {
      if (gp.examples) {
        for (const ex of gp.examples) {
          allExamples.push({
            ...ex,
            grammarTitle: gp.title,
            lessonTag: gp.lessonTag,
          });
        }
      }
    }

    if (allExamples.length === 0) {
      alert('Không có câu ví dụ nào để luyện tập.');
      return;
    }

    sound.playClick();
    setPracticeSession({
      title: selectedLessonFilter === 'ALL' ? 'Luyện tập: Tất cả ngữ pháp' : `Luyện tập: Ngữ pháp ${selectedLessonFilter}`,
      grammarPointTitle: selectedLessonFilter === 'ALL' ? 'Tất cả ngữ pháp' : selectedLessonFilter,
      examples: allExamples,
    });
  };

  // AI Grammar Assistant state
  const [aiGrammarPoint, setAiGrammarPoint] = useState<JapaneseGrammarPoint | null>(null);

  const handleOpenAiGrammar = (gp: JapaneseGrammarPoint) => {
    sound.playClick();
    setAiGrammarPoint(gp);
  };

  if (practiceSession) {
    return (
      <JapaneseGrammarPracticeMode
        title={practiceSession.title}
        grammarPointTitle={practiceSession.grammarPointTitle}
        examples={practiceSession.examples}
        onExit={() => setPracticeSession(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        tone="indigo"
        icon={<span className="font-japanese">文</span>}
        eyebrow="Mục 3 · Ngữ pháp"
        title="Mẫu câu & tài liệu đính kèm"
        desc={`${grammarPoints.length} chủ điểm ngữ pháp kèm ví dụ song ngữ. Có thể đính kèm PDF, Word, hình ảnh, slide để ôn bất cứ lúc nào.`}
        actions={
          <>
            <ToneButton tone="indigo" variant="ghost" onClick={handleSyncDefaultGrammar} title="Đồng bộ lại toàn bộ mẫu ngữ pháp chuẩn theo cấu trúc mới nhất">
              <RefreshCw className="w-4 h-4 text-indigo-500" /> Đồng bộ mẫu chuẩn
            </ToneButton>
            <ToneButton tone="indigo" onClick={openAddModal}>
              <Plus className="w-4 h-4" /> Thêm mục ngữ pháp
            </ToneButton>
          </>
        }
      />

      {syncNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===== Thanh công cụ: tìm kiếm + luyện gõ ===== */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm mẫu câu, cấu trúc, ý nghĩa…"
            className="w-full pl-11 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <ToneButton
          tone="indigo"
          variant="ghost"
          onClick={handleStartPracticeBatch}
          title={`Luyện gõ các câu ví dụ ngữ pháp (${selectedLessonFilter === 'ALL' ? 'Tất cả' : selectedLessonFilter})`}
        >
          <Keyboard className="w-4 h-4 text-indigo-500" />
          Luyện gõ {selectedLessonFilter === 'ALL' ? 'tất cả' : selectedLessonFilter}
        </ToneButton>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 space-y-4">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
              {searchTerm ? 'Không tìm thấy ngữ pháp phù hợp' : 'Chưa có ngữ pháp nào'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Bấm nút bên dưới để tạo chủ điểm ngữ pháp và đính kèm tài liệu.
            </p>
          </div>
          <ToneButton tone="indigo" onClick={openAddModal}>
            <Plus className="w-4 h-4" /> Thêm mục ngữ pháp đầu tiên
          </ToneButton>
        </div>
      ) : (
        (() => {
          const gp = filtered.find((g) => g.id === selectedPointId) || filtered[0];
          const curIdx = filtered.indexOf(gp);
          const hasFiles = gp.attachedFiles && gp.attachedFiles.length > 0;
          const shortTitle = (t: string) => t.replace(/^\d+\.\s*/, '');
          const pick = (id: string) => {
            setSelectedPointId(id);
            sound.playClick();
            if (window.innerWidth < 1024) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
          };
          return (
            <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
              {/* ----- Mục lục mẫu câu ----- */}
              <div className="lg:sticky lg:top-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 max-h-[70vh] lg:max-h-[calc(100vh-3rem)] overflow-y-auto">
                <div className="px-3 pt-2 pb-2 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Mục lục</span>
                  <span className="text-[11px] font-bold text-slate-400">{filtered.length} mẫu</span>
                </div>
                {filtered.map((g, i) => {
                  const active = g.id === gp.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => pick(g.id)}
                      className={`w-full flex items-start gap-3 p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 ${
                          active ? 'bg-white/20' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold leading-snug line-clamp-2">{shortTitle(g.title)}</span>
                        <span className={`block text-[11px] font-semibold mt-0.5 ${active ? 'text-white/70' : 'text-slate-400'}`}>
                          {g.lessonTag || '—'} · {g.examples?.length || 0} ví dụ
                          {g.attachedFiles && g.attachedFiles.length > 0 ? ` · ${g.attachedFiles.length} file` : ''}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ----- Chi tiết mẫu câu đang chọn ----- */}
              <article
                ref={detailRef}
                className="scroll-mt-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <div className="p-5 sm:p-6 bg-linear-to-br from-indigo-500/10 via-transparent to-transparent border-b border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-indigo-500">
                    <span>Mẫu {curIdx + 1}/{filtered.length}</span>
                    {gp.lessonTag && <span className="px-2 py-0.5 rounded-md bg-indigo-500/10">{gp.lessonTag}</span>}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">{shortTitle(gp.title)}</h3>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400 font-black text-[11px] uppercase tracking-wider mr-2">Ý nghĩa</span>
                    {gp.meaning}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <ToneButton tone="indigo" onClick={() => handleStartPracticePoint(gp)}>
                      <Keyboard className="w-4 h-4" /> Luyện tập{gp.examples?.length ? ` (${gp.examples.length})` : ''}
                    </ToneButton>
                    <button
                      type="button"
                      onClick={() => handleOpenAiGrammar(gp)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 text-xs font-black cursor-pointer hover:bg-purple-500/20"
                    >
                      <Sparkles className="w-4 h-4" /> Hỏi đáp AI
                    </button>
                    <span className="flex-1" />
                    <button
                      type="button"
                      onClick={() => openEditModal(gp)}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Chỉnh sửa ngữ pháp"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPointToDelete(gp)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                      title="Xóa ngữ pháp"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-6">
                  {/* Cấu trúc */}
                  <section className="space-y-2">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Cấu trúc</h4>
                    <div className="rounded-2xl bg-slate-950 dark:bg-slate-950 border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
                      {parseStructureLines(gp.structure).map((line, lIdx) => (
                        <div key={lIdx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black shrink-0 inline-flex items-center gap-1 border self-start sm:self-center sm:min-w-[104px] justify-center ${line.badgeClass}`}
                          >
                            {line.badge}
                          </span>
                          <span className="font-japanese font-bold text-sm sm:text-base text-slate-100 leading-relaxed break-words select-all">
                            {line.text}
                          </span>
                        </div>
                      ))}
                    </div>
                    {gp.explanation && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200/70 dark:border-amber-500/20">
                        <b className="text-amber-600 dark:text-amber-400">Ghi chú: </b>
                        {gp.explanation}
                      </p>
                    )}
                  </section>

                  {/* Ví dụ */}
                  {gp.examples && gp.examples.length > 0 && (
                    <section className="space-y-2">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        Ví dụ ({gp.examples.length})
                      </h4>
                      <ol className="space-y-2">
                        {gp.examples.map((ex, idx) => {
                          const isDialogue = /(^|\s)A[：:]/.test(ex.japanese) && /\/\s*B[：:]/.test(ex.japanese);
                          const parts = isDialogue ? ex.japanese.split(/\s*\/\s*(?=B[：:])/) : [ex.japanese];
                          return (
                            <li
                              key={idx}
                              className="flex gap-3 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors"
                            >
                              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0 space-y-1">
                                {parts.map((p, pIdx) => {
                                  const speaker = isDialogue ? (p.trim().startsWith('A') ? 'A' : 'B') : null;
                                  const clean = isDialogue ? p.replace(/^\s*[AB][：:]\s*/, '') : p;
                                  return (
                                    <div key={pIdx} className="flex items-start gap-2">
                                      {speaker && (
                                        <span
                                          className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 text-white ${
                                            speaker === 'A' ? 'bg-indigo-500' : 'bg-emerald-500'
                                          }`}
                                        >
                                          {speaker}
                                        </span>
                                      )}
                                      <span className="flex-1 font-japanese font-bold text-slate-900 dark:text-white text-sm sm:text-[15px] leading-relaxed">
                                        {clean}
                                        {!isDialogue && ex.reading && (
                                          <span className="ml-2 text-indigo-500 font-medium text-xs">({ex.reading})</span>
                                        )}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => speakJapanese(clean)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                                        title="Nghe phát âm"
                                      >
                                        <Volume2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  );
                                })}
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{ex.vietnamese}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  )}

                  {/* Tài liệu */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" /> Tài liệu đính kèm ({gp.attachedFiles?.length || 0})
                      </h4>
                      <label className="text-xs font-bold text-indigo-500 hover:underline cursor-pointer inline-flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5" /> Thêm file
                        <input type="file" multiple className="hidden" onChange={(e) => handleDirectAttach(gp.id, e)} />
                      </label>
                    </div>
                    {hasFiles ? (
                      <div className="grid sm:grid-cols-2 gap-2">
                        {gp.attachedFiles?.map((file) => (
                          <div
                            key={file.id}
                            onClick={() => {
                              if (file.dataUrl) {
                                setPreviewFile(file);
                                sound.playClick();
                              }
                            }}
                            className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/40 cursor-pointer transition-all"
                            title="Bấm để xem file"
                          >
                            <span className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={file.name}>
                                {file.name}
                              </span>
                              <span className="block text-[11px] text-slate-400">{formatFileSize(file.size)}</span>
                            </span>
                            {file.dataUrl && (
                              <span className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewFile(file);
                                    sound.playClick();
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 cursor-pointer"
                                  title="Xem file"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <a
                                  href={file.dataUrl}
                                  download={file.name}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500"
                                  title="Tải về máy"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic p-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        Chưa có tài liệu. Bấm “Thêm file” để đính kèm PDF, Word, hình ảnh hoặc slide.
                      </p>
                    )}
                  </section>
                </div>

                {/* Mẫu trước / sau */}
                <div className="flex items-center justify-between gap-2 px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
                  <ToneButton tone="indigo" variant="ghost" disabled={curIdx <= 0} onClick={() => pick(filtered[curIdx - 1].id)}>
                    <ChevronLeft className="w-4 h-4" /> Mẫu trước
                  </ToneButton>
                  <span className="text-xs font-bold text-slate-400">
                    {curIdx + 1} / {filtered.length}
                  </span>
                  <ToneButton
                    tone="indigo"
                    disabled={curIdx >= filtered.length - 1}
                    onClick={() => pick(filtered[curIdx + 1].id)}
                  >
                    Mẫu sau <ChevronRight className="w-4 h-4" />
                  </ToneButton>
                </div>
              </article>
            </div>
          );
        })()
      )}

      {/* MODAL: ADD / EDIT GRAMMAR POINT */}
      {isAdding && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAdding(false);
          }}
        >
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-4 shrink-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-black shrink-0 text-base">
                  📝
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                    {editingPoint ? 'Chỉnh sửa Ngữ pháp' : 'Thêm Ngữ pháp mới'}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    Điền cấu trúc, giải thích và đính kèm file tài liệu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors shrink-0"
                title="Đóng (Hủy)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form with Scrollable Body & Sticky Footer */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Thuộc Bài học *
                    </label>
                    <select
                      value={formData.lessonTag}
                      onChange={(e) => setFormData({ ...formData, lessonTag: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Bài 4">Bài 4 (どこ？・どんなところ？)</option>
                      <option value="Bài 5">Bài 5 (週末・休みの後で)</option>
                      <option value="Bài 6">Bài 6 (一緒に行きませんか)</option>
                      <option value="Bài 7">Bài 7 (道がわかりません)</option>
                      <option value="Bài khác">Bài khác / Mở rộng</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Tên điểm ngữ pháp / Bài học *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="VD: 6. Ở đâu có cái gì? (4.1)..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Cấu trúc ngữ pháp * (Mỗi mẫu một dòng để hiển thị rõ ràng)
                    </label>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            structure: prev.structure
                              ? `${prev.structure}\n✅ Khẳng định: `
                              : '✅ Khẳng định: ',
                          }))
                        }
                        className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold hover:bg-emerald-200 cursor-pointer"
                      >
                        + Khẳng định (✅)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            structure: prev.structure
                              ? `${prev.structure}\n❓ Câu hỏi: `
                              : '❓ Câu hỏi: ',
                          }))
                        }
                        className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold hover:bg-indigo-200 cursor-pointer"
                      >
                        + Câu hỏi (❓)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            structure: prev.structure
                              ? `${prev.structure}\n💬 Trả lời: `
                              : '💬 Trả lời: ',
                          }))
                        }
                        className="px-2 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[10px] font-bold hover:bg-teal-200 cursor-pointer"
                      >
                        + Trả lời (💬)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            structure: prev.structure
                              ? `${prev.structure}\n❌ Phủ định: `
                              : '❌ Phủ định: ',
                          }))
                        }
                        className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold hover:bg-rose-200 cursor-pointer"
                      >
                        + Phủ định (❌)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            structure: prev.structure
                              ? `${prev.structure}\n💡 Lưu ý: `
                              : '💡 Lưu ý: ',
                          }))
                        }
                        className="px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-bold hover:bg-purple-200 cursor-pointer"
                      >
                        + Lưu ý (💡)
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={formData.structure}
                    onChange={(e) => setFormData({ ...formData, structure: e.target.value })}
                    placeholder={'VD 1 (Cùng dòng):\n✅ Khẳng định: A から B まで [Phương tiện で] [Thời gian bao lâu] くらいです。\n❓ Câu hỏi: A から B まで [Phương tiện で] どのくらいですか。\n💬 Trả lời: [Lượng thời gian] です。\n\nVD 2 (Xuống dòng):\n❓ Câu hỏi\nS は どうですか。\n💬 Trả lời\ndanh từ + です\n✅ Khẳng định\n[S は] Aいです。／ Aなです。\n❌ Phủ định\n[S は] Aくないです。／ Aじゃありません。'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Ý nghĩa tiếng Việt *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.meaning}
                    onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                    placeholder="VD: Sau khi làm V1 thì làm V2..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Giải thích chi tiết / Ghi chú
                  </label>
                  <textarea
                    rows={3}
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    placeholder="Giải thích cách dùng, lưu ý khi kết hợp các từ loại..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Nhét file vào đây */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        Nhét file tài liệu vào ngữ pháp này
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{isUploading ? 'Đang đọc...' : 'Chọn file từ máy'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>

                  {formData.attachedFiles.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      {formData.attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-bold truncate">{file.name}</span>
                            <span className="text-[10px] text-slate-400">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.id)}
                            className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                            title="Gỡ file này"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Examples */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                        Câu ví dụ
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Thêm câu ví dụ tiếng Nhật, phiên âm Hiragana và dịch nghĩa tiếng Việt
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          examples: [
                            ...formData.examples,
                            { japanese: '', reading: '', vietnamese: '' },
                          ],
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 cursor-pointer transition-colors"
                    >
                      + Thêm ví dụ
                    </button>
                  </div>

                  {formData.examples.map((ex, idx) => (
                    <div key={idx} className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 relative group">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[11px] font-bold text-slate-500">Ví dụ #{idx + 1}</span>
                        {formData.examples.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const copy = formData.examples.filter((_, i) => i !== idx);
                              setFormData({ ...formData, examples: copy });
                            }}
                            className="text-slate-400 hover:text-rose-500 p-1 text-[11px] font-bold cursor-pointer transition-colors"
                            title="Xóa ví dụ này"
                          >
                            Xóa ví dụ
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={ex.japanese}
                          onChange={(e) => {
                            const copy = [...formData.examples];
                            copy[idx].japanese = e.target.value;
                            setFormData({ ...formData, examples: copy });
                          }}
                          placeholder="Câu tiếng Nhật (VD: 晩ご飯を食べてから...)"
                          className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                        />
                        <input
                          type="text"
                          value={ex.reading}
                          onChange={(e) => {
                            const copy = [...formData.examples];
                            copy[idx].reading = e.target.value;
                            setFormData({ ...formData, examples: copy });
                          }}
                          placeholder="Cách đọc Hiragana (không bắt buộc)"
                          className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        />
                      </div>
                      <input
                        type="text"
                        value={ex.vietnamese}
                        onChange={(e) => {
                          const copy = [...formData.examples];
                          copy[idx].vietnamese = e.target.value;
                          setFormData({ ...formData, examples: copy });
                        }}
                        placeholder="Dịch nghĩa tiếng Việt (VD: Sau khi ăn tối thì...)"
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Sticky Footer: Always visible on screen! */}
              <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 z-10">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Cuộn chuột lên/xuống để xem toàn bộ nội dung</span>
                </div>

                <div className="flex items-center gap-2.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95 transition-all"
                  >
                    {editingPoint ? 'Lưu thay đổi' : 'Lưu ngữ pháp'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW FILE */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white truncate max-w-md">
                  {previewFile.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center min-h-[300px]">
              {previewFile.type.startsWith('image/') && previewFile.dataUrl ? (
                <img
                  src={previewFile.dataUrl}
                  alt={previewFile.name}
                  className="max-h-[60vh] max-w-full object-contain rounded-xl"
                />
              ) : previewFile.type.includes('pdf') && previewFile.dataUrl ? (
                <iframe
                  src={previewFile.dataUrl}
                  title={previewFile.name}
                  className="w-full h-[60vh] rounded-xl border-none"
                />
              ) : (
                <div className="text-center space-y-3 p-6">
                  <File className="w-12 h-12 text-indigo-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    File loại {previewFile.type}. Bạn có thể tải về để mở trên máy tính.
                  </p>
                  {previewFile.dataUrl && (
                    <a
                      href={previewFile.dataUrl}
                      download={previewFile.name}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs inline-flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải file về máy</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {previewFile.dataUrl && (
                <a
                  href={previewFile.dataUrl}
                  download={previewFile.name}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải về</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {pointToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Xóa mục ngữ pháp này?
                </h4>
                <p className="text-xs text-slate-500 truncate max-w-[200px]">
                  {pointToDelete.title}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPointToDelete(null)}
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

      {/* AI GRAMMAR TUTOR MODAL */}
      <JapaneseGrammarAiModal
        grammarPoint={aiGrammarPoint}
        isOpen={!!aiGrammarPoint}
        onClose={() => setAiGrammarPoint(null)}
      />
    </div>
  );
};
