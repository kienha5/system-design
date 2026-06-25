# UC06 — Lập phiếu đặt cọc (LapPhieuDatCoc)

| | |
|---|---|
| Actor | Nhân viên Sale |
| Liên quan | UC02 TraCuuPhong (lấy `giuong_id` trước khi lập phiếu), UC03 CapNhatTrangThaiPhong (gọi nội bộ), UC07 GhiNhanDatCoc (UC tiếp theo) |
| Bảng DB liên quan | `phieu_dat_coc`, `phong`, `giuong`, `khach_hang` |

---

## 1. Mục tiêu

Tính tiền cọc, tạo phiếu đặt cọc và khóa tạm giường/phòng trong thời hạn thanh toán 24h.

> Tham khảo: Nghiệp vụ 2, UC con "Rà soát thông tin & điều kiện thuê" + "Kiểm tra tình trạng phòng/giường" + "Nộp tiền đặt cọc" (`17_BaoCao-1.pdf`).

**Điều kiện tiên quyết:** Sale đã đăng nhập. Khách hàng đã xác nhận muốn đặt cọc sau khi xem phòng (UC04/05 đã hoàn thành).

---

## 2. Input

Body của `POST /api/v1/phieu-dat-coc`:

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| nhu_cau_thue_id | uuid | không | Nếu có, liên kết lịch sử với yêu cầu thuê ban đầu |
| khach_hang_id | uuid | có | |
| phong_id | uuid | có | |
| giuong_id | uuid | có nếu không phải NguyenPhong | NULL nếu đặt cọc nguyên phòng (`loai_phong = 'NguyenPhong'`) |
| so_giuong_thue | int | có | Với `NguyenPhong` = `suc_chua_toi_da` của phòng; với thuê giường = 1 |
| chi_nhanh_id | uuid | có | |

> **Luồng FE trước khi gọi endpoint này:** Sale dùng component `<TraCuuPhong mode="select">` (UC02) để chọn phòng → chọn giường cụ thể từ `GET /giuong?phong_id=:id&trang_thai=Trong` → lấy `giuong_id` điền vào form lập phiếu cọc.

---

## 3. Business logic

Toàn bộ các bước dưới đây thực hiện trong **1 Prisma transaction**.

1. **Kiểm tra khách hàng tồn tại:** Query `khach_hang` theo `id` → `NOT_FOUND` 404 nếu không có.

2. **Kiểm tra điều kiện cho thuê sơ bộ:** Nếu `phong.gioi_tinh_quy_dinh` khác NULL, so sánh với `khach_hang.gioi_tinh`. Nếu không khớp → `PHONG_KHONG_PHU_HOP_GIOI_TINH` 422. (Đây là kiểm tra sơ bộ của Sale — khác với kiểm tra điều kiện cư trú đầy đủ ở UC09 do Quản lý thực hiện khi nhận phòng.)

3. **Kiểm tra tình trạng giường/phòng** (lazy expiry trước):
   - Gọi `checkAndExpireIfNeeded` cho bất kỳ phiếu cọc nào đang `ChoThanhToan` liên quan đến `giuong_id` / `phong_id` này (dọn dẹp trước khi kiểm tra).
   - Kiểm tra `giuong.trang_thai = 'Trong'` (nếu đặt theo giường) hoặc tất cả giường của phòng đều `Trong` (nếu `NguyenPhong`).
   - Không phù hợp → `GIUONG_KHONG_CON_TRONG` 409 hoặc `PHONG_KHONG_CON_TRONG` 409 tùy case.

4. **Tính tiền cọc** theo công thức từ PDF:
   ```
   so_tien_coc = phong.gia_thue_mot_giuong × 2 × so_giuong_thue
   ```
   Với `NguyenPhong`: `so_giuong_thue = phong.suc_chua_toi_da`.

