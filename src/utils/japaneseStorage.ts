import {
  JapaneseLesson,
  JapaneseVocabCard,
  JapaneseCourse,
  JapaneseKanjiCard,
  JapaneseGrammarPoint,
  JapaneseMaterial,
  AttachedFile,
} from '../types/japanese';
import { JPD123_GRAMMAR_POINTS } from '../data/jpd123Grammar';
import { JPD123_VOCAB_LESSONS } from '../data/jpd123Vocab';
import { JPD123_KANJI_LIST, JPD123_MATERIALS } from '../data/jpd123KanjiAndMaterials';
import {
  STRUCTURED_JPD123_LESSONS,
  ALL_KANJI_CORE_LIST,
  ALL_KANJI_VOCAB_LIST,
  JPD123_KANJI_FOLDERS,
} from '../data/jpd123StructuredLessons';
import { getCurrentUserEmail } from './storage';
import {
  syncJapaneseCourseToFirestore,
  deleteJapaneseCourseFromFirestore,
} from '../lib/firebase';

const STORAGE_KEY = 'mcq_japanese_lessons_v2';
const COURSES_STORAGE_KEY = 'mcq_japanese_courses_v1';

// Only these admin accounts have the JPD123 course folder
export const JAPANESE_ADMIN_EMAILS: string[] = [
  'hsk9hbt@gmail.com',
  'trinhthichien10101979@gmail.com',
  'daiduong4112006@gmail.com',
  'kieuduong41126@gmail.com',
  'huha41126@gmail.com',
  'hihu41126@gmail.com',
];

export function isJapaneseAdmin(email?: string | null): boolean {
  const targetEmail = (email !== undefined ? (email || '') : getCurrentUserEmail()).toLowerCase().trim();
  if (!targetEmail) return false;
  return JAPANESE_ADMIN_EMAILS.some((admin) => admin.toLowerCase().trim() === targetEmail);
}

export function getCoursesStorageKey(email?: string | null): string {
  const targetEmail = (email !== undefined ? (email || '') : getCurrentUserEmail()).toLowerCase().trim();
  if (!targetEmail) return 'mcq_japanese_courses_v1_guest';
  const sanitized = targetEmail.replace(/[^a-z0-9]/g, '_');
  return `mcq_japanese_courses_v1_${sanitized}`;
}

