import { convertRomajiToKana, katakanaToHiragana } from './japaneseKana';

/**
 * Comprehensive dictionary of Japanese Kanji words and compounds mapped to Hiragana readings.
 * Used for flexible answer matching in grammar practice:
 * ensures typing in either Kanji or Hiragana is recognized as 100% correct.
 */
export const KANJI_TO_HIRAGANA_DICT: Record<string, string> = {
  // Địa danh & Tên riêng
  '東京': 'とうきょう',
  '京都': 'きょうと',
  '大阪': 'おおさか',
  '富士山': 'ふじさん',
  '箱根': 'はこね',
  '千葉': 'ちば',
  '日本': 'にほん',
  'ベトナム': 'べとなむ',
  'ハノイ': 'はのい',
  'ホーチミン': 'ほーちみん',

  // Thời gian & Số đếm
  '時間': 'じかん',
  '分': 'ふん',
  '半': 'はん',
  '時': 'じ',
  '年': 'ねん',
  '月': 'がつ',
  '日': 'にち',
  '今日': 'きょう',
  '明日': 'あした',
  '昨日': 'きのう',
  '毎日': 'まいにち',
  '毎週': 'まいしゅう',
  '毎月': 'まいつき',
  '毎年': 'まいとし',
  '今週': 'こんしゅう',
  '先週': 'せんしゅう',
  '来週': 'らいしゅう',
  '今月': 'こんげつ',
  '先月': 'せんげつ',
  '来月': 'らいげつ',
  '今年': 'ことし',
  '去年': 'きょねん',
  '来年': 'らいねん',
  '朝': 'あさ',
  '昼': 'ひる',
  '晩': 'ばん',
  '夜': 'よる',
  '春': 'はる',
  '夏': 'なつ',
  '秋': 'あき',
  '冬': 'ふゆ',
  '何時': 'なんじ',
  '何分': 'なんぷん',
  '何日': 'なんにち',
  '何曜日': 'なんようび',
  '何月': 'なんがつ',

  // Trường học, công sở, địa điểm
  '学校': 'がっこう',
  '大学': 'だいがく',
  '高校': 'こうこう',
  '会社': 'かいしゃ',
  '銀行': 'ぎんこう',
  '病院': 'びょういん',
  '郵便局': 'ゆうびんきょく',
  '図書館': 'としょかん',
  '美術館': 'びじゅつかん',
  '教室': 'きょうしつ',
  '食堂': 'しょくどう',
  '事務所': 'じむしょ',
  '部屋': 'へや',
  '受付': 'うけつけ',
  '会議室': 'かいぎしつ',
  '町': 'まち',
  '山': 'やま',
  '川': 'かわ',
  '海': 'うみ',
  '駅': 'えき',
  '道': 'みち',
  '店': 'みせ',
  '家': 'いえ',
  '寺': 'てら',
  'お寺': 'おてら',
  '神社': 'じんじゃ',
  '教会': 'きょうかい',
  '温泉': 'おんせん',
  '公園': 'こうえん',
  '国': 'くに',
  '外国': 'がいこく',
  '場所': 'ばしょ',

  // Con người, xưng hô
  '私': 'わたし',
  '人': 'ひと',
  '男の人': 'おとこのひと',
  '女の人': 'おんなのひと',
  '男の子': 'おとこのこ',
  '女の子': 'おんなのこ',
  '子供': 'こども',
  '友だち': 'ともだち',
  '友達': 'ともだち',
  '家族': 'かぞく',
  '両親': 'りょうしん',
  '父': 'ちち',
  '母': 'はは',
  '兄': 'あに',
  '姉': 'あね',
  '弟': 'おとうと',
  '妹': 'いもうと',
  'お父さん': 'おとうさん',
  'お母さん': 'おかあさん',
  'お兄さん': 'おにいさん',
  'お姉さん': 'おねえさん',
  '先生': 'せんせい',
  '学生': 'がくせい',
  '留学生': 'りゅうがくせい',
  '医者': 'いしゃ',
  '社員': 'しゃいん',
  '誰': 'だれ',
  '何': 'なに',

  // Đồ vật, ăn uống, phương tiện
  '本': 'ほん',
  '辞書': 'じしょ',
  '雑誌': 'ざっし',
  '新聞': 'しんぶん',
  '手紙': 'てがみ',
  '切手': 'きって',
  '写真': 'しゃしん',
  '車': 'くるま',
  '自動車': 'じどうしゃ',
  '電車': 'でんしゃ',
  '地下鉄': 'ちかてつ',
  '新幹線': 'しんかんせん',
  '自転車': 'じてんしゃ',
  '飛行機': 'ひこうき',
  '船': 'ふね',
  '時計': 'とけい',
  '傘': 'かさ',
  '靴': 'くつ',
  '服': 'ふく',
  '鞄': 'かばん',
  'お金': 'おかね',
  '荷物': 'にもつ',
  '料理': 'りょうり',
  'ご飯': 'ごはん',
  '朝ご飯': 'あさごはん',
  '昼ご飯': 'ひるごはん',
  '晩ご飯': 'ばんごはん',
  '肉': 'にく',
  '魚': 'さかな',
  '野菜': 'やさい',
  '果物': 'くだもの',
  '水': 'みず',
  'お茶': 'おちゃ',
  '酒': 'さけ',
  'お酒': 'おさけ',
  '卵': 'たまご',
  'パン': 'ぱん',
  '薬': 'くすり',

  // Tính từ
  '大きい': 'おおきい',
  '小さい': 'ちいさい',
  '新しい': 'あたらしい',
  '古い': 'ふるい',
  '良い': 'いい',
  '悪い': 'わるい',
  '暑い': 'あつい',
  '熱い': 'あつい',
  '寒い': 'さむい',
  '冷たい': 'つめたい',
  '難しい': 'むずかしい',
  '易しい': 'やさしい',
  '高い': 'たかい',
  '安い': 'やすい',
  '低い': 'ひくい',
  '面白い': 'おもしろい',
  '美味しい': 'おいしい',
  '忙しい': 'いそがしい',
  '楽しい': 'たのしい',
  '白い': 'しろい',
  '黒い': 'くろい',
  '赤い': 'あかい',
  '青い': 'あおい',
  '近い': 'ちかい',
  '遠い': 'とおい',
  '速い': 'はやい',
  '早い': 'はやい',
  '遅い': 'おそい',
  '多い': 'おおい',
  '少ない': 'すくない',
  '暖かい': 'あたたかい',
  '涼しい': 'すずしい',
  '静か': 'しずか',
  '賑やか': 'にぎやか',
  '有名': 'ゆうめい',
  '親切': 'しんせつ',
  '元気': 'げんき',
  '暇': 'ひま',
  '便利': 'べんり',
  '素敵': 'すてき',
  '好き': 'すき',
  '嫌い': 'きらい',
  '上手': 'じょうず',
  '下手': 'へた',

  // Động từ các thể (thể ます, ました, ません, て, る, ない)
  '食べます': 'たべます',
  '食べました': 'たべました',
  '食べません': 'たべません',
  '食べませんでした': 'たべませんでした',
  '食べましょう': 'たべましょう',
  '食べませんか': 'たべませんか',
  '食べる': 'たべる',
  '食べて': 'たべて',
  '食べない': 'たべない',
  '飲みます': 'のみます',
  '飲みました': 'のみました',
  '飲みません': 'のみません',
  '飲む': 'のむ',
  '飲んで': 'のんで',
  '買います': 'かいます',
  '買いました': 'かいました',
  '買いません': 'かいません',
  '買う': 'かう',
  '買って': 'かって',
  '見ます': 'みます',
  '見ました': 'みました',
  '見ません': 'みません',
  '見る': 'みる',
  '見て': 'みて',
  '聞きます': 'ききます',
  '聞きました': 'ききました',
  '聞く': 'きく',
  '聞いて': 'きいて',
  '読みます': 'よみます',
  '読みました': 'よみました',
  '読む': 'よむ',
  '読んで': 'よんで',
  '書きます': 'かきます',
  '書きました': 'かきました',
  '書く': 'かく',
  '書いて': 'かいて',
  '行きます': 'いきます',
  '行きました': 'いきました',
  '行きません': 'いきません',
  '行く': 'いく',
  '行って': 'いって',
  '来ます': 'きます',
  '来ました': 'きました',
  '来ません': 'きません',
  '来る': 'くる',
  '来て': 'きて',
  '帰ります': 'かえります',
  '帰りました': 'かえりました',
  '帰る': 'かえる',
  '帰って': 'かえって',
  '会います': 'あいます',
  '会いました': 'あいました',
  '会う': 'あう',
  '会って': 'あって',
  '待ちます': 'まちます',
  '待つ': 'まつ',
  '待って': 'まって',
  '話します': 'はなします',
  '話す': 'はなす',
  '話して': 'はなして',
  '作ります': 'つくります',
  '作りました': 'つくりました',
  '作る': 'つくる',
  '作って': 'つくって',
  '教えます': 'おしえます',
  '教えました': 'おしえました',
  '習います': 'ならいます',
  '習いました': 'ならいました',
  '貸します': 'かします',
  '借ります': 'かります',
  '借りました': 'かりました',
  '送ります': 'おくります',
  '切ります': 'きります',
  '手伝います': 'てつだいます',
  '手伝いましょうか': 'てつだいましょうか',
  '取ります': 'とります',
  '撮ります': 'とります',
  '撮りました': 'とりました',
  '入ります': 'はいります',
  '入りました': 'はいりました',
  '出ます': 'でます',
  '出ました': 'でました',
  '勉強します': 'べんきょうします',
  '勉強しました': 'べんきょうしました',
  '散歩します': 'さんぽします',
  '買い物します': 'かいものします',
  '旅行します': 'りょこうします',
  '働きます': 'はたらきます',
  '働きました': 'はたらきました',
  '休みます': 'やすみます',
  '終わります': 'おわります',
  '始まります': 'はじまります',

  // Hoạt động & Từ vựng khác
  '読書': 'どくしょ',
  '映画': 'えいが',
  '音楽': 'おんがく',
  '趣味': 'しゅみ',
  '仕事': 'しごと',
  '電話': 'でんわ',
  '手紙を書きます': 'てがみをかきます',
  '写真をとります': 'しゃしんをとります',
  '写真を撮ります': 'しゃしんをとります',
  '天気': 'てんき',
  '雨': 'あめ',
  '雪': 'ゆき',
  '手': 'て',
  '目': 'め',
  '足': 'あし',
};

