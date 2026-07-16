# KỊCH BẢN TEST END-TO-END — HỆ THỐNG ĐĂNG KÝ THUÊ PHÒNG

Tài liệu này cung cấp kịch bản test chi tiết cho toàn bộ 15 Use Cases (UC01–UC15) của hệ thống. Tài liệu được sử dụng để kiểm thử thủ công tích hợp (E2E) và phục vụ trình bày demo sản phẩm.

---

## 1. Chuẩn bị trước khi test/demo

### 1.1. Khởi động và Reset dữ liệu
1. **Chạy seed (lần đầu hoặc khi muốn reset toàn bộ, kể cả tài khoản hệ thống):**
   ```bash
   cd backend
   node seed.js
   ```
2. **Reset data nghiệp vụ (chạy trước mỗi lần demo để làm sạch các lượt đăng ký, hợp đồng cũ):**
   ```bash
   cd backend
   node reset-demo.js
   ```
3. **Khởi động server:**
   - **Backend:** Chạy Express server tại `http://localhost:3000`
     ```bash
     cd backend
     node index.js
     ```
   - **Frontend:** Chạy React/Vite development server tại `http://localhost:5173`
     ```bash
     cd frontend
     npm run dev
     ```

### 1.2. Chuẩn bị tài nguyên & trình duyệt
*   **Tệp tin chuẩn bị sẵn:**
    - 1 file ảnh chứng từ giả (bất kỳ ảnh `.jpg`/`.png` nào) để upload ở **UC07 (Ghi nhận đặt cọc)**.
    - 1 file ảnh biên bản bàn giao có chữ ký giả để upload ở **UC11 (Bàn giao phòng)**.
*   **Tài khoản đăng nhập:**
    - Mở 3 tab ẩn danh hoặc 3 trình duyệt khác nhau để đăng nhập cùng lúc 3 vai trò:
      1.  **Tab 1 (Sale):** Đăng nhập `sale@dorm.com` / `Demo@1234`
      2.  **Tab 2 (Quản lý):** Đăng nhập `quanly@dorm.com` / `Demo@1234`
      3.  **Tab 3 (Kế toán):** Đăng nhập `ketoan@dorm.com` / `Demo@1234`

### 1.3. Dữ liệu thử nghiệm chính
*   **Khách hàng đại diện:** Nguyễn Văn An (SĐT: `0901234567`, Nam).
*   **Quy định giới tính phòng:**
    - Phòng **P201** là phòng ghép chỉ dành cho **Nữ**.
    - Phòng **P301** là phòng ghép **không giới hạn giới tính** (NULL).
    - Do Nguyễn Văn An là Nam, hệ thống sẽ báo lỗi điều kiện cư trú không đạt tại **UC09** nếu cố ghép vào **P201**. Chúng ta sẽ dùng **P301** để chạy kịch bản luồng chính thành công.

---

## 2. Kịch bản 1: Thuê phòng → Nhận phòng → Trả phòng (Happy Path)

Kịch bản này kiểm thử luồng nghiệp vụ hoàn chỉnh chạy xuyên suốt qua cả 15 Use Cases.

### Bước 1 — [UC01] Đăng nhập hệ thống [Sale / QuanLy / KeToan]
*   **Mục tiêu:** Xác thực tài khoản và phân quyền truy cập đúng vai trò.
*   **URL:** `/dang-nhap`
*   **Thao tác:**
    1.  Đăng nhập tài khoản Sale: `sale@dorm.com` / `Demo@1234`. Bấm **Đăng nhập**.
*   **Kết quả mong đợi:**
    - Chuyển hướng tới Dashboard Sale (`/dashboard-sale`).
    - Sidebar chỉ hiển thị menu phù hợp với vai trò Sale.
    - Lặp lại với `quanly@dorm.com` → Dashboard QuanLy, `ketoan@dorm.com` → Dashboard KeToan.

