# Hệ Thống Quản Lý Ký Túc Xá (HomeStay Dorm)

Dự án phát triển phần mềm quản lý ký túc xá Homestay Dorm phục vụ môn học **CSC12004 - Thiết kế Hệ thống Thông tin**. Hệ thống hỗ trợ toàn bộ 15 trường hợp sử dụng (UC01 - UC15) từ khâu tiếp nhận yêu cầu, đặt lịch xem phòng, đặt cọc giữ phòng, lập hợp đồng, bàn giao phòng đến đối soát trả phòng và thanh lý hợp đồng.

**Repo GitHub:** [https://github.com/kienha5/system-design](https://github.com/kienha5/system-design)

---

## 1. Yêu Cầu Hệ Thống
*   **Node.js**: Phiên bản 18 trở lên (khuyên dùng LTS).
*   **Cơ sở dữ liệu**: PostgreSQL (lưu trữ trên dịch vụ [Supabase](https://supabase.com) — cần tạo project riêng).
*   **Git**: Dùng để quản lý mã nguồn.

---

## 2. Quy Trình Clone & Cài Đặt Dự Án
Thực hiện chạy các lệnh sau trong terminal:

```bash
# 1. Clone project về máy cá nhân
git clone https://github.com/kienha5/system-design.git
cd system-design/phong-ktx

# 2. Cài đặt các package phụ thuộc cho Backend
cd backend
npm install

# 3. Cài đặt các package phụ thuộc cho Frontend
cd ../frontend
npm install
```

---

## 3. Cấu Hình Môi Trường (.env)

Hệ thống yêu cầu cấu hình các file môi trường ở cả thư mục `backend` và `frontend`. Mỗi thư mục đã có file `.env.example` làm mẫu.

### 3.1. Cấu hình Backend (`backend/.env`)

```bash
# Từ thư mục backend/, sao chép file mẫu
cp .env.example .env
```

Mở file `backend/.env` và điền các giá trị từ Supabase Dashboard của bạn (**Settings → API**):

```env
# Lấy từ: Project URL
SUPABASE_URL=https://<your-project-ref>.supabase.co

# Lấy từ: Project Settings → Database → Connection string → Transaction Pooler (Port 6543)
DATABASE_URL=postgresql://postgres.<your-project-ref>:<your-db-password>@aws-0-<region>.pooler.supabase.com:6543/postgres

# Lấy từ: Project Settings → API → JWT Secret
SUPABASE_JWT_SECRET=<your-jwt-secret>

# Lấy từ: Project Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Lấy từ: Project Settings → API → anon key
SUPABASE_ANON_KEY=<your-anon-key>

NODE_ENV=development
PORT=3000
DEBUG_TRACE=false
```

### 3.2. Cấu hình Frontend (`frontend/.env`)

```bash
# Từ thư mục frontend/, sao chép file mẫu
cp .env.example .env
```

Mở file `frontend/.env` và điền:

```env
# Lấy từ: Project URL (giống SUPABASE_URL ở backend)
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co

# Lấy từ: anon key (giống SUPABASE_ANON_KEY ở backend)
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Địa chỉ API backend (mặc định local dev)
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

---

## 4. Khởi Tạo Cơ Sở Dữ Liệu & Dữ Liệu Mẫu

### 4.1. Tạo cấu trúc bảng (Schema SQL)
Đây là bước **bắt buộc** khi kết nối với project Supabase mới.

1. Mở **Supabase Dashboard** → chọn project của bạn → vào mục **SQL Editor**.
2. Copy toàn bộ nội dung file [`docs/create_database.sql`](./docs/create_database.sql) và paste vào SQL Editor.
3. Nhấn **Run** để tạo toàn bộ cấu trúc bảng.

### 4.2. Cấu hình Supabase Storage
Cơ chế đính kèm chứng từ chuyển khoản (UC07) và biên bản bàn giao (UC11) yêu cầu tạo 2 Storage bucket:

1. Truy cập **Supabase Dashboard → Storage → New Bucket**.
2. Tạo bucket tên `chung-tu` — **bật Public**.
3. Tạo bucket tên `bien-ban` — **bật Public**.

### 4.3. Chạy Seed dữ liệu mẫu
Sau khi đã cấu hình `.env` và tạo schema SQL, chạy script seed để khởi tạo tài khoản demo, chi nhánh, phòng/giường và tài sản mặc định:

```bash
cd backend
node seed.js
```

Script sẽ tự động:
- Xóa sạch dữ liệu cũ (nếu có)
- Tạo tài khoản Supabase Auth và liên kết DB
- Tạo chi nhánh, phòng (P101, P201, P301), giường và tài sản phòng mặc định
- Tạo 4 khách hàng mẫu

**Danh sách tài khoản kiểm thử mặc định (Mật khẩu: `Demo@1234`):**

| Vai trò | Email |
|---|---|
| Nhân viên Sale | `sale@dorm.com` |
| Quản lý | `quanly@dorm.com` |
| Kế toán | `ketoan@dorm.com` |

---

## 5. Khởi Chạy Ứng Dụng

Mở **hai terminal riêng biệt** để chạy Backend và Frontend song song:

### 5.1. Chạy Backend Server
```bash
cd backend
node index.js
```
> Backend lắng nghe tại: `http://localhost:3000`  
> *(Dùng `npm run dev` nếu muốn auto-restart khi thay đổi code — yêu cầu cài `nodemon`)*

### 5.2. Chạy Frontend (React/Vite)
```bash
cd frontend
npm run dev
```
> Frontend chạy tại: `http://localhost:5173`  
> *(hoặc port 5174 nếu 5173 đã bị chiếm)*

Sau khi cả hai server đã chạy, mở trình duyệt và truy cập `http://localhost:5173`.

---

## 6. Hướng Dẫn Kiểm Thử

### 6.1. Reset Dữ Liệu Nghiệp Vụ (trước mỗi lần demo)
Để dọn sạch dữ liệu giao dịch phát sinh (hợp đồng, hóa đơn, phiếu cọc...) mà không xóa tài khoản và phòng:
```bash
cd backend
node reset-demo.js
```

### 6.2. Kịch bản Test End-to-End
Toàn bộ kịch bản test chi tiết từ UC01 đến UC15 được trình bày tại:
👉 **[docs/TEST_SCENARIOS.md](./docs/TEST_SCENARIOS.md)**

Đăng nhập bằng tài khoản Sale, Quản lý, Kế toán trên trình duyệt để thực hiện từng bước.

---

## 7. Cấu Trúc Thư Mục

```
phong-ktx/
├── backend/              # Express.js API server
│   ├── src/
│   │   ├── routes/       # Định tuyến API
│   │   ├── controllers/  # Xử lý request/response
│   │   ├── services/     # Logic nghiệp vụ
│   │   └── middlewares/  # Auth, validation
│   ├── seed.js           # Khởi tạo dữ liệu mẫu
│   ├── reset-demo.js     # Reset dữ liệu giao dịch
│   └── .env.example      # Mẫu biến môi trường
├── frontend/             # React + Vite SPA
│   ├── src/
│   │   ├── pages/        # Màn hình theo vai trò
│   │   ├── components/   # Shared components
│   │   ├── api/          # API client functions
│   │   └── context/      # Auth context
│   └── .env.example      # Mẫu biến môi trường
└── docs/
    ├── create_database.sql   # Schema SQL đầy đủ
    ├── TEST_SCENARIOS.md     # Kịch bản kiểm thử E2E
    ├── 01_DATABASE_SCHEMA.md # Mô tả thiết kế DB
    ├── 02_API_SPEC.md        # Đặc tả API
    └── specs/                # UC specs chi tiết
```
