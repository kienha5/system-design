# UC11 — Bàn giao phòng (BanGiaoPhong)

| | |
|---|---|
| Actor | Quản lý |
| Liên quan | UC10 ThanhToanKyDau (UC trước — kỳ đầu phải `DaThanhToan`), UC03 CapNhatTrangThaiPhong (gọi nội bộ), kết thúc Nghiệp vụ 3 |
| Bảng DB liên quan | `bien_ban_ban_giao`, `tai_san_phong`, `hop_dong`, `giuong`, `phong` |

---

## 1. Mục tiêu

Kiểm tra hiện trạng phòng/tài sản thực tế, lập biên bản bàn giao, và khóa chính thức giường/phòng sang trạng thái `DangThue` — khách bắt đầu thời gian cư trú.

Biên bản bàn giao là **baseline** để so sánh khi trả phòng (UC13 `DoSoatTaiSan`).

> Tham khảo: Nghiệp vụ 3, UC con "Nhận bàn giao tài sản" (`17_BaoCao-1.pdf`).

**Điều kiện tiên quyết:** Quản lý đã đăng nhập. Hóa đơn kỳ đầu của HĐ đã `DaThanhToan` (UC10 hoàn thành).

---

## 2. Input

**Bước 1 — Tạo biên bản (kiểm tra hiện trạng)** (`POST /api/v1/bien-ban-ban-giao`):

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| hop_dong_id | uuid | có | |
| tinh_trang_phong | string | không | Ghi chú tổng quan hiện trạng phòng |
| danh_sach_tai_san | array | có | Format: `[{ ten, so_luong, tinh_trang, ghi_chu }]`. `tinh_trang` theo enum `tinh_trang_tai_san`: `Tot` / `DungDuoc` / `CanChuY` / `HuHong` / `MatMat`. FE load sẵn từ `GET /tai-san-phong?phong_id=:id`, Quản lý điều chỉnh tình trạng thực tế |

**Bước 2 — Ký xác nhận & hoàn tất** (`PATCH /api/v1/bien-ban-ban-giao/:id/xac-nhan`):

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| anh_bien_ban_url | string | không | FE upload lên Supabase Storage trước, gửi URL |

---

## 3. Business logic

### 3.1. Bước 1 — Tạo biên bản

1. Kiểm tra `hop_dong` tồn tại và `trang_thai = 'HieuLuc'` → `HOP_DONG_KHONG_HOP_LE` 422.
2. Kiểm tra hóa đơn kỳ đầu: query `hoa_don` có `hop_dong_id` này và `trang_thai = 'DaThanhToan'` → `HOA_DON_CHUA_THANH_TOAN_DU` 422 nếu chưa có.
3. Kiểm tra chưa có `bien_ban_ban_giao` nào cho HĐ này (UNIQUE `hop_dong_id`) → `BIEN_BAN_DA_TON_TAI` 409.
4. **Dòng thay thế A1 (phát hiện vấn đề hiện trạng):** Nếu `danh_sach_tai_san` có tài sản với `tinh_trang = 'HuHong'` hoặc `'MatMat'` → vẫn tạo record `bien_ban_ban_giao` với `khach_da_ky_xac_nhan = false`, trả về `canh_bao: 'CO_VAN_DE_HIEN_TRANG'`. Quản lý xử lý/khắc phục thực tế rồi gọi lại bước 1 với `PATCH` để cập nhật `danh_sach_tai_san` trước khi ký xác nhận.
5. Tạo `bien_ban_ban_giao`:
   - `danh_sach_tai_san` = snapshot JSON input (lưu nguyên — đây là baseline cho UC13)
   - `quan_ly_xac_nhan_id = req.user.id`
   - `khach_da_ky_xac_nhan = false` (chờ bước 2)

### 3.2. Bước 2 — Ký xác nhận, hoàn tất

Thực hiện trong **1 Prisma transaction**:

