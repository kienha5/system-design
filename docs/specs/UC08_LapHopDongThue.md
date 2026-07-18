# UC08 — Lập hợp đồng thuê (LapHopDongThue)

| | |
|---|---|
| Actor | Quản lý |
| Liên quan | UC07 GhiNhanDatCoc (UC trước — phiếu cọc phải `DaThanhToan`), UC09 KiemTraDieuKienCuTru (gọi nội bộ trong luồng), UC10 ThanhToanKyDau (UC tiếp theo) |
| Bảng DB liên quan | `hop_dong`, `thanh_vien_hop_dong`, `phieu_dat_coc`, `phong` |

---

## 1. Mục tiêu

Tạo hợp đồng thuê chính thức sau khi khách đến nhận phòng, kiểm tra điều kiện cư trú, và khách ký xác nhận điều khoản. HĐ được tạo ở trạng thái `HieuLuc` ngay khi khách xác nhận — không có trạng thái trung gian `ChoKy`.

> Tham khảo: Nghiệp vụ 3 "Nhận phòng, ký thỏa thuận thuê và bàn giao phòng", dòng cơ bản bước 1–8 (`17_BaoCao-1.pdf`).

**Điều kiện tiên quyết:** Quản lý đã đăng nhập. Phiếu đặt cọc ở trạng thái `DaThanhToan`. Khách đến nhận phòng theo lịch hẹn.

---

## 2. Input

Body của `POST /api/v1/hop-dong`:

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| phieu_dat_coc_id | uuid | có | |
| ngay_bat_dau | date | có | |
| ngay_ket_thuc | date | không | NULL nếu chưa xác định |
| ky_thanh_toan | string | không | Mặc định `'Thang'` |
| thanh_vien | array | có | `[{ khach_hang_id, giuong_id }]` — với thuê cá nhân, array 1 phần tử; với thuê nhóm, nhiều phần tử |

---

## 3. Business logic

Toàn bộ thực hiện trong **1 Prisma transaction**.

1. **Kiểm tra phiếu đặt cọc:**
   - Tồn tại → `NOT_FOUND` 404 nếu không có.
   - `trang_thai = 'DaThanhToan'` → `PHIEU_COC_CHUA_XAC_NHAN` 422 nếu chưa.
   - Chưa có HĐ nào dùng phiếu này (`hop_dong.phieu_dat_coc_id` UNIQUE) → `PHIEU_COC_DA_CO_HOP_DONG` 409 nếu đã tạo HĐ trước đó.

2. **Đối chiếu giấy tờ tùy thân** (bước 2 dòng cơ bản): Quản lý xem CCCD thực tế, đối chiếu với `khach_hang.so_cmnd_cccd` đã lưu trong hệ thống — thao tác UI, không cần validate riêng ở BE.

3. **Gọi UC09 KiemTraDieuKienCuTru** cho từng thành viên trong `thanh_vien`:
   - **Thuê cá nhân (A3a):** Nếu khách không đạt điều kiện → `DIEU_KIEN_CU_TRU_KHONG_DAT` 422, dừng toàn bộ.
   - **Thuê nhóm (A3b):** Đánh dấu `dat_dieu_kien_cu_tru = false` cho thành viên không đạt. Đếm số thành viên còn lại hợp lệ:
     - Nếu số thành viên hợp lệ ≥ số giường đã cọc → tiếp tục với danh sách đã lọc, trả về `canh_bao: 'CO_THANH_VIEN_BI_LOAI'` trong response.
     - Nếu số thành viên hợp lệ < số giường đã cọc → FE hỏi Quản lý có muốn tiếp tục không (không phải lỗi cứng — xem mục 5). Nếu Quản lý xác nhận dừng → `DIEU_KIEN_CU_TRU_KHONG_DAT` 422.

4. **Snapshot giá tại thời điểm ký:** Lấy `phong.gia_thue_mot_giuong` hiện tại làm `gia_thue_theo_giuong` trong HĐ. Nếu giá khác với `phieu_dat_coc.so_tien_coc / 2 / so_giuong_thue` (tức giá đã thay đổi kể từ lúc cọc) → trả về thêm `canh_bao: 'GIA_THUE_DA_THAY_DOI'` để FE hiển thị cho Quản lý xác nhận với khách trước khi ký (dòng thay thế A5).

5. **Tạo bản ghi `hop_dong`:**
   - `trang_thai = 'HieuLuc'` (tạo ngay khi khách ký — không dùng `ChoKy`)
   - `ngay_ky = now()`
   - `quan_ly_lap_id = req.user.id`
   - `gia_thue_theo_giuong` = snapshot từ bước 4