### Bước 2 — [UC02] Tra cứu phòng/giường [Sale / QuanLy / KeToan]
*   **Mục tiêu:** Tìm kiếm và xem thông tin tình trạng phòng/giường theo bộ lọc.
*   **URL:** `/tra-cuu-phong`
*   **Thao tác:**
    1.  Đăng nhập bằng tài khoản Sale.
    2.  Vào menu **Tra cứu phòng/giường** trên sidebar.
    3.  Để trống bộ lọc, bấm **Tìm kiếm** → xem danh sách tất cả phòng.
    4.  Lọc theo **Khu vực = "Khu C"** → kết quả chỉ hiện phòng **P301**.
    5.  Click mở rộng phòng **P301** để xem tình trạng giường **G301-A**, **G301-B** đều đang **Trống**.
*   **Kết quả mong đợi:** Danh sách phòng hiển thị đúng với bộ lọc, thông tin giường và trạng thái chính xác.

### Bước 3 — [UC05] Đăng ký khách hàng mới [Sale]
*   **Mục tiêu:** Tạo hồ sơ khách hàng mới khi khách chưa có trong hệ thống.
*   **URL:** `/dang-ky-khach-moi`
*   **Thao tác:**
    1.  Đăng nhập bằng tài khoản Sale.
    2.  Vào menu **Đăng ký khách hàng mới**.
    3.  Nhập thông tin: Họ tên = `Khách Test`, SĐT = `0999888777`, Email = `test@gmail.com`, Giới tính = `Nam`, Quốc tịch = `Việt Nam`, CMND = `012345678901`.
    4.  Bấm **Đăng ký khách mới**.
*   **Kết quả mong đợi:** Thông báo thành công, khách hàng được lưu vào hệ thống và có thể tìm thấy khi nhập SĐT `0999888777`.

### Bước 4 — [UC04] Tiếp nhận yêu cầu thuê [Sale]
*   **Mục tiêu:** Ghi nhận thông tin khách hàng và phòng dự kiến.
*   **URL:** `/tiep-nhan-yeu-cau`
*   **Thao tác:**
    1.  Nhập số điện thoại khách hàng: `0901234567`.
    2.  Hệ thống hiển thị popup xác nhận tìm thấy khách hàng **Nguyễn Văn An**. Click **Xác nhận**.
    3.  Nhập yêu cầu: Số người = `1`, Khu vực = `Khu C`, Loại phòng = `Ghép`, Mức giá tối đa = `2500000`.
    4.  Bấm **Tìm kiếm phòng phù hợp**. Hệ thống hiển thị phòng **P301** (Giá 2,000,000đ/tháng) trong danh sách kết quả.
    5.  Bấm **Chọn phòng** tại dòng **P301**. Bấm **Lưu phòng dự kiến**.
*   **Kết quả mong đợi:** Tạo thành công yêu cầu thuê, hiển thị thông báo thành công và tự động chuyển hướng đến màn hình đặt lịch xem phòng.

### Bước 5 — [UC03] Đặt lịch xem phòng [Sale]
*   **Mục tiêu:** Đặt lịch hẹn xem phòng và xác nhận đã xem phòng thực tế.
*   **URL:** `/dat-lich-xem-phong/:nhuCauThueId`
*   **Thao tác:**
    1.  Chọn thời gian hẹn: ngày mai, lúc 09:00 sáng.
    2.  Phương thức thông báo: Chọn `SDT`. Bấm **Đặt lịch hẹn**.
    3.  Hệ thống hiển thị lịch hẹn thành công, trạng thái yêu cầu chuyển sang `DaDatLichXem`.
    4.  *Mô phỏng khách đã xem phòng:* Bấm nút **Xác nhận khách đã xem phòng**.
*   **Kết quả mong đợi:** Trạng thái yêu cầu thuê chuyển sang `DaXemPhong`. Hệ thống hiển thị nút **Tiến hành lập phiếu đặt cọc**.

