# UC07 — Ghi nhận đặt cọc (GhiNhanDatCoc)

| | |
|---|---|
| Actor | Nhân viên Sale |
| Liên quan | UC06 LapPhieuDatCoc (UC trước), UC03 CapNhatTrangThaiPhong (gọi nội bộ) |
| Bảng DB liên quan | `phieu_dat_coc`, `phong`, `giuong` |

---

## 1. Mục tiêu

Ghi nhận khách hàng đã thanh toán cọc và xác nhận hoàn tất. Sau khi xác nhận xong, trạng thái của giường/phòng lập tức chuyển sang "Đã đặt cọc" để tránh trường hợp đặt cọc trùng lặp. Quản lý sẽ thực hiện kiểm đếm đối chiếu chứng từ thanh toán thực tế ngoài hệ thống.

> Tham khảo: Nghiệp vụ 2, dòng cơ bản bước 5–9 + UC con "Ghi nhận thông tin đặt cọc" (`17_BaoCao.html`).

**Điều kiện tiên quyết:** Phiếu đặt cọc ở trạng thái `ChoThanhToan` và chưa hết hạn 24h.

---

## 2. Input

Mọi thông tin thanh toán cọc được Sale điền và xác nhận trong một request duy nhất:

`PATCH /api/v1/phieu-dat-coc/:id/xac-nhan`

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| phuong_thuc_thanh_toan | enum | có | `TienMat` / `ChuyenKhoan` |
| chung_tu_url | string (URL) | có | FE upload ảnh chứng từ chuyển khoản hoặc phiếu thu tiền mặt lên Supabase Storage trước, sau đó gửi URL |

---

## 3. Business logic

1. Gọi `checkAndExpireIfNeeded(id)` — nếu hết hạn: set `trang_thai = 'HetHan'`, trả về `PHIEU_COC_HET_HAN` 422, dừng.
2. Kiểm tra `trang_thai = 'ChoThanhToan'` → không phù hợp (đã thanh toán hoặc đã hủy): `TRANG_THAI_KHONG_HOP_LE` 422, dừng.
3. Cập nhật trong 1 transaction (Prisma transaction):
   - `phieu_dat_coc.phuong_thuc_thanh_toan = input.phuong_thuc_thanh_toan`
   - `phieu_dat_coc.chung_tu_url = input.chung_tu_url`
   - `phieu_dat_coc.trang_thai = 'DaThanhToan'`
   - `phieu_dat_coc.nguoi_xac_nhan_id = req.user.id` (Ghi nhận Sale xác nhận đã nhận cọc)
   - Gọi `updateTrangThaiGiuong(giuong_id, 'DaDatCoc', ...)` (UC03) để khóa giường/phòng.
4. Trả về thông báo xác nhận thành công.

---

## 4. Output

**Thành công:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ma_phieu_coc": "PDC001",
    "trang_thai": "DaThanhToan",
    "chung_tu_url": "https://...",
    "phuong_thuc_thanh_toan": "ChuyenKhoan"
  }
}
```

---

## 5. Endpoint

| Endpoint | Method | Vai trò |
|---|---|---|
| `PATCH /api/v1/phieu-dat-coc/:id/xac-nhan` | PATCH | Sale |

---

## 6. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| Phiếu cọc không tồn tại | `NOT_FOUND` | 404 |
| Phiếu cọc đã hết hạn 24h | `PHIEU_COC_HET_HAN` | 422 |
| Phiếu cọc đã xác nhận trước đó | `PHIEU_COC_DA_XAC_NHAN` | 409 |
| `trang_thai` không phải `ChoThanhToan` | `TRANG_THAI_KHONG_HOP_LE` | 422 |

---

## 7. Việc cần làm khi code

- [ ] Viết `src/services/phieuDatCoc.service.js` (tái sử dụng file từ UC06):
  - `xacNhanDatCoc(id, { phuong_thuc_thanh_toan, chung_tu_url }, saleId)` — toàn bộ xử lý cập nhật trạng thái cọc và giường/phòng được đặt trong 1 transaction.
- [ ] FE: upload ảnh chứng từ lên Supabase Storage trước khi gọi API xác nhận. Dùng `supabase.storage.from('chung-tu').upload(...)` ở FE, lấy URL rồi gửi vào body.
