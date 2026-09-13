# SMASH TEAM - HỆ THỐNG QUẢN LÝ CÂU LẠC BỘ CẦU LÔNG (BADMINTON CLUB PLATFORM)

Chào mừng bạn đến với **SMASH TEAM Badminton Platform** - hệ thống quản lý câu lạc bộ cầu lông tích hợp **Gamification** (Thẻ người chơi, xếp hạng ELO Đơn/Đôi, Nhiệm vụ, Kho đồ, Shop) và cổng thông tin thành viên (Player Portal), được thiết kế cho Ban chủ nhiệm và Hội viên.

---

## 1. KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Hệ thống theo mô hình **Client-Server** tách biệt (Decoupled Architecture).

```mermaid
graph TD
    User([Người dùng / Hội viên / Admin]) -->|HTTPS| FE[Frontend Next.js]
    FE -->|API Requests - JWT Bearer| BE[Backend Node.js / Express]
    BE -->|Query SQL| DB[(PostgreSQL remote qua DATABASE_URL<br/>hoặc Embedded PGlite local)]
    BE -->|Avatar / Media| ST[(Cloudinary nếu có cấu hình<br/>ngược lại lưu local /backend/uploads)]
    BE -->|Gửi email chào mừng| RS[(Resend API)]
```

> Ghi chú: code không hard-code Vercel / Render / Supabase. Frontend lấy API URL từ `NEXT_PUBLIC_API_URL` (fallback `http(s)://<hostname>:5000` trong `frontend/app/config.ts`). Backend bật CORS cho localhost, IP nội bộ (`26.*`, `192.168.*`, `10.*`), `*.id.vn`, `*.vercel.app` trong `backend/index.js`. Domain production mặc định trong code là `https://smashteam.id.vn` (`FRONTEND_URL`).

### 1.1. Công nghệ Frontend (`/frontend`)