### Bước 6 — [UC06] Lập phiếu đặt cọc [Sale]
*   **Mục tiêu:** Tạo giữ chỗ giường và tính toán tiền cọc.
*   **URL:** `/lap-phieu-dat-coc`
*   **Thao tác:**
    1.  *Bước 1 (Tìm yêu cầu):* Hệ thống tự động chọn yêu cầu của khách hàng Nguyễn Văn An (hoặc nhập SĐT để tìm). Bấm **Tiếp tục**.
    2.  *Bước 2 (Chọn phòng/giường):* Hệ thống tự động chọn phòng dự kiến **P301**. Ở sơ đồ giường, click chọn giường **G301-A**.
        - Quan sát tiền cọc hiển thị: `4,000,000 đ` (được tính bằng `Giá thuê 2,000,000 đ × 2 tháng × 1 giường`).
        - Bấm **Tiếp tục**.
    3.  *Bước 3 (Xác nhận & Tạo phiếu):* Kiểm tra lại các thông số và bấm **Xác nhận & Tạo phiếu**.
*   **Kết quả mong đợi:**
    - Phiếu đặt cọc được tạo thành công với trạng thái `ChoThanhToan`.
    - Đồng hồ đếm ngược 24 giờ bắt đầu chạy.
    - Giường **G301-A** và phòng **P301** chuyển sang trạng thái **ChoDatCoc** trong cơ sở dữ liệu.

### Bước 7 — [UC07] Xác nhận đặt cọc (Ghi nhận đã nhận tiền) [Sale]
*   **Mục tiêu:** Sale xác nhận đã thu tiền cọc thực tế từ khách và khóa chỗ chính thức.
*   **URL:** `/ghi-nhan-dat-coc` (Tab Sale)
*   **Thao tác:**
    1.  Tìm phiếu đặt cọc vừa lập của Nguyễn Văn An. Click vào phiếu để xem chi tiết bên phải.
    2.  Chọn **Hình thức thanh toán**: `Chuyển khoản ngân hàng`.
    3.  Bấm vào vùng tải lên và chọn **file ảnh chứng từ giả** đã chuẩn bị.
    4.  Bấm **✅ Xác nhận đã nhận đặt cọc**.
*   **Kết quả mong đợi:**
    - Toast thông báo xác nhận thành công.
    - Trạng thái phiếu đặt cọc chuyển sang `DaThanhToan`.
    - Giường **G301-A** và phòng **P301** chuyển sang trạng thái **DaDatCoc**.
    - Phiếu tự động biến mất khỏi danh sách chờ.

> ⚠️ **Lưu ý UC07:** Toàn bộ quy trình xác nhận cọc chỉ do **Sale thực hiện** trong 1 bước duy nhất. Quản lý xác nhận tiền mặt/chuyển khoản **ngoài hệ thống** (kiểm đếm thực tế), không thao tác trên phần mềm.

### Bước 8 — [UC08 & UC09] Kiểm tra điều kiện cư trú & Lập hợp đồng thuê [QuanLy]
*   **Mục tiêu:** Kiểm tra pháp lý cư trú và kích hoạt hợp đồng chính thức.
*   **URL:** `/lap-hop-dong`
*   **Thao tác:**
    1.  *Bước 1 (Chọn phiếu cọc):* Chọn phiếu cọc `DaThanhToan` của khách hàng Nguyễn Văn An. Bấm **Tiếp tục**.
    2.  *Bước 2 (Thành viên & Kiểm tra cư trú):*
        - Bảng phân giường hiển thị Nguyễn Văn An được gán vào giường **G301-A**.
        - Bấm nút **Kiểm tra điều kiện cư trú**.
        - Hệ thống trả về kết quả: `Nguyễn Văn An — Đạt`.
        - Bấm **Tiếp tục**.
    3.  *Bước 3 (Điều khoản & Ký kết):*
        - Nhập ngày bắt đầu = Ngày hôm nay, Kỳ thanh toán = `Tháng`.
        - Tick chọn checkbox: `Tôi xác nhận hai bên đã ký hợp đồng bản giấy...`.
        - Bấm **Kích hoạt hợp đồng**.