// Sort dictionary keys by length descending to ensure longer compounds are replaced first
const SORTED_KANJI_KEYS = Object.keys(KANJI_TO_HIRAGANA_DICT).sort(
  (a, b) => b.length - a.length
);

/**
 * Comprehensive dictionary of Japanese number and counter compounds (Arabic digits + Kanji) mapped to Hiragana.
 * Ensures typing "10分", "10ふん", "10ぷん", or "じゅっぷん" / "じっぷん" all match seamlessly!
 */
export const NUMBER_COUNTERS_TO_HIRAGANA: Record<string, string> = {
  // Khoảng thời gian: Phút (分, ぷん, ふん)
  '10分': 'じゅっぷん', '10ぷん': 'じゅっぷん', '10ふん': 'じゅっぷん', '十分': 'じゅっぷん',
  '20分': 'にじゅっぷん', '20ぷん': 'にじゅっぷん', '20ふん': 'にじゅっぷん', '二十分': 'にじゅっぷん',
  '30分': 'さんじゅっぷん', '30ぷん': 'さんじゅっぷん', '30ふん': 'さんじゅっぷん', '三十分': 'さんじゅっぷん',
  '40分': 'よんじゅっぷん', '40ぷん': 'よんじゅっぷん', '40ふん': 'よんじゅっぷん', '四十分': 'よんじゅっぷん',
  '50分': 'ごじゅっぷん', '50ぷん': 'ごじゅっぷん', '50ふん': 'ごじゅっぷん', '五十分': 'ごじゅっぷん',
  '15分': 'じゅうごふん', '15ぷん': 'じゅうごふん', '15ふん': 'じゅうごふん', '十五分': 'じゅうごふん',
  '25分': 'にじゅうごふん', '25ぷん': 'にじゅうごふん', '25ふん': 'にじゅうごふん', '二十五分': 'にじゅうごふん',
  '35分': 'さんじゅうごふん', '35ぷん': 'さんじゅうごふん', '35ふん': 'さんじゅうごふん',
  '45分': 'よんじゅうごふん', '45ぷん': 'よんじゅうごふん', '45ふん': 'よんじゅうごふん',
  '55分': 'ごじゅうごふん', '55ぷん': 'ごじゅうごふん', '55ふん': 'ごじゅうごふん',
  '1分': 'いっぷん', '1ぷん': 'いっぷん', '1ふん': 'いっぷん', '一分': 'いっぷん',
  '2分': 'にふん', '2ぷん': 'にふん', '2ふん': 'にふん', '二分': 'にふん',
  '3分': 'さんぷん', '3ぷん': 'さんぷん', '3ふん': 'さんぷん', '三分': 'さんぷん',
  '4分': 'よんぷん', '4ぷん': 'よんぷん', '4ふん': 'よんぷん', '四分': 'よんぷん',
  '5分': 'ごふん', '5ぷん': 'ごふん', '5ふん': 'ごふん', '五分': 'ごふん',
  '6分': 'ろっぷん', '6ぷん': 'ろっぷん', '6ふん': 'ろっぷん', '六分': 'ろっぷん',
  '7分': 'ななふん', '7ぷん': 'ななふん', '7ふん': 'ななふん', '七分': 'ななふん',
  '8分': 'はっぷん', '8ぷん': 'はっぷん', '8ふん': 'はっぷん', '八分': 'はっぷん',
  '9分': 'きゅうふん', '9ぷん': 'きゅうふん', '9ふん': 'きゅうふん', '九分': 'きゅうふん',

  // Khoảng thời gian: Tiếng / Giờ đồng hồ (時間, じかん)
  '1時間半': 'いちじかんはん', '1じかんはん': 'いちじかんはん', '一時間半': 'いちじかんはん',
  '2時間半': 'にじかんはん', '2じかんはん': 'にじかんはん', '二時間半': 'にじかんはん',
  '3時間半': 'さんじかんはん', '3じかんはん': 'さんじかんはん', '三時間半': 'さんじかんはん',
  '4時間半': 'よじかんはん', '4じかんはん': 'よじかんはん', '四時間半': 'よじかんはん',
  '5時間半': 'ごじかんはん', '5じかんはん': 'ごじかんはん', '五時間半': 'ごじかんはん',
  '1時間': 'いちじかん', '1じかん': 'いちじかん', '一時間': 'いちじかん',
  '2時間': 'にじかん', '2じかん': 'にじかん', '二時間': 'にじかん',
  '3時間': 'さんじかん', '3じかん': 'さんじかん', '三時間': 'さんじかん',
  '4時間': 'よじかん', '4じかん': 'よじかん', '四時間': 'よじかん',
  '5時間': 'ごじかん', '5じかん': 'ごじかん', '五時間': 'ごじかん',
  '6時間': 'ろくじかん', '6じかん': 'ろくじかん', '六時間': 'ろくじかん',
  '7時間': 'しちじかん', '7じかん': 'しちじかん', '七時間': 'しちじかん',
  '8時間': 'はちじかん', '8じかん': 'はちじかん', '八時間': 'はちじかん',
  '9時間': 'くじかん', '9じかん': 'くじかん', '九時間': 'くじかん',
  '10時間': 'じゅうじかん', '10じかん': 'じゅうじかん', '十時間': 'じゅうじかん',

  // Giờ thời khắc (時, じ)
  '1時半': 'いちじはん', '1じはん': 'いちじはん', '一時半': 'いちじはん',
  '2時半': 'にじはん', '2じはん': 'にじはん', '二時半': 'にじはん',
  '3時半': 'さんじはん', '3じはん': 'さんじはん', '三時半': 'さんじはん',
  '4時半': 'よじはん', '4じはん': 'よじはん', '四時半': 'よじはん',
  '5時半': 'ごじはん', '5じはん': 'ごじはん', '五時半': 'ごじはん',
  '6時半': 'ろくじはん', '6じはん': 'ろくじはん', '六時半': 'ろくじはん',
  '7時半': 'しちじはん', '7じはん': 'しちじはん', '七時半': 'しちじはん',
  '8時半': 'はちじはん', '8じはん': 'はちじはん', '八時半': 'はちじはん',
  '9時半': 'くじはん', '9じはん': 'くじはん', '九時半': 'くじはん',
  '10時半': 'じゅうじはん', '10じはん': 'じゅうじはん', '十時半': 'じゅうじはん',
  '11時半': 'じゅういちじはん', '11じはん': 'じゅういちじはん', '十一時半': 'じゅういちじはん',
  '12時半': 'じゅうにじはん', '12じはん': 'じゅうにじはん', '十二時半': 'じゅうにじはん',
  '1時': 'いちじ', '1じ': 'いちじ', '一時': 'いちじ',
  '2時': 'にじ', '2じ': 'にじ', '二時': 'にじ',
  '3時': 'さんじ', '3じ': 'さんじ', '三時': 'さんじ',
  '4時': 'よじ', '4じ': 'よじ', '四時': 'よじ',
  '5時': 'ごじ', '5じ': 'ごじ', '五時': 'ごじ',
  '6時': 'ろくじ', '6じ': 'ろくじ', '六時': 'ろくじ',
  '7時': 'しちじ', '7じ': 'しちじ', '七時': 'しちじ',
  '8時': 'はちじ', '8じ': 'はちじ', '八時': 'はちじ',
  '9時': 'くじ', '9じ': 'くじ', '九時': 'くじ',
  '10時': 'じゅうじ', '10じ': 'じゅうじ', '十時': 'じゅうじ',
  '11時': 'じゅういちじ', '11じ': 'じゅういちじ', '十一時': 'じゅういちじ',
  '12時': 'じゅうにじ', '12じ': 'じゅうにじ', '十二時': 'じゅうにじ',

  // Đếm ngày trong tháng (日, にち, か)
  '1日': 'ついたち', '一日': 'ついたち',
  '2日': 'ふつか', '二日': 'ふつか',
  '3日': 'みっか', '三日': 'みっか',
  '4日': 'よっか', '四日': 'よっか',
  '5日': 'いつか', '五日': 'いつか',
  '6日': 'むいか', '六日': 'むいか',
  '7日': 'なのか', '七日': 'なのか',
  '8日': 'ようか', '八日': 'ようか',
  '9日': 'ここのか', '九日': 'ここのか',
  '10日': 'とおか', '十日': 'とおか',
  '14日': 'じゅうよっか', '十四日': 'じゅうよっか',
  '20日': 'はつか', '二十日': 'はつか',
  '24日': 'にじゅうよっか', '二十四日': 'にじゅうよっか',

  // Tháng (月, がつ)
  '1月': 'いちがつ', '2月': 'にがつ', '3月': 'さんがつ', '4月': 'しがつ',
  '5月': 'ごがつ', '6月': 'ろくがつ', '7月': 'しちがつ', '8月': 'はちがつ',
  '9月': 'くがつ', '10月': 'じゅうがつ', '11月': 'じゅういちがつ', '12月': 'じゅうにがつ',

  // Đếm đồ vật (つ)
  '1つ': 'ひとつ', '一つ': 'ひとつ',
  '2つ': 'ふたつ', '二つ': 'ふたつ',
  '3つ': 'みっつ', '三つ': 'みっつ',
  '4つ': 'よっつ', '四つ': 'よっつ',
  '5つ': 'いつつ', '五つ': 'いつつ',
  '6つ': 'むっつ', '六つ': 'むっつ',
  '7つ': 'ななつ', '七つ': 'ななつ',
  '8つ': 'やっつ', '八つ': 'やっつ',
  '9つ': 'ここのつ', '九つ': 'ここのつ',

  // Đếm người (人, にん, り)
  '1人': 'ひとり', '一人': 'ひとり',
  '2人': 'ふたり', '二人': 'ふたり',
  '3人': 'さんにん', '三人': 'さんにん',
  '4人': 'よにん', '四人': 'よにん',
  '5人': 'ごにん', '五人': 'ごにん',

  // Tuổi (歳, 才, さい)
  '20歳': 'はたち', '20才': 'はたち', '二十歳': 'はたち',
  '1歳': 'いっさい', '1才': 'いっさい', '一歳': 'いっさい',
  '8歳': 'はっさい', '8才': 'はっさい', '八歳': 'はっさい',
  '10歳': 'じゅっさい', '10才': 'じゅっさい', '十歳': 'じゅっさい',

  // Chữ số đơn lẻ
  '100': 'ひゃく',
  '10': 'じゅう',
  '1': 'いち', '2': 'に', '3': 'さん', '4': 'よん', '5': 'ご',
  '6': 'ろく', '7': 'なな', '8': 'はち', '9': 'きゅう', '0': 'ぜろ',
  '一': 'いち', '二': 'に', '三': 'さん', '四': 'よん', '五': 'ご',
  '六': 'ろく', '七': 'なな', '八': 'はち', '九': 'きゅう', '十': 'じゅう',
};

