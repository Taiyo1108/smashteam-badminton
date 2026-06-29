# SMASH TEAM - HỆ THỐNG QUẢN LÝ CÂU LẠC BỘ CẦU LÔNG (BADMINTON CLUB PLATFORM)

Chào mừng bạn đến với **SMASH TEAM Badminton Platform** - hệ thống quản lý câu lạc bộ cầu lông hiện đại tích hợp tính năng **Gamification** (Thẻ người chơi, xếp hạng điểm ELO) và cổng thông tin thành viên (Player Portal) trực quan, được thiết kế chuyên biệt cho Ban chủ nhiệm và Hội viên.

---

## 1. KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Hệ thống được phát triển theo mô hình **Client-Server** tách biệt hoàn toàn (Decoupled Architecture), tối ưu hóa tải trọng và dễ dàng triển khai đa nền tảng.

```mermaid
graph TD
    User([Người dùng / Hội viên / Admin]) -->|Truy cập HTTPS / WSS| FE[Frontend Next.js - Vercel]
    FE -->|API Requests - JWT Bearer| BE[Backend Node.js/Express - Render]
    BE -->|Query SQL| DB[(Cơ sở dữ liệu PostgreSQL - Supabase)]
    BE -->|Lưu trữ ảnh Avatar| Cloudinary[(Cloudinary Media Storage)]
```

### 1.1. Công nghệ Frontend (Next.js App Router)
* **Framework chính:** Next.js (React 18) chạy trên kiến trúc App Router tối tân hỗ trợ Server-Side Rendering (SSR) và Client-side Navigation (SPA).
* **Styling (CSS):** Tailwind CSS v4 tối ưu hóa hiệu năng biên dịch và quản lý hệ màu tùy biến (`bg-smash-dark`, neon tím/bạc).
* **Hiệu ứng & Animation:** Framer Motion (cho các chuyển động mượt mà, transition tab) và Canvas Confetti (hiệu ứng ăn mừng khi đăng ký thành công).
* **Bộ Icon:** Lucide React.
* **Nhạc nền BGM:** Tích hợp bộ phát nhạc nền loop chất lượng cao Synthwave/EDM tự động phát khi phát hiện tương tác đầu tiên của người dùng.

### 1.2. Công nghệ Backend & Database
* **Runtime Environment:** Node.js v18+ kết hợp Express framework.
* **Cơ sở dữ liệu:** PostgreSQL lưu trữ dữ liệu quan hệ, được lưu trữ và tối ưu hóa kết nối trên nền tảng Supabase Cloud.
* **Bảo mật & Mã hóa:** Xác thực phiên làm việc bằng JSON Web Tokens (JWT) bảo vệ các API quản trị và API trang cá nhân. Mật khẩu được mã hóa an toàn bằng bcrypt trước khi lưu vào DB.
* **Lưu trữ tệp tin:** Tích hợp bộ thư viện Multer + Cloudinary SDK để tải ảnh đại diện lên bộ nhớ đám mây Cloudinary của câu lạc bộ, tự động tối ưu hóa dung lượng ảnh đại diện.

---

## 2. CÁC TÍNH NĂNG CHÍNH (KEY FEATURES)

### 2.1. Cổng Thông Tin Thành Viên (Player Portal `/profile`)
Trang cá nhân của hội viên được thiết kế mang đậm phong cách Game chuyên nghiệp:
* **Thẻ Người Chơi ELO (Player Card):** Hiển thị dọc bóng bẩy với viền neon phát sáng thay đổi màu sắc động dựa theo cấp Rank ELO hiện tại (Challenger: Đỏ-Tím phát sáng, Diamond: Xanh dương, Gold: Vàng ánh kim, v.v.).
* **Bảng Thông Số Kỹ Thuật (Stats Board):** Thống kê số trận đấu, tỷ lệ thắng, chuỗi thắng/thua liên tục, và hiển thị các huy hiệu (Badges) kỹ năng mềm đóng góp cho CLB (Chụp ảnh, Quay dựng, Thiết kế, Hỗ trợ giải).
* **Điểm Danh RSVP:** Hiển thị lịch sinh hoạt/tập luyện sắp tới của CLB. Cho phép hội viên bấm chọn RSVP (Tham gia / Vắng mặt) trực tiếp. Trạng thái RSVP được cập nhật tức thì (Upsert an toàn) vào Database.
* **Chỉnh Sửa Hồ Sơ & Đổi Mật Khẩu:**
  * Cho phép tự tải ảnh đại diện lên Cloudinary (chỉ nhận định dạng ảnh `accept="image/*"`, tự động dọn dẹp ảnh cũ trên Cloudinary để giải phóng dung lượng).
  * Chỉnh sửa thông tin liên hệ, nickname, học vấn cá nhân.
  * Đổi mật khẩu bảo mật có chỉ báo trực quan thời gian thực (real-time indicators) về độ dài tối thiểu 6 ký tự và kiểm tra khớp mật khẩu nhập lại.