*   **Kết quả mong đợi:**
    - Hợp đồng được tạo thành công với mã `HDxxxxxx`, trạng thái `HieuLuc`.
    - Hệ thống hiển thị thông báo thành công và nút **Tiến hành thanh toán kỳ đầu** (chỉ hướng dẫn cho Kế toán).

### Bước 9 — [UC10] Thanh toán kỳ đầu [KeToan]
*   **Mục tiêu:** Tính toán hóa đơn tháng đầu và xác nhận thu đủ tiền.
*   **URL:** `/thanh-toan-ky-dau/:hopDongId` (hoặc click từ Dashboard Kế toán)
*   **Thao tác:**
    1.  *Bước 1 (Lập hóa đơn):*
        - Hệ thống hiển thị chi tiết HĐ. Tiền thuê tự động tính: `2,000,000 đ` (1 giường).
        - Giữ các chi phí phát sinh điện, nước, dịch vụ khác = `0`.
        - Bấm **Xuất phiếu thu**. Hóa đơn được tạo với trạng thái `ChoThanhToan`.
    2.  *Bước 2 (Thu tiền):*
        - Chọn Hình thức thanh toán: `ChuyenKhoan`.
        - Bấm **Xác nhận đã thu đủ**.
*   **Kết quả mong đợi:**
    - Hóa đơn chuyển sang trạng thái `DaThanhToan`.
    - Hệ thống hiển thị banner thông báo: `Thanh toán hoàn tất. Vui lòng thông báo Quản lý tiến hành bàn giao phòng.`.

### Bước 10 — [UC11] Bàn giao phòng [QuanLy]
*   **Mục tiêu:** Kiểm tra bàn giao tài sản thực tế và kích hoạt trạng thái ở.
*   **URL:** `/ban-giao-phong/:hopDongId` (hoặc click từ Dashboard Quản lý)
*   **Thao tác:**
    1.  *Bước 1 (Kiểm tra tài sản):*
        - Hệ thống tự động load danh mục tài sản mặc định của phòng **P301** (Giường đơn x2, Nệm x2, Tủ x2...).
        - Giữ nguyên tất cả trạng thái tài sản là `Tot`.
        - Nhập ghi chú hiện trạng phòng: `Phòng sạch sẽ, đầy đủ tiện nghi`.
        - Bấm **Lưu biên bản bàn giao**.
    2.  *Bước 2 (Ký xác nhận):*
        - Tải lên **file ảnh biên bản bàn giao giả** đã chuẩn bị.
        - Tick chọn checkbox: `Khách hàng đồng ý nhận bàn giao phòng...`.
        - Bấm **Hoàn tất bàn giao**.
*   **Kết quả mong đợi:**
    - Biên bản bàn giao được ký nhận thành công (`khach_da_ky_xac_nhan = true`).
    - Giường **G301-A** và phòng **P301** tự động chuyển sang trạng thái **DangThue**.
    - Hệ thống ghi nhận lịch sử thay đổi trạng thái trong bảng audit log.

### Bước 11 — [UC12] Đăng ký trả phòng [Sale]
*   **Mục tiêu:** Tiếp nhận yêu cầu trả phòng và hẹn ngày bàn giao trả.
*   **URL:** `/dang-ky-tra-phong`
*   **Thao tác:**
    1.  Nhập số điện thoại khách hàng `0901234567` hoặc mã hợp đồng để tìm kiếm. Click **Chọn**.
    2.  Hệ thống hiển thị chi tiết hợp đồng đang hiệu lực.
    3.  Ở khung Đăng ký trả phòng, chọn Ngày trả phòng dự kiến = ngày mai.
    4.  Bấm **Xác nhận đăng ký trả phòng**.
*   **Kết quả mong đợi:** Tạo thành công biên bản trả phòng (`bien_ban_tra_phong`) ở trạng thái `ChoDoiSoat`.

