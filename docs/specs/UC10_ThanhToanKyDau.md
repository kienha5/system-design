# UC10 — Thanh toán kỳ đầu (ThanhToanKyDau)

| | |
|---|---|
| Actor | Kế toán |
| Liên quan | UC08 LapHopDongThue (UC trước — HĐ phải `HieuLuc`), UC11 BanGiaoPhong (UC tiếp theo — chỉ cho bàn giao khi kỳ đầu `DaThanhToan`) |
| Bảng DB liên quan | `hoa_don`, `hop_dong`, `thanh_vien_hop_dong` |

---

## 1. Mục tiêu

Tính và thu các khoản cần thanh toán trước khi bàn giao phòng: tiền thuê kỳ đầu và các phí liên quan (điện, nước, dịch vụ nếu có).

> Tham khảo: Nghiệp vụ 3, UC con "Thanh toán kỳ đầu" (`17_BaoCao-1.pdf`).

**Điều kiện tiên quyết:** Kế toán đã đăng nhập. Hợp đồng thuê đã ở trạng thái `HieuLuc` (UC08 hoàn thành).

---

## 2. Input

**Bước 1 — Tạo hóa đơn** (`POST /api/v1/hoa-don`):

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| hop_dong_id | uuid | có | |
| tien_dien | number | không | default 0 — kỳ đầu thường chưa có số liệu thực tế |
| tien_nuoc | number | không | default 0 |
| tien_dich_vu_khac | number | không | default 0 |

**Bước 2 — Xác nhận đã thu** (`PATCH /api/v1/hoa-don/:id/xac-nhan-thanh-toan`):

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| hinh_thuc_thanh_toan | enum | có | `TienMat` / `ChuyenKhoan` |

---

## 3. Business logic

### 3.1. Bước 1 — Tạo hóa đơn

1. Kiểm tra `hop_dong` tồn tại và `trang_thai = 'HieuLuc'` → `HOP_DONG_KHONG_HOP_LE` 422 nếu không đạt.
2. Kiểm tra chưa có `hoa_don` nào cho HĐ này với `ky_thanh_toan` trùng → `HOA_DON_DA_TON_TAI` 409 nếu đã tạo (tránh Kế toán bấm 2 lần).
3. **Tính `so_giuong_thue`:** Đếm số bản ghi `thanh_vien_hop_dong` có `hop_dong_id = :id` và `dat_dieu_kien_cu_tru = true`.
4. **Tính tiền thuê:**
   ```
   tien_thue = hop_dong.gia_thue_theo_giuong × so_giuong_thue
   tong_tien = tien_thue + tien_dien + tien_nuoc + tien_dich_vu_khac
   ```
5. **Tính `ky_thanh_toan`:** Tự động lấy từ `hop_dong.ngay_bat_dau`, format `'YYYY-MM'` (ví dụ `'2026-07'`). Không nhận từ input để tránh nhập sai.
6. Tạo bản ghi `hoa_don`:
   - `trang_thai = 'ChoThanhToan'`
   - `nguoi_xac_nhan_id = NULL` (điền sau ở bước 2)

### 3.2. Bước 2 — Xác nhận đã thu

1. Kiểm tra `hoa_don` tồn tại → `NOT_FOUND` 404.
2. Kiểm tra `trang_thai = 'ChoThanhToan'` → `TRANG_THAI_KHONG_HOP_LE` 422 nếu đã thanh toán trước đó.
3. Cập nhật `hoa_don`:
   - `trang_thai = 'DaThanhToan'`
   - `ngay_thanh_toan = now()`
   - `hinh_thuc_thanh_toan = input`
   - `nguoi_xac_nhan_id = req.user.id`

> **Dòng thay thế A3 (chưa thu đủ):** Theo PDF, nếu khách chưa trả đủ, Kế toán yêu cầu trả thêm và chờ. Không gọi endpoint bước 2 cho đến khi thực sự thu đủ — Kế toán tự quản lý ở ngoài hệ thống và chỉ bấm xác nhận khi tiền đã đủ. Không cần field `da_thu_du` trong request.

---

## 4. Output

**Bước 1:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ky_thanh_toan": "2026-07",
    "tien_thue": 3500000,
    "tong_tien": 3500000,
    "trang_thai": "ChoThanhToan"
  }
}
```

**Bước 2:**
```json
{
  "success": true,
  "data": { "id": "uuid", "trang_thai": "DaThanhToan", "ngay_thanh_toan": "2026-07-01T10:30:00Z" }
}
```

---

## 5. Endpoint

| Endpoint | Method | Vai trò |
|---|---|---|
| `POST /api/v1/hoa-don` | POST | KeToan |
| `PATCH /api/v1/hoa-don/:id/xac-nhan-thanh-toan` | PATCH | KeToan |

---

## 6. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| `hop_dong` không tồn tại | `NOT_FOUND` | 404 |
| `hop_dong.trang_thai` không phải `HieuLuc` | `HOP_DONG_KHONG_HOP_LE` | 422 |
| Hóa đơn kỳ này đã tồn tại cho HĐ (tránh tạo trùng) | `HOA_DON_DA_TON_TAI` | 409 |
| `hoa_don` không tồn tại (bước 2) | `NOT_FOUND` | 404 |
| `hoa_don.trang_thai` không phải `ChoThanhToan` (bước 2) | `TRANG_THAI_KHONG_HOP_LE` | 422 |

> Thêm `HOP_DONG_KHONG_HOP_LE` và `HOA_DON_DA_TON_TAI` vào bảng error code `02_API_SPEC.md`.

---

## 7. Việc cần làm khi code

- [ ] Viết `src/services/hoaDon.service.js`:
  - `taoHoaDonKyDau(hopDongId, phuPhi)` — tính tiền, kiểm tra trùng kỳ, tạo record.
  - `xacNhanThanhToan(id, hinhThuc, keТoanId)`.
- [ ] Bỏ field `da_thu_du` trong input — không cần, gây nhập nhằng.