5. **Tạo bản ghi `phieu_dat_coc`:**
   - `sale_id = req.user.id`
   - `ngay_dat_coc = now()`
   - `han_thanh_toan = now() + interval '24 hours'`
   - `so_tien_coc` = kết quả bước 4
   - `trang_thai = 'ChoThanhToan'`
   - `nguoi_xac_nhan_id = NULL` (điền sau ở UC07)

6. **Cập nhật trạng thái giường/phòng sang `ChoDatCoc`:** Gọi `updateTrangThaiGiuong` (UC03) trong cùng transaction → `syncTrangThaiPhong` tự chạy theo.

7. Trả về thông tin phiếu cọc. FE tự tính đồng hồ đếm ngược từ `han_thanh_toan`.

---

## 4. Cơ chế hết hạn 24h (Dòng thay thế A4)

Dùng **lazy expiry** — không dùng cron job (quyết định đã ghi trong `00_DESIGN_TONG_THE.md`):

```js
async function checkAndExpireIfNeeded(phieuCocId, tx) {
  const phieu = await (tx ?? prisma).phieuDatCoc.findUnique({ where: { id: phieuCocId } });
  if (phieu.trang_thai === 'ChoThanhToan' && new Date() > phieu.han_thanh_toan) {
    await (tx ?? prisma).phieuDatCoc.update({
      where: { id: phieuCocId },
      data: { trang_thai: 'HetHan' }
    });
    // Gọi updateTrangThaiGiuong → 'Trong' + syncTrangThaiPhong trong cùng tx
    await updateTrangThaiGiuong(phieu.giuong_id, 'Trong', 'Hết hạn 24h', SYSTEM_USER_ID, tx);
    return true; // đã hết hạn
  }
  return false;
}
```

Hàm này được gọi ở đầu UC07 `nopChungTu` và `xacNhan`, và ở bước 3 của UC06 khi kiểm tra giường.

---

## 5. Output

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ma_phieu_coc": "PC0001",
    "khach_hang_id": "uuid",
    "phong_id": "uuid",
    "giuong_id": "uuid",
    "so_tien_coc": 6000000,
    "han_thanh_toan": "2026-06-25T10:00:00Z",
    "trang_thai": "ChoThanhToan"
  }
}
```

---

## 6. Endpoint

```
POST /api/v1/phieu-dat-coc
```
Vai trò: Sale.

---

## 7. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| `khach_hang_id` không tồn tại | `NOT_FOUND` | 404 |
| `phong_id` không tồn tại | `NOT_FOUND` | 404 |
| Giới tính khách không khớp quy định phòng | `PHONG_KHONG_PHU_HOP_GIOI_TINH` | 422 |
| Giường không còn `Trong` (đặt theo giường) | `GIUONG_KHONG_CON_TRONG` | 409 |
| Phòng không còn toàn bộ giường `Trong` (đặt NguyenPhong) | `PHONG_KHONG_CON_TRONG` | 409 |
| `so_giuong_thue` <= 0 hoặc > số giường thực tế của phòng | `VALIDATION_ERROR` | 400 |
| Thiếu `giuong_id` khi phòng không phải NguyenPhong | `VALIDATION_ERROR` | 400 |

> Thêm `PHONG_KHONG_PHU_HOP_GIOI_TINH` vào bảng error code `02_API_SPEC.md`.

---

## 8. Việc cần làm khi code

- [ ] Viết `src/services/phieuDatCoc.service.js`:
  - `create(input, saleId)` — toàn bộ trong 1 Prisma transaction.
  - `checkAndExpireIfNeeded(phieuCocId, tx?)` — dùng chung cho UC06 và UC07.
- [ ] Tái sử dụng `updateTrangThaiGiuong` và `syncTrangThaiPhong` từ UC03 service — gọi trực tiếp, không qua HTTP.
- [ ] Định nghĩa `SYSTEM_USER_ID` (một UUID hằng số) để ghi audit log khi hệ thống tự động đổi trạng thái (lazy expiry), không phải do user thủ công.