### 2.2. Quy Trình Casting & Kích Hoạt Tài Khoản Mới
* **Trang Đăng Ký Casting (`/register`):** Quy trình gồm 3 bước chuyên nghiệp:
  1. *Thông tin cơ bản:* Họ tên, Số điện thoại Zalo (có cơ chế kiểm tra định dạng số điện thoại Việt Nam thời gian thực - báo lỗi nếu không đủ 10 số hoặc có chữ), chọn Giới tính.
  2. *Học vấn & Trình độ:* Chọn trường Đại học, niên khóa và tự đánh giá trình độ cầu lông (Mới chơi, Trung bình, Khá/Giỏi).
  3. *Chọn ca Casting:* Đọc thời gian và địa điểm thực tế từ cơ sở dữ liệu, cho phép ứng viên lựa chọn 1 ca phù hợp nhất.
* **Kích Hoạt Tài Khoản Cho Hội Viên Cũ (`/claim-account`):** Các thành viên cũ đã có thông tin trong danh sách của CLB nhưng chưa có tài khoản đăng nhập có thể nhập số điện thoại Zalo cùng **Mã PIN xác thực của CLB** (Mặc định: `123456`) để thiết lập mật khẩu mới và kích hoạt tài khoản của mình.

### 2.3. Trang Chủ & Bảng Xếp Hạng Công Khai (`/`)
* **Hệ thống Menu Động:** Nút điều hướng góc phải tự động thay đổi dựa trên trạng thái đăng nhập (Đăng nhập / Trang cá nhân / Trang quản trị).
* **Bảng Xếp Hạng (Leaderboard):** Xếp hạng điểm ELO công khai của các thành viên. Hỗ trợ chuyển đổi tab xem điểm ELO Đơn (Singles) hoặc điểm ELO Đôi (Doubles).
* **Bản tin hình ảnh & Video (Media Feed):** Hiển thị các hình ảnh sinh hoạt, video highlight từ YouTube của CLB.

### 2.4. Bảng Quản Trị Hệ Thống Cho Ban Chủ Nhiệm (`/admin`)
Bao gồm các mô-đun quản lý chuyên sâu:
* **Thống kê Tổng quan (Dashboard):** Hiển thị tổng số thành viên, ứng viên đang chờ duyệt, số trận đấu và số tin bài truyền thông.
* **Duyệt Ứng Viên Casting:** Danh sách các bạn ứng viên đăng ký casting. Admin có thể xem chi tiết kỹ năng, giới tính, giờ casting đã chọn và bấm duyệt thành viên chính thức.
* **Bảng Quản Lý Thành Viên Thông Minh (Smart Member Table):**
  * *Bộ lọc đa điều kiện:* Lọc thành viên theo tên/sđt, trình độ cầu lông, trạng thái hoạt động trong CLB (Hoạt động/Tạm nghỉ/Đã rời), và lọc theo kỹ năng đóng góp.
  * *Hộp thoại Thao Tác Nhanh (Quick Actions):* Cho phép đổi vai trò tài khoản (Member/Admin/Candidate), thay đổi trạng thái sinh hoạt, hoặc **Khóa tài khoản** (tài khoản bị khóa sẽ lập tức bị từ chối truy cập hệ thống ở các lần đăng nhập sau).
  * *Điều chỉnh ELO thủ công:* Cộng/Trừ điểm ELO (Đơn hoặc Đôi) trực tiếp kèm theo phần nhập lý do bắt buộc để ghi nhận.
  * *Xem Chuyên Cần (Attendance Stats):* Tính toán tỷ lệ chuyên cần (%) dựa trên lịch sử điểm danh RSVP của thành viên đối với toàn bộ các buổi tập của CLB.

