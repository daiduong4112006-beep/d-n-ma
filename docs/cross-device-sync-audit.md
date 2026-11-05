# Kiểm tra đồng bộ đa thiết bị — 2026-11-05

## Phạm vi và kết quả

Đã sửa mã nguồn tại dự án mcq-master trên máy. Chưa commit, push hoặc triển khai production.

| Nhóm dữ liệu | Cơ chế/kiểm tra |
| --- | --- |
| Khóa học Nhật, bài và thẻ | Thêm/sửa/xóa, đã nhớ/bỏ nhớ, khởi tạo thiết bị mới, chống seed sạch ghi đè tiến độ |
| Bộ đề MCQ | Thêm/sửa/xóa bằng tombstone; bản offline cũ không phục hồi đề đã xóa |
| Kết quả thi và từ đánh dấu | Kết quả thi, sao/bỏ sao câu hỏi, CRUD từ cần nhớ |
| Tiến độ học MCQ | Flashcard, đáp án luyện tập, câu sai, tiếp tục và xóa tiến độ; reset truyền lên server |
| Tiến độ Nhật | Flashcard, luyện gõ từ/ví dụ/ngữ pháp/Kanji, trắc nghiệm, số lỗi/điểm; nhận thay đổi ở câu số 0 và cùng chỉ số câu |
| Luyện Hán Việt | Chuyển bản lưu trực tiếp localStorage sang trạng thái tài khoản có đồng bộ |
| FE | Đánh dấu ngân hàng, đáp án đã chọn, reset, lịch sử thi thử; hợp nhất theo ID lượt thi |
| SPK | Tiến độ, ghi chú và kết quả trong iframe được nối với trạng thái tài khoản |
| SRS | Lịch ôn theo thẻ, giới hạn từ/ngày và bộ đếm; hợp nhất bản mới hơn của từng thẻ |
| Cài đặt | Giao diện/âm thanh và nhóm tùy chọn trải nghiệm theo tài khoản |
| Quyền quản trị | Quyền JPD123 từng mục, khóa/mở tài khoản, nhật ký; tải quyền chậm không làm mất khóa học |
| Ngoại tuyến | Hàng đợi bền vững theo tài khoản, xác nhận server, retry sau online/đăng nhập/mở lại |
| Đổi tài khoản | Cache và kênh thông báo tách theo email, không mang tiến độ tài khoản cũ sang mới |

21/21 integration cases đạt: hai tiến trình Firebase độc lập và hai tệp bộ nhớ riêng; dùng Auth/Firestore emulator project demo-dun-admin-qa. Không dùng dữ liệu production, không giả lập hai thiết bị bằng cùng localStorage. Báo cáo JSON ở test-results/device-sync/report.json.

Kiểm thử hồi quy: sync, study (20 typing cases; FE matrix; Speaking), settings/admin 15 cases, Japanese entry 6 cases, Firestore security 8 cases. TypeScript và production build được chạy lại sau sửa.

Giao diện cục bộ đã đăng nhập tài khoản giả lập, mở danh sách khóa học, vào bài và bấm Ghi nhớ: số đã nhớ tăng; trạng thái chuyển từ đang chờ sang đã đồng bộ sau server acknowledgement.

## Nguyên nhân chính

Seed JPD123 từng có thời gian tạo mới trên mỗi máy và được coi mới hơn tiến độ thật. Một số luồng chỉ lưu local/broadcast trong máy; lỗi ghi cloud bị nuốt. Một số reset không ghi dấu xóa. Listener cùng chỉ số câu bỏ qua thay đổi số lỗi/đáp án. Đã sửa các đường này và tách cache theo tài khoản.

Firestore transaction đọc trước khi tạo document đầu tiên cần quyền đọc document chưa tồn tại của người dùng đã xác thực. Rules đã sửa và kiểm thử; không mở quyền đọc dữ liệu tồn tại của người khác.

## Những gì vẫn riêng thiết bị

Bản ghi âm microphone được chủ ý giữ trong trình duyệt, không tự tải lên cloud. Trạng thái cài PWA, sidebar thu gọn, lựa chọn giọng đọc/IME, chiều gõ, trộn bài cục bộ, khung flashcard rộng, bộ lọc hiển thị và lựa chọn mục gộp vẫn là tùy chọn thiết bị. File backup đã tải về không phải bản sao lưu cloud. Chế độ Khách không đồng bộ đa thiết bị.

Chưa kiểm thử trên điện thoại vật lý hoặc mạng production. Upload ảnh qua Firebase Storage phụ thuộc cấu hình Storage; bộ integration không xác nhận upload ảnh thật. Không khẳng định mọi loại xung đột nội dung được hợp nhất: phần lớn document dùng updatedAt mới hơn, SRS và lịch sử FE hợp nhất theo từng mục.

## Triển khai

1. Review/commit/push mã nguồn và để Render build bản mới.
2. Publish file firestore.rules vào đúng Firebase project production. Git push hoặc Render deploy không tự publish Firebase Rules.
3. Hai thiết bị tải lại bản mới, đăng nhập cùng tài khoản Firebase đã xác minh. Khi có lỗi/chưa gửi xong, thanh trạng thái cho biết còn dữ liệu chờ thay vì báo đã đồng bộ.

## Chạy lại

Chạy các npm scripts test:sync, test:study, test:settings-admin, test:japanese-entry, lint và build. test:admin-rules cần @firebase/rules-unit-testing qua MCQ_QA_TOOLS và Firestore emulator 8380. test:sync:devices cần Auth emulator 9199 và Firestore emulator 8380 với project demo-dun-admin-qa; suite xóa và tạo lại dữ liệu CHỈ trong emulator localhost, tuyệt đối không trỏ vào production.
