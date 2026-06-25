# UC05 — Đặt lịch xem phòng (DatLichXemPhong)

| | |
|---|---|
| Actor | Nhân viên Sale |
| Liên quan | UC04 TiepNhanYeuCauThue (UC trước), UC06 LapPhieuDatCoc (UC tiếp theo nếu khách quyết định đặt cọc) |
| Bảng DB liên quan | `nhu_cau_thue` |

---

## 1. Mục tiêu

Ghi nhận lịch hẹn xem phòng thực tế cho khách hàng, cập nhật trạng thái yêu cầu thuê, và giả lập gửi thông báo đến khách. Sau buổi hẹn, Sale đánh dấu "đã xem phòng" để chuẩn bị cho luồng đặt cọc (Nghiệp vụ 2).

> UC con "Khảo sát phòng thực tế" trong PDF diễn ra ngoài hệ thống — không tự động hóa. Hệ thống chỉ ghi nhận trước (lịch hẹn) và sau (đã xem) buổi khảo sát.

> Tham khảo: Nghiệp vụ 1, dòng cơ bản bước 4–5 + UC con "Khảo sát phòng thực tế" (`17_BaoCao-1.pdf`).

**Điều kiện tiên quyết:** Bản ghi `nhu_cau_thue` đã tồn tại (UC04 đã chạy). Sale đã đăng nhập.

---

## 2. Input

### 2.1. Đặt lịch — `PATCH /api/v1/nhu-cau-thue/:id/lich-hen`

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| lich_hen_xem | datetime (ISO 8601) | có | Phải là thời điểm trong tương lai |
| phuong_thuc_thong_bao | enum | không | `Email` / `SDT` — nếu không truyền, dùng giá trị đã lưu trong `nhu_cau_thue` |

### 2.2. Xác nhận đã xem — `PATCH /api/v1/nhu-cau-thue/:id/xac-nhan-da-xem`

Không có body — chỉ cần `id` trên URL.

---

## 3. Business logic

### 3.1. Đặt lịch xem phòng

1. Kiểm tra `nhu_cau_thue` tồn tại → không tìm thấy: `NOT_FOUND` 404.
2. Kiểm tra `trang_thai` phải là `MoiTiepNhan` **hoặc** `DaXemPhong` (dòng thay thế A7 trong PDF: khách có thể "hẹn xem thêm phòng" sau khi đã xem lần trước) → không hợp lệ: `TRANG_THAI_KHONG_HOP_LE` 422.
3. Kiểm tra `lich_hen_xem` phải > `now()` → `VALIDATION_ERROR` 400 nếu ở quá khứ.
4. Kiểm tra trùng lịch: query `nhu_cau_thue` xem có record khác đang đặt cùng `phong_du_kien_id` tại khung giờ đó không (trong vòng 1 giờ trước/sau) → `LICH_HEN_BI_TRUNG` 409 (dòng thay thế A2 trong PDF).
5. Cập nhật `nhu_cau_thue`:
   - `lich_hen_xem = lich_hen_xem` (input)
   - `phuong_thuc_thong_bao` (nếu truyền mới)
   - `trang_thai = 'DaDatLichXem'`
6. **Gửi thông báo:** Với đồ án, giả lập bằng cách log ra console: `[NOTIFY] Gửi ${phuong_thuc_thong_bao} đến khách ${khach_hang_id}: lịch hẹn ${lich_hen_xem}`. Không tích hợp email/SMS thật trừ khi còn thời gian.

### 3.2. Xác nhận đã xem phòng (sau buổi hẹn)

1. Kiểm tra `nhu_cau_thue` tồn tại → `NOT_FOUND` 404.
2. Kiểm tra `trang_thai = 'DaDatLichXem'` → không hợp lệ: `TRANG_THAI_KHONG_HOP_LE` 422.
3. Cập nhật `trang_thai = 'DaXemPhong'`.

> Sau bước này, Sale có thể:
> - Tiếp tục sang UC06 nếu khách quyết định đặt cọc.
> - Hoặc quay lại UC05 đặt lịch lần nữa nếu khách muốn xem thêm phòng (A7).
> - Hoặc cập nhật `trang_thai = 'DaHuy'` nếu khách không có nhu cầu nữa (xem endpoint phụ trợ mục 5).

---

## 4. Output

### 4.1. Đặt lịch
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "trang_thai": "DaDatLichXem",
    "lich_hen_xem": "2026-07-01T09:00:00Z",
    "phuong_thuc_thong_bao": "Email"
  }
}
```

### 4.2. Xác nhận đã xem
```json
{
  "success": true,
  "data": { "id": "uuid", "trang_thai": "DaXemPhong" }
}
```

---

## 5. Endpoint

| Endpoint | Method | Mô tả |
|---|---|---|
| `PATCH /api/v1/nhu-cau-thue/:id/lich-hen` | PATCH | Đặt/đổi lịch hẹn xem phòng |
| `PATCH /api/v1/nhu-cau-thue/:id/xac-nhan-da-xem` | PATCH | Đánh dấu đã xem phòng sau buổi hẹn |
| `PATCH /api/v1/nhu-cau-thue/:id/huy` | PATCH | Hủy yêu cầu thuê (khách không có nhu cầu) — cập nhật `trang_thai = 'DaHuy'` |

Vai trò: Sale.

---

## 6. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| `id` không tồn tại | `NOT_FOUND` | 404 |
| `lich_hen_xem` ở quá khứ | `VALIDATION_ERROR` | 400 |
| `trang_thai` không cho phép thực hiện hành động | `TRANG_THAI_KHONG_HOP_LE` | 422 |
| Trùng lịch hẹn cùng phòng trong khung giờ gần nhau | `LICH_HEN_BI_TRUNG` | 409 |

---

## 7. Việc cần làm khi code

- [ ] Bổ sung `TRANG_THAI_KHONG_HOP_LE` và `LICH_HEN_BI_TRUNG` vào bảng error code `02_API_SPEC.md`.
- [ ] Viết `src/services/nhuCauThue.service.js` (tái sử dụng file từ UC04):
  - `datLichXem(id, lichHenXem, phuongThucThongBao)`.
  - `xacNhanDaXem(id)`.
  - `huyYeuCau(id)`.
- [ ] Hàm kiểm tra trùng lịch: query `nhu_cau_thue` cùng `phong_du_kien_id`, `trang_thai = 'DaDatLichXem'`, `lich_hen_xem` trong khoảng `[input - 1h, input + 1h]`.
