# API SPEC — Hệ thống Đăng ký Thuê Phòng

> Tầng API/Service. Đây là phần sẽ phải viết lại nếu sau này đổi sang WinForms
> (thay "REST endpoint" bằng "Service method signature"), nhưng **business logic mô tả trong từng endpoint vẫn giữ nguyên**.
> Mỗi UC trong bảng dưới sẽ có file spec riêng `specs/UCxx_*.md` viết chi tiết khi bắt đầu code UC đó.

---

## 1. Convention chung

### 1.1. Base URL & versioning
```
/api/v1/...
```
Không cần version phức tạp cho đồ án — chỉ giữ tiền tố `/api/v1` để dễ mở rộng nếu cần.

### 1.2. Authentication
- Frontend login qua **Supabase Auth** → nhận `access_token` (JWT).
- Mọi request tới backend (trừ `GET /health`) phải có header:
```
Authorization: Bearer <access_token>
```
- Middleware `auth.middleware.js`:
  1. Verify JWT bằng Supabase JWT secret (server-side, không gọi Supabase API mỗi request).
  2. Lấy `user.id` từ token → query bảng `nguoi_dung_he_thong` lấy `vai_tro` và `chi_nhanh_id`.
  3. Gắn `req.user = { id, vai_tro, chi_nhanh_id }` để controller/service dùng.

> UC01 `DangNhap`: FE gọi trực tiếp Supabase Auth SDK để lấy JWT. Backend **không có endpoint login riêng** — chỉ expose middleware verify token cho mọi route khác.

### 1.3. Authorization (RBAC)
Middleware `requireRole(...roles)` đặt sau `auth.middleware`:
```js
router.post('/hop-dong', requireRole('QuanLy'), hopDongController.create);
```

Bảng phân quyền tổng quát (chi tiết từng UC xem mục 2 và file `specs/UCxx_*.md`):

| Vai trò | Nhóm chức năng được phép |
|---|---|
| Sale | Tra cứu phòng/giường, tiếp nhận yêu cầu thuê, đặt lịch xem phòng, lập phiếu đặt cọc, ghi nhận chứng từ cọc, đăng ký trả phòng |
| QuanLy | Tra cứu phòng/giường, cập nhật trạng thái phòng/giường, xác nhận chứng từ cọc, lập hợp đồng, kiểm tra điều kiện cư trú, bàn giao phòng, đối soát tài sản, thanh lý hợp đồng |
| KeToan | Tính tiền cọc (nội bộ trong UC06), xác nhận thanh toán kỳ đầu, khấu trừ chi phí phát sinh |

> Tra cứu phòng (`GET /phong`, `GET /giuong`) cho phép tất cả vai trò.

### 1.4. Response format chuẩn

