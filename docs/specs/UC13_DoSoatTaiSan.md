# UC13 — Đối soát tài sản, hao mòn (DoSoatTaiSan)

| | |
|---|---|
| Actor | Quản lý |
| Liên quan | UC12 DangKyTraPhong (tạo record `bien_ban_tra_phong` — UC trước), UC14 KhauTruChiPhi (UC tiếp theo) |
| Bảng DB liên quan | `bien_ban_tra_phong`, `bien_ban_ban_giao` (baseline đối chiếu) |

---

## 1. Mục tiêu

Kiểm tra hiện trạng phòng/tài sản tại thời điểm trả phòng thực tế, xác định hao mòn/mất mát so với biên bản bàn giao ban đầu (UC11), làm cơ sở cho UC14 tính chi phí khấu trừ.

> Tham khảo: Nghiệp vụ 4, UC con "Đối soát tài sản, hao mòn" (`17_BaoCao-1.pdf`).

**Điều kiện tiên quyết:** Quản lý đã đăng nhập. `bien_ban_tra_phong` đã tồn tại ở trạng thái `ChoDoiSoat` (UC12 hoàn thành). Khách đã đến trả phòng theo ngày hẹn.

---

## 2. Input

Body của `PATCH /api/v1/bien-ban-tra-phong/:id/doi-soat`:

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| ngay_tra_thuc_te | timestamptz | có | Thời điểm khách thực tế bàn giao phòng |
| danh_sach_doi_soat | array | có | Format đúng với schema jsonb: `[{ ten, tinh_trang, ghi_chu, chi_phi_boi_thuong }]`. `tinh_trang` theo enum `tinh_trang_tai_san`. `chi_phi_boi_thuong` = 0 nếu hao mòn tự nhiên, > 0 nếu hư hỏng/mất mát vượt mức thông thường |

> **Lưu ý format:** Không dùng `tai_san_id` trong `danh_sach_doi_soat` — đây là jsonb tự do, không FK tới `tai_san_phong`. FE load baseline từ `bien_ban_ban_giao.danh_sach_tai_san` (via `GET /bien-ban-ban-giao?hop_dong_id=:id`), Quản lý cập nhật `tinh_trang` và nhập `chi_phi_boi_thuong` cho từng item.

---

## 3. Business logic

1. Kiểm tra `bien_ban_tra_phong` tồn tại và `trang_thai = 'ChoDoiSoat'` → `TRANG_THAI_KHONG_HOP_LE` 422 nếu không đúng.
2. Lấy `bien_ban_ban_giao` của cùng `hop_dong_id` làm baseline. Nếu không tìm thấy → trả `canh_bao: 'KHONG_CO_BIEN_BAN_BAN_GIAO'` trong response nhưng vẫn cho tiếp tục (Quản lý đối soát thủ công không có baseline).
3. Quản lý nhập kết quả kiểm tra từng tài sản vào `danh_sach_doi_soat`:
   - `tinh_trang = 'Tot'` hoặc `'DungDuoc'` → hao mòn tự nhiên, `chi_phi_boi_thuong = 0`.
   - `tinh_trang = 'HuHong'` hoặc `'MatMat'` → **dòng thay thế A3**: Quản lý đánh giá có vượt mức thông thường không và nhập `chi_phi_boi_thuong` tương ứng. Hệ thống không tự phân loại — do Quản lý quyết định.
4. Cập nhật `bien_ban_tra_phong`:
   - `danh_sach_doi_soat` = input JSON
   - `ngay_tra_thuc_te` = input
   - `trang_thai = 'ChoXacNhan'`
   - `quan_ly_xac_nhan_id = req.user.id`

---

## 4. Output

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ma_bien_ban": "BBT0001",
    "trang_thai": "ChoXacNhan",
    "canh_bao": "KHONG_CO_BIEN_BAN_BAN_GIAO"
  }
}
```

`canh_bao` chỉ có khi không tìm thấy biên bản bàn giao gốc.

---

## 5. Endpoint

| Endpoint | Method | Mô tả |
|---|---|---|
| `PATCH /api/v1/bien-ban-tra-phong/:id/doi-soat` | PATCH | Ghi nhận kết quả đối soát tài sản |

Vai trò: QuanLy.

---

## 6. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| `bien_ban_tra_phong` không tồn tại | `NOT_FOUND` | 404 |
| `trang_thai` không phải `ChoDoiSoat` | `TRANG_THAI_KHONG_HOP_LE` | 422 |
| `danh_sach_doi_soat` rỗng | `VALIDATION_ERROR` | 400 |
| Không tìm thấy `bien_ban_ban_giao` gốc | (không phải lỗi cứng) — trả `canh_bao` trong response, vẫn cho tiếp tục | 200 |

---

## 7. Việc cần làm khi code

- [ ] Viết `src/services/bienBanTraPhong.service.js` (tái sử dụng file từ UC12) hàm `doSoat(id, ngayTraThucTe, danhSachDoiSoat, quanLyId)`.
- [ ] FE: hiển thị side-by-side "lúc bàn giao" (từ `bien_ban_ban_giao.danh_sach_tai_san`) vs "lúc trả" (Quản lý nhập) cho từng tài sản — gọi `GET /bien-ban-ban-giao?hop_dong_id=:id` trước để load baseline.
- [ ] FE: với item có `tinh_trang = 'HuHong'`/`'MatMat'`, hiển thị ô nhập `chi_phi_boi_thuong` để Quản lý điền.
