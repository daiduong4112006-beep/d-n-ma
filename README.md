<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# DUN MASTER — Supabase

Giữ giao diện và chức năng cũ; backend chuyển sang Supabase Auth/PostgreSQL/Realtime/Storage.

View your app in AI Studio: https://ai.studio/apps/798ae9df-1716-4ba0-aca6-f572d9631eff

## Run Locally

**Prerequisites:** Node.js 22+, npm. Dùng package-lock.json.


1. Install dependencies:
   `npm ci`
2. Cấu hình `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY` trong `.env.local`. Giữ `GEMINI_API_KEY` riêng trên server cho API AI. Không đặt secret/service-role key vào biến VITE_.
3. Run the app:
   `npm run dev`

Đọc [hướng dẫn chuyển dữ liệu](docs/supabase-migration.md) và chạy SQL trước khi triển khai.

Kiểm thử: `npm run test:supabase`, `npm run test:sync`, `npm run test:study`, `npm run test:settings-admin`, `npm run test:japanese-entry`, `npm run lint`.

Render: build `npm ci && npm run build`, start `npm start`. Rebuild sau khi thay biến VITE_. Không cần tự dựng database server.