**Thành công:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "pageSize": 20, "total": 57 }
}
```
`meta` chỉ có khi response là danh sách có pagination.

**Lỗi:**
```json
{
  "success": false,
  "error": {
    "code": "PHIEU_COC_HET_HAN",
    "message": "Phiếu đặt cọc đã hết hạn thanh toán (quá 24 giờ)."
  }
}
```

- `code`: SCREAMING_SNAKE_CASE — FE xử lý logic theo `code`, không match theo `message` text.
- HTTP status tương ứng:

| Status | Khi nào dùng |
|---|---|
| 200 | Thành công (GET, PATCH) |
| 201 | Tạo mới thành công (POST) |
| 400 | Dữ liệu đầu vào không hợp lệ (validate fail) |
| 401 | Token không hợp lệ hoặc hết hạn |
| 403 | Đủ auth nhưng không đủ quyền (sai vai trò) |
| 404 | Không tìm thấy resource |
| 409 | Conflict — ví dụ giường đã được đặt cọc bởi người khác |
| 422 | Vi phạm business rule — ví dụ phiếu cọc hết hạn, điều kiện cư trú không đạt |
| 500 | Lỗi hệ thống |

### 1.5. Pagination & filter convention
```
GET /api/v1/phong?khu_vuc=Q1&loai_phong=Ghep&trang_thai=Trong&page=1&pageSize=20
```
- Query string dùng `snake_case` (khớp tên cột DB để dễ map).
- Mặc định: `page=1`, `pageSize=20`.
- Response trả `meta.total` (tổng số record khớp filter) để FE tự tính số trang.

### 1.6. Validate
Dùng `zod` ở middleware validate trước khi vào controller — file `src/validators/<resource>.validator.js`. Mỗi file spec UC ghi rõ rule validate riêng cho UC đó.

### 1.7. Error code dùng chung

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `UNAUTHORIZED` | 401 | Token không hợp lệ hoặc hết hạn |
| `FORBIDDEN` | 403 | Không đủ quyền với vai trò hiện tại |
| `NOT_FOUND` | 404 | Không tìm thấy resource |
| `VALIDATION_ERROR` | 400 | Dữ liệu đầu vào không hợp lệ |
| `GIUONG_KHONG_CON_TRONG` | 409 | Giường không còn ở trạng thái `Trong` (đã bị đặt cọc hoặc đang thuê) |
| `PHONG_KHONG_CON_TRONG` | 409 | Phòng không còn khả dụng (dùng khi đặt cọc nguyên phòng) |
| `PHIEU_COC_HET_HAN` | 422 | Phiếu cọc đã quá 24h chưa thanh toán — đã tự động hủy |
| `PHIEU_COC_DA_XAC_NHAN` | 409 | Phiếu cọc đã được xác nhận trước đó (tránh xác nhận 2 lần) |
| `DIEU_KIEN_CU_TRU_KHONG_DAT` | 422 | Khách không đáp ứng điều kiện cư trú (UC09) |
| `HOA_DON_CHUA_THANH_TOAN_DU` | 422 | Chưa thu đủ số tiền kỳ đầu (UC10) |
| `HOP_DONG_DANG_HIEU_LUC` | 409 | Phòng/giường đang có HĐ hiệu lực — cảnh báo trước khi UC03 đổi trạng thái thủ công |
| `CHUA_HOAN_TAT_NGHIA_VU_TAI_CHINH` | 422 | Chưa xác nhận hoàn tất nghĩa vụ tài chính — UC15 không thể thanh lý |

> Danh sách này sẽ được bổ sung khi viết spec từng UC.

---

## 2. Danh sách endpoint theo 15 UC hệ thống

> Trạng thái cột "Spec chi tiết": sẽ đổi từ ⬜ → ✅ kèm link khi file `specs/UCxx_*.md` được viết.
>
> Ngoài các endpoint gắn với UC, có thêm một số endpoint tra cứu phụ trợ — xem mục 2.1.

| UC | Endpoint(s) | Method | Vai trò | Spec chi tiết |
|---|---|---|---|---|
| UC01 DangNhap | FE gọi Supabase Auth SDK trực tiếp. BE chỉ expose `GET /me` để FE kiểm tra vai trò sau login. | GET | Tất cả | ⬜ |
| UC02 TraCuuPhong | `GET /phong` | GET | Tất cả | ⬜ |
| UC03 CapNhatTrangThaiPhong | `PATCH /phong/:id/trang-thai` `PATCH /giuong/:id/trang-thai` | PATCH | QuanLy | ⬜ |
| UC04 TiepNhanYeuCauThue | `POST /nhu-cau-thue` | POST | Sale | ⬜ |
| UC05 DatLichXemPhong | `PATCH /nhu-cau-thue/:id/lich-hen` | PATCH | Sale | ⬜ |
| UC06 LapPhieuDatCoc | `POST /phieu-dat-coc` | POST | Sale | ⬜ |
| UC07 GhiNhanDatCoc | `PATCH /phieu-dat-coc/:id/xac-nhan` | PATCH | Sale (ghi nhận chứng từ) + QuanLy (xác nhận hợp lệ — xem note) | ⬜ |
| UC08 LapHopDongThue | `POST /hop-dong` | POST | QuanLy | ⬜ |
| UC09 KiemTraDieuKienCuTru | `POST /phieu-dat-coc/:id/kiem-tra-dieu-kien` | POST | QuanLy | ⬜ |
| UC10 ThanhToanKyDau | `POST /hoa-don` `PATCH /hoa-don/:id/xac-nhan-thanh-toan` | POST PATCH | KeToan | ⬜ |
| UC11 BanGiaoPhong | `POST /bien-ban-ban-giao` | POST | QuanLy | ⬜ |
| UC12 DangKyTraPhong | `POST /bien-ban-tra-phong` | POST | Sale | ⬜ |
| UC13 DoSoatTaiSan | `PATCH /bien-ban-tra-phong/:id/doi-soat` | PATCH | QuanLy | ⬜ |
| UC14 KhauTruChiPhi | `PATCH /bien-ban-tra-phong/:id/khau-tru` | PATCH | KeToan | ⬜ |
| UC15 ThanhLyHopDong | `PATCH /hop-dong/:id/thanh-ly` | PATCH | QuanLy | ⬜ |

**Note UC07:** Theo PDF, UC07 có 2 bước riêng biệt:
- Sale nhập chứng từ và gọi `PATCH /phieu-dat-coc/:id/xac-nhan` với body `{ chung_tu_url, phuong_thuc_thanh_toan }`.
- Quản lý đối chiếu và xác nhận hợp lệ — có thể dùng cùng endpoint với field `nguoi_xac_nhan_id` được set từ `req.user.id` khi Quản lý gọi, hoặc tách thành 2 endpoint riêng. Quyết định cụ thể để lại cho file `specs/UC07_GhiNhanDatCoc.md`.

**Note UC09:** Endpoint dùng `phieu_dat_coc_id` (không phải `hop_dong_id`) vì UC09 được gọi *trong quá trình lập HĐ*, trước khi HĐ được tạo trong DB. Input là phiếu cọc + danh sách khách cùng giấy tờ; output là kết quả đủ/không đủ điều kiện.

**Note UC12 + UC13:** UC12 (`POST`) tạo record `bien_ban_tra_phong` với `trang_thai = 'ChoDoiSoat'` và `ngay_dang_ky_tra`. UC13 (`PATCH`) cập nhật `danh_sach_doi_soat` và chuyển `trang_thai = 'ChoXacNhan'` vào record đó. Hai UC dùng cùng bảng nhưng endpoint tách biệt.

### 2.1. Endpoint tra cứu phụ trợ (không gắn với 1 UC cụ thể)

Các endpoint này cần thiết để FE lấy dữ liệu trong các luồng nghiệp vụ:

| Endpoint | Method | Vai trò | Dùng khi |
|---|---|---|---|
| `GET /giuong?phong_id=:id&trang_thai=Trong` | GET | Tất cả | UC06: Sale cần chọn giường cụ thể trong phòng khi lập phiếu cọc |
| `GET /phong/:id` | GET | Tất cả | Xem chi tiết 1 phòng |
| `GET /nhu-cau-thue/:id` | GET | Sale, QuanLy | Xem chi tiết yêu cầu thuê |
| `GET /phieu-dat-coc/:id` | GET | Sale, QuanLy, KeToan | Xem chi tiết phiếu cọc |
| `GET /hop-dong/:id` | GET | QuanLy, KeToan | Xem chi tiết hợp đồng |
| `GET /hop-dong/:id/hoa-don` | GET | KeToan | Danh sách hóa đơn của 1 HĐ |
| `GET /bien-ban-ban-giao?hop_dong_id=:id` | GET | QuanLy | UC13 cần lấy biên bản bàn giao gốc để làm baseline đối soát |
| `GET /tai-san-phong?phong_id=:id` | GET | QuanLy | UC11 cần danh mục tài sản để tạo snapshot biên bản bàn giao |
| `GET /health` | GET | Public | Health-check, không cần auth |

---

## 3. Việc cần làm tiếp theo

1. Bắt đầu code Tuần 1–2 theo kế hoạch ở `00_DESIGN_TONG_THE.md`: setup Supabase + viết `prisma/schema.prisma` dựa trên `01_DATABASE_SCHEMA.md`.
2. Viết `specs/UC01_DangNhap.md`, `specs/UC02_TraCuuPhong.md`, `specs/UC03_CapNhatTrangThaiPhong.md` khi bắt đầu code Tuần 2.
3. Mỗi file spec UC dùng cấu trúc thống nhất sau:
   - **Mục tiêu** — UC này làm gì, điều kiện tiên quyết
   - **Input** — body/params/query với kiểu dữ liệu và rule validate (zod schema)
   - **Business logic** — diễn giải từng bước từ báo cáo gốc, ghi rõ bảng DB nào được đọc/ghi
   - **Output** — response mẫu (success + error cases)
   - **Error codes** — liệt kê code lỗi có thể trả về từ bảng mục 1.7