export const SEED_JAPANESE_LESSONS: JapaneseLesson[] = [
  {
    id: 'jp-lesson-4-1',
    lessonCode: 'LESSON 4-1',
    title: '4-1: Phương hướng và phương tiện',
    description: 'Học về các phương hướng và phương tiện giao thông',
    level: 'N5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timesPracticed: 5,
    cards: [
      {
        id: 'jp-41-1',
        term: '北',
        reading: 'きた',
        romaji: 'kita',
        partOfSpeech: 'Danh từ',
        definition: 'Phía bắc',
        example: 'Gió lạnh thổi từ phía bắc.',
        mastered: true,
      },
      {
        id: 'jp-41-2',
        term: '南',
        reading: 'みなみ',
        romaji: 'minami',
        partOfSpeech: 'Danh từ',
        definition: 'Phía nam',
        example: 'Đi du lịch về phía nam.',
        mastered: false,
      },
      {
        id: 'jp-41-3',
        term: '東',
        reading: 'ひがし',
        romaji: 'higashi',
        partOfSpeech: 'Danh từ',
        definition: 'Phía đông',
        example: 'Mặt trời mọc ở hướng đông.',
        mastered: false,
      },
      {
        id: 'jp-41-4',
        term: '西',
        reading: 'にし',
        romaji: 'nishi',
        partOfSpeech: 'Danh từ',
        definition: 'Phía tây',
        example: 'Mặt trời lặn ở hướng tây.',
        mastered: false,
      },
      {
        id: 'jp-41-5',
        term: '電車',
        reading: 'でんしゃ',
        romaji: 'densha',
        partOfSpeech: 'Danh từ',
        definition: 'Tàu điện',
        example: 'Lên tàu điện đi làm.',
        mastered: true,
      },
      {
        id: 'jp-41-6',
        term: '駅',
        reading: 'えき',
        romaji: 'eki',
        partOfSpeech: 'Danh từ',
        definition: 'Nhà ga',
        example: 'Hẹn gặp bạn bè ở trước nhà ga.',
        mastered: false,
      },
      {
        id: 'jp-41-7',
        term: '車',
        reading: 'くるま',
        romaji: 'kuruma',
        partOfSpeech: 'Danh từ',
        definition: 'Xe ô tô',
        example: 'Lái xe ô tô về quê.',
        mastered: false,
      },
      {
        id: 'jp-41-8',
        term: '自転車',
        reading: 'じてんしゃ',
        romaji: 'jitensha',
        partOfSpeech: 'Danh từ',
        definition: 'Xe đạp',
        example: 'Đi dạo quanh hồ bằng xe đạp.',
        mastered: false,
      },
      {
        id: 'jp-41-9',
        term: 'バス',
        reading: 'ばす',
        romaji: 'basu',
        partOfSpeech: 'Danh từ',
        definition: 'Xe buýt',
        example: 'Chờ tuyến xe buýt số 12.',
        mastered: false,
      },
      {
        id: 'jp-41-10',
        term: '飛行機',
        reading: 'ひこうき',
        romaji: 'hikouki',
        partOfSpeech: 'Danh từ',
        definition: 'Máy bay',
        example: 'Đi Tokyo bằng máy bay.',
        mastered: false,
      },
      {
        id: 'jp-41-11',
        term: '右',
        reading: 'みぎ',
        romaji: 'migi',
        partOfSpeech: 'Danh từ',
        definition: 'Bên phải',
        example: 'Rẽ sang bên phải ở ngã tư.',
        mastered: false,
      },
      {
        id: 'jp-41-12',
        term: '左',
        reading: 'ひだり',
        romaji: 'hidari',
        partOfSpeech: 'Danh từ',
        definition: 'Bên trái',
        example: 'Bưu điện nằm ở phía bên trái.',
        mastered: false,
      },
      {
        id: 'jp-41-13',
        term: 'まっすぐ',
        reading: 'まっすぐ',
        romaji: 'massugu',
        partOfSpeech: 'Phó từ',
        definition: 'Đi thẳng',
        example: 'Hãy đi thẳng đường này 200 mét.',
        mastered: false,
      },
      {
        id: 'jp-41-14',
        term: '近く',
        reading: 'ちかく',
        romaji: 'chikaku',
        partOfSpeech: 'Danh từ',
        definition: 'Gần đây',
        example: 'Có siêu thị tiện lợi ở gần đây không?',
        mastered: false,
      },
    ],
  },
  {
    id: 'jp-lesson-4-2',
    lessonCode: 'LESSON 4-2',
    title: '4-2: Địa điểm và tính từ',
    description: 'Học về các địa điểm và tính từ miêu tả',
    level: 'N5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timesPracticed: 2,
    cards: [
      {
        id: 'jp-42-1',
        term: '学校',
        reading: 'がっこう',
        romaji: 'gakkou',
        partOfSpeech: 'Danh từ',
        definition: 'Trường học',
        example: 'Học sinh đến trường lúc 8 giờ.',
        mastered: false,
      },
      {
        id: 'jp-42-2',
        term: '病院',
        reading: 'びょういん',
        romaji: 'byouin',
        partOfSpeech: 'Danh từ',
        definition: 'Bệnh viện',
        example: 'Bác sĩ làm việc tại bệnh viện.',
        mastered: false,
      },
      {
        id: 'jp-42-3',
        term: '銀行',
        reading: 'ぎんこう',
        romaji: 'ginkou',
        partOfSpeech: 'Danh từ',
        definition: 'Ngân hàng',
        example: 'Rút tiền ở ngân hàng.',
        mastered: false,
      },
      {
        id: 'jp-42-4',
        term: '公園',
        reading: 'こうえん',
        romaji: 'kouen',
        partOfSpeech: 'Danh từ',
        definition: 'Công viên',
        example: 'Đi dạo ngắm hoa ở công viên.',
        mastered: false,
      },
      {
        id: 'jp-42-5',
        term: '大きい',
        reading: 'おおきい',
        romaji: 'ookii',
        partOfSpeech: 'Tính từ đuôi い',
        definition: 'To lớn',
        example: 'Tòa nhà này rất to lớn.',
        mastered: false,
      },
      {
        id: 'jp-42-6',
        term: '小さい',
        reading: 'ちいさい',
        romaji: 'chiisai',
        partOfSpeech: 'Tính từ đuôi い',
        definition: 'Nhỏ bé',
        example: 'Một chú mèo con nhỏ bé.',
        mastered: false,
      },
      {
        id: 'jp-42-7',
        term: '新しい',
        reading: 'あたらしい',
        romaji: 'atarashii',
        partOfSpeech: 'Tính từ đuôi い',
        definition: 'Mới',
        example: 'Mua chiếc điện thoại mới.',
        mastered: false,
      },
      {
        id: 'jp-42-8',
        term: '古い',
        reading: 'ふるい',
        romaji: 'furui',
        partOfSpeech: 'Tính từ đuôi い',
        definition: 'Cũ, cổ kính',
        example: 'Ngôi chùa cổ kính ở Kyoto.',
        mastered: false,
      },
    ],
  },
  {
    id: 'jp-lesson-4-3',
    lessonCode: 'LESSON 4-3',
    title: '4-3: Thời tiết và vị giác',
    description: 'Học về thời tiết và các vị của thức ăn',
    level: 'N5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timesPracticed: 1,
    cards: [
      {
        id: 'jp-43-1',
        term: '晴れ',
        reading: 'はれ',
        romaji: 'hare',
        partOfSpeech: 'Danh từ',
        definition: 'Trời nắng đẹp',
        example: 'Hôm nay thời tiết nắng ráo.',
        mastered: false,
      },
      {
        id: 'jp-43-2',
        term: '雨',
        reading: 'あめ',
        romaji: 'ame',
        partOfSpeech: 'Danh từ',
        definition: 'Trời mưa',
        example: 'Mang theo ô vì trời mưa.',
        mastered: false,
      },
      {
        id: 'jp-43-3',
        term: '暑い',
        reading: 'あつい',
        romaji: 'atsui',
        partOfSpeech: 'Tính từ đuôi い',
        definition: 'Nóng nực',
        example: 'Mùa hè ở Tokyo rất nóng.',
        mastered: false,
      },
      {
        id: 'jp-43-4',
        term: '寒い',
        reading: 'さむい',
        romaji: 'samui',
        partOfSpeech: 'Tính từ đuôi い',
        definition: 'Lạnh lẽo',
        example: 'Mùa đông tuyết rơi lạnh lẽo.',
        mastered: false,
      },
      {
        id: 'jp-43-5',
        term: 'おいしい',
        reading: 'おいしい',
        romaji: 'oishii',
        partOfSpeech: 'Tính từ đuôi い',
        definition: 'Ngon',
        example: 'Món ăn Nhật Bản rất ngon.',
        mastered: false,
      },
      {
        id: 'jp-43-6',
        term: '甘い',
        reading: 'あまい',
        romaji: 'amai',
        partOfSpeech: 'Tính từ đuôi い',
        definition: 'Ngọt ngào',
        example: 'Bánh kem rất ngọt ngào.',
        mastered: false,
      },
      {
        id: 'jp-43-7',
        term: '辛い',
        reading: 'からい',
        romaji: 'karai',
        partOfSpeech: 'Tính từ đuôi い',
        definition: 'Cay',
        example: 'Món mì cay này rất hấp dẫn.',
        mastered: false,
      },
    ],
  },
  {
    id: 'jp-lesson-5-1',
    lessonCode: 'LESSON 5-1',
    title: '5-1: Thời gian và hoạt động',
    description: 'Học về các mốc thời gian và hoạt động hàng ngày',
    level: 'N5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timesPracticed: 3,
    cards: [
      {
        id: 'jp-51-1',
        term: '朝',
        reading: 'あさ',
        romaji: 'asa',
        partOfSpeech: 'Danh từ',
        definition: 'Buổi sáng',
        example: 'Thức dậy vào sáng sớm.',
        mastered: false,
      },
      {
        id: 'jp-51-2',
        term: '昼',
        reading: 'ひる',
        romaji: 'hiru',
        partOfSpeech: 'Danh từ',
        definition: 'Buổi trưa',
        example: 'Ăn cơm trưa lúc 12 giờ.',
        mastered: false,
      },
      {
        id: 'jp-51-3',
        term: '夜',
        reading: 'よる',
        romaji: 'yoru',
        partOfSpeech: 'Danh từ',
        definition: 'Buổi tối, ban đêm',
        example: 'Học bài vào buổi tối.',
        mastered: false,
      },
      {
        id: 'jp-51-4',
        term: '起きる',
        reading: 'おきる',
        romaji: 'okiru',
        partOfSpeech: 'Động từ',
        definition: 'Thức dậy',
        example: 'Thức dậy lúc 6 giờ sáng.',
        mastered: false,
      },
      {
        id: 'jp-51-5',
        term: '寝る',
        reading: 'ねる',
        romaji: 'neru',
        partOfSpeech: 'Động từ',
        definition: 'Đi ngủ',
        example: 'Đi ngủ lúc 11 giờ đêm.',
        mastered: false,
      },
      {
        id: 'jp-51-6',
        term: '勉強する',
        reading: 'べんきょうする',
        romaji: 'benkyousuru',
        partOfSpeech: 'Động từ',
        definition: 'Học tập',
        example: 'Học tiếng Nhật mỗi ngày.',
        mastered: false,
      },
    ],
  },
  {
    id: 'jp-lesson-5-2',
    lessonCode: 'LESSON 5-2',
    title: '5-2: Thời tiết và cảm xúc',
    description: 'Học về thời tiết và các tính từ chỉ cảm giác, trạng thái',
    level: 'N5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timesPracticed: 1,
    cards: [
      {
        id: 'jp-52-1',
        term: '嬉しい',
        reading: 'うれしい',
        romaji: 'ureshii',
        partOfSpeech: 'Tính từ đuôi い',
        definition: 'Vui mừng, hạnh phúc',
        example: 'Rất vui mừng khi thi đỗ.',
        mastered: false,
      },
      {
        id: 'jp-52-2',
        term: '楽しい',
        reading: 'たのしい',
        romaji: 'tanoshii',
        partOfSpeech: 'Tính từ đuôi い',
        definition: 'Vui vẻ, thú vị',
        example: 'Chuyến đi chơi rất vui vẻ.',
        mastered: false,
      },
      {
        id: 'jp-52-3',
        term: '忙しい',
        reading: 'いそがしい',
        romaji: 'isogashii',
        partOfSpeech: 'Tính từ đuôi い',
        definition: 'Bận rộn',
        example: 'Công việc tuần này rất bận rộn.',
        mastered: false,
      },
      {
        id: 'jp-52-4',
        term: '暇',
        reading: 'ひま',
        romaji: 'hima',
        partOfSpeech: 'Tính từ đuôi な',
        definition: 'Rảnh rỗi',
        example: 'Chủ nhật này bạn có rảnh không?',
        mastered: false,
      },
    ],
  },
  {
    id: 'jp-lesson-5-3',
    lessonCode: 'LESSON 5-3',
    title: '5-3: Sở thích',
    description: 'Học về các sở thích và hoạt động giải trí',
    level: 'N5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timesPracticed: 2,
    cards: [
      {
        id: 'jp-53-1',
        term: '音楽',
        reading: 'おんがく',
        romaji: 'ongaku',
        partOfSpeech: 'Danh từ',
        definition: 'Âm nhạc',
        example: 'Nghe âm nhạc thư giãn.',
        mastered: false,
      },
      {
        id: 'jp-53-2',
        term: '映画',
        reading: 'えいが',
        romaji: 'eiga',
        partOfSpeech: 'Danh từ',
        definition: 'Phim ảnh',
        example: 'Xem phim chiếu rạp cùng bạn.',
        mastered: false,
      },
      {
        id: 'jp-53-3',
        term: '読書',
        reading: 'どくしょ',
        romaji: 'dokusho',
        partOfSpeech: 'Danh từ',
        definition: 'Đọc sách',
        example: 'Sở thích của tôi là đọc sách.',
        mastered: false,
      },
      {
        id: 'jp-53-4',
        term: '旅行',
        reading: 'りょこう',
        romaji: 'ryokou',
        partOfSpeech: 'Danh từ',
        definition: 'Du lịch',
        example: 'Đi du lịch Nhật Bản mùa hoa anh đào.',
        mastered: false,
      },
      {
        id: 'jp-53-5',
        term: '料理',
        reading: 'りょうり',
        romaji: 'ryouri',
        partOfSpeech: 'Danh từ',
        definition: 'Nấu ăn, món ăn',
        example: 'Nấu các món ăn ngon.',
        mastered: false,
      },
    ],
  },
  {
    id: 'jp-lesson-6-1',
    lessonCode: 'LESSON 6-1',
    title: '6-1: Kế hoạch và sự kiện',
    description: 'Học về kế hoạch, sự kiện và cách đếm vật mỏng',
    level: 'N5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timesPracticed: 1,
    cards: [
      {
        id: 'jp-61-1',
        term: '計画',
        reading: 'けいかく',
        romaji: 'keikaku',
        partOfSpeech: 'Danh từ',
        definition: 'Kế hoạch',
        example: 'Lập kế hoạch cho năm mới.',
        mastered: false,
      },
      {
        id: 'jp-61-2',
        term: '約束',
        reading: 'やくそく',
        romaji: 'yakusoku',
        partOfSpeech: 'Danh từ',
        definition: 'Cuộc hẹn, lời hứa',
        example: 'Có cuộc hẹn lúc 7 giờ tối.',
        mastered: false,
      },
      {
        id: 'jp-61-3',
        term: '会議',
        reading: 'かいぎ',
        romaji: 'kaigi',
        partOfSpeech: 'Danh từ',
        definition: 'Cuộc họp',
        example: 'Tham gia cuộc họp quan trọng.',
        mastered: false,
      },
      {
        id: 'jp-61-4',
        term: '誕生日',
        reading: 'たんじょうび',
        romaji: 'tanjoubi',
        partOfSpeech: 'Danh từ',
        definition: 'Ngày sinh nhật',
        example: 'Chúc mừng sinh nhật bạn!',
        mastered: false,
      },
      {
        id: 'jp-61-5',
        term: '枚',
        reading: 'まい',
        romaji: 'mai',
        partOfSpeech: 'Lượng từ',
        definition: 'Tờ, tấm (đếm vật mỏng)',
        example: 'Mua 2 tấm vé xem phim.',
        mastered: false,
      },
    ],
  },
  {
    id: 'jp-lesson-6-2',
    lessonCode: 'LESSON 6-2',
    title: '6-2: Ăn uống và giải trí',
    description: 'Học về đồ ăn, thức uống và các hoạt động giải trí',
    level: 'N5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timesPracticed: 2,
    cards: [
      {
        id: 'jp-62-1',
        term: 'ご飯',
        reading: 'ごはん',
        romaji: 'gohan',
        partOfSpeech: 'Danh từ',
        definition: 'Cơm, bữa ăn',
        example: 'Cùng nhau ăn cơm nhé.',
        mastered: false,
      },
      {
        id: 'jp-62-2',
        term: 'パン',
        reading: 'ぱん',
        romaji: 'pan',
        partOfSpeech: 'Danh từ',
        definition: 'Bánh mì',
        example: 'Ăn bánh mì vào buổi sáng.',
        mastered: false,
      },
      {
        id: 'jp-62-3',
        term: '肉',
        reading: 'にく',
        romaji: 'niku',
        partOfSpeech: 'Danh từ',
        definition: 'Thịt',
        example: 'Thịt bò nướng thơm ngon.',
        mastered: false,
      },
      {
        id: 'jp-62-4',
        term: '魚',
        reading: 'さかな',
        romaji: 'sakana',
        partOfSpeech: 'Danh từ',
        definition: 'Cá',
        example: 'Ăn cá tươi ngon.',
        mastered: false,
      },
      {
        id: 'jp-62-5',
        term: 'カラオケ',
        reading: 'からおけ',
        romaji: 'karaoke',
        partOfSpeech: 'Danh từ',
        definition: 'Hát Karaoke',
        example: 'Cuối tuần đi hát karaoke.',
        mastered: false,
      },
    ],
  },
  {
    id: 'jp-lesson-6-3',
    lessonCode: 'LESSON 6-3',
    title: '6-3: Ẩm thực Nhật',
    description: 'Học về các món ăn đặc trưng của Nhật Bản',
    level: 'N5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timesPracticed: 4,
    cards: [
      {
        id: 'jp-63-1',
        term: '寿司',
        reading: 'すし',
        romaji: 'sushi',
        partOfSpeech: 'Danh từ',
        definition: 'Món Sushi',
        example: 'Sushi cá hồi rất tươi ngon.',
        mastered: false,
      },
      {
        id: 'jp-63-2',
        term: 'ラーメン',
        reading: 'らーめん',
        romaji: 'raamen',
        partOfSpeech: 'Danh từ',
        definition: 'Mì Ramen',
        example: 'Thưởng thức tô mì Ramen nóng hổi.',
        mastered: false,
      },
      {
        id: 'jp-63-3',
        term: '天ぷら',
        reading: 'てんぷら',
        romaji: 'tenpura',
        partOfSpeech: 'Danh từ',
        definition: 'Món Tempura (chiên giòn)',
        example: 'Tempura tôm chiên vàng giòn.',
        mastered: false,
      },
      {
        id: 'jp-63-4',
        term: '刺身',
        reading: 'さしみ',
        romaji: 'sashimi',
        partOfSpeech: 'Danh từ',
        definition: 'Món Sashimi',
        example: 'Đĩa Sashimi hải sản cao cấp.',
        mastered: false,
      },
      {
        id: 'jp-63-5',
        term: '抹茶',
        reading: 'まっちゃ',
        romaji: 'matcha',
        partOfSpeech: 'Danh từ',
        definition: 'Trà xanh Matcha',
        example: 'Uống một tách trà xanh Matcha nguyên chất.',
        mastered: false,
      },
    ],
  },
];