6. **Tạo các bản ghi `thanh_vien_hop_dong`** cho từng phần tử trong `thanh_vien` (chỉ những người `dat_dieu_kien_cu_tru = true`).

7. **Sau khi tạo HĐ xong:** Quản lý chủ động chuyển sang UC10 (Thanh toán kỳ đầu) — không trigger tự động.

---

## 4. Output

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ma_hop_dong": "HD0001",
    "trang_thai": "HieuLuc",
    "ngay_ky": "2026-07-01T10:00:00Z",
    "gia_thue_theo_giuong": 1500000,
    "thanh_vien": [
      { "khach_hang_id": "uuid", "giuong_id": "uuid", "dat_dieu_kien_cu_tru": true }
    ],
    "canh_bao": "CO_THANH_VIEN_BI_LOAI"
  }
}
```

> Field `canh_bao` chỉ có khi có thành viên bị loại (A3b) hoặc giá đã thay đổi (A5). FE dùng để hiển thị thông báo phù hợp cho Quản lý.

---

## 5. Endpoint

| Endpoint | Method | Mô tả |
|---|---|---|
| `POST /api/v1/hop-dong` | POST | Tạo hợp đồng thuê |
| `GET /api/v1/hop-dong/:id` | GET | Xem chi tiết hợp đồng (dùng ở UC10, UC11...) |

Vai trò: QuanLy.

---

## 6. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| Phiếu cọc không tồn tại | `NOT_FOUND` | 404 |
| Phiếu cọc chưa được Quản lý xác nhận (`trang_thai != 'DaThanhToan'`) | `PHIEU_COC_CHUA_XAC_NHAN` | 422 |
| Phiếu cọc đã được dùng để tạo HĐ trước đó | `PHIEU_COC_DA_CO_HOP_DONG` | 409 |
| Khách cá nhân không đạt điều kiện cư trú | `DIEU_KIEN_CU_TRU_KHONG_DAT` | 422 |
| Toàn bộ thành viên nhóm bị loại hoặc Quản lý xác nhận dừng | `DIEU_KIEN_CU_TRU_KHONG_DAT` | 422 |
| `thanh_vien` rỗng hoặc thiếu `khach_hang_id` / `giuong_id` | `VALIDATION_ERROR` | 400 |
| Số thành viên hợp lệ < số giường đã cọc | (không phải lỗi cứng — FE hỏi xác nhận trước khi gửi request dừng) | — |

> Thêm `PHIEU_COC_CHUA_XAC_NHAN` và `PHIEU_COC_DA_CO_HOP_DONG` vào bảng error code `02_API_SPEC.md`.

---

## 7. Việc cần làm khi code

- [ ] Viết `src/services/hopDong.service.js` hàm `create(input, quanLyId)` — gọi logic UC09 trực tiếp (không qua HTTP), toàn bộ trong 1 Prisma transaction.
- [ ] Logic so sánh giá để phát hiện `GIA_THUE_DA_THAY_DOI`: `phong.gia_thue_mot_giuong` hiện tại so với `phieu_dat_coc.so_tien_coc / 2 / phieu_dat_coc.so_giuong_thue`.
- [ ] FE: form 3 bước — (1) tìm phiếu cọc + hiển thị thông tin, (2) checklist điều kiện cư trú từng thành viên + hiển thị cảnh báo nếu có, (3) xem lại điều khoản HĐ + checkbox xác nhận khách đã ký.

---

## 8. Endpoint bổ sung hỗ trợ tìm kiếm thành viên nhóm

Nhằm phục vụ tìm kiếm bạn cùng phòng (roommates) khi lập hợp đồng nhóm, hệ thống cung cấp endpoint tra cứu trực tiếp bảng khách hàng:

*   **Endpoint:** `GET /api/v1/khach-hang`
*   **Method:** `GET`
*   **Vai trò truy cập:** `Sale`, `QuanLy`
*   **Tham số truy vấn (Query parameters):**
    *   `so_dien_thoai` (string, bắt buộc): Số điện thoại cần tìm kiếm (hỗ trợ tìm kiếm gần đúng, khớp tiền tố - prefix match).

### Giao thức Response mẫu:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-khach-hang",
      "ho_ten": "Phạm Thị Dung",
      "so_dien_thoai": "0934567890",
      "email": "dung@gmail.com",
      "gioi_tinh": "Nu",
      "quoc_tich": "Viet Nam",
      "so_cmnd_cccd": "123456789012"
    }
  ]
}
```