1. Kiểm tra `bien_ban_ban_giao` tồn tại → `NOT_FOUND` 404.
2. Kiểm tra `khach_da_ky_xac_nhan = false` → `TRANG_THAI_KHONG_HOP_LE` 422 nếu đã xác nhận trước đó.
3. Kiểm tra không còn tài sản `HuHong`/`MatMat` trong `danh_sach_tai_san` → `CO_VAN_DE_HIEN_TRANG_CHUA_XU_LY` 422 nếu vẫn còn (chặn ký khi phòng chưa được khắc phục xong).
4. Cập nhật `bien_ban_ban_giao`:
   - `khach_da_ky_xac_nhan = true`
   - `anh_bien_ban_url = input` (nếu có)
5. Gọi `updateTrangThaiGiuong(giuong_id, 'DangThue', ...)` (UC03) cho từng giường trong `thanh_vien_hop_dong` của HĐ → `syncTrangThaiPhong` tự chạy theo.
6. Cập nhật `hop_dong.ngay_bat_dau = today` nếu ngày bàn giao thực tế khác ngày dự kiến đã lưu.

---

## 4. Output

**Bước 1:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ma_bien_ban": "BBG0001",
    "khach_da_ky_xac_nhan": false,
    "canh_bao": "CO_VAN_DE_HIEN_TRANG"
  }
}
```
`canh_bao` chỉ có khi phát hiện tài sản `HuHong`/`MatMat`.

**Bước 2:**
```json
{
  "success": true,
  "data": { "id": "uuid", "ma_bien_ban": "BBG0001", "khach_da_ky_xac_nhan": true }
}
```

---

## 5. Endpoint

| Endpoint | Method | Mô tả |
|---|---|---|
| `POST /api/v1/bien-ban-ban-giao` | POST | Bước 1 — tạo biên bản, ghi nhận hiện trạng |
| `PATCH /api/v1/bien-ban-ban-giao/:id/danh-sach-tai-san` | PATCH | Cập nhật danh sách tài sản sau khi khắc phục A1 (trước khi ký) |
| `PATCH /api/v1/bien-ban-ban-giao/:id/xac-nhan` | PATCH | Bước 2 — ký xác nhận, hoàn tất bàn giao |

Vai trò: QuanLy.

---

## 6. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| `hop_dong` không tồn tại hoặc không `HieuLuc` | `HOP_DONG_KHONG_HOP_LE` | 422 |
| Hóa đơn kỳ đầu chưa `DaThanhToan` | `HOA_DON_CHUA_THANH_TOAN_DU` | 422 |
| HĐ đã có biên bản bàn giao trước đó | `BIEN_BAN_DA_TON_TAI` | 409 |
| Xác nhận khi vẫn còn tài sản `HuHong`/`MatMat` chưa xử lý | `CO_VAN_DE_HIEN_TRANG_CHUA_XU_LY` | 422 |
| Biên bản đã được xác nhận trước đó | `TRANG_THAI_KHONG_HOP_LE` | 422 |

> Thêm `BIEN_BAN_DA_TON_TAI` và `CO_VAN_DE_HIEN_TRANG_CHUA_XU_LY` vào bảng error code `02_API_SPEC.md`.

---

## 7. Việc cần làm khi code

- [ ] Viết `src/services/bienBanBanGiao.service.js`:
  - `tao(hopDongId, tinhTrangPhong, danhSachTaiSan, quanLyId)`.
  - `capNhatDanhSachTaiSan(id, danhSachTaiSan)` — cho phép Quản lý cập nhật lại sau khi khắc phục A1.
  - `xacNhan(id, anhUrl, quanLyId)` — toàn bộ bước 2 trong 1 Prisma transaction.
- [ ] Seed dữ liệu `tai_san_phong` mặc định cho mỗi phòng (giường, nệm, tủ, thẻ từ) để FE load sẵn checklist.
- [ ] FE: gọi `GET /tai-san-phong?phong_id=:id` trước khi hiển thị form bàn giao để load danh mục tài sản mặc định.
- [ ] FE: upload ảnh biên bản lên Supabase Storage trước khi gọi bước 2 (tương tự UC07).