* **Framework:** Next.js `16.2.6` + React `19.2.4` (App Router). Xem `frontend/package.json`.
* **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`, `tailwindcss`).
* **Animation & hiệu ứng:** `framer-motion`, `canvas-confetti` (bắn pháo giấy khi check-in thành công ở `app/check-in/page.tsx`).
* **QR Code:**
  * `qrcode.react` — hiển thị mã QR buổi tập cho Admin in/dán tại sân.
  * `html5-qrcode` (`Html5Qrcode`) — quét QR bằng camera trên trang `/check-in`, bên cạnh chế độ nhập mã tay.
* **HTTP client:** `axios`.
* **Tiện ích:** `date-fns` (định dạng ngày giờ), `lucide-react` (icons).
* **Ảnh remote:** cho phép `res.cloudinary.com`, `images.unsplash.com`, `localhost`, `127.0.0.1` trong `frontend/next.config.ts`.
* **Âm thanh duy nhất trong code:** tiếng "beep" ngắn bằng WebAudio khi check-in thành công (`playSuccessSound` trong `app/check-in/page.tsx`). **Không có nhạc nền BGM / Synthwave / EDM nào trong code.**

### 1.2. Công nghệ Backend & Database (`/backend`)

* **Runtime:** Node.js 18+ (khuyên dùng bản LTS mới), Express `5.2.1`. Lệnh chạy: `node index.js` (`backend/package.json` script `start`).
* **Cơ sở dữ liệu — 2 chế độ tự động trong `backend/db/index.js`:**
  * Nếu `DATABASE_URL` hợp lệ (không phải giá trị mẫu `user:password@localhost` / `username:password@host`) → kết nối PostgreSQL remote bằng `pg` (dùng cho Supabase / Neon / Render...).
  * Ngược lại → dùng Embedded PostgreSQL **PGlite** (`@electric-sql/pglite`) lưu tại `backend/local_pgdata/`, tự chạy `schema.sql` + toàn bộ `db/migrations/*.sql` qua `db/setup-local-db.js`. Không cần cài Postgres riêng khi dev local.
* **Transactions & chống race-condition:** dùng `BEGIN` + `SELECT ... FOR UPDATE` khi nhận thưởng quest (`routes/gamification.js`), ghi kết quả trận đấu (`routes/matches.js`), mua/equip vật phẩm shop (`routes/shop.js`).
* **Bảo mật:** JWT (`jsonwebtoken`, middleware `middleware/auth.js` với `authenticateToken`, `isAdmin`), mật khẩu hash bằng `bcrypt`.
* **Upload file (`utils/cloudinary.js`):**
  * Nếu có đủ `CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET` → upload lên Cloudinary (folder `smashteam`, avatar folder `avatars` resize 300x300).
  * Nếu không → lưu đĩa local tại `backend/uploads/`, serve tĩnh qua `GET /uploads/*` (`index.js`), `req.file.path` được rewrite thành URL HTTP. Giới hạn 10MB, chỉ nhận `image/*`.
* **Email chào mừng (`utils/emailService.js`):** dùng **Resend API** (`resend` package, `RESEND_API_KEY`), gửi từ `SMASH TEAM <clb@smashteam.id.vn>`, nút kích hoạt trỏ về `${FRONTEND_URL}/claim-account`. Chạy non-blocking khi duyệt casting. **Không dùng Nodemailer / SMTP trực tiếp trong code hiện tại.**

---

## 2. CÁC TÍNH NĂNG CHÍNH (KEY FEATURES)

### 2.1. Trang chủ (`/` — 4 tab trong `frontend/app/page.tsx`)

* **Tab "Giới thiệu":** hero + số liệu thật từ `GET /api/stats` (hội viên active, số giải, top ELO), countdown sự kiện nổi bật (`FeaturedEventCountdown` đọc `site_settings`), thẻ chiến dịch tuyển quân (`EventRecruitmentCard` từ `GET /api/campaigns/active`), khối lợi ích / gallery.
* **Tab "Bảng xếp hạng":** leaderboard công khai, chuyển Đơn/Đôi (`GET /api/users/leaderboard?type=singles|doubles`), podium Top 3, ô tìm kiếm tên, chú thích phân hạng ELO (xem 2.6).
* **Tab "Lịch đánh":** buổi tập sắp tới (`GET /api/sessions`) và lịch sử (`GET /api/sessions?history=true`), nút RSVP **Tham gia / Vắng mặt** (`POST /api/profile/rsvp`, cần đăng nhập). RSVP chỉ ghi nhận lịch trình, **không cộng XP/coins** — XP chỉ cộng khi check-in tại sân (xem 2.3).
* **Tab "Hoạt động" (Media Feed):** ảnh + video YouTube từ `GET /api/media` (fallback 3 item mẫu Unsplash/YouTube khi API trống).

### 2.2. Cổng Thông Tin Thành Viên (`/profile`)

* **Thẻ người chơi:** avatar + khung viền (`selected_avatar_frame`), danh hiệu, màu neon theo rank ELO hiện tại (`frontend/app/utils/rank.ts`).
* **Stats Board:** số trận, tỉ lệ thắng, chuỗi thắng/thua, huy hiệu kỹ năng mềm (`soft_skills` JSONB), lịch sử trận (`GET /api/matches`), tiến trình quest, túi đồ.
* **Đăng nhập yêu cầu:** token `admin_token` trong localStorage, API `GET /api/profile/me`.

### 2.3. Điểm danh & Quản lý buổi tập

* **Trang điểm danh (`/check-in`, `frontend/app/check-in/page.tsx`) — 3 cách vào:**
  1. Mở link QR: `/check-in?session_id=<id>&code=<qr_code>` → gọi `POST /api/sessions/:id/qr-check-in`.
  2. Quét camera trực tiếp bằng `Html5Qrcode`.
  3. Nhập tay mã 5 ký tự (`checkin_code`) → gọi `POST /api/sessions/code-check-in`.
* **Active Time Window (code thật trong `backend/routes/sessions.js`):** member chỉ check-in được khi `giờ hiện tại - giờ bắt đầu` nằm trong khoảng **-720 phút (trước 12 tiếng) đến +360 phút (sau 6 tiếng)**. Admin bypass để test. Sai window trả lỗi kèm giờ diễn ra buổi tập. (README cũ ghi "-30/+120 phút" là **sai**.)
* **Chống điểm danh 2 lần:** kiểm tra `attendances` (`status='going'`), unique `(session_id, user_id)`.
* **Quà chuyên cần (đúng code):** **+25 XP và +10 Smash Coins**, `trackActivity(userId, 'check_in')`, pháo giấy confetti + beep. Áp dụng cho cả 2 endpoint trên.
* **Admin (`/admin/sessions` + `backend/routes/admin.js`):** tạo buổi tập (`title`, `date_time`, `location`), tự sinh `qr_code` + `checkin_code` 5 ký tự, refresh mã, lấy URL check-in `${origin}/check-in?session_id=...&code=...` để in QR, xem danh sách điểm danh.

### 2.4. Gamification: Nhiệm vụ, Kho đồ, Shop, Level

* **Quests Engine (`backend/routes/gamification.js`, `utils/gamification.js`):**
  * Quest có `quest_type`: `daily / weekly / monthly / seasonal`, `action_type`: `check_in / play_matches / win_matches / custom`, `target_count`, `xp_reward`, `coin_reward`, `is_active`.
  * **Lazy-Reset (không cron):** khi mở danh sách quest (`GET /api/gamification/quests`), backend so sánh `updated_at` với đầu ngày / đầu tuần / đầu tháng hiện tại để reset `current_count / is_completed / is_claimed`. **Code hiện tại chỉ reset `daily / weekly / monthly` — quest `seasonal` không có logic auto-reset.**
  * Tiến trình cập nhật qua `trackActivity()` (UPSERT nguyên tử, không vượt `target_count`).
  * **Nhận quà (`POST /api/gamification/quests/:id/claim`):** bọc transaction + `SELECT ... FOR UPDATE`, chặn nhận 2 lần (`is_claimed`), cộng XP (tự lên level) + coins.
  * Công thức lên level: `XP cần = round(80 * level^1.5)` (`getXpForLevel`).
* **Kho đồ (`user_inventory`):** chứa `avatar_frame`, `title`...; trang bị/tháo realtime, đồng bộ lên thẻ người chơi.
* **Shop (`backend/routes/shop.js`, `/admin/shop`):** bảng `shop_items`, mua bằng `smash_coins` trong transaction (`FOR UPDATE` cả user lẫn item), thống kê lượt mua theo tháng.
* **Streak:** `streak / streak_shields` trên `users`; có thông báo reset khi không hoạt động (xử lý trong gamification route).

### 2.5. Trận đấu & ELO (`backend/routes/matches.js`, `utils/elo.js`, `/admin/matches`)

* Nhập kết quả Đơn hoặc Đôi (kèm partner IDs), tách riêng chỉ số Đơn/Đôi (`elo_singles / elo_doubles`, `win/loss/matches_*`, `win_rate_*`, `streak_*`).
* Thuật toán `calculateElo()`: rating đội = trung bình 2 người (đánh đôi); K-factor cá nhân = `40` nếu <10 trận, `36` nếu streak ≥3, còn lại `24`; K đội = trung bình K; kỳ vọng theo công thức ELO chuẩn `1/(1+10^((T2-T1)/400))`; ELO floor `100`.
* Lịch sử 50 trận gần nhất `GET /api/matches` lưu `elo_exchanged`, `score_p1/p2`, ELO trước/sau.

### 2.6. Phân hạng Rank ELO (đồng nhất BE + FE)

`backend/utils/elo.js` (`getRankName`) và `frontend/app/utils/rank.ts` dùng chung mốc:

| Rank | ELO |
|---|---|
| Challenger | ≥ 1800 |
| Diamond | ≥ 1600 |
| Platinum | ≥ 1400 |
| Gold | ≥ 1200 |
| Silver | ≥ 1100 |
| Bronze | < 1100 |

### 2.7. Tuyển quân / Casting & Thành viên mới

* **Đăng ký ứng tuyển:** modal trên trang chủ → `POST /api/campaigns/...` (chiến dịch `recruitment_campaigns` + `casting_slots`, hỗ trợ `custom_questions`, `extra_answers` JSONB).
* **Duyệt casting (`PUT /api/users/:id/approve`, `backend/routes/users.js`):**
  * Chuẩn hóa `full_name`, `phone_zalo`, `email`, `academic_info`, `badminton_level`.
  * **Chặn trùng SĐT và email** với user khác (lỗi 400).
  * ELO khởi điểm theo trình độ: **Mới chơi → 900, Trung bình → 1000, Khá/Giỏi → 1150** (set cả `elo_singles` và `elo_doubles`).
  * Lưu `casting_notes`; số sao email mặc định theo trình độ (2/3/4) nếu không truyền `stars`.
  * **Gửi email chào mừng qua Resend (non-blocking)** nếu có email — link kích hoạt `${FRONTEND_URL}/claim-account`.
* **Kích hoạt tài khoản (`/claim-account`):** dùng `CLUB_VERIFY_PIN` để xác thực hội viên cũ (`POST /api/auth/...` trong `backend/routes/auth.js`).
* **Quản lý nhân sự (`/admin/personnel`):** tìm kiếm, duyệt, khóa/mở, **xóa vĩnh viễn** tài khoản (kèm cảnh báo xóa cả ELO/lịch sử/thành tích).
* **Auth chung (`/login`, `/register`, `/admin/login`):** JWT, role `candidate / member / admin`.

### 2.8. Nội dung, Sự kiện, Cài đặt (Admin)

* **Nội dung (`/admin/content`, `routes/media.js`, `routes/settings.js`):** CRUD `media_posts` (feed trang chủ), `site_settings` key-value (cover, địa chỉ, liên hệ, social, featured event...).
* **Sự kiện (`/admin/events`, `routes/events.js`):** CRUD `club_events` (title, subtitle, event_date, location, badge, participants...), đếm vào `/api/stats`.
* **Chiến dịch (`routes/campaigns.js`):** CRUD `recruitment_campaigns` + slots, endpoint `GET /api/campaigns/active` cho trang chủ.
* **Dashboard admin (`/admin`):** thống kê candidates/members/matches/media (`GET /api/users/stats`), quản lý quests (`/admin/quests`), matches, shop, sessions, events, content, personnel.

---

## 3. SƠ ĐỒ CƠ SỞ DỮ LIỆU (THỰC TẾ THEO CODE)

> `backend/db/schema.sql` chỉ là schema gốc tối thiểu. Schema đầy đủ = `schema.sql` + `backend/db/migrations/01–19*.sql` (áp tự động bởi `setup-local-db.js` cho PGlite; với Postgres remote thì chạy `db/init.js` cho base + các file migration theo thứ tự).

Các bảng chính trong code:

* **`users`** — `id` UUID, `full_name`, `phone_zalo` (unique-check ở app layer), `email`, `gender`, `academic_info`, `badminton_level` (`Mới chơi / Trung bình / Khá/Giỏi`), `soft_skills` JSONB, `extra_answers` JSONB, `role` (`candidate/member/admin`), `status` (`active/inactive/left`), `is_blocked`, `password_hash`, `avatar_url`, `nickname`, `level / xp / smash_coins`, `streak / streak_shields`, `selected_avatar_frame / active_frame / active_title`, `casting_notes`, ELO Đơn: `elo_singles, matches_singles, win_singles, loss_singles, win_rate_singles, streak_singles`, ELO Đôi tương tự `elo_doubles...`, `joined_at / created_at`.
* **`quests`** — `id` SERIAL, `title`, `quest_type` (`daily/weekly/monthly/seasonal`), `action_type` (`check_in/play_matches/win_matches/custom`), `target_count`, `xp_reward`, `coin_reward`, `is_active`.
* **`user_quests`** — `(user_id, quest_id)` unique, `current_count`, `is_completed`, `is_claimed`, `updated_at`.
* **`user_inventory`** — `id` SERIAL, `user_id`, `item_type` (`avatar_frame/title/...`), `item_name`, `item_value`, `is_equipped`, `acquired_at`.
* **`shop_items`** — vật phẩm bán bằng `smash_coins` (+ bảng log mua / `admin_logs` trong migration 12–13).
* **`sessions`** — `id` UUID, `title`, `date_time`, `location`, `qr_code`, `checkin_code` (5 ký tự), `qr_created_at`, `created_at`.
* **`attendances`** — `id` UUID, `session_id`, `user_id`, `status` (`going/absent`), `created_at`; unique `(session_id, user_id)`. RSVP và check-in dùng chung bảng (check-in = upsert `status='going'`).
* **`matches`** — `id` UUID, `player1_id / player2_id / player1_partner_id / player2_partner_id / winner_id`, `score_p1 / score_p2 / score_detail`, `elo_exchanged`, ELO trước/sau (`p1_elo_before...`), `created_at`.
* **`media_posts`** — `id` UUID, `title`, `content_url`, `is_featured`, `created_at`.
* **`recruitment_campaigns` + `casting_slots`** — chiến dịch tuyển quân, slots, `custom_questions / timeline_steps / badge_text / target_capacity...`.
* **`club_events`** — sự kiện CLB (`title, subtitle, event_date, location, badge, action_text/link, status, participants_count/max...`).
* **`site_settings`** — `key / value` (cấu hình trang chủ, featured event...).
* *(legacy)* `smash_pass_rewards` tồn tại trong migration 11 nhưng đã bị gỡ logic ở migration 14 (`14_remove_smash_pass.sql`).

---

## 4. HƯỚNG DẪN CÀI ĐẶT CỤC BỘ (LOCAL SETUP)

### Bước 1: Chuẩn bị env

1. Clone repo.
2. Backend: copy `backend/.env.example` **hoặc** `template.env` (ở thư mục gốc) thành `backend/.env`, rồi điền giá trị thật:

```env
# Bắt buộc
DATABASE_URL=postgresql://user:password@host:5432/smashteam
JWT_SECRET=chuoi_bi_mat_cua_ban
PORT=5000

# Kích hoạt tài khoản hội viên cũ
CLUB_VERIFY_PIN=123456

# Dùng cho link kích hoạt trong email + CORS gợi ý
FRONTEND_URL=http://localhost:3000

# Email chào mừng (Resend) — bắt buộc nếu muốn gửi mail thật
RESEND_API_KEY=re_your_api_key_here

# Upload ảnh — tùy chọn, thiếu thì tự lưu local backend/uploads
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

* Nếu để `DATABASE_URL` là giá trị mẫu / bỏ trống → backend tự dùng **PGlite local** (`backend/local_pgdata/`), không cần cài Postgres.
* Nếu muốn dùng Postgres remote (Supabase/Neon/...): điền `DATABASE_URL` thật, rồi chạy `node db/init.js` trong `backend/` cho schema gốc và áp các file `db/migrations/*.sql` theo thứ tự.
* Tài khoản admin seed mặc định (tạo bởi `setup-local-db.js`): **SĐT `0999999999` / mật khẩu `admin123`** (hash bcrypt lại mỗi lần khởi động local).

3. Frontend (tùy chọn): tạo `frontend/.env.local` nếu API không ở `http://<hostname>:5000`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Bước 2: Chạy dev nhanh bằng script

Nhấp đúp `start-dev.bat` ở thư mục gốc (hoặc chạy `.\start-dev.bat` trong terminal). Script tự `npm install` nếu thiếu `node_modules` rồi mở 2 cửa sổ:

* **Backend:** `http://localhost:5000` (health: `GET /` → `{ message: 'Welcome to SmashTeam API' }`)
* **Frontend:** `http://localhost:3000` (trang cá nhân sau login: `http://localhost:3000/profile`)

Chạy tay tương đương:

```bat
cd backend && npm install && node index.js
cd frontend && npm install && npm run dev
```

### API base URL

Mọi API backend đều dưới prefix `/api/*` (xem `backend/index.js`):

`/api/auth, /api/users, /api/media, /api/matches, /api/campaigns, /api/settings, /api/profile, /api/sessions, /api/admin, /api/gamification, /api/shop, /api/stats, /api/events`

---

## 5. CẤU HÌNH GỬI EMAIL (RESEND — ĐÚNG THEO CODE)

Code hiện tại gửi mail qua **Resend** (`backend/utils/emailService.js`), không dùng Nodemailer/SMTP hay Google Apps Script proxy.

1. Đăng ký tại [resend.com](https://resend.com), verify domain `smashteam.id.vn` (để gửi từ `clb@smashteam.id.vn` như trong code).
2. Tạo API key, set `RESEND_API_KEY` trong `backend/.env` (và env production).
3. Set `FRONTEND_URL` đúng domain public (vd `https://smashteam.id.vn`) để nút **KÍCH HOẠT TÀI KHOẢN** trong email trỏ đúng `/claim-account`.
4. Nếu thiếu `RESEND_API_KEY` hoặc `toEmail` trống, hàm `sendWelcomeEmail()` chỉ log warning và bỏ qua — API duyệt casting vẫn thành công.
