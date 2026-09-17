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
} from 'lucide-react';
import { JapaneseGrammarPoint, AttachedFile } from '../../types/japanese';
import { JPD123_GRAMMAR_POINTS } from '../../data/jpd123Grammar';
import { readFileAsDataUrl } from '../../utils/japaneseStorage';
import { sound } from '../../utils/audio';
import { speakJapanese } from '../../utils/japaneseKana';
import { JapaneseGrammarPracticeMode } from './JapaneseGrammarPracticeMode';

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
}

export const JapaneseGrammarSection: React.FC<Props> = ({
  grammarPoints,
  onUpdateGrammarPoints,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState<string>('ALL');
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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-extrabold text-[11px]">
              📝 NGỮ PHÁP / 文法
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              {grammarPoints.length} chủ điểm ngữ pháp
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Tổng hợp Ngữ Pháp & Tài liệu đính kèm
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bạn có thể ghi chép cấu trúc ngữ pháp và <strong>nhét các file tài liệu</strong> (PDF, Word, hình ảnh, slide) vào đây để ôn luyện bất cứ lúc nào.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSyncDefaultGrammar}
            title="Đồng bộ lại toàn bộ mẫu ngữ pháp chuẩn theo cấu trúc mới nhất"
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <RefreshCw className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">Đồng bộ mẫu chuẩn</span>
            <span className="sm:hidden">Đồng bộ</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-black shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm mục ngữ pháp</span>
          </button>
        </div>
      </div>

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

      {/* Filter and Search */}
      <div className="space-y-3">
        {/* Lesson Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'Tất cả bài', count: grammarPoints.length },
            { id: 'Bài 4', label: 'Bài 4', count: grammarPoints.filter((g) => g.lessonTag === 'Bài 4').length },
            { id: 'Bài 5', label: 'Bài 5', count: grammarPoints.filter((g) => g.lessonTag === 'Bài 5').length },
            { id: 'Bài 6', label: 'Bài 6', count: grammarPoints.filter((g) => g.lessonTag === 'Bài 6').length },
            { id: 'Bài 7', label: 'Bài 7', count: grammarPoints.filter((g) => g.lessonTag === 'Bài 7').length },
          ].map((tab) => {
            const isSelected = selectedLessonFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedLessonFilter(tab.id);
                  sound.playClick();
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected
                      ? 'bg-indigo-700/80 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm mẫu câu, cấu trúc, ý nghĩa ngữ pháp..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-xs"
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
      </div>

      {/* List of Grammar Points */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
              {searchTerm ? 'Không tìm thấy ngữ pháp phù hợp' : 'Chưa có ngữ pháp nào'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Hãy bấm nút bên dưới để tạo chủ điểm ngữ pháp và nhét các file tài liệu ghi nhớ vào đây.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs inline-flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm mục ngữ pháp đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((gp) => {
            const hasFiles = gp.attachedFiles && gp.attachedFiles.length > 0;
            return (
              <div
                key={gp.id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900/80 shadow-xs hover:shadow-md transition-all space-y-4 group"
              >
                {/* Header of card */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {gp.title}
                      </h3>
                      {gp.lessonTag && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/90 text-indigo-700 dark:text-indigo-300 font-extrabold text-[11px] border border-indigo-200/60 dark:border-indigo-800">
                          {gp.lessonTag}
                        </span>
                      )}
                    </div>
                    {/* Structured Formula Lines with Badges */}
                    <div className="space-y-2 pt-1.5">
                      {parseStructureLines(gp.structure).map((line, lIdx) => (
                        <div
                          key={lIdx}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-800 shadow-2xs"
                        >
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-black tracking-wide shrink-0 inline-flex items-center gap-1.5 border shadow-2xs ${line.badgeClass}`}
                          >
                            {line.badge}
                          </span>
                          <span className="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed select-all">
                            {line.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartPracticePoint(gp)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-300 hover:text-white border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 group/btn"
                      title={`Luyện gõ ${gp.examples?.length || 0} câu ví dụ của cấu trúc này`}
                    >
                      <Keyboard className="w-3.5 h-3.5 text-indigo-500 group-hover/btn:text-white" />
                      <span>Luyện tập</span>
                      {gp.examples && gp.examples.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-md bg-indigo-200/80 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-[10px] font-black group-hover/btn:bg-white/20 group-hover/btn:text-white">
                          {gp.examples.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(gp)}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Chỉnh sửa ngữ pháp"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPointToDelete(gp)}
                      className="p-2 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                      title="Xóa ngữ pháp"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Meaning & Explanation */}
                <div className="text-xs sm:text-sm space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Ý nghĩa:
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {gp.meaning}
                    </span>
                  </div>
                  {gp.explanation && (
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                      {gp.explanation}
                    </p>
                  )}
                </div>

                {/* Examples */}
                {gp.examples && gp.examples.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                        Ví dụ minh họa ({gp.examples.length}):
                      </span>
                    </div>
                    <div className="space-y-2">
                      {gp.examples.map((ex, idx) => {
                        const isDialogue =
                          ex.japanese.includes('A：') ||
                          ex.japanese.includes('A:') ||
                          ex.japanese.includes('/ B：') ||
                          ex.japanese.includes('/ B:');

                        if (isDialogue) {
                          const parts = ex.japanese.split(/\s*\/\s*(?=B[：:])/);
                          return (
                            <div
                              key={idx}
                              className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-2"
                            >
                              <div className="space-y-1.5">
                                {parts.map((p, pIdx) => {
                                  const speaker = p.startsWith('A') ? 'A' : 'B';
                                  const cleanP = p.replace(/^[AB][：:]\s*/, '');
                                  return (
                                    <div key={pIdx} className="flex items-start gap-2">
                                      <span
                                        className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5 ${
                                          speaker === 'A'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-emerald-600 text-white'
                                        }`}
                                      >
                                        {speaker}
                                      </span>
                                      <div className="flex-1 flex items-center justify-between gap-2">
                                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                          {cleanP}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => speakJapanese(cleanP)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                                          title="Nghe phát âm"
                                        >
                                          <Volume2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 pl-7 text-[11px] sm:text-xs">
                                → {ex.vietnamese}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                                <span>{ex.japanese}</span>
                                {ex.reading && (
                                  <span className="text-indigo-500 font-medium text-xs">
                                    ({ex.reading})
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">
                                → {ex.vietnamese}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => speakJapanese(ex.japanese)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                              title="Nghe phát âm"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ATTACHED FILES SECTION ("nhét file vào đó") */}
                <div className="pt-3 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                        File đính kèm ({gp.attachedFiles?.length || 0})
                      </span>
                    </div>

                    {/* Quick attach button */}
                    <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer inline-flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>+ Nhét thêm file</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleDirectAttach(gp.id, e)}
                      />
                    </label>
                  </div>

                  {hasFiles ? (
                    <div className="flex flex-wrap gap-2">
                      {gp.attachedFiles?.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => {
                            if (file.dataUrl) {
                              setPreviewFile(file);
                              sound.playClick();
                            }
                          }}
                          className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-xs text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/50 cursor-pointer transition-all"
                          title="Bấm để xem file"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-bold truncate max-w-[180px]" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({formatFileSize(file.size)})
                          </span>

                          <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                            {file.dataUrl && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewFile(file);
                                    sound.playClick();
                                  }}
                                  className="p-1 rounded-md text-slate-500 hover:text-indigo-600 cursor-pointer"
                                  title="Xem file"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={file.dataUrl}
                                  download={file.name}
                                  className="p-1 rounded-md text-slate-500 hover:text-indigo-600 cursor-pointer"
                                  title="Tải về máy"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Chưa có file nào được đính kèm. Bạn có thể bấm &quot;+ Nhét thêm file&quot; để tải tài liệu lên.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
    </div>
  );
};
