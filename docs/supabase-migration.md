> Lựa chọn mới nhất: bắt đầu dữ liệu mới trên Supabase, không chuyển Firebase. Không cần service-account JSON, Google Cloud ADC hoặc key quản trị để chạy công cụ migration. Các phần migration bên dưới chỉ là hướng dẫn tùy chọn, hiện không thực hiện.
> Bộ nhớ ứng dụng được tách theo project Supabase; cache/outbox Firebase cũ giữ nguyên nhưng không tự khôi phục vào bản mới.

# Giữ giao diện cũ, thay Firebase bằng Supabase

## Trạng thái

Đã chuyển mã nguồn sang Supabase Auth, PostgreSQL, Realtime và Storage. Không còn Firebase SDK trong ứng dụng web. File src/lib/firebase.ts chỉ là alias tương thích; Firebase Admin chỉ được công cụ chuyển dữ liệu dùng trên máy quản trị.

Đã cấu hình project hosted wjqajawefmdzvijqbnkj, chạy hai migration SQL, bật Google OAuth và kiểm thử đăng nhập Google thành công trên localhost. Đánh dấu nhớ/bỏ nhớ một từ đã được đối chiếu trực tiếp với bản ghi database hosted, sau đó trả về trạng thái ban đầu. Chưa kiểm thử điện thoại vật lý; việc triển khai Render đang được chuẩn bị. Không chuyển dữ liệu Firebase theo lựa chọn bắt đầu mới.

Không phải tự thuê hoặc dựng máy chủ. Supabase quản lý database, Auth, Storage và realtime. Website vẫn có thể đặt ở Render như trước; server.ts giữ các API AI hiện tại.

## 1. Project và SQL

Tạo project tại https://supabase.com/dashboard. Lấy Project URL và publishable key hoặc anon public key. Không gửi mật khẩu database, secret/service-role key vào chat. Không đặt secret trong biến VITE_.

Chạy hai file trong SQL Editor, đúng thứ tự:

1. supabase/migrations/202611050002_full_backend.sql
2. supabase/migrations/202611050003_images.sql

SQL tạo documents theo dạng dữ liệu/đường dẫn hiện tại, kiểm tra ownership ở server, giao dịch nguyên tử bằng revision và publication realtime. Có thể chạy lại.

Học viên chỉ đọc/ghi dữ liệu của mình. Chủ daiduong4112006@gmail.com quản lý người dùng và đọc thư viện, không sửa bộ đề học viên. Quyền JPD123 từng mục, khóa/mở tài khoản và nhật ký append-only kiểm tra ở server. Profile role hoặc user_metadata không cấp admin. Email phải được xác minh trong Supabase Auth.

Bucket quiz-images dùng URL ảnh công khai để hình trong link chia sẻ hiển thị được, tương tự URL tải ảnh cũ. Liệt kê/sửa/xóa file vẫn có RLS theo UID. Bản ghi âm microphone vẫn riêng thiết bị, không tự upload.

## 2. Đăng nhập

Giao diện ứng dụng chỉ cung cấp đăng nhập Google. Google OAuth đã bật. Site URL là https://d-n-ma.onrender.com; redirect cho website đó và http://127.0.0.1:4336/. SMTP riêng chưa cấu hình; giao diện không yêu cầu gửi email xác minh/reset.

Đã bỏ form đăng ký/email/mật khẩu/quên mật khẩu khỏi giao diện. Route reset-password cũ chỉ hướng dẫn dùng Google. Các hàm tương thích backend còn giữ; Email provider chưa bị tắt trên dashboard. Không tạo tài khoản/mật khẩu dự phòng trong localStorage. Trigger tạo profile khi Supabase Auth tạo user.

Không chép mật khẩu cũ. Tài khoản chuyển theo email: dùng Google cùng email hoặc tự yêu cầu đặt mật khẩu mới ở màn hình đăng nhập. Chỉ giữ email_confirmed cho tài khoản Firebase thực sự đã xác minh. Không cần Firebase Third-party Auth/custom claim trong kiến trúc mới.

## 3. Chạy ứng dụng

Dùng Node 22+, npm và package-lock.json. Đã bỏ bun.lock để chỉ dùng một lockfile.

```powershell
npm ci
```

