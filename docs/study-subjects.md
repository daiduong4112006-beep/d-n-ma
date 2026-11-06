# Môn học MAI391 và MAS291

- Giữ route `#japanese` để liên kết cũ tiếp tục hoạt động; menu đổi thành Môn học.
- Tiếng Nhật mở danh sách khóa học hiện có, giữ phân quyền JPD123.
- MAI391: 8 chương, 279 câu; MAS291: 10 chương, 663 câu. Giữ nguyên nội dung chương, ảnh, ghi chú và đáp án từ HTML nguồn; không nhập tiến độ cá nhân cũ trong trình duyệt.
- Tài liệu được chia thành hai iframe `sandbox="allow-scripts"`, không cho truy cập storage hay DOM của ứng dụng. Host kiểm tra nguồn cửa sổ, origin, mã môn, mã câu và giá trị trước khi lưu.
- Đáp án, trạng thái cần ôn và chương đang đọc lưu theo tài khoản bằng accountState/study_progress hiện có. Mỗi câu là một bản ghi riêng; bỏ đánh dấu dùng giá trị null để đồng bộ việc xóa. Khách chỉ lưu tại máy.
- Bài kiểm tra đang làm và kết quả được lưu theo môn. Đồng hồ dùng deadline; không ghi cloud mỗi giây. Bài kiểm tra không thay đổi tiến độ ôn tập.

## Ma trận luyện tập

Nguồn: Ma_tran_de_MAS291_MAI391.pdf, 14 trang, người dùng cung cấp. Đây là thống kê đề cũ, không phải quy định chính thức.

- MAS291: 50 câu, chương 1/2/3/4/6/7/8/9/10/11 tương ứng 2/8/10/8/5/3/3/4/3/4.
- MAI391: các số xấp xỉ trong tài liệu chỉ cộng thành 39. Cấu hình luyện tập dùng chương 3/4/5/6/7 tương ứng 7/8/11/8/6 để đủ 40; giao diện nói rõ điều chỉnh. Chương 9/10/12 vẫn có trong sổ ôn nhưng không bốc vào bài kiểm tra.
- Tần suất các dạng trong PDF được dùng làm trọng số phân bổ trong từng chương, xử lý thiếu câu theo khả năng ngân hàng. Không coi đó là số câu chính thức từng dạng.
- Chỉ bốc câu có đáp án được nguồn đánh dấu xác định, có lựa chọn tương ứng, không trùng mã câu.

## Cập nhật nguồn và kiểm thử

Chạy `python scripts/import-study-notebook.py "đường dẫn HTML nguồn"` để tạo lại tài sản và manifest. Importer đọc JSON và chuyển runtime đã kiểm tra, không chạy script của tệp đầu vào. Nếu định dạng nguồn thay đổi, importer dừng để kiểm tra lại.

`npm run test:subjects`: 300 đề mỗi môn, số câu/chương/dạng, không trùng, chấm điểm, dữ liệu khôi phục, phân tách nội dung và CSP.

`npm run test:sync`: gồm hai client độc lập với transport Supabase giả lập và PostgreSQL/RLS thực; kiểm tra đáp án MAI/MAS, reset, bài đang làm, quyền riêng tư, cùng các kiểm thử đồng bộ hiện có. Có kiểm tra cache iframe không ghi đè shell của ứng dụng.

Đã kiểm thử trình duyệt localhost: bốc đề 40/50, chọn/chuyển câu, tải lại khôi phục bài, nộp và xem lời giải, tiến độ riêng từng môn và hai tab. Chưa xác nhận hai môn mới trên điện thoại vật lý hoặc bản Render sau triển khai.
