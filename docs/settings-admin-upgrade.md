# Cài đặt và quản trị người dùng

Đã áp dụng vào mã nguồn thật, không sử dụng danh sách hoặc bộ đề mô phỏng của demo. Chưa commit/push và chưa triển khai lên Firebase/Render.

## Cài đặt
- Giao diện, cỡ chữ, mật độ, nền lưới, giảm chuyển động; thiết lập riêng theo tài khoản trên thiết bị.
- Âm thanh và giao diện tối dùng cơ chế tài khoản hiện có. Tùy chọn trải nghiệm bổ sung lưu trên thiết bị, không quảng cáo đồng bộ đám mây.
- Mặc định trộn câu/đáp án, thời gian thi; chế độ tập trung thu thanh bên khi vào học/thi MCQ.
- Xuất/nhập tùy chọn JSON có kiểm tra và xác nhận; đặt lại tùy chọn không xóa bộ đề/tiến độ. Sao lưu học tập dùng hàm hiện có.

## Quản trị
- Chỉ tài khoản Firebase Auth đã xác minh email `daiduong4112006@gmail.com` được quản trị; trường role trong hồ sơ và localStorage không cấp quyền.
- Danh sách lấy từ `users/{email}` đã lưu trong Firestore (không phải danh sách toàn bộ Firebase Auth chưa từng lưu hồ sơ). Email định danh lấy từ ID tài liệu, không tin trường email người dùng tự sửa.
- Tìm/lọc, phân trang, xuất JSON, xem bộ đề và bài thi theo userEmail. Khung hồ sơ luôn rộng 490px hoặc tối đa chiều rộng màn hình; tab Bộ đề không tự mở rộng.
- Truy cập của admin vào bộ đề/bài thi học viên chỉ đọc; không đưa vào kho bộ đề cá nhân. Chia sẻ tạo bản sao do admin sở hữu, có xác nhận trước khi công khai, bỏ điểm và thống kê học tập.
- Quyền JPD123: từ vựng, Kanji, ngữ pháp, speaking, FE. Chọn một hay nhiều tài khoản; preset từ vựng + ngữ pháp; bỏ hết để thu hồi. Danh sách cũ được giữ tương thích khi chưa có quyền theo mục; mảng rỗng mới luôn có ưu tiên thu hồi.
- Tạm khóa ứng dụng chặn đọc/ghi dữ liệu riêng bằng Firestore Rules. Đây không phải khóa/xóa tài khoản Firebase Auth. Tài khoản bị khóa vẫn đọc được trạng thái riêng để được mở khóa ngay trong phiên.
- Quyền và nhật ký được ghi cùng một transaction. Mất mạng/không có quyền không báo thành công. Nhật ký chỉ chủ hệ thống xem, không được sửa/xóa.
- JPD123 là nội dung có sẵn trong bundle của ứng dụng; giới hạn module điều khiển tính năng trên giao diện, không phải mã hóa hay bảo mật tài liệu đã tải về.

## Triển khai cần thiết
Phải cập nhật `firestore.rules` lên đúng database ID trong `firebase-applet-config.json` trước khi dùng Quản lý trên bản online. Commit/push lên Render chỉ cập nhật ứng dụng, không tự cập nhật Firebase Rules. Có thể dùng Firebase Console → Firestore Database → chọn đúng database → Rules → dán nội dung file → Publish. Không nới read/write công khai.

## Kiểm thử
- `npm run test:settings-admin`: kiểm thử phân quyền, transaction, truy vấn theo chủ sở hữu, nhập tùy chọn và cô lập tài khoản.
- `npm run test:sync`, `npm run test:study`, `npm run lint`, `npm run build`.
- `npm run test:admin-rules`: cần Firestore Emulator ở 127.0.0.1:8380 và @firebase/rules-unit-testing/Firebase SDK trong môi trường kiểm thử; đặt MCQ_QA_TOOLS tới thư mục chứa package.json của bộ công cụ nếu cài riêng.
- Môi trường trình duyệt kiểm thử chỉ dùng `VITE_USE_FIREBASE_EMULATORS=true` cùng Vite DEV; project giả lập cố định `demo-dun-admin-qa`, Auth 9199, Firestore 8380. Biến này bị vô hiệu trong bản build production. Không dùng dữ liệu/tài khoản thật trong giả lập.
