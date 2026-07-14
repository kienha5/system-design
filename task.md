# DANH SÁCH CÔNG VIỆC CẦN THỰC HIỆN TIẾP THEO (TODO/FUTURE TASKS)

Tài liệu này tổng hợp các hạng mục cải tiến, tối ưu hóa và mở rộng hệ thống cần thực hiện trong các giai đoạn tiếp theo của dự án.

---

## 1. Tối Ưu Hóa & Bảo Mật Hệ Thống

### 1.1. Cải tiến Xác thực (Authentication)
- [ ] **Cookie HttpOnly**: Chuyển đổi phương thức lưu trữ JWT Token từ `localStorage` ở frontend sang Cookie `HttpOnly` + `Secure` + `SameSite=Strict` ở backend để chống tấn công XSS.
- [ ] **Refresh Token Rotation**: Triển khai cơ chế Refresh Token xoay vòng nhằm gia hạn phiên đăng nhập an toàn thay vì dùng Access Token có thời hạn quá dài.
- [ ] **Rate Limiting**: Thiết lập giới hạn tần suất yêu cầu (Rate Limiting) trên các endpoint nhạy cảm như `/api/v1/auth/login` để ngăn chặn tấn công dò mật khẩu (Brute Force).

### 1.2. Tối ưu Cơ sở dữ liệu (Database Indexing)
- [ ] **Bổ sung Indexes**: Đánh chỉ mục (Indexes) trên các cột thường xuyên tìm kiếm và đối chiếu để tăng tốc hiệu năng truy vấn:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_khach_hang_sdt ON khach_hang(so_dien_thoai);
  CREATE INDEX IF NOT EXISTS idx_phieu_coc_ma ON phieu_dat_coc(ma_phieu_coc);
  CREATE INDEX IF NOT EXISTS idx_hop_dong_ma ON hop_dong(ma_hop_dong);
  CREATE INDEX IF NOT EXISTS idx_bien_ban_tra_ma ON bien_ban_tra_phong(ma_bien_ban);
  ```

---

## 2. Tính Năng Nghiệp Vụ Mở Rộng

### 2.1. Tự động hóa Thông báo
- [ ] **Email Notification**: Tích hợp dịch vụ gửi email (Nodemailer, SendGrid hoặc Resend) để gửi tự động:
  - Hóa đơn tháng đầu / hóa đơn định kỳ tới khách hàng.
  - Thông báo giữ phòng thành công và thời hạn 24 giờ hoàn tất cọc.
  - Xác nhận thanh lý hợp đồng và số tiền hoàn cọc.

### 2.2. Thanh toán Trực tuyến (Payment Gateway)
- [ ] **Tích hợp cổng thanh toán**: Kết nối với cổng thanh toán (VNPAY, MoMo hoặc PayOS) hiển thị mã QR động chứa số tiền và nội dung chuyển khoản để tự động ghi nhận đặt cọc (UC07) và thanh toán hóa đơn (UC10) ngay khi khách hàng giao dịch thành công mà không cần Kế toán duyệt tay.

### 2.3. Báo cáo & Phân tích (Analytics Dashboard)
- [ ] **Trực quan hóa số liệu**: Sử dụng thư viện biểu đồ ở Frontend (như `Recharts` hoặc `Chart.js`) để vẽ biểu đồ doanh thu theo tháng, biểu đồ tỷ lệ lấp đầy phòng ở các chi nhánh phục vụ cho dashboard của Quản lý.

---

## 3. Kiểm Thử & Kiểm Soát Chất Lượng Mã Nguồn

### 3.1. Viết Unit Tests & Integration Tests
- [ ] **Vitest / Jest cho Backend**: Viết bộ unit tests kiểm thử các hàm tính toán nghiệp vụ cốt lõi trong các service:
  - Logic tính tỷ lệ hoàn cọc tự động (`bienBanTraPhong.service.js`).
  - Logic đối soát điều kiện cư trú của các thành viên (`dieuKienCuTru.service.js`).
  - Kiểm tra giao dịch ACID khi kích hoạt hợp đồng và giải phóng giường.
- [ ] **Component Tests cho Frontend**: Viết test giao diện cho các component quan trọng như Form Đăng ký khách mới, Form Lập hợp đồng, bộ lọc Tra cứu phòng ở.

### 3.2. Cấu hình CI/CD Pipeline
- [ ] **GitHub Actions**: Thiết lập workflow tự động chạy kiểm tra cú pháp (Linting), build ứng dụng frontend/backend, và chạy toàn bộ unit tests mỗi khi có Pull Request được tạo vào branch `main`.
