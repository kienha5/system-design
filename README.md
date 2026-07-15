# Hệ Thống Quản Lý Ký Túc Xá (HomeStay Dorm)

Dự án phát triển phần mềm quản lý ký túc xá Homestay Dorm phục vụ môn học **CSC12004 - Thiết kế Hệ thống Thông tin**. Hệ thống hỗ trợ toàn bộ 15 trường hợp sử dụng (UC01 - UC15) từ khâu tiếp nhận yêu cầu, đặt lịch xem phòng, đặt cọc giữ phòng, lập hợp đồng, bàn giao phòng đến đối soát trả phòng và thanh lý hợp đồng.

---

## 1. Yêu Cầu Hệ Thống
*   **Node.js**: Phiên bản 18 trở lên (khuyên dùng LTS).
*   **Cơ sở dữ liệu**: PostgreSQL (đã lưu trữ trên dịch vụ Supabase).
*   **Git**: Dùng để quản lý mã nguồn.

---

## 2. Quy Trình Clone Dự Án
Thực hiện chạy các lệnh sau trong terminal:

```bash
# 1. Clone project về máy cá nhân
git clone https://github.com/kienha5/system-design.git
cd phong-ktx

# 2. Cài đặt các package phụ thuộc cho Backend
cd backend
npm install

# 3. Cài đặt các package phụ thuộc cho Frontend
cd ../frontend
npm install
```

---

## 3. Cấu Hình Môi Trường (.env)

Hệ thống yêu cầu cấu hình các file môi trường ở cả thư mục `backend` và `frontend`.

### 3.1. Cấu hình Backend (`backend/.env`)
Tạo file `.env` nằm trong thư mục `backend/` và cấu hình các biến sau:

```env
PORT=3000
DATABASE_URL=postgresql://postgres.lycvxtqtjdqrpihwzyfp:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
SUPABASE_URL=https://lycvxtqtjdqrpihwzyfp.supabase.co
SUPABASE_ANON_KEY=<your_supabase_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>
SUPABASE_JWT_SECRET=<your_supabase_jwt_secret>
```

### 3.2. Cấu hình Frontend (`frontend/.env`)
Tạo file `.env` nằm trong thư mục `frontend/` và cấu hình các biến sau:

```env
VITE_SUPABASE_URL=https://lycvxtqtjdqrpihwzyfp.supabase.co
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

---

## 4. Khởi Tạo Cơ Sở Dữ Liệu & Dữ Liệu Mẫu

### 4.1. Tạo cấu trúc bảng (Schema SQL)
Nếu cần khởi tạo cơ sở dữ liệu từ đầu, copy nội dung của file và chạy trực tiếp trong giao diện **SQL Editor** trên Supabase Dashboard.

### 4.2. Cấu hình Supabase Storage
Cơ chế đính kèm chứng từ chuyển khoản (UC07) và biên bản bàn giao có chữ ký (UC11) yêu cầu cấu hình Storage bucket:
1.  Truy cập Supabase Dashboard -> **Storage**.
2.  Tạo bucket tên là `chung-tu` (chế độ **Public**).
3.  Tạo bucket tên là `bien-ban` (chế độ **Public**).

### 4.3. Chạy Seed dữ liệu mẫu (Seeding)
Chạy script seed dữ liệu nền và tài khoản demo:
```bash
cd backend
node seed.js
```
*Script sẽ xóa các dữ liệu cũ, đồng bộ tài khoản auth và chèn các thông tin mặc định (chi nhánh, danh sách phòng P101, P201, P301, giường ở, danh mục tài sản cố định).*

**Danh sách tài khoản kiểm thử mặc định (Mật khẩu: `Demo@1234`):**
*   **Bộ phận Sale:** `sale@dorm.com`
*   **Bộ phận Quản lý:** `quanly@dorm.com`
*   **Bộ phận Kế toán:** `ketoan@dorm.com`

---

## 5. Khởi Chạy Ứng Dụng

Mở hai terminal song song để chạy Backend và Frontend:

### 5.1. Chạy Backend Server
```bash
cd backend
npm run dev
```
*Backend sẽ lắng nghe tại địa chỉ: `http://localhost:3000`*

### 5.2. Chạy Frontend (React/Vite)
```bash
cd frontend
npm run dev
```
*Frontend sẽ chạy tại địa chỉ: `http://localhost:5173` (hoặc `http://localhost:5174` nếu cổng 5173 đã bị chiếm dụng)*

---

## 6. Hướng Dẫn Kiểm Thử (Testing)

### 6.1. Script Reset Dữ Liệu Nghiệp Vụ
Để chạy lại demo/test từ đầu mà không làm mất tài khoản nhân sự và phòng ở gốc:
```bash
cd backend
node reset-demo.js
```
*Lệnh này sẽ dọn sạch các dữ liệu giao dịch phát sinh như hợp đồng, hóa đơn, phiếu cọc, biên bản trả phòng.*

### 6.2. Kiểm thử API Liên thông
Chạy test tự động kiểm tra xác thực quyền hạn và lấy dữ liệu thống kê từ Supabase:
```bash
cd backend
node scratch/test_integration.js
```

### 6.3. Kịch bản Test End-to-End bằng tay
Kịch bản chi tiết thực hiện toàn bộ luồng nghiệp vụ liên thông từ UC01 đến UC15 được trình bày tại [docs/TEST_SCENARIOS.md](file:///c:/Users/LOQ/Documents/system_design/phong-ktx/docs/TEST_SCENARIOS.md).
Bạn có thể đăng nhập bằng tài khoản Sale, Quản lý, Kế toán trên trình duyệt để kiểm tra từng bước tương ứng.