### Bước 12 — [UC13] Đối soát tài sản khi trả [QuanLy]
*   **Mục tiêu:** Kiểm tra hao mòn và hư hại tài sản khi bàn giao trả phòng.
*   **URL:** `/tra-phong/:bienBanId` (Đăng nhập tài khoản Quản lý)
*   **Thao tác:**
    1.  Hệ thống hiển thị Step 1: Bảng đối soát tài sản side-by-side.
    2.  Giữ nguyên tất cả tình trạng tài sản là `Tot` (không có hư hỏng, chi phí bồi thường = 0).
    3.  Bấm **Hoàn tất đối soát tài sản**.
*   **Kết quả mong đợi:** Trạng thái biên bản trả phòng chuyển sang `ChoXacNhan`. Wizard tự động chuyển tiếp sang Step 2.

### Bước 13 — [UC14] Khấu trừ chi phí [KeToan]
*   **Mục tiêu:** Lập phiếu khấu trừ tài chính, tính toán số tiền hoàn trả hoặc thu thêm.
*   **URL:** `/tra-phong/:bienBanId` (Đăng nhập tài khoản Kế toán)
*   **Thao tác:**
    1.  Hệ thống hiển thị Step 2. Quan sát Tiền cọc gốc: `4,000,000 đ`.
    2.  Nhập tỷ lệ hoàn cọc = `100` (hoàn 100% cọc).
    3.  Giữ nguyên tất cả chi phí điện nước nợ phát sinh = `0`.
    4.  Quan sát bảng tính toán tự động:
        - Tiền cọc được hoàn: `4,000,000 đ`.
        - Tổng chi phí phát sinh: `0 đ`.
        - **Số tiền hoàn trả khách:** `4,000,000 đ` (Khách cần trả thêm: `0 đ`).
    5.  Bấm **Lập phiếu khấu trừ chi phí**.
*   **Kết quả mong đợi:** Ghi nhận thành công phiếu khấu trừ tài chính, trạng thái biên bản giữ nguyên `ChoXacNhan` (chờ khách đồng ý).

### Bước 14 — [UC14] Ghi nhận khách hàng đồng ý [QuanLy]
*   **Mục tiêu:** Xác nhận khách hàng đồng ý với phương án tài chính.
*   **URL:** `/tra-phong/:bienBanId` (Đăng nhập tài khoản Quản lý)
*   **Thao tác:**
    1.  Hệ thống hiển thị Step 3: Phiếu dự thảo khấu trừ chi phí dạng readonly.
    2.  Tick chọn checkbox: `Khách hàng đã xem, đồng ý với kết quả đối soát...`.
    3.  Bấm **Xác nhận khách đồng ý**.
*   **Kết quả mong đợi:** Cập nhật trường `khach_xac_nhan_doi_soat = true` trong cơ sở dữ liệu. Wizard chuyển sang Step 4.

### Bước 15 — [UC15] Thanh lý hợp đồng [QuanLy]
*   **Mục tiêu:** Đóng hợp đồng và giải phóng phòng/giường về trạng thái trống.
*   **URL:** `/tra-phong/:bienBanId` (Đăng nhập tài khoản Quản lý)
*   **Thao tác:**
    1.  Hệ thống hiển thị Step 4: Checklist hoàn tất.
    2.  Tick chọn tất cả 3 checkbox:
        - ☑ *Khách hàng đã ký biên bản trả phòng bản cứng.*
        - ☑ *Đã thu hồi toàn bộ chìa khóa phòng và thẻ từ.*
        - ☑ *Đã hoàn cọc 4,000,000đ cho khách hàng.*
    3.  Bấm **Xác nhận thanh lý hợp đồng**.
*   **Kết quả mong đợi:**
    - Hợp đồng chuyển sang trạng thái `DaThanhLy`.
    - Biên bản trả phòng chuyển sang trạng thái `DaThanhLy`.
    - Giường **G301-A** và phòng **P301** tự động giải phóng về trạng thái **Trong**.
    - Ghi nhận đầy đủ audit log chuyển trạng thái phòng/giường về **Trong** trong bảng `lich_su_trang_thai_phong`.
    - Hệ thống chuyển hướng người dùng về màn hình Dashboard Quản lý.