const SORTED_NUMBER_COUNTER_KEYS = Object.keys(NUMBER_COUNTERS_TO_HIRAGANA).sort(
  (a, b) => b.length - a.length
);

export function convertNumbersAndCountersToHiragana(sentence: string): string {
  if (!sentence) return '';
  let result = sentence;
  for (const key of SORTED_NUMBER_COUNTER_KEYS) {
    if (result.includes(key)) {
      result = result.split(key).join(NUMBER_COUNTERS_TO_HIRAGANA[key]);
    }
  }
  return result;
}

export function normalizePhoneticVariations(str: string): string {
  if (!str) return '';
  return str
    // 10 phút, 20 phút, 30 phút... cho phép cả じっぷん lẫn じゅっぷん
    .replace(/じっぷん/g, 'じゅっぷん')
    // 7 giờ, 7 tiếng cho phép cả ななじ / しちじ
    .replace(/ななじかん/g, 'しちじかん')
    .replace(/ななじ/g, 'しちじ')
    // 7 phút: しちふん / ななふん
    .replace(/しちふん/g, 'ななふん')
    // 8 phút: はちふん / はっぷん
    .replace(/はちふん/g, 'はっぷん')
    // 9 giờ: きゅうじ -> くじ
    .replace(/きゅうじ/g, 'くじ')
    // 4 giờ: よんじ -> よじ
    .replace(/よんじ/g, 'よじ');
}

