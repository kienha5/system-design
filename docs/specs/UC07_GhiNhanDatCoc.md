# UC07 — Ghi nhận đặt cọc (GhiNhanDatCoc)

| | |
|---|---|
| Actor | Nhân viên Sale (bước 1 — nhập chứng từ), Quản lý (bước 2 — đối chiếu & xác nhận) |
| Liên quan | UC06 LapPhieuDatCoc (UC trước), UC03 CapNhatTrangThaiPhong (gọi nội bộ) |
| Bảng DB liên quan | `phieu_dat_coc`, `phong`, `giuong` |

---

## 1. Mục tiêu

Ghi nhận khách hàng đã thanh toán cọc, Quản lý đối chiếu chứng từ và xác nhận hợp lệ, từ đó khóa chính thức giường/phòng đã cọc. Sau khi xác nhận xong, Quản lý chủ động tiếp tục vào UC08 khi khách đến nhận phòng — không có trigger tự động.

> Tham khảo: Nghiệp vụ 2, dòng cơ bản bước 5–9 + UC con "Ghi nhận thông tin đặt cọc" (`17_BaoCao-1.pdf`).

**Điều kiện tiên quyết:** Phiếu đặt cọc ở trạng thái `ChoThanhToan` và chưa hết hạn 24h.

---

## 2. Input

UC07 có 2 endpoint tương ứng 2 bước tách biệt.

**Bước 1 — Sale nhập chứng từ** (`PATCH /api/v1/phieu-dat-coc/:id/chung-tu`):

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| phuong_thuc_thanh_toan | enum | có | `TienMat` / `ChuyenKhoan` |
| chung_tu_url | string (URL) | có | FE upload ảnh lên Supabase Storage trước, lấy URL signed/public rồi gửi kèm |

**Bước 2 — Quản lý xác nhận** (`PATCH /api/v1/phieu-dat-coc/:id/xac-nhan`):

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| xac_nhan | boolean | có | `true` = xác nhận hợp lệ; `false` = từ chối, Sale cần yêu cầu khách nộp lại |

---

## 3. Business logic

### 3.1. Bước 1 — Sale nhập chứng từ

1. Gọi `checkAndExpireIfNeeded(id)` (UC06) — nếu hết hạn: `PHIEU_COC_HET_HAN` 422, dừng.
2. Kiểm tra `trang_thai = 'ChoThanhToan'` → không phù hợp: `TRANG_THAI_KHONG_HOP_LE` 422.
3. Cập nhật `phieu_dat_coc`:
   - `phuong_thuc_thanh_toan = input`
   - `chung_tu_url = input`
   - `trang_thai` **giữ nguyên** `ChoThanhToan` — chờ Quản lý xác nhận.

> **Quyết định về trạng thái trung gian:** Không thêm enum mới. Dùng `chung_tu_url IS NOT NULL` làm dấu hiệu "đã nộp chứng từ". FE kiểm tra field này để hiển thị đúng trạng thái cho Quản lý.

### 3.2. Bước 2 — Quản lý xác nhận

1. Gọi `checkAndExpireIfNeeded(id)` — nếu hết hạn: `PHIEU_COC_HET_HAN` 422, dừng.
2. Kiểm tra `trang_thai = 'ChoThanhToan'` → không phù hợp: `TRANG_THAI_KHONG_HOP_LE` 422.
3. Kiểm tra `chung_tu_url IS NOT NULL` — nếu NULL (Sale chưa nộp chứng từ): `CHUNG_TU_CHUA_NOI` 422, dừng. Quản lý không thể xác nhận khi chưa có chứng từ để đối chiếu.
4. **Nếu `xac_nhan = true`** (Quản lý xác nhận hợp lệ — trong 1 Prisma transaction):
   - `phieu_dat_coc.trang_thai = 'DaThanhToan'`
   - `phieu_dat_coc.nguoi_xac_nhan_id = req.user.id`
   - Gọi `updateTrangThaiGiuong(giuong_id, 'DaDatCoc', ...)` (UC03) trong cùng transaction.
   - `syncTrangThaiPhong(phong_id)` tự chạy theo.
5. **Nếu `xac_nhan = false`** (Quản lý từ chối chứng từ không hợp lệ):
   - Giữ nguyên `trang_thai = 'ChoThanhToan'`.
   - **Reset `chung_tu_url = NULL`** và `phuong_thuc_thanh_toan = NULL` — Sale cần yêu cầu khách nộp lại chứng từ đúng.
   - Trả response với `trang_thai: 'ChoThanhToan'` và `tu_choi: true` để FE hiển thị thông báo cho Sale.

---

## 4. Output

**Bước 1 — thành công:**
```json
{ "success": true, "data": { "id": "uuid", "trang_thai": "ChoThanhToan", "chung_tu_url": "https://..." } }
```

**Bước 2 — xác nhận thành công:**
```json
{ "success": true, "data": { "id": "uuid", "trang_thai": "DaThanhToan" } }
```

**Bước 2 — từ chối:**
```json
{ "success": true, "data": { "id": "uuid", "trang_thai": "ChoThanhToan", "tu_choi": true } }
```

---

## 5. Endpoint

| Endpoint | Method | Vai trò |
|---|---|---|
| `PATCH /api/v1/phieu-dat-coc/:id/chung-tu` | PATCH | Sale |
| `PATCH /api/v1/phieu-dat-coc/:id/xac-nhan` | PATCH | QuanLy |

---

## 6. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| Phiếu cọc không tồn tại | `NOT_FOUND` | 404 |
| Phiếu cọc đã hết hạn 24h | `PHIEU_COC_HET_HAN` | 422 |
| Phiếu cọc đã xác nhận trước đó (`DaThanhToan`) | `PHIEU_COC_DA_XAC_NHAN` | 409 |
| `trang_thai` không phải `ChoThanhToan` | `TRANG_THAI_KHONG_HOP_LE` | 422 |
| Quản lý xác nhận khi `chung_tu_url` còn NULL | `CHUNG_TU_CHUA_NOI` | 422 |

> Thêm `CHUNG_TU_CHUA_NOI` vào bảng error code `02_API_SPEC.md`.

---

## 7. Việc cần làm khi code

- [ ] Viết `src/services/phieuDatCoc.service.js` (tái sử dụng file từ UC06):
  - `nopChungTu(id, { phuong_thuc_thanh_toan, chung_tu_url })`.
  - `xacNhan(id, xacNhanBoolean, quanLyId)` — toàn bộ trong 1 Prisma transaction khi `xac_nhan = true`.
- [ ] FE: upload ảnh chứng từ lên Supabase Storage trước khi gọi endpoint bước 1. Dùng `supabase.storage.from('chung-tu').upload(...)` ở FE, lấy URL public rồi gửi vào body.
- [ ] FE Dashboard Quản lý: hiển thị danh sách phiếu cọc có `chung_tu_url IS NOT NULL` và `trang_thai = 'ChoThanhToan'` để Quản lý biết cần xem xét.
