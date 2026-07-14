# BÁO CÁO AUDIT FRONTEND UI/UX VÀ THIẾT KẾ CƠ SỞ DỮ LIỆU TÀI KHOẢN

Báo cáo này tài liệu hóa kết quả rà soát (audit) toàn bộ giao diện người dùng (Frontend) và cấu trúc liên kết tài khoản nhân viên giữa phân hệ xác thực (Supabase Auth) và cơ sở dữ liệu nghiệp vụ (PostgreSQL).

---

## 1. Kết Quả Audit Frontend UI/UX (Nghiệp vụ UC12 – UC15)

Chúng tôi đã tiến hành rà soát toàn bộ các trang giao diện nghiệp vụ liên quan đến Sale, Quản lý, và Kế toán để đảm bảo tính nhất quán, chuyên nghiệp và tối ưu trải nghiệm người dùng theo các tiêu chí sau:

### 1.1. Tiêu chí Việt hóa & Ngôn ngữ
*   **Kết quả:** 100% văn bản hiển thị cho người dùng đã được dịch sang tiếng Việt tự nhiên và thân thiện.
*   **Chi tiết:** Các nhãn, nút bấm, tiêu đề trang, thông báo toast không còn lẫn tiếng Anh hoặc các từ mã kỹ thuật (`snake_case` hay `CamelCase`).
*   **Ví dụ:**
    *   Màn hình lập phiếu đặt cọc: Đổi từ "Lập phiếu đặt cọc" -> "Giữ phòng".
    *   Màn hình trả phòng: Trạng thái hiển thị tiếng Việt rõ ràng: "Mới tiếp nhận", "Đã đặt lịch xem", "Đã xem phòng", "Đã chuyển đặt cọc", "Đang thuê", "Chờ Đối Soát", "Chờ Xác Nhận", "Đã Thanh Lý".

### 1.2. Định dạng Tiền tệ & Ngày tháng
*   **Định dạng Tiền tệ:** Tất cả các con số hiển thị tiền tệ được định dạng chuẩn Việt Nam qua hàm `Intl.NumberFormat('vi-VN')` cộng đơn vị `đ` hoặc `VNĐ`.
    *   Ví dụ: `3.000.000 đ` thay vì hiển thị số thô `3000000`.
*   **Định dạng Ngày tháng:** Các ngày giờ hiển thị trên bảng và chi tiết được chuyển đổi sang định dạng `dd/MM/yyyy` hoặc `toLocaleString('vi-VN')` để phù hợp với thói quen người dùng Việt Nam.

### 1.3. Trạng thái Trống (Empty States) & Trạng thái Tải (Loading States)
*   **Trạng thái Trống:** Khi không tìm thấy kết quả tìm kiếm hoặc danh sách rỗng, giao diện hiển thị thông báo rõ ràng kèm emoji trực quan.
    *   Ví dụ: `📭 Không tìm thấy phiếu đặt cọc nào đã thanh toán và chưa lập hợp đồng.`
*   **Trạng thái Tải:** Tất cả các nút bấm thực hiện hành động gửi biểu mẫu (submit/API call) đều được tích hợp trạng thái khóa (`disabled`) và hiển thị văn bản tải động để tránh người dùng click nhiều lần (gây trùng lặp giao dịch).
    *   Ví dụ: nút "Kích hoạt Hợp đồng" chuyển thành "Đang khởi tạo..." và bị vô hiệu hóa khi đang xử lý API.

### 1.4. Thiết kế Form & Validation Lỗi
*   **Padding & Width:** Các ô nhập liệu (`input`, `select`, `textarea`) được thiết lập thuộc tính `min-width: 0` và `width: 100%` trong CSS để tránh hiện tượng vỡ layout khi co giãn màn hình. Padding ngang được nâng lên `16px` để tạo độ thoáng và thẩm mỹ.
*   **Rút gọn Placeholder:** Rút gọn các placeholder dài hơn 30 ký tự để không bị cắt trên màn hình nhỏ.
    *   Ví dụ: placeholder tìm kiếm hợp đồng được rút gọn thành: `"Mã hợp đồng hoặc SĐT khách..."`.
*   **Validation Lỗi Đúng Chuẩn:** 
    *   Khi xảy ra lỗi nhập liệu từ phía Backend (phản hồi `VALIDATION_ERROR` dạng Zod validation), thông báo toast chỉ hiển thị câu ngắn gọn: `"Vui lòng kiểm tra lại các thông tin chưa hợp lệ."`.
    *   Từng trường lỗi cụ thể được hiển thị màu đỏ ở ngay dưới ô nhập liệu thông qua component `<FieldError />`, với nội dung được dịch từ thuộc tính DB sang tiếng Việt thân thiện (ví dụ: `ho_ten` báo lỗi là `"Họ tên khách hàng không được để trống"`, `so_dien_thoai` báo lỗi `"Số điện thoại không hợp lệ"`, v.v.).

