import { JapaneseKanjiCard, JapaneseMaterial } from '../types/japanese';

export const JPD123_KANJI_LIST: JapaneseKanjiCard[] = [
  // Hướng & vị trí
  {
    id: 'k-kita',
    kanji: '北',
    hanViet: 'BẮC',
    onyomi: 'ホク',
    kunyomi: 'きた',
    meaning: 'Phía bắc',
    strokeCount: 5,
    examples: [
      { word: '北', reading: 'きた', meaning: 'Phía bắc' },
      { word: '北海道', reading: 'ほっかいどう', meaning: 'Hokkaido' },
      { word: '東北', reading: 'とうほく', meaning: 'Vùng Touhoku' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-minami',
    kanji: '南',
    hanViet: 'NAM',
    onyomi: 'ナン',
    kunyomi: 'みなみ',
    meaning: 'Phía nam',
    strokeCount: 9,
    examples: [
      { word: '南', reading: 'みなみ', meaning: 'Phía nam' },
      { word: '東南アジア', reading: 'とうなんアジア', meaning: 'Đông Nam Á' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-higashi',
    kanji: '東',
    hanViet: 'ĐÔNG',
    onyomi: 'トウ',
    kunyomi: 'ひがし',
    meaning: 'Phía đông',
    strokeCount: 8,
    examples: [
      { word: '東', reading: 'ひがし', meaning: 'Phía đông' },
      { word: '東京', reading: 'とうきょう', meaning: 'Tokyo' },
      { word: '東大寺', reading: 'とうだいじ', meaning: 'Chùa Todaiji' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-nishi',
    kanji: '西',
    hanViet: 'TÂY',
    onyomi: 'セイ, サイ',
    kunyomi: 'にし',
    meaning: 'Phía tây',
    strokeCount: 6,
    examples: [
      { word: '西', reading: 'にし', meaning: 'Phía tây' },
      { word: '西洋', reading: 'せいよう', meaning: 'Phương Tây' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-ue',
    kanji: '上',
    hanViet: 'THƯỢNG',
    onyomi: 'ジョウ',
    kunyomi: 'うえ, あ・がる',
    meaning: 'Trên, bên trên, lên',
    strokeCount: 3,
    examples: [
      { word: '上', reading: 'うえ', meaning: 'Bên trên' },
      { word: '上手', reading: 'じょうず', meaning: 'Giỏi' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-shita',
    kanji: '下',
    hanViet: 'HẠ',
    onyomi: 'カ, ゲ',
    kunyomi: 'した, さ・がる',
    meaning: 'Dưới, phía dưới',
    strokeCount: 3,
    examples: [
      { word: '下', reading: 'した', meaning: 'Phía dưới' },
      { word: '地下鉄', reading: 'ちかてつ', meaning: 'Tàu điện ngầm' },
      { word: '下手', reading: 'へた', meaning: 'Kém' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-mae',
    kanji: '前',
    hanViet: 'TIỀN',
    onyomi: 'ゼン',
    kunyomi: 'まえ',
    meaning: 'Trước, phía trước, lúc trước',
    strokeCount: 9,
    examples: [
      { word: '前', reading: 'まえ', meaning: 'Phía trước' },
      { word: '駅前', reading: 'えきまえ', meaning: 'Trước nhà ga' },
      { word: '午前', reading: 'ごぜん', meaning: 'Buổi sáng (AM)' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-ushiro',
    kanji: '後',
    hanViet: 'HẬU',
    onyomi: 'ゴ, コウ',
    kunyomi: 'うし・ろ, あと',
    meaning: 'Sau, phía sau, sau này',
    strokeCount: 9,
    examples: [
      { word: '後ろ', reading: 'うしろ', meaning: 'Phía sau' },
      { word: '午後', reading: 'ごご', meaning: 'Buổi chiều (PM)' },
      { word: '後で', reading: 'あとで', meaning: 'Lát nữa, sau đó' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-migi',
    kanji: '右',
    hanViet: 'HỮU',
    onyomi: 'ウ, ユウ',
    kunyomi: 'みぎ',
    meaning: 'Bên phải',
    strokeCount: 5,
    examples: [
      { word: '右', reading: 'みぎ', meaning: 'Bên phải' },
      { word: '右手', reading: 'みぎて', meaning: 'Tay phải' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-hidari',
    kanji: '左',
    hanViet: 'TẢ',
    onyomi: 'サ',
    kunyomi: 'ひだり',
    meaning: 'Bên trái',
    strokeCount: 5,
    examples: [
      { word: '左', reading: 'ひだり', meaning: 'Bên trái' },
      { word: '左手', reading: 'ひだりて', meaning: 'Tay trái' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-naka',
    kanji: '中',
    hanViet: 'TRUNG',
    onyomi: 'チュウ',
    kunyomi: 'なか',
    meaning: 'Trong, ở giữa, nước Trung',
    strokeCount: 4,
    examples: [
      { word: '中', reading: 'なか', meaning: 'Bên trong' },
      { word: '真ん中', reading: 'まんなか', meaning: 'Chính giữa' },
      { word: '一年中', reading: 'いちねんじゅう', meaning: 'Suốt cả năm' },
      { word: '中国', reading: 'ちゅうごく', meaning: 'Trung Quốc' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },

  // Địa điểm & Thiên nhiên
  {
    id: 'k-machi',
    kanji: '町',
    hanViet: 'ĐINH',
    onyomi: 'チョウ',
    kunyomi: 'まち',
    meaning: 'Thành phố, thị trấn',
    strokeCount: 7,
    examples: [
      { word: '町', reading: 'まち', meaning: 'Thành phố, thị trấn' },
      { word: '下町', reading: 'したまち', meaning: 'Khu phố cổ' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-eki',
    kanji: '駅',
    hanViet: 'DỊCH',
    onyomi: 'エキ',
    kunyomi: '',
    meaning: 'Nhà ga',
    strokeCount: 14,
    examples: [
      { word: '駅', reading: 'えき', meaning: 'Nhà ga' },
      { word: '駅員', reading: 'えきいん', meaning: 'Nhân viên nhà ga' },
      { word: '新宿駅', reading: 'しんじゅくえき', meaning: 'Ga Shinjuku' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-yama',
    kanji: '山',
    hanViet: 'SƠN',
    onyomi: 'サン',
    kunyomi: 'やま',
    meaning: 'Núi',
    strokeCount: 3,
    examples: [
      { word: '山', reading: 'やま', meaning: 'Núi' },
      { word: '富士山', reading: 'ふじさん', meaning: 'Núi Phú Sĩ' },
      { word: '登山', reading: 'とざん', meaning: 'Leo núi' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-kawa',
    kanji: '川',
    hanViet: 'XUYÊN',
    onyomi: 'セン',
    kunyomi: 'かわ',
    meaning: 'Sông',
    strokeCount: 3,
    examples: [
      { word: '川', reading: 'かわ', meaning: 'Con sông' },
      { word: '小川', reading: 'おがわ', meaning: 'Dòng suối nhỏ' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-michi',
    kanji: '道',
    hanViet: 'ĐẠO',
    onyomi: 'ドウ',
    kunyomi: 'みち',
    meaning: 'Đường xá, con đường, đạo',
    strokeCount: 12,
    examples: [
      { word: '道', reading: 'みち', meaning: 'Con đường' },
      { word: '北海道', reading: 'ほっかいどう', meaning: 'Hokkaido' },
      { word: '書道', reading: 'しょどう', meaning: 'Thư pháp' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-kuni',
    kanji: '国',
    hanViet: 'QUỐC',
    onyomi: 'コク',
    kunyomi: 'くに',
    meaning: 'Đất nước, quốc gia',
    strokeCount: 8,
    examples: [
      { word: '国', reading: 'くに', meaning: 'Đất nước, quê hương' },
      { word: '外国', reading: 'がいこく', meaning: 'Nước ngoài' },
      { word: '中国', reading: 'ちゅうごく', meaning: 'Trung Quốc' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-kuruma',
    kanji: '車',
    hanViet: 'XA',
    onyomi: 'シャ',
    kunyomi: 'くるま',
    meaning: 'Xe, ô tô',
    strokeCount: 7,
    examples: [
      { word: '車', reading: 'くるま', meaning: 'Xe ô tô' },
      { word: '電車', reading: 'でんしゃ', meaning: 'Tàu điện' },
      { word: '自転車', reading: 'じてんしゃ', meaning: 'Xe đạp' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },

  // Tính từ
  {
    id: 'k-ookii',
    kanji: '大',
    hanViet: 'ĐẠI',
    onyomi: 'ダイ, タイ',
    kunyomi: 'おお・きい',
    meaning: 'To, lớn',
    strokeCount: 3,
    examples: [
      { word: '大きい', reading: 'おおきい', meaning: 'To, lớn' },
      { word: '大学', reading: 'だいがく', meaning: 'Trường đại học' },
      { word: '大変', reading: 'たいへん', meaning: 'Vất vả, ghê gớm' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-chiisai',
    kanji: '小',
    hanViet: 'TIỂU',
    onyomi: 'ショウ',
    kunyomi: 'ちい・さい, こ',
    meaning: 'Nhỏ, bé',
    strokeCount: 3,
    examples: [
      { word: '小さい', reading: 'ちいさい', meaning: 'Nhỏ, bé' },
      { word: '小学生', reading: 'しょうがくせい', meaning: 'Học sinh tiểu học' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-takai',
    kanji: '高',
    hanViet: 'CAO',
    onyomi: 'コウ',
    kunyomi: 'たか・い',
    meaning: 'Cao, đắt tiền',
    strokeCount: 10,
    examples: [
      { word: '高い', reading: 'たかい', meaning: 'Cao, đắt' },
      { word: '高校', reading: 'こうこう', meaning: 'Trường cấp 3' },
      { word: '背が高い', reading: 'せがたかい', meaning: 'Dáng cao' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-yasui',
    kanji: '安',
    hanViet: 'AN',
    onyomi: 'アン',
    kunyomi: 'やす・い',
    meaning: 'Rẻ, an toàn, yên tâm',
    strokeCount: 6,
    examples: [
      { word: '安い', reading: 'やすい', meaning: 'Rẻ' },
      { word: '安心', reading: 'あんしん', meaning: 'An tâm' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-atarashii',
    kanji: '新',
    hanViet: 'TÂN',
    onyomi: 'シン',
    kunyomi: 'あたら・しい',
    meaning: 'Mới',
    strokeCount: 13,
    examples: [
      { word: '新しい', reading: 'あたらしい', meaning: 'Mới' },
      { word: '新幹線', reading: 'しんかんせん', meaning: 'Tàu cao tốc Shinkansen' },
      { word: '新聞', reading: 'しんぶん', meaning: 'Báo chí' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-furui',
    kanji: '古',
    hanViet: 'CỔ',
    onyomi: 'コ',
    kunyomi: 'ふる・い',
    meaning: 'Cũ, cổ kính',
    strokeCount: 5,
    examples: [
      { word: '古い', reading: 'ふるい', meaning: 'Cũ, cổ kính' },
      { word: '中古', reading: 'ちゅうこ', meaning: 'Đồ cũ, đồ second-hand' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-ooi',
    kanji: '多',
    hanViet: 'ĐA',
    onyomi: 'タ',
    kunyomi: 'おお・い',
    meaning: 'Nhiều',
    strokeCount: 6,
    examples: [
      { word: '多い', reading: 'おおい', meaning: 'Nhiều' },
      { word: '多少', reading: 'たしょう', meaning: 'Ít nhiều' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-sukunai',
    kanji: '少',
    hanViet: 'THIỂU',
    onyomi: 'ショウ',
    kunyomi: 'すく・ない, すこ・し',
    meaning: 'Ít, một chút',
    strokeCount: 4,
    examples: [
      { word: '少ない', reading: 'すくない', meaning: 'Ít' },
      { word: '少し', reading: 'すこし', meaning: 'Một chút' },
    ],
    mastered: false,
    createdAt: new Date().toISOString(),
  },
];

export const JPD123_MATERIALS: JapaneseMaterial[] = [
  {
    id: 'mat-grammar-handbook',
    title: '📘 TỔNG HỢP NGỮ PHÁP JPD123 (Bài 4 → Bài 7)',
    description: 'Tài liệu toàn diện biên soạn bởi AnhNH88 gồm đầy đủ 34 điểm ngữ pháp trọng tâm thi cử và giao tiếp.',
    category: 'DOC',
    lessonTag: 'Tổng hợp',
    uploadedAt: new Date().toISOString(),
    textContent: `# TỔNG HỢP NGỮ PHÁP JPD123
Biên soạn: AnhNH88
(Đã sắp xếp lại đúng thứ tự: Bài 4 → Bài 5 → Bài 6 → Bài 7)

---
## BÀI 4
1. **Hỏi quãng đường đi từ A → B hết bao lâu (4.1)**:
   - Cấu trúc: A から B まで [Phương tiện で] どのくらいですか。
   - Trả lời: [Lượng thời gian] です。
   - Ví dụ: ハノイから ホーチミンまで ひこうきで どのくらいですか。➔ 1じかんはんくらいです。

2. **Miêu tả sự vật, sự việc (4.2)**:
   - S は どうですか。 ➔ Aいです / Aなです。
   - Phủ định: Aくないです / Aじゃありません。（いい ➔ よくない）

3. **Tính từ bổ nghĩa cho Danh từ (4.2)**:
   - Aい + N / Aな + な + N
   - Phân biệt: どうですか (hỏi tính chất trực tiếp) vs どんな N ですか (phải đi kèm danh từ).

4. **Nối hai câu: 「A và B」, 「A nhưng mà B」(4.2)**:
   - Nối thuận: Mệnh đề 1。そして、Mệnh đề 2。
   - Nối tương phản: Mệnh đề 1が、Mệnh đề 2。
   - Phân biệt với「と」(liệt kê hết) và「や」(liệt kê tiêu biểu) nối 2 danh từ.

5. **Phó từ「すこし」・「とても」・「あまり」(4.3)**:
   - すこし / とても + Khẳng định.
   - あまり + Phủ định (không... lắm).

6. **Ở đâu có cái gì (4.1)**:
   - Địa điểm に N が あります。（Chỉ dùng cho đồ vật, sự vật, cây cỏ, sự kiện; không dùng cho người/động vật）.

---
## BÀI 5
1. **Nghi vấn từ vs Nghi vấn từ ＋ か (5.1)**:
   - Nghi vấn từ: なに, だれ, どこ, いつ (câu hỏi cần nội dung cụ thể).
   - Nghi vấn từ ＋ か: なにか, だれか, どこか, いつか (câu hỏi trả lời bằng はい/いいえ).
2. **Phủ định hoàn toàn (5.1)**:
   - Nghi vấn từ ＋ も ＋ V phủ định.
   - Bỏ を, が thay bằng も; Giữ に, で, と thêm も (にも, でも, とも).
3. **Thì quá khứ của Danh từ - Động từ - Tính từ (5.1)**:
   - Vました / Vませんでした
   - Aかったです / Aくなかったです (いい ➔ よかった)
   - Aなでした / Aなじゃありませんでした
   - Nでした / Nじゃありませんでした
4. **Làm gì cùng với ai (5.1)**:
   - [Người] と Vます | Tự làm: ひとりで ＋ Vます.
5. **Làm gì hết bao lâu (5.1)**:
   - どのくらい Vますか。 ➔ [Thời lượng] [くらい] Vます。
6. **Trình bày nguyên nhân, lí do (5.2)**:
   - どうして ~ か。 ➔ ~ から。 (どうしてですか: Tại sao vậy?)
7. **Nói về ý muốn (5.3)**:
   - Muốn vật: N が ほしいです。
   - Muốn hành động: V(bỏ ます) ＋ たいです。
8. **Thích / ghét cái gì (5.3)**:
   - S は N が すき / きらい です。
9. **Đi đâu để làm gì (5.3)**:
   - Địa điểm へ [N / Vます bỏ ます] に 行きます / 来ます / 帰ります。

---
## BÀI 6
1. **Cùng làm gì đó nào (6.1)**: V(bỏ ます) ＋ ましょう。
2. **Cùng làm với tôi không? (6.1)**: [いっしょに] Vませんか。 ➔ いいですね。Vましょう / すみません、ちょっと...
3. **Vị trí của số từ (6.1)**: N + Trợ từ + Số từ + Vます。
4. **Ở đâu có sự kiện gì (6.1)**: Địa điểm で Sự kiện が あります。
5. **So sánh hơn nhất (6.2)**: Phạm vi で N が いちばん [tính chất]。
6. **So sánh hơn kém (6.2)**: A は B より [tính chất]。
7. **So sánh 2 vật (6.2)**: A と B と どちらが [tính chất] か。 ➔ A/B の ほうが [tính chất] / どちらも...
8. **Đã làm gì chưa (6.3)**: もう Vましたか。 ➔ はい、Vました / いいえ、まだです。
9. **Gợi ý với どうですか (6.3)**: [Địa điểm / Món ăn / Thời gian] は どうですか。

---
## BÀI 7
1. **Vị trí: Có cái gì ở đâu (7.1)**:
   - N は Địa điểm (の Vị trí) に あります（đồ vật）/ います（người, động vật）.
2. **Phương tiện, công cụ (7.2)**: N（phương tiện）で Vます。
3. **Cách làm gì (7.2)**: V(bỏ ます) ＋ かた (N の Vかた).
4. **Động từ thể Te (7.2)**:
   - Nhóm 1: い・ち・り ➔ って; び・み・に ➔ んで; き ➔ いて; ぎ ➔ いで; し ➔ して; 行きます ➔ 行って.
   - Nhóm 2: Vます ➔ Vて (たべて, みて, おきて...).
   - Nhóm 3: きます ➔ きて; します ➔ して.
5. **Hãy làm gì (7.2)**: Vて ください。
6. **Phân biệt どの và どれ (7.2)**: どの ＋ N vs どれ.
7. **Hiện tại tiếp diễn (7.3)**: Vて います。
8. **Đề nghị giúp đỡ (7.3)**: Vましょうか。
9. **Nghi vấn từ / Chủ ngữ đi với trợ từ が (7.3)**: だれが / 私が...
10. **Các cách dùng của もう và まだ (7.3)**.`,
  },
  {
    id: 'mat-te-form-rules',
    title: '📑 Bảng quy tắc chia Động từ thể Te (て形) - Nhóm 1, 2, 3',
    description: 'Quy tắc vàng chuyển đổi thể Te chi tiết cho toàn bộ động từ nhóm 1, nhóm 2, nhóm 3 trong JPD 123.',
    category: 'DOC',
    lessonTag: 'Bài 7',
    uploadedAt: new Date().toISOString(),
    textContent: `# BẢNG QUY TẮC CHIA ĐỘNG TỪ THỂ TE (て形)

### 1. ĐỘNG TỪ NHÓM I (Vần「い」trước ます)
- **～います / ～ちます / ～ります** ➔ **～って**
  - 会います (あいます) ➔ 会って (gặp mặt)
  - 待ちます (まちます) ➔ 待って (đợi)
  - 取ります (とります) ➔ 取って (lấy)
  - 買います (かいます) ➔ 買って (mua)
  - 帰ります (かえります) ➔ 帰って (về)
- **～みます / ～にます / ～びます** ➔ **～んで**
  - 飲みます (のみます) ➔ 飲んで (uống)
  - 読みます (よみます) ➔ 読んで (đọc)
  - 遊びます (あそびます) ➔ 遊んで (chơi)
  - 死にます (しにます) ➔ 死んで (chết)
- **～きます** ➔ **～いて**
  - 書きます (かきます) ➔ 書いて (viết)
  - 聞きます (ききます) ➔ 聞いて (nghe, hỏi)
  - ⚠️ **NGOẠI LỆ ĐẶC BIỆT**: 行きます (いきます) ➔ **行って (いって)**
- **～ぎます** ➔ **～いで**
  - 泳ぎます (およぎます) ➔ 泳いで (bơi)
- **～します** ➔ **～して**
  - 話します (はなします) ➔ 話して (nói chuyện)
  - 貸します (かします) ➔ 貸して (cho mượn)
  - 出します (だします) ➔ 出して (lấy ra, nộp)

---
### 2. ĐỘNG TỪ NHÓM II (Vần「え」trước ます & Một số từ vần「い」đặc biệt)
Quy tắc: **Bỏ ます thêm て**
- 食べます (たべます) ➔ **食べて** (ăn)
- 開けます (あけます) ➔ **開けて** (mở)
- 閉めます (しめます) ➔ **閉めて** (đóng)
- 教えます (おしえます) ➔ **教えて** (dạy, chỉ bảo)
- ⚠️ Các động từ vần「い」thuộc Nhóm II:
  - 見ます (みます) ➔ **見て** (nhìn, xem)
  - 起きます (おきます) ➔ **起きて** (thức dậy)
  - 借ります (かります) ➔ **借りて** (vay, mượn)
  - います (います) ➔ **いて** (có mặt, ở)

---
### 3. ĐỘNG TỪ NHÓM III (Bất quy tắc)
- 来ます (きます) ➔ **来て (きて)** (đến)
- します ➔ **して** (làm, chơi)
  - 勉強します ➔ **勉強して** (học)
  - 掃除します ➔ **掃除して** (dọn dẹp)
  - 洗濯します ➔ **洗濯して** (giặt giũ)
  - 食事します ➔ **食事して** (dùng bữa)
  - 買い物します ➔ **買い物して** (mua sắm)
  - 持って来ます ➔ **持って来て** (mang đến)`,
  },
  {
    id: 'mat-counting-table',
    title: '🔢 Bảng tra cứu Cách đếm đồ vật & Lượng từ (かぞえかた ひょう)',
    description: 'Đầy đủ các đơn vị đếm quan trọng: つ, 個, 枚, 本, 冊, 台, 杯, 人, 匹, 階, 回, 番...',
    category: 'DOC',
    lessonTag: 'Bài 6',
    uploadedAt: new Date().toISOString(),
    textContent: `# BẢNG TRA CỨU CÁCH ĐẾM TRONG TIẾNG NHẬT (かぞえかた)

| Số | ～つ (Đồ vật chung) | ～個 / こ (Vật nhỏ) | ～枚 / まい (Vật mỏng, phẳng) | ～本 / ほん (Vật dài, thon) | ～冊 / さつ (Sách, vở) | ～台 / だい (Xe cộ, máy móc) | ～杯 / はい (Ly, cốc, chén) | ～人 / にん (Người) | ～匹 / ひき (Động vật nhỏ) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | ひとつ | いっこ | いちまい | **いっぽん** | **いっさつ** | いちだい | **いっぱい** | **ひとり** | **いっぴき** |
| 2 | ふたつ | にこ | にまい | にほん | にさつ | にだい | にはい | **ふたり** | にひき |
| 3 | みっつ | さんこ | さんまい | **さんぼん** | さんさつ | さんだい | **さんばい** | さんにん | **さんびき** |
| 4 | よっつ | **よんこ** | **よんまい** | **よんほん** | **よんさつ** | **よんだい** | **よんはい** | **よにん** | **よんひき** |
| 5 | いつつ | ごこ | ごまい | ごほん | ごさつ | ごだい | ごはい | ごにん | ごひき |
| 6 | むっつ | **ろっこ** | ろくまい | **ろっぽん** | **ろくさつ** | ろくだい | **ろっぱい** | ろくにん | **ろっぴき** |
| 7 | ななつ | ななこ | ななまい | ななほん | ななさつ | ななだい | ななはい | ななにん / しちにん | ななひき |
| 8 | やっつ | **はっこ** | はちまい | **はっぽん** | **はっさつ** | はちだい | **はっぱい** | はちにん | **はっぴき** |
| 9 | ここのつ | きゅうこ | きゅうまい | きゅうほん | きゅうさつ | きゅうだい | きゅうはい | きゅうにん / くにん | きゅうひき |
| 10 | **とお** | **じゅっこ** | じゅうまい | **じゅっぽん** | **じゅっさつ** | じゅうだい | **じゅっぱい** | じゅうにん | **じゅっぴき** |
| Hỏi | **いくつ** | **なんこ** | **なんまい** | **なんぼん** | **なんさつ** | **なんだい** | **なんばい** | **なんにん** | **なんびき** |

### Cách đếm Tầng, Lần, Thứ tự:
- **Tầng nhà (～階 / かい)**: いっかい, にかい, さんかい/さんがい, よんかい, ごかい, ろっかい, ななかい, はっかい, きゅうかい, じゅっかい. (Hỏi: なんかい / なんがい)
- **Số lần (～回 / かい)**: いっかい (1 lần), にかい (2 lần), さんかい, よんかい, ごかい, ろっかい, ななかい, はっかい, きゅうかい, じゅっかい. (Hỏi: なんかい)
- **Số thứ tự (～番 / ばん)**: いちばん (số 1, nhất), にばん, さんばん, よんばん, ごばん... (Hỏi: なんばん)`,
  },
  {
    id: 'mat-time-duration',
    title: '⏱️ Bảng phân biệt Thời gian (Mốc) vs Lượng thời gian (Khoảng)',
    description: 'Tổng hợp phân biệt giữa mốc thời gian (Thời điểm に) và khoảng thời gian (Thời lượng くらい).',
    category: 'DOC',
    lessonTag: 'Bài 4',
    uploadedAt: new Date().toISOString(),
    textContent: `# PHÂN BIỆT MỐC THỜI GIAN VÀ LƯỢNG THỜI GIAN

### 1. BẢNG ĐỐI CHIẾU
| Đơn vị | MỐC THỜI GIAN (Thời điểm + に) | LƯỢNG THỜI GIAN (Khoảng thời gian) |
|---|---|---|
| Giờ | **～時 (～じ)**: 9時 (9 giờ đúng) | **～時間 (～じかん)**: 9時間 (suốt 9 tiếng đồng hồ) |
| Phút | **～分 (～ふん/ぷん)**: 20分 (phút thứ 20) | **～分(間) (～ふん/ぷん(かん))**: 20分 (trong 20 phút) |
| Ngày | **～日 (～にち/か)**: 5日 (ngày mùng 5) | **～日(間) (～にち/か(かん))**: 5日間 (trong 5 ngày) |
| Tuần | *Không dùng mốc* | **～週間 (～しゅうかん)**: 1週間, 2週間 (trong ~ tuần) |
| Tháng | **～月 (～がつ)**: 4月 (tháng Tư) | **～ヶ月 (～かげつ)**: 4ヶ月 (trong 4 tháng) |
| Năm | **～年 (～ねん)**: 2026年 (năm 2026) | **～年(間) (～ねん(かん))**: 2年間 (trong 2 năm) |

### 2. CÁCH DÙNG TRỢ TỪ:
- Mốc thời gian cụ thể: DÙNG TRỢ TỪ「に」:
  - *Ví dụ*: 8時に 起きます。(Thức dậy vào lúc 8 giờ)
  - *Ví dụ*: 6月に 日本へ 行きます。(Đi Nhật vào tháng 6)
- Lượng thời gian (khoảng thời gian): KHÔNG DÙNG「に」:
  - *Ví dụ*: 2時間 勉強しました。(Đã học bài suốt 2 tiếng)
  - *Ví dụ*: うちから 学校まで じてんしゃで 30分くらいです。(Từ nhà tới trường mất khoảng 30 phút)`,
  },
  {
    id: 'mat-dialogues',
    title: '🗣️ Tuyển tập Hội thoại mẫu Dekiru Nihongo Bài 4 → 7',
    description: 'Các bài hội thoại thực tế trích từ sách Dekiru Nihongo (Trang 71, 75, 79, 87, 93, 97, 105, 109, 113, 121, 127, 133).',
    category: 'DOC',
    lessonTag: 'Tổng hợp',
    uploadedAt: new Date().toISOString(),
    textContent: `# TUYỂN TẬP HỘI THOẠI DEKIRU NIHONGO (BÀI 4 - 7)

### BÀI 4 (Trang 71, 75, 79)
- **Hỏi quê quán & thời gian bay (Bài 53/ Tr.71)**:
  - A: ワンさん、ワンさんのお国はどちらですか。
  - B: 中国です。中国の北京です。
  - A: そうですか。日本から北京までどのくらいですか。
  - B: 3時間半くらいです。
- **Hỏi về thành phố & tính từ (Bài 61/ Tr.75)**:
  - A: マルコさんの町は大きいですか。
  - B: はい、大きいです。そして、人が多いです。
  - A: へえ、何がありますか。
  - B: 古い教会があります。きれいです。
- **Hỏi khí hậu thời tiết (Bài 67/ Tr.79)**:
  - A: 日本は、12月、寒いですね。パースはどうですか。
  - B: 私の国は、12月、寒くないです。パースは12月、夏です。とても暑いです。そして、雨が少ないです。

### BÀI 5 (Trang 87, 93, 97)
- **Hỏi hoạt động quá khứ (Bài 73/ Tr.87)**:
  - A: パクさんは、日曜日、どこかへ行きましたか。
  - B: はい、渋谷へ行きました。友達と行きました。Tシャツと靴を買いました。
  - A: ダニエルさんはどこかへ行きましたか。
  - B: いいえ、どこへも行きませんでした。部屋を掃除しました。それから、日本語を2時間くらい勉強しました。
- **Hỏi lý do & cảm nhận (Bài 78/ Tr.93)**:
  - A: 日曜日、買い物に行きましたか。
  - B: いいえ、行きませんでした。雨でしたから。
  - A: アンナさん、日曜日、何をしましたか。
  - B: 山に登りました。とても楽しかったです。景色がきれいでした。
- **Kế hoạch & ý muốn (Bài 83/ Tr.97)**:
  - A: アンナさん、今度の休みに何をしますか。
  - B: 私は自転車がほしいですから、ニコニコショッピングビルへ行きます。

### BÀI 6 (Trang 105, 109, 113)
- **Mời rủ (Bài 6/ Tr.105)**:
  - A: 今晩、浅草でお祭りがありますよ。一緒に行きませんか。
  - B: いいですね。行きましょう！
- **So sánh lựa chọn (Bài 10/ Tr.109)**:
  - A: 土曜日と日曜日とどちらがいいですか。
  - B: 日曜日のほうがいいです。土曜日はアルバイトがありますから。
  - A: 食べ物で何がいちばん好きですか。
  - B: 私はお寿司がいちばん好きです。

### BÀI 7 (Trang 121, 127, 133)
- **Hỏi vị trí đang đứng (Bài 20/ Tr.121)**:
  - A: もしもし、パクさん？今、どこにいますか。
  - B: あ、ダニエルさん？私は今、コンビニの前にいます。銀行があります。
- **Nhờ vả với thể Te (Bài 26/ Tr.127)**:
  - A: パクさん、この大きいお皿を洗ってください。
  - B: はい。
  - A: カルロスさん、小さいコップを5つ取ってください。テーブルの上に置いてください。
- **Hiện tại tiếp diễn & Đề nghị giúp đỡ (Bài 31/ Tr.133)**:
  - A: ワンさんはどこにいますか。
  - B: 隣の部屋でお皿を洗っていますよ。
  - A: ワンさん、手伝いましょうか。
  - B: あ、ありがとうございます！`,
  },
  {
    id: 'mat-pdf-words-list',
    title: '📄 New words list - Dekiru Nihongo Beginner (PDF Từ vựng)',
    description: 'Tài liệu file PDF tổng hợp từ vựng Dekiru Nihongo kì 3 JPD123. Hỗ trợ liên kết file máy tính, OneDrive và xem trực tiếp.',
    category: 'PDF',
    lessonTag: 'Tổng hợp',
    uploadedAt: new Date().toISOString(),
    externalLink: 'file:///C:/Users/daidu/OneDrive/T%C3%A0i%20li%E1%BB%87u/AI2107/K%C3%8C%203/JPD123/%20t%E1%BB%95ng%20h%C6%A1p/New%20words%20list%20-%20Dekiru%20Nihongo%20Beginner_2.pdf',
    textContent: `# TÀI LIỆU TỪ VỰNG TỔNG HỢP - DEKIRU NIHONGO BEGINNER (PDF)
- **Đường dẫn liên kết**: \`file:///C:/Users/daidu/OneDrive/Tài liệu/AI2107/KÌ 3/JPD123/ tổng hơp/New words list - Dekiru Nihongo Beginner_2.pdf\`
- **Gợi ý sử dụng**: 
  1. Bấm nút **"Sao chép đường dẫn file"** để dán nhanh vào Windows Explorer / Run (Win+R) hoặc trình duyệt.
  2. Bạn cũng có thể bấm nút **"Chọn file từ máy tính"** để tải file này lên hệ thống và đọc trực tiếp trong ứng dụng.
- **Nội dung bao gồm**: Bảng tổng hợp Kanji, Hiragana, Romaji và định nghĩa chi tiết từ Bài 4 đến Bài 7.`,
  },
  {
    id: 'mat-doc-grammar-handbook',
    title: '📝 Sổ tay Ngữ Pháp & Mẫu câu trọng tâm JPD123 (Word / Docx)',
    description: 'Tài liệu file Word tổng hợp cấu trúc, phân tích và câu ví dụ trọng tâm các bài học JPD123.',
    category: 'DOC',
    lessonTag: 'Bài 4',
    uploadedAt: new Date().toISOString(),
    externalLink: 'https://docs.google.com/document/d/1sample-jpd123-grammar/preview',
    textContent: `# SỔ TAY NGỮ PHÁP JPD123 (DEKIRU NIHONGO)
### Tổng hợp các cấu trúc cốt lõi:
1. **Quãng đường & thời gian**:
   - Câu khẳng định: A から B まで [Phương tiện で] [Lượng thời gian] くらいです。
   - Câu hỏi: （？）A から B まで [Phương tiện で] どのくらいですか。
   - Trả lời: （＋）[Lượng thời gian] です。
2. **Miêu tả đặc điểm tính chất**:
   - Khẳng định: [S は] Aいです。 / Aなです。
   - Phủ định: [S は] Aくないです。 / Aじゃありません。
   - Câu hỏi: （？）S は どうですか。
3. **Phủ định hoàn toàn**:
   - Từ để hỏi + も + Động từ thể Phủ định (Hoàn toàn không làm gì cả).`,
  },
];