---

## 3. Kịch bản 2: Test các Edge Cases quan trọng

### [UC09] Điều kiện cư trú không đạt (Gender Mismatch)
*   **Thao tác:**
    1.  Lập một phiếu cọc cho giường **G201-A** thuộc phòng **P201** (Phòng quy định chỉ dành cho **Nữ**).
    2.  Vào màn hình lập hợp đồng, chọn phiếu cọc này.
    3.  Ở danh sách thành viên, nhập SĐT của **Nguyễn Văn An** (Nam). Bấm **Kiểm tra điều kiện cư trú**.
*   **Kết quả mong đợi:** Hệ thống báo lỗi cư trú không đạt: `Nguyễn Văn An — Không đạt (Phòng quy định giới tính Nữ nhưng khách hàng là Nam)`. Nút bấm "Tiếp tục" hoặc kích hoạt hợp đồng bị khóa.

### [UC06/UC07] Phiếu đặt cọc hết hạn 24 giờ (Lazy Expiry)
*   **Thao tác:**
    1.  Tạo một phiếu đặt cọc cho giường bất kỳ (ví dụ **G101-A**), lúc này giường ở trạng thái `ChoDatCoc`.
    2.  Vào database, chạy lệnh SQL để sửa ngày hẹn thanh toán lùi về quá khứ quá 24h:
        ```sql
        UPDATE phieu_dat_coc 
        SET han_thanh_toan = NOW() - INTERVAL '1 hour' 
        WHERE trang_thai = 'ChoThanhToan';
        ```
    3.  F5 lại màn hình danh sách phiếu đặt cọc.
*   **Kết quả mong đợi:**
    - Phiếu cọc tự động chuyển trạng thái sang `HetHan`.
    - Giường **G101-A** tự động giải phóng từ `ChoDatCoc` trở về trạng thái **Trong**.

### [UC06] Đặt cọc trùng giường
*   **Thao tác:**
    1.  Tạo phiếu đặt cọc thứ nhất cho giường **G101-A** nhưng chưa thanh toán (giường chuyển sang `ChoDatCoc`).
    2.  Mở một luồng lập phiếu cọc khác, cố gắng chọn lại giường **G101-A**.
*   **Kết quả mong đợi:** Hệ thống ẩn giường **G101-A** khỏi danh mục giường trống hoặc trả về lỗi `GIUONG_KHONG_CON_TRONG` (422) nếu cố gửi request API.

### [UC11] Phát hiện tài sản hư hỏng khi bàn giao nhận phòng
*   **Thao tác:**
    1.  Ở Bước 1 của màn hình Bàn giao phòng, trong bảng kiểm tra tài sản, chọn tình trạng của "Ghế" là `HuHong` và nhập chi phí bồi thường. Bấm **Lưu biên bản**.
    2.  Chuyển sang Bước 2 (Ký xác nhận).
*   **Kết quả mong đợi:**
    - Hệ thống hiển thị banner cảnh báo màu vàng: `CO_VAN_DE_HIEN_TRANG` (Biên bản bàn giao có tài sản hư hỏng/mất mát chưa xử lý).
    - Nút bấm **Hoàn tất bàn giao** bị disable hoàn toàn để bắt buộc Quản lý phải sửa chữa/thay thế tài sản trước khi cho khách ký nhận phòng.
    - Sau khi sửa tình trạng Ghế về `Tot` và bấm **Cập nhật**, nút **Hoàn tất bàn giao** được mở khóa.

### [UC14] Khách hàng làm hư hại tài sản lớn và phải trả thêm tiền
*   **Thao tác:**
    1.  Ở Bước 1 của màn hình Đối soát trả phòng, Quản lý đánh giá tài sản "Nệm" bị hư hại nặng, chọn tình trạng là `HuHong` và nhập chi phí bồi thường ước tính là `5,000,000 đ`. Bấm **Hoàn tất đối soát**.
    2.  Ở Bước 2 (Kế toán khấu trừ), Kế toán nhập tỷ lệ hoàn cọc = `100` (cọc gốc là `4,000,000 đ`). Chi phí sửa chữa bồi thường tự động cập nhật là `5,000,000 đ`.
