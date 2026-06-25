# UC03 — Cập nhật trạng thái phòng/giường (CapNhatTrangThaiPhong)

| | |
|---|---|
| Actor | Quản lý (thủ công); Service layer nội bộ (tự động — được gọi bởi UC06, UC07, UC11, UC15) |
| Được gọi bởi | UC06 LapPhieuDatCoc, UC07 GhiNhanDatCoc, UC11 BanGiaoPhong, UC15 ThanhLyHopDong |
| Bảng DB liên quan | `phong`, `giuong`, `lich_su_trang_thai_phong` |

---

## 1. Mục tiêu

UC03 có **hai vai trò**:

1. **Endpoint thủ công** (`PATCH /phong/:id/trang-thai`, `PATCH /giuong/:id/trang-thai`): Quản lý chủ động đổi trạng thái — ví dụ chuyển phòng sang `BaoTri`, hoặc chỉnh sửa trạng thái khi có sự cố.
2. **Hàm Service nội bộ** (`updateTrangThaiGiuong`, `syncTrangThaiPhong`): Được các UC khác gọi trực tiếp (không qua HTTP) để tự động cập nhật trạng thái theo luồng nghiệp vụ. Mọi thay đổi đều ghi audit log vào `lich_su_trang_thai_phong`.

**Điều kiện tiên quyết (endpoint thủ công):** Quản lý đã đăng nhập.

---

## 2. Input (endpoint thủ công)

Body của `PATCH /phong/:id/trang-thai` hoặc `PATCH /giuong/:id/trang-thai`:

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| trang_thai_moi | enum | có | Phòng: `Trong` / `ChoDatCoc` / `DaDatCoc` / `DangThue` / `BaoTri`. Giường: `Trong` / `ChoDatCoc` / `DaDatCoc` / `DangThue` |
| ly_do | string | **có nếu** transition thuộc nhóm cần xác nhận (xem mục 3 bước 2) | Ghi vào audit log |

---

## 3. Business logic

### 3.1. Luồng chung (dùng cho cả thủ công lẫn nội bộ)

1. Kiểm tra `id` tồn tại trong bảng `phong` hoặc `giuong` → không tìm thấy: `NOT_FOUND` 404.
2. **Validate transition:**

   | Transition | Cho phép | Ghi chú |
   |---|---|---|
   | `Trong` → `ChoDatCoc` | ✅ Tự động (UC06) | |
   | `ChoDatCoc` → `Trong` | ✅ Tự động (lazy expiry 24h) | |
   | `ChoDatCoc` → `DaDatCoc` | ✅ Tự động (UC07) | |
   | `DaDatCoc` → `DangThue` | ✅ Tự động (UC11) | |
   | `DangThue` → `Trong` | ✅ Tự động (UC15) | |
   | Bất kỳ → `BaoTri` | ✅ Thủ công (Quản lý), `ly_do` bắt buộc | Cảnh báo nếu đang có HĐ hiệu lực |
   | `BaoTri` → `Trong` | ✅ Thủ công (Quản lý) | |
   | `DangThue` → `Trong` thủ công | ⚠️ Cho phép với `ly_do` bắt buộc | Trả về warning `HOP_DONG_DANG_HIEU_LUC` trong response nếu còn HĐ hiệu lực, Quản lý xác nhận override |
   | Các transition khác | ❌ | `TRANG_THAI_CHUYEN_KHONG_HOP_LE` 422 |

3. Ghi bản ghi vào `lich_su_trang_thai_phong`:
   ```
   { phong_id/giuong_id, trang_thai_truoc, trang_thai_sau, ly_do, nguoi_thuc_hien_id, thoi_diem: now() }
   ```
4. Cập nhật `trang_thai` trong bảng `phong` hoặc `giuong`.
5. **Nếu đổi trạng thái giường → đồng bộ trạng thái phòng cha** (xem mục 3.2).

### 3.2. Hàm `syncTrangThaiPhong(phongId)` — đồng bộ phòng từ giường

Được gọi sau mỗi lần cập nhật giường. Đọc toàn bộ `giuong` thuộc `phong_id`, tính trạng thái tổng hợp:

| Trạng thái các giường | Trạng thái phòng kết quả |
|---|---|
| Tất cả `Trong` | `Trong` |
| Có ít nhất 1 `ChoDatCoc`, không có `DaDatCoc`/`DangThue` | `ChoDatCoc` |
| Có ít nhất 1 `DaDatCoc`, không có `DangThue` | `DaDatCoc` |
| Có ít nhất 1 `DangThue` | `DangThue` |
| Phòng đang `BaoTri` | Không thay đổi (BaoTri chỉ set/unset thủ công) |

Cập nhật `phong.trang_thai` và ghi thêm bản ghi vào `lich_su_trang_thai_phong` (với `phong_id`, không phải `giuong_id`).

> **Lưu ý:** Toàn bộ bước 3.1 + 3.2 phải nằm trong 1 **Prisma transaction** để đảm bảo audit log và trạng thái luôn nhất quán.

---

## 4. Output

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "trang_thai": "BaoTri",
    "warning": "HOP_DONG_DANG_HIEU_LUC"
  }
}
```

> Field `warning` chỉ có khi Quản lý override trạng thái phòng đang có HĐ hiệu lực. FE hiển thị cảnh báo nhưng không block hành động (Quản lý đã xác nhận qua `ly_do`).

---

## 5. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| Không tìm thấy phòng/giường | `NOT_FOUND` | 404 |
| Transition không nằm trong bảng cho phép | `TRANG_THAI_CHUYEN_KHONG_HOP_LE` | 422 |
| Transition cần `ly_do` nhưng không truyền | `VALIDATION_ERROR` | 400 |

---

## 6. Việc cần làm khi code

- [ ] Viết `src/services/phong.service.js`:
  - `updateTrangThaiGiuong(giuongId, trangThaiMoi, lyDo, userId, tx?)` — nhận Prisma transaction optional để UC khác gọi chung transaction.
  - `updateTrangThaiPhong(phongId, trangThaiMoi, lyDo, userId, tx?)` — tương tự cho phòng.
  - `syncTrangThaiPhong(phongId, tx?)` — tính lại và cập nhật trạng thái phòng từ giường.
- [ ] Các hàm trên nhận tham số `tx` (Prisma transaction client) optional — nếu có thì dùng `tx`, nếu không thì dùng `prisma` global. Pattern này cho phép UC06/UC07/UC11/UC15 gọi trong cùng transaction của mình.