export function getJapaneseLessons(): JapaneseLesson[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Start fresh with empty list so user adds their own lessons
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Failed to load Japanese lessons:', e);
    return [];
  }
}

export function saveJapaneseLesson(lesson: JapaneseLesson): JapaneseLesson[] {
  const current = getJapaneseLessons();
  const existsIndex = current.findIndex((l) => l.id === lesson.id);
  let updated: JapaneseLesson[];

  if (existsIndex >= 0) {
    updated = [...current];
    updated[existsIndex] = {
      ...lesson,
      updatedAt: new Date().toISOString(),
    };
  } else {
    updated = [
      {
        ...lesson,
        createdAt: lesson.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...current,
    ];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to persist Japanese lessons:', e);
  }
  return updated;
}

export function deleteJapaneseLesson(id: string): JapaneseLesson[] {
  const current = getJapaneseLessons();
  const updated = current.filter((l) => l.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete Japanese lesson:', e);
  }
  return updated;
}

export function clearAllLessons(): JapaneseLesson[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear all Japanese lessons:', e);
  }
  return [];
}

export function getJapaneseLessonById(id: string): JapaneseLesson | null {
  const lessons = getJapaneseLessons();
  return lessons.find((l) => l.id === id) || null;
}

export function updateJapaneseCardMastery(lessonId: string, cardId: string, mastered: boolean): void {
  const lessons = getJapaneseLessons();
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) return;

  const card = lesson.cards.find((c) => c.id === cardId);
  if (card) {
    card.mastered = mastered;
    saveJapaneseLesson(lesson);
  }
}

