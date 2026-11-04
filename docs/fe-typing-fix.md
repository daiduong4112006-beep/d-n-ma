# Sửa điểm luyện gõ và tạo đề FE — 2026-11-04

## Hành vi

- Luyện gõ từ vựng, câu ví dụ, Kanji Kun/On, từ ghép và ngữ pháp: chỉ cộng điểm khi kiểm tra đúng lần đầu. Sửa đúng sau khi sai vẫn được đi tiếp nhưng không cộng điểm lần đầu.
- Không làm tròn phiên có lỗi thành 100%; ví dụ 235/236 hiển thị 99,6%.
- Chặn cộng trùng khi kiểm tra liên tiếp. Hủy bộ hẹn giờ tự chuyển khi đi tiếp bằng tay, bắt đầu lượt khác hoặc thoát.
- Luyện lại toàn bộ/câu sai bắt đầu lượt tính điểm mới và xóa trạng thái nhập cũ.
- Phiên từ vựng lưu thêm phiên bản tính điểm và ID thẻ đã trả lời đúng; phục hồi/tab khác giữ điểm đang chờ chuyển thẻ. Phiên cũ được chuyển đổi dựa trên vị trí, điểm và danh sách câu từng sai còn lưu.

## Đề FE

Đề mặc định cố định 30 câu, thời gian tùy chọn:

| Dạng | Câu |
|---|---:|
| Ngữ pháp | 8 |
| Từ vựng | 5 |
| Đọc Kanji | 4 |
| Viết Kanji | 3 |
| Hội thoại | 3 |
| Trợ từ | 3 |
| Đọc hiểu | 3 |
| Khác nhóm | 1 |

14 câu ngữ pháp/trợ từ/hội thoại chia theo bài 4/5/6/7/khác: 2/4/4/3/1.
Ba câu đọc hiểu lấy trọn khối ba trang liên tiếp của cùng đề từ SP26; không trộn các đoạn.
Không lấy câu chỉ có nguồn PT, thiếu đáp án, đáp án đánh dấu chưa chắc chắn hoặc nhóm cần xem lại. Nếu thiếu câu để đủ ma trận thì báo lỗi, không tự bù sai dạng. Không sửa ngân hàng gốc.

Đây là cấu hình luyện tập trong các khoảng người dùng cung cấp, không phải ma trận chính thức. Phân loại tách ngữ pháp/từ vựng/hội thoại và nhãn bài dùng quy tắc tự động từ nội dung, còn có sai số. Cấu hình này chọn 3 câu đọc hiểu và 0 câu nghĩa/sắp xếp trong các khoảng đã cho.

## Kiểm thử

Sau khi cài dependency dự án:

```sh
npm run test:study
npm run test:sync
```

- 20 ca điểm luyện gõ: component React thật và bộ kiểm tra đáp án thật; giả lập thời gian, trình duyệt, âm thanh và adapter đồng bộ để không tác động tài khoản/dữ liệu thật.
- 5 ca ma trận, gồm sinh 500 đề từ ngân hàng thật: đủ dạng/bài, không trùng ID, đọc hiểu cùng khối, loại PT/câu không hợp lệ, lỗi thiếu dữ liệu và không sửa dữ liệu đầu vào.
- 41 ca đồng bộ hiện có qua kiểm tra.
- Kiểm tra TypeScript toàn bộ nguồn, bundle JavaScript ứng dụng và `git diff --check` đều qua.

Kết quả JSON nằm trong `test-results/typing-score.json` và `test-results/fe-matrix.json` (thư mục được bỏ qua trong Git).
Chưa kiểm thử E2E trên website đã triển khai. Thay đổi chỉ ở mã nguồn trên máy, chưa commit/push/publish.
