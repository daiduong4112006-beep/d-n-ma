export interface JapaneseVocabCard {
  id: string;
  term: string;          // Kanji or main word (e.g. 電車)
  reading?: string;       // Hiragana / Katakana reading (e.g. でんしゃ)
  romaji?: string;        // Romaji (e.g. densha)
  definition: string;    // Vietnamese meaning (e.g. Tàu điện)
  example?: string;       // Example sentence / context (e.g. Lên tàu điện.)
  partOfSpeech?: string;  // e.g. Danh từ, Động từ, Tính từ
  imageUrl?: string;      // Optional image
  mastered?: boolean;
}

export interface JapaneseLesson {
  id: string;
  courseId?: string;      // ID of parent course (e.g. JPD123)
  lessonCode?: string;    // e.g. LESSON 4-1
  title: string;
  description: string;
  level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'Cơ bản' | 'Khác';
  cards: JapaneseVocabCard[];
  kanjiCore?: JapaneseKanjiCard[];
  createdAt: string;
  updatedAt: string;
  timesPracticed?: number;
}

export interface JapaneseKanjiCard {
  id: string;
  kanji: string;          // e.g. "日", "学", "車"
  hanViet: string;        // e.g. "NHẬT", "HỌC", "XA"
  onyomi?: string;        // e.g. "ニチ, ジツ"
  kunyomi?: string;       // e.g. "ひ, -び, -か"
  meaning: string;        // e.g. "Mặt trời, ngày, nước Nhật"
  strokeCount?: number;   // e.g. 4
  lessonTag?: string;     // e.g. "L4", "L5", "L6", "L7"
  examples?: { word: string; reading: string; meaning: string }[];
  mastered?: boolean;
  createdAt: string;
}

export interface AttachedFile {
  id: string;
  name: string;
  size: number;           // bytes
  type: string;           // MIME type
  uploadedAt: string;
  dataUrl?: string;       // base64 / blob URL
  note?: string;
}

export interface JapaneseGrammarPoint {
  id: string;
  lessonTag?: string;     // e.g. "Bài 4", "Bài 5", "Bài 6", "Bài 7"
  title: string;          // e.g. "Cấu trúc ～てから"
  structure: string;      // e.g. "V1-て + から、V2"
  meaning: string;        // e.g. "Sau khi làm V1 thì làm V2"
  explanation?: string;   // Chi tiết giải thích
  examples?: { japanese: string; reading?: string; vietnamese: string }[];
  attachedFiles?: AttachedFile[]; // Nhét file tài liệu vào ngữ pháp
  createdAt: string;
  updatedAt: string;
}

export interface JapaneseMaterial {
  id: string;
  title: string;
  description?: string;
  category: 'PDF' | 'DOC' | 'SLIDE' | 'IMAGE' | 'LINK' | 'OTHER';
  file?: AttachedFile;
  externalLink?: string;
  lessonTag?: string;     // e.g. "Bài 4", "Bài 5", "Bài 6", "Bài 7", "Tổng hợp"
  textContent?: string;   // Nội dung văn bản tài liệu đọc ngay
  uploadedAt: string;
}

export interface JapaneseCourse {
  id: string;
  code: string;           // e.g. "JPD123"
  title: string;          // e.g. "Tiếng Nhật JPD123"
  description: string;    // e.g. "Khóa học tiếng Nhật JPD123 tổng hợp"
  level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'Cơ bản' | 'Khác';
  createdAt: string;
  updatedAt: string;
  lessons: JapaneseLesson[];          // 1. Từ vựng (12 bài học 4.1 - 7.3)
  kanjiList: JapaneseKanjiCard[];     // 2. Chữ Hán (Kanji Core)
  kanjiVocabList?: JapaneseVocabCard[]; // 2. Từ vựng Chữ Hán (Kanji Compound Vocab)
  grammarPoints: JapaneseGrammarPoint[]; // 3. Ngữ pháp (có nhét file)
  materials: JapaneseMaterial[];       // 4. Tài liệu học tập (upload file)
  deletedMaterialIds?: string[];       // Danh sách ID tài liệu đã xóa
}

export interface JapaneseKanjiFolder {
  id: string;
  lessonTag: string;     // 'L4' | 'L5' | 'L6' | 'L7'
  code: string;          // 'jpd123 • L4'
  title: string;         // 'Địa điểm và Phương hướng'
  description?: string;
  kanjiCore: JapaneseKanjiCard[];
  kanjiVocab: JapaneseVocabCard[];
}