// ---------------------------------------------------------------------------
// Japanese Courses Management (e.g. JPD123)
// ---------------------------------------------------------------------------

export const DEFAULT_JPD123_COURSE: JapaneseCourse = {
  id: 'course-jpd123',
  code: 'JPD 123',
  title: 'Tiếng Nhật JPD 123 (Bài 4 - 7)',
  description: 'Khóa học tiếng Nhật JPD123 toàn diện - Tổng hợp Từ vựng, Chữ Hán, Ngữ pháp Bài 4-7 và Tài liệu học tập',
  level: 'N5',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lessons: JPD123_VOCAB_LESSONS,
  kanjiList: ALL_KANJI_CORE_LIST,
  kanjiVocabList: ALL_KANJI_VOCAB_LIST,
  grammarPoints: JPD123_GRAMMAR_POINTS,
  materials: JPD123_MATERIALS,
};

export function getJapaneseCourses(email?: string | null): JapaneseCourse[] {
  if (typeof window === 'undefined') return [];
  try {
    const targetEmail = (email !== undefined ? (email || '') : getCurrentUserEmail()).toLowerCase().trim();
    const isAdmin = isJapaneseAdmin(targetEmail);
    const userKey = getCoursesStorageKey(targetEmail);

    if (isAdmin) {
      let raw = localStorage.getItem(userKey);
      // Migrate from legacy global key if user key does not exist yet
      if (!raw) {
        const legacyRaw = localStorage.getItem(COURSES_STORAGE_KEY);
        if (legacyRaw) {
          raw = legacyRaw;
          localStorage.setItem(userKey, legacyRaw);
        }
      }

      if (!raw) {
        const initialList = [DEFAULT_JPD123_COURSE];
        localStorage.setItem(userKey, JSON.stringify(initialList));
        return initialList;
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure course-jpd123 has full data for Lessons 4-7
        let changed = false;
        const jpdCourse = parsed.find((c: JapaneseCourse) => c.id === 'course-jpd123');
        if (jpdCourse) {
          if (!jpdCourse.grammarPoints || jpdCourse.grammarPoints.length <= 1) {
            jpdCourse.grammarPoints = JPD123_GRAMMAR_POINTS;
            changed = true;
          } else {
            // Synchronize default grammar points if user has older version
            for (const defGp of JPD123_GRAMMAR_POINTS) {
              const existingIdx = jpdCourse.grammarPoints.findIndex((g: JapaneseGrammarPoint) => g.id === defGp.id);
              if (existingIdx !== -1) {
                const existing = jpdCourse.grammarPoints[existingIdx];
                if (
                  (defGp.id === 'g-b4-1' && !existing.structure.includes('Trả lời')) ||
                  (defGp.id === 'g-b4-2' && !existing.structure.includes('Danh từ')) ||
                  (defGp.id === 'g-b5-4' && !existing.structure.includes('Trả lời')) ||
                  (defGp.id === 'g-b6-2' && !existing.structure.includes('Đồng ý'))
                ) {
                  jpdCourse.grammarPoints[existingIdx] = {
                    ...existing,
                    structure: defGp.structure,
                    title: defGp.title,
                  };
                  changed = true;
                }
              }
            }
          }
          const hasOldKanjiLessons =
            !jpdCourse.lessons ||
            jpdCourse.lessons.length <= 4 ||
            jpdCourse.lessons.some((l: JapaneseLesson) => l.id.startsWith('lesson-jpd123-l'));
          if (hasOldKanjiLessons) {
            jpdCourse.lessons = JPD123_VOCAB_LESSONS;
            changed = true;
          }
          if (!jpdCourse.kanjiList || jpdCourse.kanjiList.length < ALL_KANJI_CORE_LIST.length) {
            jpdCourse.kanjiList = ALL_KANJI_CORE_LIST;
            changed = true;
          }
          if (!jpdCourse.kanjiVocabList || jpdCourse.kanjiVocabList.length < ALL_KANJI_VOCAB_LIST.length) {
            jpdCourse.kanjiVocabList = ALL_KANJI_VOCAB_LIST;
            changed = true;
          }
          if (jpdCourse.materials === undefined) {
            jpdCourse.materials = JPD123_MATERIALS;
            changed = true;
          } else {
            // Respect user-deleted materials: filter out any in deletedMaterialIds
            if (Array.isArray(jpdCourse.deletedMaterialIds) && jpdCourse.deletedMaterialIds.length > 0) {
              const beforeCount = jpdCourse.materials.length;
              jpdCourse.materials = jpdCourse.materials.filter(
                (m: JapaneseMaterial) => !jpdCourse.deletedMaterialIds.includes(m.id)
              );
              if (jpdCourse.materials.length !== beforeCount) {
                changed = true;
              }
            }
          }
        } else {
          // If course-jpd123 was not found in admin list, add it
          parsed.unshift(DEFAULT_JPD123_COURSE);
          changed = true;
        }
        if (changed) {
          localStorage.setItem(userKey, JSON.stringify(parsed));
        }
        return parsed;
      }
      const initialList = [DEFAULT_JPD123_COURSE];
      localStorage.setItem(userKey, JSON.stringify(initialList));
      return initialList;
    }

    // Non-admin account (or guest): Must NEVER have jpd123, completely empty by default!
    const raw = localStorage.getItem(userKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Clean out any JPD123 course if it was somehow copied or stored
      const sanitized = parsed.filter(
        (c: JapaneseCourse) =>
          c &&
          c.id !== 'course-jpd123' &&
          c.code?.toLowerCase().replace(/\s+/g, '') !== 'jpd123'
      );
      if (sanitized.length !== parsed.length) {
        localStorage.setItem(userKey, JSON.stringify(sanitized));
      }
      return sanitized;
    }

    return [];
  } catch (e) {
    console.error('Failed to load Japanese courses:', e);
    return [];
  }
}