---

## 2. Thiết Kế Hệ Thống Tài Khoản Nhân Viên (Supabase Auth & Database)

### 2.1. Kiến trúc Liên kết Tài khoản
Tài khoản nhân viên được thiết kế liên kết chặt chẽ giữa hai phân hệ:
1.  **Supabase Auth (`auth.users`):** Lưu trữ thông tin đăng nhập cốt lõi (email, password hash, metadata, JWT tokens).
2.  **Database Nghiệp vụ (`public.nguoi_dung_he_thong`):** Lưu trữ hồ sơ nhân viên trong hệ thống (Họ tên, Vai trò: Sale/QuanLy/KeToan, Chi nhánh làm việc).
*   **Cơ chế liên kết:** Khóa ngoại `nguoi_dung_he_thong.id` tham chiếu trực tiếp đến `auth.users.id`. Khi người dùng đăng nhập thành công qua Supabase Auth Client ở frontend, backend nhận JWT token, giải mã lấy `userId` (`payload.sub`), sau đó tra cứu bảng `nguoi_dung_he_thong` để lấy thông tin vai trò phục vụ phân quyền (RBAC) trên API.

### 2.2. Quyết định kỹ thuật: Bổ sung cột `email` vào `nguoi_dung_he_thong`
Để tối ưu hóa hiệu năng và bảo mật hệ thống, chúng tôi quyết định **bổ sung cột `email` (kiểu `VARCHAR(150)`) vào bảng `nguoi_dung_he_thong`**.

**Lý do:**
1.  **Tránh Truy vấn Chéo Schema (Cross-Schema Queries):** Schema `auth` được quản lý riêng bởi Supabase và mặc định bị chặn truy cập trực tiếp từ các câu lệnh SQL thông thường của tài khoản ứng dụng (để đảm bảo an toàn thông tin đăng nhập). Việc lưu trữ email ở bảng nghiệp vụ giúp backend lấy email nhân viên phục vụ ghi log, gửi thông báo hoặc hiển thị thông tin mà không cần join với bảng `auth.users` vốn đòi hỏi quyền hạn superuser/service-role đặc biệt.
2.  **Đồng bộ Hóa Dữ Liệu:** Giúp quản lý danh mục nhân sự đầy đủ ngay tại schema `public`, thuận tiện cho việc lập báo cáo thống kê hoặc đồng bộ sang các dịch vụ email bên thứ ba.

### 2.3. Lệnh SQL đã thực hiện cập nhật
Chúng tôi đã chạy tập lệnh di cư (migration) sau trên cơ sở dữ liệu PostgreSQL của dự án:

```sql
-- 1. Bổ sung cột email vào bảng người dùng hệ thống
ALTER TABLE nguoi_dung_he_thong ADD COLUMN IF NOT EXISTS email VARCHAR(150);

-- 2. Đồng bộ hóa địa chỉ email từ bảng auth.users hiện tại
UPDATE nguoi_dung_he_thong n
SET email = u.email
FROM auth.users u
WHERE n.id = u.id;
```

### 2.4. Cập nhật Backend API (`GET /api/v1/me`)
Route trả về thông tin cá nhân của nhân viên đang đăng nhập đã được bổ sung thông tin email:
*   **Mã nguồn cập nhật:**
    *   [auth.middleware.js](file:///c:/Users/LOQ/Documents/system_design/phong-ktx/backend/src/middleware/auth.middleware.js): Truy vấn thêm trường `email` từ DB và đính kèm vào đối tượng `req.user`.
    *   [auth.controller.js](file:///c:/Users/LOQ/Documents/system_design/phong-ktx/backend/src/controllers/auth.controller.js): Trả về trường `email` trong payload kết quả `GET /me`.
*   **Kết quả dữ liệu trả về mẫu:**
    ```json
    {
      "success": true,
      "data": {
        "id": "e22e6e3b-4667-4568-a623-9b1ea9051125",
        "ho_ten": "Nguyễn Văn Quản Lý",
        "vai_tro": "QuanLy",
        "chi_nhanh_id": "8f8b030e-13c5-4ad8-a6b1-4f9958742bca",
        "email": "quanly@dorm.com"
      }
    }
    ```