/**
 * Converts all known Kanji words/compounds and numbers/counters in a sentence to Hiragana.
 * Leaves Hiragana, Katakana, and Romaji intact.
 */
export function convertKanjiToHiragana(sentence: string): string {
  if (!sentence) return '';
  let result = sentence;
  // Convert number + counter combinations first (longer patterns first)!
  result = convertNumbersAndCountersToHiragana(result);
  for (const kanji of SORTED_KANJI_KEYS) {
    if (result.includes(kanji)) {
      result = result.split(kanji).join(KANJI_TO_HIRAGANA_DICT[kanji]);
    }
  }
  return result;
}

/**
 * Normalizes Japanese text for grammar comparison:
 * - Converts Kanji and numbers/counters to Hiragana
 * - Converts Katakana to Hiragana for flexible matching
 * - Normalizes phonetic variations (e.g. じっぷん vs じゅっぷん)
 * - Removes tildes (~, ～, 〜)
 * - Removes spaces and Japanese/English punctuation (。, 、, ?, !, :, ;)
 */
export function normalizeGrammarText(str: string): string {
  if (!str) return '';

  // 0. Unicode NFKC normalization (turns fullwidth ＡＴＭ into ATM, etc.)
  let s = str.normalize('NFKC');

  // Handle common Romaji typing artifacts like "あtm" -> "atm" or "ATM"
  // When typing in Hiragana IME, typing "a" becomes "あ", and then "tm" stays as "tm", resulting in "あtm"
  s = s.replace(/あtm/gi, 'atm');

  // 1. Convert Kanji and numbers/counters to Hiragana
  s = convertKanjiToHiragana(s);

  // 2. Convert Katakana to Hiragana so both Katakana and Hiragana match seamlessly!
  s = katakanaToHiragana(s);

  // 3. Normalize phonetic variations (e.g. じっぷん <-> じゅっぷん)
  s = normalizePhoneticVariations(s);

  // 4. Remove tildes and wave dashes
  s = s.replace(/[~～〜⁓〰^]/g, '');

  // 5. Remove punctuation, dialogue tags, and whitespaces
  s = s.replace(/^[AB][：:]\s*/i, '');
  s = s.replace(/[\s\-_—–.,/／()（）[\]{}<>《》「」『』・、。!?:;"'‘’“”]/g, '');

  return s.trim().toLowerCase();
}

/**
 * Strips polite / declarative sentence endings (です, だ, 。) for flexible dialogue matching.
 * E.g., user can type either "にぎやかなまち" or "にぎやかなまちです" for line B.
 */
export function stripPoliteEndings(str: string): string {
  let s = str.trim();
  // Strip ending punctuation
  s = s.replace(/[。？！?!.]+$/g, '');
  // Strip ending desu / da / desuka
  s = s.replace(/(ですか|でした|です|だ|よ|ね)$/g, '');
  return s.trim();
}

/**
 * Checks if user answer matches target Japanese sentence.
 * Supports:
 * - Typing in Kanji (matches directly or via dictionary)
 * - Typing in Hiragana or Katakana interchangeably
 * - Typing in Romaji (matches via convertRomajiToKana)
 * - Optional polite endings like "です", "だ", or omitting them
 * - Flexible long vowels (ー)
 */
export function checkGrammarSentenceAnswer(
  userInput: string,
  targetSentence: string,
  allowOmitDesu: boolean = true
): boolean {
  if (!userInput.trim() || !targetSentence.trim()) return false;

  // Clean speaker prefixes like A： or B： from user input if present
  const cleanInput = userInput.replace(/^[AB][：:]\s*/i, '').trim();

  // Convert user input (handles Romaji typing)
  const userDirect = normalizeGrammarText(cleanInput);
  const userHira = normalizeGrammarText(convertRomajiToKana(cleanInput, 'hiragana'));
  const userKata = normalizeGrammarText(convertRomajiToKana(cleanInput, 'katakana'));

  // Target normalized
  const targetNorm = normalizeGrammarText(targetSentence);

  // Direct check
  if (userDirect === targetNorm || userHira === targetNorm || userKata === targetNorm) {
    return true;
  }

  // Also check without Kanji conversion in case target has Kanji and user typed exact Kanji
  const rawTargetNorm = targetSentence
    .replace(/[~～〜⁓〰^]/g, '')
    .replace(/^[AB][：:]\s*/i, '')
    .replace(/[\s\-_—–.,/／()（）[\]{}<>《》「」『』・、。!?:;"'‘’“”]/g, '')
    .trim()
    .toLowerCase();

  if (userDirect === rawTargetNorm || userHira === rawTargetNorm || userKata === rawTargetNorm) {
    return true;
  }

  // Also check with long vowel mark (ー) ignored
  if (
    userDirect.replace(/ー/g, '') === targetNorm.replace(/ー/g, '') ||
    userHira.replace(/ー/g, '') === targetNorm.replace(/ー/g, '')
  ) {
    return true;
  }

  // Check with flexible endings (e.g. omitting です, だ, ね, よ)
  if (allowOmitDesu) {
    const targetStripped = normalizeGrammarText(stripPoliteEndings(targetSentence));
    const userDirectStripped = normalizeGrammarText(stripPoliteEndings(cleanInput));
    const userHiraStripped = normalizeGrammarText(
      stripPoliteEndings(convertRomajiToKana(cleanInput, 'hiragana'))
    );

    if (
      userDirect === targetStripped ||
      userHira === targetStripped ||
      userDirectStripped === targetStripped ||
      userHiraStripped === targetStripped ||
      userDirectStripped.replace(/ー/g, '') === targetStripped.replace(/ー/g, '') ||
      userHiraStripped.replace(/ー/g, '') === targetStripped.replace(/ー/g, '')
    ) {
      return true;
    }
  }

  return false;
}

export interface ParsedDialogue {
  isDialogue: boolean;
  partA?: {
    japanese: string;
    vietnamese: string;
  };
  partB?: {
    japanese: string;
    vietnamese: string;
  };
  singleJa?: string;
  singleVi?: string;
}

/**
 * Parses an example into dialogue parts (A and B) or a single sentence.
 */
export function parseDialogueExample(japanese: string, vietnamese: string): ParsedDialogue {
  const isDialogue =
    japanese.includes('A：') ||
    japanese.includes('A:') ||
    japanese.includes('/ B：') ||
    japanese.includes('/ B:');

  if (!isDialogue) {
    return {
      isDialogue: false,
      singleJa: japanese.trim(),
      singleVi: vietnamese.trim(),
    };
  }

  // Split Japanese by / B: or / B：
  const jaParts = japanese.split(/\s*[/／]\s*(?=B[：:])/i);
  let jaA = (jaParts[0] || '').replace(/^A[：:]\s*/i, '').trim();
  let jaB = (jaParts[1] || '').replace(/^B[：:]\s*/i, '').trim();

  // Parse Vietnamese
  let viA = '';
  let viB = '';

  if (vietnamese.includes('/ B:') || vietnamese.includes('/ B：') || vietnamese.includes('B:')) {
    const viParts = vietnamese.split(/\s*[/／]?\s*(?=B[：:])/i);
    viA = (viParts[0] || '').replace(/^A[：:]\s*/i, '').trim();
    viB = (viParts[1] || '').replace(/^B[：:]\s*/i, '').trim();
  } else if (vietnamese.includes('?')) {
    // Split by question mark if A is question and B is answer
    const qIdx = vietnamese.indexOf('?');
    viA = vietnamese.substring(0, qIdx + 1).replace(/^A[：:]\s*/i, '').trim();
    viB = vietnamese.substring(qIdx + 1).replace(/^B[：:]\s*/i, '').trim();
  } else {
    viA = vietnamese;
    viB = '';
  }

  return {
    isDialogue: true,
    partA: {
      japanese: jaA,
      vietnamese: viA || vietnamese,
    },
    partB: {
      japanese: jaB,
      vietnamese: viB || '',
    },
  };
}