*   **Kết quả mong đợi:**
    - Bảng tính hiển thị: Tiền cọc được hoàn: `4,000,000 đ` < Tổng chi phí phát sinh: `5,000,000 đ`.
    - Số tiền hoàn khách = `0 đ`.
    - **Khách hàng cần trả thêm:** `1,000,000 đ`. Ghi nhận chính xác vào cơ sở dữ liệu.

### [UC15] Khóa thanh lý khi chưa hoàn thành nghĩa vụ
*   **Thao tác:**
    1.  Thử gửi request thanh lý hợp đồng khi khách hàng chưa bấm xác nhận đồng ý đối soát (`khach_xac_nhan_doi_soat = false`).
        - *Expected:* Hệ thống báo lỗi `KHACH_CHUA_XAC_NHAN_DOI_SOAT` (422).
    2.  Với trường hợp khách cần trả thêm tiền, thử bấm thanh lý hợp đồng ở Step 4 nhưng bỏ tích chọn checkbox nghĩa vụ tài chính (tương ứng truyền lên `tai_chinh_da_hoan_tat = false`).
        - *Expected:* Hệ thống báo lỗi `CHUA_HOAN_TAT_NGHIA_VU_TAI_CHINH` (422).

---

## 4. Kịch bản 3: Smoke Test (Kiểm tra nhanh 5 phút trước demo)

Dành cho kiểm thử viên chạy nhanh trước giờ G để đảm bảo hệ thống không bị crash đột ngột.

- [ ] **[UC01]** Đăng nhập thành công cả 3 tài khoản: `sale@dorm.com`, `quanly@dorm.com`, `ketoan@dorm.com`.
- [ ] **[UC01] Role-based UI:** Mỗi tài khoản khi đăng nhập hiển thị đúng menu Sidebar và đúng Dashboard tương ứng.
- [ ] **[UC02]** Vào màn hình tra cứu phòng, tìm kiếm phòng **P301** hiển thị đúng thông tin và còn 2 giường trống.
- [ ] **[UC05]** Đăng ký khách hàng mới với SĐT chưa có trong hệ thống thành công.
- [ ] **[UC04]** Tạo yêu cầu thuê phòng mới cho khách hàng Nguyễn Văn An thành công.
- [ ] **[UC03]** Đặt lịch xem phòng và xác nhận khách đã xem phòng thành công.
- [ ] **[UC06]** Lập phiếu đặt cọc cho giường **G301-A** thành công, đồng hồ 24h chạy chuẩn xác.
- [ ] **[UC07]** Sale upload ảnh chứng từ cọc và xác nhận đã nhận cọc thành công → giường chuyển trạng thái sang `DaDatCoc`.
- [ ] **[UC08 & UC09]** Tiến hành kiểm tra cư trú đạt, tạo hợp đồng thuê thành công → hợp đồng chuyển sang `HieuLuc`.
- [ ] **[UC10]** Kế toán tạo và xác nhận hóa đơn kỳ đầu thành công.
- [ ] **[UC11]** Quản lý thực hiện bàn giao phòng thành công → giường chuyển sang `DangThue`.
- [ ] **[UC12]** Sale đăng ký trả phòng thành công → biên bản trạng thái `ChoDoiSoat`.
- [ ] **[UC13]** Quản lý đối soát tài sản thành công → trạng thái `ChoXacNhan`.
- [ ] **[UC14]** Kế toán lập phiếu khấu trừ + Quản lý ghi nhận khách đồng ý thành công.
- [ ] **[UC15]** Quản lý thanh lý hợp đồng thành công → phòng và giường quay trở về trạng thái **Trong**.

**Nếu tất cả các bước trên đều trả về kết quả đúng → Hệ thống hoạt động tốt và sẵn sàng demo!**