---

## 3. SƠ ĐỒ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

Cấu trúc cơ sở dữ liệu PostgreSQL gồm các bảng chính:

### Bảng `users` (Lưu trữ người dùng, ứng viên, thành viên, admin)
* `id` (UUID, Khóa chính)
* `full_name` (VARCHAR)
* `phone_zalo` (VARCHAR)
* `gender` (VARCHAR) - Giới tính (Nam, Nữ, Khác)
* `academic_info` (VARCHAR) - Trường lớp, chuyên ngành
* `badminton_level` (VARCHAR) - Trình độ ('Mới chơi', 'Trung bình', 'Khá/Giỏi')
* `soft_skills` (JSONB) - Mảng kỹ năng đóng góp dạng JSON
* `role` (VARCHAR) - Vai trò ('candidate', 'member', 'admin')
* `status` (VARCHAR) - Trạng thái hoạt động ('active', 'inactive', 'left')
* `is_blocked` (BOOLEAN) - Khóa tài khoản
* `hand_preference` (VARCHAR) - Tay thuận ('Right', 'Left')
* `play_style` (VARCHAR) - Lối chơi ('Attacking', 'Defending', 'Net-play', 'All-rounder')
* `avatar_url` (TEXT) - Đường dẫn ảnh đại diện đám mây Cloudinary
* `elo_singles` / `elo_doubles` (INTEGER) - Điểm ELO đơn/đôi (Mặc định: 1000)
* `matches_singles` / `matches_doubles` (INTEGER) - Số trận đã đấu
* `win_singles` / `win_doubles` (INTEGER) - Số trận thắng
* `loss_singles` / `loss_doubles` (INTEGER) - Số trận thua
* `password_hash` (VARCHAR) - Mật khẩu đã băm (chỉ dành cho tài khoản đã kích hoạt)
* `joined_at` / `created_at` (TIMESTAMP)

### Bảng `sessions` (Các buổi tập luyện / Casting)
* `id` (UUID, Khóa chính)
* `title` (VARCHAR)
* `date_time` (TIMESTAMP)
* `location` (VARCHAR)

### Bảng `attendances` (Điểm danh RSVP)
* `id` (UUID, Khóa chính)
* `session_id` (UUID, Khóa ngoại)
* `user_id` (UUID, Khóa ngoại)
* `status` (VARCHAR) - Trạng thái RSVP ('going', 'absent')
* *Khóa Unique trên cặp (`session_id`, `user_id`)* để đảm bảo không trùng lặp RSVP.

---

## 4. HƯỚNG DẪN CÀI ĐẶT CỤC BỘ (LOCAL SETUP)

### Bước 1: Sao chép mã nguồn và thiết lập môi trường
1. Clone dự án về máy.
2. Tại thư mục `/backend`, tạo tệp `.env` cấu hình các biến môi trường dựa theo tệp `template.env` mẫu:
   ```env
   DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
   JWT_SECRET=ma_bao_mat_jwt_cua_ban
   PORT=5000
   CLOUDINARY_CLOUD_NAME=ten_cloud_cua_ban
   CLOUDINARY_API_KEY=key_cua_ban
   CLOUDINARY_API_SECRET=secret_cua_ban
   CLUB_VERIFY_PIN=123456
   ```

### Bước 2: Chạy dự án cực nhanh bằng tập lệnh tự động
Dự án đã tích hợp sẵn tệp kịch bản `start-dev.bat` ở thư mục gốc giúp cài đặt toàn bộ dependencies và khởi chạy cả hai máy chủ cục bộ song song:
1. Nhấp đúp chuột vào tệp [start-dev.bat](file:///f:/WebCLB/smashteam-badminton/start-dev.bat).
2. Tệp tin sẽ tự động mở 2 cửa sổ terminal:
   * **Cổng 3000:** Giao diện Frontend (`http://localhost:3000`)
   * **Cổng 5000:** API Backend (`http://localhost:5000`)

Bạn có thể thay đổi cổng hoặc cấu hình môi trường tùy ý trong tệp tin `.env` tương ứng!
