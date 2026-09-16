import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Plus,
  ArrowRight,
  BookOpen,
  Layers,
  FileText,
  Trash2,
  Edit3,
  Search,
  Sparkles,
  X,
  ShieldCheck,
} from 'lucide-react';
import { JapaneseCourse } from '../types/japanese';
import {
  getJapaneseCourses,
  saveJapaneseCourse,
  deleteJapaneseCourse,
  isJapaneseAdmin,
  saveJapaneseCourses,
  canAccessJpd123,
} from '../utils/japaneseStorage';
import { subscribeJapaneseCourses } from '../lib/firebase';
import { JapaneseCourseDetail } from './JapaneseCourseDetail';
import { sound } from '../utils/audio';

interface Props {
  currentUser?: { email: string; name: string } | null;
  onBackToDashboard?: () => void;
}

export const JapaneseLearningPage: React.FC<Props> = ({ currentUser, onBackToDashboard }) => {
  const [courses, setCourses] = useState<JapaneseCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<JapaneseCourse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Course Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<JapaneseCourse | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<JapaneseCourse | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    level: 'N5' as JapaneseCourse['level'],
  });

  const isAdmin = isJapaneseAdmin(currentUser?.email);
  const hasJpdAccess = canAccessJpd123(currentUser?.email);

  useEffect(() => {
    const list = getJapaneseCourses(currentUser?.email);
    setCourses(list);
    // If admin or delegated user and there is 1 course (e.g. JPD 123), automatically open it for convenience
    if (hasJpdAccess && list.length === 1 && !selectedCourse) {
      setSelectedCourse(list[0]);
    } else if (!hasJpdAccess) {
      // For non-authorized user, if they had JPD 123 open previously, close it
      if (selectedCourse?.id === 'course-jpd123') {
        setSelectedCourse(null);
      }
    }

    // Subscribe to Firestore for real-time synchronization between phones, tablets, and computers
    const unSub = subscribeJapaneseCourses((cloudCourses) => {
      if (Array.isArray(cloudCourses)) {
        // Filter out JPD123 for users without access
        let allowed = cloudCourses;
        if (!hasJpdAccess) {
          allowed = cloudCourses.filter(
            (c) => c && c.id !== 'course-jpd123' && c.code?.toLowerCase().replace(/\s+/g, '') !== 'jpd123'
          );
        }
        setCourses(allowed);
        saveJapaneseCourses(allowed, currentUser?.email, true);
        setSelectedCourse((prev) => {
          if (!prev) return (hasJpdAccess && allowed.length === 1 ? allowed[0] : null);
          const updated = allowed.find((c) => c.id === prev.id);
          return updated || null;
        });
      }
    });

    return () => {
      if (unSub) unSub();
    };
  }, [currentUser?.email, isAdmin, hasJpdAccess]);

  const refreshCourses = () => {
    const list = getJapaneseCourses(currentUser?.email);
    setCourses(list);
    if (selectedCourse) {
      const updated = list.find((c) => c.id === selectedCourse.id);
      setSelectedCourse(updated || null);
    }
  };

  const handleOpenCourse = (course: JapaneseCourse) => {
    setSelectedCourse(course);
    sound.playClick();
  };

  const handleUpdateCourse = (updatedCourse: JapaneseCourse) => {
    const updatedList = saveJapaneseCourse(updatedCourse, currentUser?.email);
    setCourses(updatedList);
    setSelectedCourse(updatedCourse);
  };

  const openCreateModal = () => {
    setFormData({
      code: '',
      title: '',
      description: '',
      level: 'N5',
    });
    setEditingCourse(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: JapaneseCourse, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormData({
      code: c.code,
      title: c.title,
      description: c.description,
      level: c.level || 'N5',
    });
    setEditingCourse(c);
    setIsModalOpen(true);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.title.trim()) return;

    if (editingCourse) {
      const updated: JapaneseCourse = {
        ...editingCourse,
        code: formData.code.trim().toUpperCase(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        level: formData.level,
        updatedAt: new Date().toISOString(),
      };
      saveJapaneseCourse(updated, currentUser?.email);
      if (selectedCourse?.id === updated.id) {
        setSelectedCourse(updated);
      }
    } else {
      const newCourse: JapaneseCourse = {
        id: `course-${Date.now()}`,
        code: formData.code.trim().toUpperCase(),
        title: formData.title.trim(),
        description: formData.description.trim() || `Khóa học ${formData.code.toUpperCase()}`,
        level: formData.level,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lessons: [],
        kanjiList: [],
        grammarPoints: [],
        materials: [],
      };
      saveJapaneseCourse(newCourse, currentUser?.email);
      setSelectedCourse(newCourse);
    }

    refreshCourses();
    setIsModalOpen(false);
    setEditingCourse(null);
    sound.playClick();
  };

  const handleDeleteCourseConfirm = () => {
    if (!courseToDelete) return;
    const updated = deleteJapaneseCourse(courseToDelete.id, currentUser?.email);
    setCourses(updated);
    if (selectedCourse?.id === courseToDelete.id) {
      setSelectedCourse(null);
    }
    setCourseToDelete(null);
    sound.playClick();
  };

  // If a course is selected, show its detail view
  if (selectedCourse) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <JapaneseCourseDetail
          course={selectedCourse}
          onBackToCourses={() => setSelectedCourse(null)}
          onUpdateCourse={handleUpdateCourse}
        />
      </div>
    );
  }

  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-400">
              <Sparkles className="w-4 h-4" />
              <span>Hệ thống Quản lý Khóa học Tiếng Nhật</span>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Khóa Học Tiếng Nhật
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Mỗi khóa học tổng hợp gồm 4 khu vực chính:{' '}
              <strong className="text-orange-400">1. Từ vựng</strong> (các bài học kèm Flashcard, Gõ, Trắc nghiệm),{' '}
              <strong className="text-rose-400">2. Chữ Hán</strong> (Kanji & âm Hán Việt),{' '}
              <strong className="text-indigo-400">3. Ngữ pháp</strong> (cấu trúc & nhét file tài liệu), và{' '}
              <strong className="text-emerald-400">4. Tài liệu học tập</strong> (upload file giáo trình, PDF, slide).
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-3 rounded-2xl bg-linear-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-500/30 flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo File Tổng / Khóa Học Mới</span>
          </button>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            DANH SÁCH KHÓA HỌC / FILE TỔNG
          </span>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Danh sách khóa học
          </h2>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã, tên khóa học..."
            className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
          />
        </div>
      </div>

      {/* Courses List / Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
              {searchQuery ? 'Không tìm thấy khóa học phù hợp' : 'Chưa có khóa học nào'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'Thử tìm kiếm với từ khóa khác.'
                : 'Danh sách khóa học của bạn đang trống trơn. Bấm nút tạo khóa học mới để bắt đầu.'}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-6 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs inline-flex items-center gap-2 cursor-pointer shadow-md shadow-orange-500/30"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo khóa học mới</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((c) => (
            <div
              key={c.id}
              onClick={() => handleOpenCourse(c)}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-5 group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-orange-500/20 shrink-0">
                      🇯🇵
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 font-extrabold text-[11px]">
                        {c.code || 'JPD 123'}
                      </span>
                      <h3 className="text-base font-black text-slate-900 dark:text-white mt-1 group-hover:text-orange-500 transition-colors">
                        {c.title}
                      </h3>
                    </div>
                  </div>

                  {(!c.id.includes('jpd123') && c.code?.toLowerCase().replace(/\s+/g, '') !== 'jpd123') || isAdmin ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => openEditModal(c, e)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Sửa thông tin"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCourseToDelete(c);
                        }}
                        className="p-1.5 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                        title="Xóa khóa học"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {c.description || 'Khóa học tiếng Nhật tổng hợp'}
                </p>

                {/* 4 Modules Status Pills */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {c.lessons?.length || 0} bài từ vựng
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-xs font-serif font-black text-rose-500">🈲</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {c.kanjiList?.length || 0} chữ Hán
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {c.grammarPoints?.length || 0} ngữ pháp
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <FolderOpen className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {c.materials?.length || 0} tài liệu
                    </span>
                  </div>
                </div>
              </div>

              {/* Enter Button */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-orange-600 dark:text-orange-400 group-hover:translate-x-1 transition-transform">
                <span>Vào học phần {c.code}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CREATE / EDIT COURSE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center font-black">
                  🇯🇵
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {editingCourse ? 'Chỉnh sửa Khóa học' : 'Tạo File Tổng / Khóa học Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Mã khóa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="VD: JPD 123"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Tên file / Khóa học *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="VD: Tiếng Nhật JPD 123"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Mô tả khóa học
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="VD: Khóa học tiếng Nhật JPD123 tổng hợp - Từ vựng, Chữ Hán, Ngữ pháp, Tài liệu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-md shadow-orange-500/30 cursor-pointer"
                >
                  Lưu khóa học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Xóa khóa học {courseToDelete.code}?
                </h4>
                <p className="text-xs text-slate-500">
                  Tất cả từ vựng, chữ Hán, ngữ pháp và tài liệu trong mục này sẽ bị xóa.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteCourseConfirm}
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
