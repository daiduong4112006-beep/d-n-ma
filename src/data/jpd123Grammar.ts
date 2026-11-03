import { JapaneseGrammarPoint, GrammarExample } from '../types/japanese';

export type { JapaneseGrammarPoint };

/**
 * Ngữ pháp JPD123 (Bài 4 – 7) – dựng lại theo tài liệu "Tổng hợp ngữ pháp JPD123" (AnhNH88).
 * Ví dụ có `extra: true` là ví dụ bổ sung, không có trong tài liệu gốc.
 * Cấu trúc: dòng bắt đầu bằng （？）（＋）（ー） là Câu hỏi / Khẳng định / Phủ định;
 * ~~x~~ là phần bị gạch bỏ khi chia (vd. A ~~い~~くないです).
 */
const RAW: Omit<JapaneseGrammarPoint, 'createdAt' | 'updatedAt'>[] = [
  {
    "id": "g-b4-1",
    "lessonTag": "Bài 4",
    "title": "1. Hỏi quãng đường đi từ A → B hết bao lâu (4.1)",
    "meaning": "Đi từ A đến B (bằng phương tiện gì) hết bao lâu? – Hết khoảng …",
    "structure": "（？）A から B まで [Phương tiện で] どのくらいですか。\n（＋）Lượng thời gian です。",
    "examples": [
      {
        "japanese": "A：ハノイから ホーチミンまで ひこうきで どのくらいですか。 / B：1じかんはんくらいです。",
        "vietnamese": "Đi từ HN đến HCM bằng máy bay hết bao lâu? – Hết khoảng 1 tiếng rưỡi."
      },
      {
        "japanese": "とうきょうから ちばまで でんしゃで ２時間くらいです。",
        "vietnamese": "Đi từ Tokyo đến Chiba bằng tàu điện hết khoảng 2 tiếng."
      },
      {
        "japanese": "うちから 学校まで じてんしゃで ３０分くらいです。",
        "vietnamese": "Đi từ nhà đến trường bằng xe đạp hết khoảng 30 phút."
      },
      {
        "japanese": "会社から ぎんこうまで あるいて 15分です。",
        "vietnamese": "Đi bộ từ công ty đến ngân hàng hết 15 phút."
      },
      {
        "japanese": "A：うちから えきまで あるいて どのくらいですか。 / B：10ぷんくらいです。",
        "vietnamese": "Từ nhà đến ga đi bộ hết bao lâu? – Hết khoảng 10 phút.",
        "extra": true
      },
      {
        "japanese": "とうきょうから きょうとまで しんかんせんで 2じかんはんくらいです。",
        "vietnamese": "Từ Tokyo đến Kyoto bằng tàu Shinkansen hết khoảng 2 tiếng rưỡi.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b4-2",
    "lessonTag": "Bài 4",
    "title": "2. Ở đâu có cái gì? (4.1)",
    "meaning": "Ở (địa điểm) có N.",
    "structure": "Địa điểm に N が あります。",
    "notes": [
      "『あります』 chỉ dùng với đồ vật, sự vật, sự kiện... Không được dùng với người hoặc con vật."
    ],
    "examples": [
      {
        "japanese": "A：はこねに なにが ありますか。 / B：きれいな おんせんが あります。",
        "vietnamese": "Ở Hakone có cái gì? – Có suối nước nóng đẹp."
      },
      {
        "japanese": "A：どこに いい本が ありますか。 / B：大学の としょかんに あります。",
        "vietnamese": "Ở đâu có sách hay? – Ở thư viện trường đại học."
      },
      {
        "japanese": "ここに いろいろな 料理が あります。",
        "vietnamese": "Ở đây có nhiều món ăn khác nhau."
      },
      {
        "japanese": "このまちに みどりが たくさん あります。",
        "vietnamese": "Ở thành phố này có nhiều cây xanh."
      },
      {
        "japanese": "東京に おおきいこうえんや きれいなデパートが あります。",
        "vietnamese": "Ở Tokyo có công viên to và trung tâm thương mại đẹp."
      },
      {
        "japanese": "へやに つくえと いすが あります。",
        "vietnamese": "Trong phòng có bàn và ghế.",
        "extra": true
      },
      {
        "japanese": "A：えきの ちかくに なにが ありますか。 / B：コンビニが あります。",
        "vietnamese": "Gần nhà ga có cái gì? – Có cửa hàng tiện lợi.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b4-3",
    "lessonTag": "Bài 4",
    "title": "3. Miêu tả sự vật, sự việc (4.2)",
    "meaning": "S như thế nào? – S (thì) … / S không …",
    "structure": "（？）S は どうですか。→ S như thế nào?\n（＋）[S は] A いです。／ A ~~な~~です。\n（ー）[S は] A ~~い~~くないです。／ A ~~な~~じゃありません。",
    "notes": [
      "Tính từ 「いい」 chia về dạng phủ định sẽ thành 「よくない」."
    ],
    "examples": [
      {
        "japanese": "A：FPT大学は どうですか。 / B：おおきいです。",
        "vietnamese": "Trường FPT như thế nào? – Trường lớn (to)."
      },
      {
        "japanese": "A：このおてらは どうですか。 / B：きれいです。",
        "vietnamese": "Ngôi chùa này như thế nào? – Chùa này đẹp."
      },
      {
        "japanese": "今日は あついですね。",
        "vietnamese": "Hôm nay nóng nhỉ."
      },
      {
        "japanese": "はこねの おんせんは ゆうめいです。",
        "vietnamese": "Suối nước nóng ở Hakone nổi tiếng."
      },
      {
        "japanese": "そのパソコンは よくないですね。",
        "vietnamese": "Cái laptop đó không tốt nhỉ."
      },
      {
        "japanese": "ハノイは しずかじゃありません。",
        "vietnamese": "HN không yên tĩnh."
      },
      {
        "japanese": "このけいたいでんわは あたらしくないです。",
        "vietnamese": "Cái ĐTDĐ này không mới."
      },
      {
        "japanese": "私の まちは にぎやかじゃありません。",
        "vietnamese": "Thành phố của tôi không náo nhiệt."
      },
      {
        "japanese": "この本は おもしろいです。",
        "vietnamese": "Quyển sách này thú vị.",
        "extra": true
      },
      {
        "japanese": "わたしの へやは ひろくないです。",
        "vietnamese": "Phòng của tôi không rộng.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b4-4",
    "lessonTag": "Bài 4",
    "title": "4. Tính từ bổ nghĩa cho Danh từ (4.2)",
    "meaning": "Tính từ đứng trước bổ nghĩa cho danh từ: N (mang tính chất) A.",
    "structure": "A い N\nA な＋な N",
    "notes": [
      "Khi Tính từ bổ nghĩa cho Danh từ thì cả cụm đó sẽ trở thành một cụm Danh từ, có thể sử dụng linh hoạt ở nhiều vị trí trong câu."
    ],
    "examples": [
      {
        "japanese": "これは あたらしいパソコンです。",
        "vietnamese": "Đây là cái máy tính mới."
      },
      {
        "japanese": "ふるい本は 私のです。",
        "vietnamese": "Quyển sách cũ là của tôi."
      },
      {
        "japanese": "「まつや」は ゆうめいな レストランです。",
        "vietnamese": "Matsuya là một nhà hàng nổi tiếng."
      },
      {
        "japanese": "おいしいパンを 食べました。",
        "vietnamese": "Tôi đã ăn bánh mì ngon."
      },
      {
        "japanese": "毎日、しずかなところで べんきょうします。",
        "vietnamese": "Hằng ngày, tôi đều học ở nơi yên tĩnh."
      },
      {
        "japanese": "来月、かぞくと ゆうめいな おんせんに はいります。",
        "vietnamese": "Tháng sau, tôi sẽ đi tắm suối nước nóng nổi tiếng cùng với gia đình."
      },
      {
        "japanese": "私のまちは ふるいきょうかいや ゆうめいな びじゅつかんが たくさん あります。",
        "vietnamese": "Thành phố của tôi có nhiều nhà thờ cổ và bảo tàng mỹ thuật nổi tiếng."
      },
      {
        "japanese": "きれいな はなを かいました。",
        "vietnamese": "Tôi đã mua hoa đẹp.",
        "extra": true
      }
    ],
    "sections": [
      {
        "title": "※ Phân biệt từ để hỏi 『どう』 và 『どんな』",
        "columns": [
          {
            "title": "『どう』",
            "lines": [
              "（？）S は どうですか。→ S như thế nào?",
              "(có thể đi trực tiếp với ですか)"
            ],
            "examples": [
              {
                "japanese": "A：東京は どうですか。 / B：にぎやかです。",
                "vietnamese": "Tokyo như thế nào? – Tokyo náo nhiệt."
              },
              {
                "japanese": "A：ふじさんは どうですか。 / B：たかいです。",
                "vietnamese": "Núi Phú Sĩ như thế nào? – Núi Phú Sĩ cao."
              }
            ]
          },
          {
            "title": "『どんな』",
            "lines": [
              "（？）S は どんな N ですか。→ S là N như thế nào?",
              "(luôn phải kết hợp với Danh từ để trở nên có nghĩa)"
            ],
            "examples": [
              {
                "japanese": "A：東京は どんなまちですか。 / B：にぎやかなまちです。",
                "vietnamese": "Tokyo là thành phố như thế nào? – Tokyo là thành phố náo nhiệt."
              },
              {
                "japanese": "A：ふじさんは どんなやまですか。 / B：たかいやまです。",
                "vietnamese": "Núi Phú Sĩ là ngọn núi như thế nào? – Núi Phú Sĩ là ngọn núi cao."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "g-b4-5",
    "lessonTag": "Bài 4",
    "title": "5. Nối hai câu: 『A và B』, 『A nhưng mà B』 (4.2)",
    "meaning": "Nối hai câu/mệnh đề: A và B (そして) – A nhưng B (が).",
    "structure": "",
    "usage": "Trong đó A và B là hai câu văn / mệnh đề.",
    "examples": [],
    "sections": [
      {
        "title": "『A và B』",
        "structure": "＿＿Mệnh đề 1＿＿。そして、＿＿Mệnh đề 2＿＿。",
        "examples": [
          {
            "japanese": "このおんせんは きれいです。そして、ゆうめいです。",
            "vietnamese": "Suối nước nóng này đẹp và nổi tiếng."
          },
          {
            "japanese": "そのパソコンは ふるいです。そして、よくないです。",
            "vietnamese": "Cái máy tính đó cũ và không tốt."
          },
          {
            "japanese": "私のまちは みどりが おおいです。そして、ゆうめいなおんせんが あります。",
            "vietnamese": "Thành phố của tôi nhiều cây xanh và có suối nước nóng nổi tiếng."
          },
          {
            "japanese": "このレストランは やすいです。そして、おいしいです。",
            "vietnamese": "Nhà hàng này rẻ và ngon.",
            "extra": true
          }
        ]
      },
      {
        "title": "『A nhưng B』",
        "structure": "＿＿Mệnh đề 1＿＿が、＿＿Mệnh đề 2＿＿。",
        "examples": [
          {
            "japanese": "このおんせんは きれいですが、人が すくないです。",
            "vietnamese": "Suối nước nóng này đẹp nhưng vắng người."
          },
          {
            "japanese": "今日は てんきが いいですが、すこしさむいです。",
            "vietnamese": "Thời tiết hôm nay đẹp nhưng hơi lạnh."
          },
          {
            "japanese": "私のまちは ちいさいですが、にぎやかです。",
            "vietnamese": "Thành phố của tôi nhỏ nhưng nhộn nhịp."
          },
          {
            "japanese": "日本語は むずかしいですが、おもしろいです。",
            "vietnamese": "Tiếng Nhật khó nhưng thú vị.",
            "extra": true
          }
        ]
      },
      {
        "title": "※ Phân biệt với 『と』 và 『や』: nối 2 Danh từ",
        "columns": [
          {
            "title": "『A と B』",
            "lines": [
              "→ A và B (liệt kê hết)"
            ],
            "examples": [
              {
                "japanese": "私の しゅみは どくしょと えいがです。",
                "vietnamese": "Sở thích của tôi là đọc sách và xem phim."
              },
              {
                "japanese": "まいあさ、パンと たまごを 食べます。",
                "vietnamese": "Hằng sáng, tôi ăn bánh mì và trứng."
              },
              {
                "japanese": "つくえに ほんと パソコンが あります。",
                "vietnamese": "Ở trên bàn có sách và laptop."
              }
            ]
          },
          {
            "title": "『A や B（など）』",
            "lines": [
              "→ A và B... v.v. (liệt kê tiêu biểu, ngoài A và B ra thì còn nhiều thứ khác)"
            ],
            "examples": [
              {
                "japanese": "まいばん、ごはんや にくなどを 食べます。",
                "vietnamese": "Hằng tối, tôi ăn cơm và thịt (v.v.)"
              },
              {
                "japanese": "ハノイに ゆうめいなおてらや きれいな きょうかいが あります。",
                "vietnamese": "Ở HN có chùa nổi tiếng và nhà thờ đẹp (v.v.)"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "g-b4-6",
    "lessonTag": "Bài 4",
    "title": "6. Cách sử dụng các phó từ 『すこし』・『とても』・『あまり』 (4.3)",
    "meaning": "すこし: hơi, một chút – とても: rất – あまり: không … lắm.",
    "structure": "",
    "examples": [],
    "sections": [
      {
        "title": "『すこし』: hơi, một chút...; 『とても』: rất...",
        "usage": "Luôn kết hợp với dạng Khẳng định.",
        "structure": "すこし ／ とても ＋ A いです。／ A ~~な~~です。",
        "examples": [
          {
            "japanese": "今日は すこしさむいですね。",
            "vietnamese": "Hôm nay hơi lạnh nhỉ."
          },
          {
            "japanese": "あの人は とてもゆうめいです。",
            "vietnamese": "Người đó rất nổi tiếng."
          },
          {
            "japanese": "このカレーは すこし からいです。",
            "vietnamese": "Món cà ri này hơi cay.",
            "extra": true
          },
          {
            "japanese": "ふじさんは とても きれいです。",
            "vietnamese": "Núi Phú Sĩ rất đẹp.",
            "extra": true
          }
        ]
      },
      {
        "title": "『あまり』: không... lắm",
        "usage": "Luôn kết hợp với dạng Phủ định.",
        "structure": "あまり ＋ A ~~い~~くないです。／ A ~~な~~じゃありません。",
        "examples": [
          {
            "japanese": "ハノイは 9月、あまりすずしくないです。",
            "vietnamese": "HN vào tháng 9 không mát lắm."
          },
          {
            "japanese": "ここは あまりきれいじゃありません。",
            "vietnamese": "Chỗ này không đẹp lắm."
          },
          {
            "japanese": "この本は あまり おもしろくないです。",
            "vietnamese": "Quyển sách này không thú vị lắm.",
            "extra": true
          }
        ]
      }
    ]
  },
  {
    "id": "g-b5-1",
    "lessonTag": "Bài 5",
    "title": "1. Phân biệt 『Nghi vấn từ』 & 『Nghi vấn từ ＋ か』 (5.1)",
    "meaning": "なに / だれ / どこ / いつ (từ để hỏi) khác với なにか / だれか / どこか / いつか (cái gì đó, ai đó…).",
    "structure": "",
    "examples": [],
    "sections": [
      {
        "columns": [
          {
            "title": "『Nghi vấn từ』",
            "lines": [
              "なに：cái gì",
              "だれ：ai",
              "どこ：ở đâu",
              "いつ：khi nào",
              "→ Chỉ sử dụng trong câu hỏi với vai trò \"Từ để hỏi\" (Nghi vấn từ)."
            ]
          },
          {
            "title": "『Nghi vấn từ ＋ か』",
            "lines": [
              "なにか：cái gì đó",
              "だれか：ai đó",
              "どこか：ở đâu đó, chỗ nào đó",
              "いつか：khi nào đó",
              "→ Sử dụng trong cả câu hỏi và câu trần thuật như một Danh từ (danh từ không xác định)."
            ]
          }
        ]
      },
      {
        "title": "* Trong câu hỏi",
        "columns": [
          {
            "title": "『Nghi vấn từ』",
            "lines": [
              "→ Câu trả lời luôn mang nội dung, đáp án cụ thể."
            ],
            "examples": [
              {
                "japanese": "A：まいあさ、なにを 食べますか。 / B：パンと たまごを 食べます。",
                "vietnamese": "Mỗi sáng bạn hay ăn cái gì thế? – Tôi ăn bánh mì và trứng."
              },
              {
                "japanese": "A：あした、だれに 会いますか。 / B：ともだちに 会います。",
                "vietnamese": "Ngày mai, bạn sẽ gặp ai? – Tôi gặp bạn."
              },
              {
                "japanese": "A：日曜日、どこへ 行きますか。 / B：ほんやへ 行きます。",
                "vietnamese": "Chủ Nhật bạn sẽ đi đâu? – Tôi đi hiệu sách."
              }
            ]
          },
          {
            "title": "『Nghi vấn từ ＋ か』",
            "lines": [
              "→ Câu trả lời là 『はい』 hoặc 『いいえ』 (có thể bổ sung thêm nội dung cụ thể ở phía sau)."
            ],
            "examples": [
              {
                "japanese": "A：まいあさ、なにかを 食べますか。 / B：はい。(パンと たまごを 食べます。)",
                "vietnamese": "Mỗi sáng bạn có ăn gì không? – Có. (Tôi ăn bánh mì và trứng.)"
              },
              {
                "japanese": "A：あした、だれかに 会いますか。 / B：はい。ともだちに 会います。",
                "vietnamese": "Ngày mai, bạn có gặp ai không? – Có. (Tôi gặp bạn.)"
              },
              {
                "japanese": "A：日曜日、どこかへ 行きますか。 / B：いいえ。(どこへも 行きません。)",
                "vietnamese": "Chủ Nhật bạn có đi đâu không? – Không. (Tôi chẳng đi đâu cả.)"
              }
            ]
          }
        ]
      },
      {
        "title": "* Trong câu trần thuật",
        "columns": [
          {
            "title": "『Nghi vấn từ』",
            "lines": [
              "→ Không sử dụng được 『Nghi vấn từ』."
            ]
          },
          {
            "title": "『Nghi vấn từ ＋ か』",
            "lines": [
              "→ Được sử dụng như 1 Danh từ."
            ],
            "examples": [
              {
                "japanese": "つくえの うえに なにかが あります。",
                "vietnamese": "Trên bàn có cái gì đấy (mà mình không biết)."
              },
              {
                "japanese": "ちちは うちのそとで だれかに会います。",
                "vietnamese": "Bố tôi đang gặp ai đó ở ngoài nhà."
              },
              {
                "japanese": "たなかさんは どこかへ 行きます。",
                "vietnamese": "Anh Tanaka đang đi đâu đó."
              },
              {
                "japanese": "いつか 日本へ 行きます。",
                "vietnamese": "Một ngày nào đó tôi sẽ đi Nhật."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "g-b5-2",
    "lessonTag": "Bài 5",
    "title": "2. Phủ định hoàn toàn: hoàn toàn không làm gì đó (5.1)",
    "meaning": "Nghi vấn từ ＋ も ＋ V phủ định: không … gì / ai / đâu cả.",
    "structure": "『Nghi vấn từ』＋ も ＋ V – phủ định。",
    "examples": [],
    "sections": [
      {
        "title": "Trợ từ 『を』・『が』: bỏ đi hoàn toàn, thay thế bằng 『も』",
        "examples": [
          {
            "japanese": "なに（を）も 食べません。",
            "vietnamese": "Tôi không ăn gì cả."
          },
          {
            "japanese": "なに（を）も 見ません。",
            "vietnamese": "Tôi không xem gì cả."
          },
          {
            "japanese": "なに（を）も べんきょうしません。",
            "vietnamese": "Tôi không học gì cả."
          },
          {
            "japanese": "つくえの うえに なに（が）も ありません。",
            "vietnamese": "Trên bàn chẳng có cái gì cả."
          },
          {
            "japanese": "きのう、なにも かいませんでした。",
            "vietnamese": "Hôm qua tôi đã không mua gì cả.",
            "extra": true
          }
        ]
      },
      {
        "title": "Trợ từ 『へ』: thay thế thành 『も』 hoặc dùng 『へも』 đều được",
        "examples": [
          {
            "japanese": "あしたは どこも 行きません。",
            "vietnamese": "Ngày mai tôi sẽ không đi đâu cả."
          },
          {
            "japanese": "日曜日、どこも 行きませんでした。",
            "vietnamese": "Chủ Nhật tôi đã không đi đâu cả."
          },
          {
            "japanese": "なつやすみ、どこへも 行きませんでした。",
            "vietnamese": "Kỳ nghỉ hè tôi đã không đi đâu cả.",
            "extra": true
          }
        ]
      },
      {
        "title": "Trợ từ 『に』・『で』・『と』, etc. (trợ từ mang ý nghĩa ngữ pháp): thêm 『も』 vào ngay sau trợ từ để nhấn mạnh, không được bỏ → （にも・でも・とも）",
        "examples": [
          {
            "japanese": "だれにも 会いません。",
            "vietnamese": "Tôi không gặp ai cả."
          },
          {
            "japanese": "どこにも ありません。",
            "vietnamese": "Không có ở đâu cả."
          },
          {
            "japanese": "どこでも べんきょうしません。",
            "vietnamese": "Ở đâu cũng không học. (lười ghê)"
          },
          {
            "japanese": "だれとも 行きません。",
            "vietnamese": "Tôi không đi cùng ai cả."
          }
        ]
      }
    ]
  },
  {
    "id": "g-b5-3",
    "lessonTag": "Bài 5",
    "title": "3. Thì quá khứ của DANH TỪ – ĐỘNG TỪ – TÍNH TỪ (5.1)",
    "meaning": "Bảng chia Hiện tại – Quá khứ, Khẳng định – Phủ định.",
    "structure": "",
    "examples": [
      {
        "japanese": "きのう、えいがを 見ました。",
        "vietnamese": "Hôm qua tôi đã xem phim.",
        "extra": true
      },
      {
        "japanese": "せんしゅうは いそがしかったです。",
        "vietnamese": "Tuần trước (tôi) đã bận.",
        "extra": true
      },
      {
        "japanese": "りょこうは あまり たのしくなかったです。",
        "vietnamese": "Chuyến du lịch đã không vui lắm.",
        "extra": true
      },
      {
        "japanese": "きのうの パーティーは にぎやかでした。",
        "vietnamese": "Bữa tiệc hôm qua đã rất náo nhiệt.",
        "extra": true
      },
      {
        "japanese": "おととい、まちは しずかじゃありませんでした。",
        "vietnamese": "Hôm kia thành phố đã không yên tĩnh.",
        "extra": true
      },
      {
        "japanese": "きのうは 日曜日でした。",
        "vietnamese": "Hôm qua là Chủ Nhật.",
        "extra": true
      }
    ],
    "table": {
      "header": [
        [
          "",
          "Thì Hiện tại – Tương lai",
          "Thì Hiện tại – Tương lai",
          "Thì Quá khứ",
          "Thì Quá khứ"
        ],
        [
          "",
          "Khẳng định",
          "Phủ định",
          "Khẳng định",
          "Phủ định"
        ]
      ],
      "rows": [
        [
          "Động từ",
          "V ます",
          "V ません",
          "V ました",
          "V ませんでした"
        ],
        [
          "TT đuôi i",
          "A いです",
          "A ~~い~~くないです",
          "A ~~い~~かったです",
          "A ~~い~~くなかったです"
        ],
        [
          "TT đuôi na",
          "A ~~な~~です",
          "A ~~な~~じゃありません",
          "A ~~な~~でした",
          "A ~~な~~じゃありませんでした"
        ],
        [
          "Danh từ",
          "N です",
          "N じゃありません",
          "N でした",
          "N じゃありませんでした"
        ]
      ]
    }
  },
  {
    "id": "g-b5-4",
    "lessonTag": "Bài 5",
    "title": "4. Làm gì cùng với ai (5.1)",
    "meaning": "Làm V cùng với ai.",
    "structure": "（？）だれ と V ますか。\n（＋）Người と V ます。",
    "usage": "Nói về hành động được thực hiện cùng một đối tượng nào đó.",
    "notes": [
      "Khi tự thực hiện hành động một mình dùng 『ひとりで＋V ます』."
    ],
    "examples": [
      {
        "japanese": "A：だれと しぶやへ いきましたか。 / B：ともだちと いきました。",
        "vietnamese": "Cậu đã đi Shibuya với ai? – Tớ đã đi với bạn."
      },
      {
        "japanese": "A：来月、かぞくと ふじさんに のぼりますか。 / B：いいえ、ひとりで のぼります。",
        "vietnamese": "Tháng sau cậu sẽ leo núi Phú Sĩ cùng gia đình à? – Không, tớ leo 1 mình."
      },
      {
        "japanese": "しゅうまつ、ははと かいものに 行きます。",
        "vietnamese": "Cuối tuần tôi đi mua sắm với mẹ.",
        "extra": true
      }
    ],
    "sections": [
      {
        "title": "＊ Ôn lại kiến thức cũ (JPD113): Làm gì ở đâu? (3.2)",
        "usage": "Nói về địa điểm diễn ra hành động.",
        "structure": "Địa điểm で V ます。",
        "examples": [
          {
            "japanese": "きのう、としょかんで 本を よみました。",
            "vietnamese": "Hôm qua, tôi đã đọc sách ở thư viện."
          },
          {
            "japanese": "レストランで ともだちと しょくじを します。",
            "vietnamese": "Tôi dùng bữa với bạn ở nhà hàng."
          }
        ]
      },
      {
        "title": "＊ Ôn lại kiến thức cũ (JPD113): Làm gì vào lúc nào? (3.3)",
        "usage": "Nói về thời điểm diễn ra hành động.",
        "structure": "Thời gian cụ thể（に） V ます。\nThời gian không cụ thể（X） V ます。",
        "examples": [
          {
            "japanese": "６月に はこねの おんせんへ いきます。",
            "vietnamese": "Tôi đi suối nước nóng ở Hakone vào tháng 6."
          },
          {
            "japanese": "８時に 日本語を べんきょうします。",
            "vietnamese": "Tôi học tiếng Nhật vào lúc 8h."
          },
          {
            "japanese": "らいしゅう、はこねの おんせんへ いきます。",
            "vietnamese": "Tôi đi suối nước nóng ở Hakone vào tuần sau."
          },
          {
            "japanese": "まいにち、日本語を べんきょうします。",
            "vietnamese": "Tôi học tiếng Nhật hằng ngày."
          }
        ]
      }
    ]
  },
  {
    "id": "g-b5-5",
    "lessonTag": "Bài 5",
    "title": "5. Làm gì hết bao lâu (5.1)",
    "meaning": "Làm V (trong) khoảng bao lâu.",
    "structure": "（？）どのくらい V ますか。\n（＋）Thời lượng [くらい] V ます。",
    "usage": "Nói về việc thực hiện hành động mất một khoảng thời gian nhất định.",
    "examples": [
      {
        "japanese": "A：毎日、どのくらい 日本語を べんきょうしますか。 / B：1時間くらい べんきょうします。",
        "vietnamese": "Hằng ngày bạn học tiếng Nhật khoảng bao lâu? – Tôi học khoảng 1 tiếng."
      },
      {
        "japanese": "きのうの よる、2時間半くらい ゲームを しました。",
        "vietnamese": "Tối qua tôi đã chơi game khoảng 2 tiếng rưỡi."
      },
      {
        "japanese": "きょねん、１しゅうかん 日本へ 行きました。",
        "vietnamese": "Năm ngoái, tôi đã đi Nhật 1 tuần."
      },
      {
        "japanese": "まいばん、30ぷんくらい テレビを 見ます。",
        "vietnamese": "Mỗi tối tôi xem tivi khoảng 30 phút.",
        "extra": true
      },
      {
        "japanese": "A：どのくらい ねましたか。 / B：8じかん ねました。",
        "vietnamese": "Bạn đã ngủ bao lâu? – Tôi đã ngủ 8 tiếng.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b5-6",
    "lessonTag": "Bài 5",
    "title": "6. Trình bày nguyên nhân, lí do (5.2)",
    "meaning": "Tại sao …? – Vì … (から).",
    "structure": "（？）どうして ＿＿＿＿＿＿ か。\n（＋）＿＿＿＿＿＿＿＿＿＿ から。",
    "notes": [
      "『どうしてですか』: Tại sao vậy?"
    ],
    "examples": [
      {
        "japanese": "A：どうして このみせの 料理を 食べませんか。 / B：たかいですが、あまりおいしくないですから。",
        "vietnamese": "Tại sao bạn không ăn đồ ăn của hàng này? – Tại vì đắt nhưng lại không ngon."
      },
      {
        "japanese": "A：きょう、たなかさんの うちへ 行きません。 / B：どうしてですか。 / A：ようじが ありますから。",
        "vietnamese": "Hôm nay tôi không đến nhà anh Tanaka. – Tại sao vậy? – Vì tôi có việc bận."
      },
      {
        "japanese": "A：どうして 日本語を べんきょうしますか。 / B：日本の 会社で はたらきたいですから。",
        "vietnamese": "Tại sao bạn lại học tiếng Nhật? – Vì tôi muốn làm việc ở một công ty của Nhật."
      },
      {
        "japanese": "きのう ともだちと やくそくが ありましたから、しゅくだいを しませんでした。",
        "vietnamese": "Vì hôm qua tôi có hẹn với bạn nên tôi đã không làm bài tập."
      },
      {
        "japanese": "A：どうして きのう 学校へ 来ませんでしたか。 / B：あたまが いたかったですから。",
        "vietnamese": "Tại sao hôm qua bạn không đến trường? – Vì tôi bị đau đầu.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b5-7",
    "lessonTag": "Bài 5",
    "title": "7. Nói về ý muốn: 『ほしい』 & 『V たい』 (5.3)",
    "meaning": "Muốn có N (N が ほしいです) – Muốn làm V (V たいです).",
    "structure": "",
    "examples": [],
    "sections": [
      {
        "title": "*** Muốn cái gì",
        "structure": "N が ほしいです。",
        "notes": [
          "『ほしい』 là tính từ đuôi 『い』. Và chỉ dùng để nói về ý muốn của bản thân hoặc người đang nói chuyện với mình, không dùng với ngôi thứ 3."
        ],
        "examples": [
          {
            "japanese": "A：今、何が ほしいですか。 / B：あたらしい でんしじしょが ほしいです。",
            "vietnamese": "Bây giờ bạn muốn cái gì? – Tôi muốn 1 cái kim từ điển mới."
          },
          {
            "japanese": "こいびとが ほしいです。",
            "vietnamese": "Tui mún có ngừi iu :<"
          },
          {
            "japanese": "今の くるまは とてもいいですから、新しいくるまが ほしくないです。",
            "vietnamese": "Vì cái ô tô bây giờ của tôi rất tốt, nên tôi không muốn ô tô mới."
          },
          {
            "japanese": "おおきい いえが ほしいです。",
            "vietnamese": "Tôi muốn có một căn nhà to.",
            "extra": true
          }
        ]
      },
      {
        "title": "*** Muốn làm gì",
        "structure": "『V ~~ます~~』 bỏ ます → 『V たい』です。",
        "notes": [
          "『V たい』 sử dụng như tính từ đuôi い. Và chỉ dùng để nói về ý muốn của bản thân hoặc người đang nói chuyện với mình, không dùng với ngôi thứ 3."
        ],
        "examples": [
          {
            "japanese": "A：今、何を したいですか。 / B：りょこうしたいです。",
            "vietnamese": "Bây giờ bạn muốn làm gì? – Tôi muốn đi du lịch."
          },
          {
            "japanese": "いつか 日本へ 行きたいです。",
            "vietnamese": "Tôi muốn đi Nhật vào một ngày nào đó."
          },
          {
            "japanese": "東京の 大学で べんきょうしたいです。",
            "vietnamese": "Tôi muốn học ở trường ĐH ở Tokyo."
          },
          {
            "japanese": "今の くるまは あまりよくないですから、新しいくるまを 買いたいです。",
            "vietnamese": "Vì cái ô tô bây giờ của tôi không tốt lắm, nên tôi muốn mua cái ô tô mới."
          },
          {
            "japanese": "あついですから、そとへ 行きたくないです。",
            "vietnamese": "Vì nóng nên tôi không muốn đi ra ngoài."
          },
          {
            "japanese": "この料理は おいしくないですから、食べたくないです。",
            "vietnamese": "Vì món này không ngon nên tôi không muốn ăn."
          },
          {
            "japanese": "なつやすみに うみで およぎたいです。",
            "vietnamese": "Kỳ nghỉ hè tôi muốn bơi ở biển.",
            "extra": true
          }
        ]
      }
    ]
  },
  {
    "id": "g-b5-8",
    "lessonTag": "Bài 5",
    "title": "8. Thích / ghét cái gì (5.3)",
    "meaning": "S thích / ghét N.",
    "structure": "S は N が すき／きらい です。",
    "notes": [
      "『すき』 và 『きらい』 là tính từ đuôi な."
    ],
    "examples": [
      {
        "japanese": "A：何が すきですか。 / B：買い物が すきです。",
        "vietnamese": "Bạn thích gì? – Tôi thích mua sắm."
      },
      {
        "japanese": "にぎやかなところが すきじゃありません。",
        "vietnamese": "Tôi không thích những nơi ồn ào lắm."
      },
      {
        "japanese": "あついコーヒーが きらいです。",
        "vietnamese": "Tôi ghét cafe nóng."
      },
      {
        "japanese": "さかなが あまりきらいじゃありません。",
        "vietnamese": "Tôi không ghét ăn cá lắm."
      },
      {
        "japanese": "サッカーが とてもすきですから、毎日 こうえんで します。",
        "vietnamese": "Vì tôi rất thích bóng đá nên ngày nào tôi cũng chơi ở công viên."
      },
      {
        "japanese": "わたしは ねこが すきです。",
        "vietnamese": "Tôi thích mèo.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b5-9",
    "lessonTag": "Bài 5",
    "title": "9. Đi đâu để làm gì (5.3)",
    "meaning": "Đi / đến / về (địa điểm) để làm N / V.",
    "structure": "Địa điểm へ N ／ V ~~ます~~ に 行きます。／来ます。／帰ります。",
    "usage": "Chỉ mục đích của việc di chuyển.",
    "examples": [
      {
        "japanese": "日本へ べんきょうに 来ました。",
        "vietnamese": "Tôi đã đến Nhật để học."
      },
      {
        "japanese": "スーパーへ かいものに 行きました。",
        "vietnamese": "Tôi đã đi siêu thị để mua sắm."
      },
      {
        "japanese": "うちへ そうじに かえります。",
        "vietnamese": "Tôi về nhà để dọn dẹp."
      },
      {
        "japanese": "やまへ しゃしんを とりに 行きます。",
        "vietnamese": "Tôi đi lên núi để chụp ảnh."
      },
      {
        "japanese": "えいがかんへ えいがを みに 行きました。",
        "vietnamese": "Tôi đã đi đến rạp chiếu phim để xem phim."
      },
      {
        "japanese": "としょかんへ 本を よみに 行きます。",
        "vietnamese": "Tôi đi đến thư viện để đọc sách."
      },
      {
        "japanese": "レストランへ ばんごはんを 食べに 行きます。",
        "vietnamese": "Tôi đi nhà hàng để ăn tối.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b6-1",
    "lessonTag": "Bài 6",
    "title": "1. Cùng làm gì đó nào (6.1)",
    "meaning": "Cùng làm V nào! (rủ rê, hô hào)",
    "structure": "『V ~~ます~~』 bỏ ます → 『V ましょう』",
    "usage": "Rủ rê, hô hào người khác cùng làm gì …",
    "examples": [
      {
        "japanese": "みなさん、しゃしんを とりましょう。",
        "vietnamese": "Mọi người ơi, chụp ảnh nào."
      },
      {
        "japanese": "リンさん、ほっかいどうへ 行きましょう。",
        "vietnamese": "Linh ơi, đi Hokkaido nào."
      },
      {
        "japanese": "3月に ふじさんに のぼりましょう。",
        "vietnamese": "Tháng 3 đi leo núi Phú Sĩ nào."
      },
      {
        "japanese": "ちょっと やすみましょう。",
        "vietnamese": "Nghỉ một chút nào.",
        "extra": true
      },
      {
        "japanese": "いっしょに ひるごはんを 食べましょう。",
        "vietnamese": "Cùng ăn trưa nào.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b6-2",
    "lessonTag": "Bài 6",
    "title": "2. Cùng làm với tôi không? (6.1)",
    "meaning": "Mời, rủ: (cùng) làm V với tôi không? – Được đấy / Xin lỗi…",
    "structure": "（？）[いっしょに] V ませんか。\n（＋）いいですね。V ましょう。\n（ー）すみません、ちょっと。(có thể giải thích thêm lý do)",
    "usage": "Câu hỏi mời, rủ người khác cùng làm gì với mình.",
    "notes": [
      "『いっしょに』: cùng nhau. Có thể bổ sung thêm để nhấn mạnh ý nghĩa, bỏ đi cũng không làm câu bị mất nghĩa."
    ],
    "examples": [
      {
        "japanese": "A：いっしょに あそびに 行きませんか。 / B：いいですね。行きましょう。",
        "vietnamese": "Đi chơi với tôi không? – Ừ được đấy, đi thôi."
      },
      {
        "japanese": "A：コンサートに 行きませんか。 / B：すみません、ちょっと。ようじが ありますから。",
        "vietnamese": "Đi concert với tôi không? – Xin lỗi, không được rồi. Tôi lại có việc bận rồi."
      },
      {
        "japanese": "A：いっしょに えいがを みませんか。 / B：いいですね。何時に みますか。",
        "vietnamese": "Đi xem phim với tôi không? – Được đấy. Mấy giờ xem?"
      },
      {
        "japanese": "A：このレストランで しょくじしませんか。 / B：すみません、ちょっと。お金が ありませんから。",
        "vietnamese": "Đi ăn ở nhà hàng này với tôi không? – Xin lỗi, tôi hết tiền rồi. (nhưng mà mời thì ăn :\">)"
      },
      {
        "japanese": "A：にちようび、いっしょに テニスを しませんか。 / B：いいですね。しましょう。",
        "vietnamese": "Chủ Nhật cùng chơi tennis không? – Hay đấy. Chơi thôi.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b6-3",
    "lessonTag": "Bài 6",
    "title": "3. Vị trí của số từ trong câu (6.1)",
    "meaning": "Số từ (kèm đơn vị đếm) đứng sau trợ từ, ngay trước động từ.",
    "structure": "N Trợ từ Số từ V ます",
    "notes": [
      "Dùng đơn vị đếm phù hợp với danh từ. Ví dụ đếm người dùng にん, đếm vật mỏng dùng まい, đếm đồ vật dùng つ, etc. (Ôn lại các kiểu đếm đã học.)"
    ],
    "examples": [
      {
        "japanese": "ともだちに ふたり 会いました。",
        "vietnamese": "Tôi đã gặp 2 người bạn."
      },
      {
        "japanese": "コンサートの チケットを ４まい 買いました。",
        "vietnamese": "Tôi đã mua 4 cái vé hoà nhạc."
      },
      {
        "japanese": "ケーキを ３つ 食べました。",
        "vietnamese": "Tôi đã ăn 3 cái bánh ngọt."
      },
      {
        "japanese": "カレーを １つ ください。",
        "vietnamese": "Cho tôi 1 suất cà ri. (Bài 2.3)"
      },
      {
        "japanese": "りんごを ５つ かいました。",
        "vietnamese": "Tôi đã mua 5 quả táo.",
        "extra": true
      },
      {
        "japanese": "きょうしつに がくせいが ３０にん います。",
        "vietnamese": "Trong lớp học có 30 sinh viên.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b6-4",
    "lessonTag": "Bài 6",
    "title": "4. Ở đâu có sự kiện gì, xảy ra sự kiện gì (6.1)",
    "meaning": "Ở (địa điểm) có / diễn ra (sự kiện).",
    "structure": "Địa điểm で Sự kiện が あります。",
    "examples": [
      {
        "japanese": "しんじゅくで コンサートが あります。",
        "vietnamese": "Ở Shinjuku có concert."
      },
      {
        "japanese": "来週、あさくさで おはなびが あります。",
        "vietnamese": "Tuần sau, ở Asakusa có pháo hoa."
      },
      {
        "japanese": "2020年に 東京で オリンピックが あります。",
        "vietnamese": "Vào năm 2020, ở Tokyo có thế vận hội Olympic."
      },
      {
        "japanese": "よこはまで やきゅうの しあいが あります。",
        "vietnamese": "Ở Yokohama có trận đấu bóng chày."
      },
      {
        "japanese": "うちの ちかくで なつの おまつりが あります。",
        "vietnamese": "Ở gần nhà tôi có lễ hội mùa hè."
      },
      {
        "japanese": "あした、だいがくで パーティーが あります。",
        "vietnamese": "Ngày mai ở trường đại học có bữa tiệc.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b6-5",
    "lessonTag": "Bài 6",
    "title": "5. So sánh hơn nhất (6.2)",
    "meaning": "Trong (phạm vi), N là … nhất.",
    "structure": "Phạm vi so sánh で N が いちばん ＋ tính chất。",
    "examples": [
      {
        "japanese": "スポーツで サッカーが いちばん すきです。",
        "vietnamese": "Trong các môn thể thao, tôi thích bóng đá nhất."
      },
      {
        "japanese": "このクラスで リンさんが いちばん 日本語が じょうずです。",
        "vietnamese": "Linh là người giỏi tiếng Nhật nhất trong lớp này."
      },
      {
        "japanese": "このまちで さくらこうえんが いちばん みどりが おおいです。",
        "vietnamese": "Ở thành phố này, công viên Sakura có nhiều cây xanh nhất."
      },
      {
        "japanese": "くだもので りんごが いちばん すきです。",
        "vietnamese": "Trong các loại hoa quả, tôi thích táo nhất.",
        "extra": true
      },
      {
        "japanese": "A：一年で いつが いちばん さむいですか。 / B：１月が いちばん さむいです。",
        "vietnamese": "Trong một năm, khi nào lạnh nhất? – Tháng 1 lạnh nhất.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b6-6",
    "lessonTag": "Bài 6",
    "title": "6. So sánh hơn kém (6.2)",
    "meaning": "A … hơn B.",
    "structure": "A は B より tính chất。",
    "notes": [
      "『より』: so với. → dịch là \"A hơn B...\", \"So với B thì A hơn...\""
    ],
    "examples": [
      {
        "japanese": "A レストランは B レストランより たかいです。",
        "vietnamese": "Nhà hàng A đắt hơn nhà hàng B."
      },
      {
        "japanese": "日本語は 英語より ずっと むずかしいです。",
        "vietnamese": "Tiếng Nhật khó hơn tiếng Anh nhiều."
      },
      {
        "japanese": "さくらえきは ほしのえきより うちから ちかいです。",
        "vietnamese": "Từ nhà đến ga Sakura thì gần hơn so với ga Hoshino."
      },
      {
        "japanese": "きょうは きのうより さむいです。",
        "vietnamese": "Hôm nay lạnh hơn hôm qua.",
        "extra": true
      },
      {
        "japanese": "ハノイは ダナンより おおきいです。",
        "vietnamese": "Hà Nội lớn hơn Đà Nẵng.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b6-7",
    "lessonTag": "Bài 6",
    "title": "7. So sánh A và B cái nào hơn? (6.2)",
    "meaning": "A và B cái nào … hơn? – A/B … hơn / Cái nào cũng …",
    "structure": "（？）A と B と どちらが tính chất か。→ A và B cái nào … hơn?\n（＋）A / B の ほうが tính chất。→ A hoặc B … hơn.\n（＋）どちらも tính chất。→ Cái nào cũng …",
    "examples": [
      {
        "japanese": "A：サッカーと テニスと どちらが おもしろいですか。 / B：サッカーの ほうが おもしろいです。",
        "vietnamese": "Bóng đá và Tennis thì môn nào thú vị hơn? – Bóng đá thú vị hơn."
      },
      {
        "japanese": "A：えいがと おんがくと どちらが すきですか。 / B：どちらも すきです。",
        "vietnamese": "Phim ảnh và âm nhạc thì cậu thích cái nào hơn? – Cái nào tớ cũng thích."
      },
      {
        "japanese": "A：このこうえんと そのこうえんと どちらが みどりが おおいですか。 / B：このこうえんの ほうが おおいです。",
        "vietnamese": "Công viên này và công viên đó thì cái nào nhiều cây xanh hơn? – Công viên này nhiều cây xanh hơn."
      },
      {
        "japanese": "A：ジュースと ぎゅうにゅうと どちらが おいしいですか。 / B：どちらも おいしくないです。",
        "vietnamese": "Nước hoa quả và sữa thì cái nào ngon hơn? – Chẳng cái nào ngon cả."
      },
      {
        "japanese": "A：なつと ふゆと どちらが すきですか。 / B：ふゆの ほうが すきです。",
        "vietnamese": "Mùa hè và mùa đông, bạn thích mùa nào hơn? – Tôi thích mùa đông hơn.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b6-8",
    "lessonTag": "Bài 6",
    "title": "8. Đã làm gì chưa? (6.3)",
    "meaning": "Đã làm V chưa? – Rồi / Chưa.",
    "structure": "（？）もう V ましたか。\n（＋）はい、V ました。\n（ー）いいえ、まだです。",
    "examples": [
      {
        "japanese": "A：もう ばんごはんを 食べましたか。 / B：はい、食べました。",
        "vietnamese": "Cậu đã ăn tối chưa? – Ừ, tớ ăn rồi."
      },
      {
        "japanese": "A：もう 学校へ アンナさんを むかえに いきましたか。 / B：いいえ、まだです。",
        "vietnamese": "Cậu đã đến trường đón Anna chưa? – Chưa, tớ chưa đón."
      },
      {
        "japanese": "A：もう しゅくだいを しましたか。 / B：いいえ、まだです。",
        "vietnamese": "Cậu đã làm bài tập chưa? – Chưa.",
        "extra": true
      },
      {
        "japanese": "A：もう チケットを かいましたか。 / B：はい、かいました。",
        "vietnamese": "Cậu đã mua vé chưa? – Rồi, tớ mua rồi.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b6-9",
    "lessonTag": "Bài 6",
    "title": "9. 『どうですか。』 – câu hỏi gợi ý (6.3)",
    "meaning": "『どうですか』: hỏi tính chất (Bài 4.2) và hỏi ý kiến khi gợi ý, mời rủ (Bài 6.3).",
    "structure": "",
    "notes": [
      "『S は どうですか』: S như thế nào?"
    ],
    "examples": [],
    "sections": [
      {
        "title": "Bài 4.2: hỏi đặc điểm, tính chất của chủ ngữ",
        "examples": [
          {
            "japanese": "A：たなかさんは どうですか。 / B：おもしろいです。",
            "vietnamese": "Anh Tanaka như thế nào? – Anh ấy thú vị."
          },
          {
            "japanese": "A：FPT大学は どうですか。 / B：とても ゆうめいです。",
            "vietnamese": "Trường ĐH FPT như thế nào? – Rất nổi tiếng."
          }
        ]
      },
      {
        "title": "Bài 6.3: đưa ra gợi ý, hỏi ý kiến của đối phương trong khi mời, rủ",
        "examples": [
          {
            "japanese": "A：あそびに 行きませんか。 / B：いいですね。どこへ 行きますか。 / A：しんじゅくの デパートは どうですか。 / B：いいです。そうしましょう。",
            "vietnamese": "Đi chơi với tôi không? – Ừ được đấy nhỉ. Thế định đi đâu? – TTTM ở Shinjuku thì thế nào? – Được. Vậy làm như thế đi."
          },
          {
            "japanese": "A：いっしょに ひるごはんを 食べませんか。 / B：いいですね。 / A：ラーメンは どうですか。",
            "vietnamese": "Cùng ăn trưa không? – Hay đấy. – Ăn mì ramen thì thế nào?",
            "extra": true
          }
        ]
      }
    ]
  },
  {
    "id": "g-b7-1",
    "lessonTag": "Bài 7",
    "title": "1. Có cái gì ở đâu... (7.1)",
    "meaning": "N ở (địa điểm).",
    "structure": "N は Địa điểm に あります。／います。",
    "notes": [
      "『あります』：dùng với đồ vật, sự vật / 『います』：dùng với người, động vật.",
      "Sử dụng cụm 『Địa điểm の Vị trí』 để làm rõ nghĩa hơn phần Địa điểm. Khi đó mẫu câu sẽ trở thành: N は Địa điểm の Vị trí に あります／います。",
      "Mẫu câu \"Ở đâu có cái gì\": xem lại Bài 4, mục 2 (4.1)."
    ],
    "examples": [
      {
        "japanese": "ほんやは あのビルに あります。",
        "vietnamese": "Hiệu sách ở toà nhà kia."
      },
      {
        "japanese": "こうばんは スーパーの ちかくに あります。",
        "vietnamese": "Đồn cảnh sát ở gần siêu thị."
      },
      {
        "japanese": "A：リンさんは どこに いますか。 / B：えきの まえに います。",
        "vietnamese": "Linh ở đâu thế? – Ở trước nhà ga."
      },
      {
        "japanese": "ねこちゃんは テーブルの したに います。",
        "vietnamese": "Bé mèo ở dưới cái bàn."
      },
      {
        "japanese": "ぎんこうは ゆうびんきょくの となりに あります。",
        "vietnamese": "Ngân hàng ở bên cạnh bưu điện.",
        "extra": true
      },
      {
        "japanese": "せんせいは きょうしつに います。",
        "vietnamese": "Thầy giáo ở trong lớp học.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b7-2",
    "lessonTag": "Bài 7",
    "title": "2. Phương tiện, cách thức thực hiện hành động (7.2)",
    "meaning": "Làm V bằng N.",
    "structure": "N (phương tiện) で V ます。",
    "usage": "Làm bằng …",
    "examples": [
      {
        "japanese": "このナイフで やさいを きります。",
        "vietnamese": "Cắt rau bằng con dao này."
      },
      {
        "japanese": "ここに ペンで 名前を 書きます。",
        "vietnamese": "Viết tên bằng bút bi vào chỗ này."
      },
      {
        "japanese": "タイ人は フォークと スプーンで 食べます。",
        "vietnamese": "Người Thái ăn bằng nĩa và thìa."
      },
      {
        "japanese": "インターネットで 日本語を べんきょうします。",
        "vietnamese": "Học tiếng Nhật qua mạng."
      },
      {
        "japanese": "しんかんせんで おおさかへ 行きました。",
        "vietnamese": "Tôi đã đi đến Osaka bằng tàu siêu tốc."
      },
      {
        "japanese": "はしで ごはんを 食べます。",
        "vietnamese": "Ăn cơm bằng đũa.",
        "extra": true
      },
      {
        "japanese": "日本語で レポートを 書きました。",
        "vietnamese": "Tôi đã viết báo cáo bằng tiếng Nhật.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b7-3",
    "lessonTag": "Bài 7",
    "title": "3. Cách làm gì đó (7.2)",
    "meaning": "Cách làm V (V かた).",
    "structure": "『V ~~ます~~』 bỏ ます → V かた",
    "notes": [
      "V かた là Danh từ, không phải Động từ."
    ],
    "examples": [
      {
        "japanese": "カレーの つくりかたを べんきょうします。",
        "vietnamese": "Tôi học cách nấu cà ri."
      },
      {
        "japanese": "かんじの よみかたは とてもむずかしいです。",
        "vietnamese": "Cách đọc chữ Hán rất khó."
      },
      {
        "japanese": "アンナさんは 私に しゃしんの とりかたを おしえました。",
        "vietnamese": "Anna dạy cho tôi cách chụp ảnh."
      },
      {
        "japanese": "この きっぷの かいかたが わかりません。",
        "vietnamese": "Tôi không biết cách mua cái vé này.",
        "extra": true
      },
      {
        "japanese": "はしの つかいかたは かんたんです。",
        "vietnamese": "Cách dùng đũa thì đơn giản.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b7-4",
    "lessonTag": "Bài 7",
    "title": "4. Động từ thể Te – 『V て』 (7.2)",
    "meaning": "Cách chia động từ sang thể て theo 3 nhóm.",
    "structure": "",
    "examples": [
      {
        "japanese": "てを あらって、ごはんを 食べます。",
        "vietnamese": "Rửa tay rồi ăn cơm. (nối các hành động bằng thể て)",
        "extra": true
      },
      {
        "japanese": "まどを あけて ください。",
        "vietnamese": "Hãy mở cửa sổ ra.",
        "extra": true
      }
    ],
    "sections": [
      {
        "title": "Cách chia V て",
        "columns": [
          {
            "title": "Nhóm I – trước ます thuộc cột 『い』",
            "lines": [
              "い・ち・り → って",
              "び・み・に → んで",
              "き → いて",
              "ぎ → いで",
              "し → して",
              "いきます → いって（ngoại lệ *）",
              "―",
              "あいます → あって",
              "かいます → かって",
              "もちます → もって",
              "とります → とって",
              "あそびます → あそんで",
              "のみます → のんで",
              "よみます → よんで",
              "しにます → しんで",
              "かきます → かいて",
              "ききます → きいて",
              "およぎます → およいで",
              "かします → かして",
              "はなします → はなして"
            ]
          },
          {
            "title": "Nhóm II – trước ます thuộc cột 『え』 & một số ít trước ます thuộc cột 『い』",
            "lines": [
              "* みます・います・かります・おきます (thức dậy)",
              "V ~~ます~~ → V て",
              "―",
              "たべます → たべて",
              "あけます → あけて",
              "かけます → かけて",
              "おしえます → おしえて",
              "みます → みて",
              "おきます → おきて",
              "かります → かりて"
            ]
          },
          {
            "title": "Nhóm III – gồm 『きます』 & 『N – します』",
            "lines": [
              "きます → きて",
              "N – します → N – して",
              "―",
              "べんきょうします → べんきょうして",
              "せんたくします → せんたくして",
              "そうじします → そうじして",
              "しょくじします → しょくじして"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "g-b7-5",
    "lessonTag": "Bài 7",
    "title": "5. Hãy .... (7.2)",
    "meaning": "Hãy làm V. (yêu cầu, đề nghị, khuyên nhủ)",
    "structure": "V て ください。",
    "usage": "Dùng khi yêu cầu, đề nghị, sai khiến, khuyên nhủ người khác làm gì …",
    "examples": [
      {
        "japanese": "日本語を べんきょうしてください。",
        "vietnamese": "Hãy học tiếng Nhật."
      },
      {
        "japanese": "この料理を フォークで 食べてください。",
        "vietnamese": "Hãy ăn món ăn này bằng dĩa."
      },
      {
        "japanese": "かんじの 書きかたを おしえてください。",
        "vietnamese": "Hãy dạy tôi cách viết chữ Hán."
      },
      {
        "japanese": "ジュースを たくさん 飲んでください。",
        "vietnamese": "Hãy uống nhiều nước hoa quả."
      },
      {
        "japanese": "くだものは あまり きれいじゃありませんから、あらってください。",
        "vietnamese": "Vì hoa quả không sạch lắm, nên hãy rửa đi."
      },
      {
        "japanese": "しゅうまつ、ははに うちの そうじを てつだってください。",
        "vietnamese": "Vào cuối tuần, hãy giúp mẹ dọn dẹp nhà cửa."
      },
      {
        "japanese": "ちょっと まってください。",
        "vietnamese": "Hãy đợi một chút.",
        "extra": true
      },
      {
        "japanese": "なまえを ここに 書いてください。",
        "vietnamese": "Hãy viết tên vào đây.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b7-6",
    "lessonTag": "Bài 7",
    "title": "6. Phân biệt 『どの』 và 『どれ』 (7.2)",
    "meaning": "どの＋N: cái N nào – どれ: cái nào (đứng độc lập).",
    "structure": "",
    "examples": [],
    "sections": [
      {
        "columns": [
          {
            "title": "『どの』",
            "lines": [
              "※ Luôn phải kèm Danh từ để trở nên có nghĩa",
              "『どの＋N 〜』 → Cái N nào 〜",
              "※ Tương ứng với 『この・その・あの＋N』 → Cái N này / đó / kia"
            ],
            "examples": [
              {
                "japanese": "A：どのかばんを かいましたか。 / B：このかばんを かいました。",
                "vietnamese": "Cậu đã mua cái cặp nào? – Tôi đã mua cái cặp này."
              },
              {
                "japanese": "A：おさらを とってください。 / B：どのおさらですか。 / A：あのおさらです。",
                "vietnamese": "Hãy lấy cho tôi cái đĩa. – Cái đĩa nào cơ? – Cái đĩa kia."
              }
            ]
          },
          {
            "title": "『どれ』",
            "lines": [
              "※ Đứng độc lập cũng có nghĩa",
              "『どれ 〜』 → Cái nào 〜",
              "※ Tương ứng với 『これ・それ・あれ』 → Cái này / đó / kia"
            ],
            "examples": [
              {
                "japanese": "A：かばんをかいましたね。どれですか。 / B：これです。",
                "vietnamese": "Cậu mới mua cặp nhỉ. Cái nào thế? – Cái này này."
              },
              {
                "japanese": "A：おさらを とってください。 / B：どれを とりますか。 / A：あれです。",
                "vietnamese": "Hãy lấy cho tôi cái đĩa. – Lấy cái nào? – Cái kia kìa."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "g-b7-7",
    "lessonTag": "Bài 7",
    "title": "7. Đang làm gì ... (7.3)",
    "meaning": "Đang làm V. (hiện tại tiếp diễn)",
    "structure": "V て います。",
    "usage": "Hiện tại tiếp diễn – nói về một hành động xảy ra ngay tại thời điểm hiện tại.",
    "examples": [
      {
        "japanese": "A：ダニエルさん、今 何を していますか。 / B：本を 読んでいます。",
        "vietnamese": "Daniel, bây giờ cậu đang làm gì đó? – Tớ đang đọc sách."
      },
      {
        "japanese": "パクさんは うちの そとで たばこを すっています。",
        "vietnamese": "Park đang hút thuốc ở ngoài nhà."
      },
      {
        "japanese": "リンさんは ともだちと 話しています。",
        "vietnamese": "Rin đang nói chuyện với bạn."
      },
      {
        "japanese": "母は だいどころで 一人で りょうりを つくっています。",
        "vietnamese": "Mẹ tôi đang nấu ăn một mình trong bếp."
      },
      {
        "japanese": "ワンさんは としょかんで 日本語を べんきょうしています。",
        "vietnamese": "Wang đang học tiếng Nhật ở thư viện."
      },
      {
        "japanese": "ナタポンさんは こいびとと ゆうめいなレストランで しょくじしています。",
        "vietnamese": "Natapon đang dùng bữa tại một nhà hàng nổi tiếng với bạn gái của mình."
      },
      {
        "japanese": "いま、あめが ふっています。",
        "vietnamese": "Bây giờ trời đang mưa.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b7-8",
    "lessonTag": "Bài 7",
    "title": "8. Để tôi làm cho nhé / để tôi giúp cậu nhé (7.3)",
    "meaning": "Để tôi làm V cho nhé. (ngỏ lời giúp đỡ)",
    "structure": "V ましょうか。",
    "usage": "Đề nghị, ngỏ lời giúp đỡ người khác.",
    "notes": [
      "Đây không phải câu hỏi. Thường hay được đọc xuống giọng ở cuối câu! (ma-sho-kà) =))",
      "Phân biệt với mẫu 『V ましょう』: \"cùng ... nào\" – dùng để hô hào, kêu gọi, rủ rê. (Bài 6.1)"
    ],
    "examples": [
      {
        "japanese": "A：しゃしんを とりましょうか。 / B：おねがいします。",
        "vietnamese": "Tôi chụp ảnh cho cậu nhé. – Nhờ cậu."
      },
      {
        "japanese": "A：りょうりを とりましょうか。 / B：ありがとうございます。",
        "vietnamese": "Tôi lấy đồ ăn cho cậu nhé. – Cảm ơn cậu."
      },
      {
        "japanese": "A：しごとが おおいですね。てつだいましょうか。 / B：あ、だいじょうぶです。",
        "vietnamese": "Nhiều việc nhỉ. Để tôi giúp cậu nhé. – À, thôi không sao tui ổn nà."
      },
      {
        "japanese": "A：にもつが おもいですね。もちましょうか。 / B：すみません。おねがいします。",
        "vietnamese": "Hành lý nặng nhỉ. Để tôi xách cho nhé. – Cảm ơn. Nhờ cậu.",
        "extra": true
      },
      {
        "japanese": "A：まどを あけましょうか。 / B：ええ、おねがいします。",
        "vietnamese": "Để tôi mở cửa sổ nhé. – Vâng, nhờ cậu.",
        "extra": true
      }
    ]
  },
  {
    "id": "g-b7-9",
    "lessonTag": "Bài 7",
    "title": "9. Nghi vấn từ / Chủ ngữ đi với trợ từ 『が』 (7.3)",
    "meaning": "Nghi vấn từ ＋ が hỏi chủ thể; Chủ ngữ ＋ が khi bổ sung thông tin mới / ngôi thứ 3.",
    "structure": "",
    "examples": [],
    "sections": [
      {
        "title": "Nghi vấn từ ＋『が』: dùng để hỏi cho đối tượng là chủ thể của câu",
        "examples": [
          {
            "japanese": "A：だれが この料理を つくりましたか。 / B：私が つくりました。",
            "vietnamese": "Ai đã nấu món ăn này thế? – Tôi đã nấu."
          },
          {
            "japanese": "A：だれが ギターを ひきましたか。 / B：アンナさんが ひきました。",
            "vietnamese": "Ai đã chơi đàn guitar đấy? – Anna chơi."
          },
          {
            "japanese": "A：なにが いちばん おいしいですか。 / B：すしが いちばん おいしいです。",
            "vietnamese": "Cái gì ngon nhất? – Sushi ngon nhất.",
            "extra": true
          }
        ]
      },
      {
        "title": "Chủ ngữ ＋『が』: sử dụng khi muốn bổ sung thêm thông tin mới dựa trên câu trước / hoặc chủ ngữ là ngôi thứ 3 (không tham gia cuộc nói chuyện)",
        "examples": [
          {
            "japanese": "A：おいしい ケーキですね。 / B：アンナさんが つくりましたよ。",
            "vietnamese": "Bánh ngọt ngon nhỉ. – Anna đã làm đấy. (bổ sung thông tin)"
          },
          {
            "japanese": "A：だれが ギターを ひきましたか。 / B：マルコさんが ひきました。",
            "vietnamese": "Ai đã chơi đàn guitar đấy? – Marco đã chơi. (chủ ngữ là ngôi thứ 3, người không tham gia câu chuyện)"
          }
        ]
      }
    ]
  },
  {
    "id": "g-b7-10",
    "lessonTag": "Bài 7",
    "title": "10. Các cách sử dụng của 『もう』 và 『まだ』 (7.3)",
    "meaning": "もう: đã … rồi / hết rồi – まだ: chưa / vẫn còn.",
    "structure": "",
    "examples": [],
    "sections": [
      {
        "title": "※ Cách sử dụng 『もう』",
        "columns": [
          {
            "title": "『もう＋N です』: N đã đến rồi",
            "examples": [
              {
                "japanese": "もうはるですね。",
                "vietnamese": "Mùa xuân đến rồi nhỉ."
              }
            ]
          },
          {
            "title": "『もう＋V ました』: đã làm V rồi (xem lại 6.3)",
            "examples": [
              {
                "japanese": "もう べんきょうしました。",
                "vietnamese": "Tôi đã học rồi."
              }
            ]
          },
          {
            "title": "『もう＋V ません』: đã hết rồi",
            "examples": [
              {
                "japanese": "ビールは もう ありません。",
                "vietnamese": "Bia đã hết rồi. / Không còn bia nữa rồi."
              }
            ]
          }
        ]
      },
      {
        "title": "※ Cách sử dụng 『まだ』",
        "columns": [
          {
            "title": "『まだです』: chưa làm (xem lại 6.3)",
            "examples": [
              {
                "japanese": "A：もう 学校へ 来ましたか。 / B：いいえ、まだです。",
                "vietnamese": "Cậu đã đến trường chưa? – Chưa, tôi chưa đến."
              }
            ]
          },
          {
            "title": "『まだ＋V ます』: vẫn còn",
            "examples": [
              {
                "japanese": "ビールは まだ ありますよ。",
                "vietnamese": "Vẫn còn bia đấy nhé (tẹt bô đê)."
              },
              {
                "japanese": "まだ じかんが あります。",
                "vietnamese": "Vẫn còn thời gian.",
                "extra": true
              }
            ]
          }
        ]
      }
    ]
  }
];

const NOW = new Date().toISOString();
export const JPD123_GRAMMAR_POINTS: JapaneseGrammarPoint[] = RAW.map((p) => ({ ...p, createdAt: NOW, updatedAt: NOW }));

/** Tất cả ví dụ của một mẫu (kể cả ví dụ trong các mục con / cột so sánh) – dùng cho luyện tập */
export function getAllGrammarExamples(gp: JapaneseGrammarPoint): GrammarExample[] {
  const out: GrammarExample[] = [...(gp.examples || [])];
  for (const s of gp.sections || []) {
    out.push(...(s.examples || []));
    for (const c of s.columns || []) out.push(...(c.examples || []));
  }
  return out;
}
