# UC14 — Khấu trừ chi phí phát sinh (KhauTruChiPhi)

| | |
|---|---|
| Actor | Kế toán |
| Liên quan | UC13 DoSoatTaiSan (UC trước — `bien_ban_tra_phong` phải `ChoXacNhan`), UC15 ThanhLyHopDong (UC tiếp theo) |
| Bảng DB liên quan | `bien_ban_tra_phong`, `phieu_dat_coc` (lấy `so_tien_coc` gốc), `hop_dong` |

---

## 1. Mục tiêu

Xác định tỷ lệ hoàn cọc, tính tổng chi phí phát sinh cần khấu trừ, và xác định số tiền hoàn lại cho khách hoặc số tiền khách cần nộp thêm. Sau khi Kế toán lập xong, Quản lý thông báo kết quả cho khách xác nhận.

> Tham khảo: Nghiệp vụ 4, UC con "Khấu trừ chi phí phát sinh" (`17_BaoCao-1.pdf`).

**Điều kiện tiên quyết:** Kế toán đã đăng nhập. `bien_ban_tra_phong.trang_thai = 'ChoXacNhan'` (UC13 hoàn thành).

---

## 2. Input

**Bước 1 — Kế toán lập phiếu khấu trừ** (`PATCH /api/v1/bien-ban-tra-phong/:id/khau-tru`):

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| ty_le_hoan_coc | number (%) | có | 0–100. Kế toán xác định theo tình trạng HĐ + thời gian lưu trú. Không có công thức cứng trong PDF — để Kế toán nhập thủ công. Gợi ý rule đơn giản cho đồ án: trả đúng hạn + không vi phạm → 100%; trả trước hạn/vi phạm → giảm tùy mức độ. |
| tien_thue_con_no | number | không | default 0 — tiền thuê chưa thanh toán nếu có |
| tien_dien_nuoc_dich_vu | number | không | default 0 |
| chi_phi_sua_chua_boi_thuong | number | không | default 0 — thường lấy từ tổng `chi_phi_boi_thuong` trong `danh_sach_doi_soat` của UC13; Kế toán có thể điều chỉnh |
| tien_phat_vi_pham | number | không | default 0 |

**Bước 2 — Ghi nhận xác nhận của khách** (`PATCH /api/v1/bien-ban-tra-phong/:id/xac-nhan-khach`):

Không có body — Quản lý/Sale gọi endpoint này hộ sau khi khách đồng ý miệng với kết quả đối soát.

---

## 3. Business logic

### 3.1. Bước 1 — Kế toán lập phiếu khấu trừ

1. Kiểm tra `bien_ban_tra_phong` tồn tại và `trang_thai = 'ChoXacNhan'` → `TRANG_THAI_KHONG_HOP_LE` 422.
2. Lấy `so_tien_coc` gốc: `bien_ban_tra_phong → hop_dong → phieu_dat_coc.so_tien_coc`.
3. **Tính toán:**
   ```
   chi_phi_phat_sinh_tong = tien_thue_con_no
                           + tien_dien_nuoc_dich_vu
                           + chi_phi_sua_chua_boi_thuong
                           + tien_phat_vi_pham

   tien_coc_duoc_hoan_theo_ty_le = so_tien_coc × (ty_le_hoan_coc / 100)
   ```
4. **Phân nhánh (dòng thay thế A4a/A4b):**
   - Nếu `tien_coc_duoc_hoan_theo_ty_le >= chi_phi_phat_sinh_tong` **(A4b)**:
     - `so_tien_hoan_khach = tien_coc_duoc_hoan_theo_ty_le - chi_phi_phat_sinh_tong`
     - `so_tien_khach_can_tra_them = 0`
   - Nếu `tien_coc_duoc_hoan_theo_ty_le < chi_phi_phat_sinh_tong` **(A4a)**:
     - `so_tien_hoan_khach = 0`
     - `so_tien_khach_can_tra_them = chi_phi_phat_sinh_tong - tien_coc_duoc_hoan_theo_ty_le`

5. Cập nhật `bien_ban_tra_phong`:
   - `chi_phi_phat_sinh_tong`, `ty_le_hoan_coc`
   - `so_tien_hoan_khach`, `so_tien_khach_can_tra_them`
   - `ke_toan_xac_nhan_id = req.user.id`
   - `trang_thai` **giữ nguyên** `'ChoXacNhan'` — chờ khách xác nhận đồng ý.

6. Kết quả hiển thị ở Dashboard Quản lý để thông báo cho khách (không cần API riêng).

### 3.2. Bước 2 — Ghi nhận xác nhận của khách

1. Kiểm tra `bien_ban_tra_phong.trang_thai = 'ChoXacNhan'` → `TRANG_THAI_KHONG_HOP_LE` 422.
2. Kiểm tra `ke_toan_xac_nhan_id IS NOT NULL` (bước 1 đã chạy) → `KHAU_TRU_CHUA_DUOC_LAP` 422.
3. Set `khach_xac_nhan_doi_soat = true`.

> **Dòng thay thế A5 (khách không đồng ý):** Quản lý và khách rà soát lại → Kế toán gọi lại endpoint bước 1 với số liệu đã điều chỉnh. Có thể gọi nhiều lần cho đến khi đồng thuận. Bước 2 chỉ gọi sau khi đã đồng thuận.

---

## 4. Output

**Bước 1:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "chi_phi_phat_sinh_tong": 500000,
    "ty_le_hoan_coc": 100,
    "so_tien_hoan_khach": 5500000,
    "so_tien_khach_can_tra_them": 0,
    "trang_thai": "ChoXacNhan"
  }
}
```

**Bước 2:**
```json
{
  "success": true,
  "data": { "id": "uuid", "khach_xac_nhan_doi_soat": true }
}
```

---

## 5. Endpoint

| Endpoint | Method | Vai trò |
|---|---|---|
| `PATCH /api/v1/bien-ban-tra-phong/:id/khau-tru` | PATCH | KeToan |
| `PATCH /api/v1/bien-ban-tra-phong/:id/xac-nhan-khach` | PATCH | QuanLy hoặc Sale (nhập hộ xác nhận của khách) |

---

## 6. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| `bien_ban_tra_phong` không tồn tại | `NOT_FOUND` | 404 |
| `trang_thai` không phải `ChoXacNhan` | `TRANG_THAI_KHONG_HOP_LE` | 422 |
| `ty_le_hoan_coc` ngoài khoảng 0–100 | `VALIDATION_ERROR` | 400 |
| Gọi bước 2 khi bước 1 chưa chạy (`ke_toan_xac_nhan_id IS NULL`) | `KHAU_TRU_CHUA_DUOC_LAP` | 422 |

> Thêm `KHAU_TRU_CHUA_DUOC_LAP` vào bảng error code `02_API_SPEC.md`.

---

## 7. Việc cần làm khi code

- [ ] Viết `src/services/bienBanTraPhong.service.js` (tái sử dụng file từ UC12/13):
  - `khauTruChiPhi(id, khoanPhatSinh, keТoanId)`.
  - `xacNhanKhach(id)`.
- [ ] **Gợi ý rule `ty_le_hoan_coc` cho đồ án** (ghi vào code comment, không hardcode vào BE):
  - Trả đúng hạn + không vi phạm nội quy → 100%.
  - Trả trước hạn HĐ (break contract) → 50% (hoặc tùy chính sách ký túc xá).
  - Vi phạm nội quy nghiêm trọng → 0%.
  - Kế toán vẫn có thể nhập tay giá trị khác — rule này chỉ là gợi ý hiển thị trên UI.