Tạo .env.local (gitignore):

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
```

Giữ GEMINI_API_KEY riêng ở server cho API AI. Chạy npm run dev.

Render: thêm hai biến VITE_ vào Environment, build bằng `npm ci && npm run build`, start `npm start`. Cần rebuild khi đổi URL/key vì VITE_ được nhúng lúc build. Chưa triển khai trước khi SQL, Auth và dữ liệu được kiểm tra.

## 4. Chuyển Firebase — dry run trước

Công cụ scripts/migration/firebase-to-supabase.cjs dùng Firebase Admin Application Default Credentials hoặc GOOGLE_APPLICATION_CREDENTIALS có quyền đọc project/database nguồn. Chỉ chạy trên máy tin cậy.

Thiết lập môi trường shell cục bộ:

- SUPABASE_URL: project đích.
- SUPABASE_SERVICE_ROLE_KEY: key server, không đặt trong VITE_ hay source.
- GOOGLE_APPLICATION_CREDENTIALS nếu dùng service-account file riêng; không commit file này.

```powershell
npm run migrate:supabase
```

Mặc định chỉ đọc và đếm nguồn; không ghi đích, không gửi email. Kiểm tra project/database và số lượng. Dừng chỉnh sửa trên các thiết bị khi chuyển chính thức.

```powershell
# Chỉ sau khi kiểm tra dry run và sao lưu:
npm run migrate:supabase -- --apply --images
```

Công cụ tạo tài khoản theo email, bỏ mật khẩu legacy, sao chép toàn bộ collection, kết quả lớp học và ảnh trong quiz-images. Backup dữ liệu đã bỏ password nằm trong test-results/migration-backups (gitignore; vẫn chứa dữ liệu riêng, cần bảo vệ thư mục). Không xóa hay ghi vào Firebase. Dừng khi không xác định được chủ dữ liệu, không tự đoán ownership. Chạy lại sẽ giữ các đường dẫn đã có ở Supabase, không ghi đè dữ liệu đích mới. Profile của user vừa tạo được điền từ bản nguồn.

## 5. Dữ liệu chờ trên từng máy

Đăng nhập Supabase đúng email cũ, vào Cài đặt → Dữ liệu → Chuyển dữ liệu cũ sang Supabase. Trang này chỉ xử lý payload đang chờ của tài khoản hiện tại, cần xác nhận trước khi chuyển. Hàng đợi cũ không âm thầm đổi đích.

Cache theo email được giữ. Nếu sửa offline ở nhiều máy, chuyển lần lượt trên từng máy rồi kiểm tra bản mới nhất. Reset/xóa có tombstone; SRS hợp nhất từng thẻ; lịch sử FE hợp nhất theo ID. Payload cũ không phục hồi bộ đề đã xóa.

## 6. Kiểm tra trước khi dùng thật

Thử máy tính và điện thoại cùng tài khoản trên project thật: đăng nhập/Google/reset mật khẩu; khóa học; đã nhớ/bỏ nhớ; thêm/sửa/xóa; ảnh; luyện tập/reset; FE/SPK/SRS; kết quả thi; sao/từ cần nhớ; cài đặt; quyền từng mục; khóa/mở học viên; thư viện; chia sẻ công khai/hết hạn/kết quả lớp; offline/online.

Lỗi quyền/kết nối không được coi là snapshot riêng tư rỗng. Dữ liệu chờ chỉ được bỏ sau khi server xác nhận. Hai máy sửa cùng document dùng revision chống ghi chồng.

Giữ Firebase và backup nguyên trạng tới khi đối chiếu xong. Nếu quay về Firebase, cần xuất phần phát sinh Supabase và kế hoạch khôi phục phiên bản Git cũ; không có rollback dữ liệu tự động giữa hai nền tảng.

## Kiểm thử

- npm run test:supabase: native Auth với SDK giả lập; PostgreSQL RLS/RPC/Storage; integration mã ứng dụng với hai client/bộ nhớ độc lập và API/realtime giả lập.
- npm run test:sync: hồi quy offline, hàng đợi, đồng bộ và component flashcard.
- npm run test:study: ma trận FE, 20 tình huống gõ và Speaking.
- npm run test:settings-admin và npm run test:japanese-entry.
- npm run lint và npm run build.

Chưa xác nhận hosted Supabase, OAuth/SMTP thật hoặc upload ảnh qua Storage hosted. CI đã thêm các kiểm thử liên quan trước build.

Tài liệu chính thức: https://supabase.com/docs/guides/auth ; https://supabase.com/docs/guides/realtime/postgres-changes ; https://supabase.com/docs/guides/storage/security/access-control