export function saveJapaneseCourses(courses: JapaneseCourse[], email?: string | null, skipCloudSync = false): void {
  try {
    const targetEmail = (email !== undefined ? (email || '') : getCurrentUserEmail()).toLowerCase().trim();
    const isAdmin = isJapaneseAdmin(targetEmail);
    const userKey = getCoursesStorageKey(targetEmail);

    let toSave = courses;
    if (!isAdmin) {
      toSave = courses.filter(
        (c) =>
          c &&
          c.id !== 'course-jpd123' &&
          c.code?.toLowerCase().replace(/\s+/g, '') !== 'jpd123'
      );
    }
    localStorage.setItem(userKey, JSON.stringify(toSave));

    // Also sync to Cloud Firestore in background if not incoming from cloud
    if (!skipCloudSync) {
      for (const c of toSave) {
        syncJapaneseCourseToFirestore(c).catch(() => {});
      }
    }
  } catch (e) {
    console.error('Failed to save Japanese courses:', e);
  }
}

export function getJapaneseCourseById(id: string, email?: string | null): JapaneseCourse | null {
  const targetEmail = (email !== undefined ? (email || '') : getCurrentUserEmail()).toLowerCase().trim();
  const isAdmin = isJapaneseAdmin(targetEmail);

  if ((id === 'course-jpd123' || id.toLowerCase().includes('jpd123')) && !isAdmin) {
    return null;
  }

  const courses = getJapaneseCourses(targetEmail);
  return courses.find((c) => c.id === id) || null;
}

