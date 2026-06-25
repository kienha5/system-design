# UC15 — Thanh lý hợp đồng thuê (ThanhLyHopDong)

| | |
|---|---|
| Actor | Quản lý |
| Liên quan | UC14 KhauTruChiPhi (UC trước — khách phải xác nhận đối soát), UC03 CapNhatTrangThaiPhong (gọi nội bộ), kết thúc Nghiệp vụ 4 |
| Bảng DB liên quan | `hop_dong`, `bien_ban_tra_phong`, `thanh_vien_hop_dong`, `giuong`, `phong` |

---

## 1. Mục tiêu

Hoàn tất nghĩa vụ tài chính, đóng hợp đồng, và trả phòng/giường về trạng thái `Trong` để tiếp nhận khách mới.

> Tham khảo: Nghiệp vụ 4, UC con "Thanh lý hợp đồng thuê" (`17_BaoCao-1.pdf`).

**Điều kiện tiên quyết:** Quản lý đã đăng nhập. `bien_ban_tra_phong.khach_xac_nhan_doi_soat = true` (UC14 hoàn thành). Nghĩa vụ tài chính đã hoàn tất.

---

## 2. Input

Body của `PATCH /api/v1/hop-dong/:id/thanh-ly`:

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| tai_chinh_da_hoan_tat | boolean | có | Quản lý xác nhận đã hoàn tất nghĩa vụ tài chính: nếu `so_tien_hoan_khach > 0` thì đã hoàn cọc cho khách; nếu `so_tien_khach_can_tra_them > 0` thì đã thu đủ tiền từ khách. Đây là xác nhận thủ công — không tạo `hoa_don` riêng cho khoản này. |

> `bien_ban_tra_phong_id` không cần truyền — BE tự query qua `hop_dong_id` (quan hệ 1-1 UNIQUE).

---

## 3. Business logic

Toàn bộ thực hiện trong **1 Prisma transaction**.

1. Kiểm tra `hop_dong` tồn tại và `trang_thai = 'HieuLuc'` → `HOP_DONG_DA_THANH_LY` 409 nếu đã thanh lý; `HOP_DONG_KHONG_HOP_LE` 422 nếu trạng thái khác.
2. Query `bien_ban_tra_phong` theo `hop_dong_id` → `NOT_FOUND` 404 nếu không có (UC12/13/14 chưa chạy).
3. Kiểm tra `bien_ban_tra_phong.khach_xac_nhan_doi_soat = true` → `KHACH_CHUA_XAC_NHAN_DOI_SOAT` 422 nếu chưa.
4. Kiểm tra nghĩa vụ tài chính: nếu `so_tien_khach_can_tra_them > 0` hoặc `so_tien_hoan_khach > 0` và `tai_chinh_da_hoan_tat = false` → `CHUA_HOAN_TAT_NGHIA_VU_TAI_CHINH` 422.
5. Cập nhật trong transaction:
   - `bien_ban_tra_phong.trang_thai = 'DaThanhLy'`
   - `bien_ban_tra_phong.quan_ly_xac_nhan_id = req.user.id`
   - `hop_dong.trang_thai = 'DaThanhLy'`
6. Gọi `updateTrangThaiGiuong(giuong_id, 'Trong', 'Thanh lý hợp đồng', req.user.id, tx)` cho **từng giường** trong `thanh_vien_hop_dong WHERE hop_dong_id = :id AND dat_dieu_kien_cu_tru = true` (trong cùng transaction).
7. `syncTrangThaiPhong(phong_id, tx)` tự chạy theo mỗi lần cập nhật giường.

---

## 4. Output

```json
{
  "success": true,
  "data": {
    "hop_dong_id": "uuid",
    "trang_thai_hop_dong": "DaThanhLy",
    "trang_thai_bien_ban": "DaThanhLy"
  }
}
```

---

## 5. Endpoint

| Endpoint | Method | Vai trò |
|---|---|---|
| `PATCH /api/v1/hop-dong/:id/thanh-ly` | PATCH | QuanLy |

---

## 6. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| HĐ không tồn tại | `NOT_FOUND` | 404 |
| HĐ đã `DaThanhLy` trước đó | `HOP_DONG_DA_THANH_LY` | 409 |
| HĐ không phải `HieuLuc` (trạng thái khác) | `HOP_DONG_KHONG_HOP_LE` | 422 |
| Không tìm thấy `bien_ban_tra_phong` (UC12–14 chưa chạy) | `NOT_FOUND` | 404 |
| Khách chưa xác nhận kết quả đối soát | `KHACH_CHUA_XAC_NHAN_DOI_SOAT` | 422 |
| Còn nghĩa vụ tài chính chưa hoàn tất | `CHUA_HOAN_TAT_NGHIA_VU_TAI_CHINH` | 422 |

> Thêm `HOP_DONG_DA_THANH_LY` và `KHACH_CHUA_XAC_NHAN_DOI_SOAT` vào bảng error code `02_API_SPEC.md`.

---

## 7. Việc cần làm khi code

- [ ] Viết `src/services/hopDong.service.js` hàm `thanhLy(hopDongId, taiChinhDaHoanTat, quanLyId)` — toàn bộ trong 1 Prisma transaction.
- [ ] Tái sử dụng `updateTrangThaiGiuong` và `syncTrangThaiPhong` từ UC03 service, truyền `tx` để chạy trong cùng transaction.
- [ ] FE: hiển thị checklist hoàn tất trước khi Quản lý submit:
  - ☑ Khách đã ký biên bản trả phòng.
  - ☑ Đã thu hồi chìa khóa/thẻ từ (xác nhận thủ công qua `tai_chinh_da_hoan_tat`).
  - ☑ Đã hoàn cọc / đã thu đủ tiền phát sinh.
