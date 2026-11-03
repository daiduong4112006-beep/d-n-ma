# Kiểm thử đồng bộ

Chạy `npm install` rồi `npm run test:sync`. Hai bộ kiểm thử lưu trữ/liên lạc tab và lớp Firebase dùng thư viện esbuild đã có trong devDependencies. Không gọi Firebase thật, không đọc dữ liệu trình duyệt của bạn.

Kiểm thử component bổ sung cần `react-test-renderer` cùng phiên bản với React cài trong dự án. Có thể chạy riêng `node scripts/tests/flashcard-component.cjs`. Biến `SYNC_TEST_RUNTIME` cho phép chỉ đến thư mục node_modules kiểm thử độc lập; không cần sửa dependencies chạy thật.

Kết quả ghi trong `test-results/`. Firebase SDK được thay bằng bộ giả lập có kiểm tra giới hạn mảng lồng nhau để tái hiện lỗi đã thấy trên Render.

Đây là kiểm thử tự động ở cấp lưu trữ, bộ truyền sự kiện, lớp ghi cloud và component. Nó không thay thế kiểm thử hai trình duyệt/thiết bị trên bản Render đã deploy.
