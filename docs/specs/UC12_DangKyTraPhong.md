# UC12 — Đăng ký trả phòng (DangKyTraPhong)

| | |
|---|---|
| Actor | Nhân viên Sale |
| Liên quan | UC13 DoSoatTaiSan (UC tiếp theo — thực hiện khi khách đến đúng ngày hẹn) |
| Bảng DB liên quan | `bien_ban_tra_phong`, `hop_dong` |

---

## 1. Mục tiêu

Tiếp nhận yêu cầu trả phòng từ khách, ghi nhận ngày hẹn trả, và tạo record `bien_ban_tra_phong` khởi đầu — làm điểm bắt đầu cho toàn bộ luồng đối soát → khấu trừ → thanh lý.

> Tham khảo: Nghiệp vụ 4 "Đăng ký trả phòng và hoàn cọc", dòng cơ bản bước 1–2 (`17_BaoCao-1.pdf`).

**Điều kiện tiên quyết:** Sale đã đăng nhập. HĐ đang ở trạng thái `HieuLuc`.

---

## 2. Quyết định thiết kế

UC12 **tạo record `bien_ban_tra_phong`** ngay từ bước đăng ký (với `trang_thai = 'ChoDoiSoat'`, `ngay_dang_ky_tra = now()`) thay vì chỉ ghi thêm cột vào `hop_dong`. Lý do:

- Đồng bộ với schema `01_DATABASE_SCHEMA.md` §4.13 — `bien_ban_tra_phong` đã có cột `ngay_dang_ky_tra` và `ngay_tra_thuc_te` tách biệt.
- UC13 sau đó `PATCH` vào record này để điền `danh_sach_doi_soat`, thống nhất với `02_API_SPEC.md`.
- Không cần thêm cột vào `hop_dong` — kiểm tra "đã đăng ký trả chưa" bằng cách query `bien_ban_tra_phong WHERE hop_dong_id = :id`.

---

## 3. Input

Body của `POST /api/v1/bien-ban-tra-phong`:

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| hop_dong_id | uuid | có | |
| ngay_tra_phong_du_kien | date | có | Phải >= ngày hôm nay |

---

## 4. Business logic

1. Kiểm tra `hop_dong` tồn tại và `trang_thai = 'HieuLuc'` → `HOP_DONG_KHONG_HOP_LE` 422 nếu không đạt.
2. Kiểm tra chưa có `bien_ban_tra_phong` nào cho HĐ này (UNIQUE `hop_dong_id`) → `DA_DANG_KY_TRA_PHONG` 409 nếu đã tạo trước đó. Nếu Sale muốn **đổi ngày hẹn**, dùng endpoint riêng `PATCH /bien-ban-tra-phong/:id/ngay-hen` (xem mục 6).
3. Tạo bản ghi `bien_ban_tra_phong`:
   - `ngay_dang_ky_tra = now()`
   - `ngay_tra_thuc_te = NULL` (điền sau ở UC13)
   - `trang_thai = 'ChoDoiSoat'`
   - Tất cả các field tính toán (chi phí, hoàn cọc...) = NULL/0 — điền dần ở UC13 và UC14.
4. Không thay đổi `hop_dong.trang_thai` — HĐ vẫn `HieuLuc` cho đến khi UC15 hoàn tất.

---

## 5. Output

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "hop_dong_id": "uuid",
    "ngay_dang_ky_tra": "2026-07-25T10:00:00Z",
    "ngay_tra_phong_du_kien": "2026-08-01",
    "trang_thai": "ChoDoiSoat"
  }
}
```

---

## 6. Endpoint

| Endpoint | Method | Mô tả |
|---|---|---|
| `POST /api/v1/bien-ban-tra-phong` | POST | Tạo đăng ký trả phòng |
| `PATCH /api/v1/bien-ban-tra-phong/:id/ngay-hen` | PATCH | Đổi ngày hẹn trả (nếu khách thay đổi kế hoạch) |

Vai trò: Sale.

Body của `PATCH .../ngay-hen`: `{ ngay_tra_phong_du_kien: "date" }` — chỉ cho phép khi `trang_thai = 'ChoDoiSoat'`.

---

## 7. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| HĐ không tồn tại hoặc không `HieuLuc` | `HOP_DONG_KHONG_HOP_LE` | 422 |
| HĐ đã có đăng ký trả phòng trước đó | `DA_DANG_KY_TRA_PHONG` | 409 |
| `ngay_tra_phong_du_kien` < hôm nay | `VALIDATION_ERROR` | 400 |

> Thêm `DA_DANG_KY_TRA_PHONG` vào bảng error code `02_API_SPEC.md`.

---

## 8. Việc cần làm khi code

- [ ] Viết `src/services/bienBanTraPhong.service.js` hàm `taoYeuCauTra(hopDongId, ngayDuKien)` và `capNhatNgayHen(id, ngayDuKien)`.
- [ ] **Không** thêm cột vào `hop_dong` — dùng query `bien_ban_tra_phong` để kiểm tra trạng thái trả phòng của HĐ.
- [ ] FE: form tìm HĐ theo mã hoặc tên khách → hiển thị thông tin HĐ → nhập ngày hẹn trả → submit.