export function saveJapaneseCourse(course: JapaneseCourse, email?: string | null): JapaneseCourse[] {
  const targetEmail = (email !== undefined ? (email || '') : getCurrentUserEmail()).toLowerCase().trim();
  const isAdmin = isJapaneseAdmin(targetEmail);

  if ((course.id === 'course-jpd123' || course.code?.toLowerCase().replace(/\s+/g, '') === 'jpd123') && !isAdmin) {
    console.warn('Non-admin user cannot modify JPD123 course');
    return getJapaneseCourses(targetEmail);
  }

  const current = getJapaneseCourses(targetEmail);
  const idx = current.findIndex((c) => c.id === course.id);
  let updated: JapaneseCourse[];

  const formatted: JapaneseCourse = {
    ...course,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    updated = [...current];
    updated[idx] = formatted;
  } else {
    updated = [
      {
        ...formatted,
        createdAt: formatted.createdAt || new Date().toISOString(),
      },
      ...current,
    ];
  }

  saveJapaneseCourses(updated, targetEmail);
  // Guarantee Cloud Firestore receives the updated course
  syncJapaneseCourseToFirestore(formatted).catch(() => {});
  return updated;
}

export function deleteJapaneseCourse(courseId: string, email?: string | null): JapaneseCourse[] {
  const targetEmail = (email !== undefined ? (email || '') : getCurrentUserEmail()).toLowerCase().trim();
  const current = getJapaneseCourses(targetEmail);
  const updated = current.filter((c) => c.id !== courseId);
  saveJapaneseCourses(updated, targetEmail);
  deleteJapaneseCourseFromFirestore(courseId).catch(() => {});
  return updated;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

