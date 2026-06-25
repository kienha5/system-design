# UC09 — Kiểm tra điều kiện cư trú (KiemTraDieuKienCuTru)

| | |
|---|---|
| Actor | Quản lý |
| Được gọi bởi | UC08 LapHopDongThue (gọi hàm nội bộ); endpoint preview gọi từ FE trong form lập HĐ |
| Bảng DB liên quan | `khach_hang`, `phong` |

---

## 1. Mục tiêu

Kiểm tra danh sách khách (1 người hoặc nhóm) có đáp ứng điều kiện lưu trú của phòng hay không (giới tính, giấy tờ, các tiêu chí theo phòng). UC này **chỉ trả kết quả kiểm tra, không ghi dữ liệu** — UC08 sẽ áp dụng dòng thay thế A3a/A3b dựa trên kết quả.

> Tham khảo: Nghiệp vụ 3, UC con "Kiểm tra điều kiện cư trú" (`17_BaoCao-1.pdf`).

---

## 2. Input

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| phong_id | uuid | có | Phòng cần kiểm tra điều kiện |
| danh_sach_khach | array | có | `[{ khach_hang_id, giuong_id }]` — `giuong_id` dùng để phát hiện trùng lặp (xem bước 3) |

---

## 3. Business logic

1. Lấy thông tin `phong` theo `phong_id` → `NOT_FOUND` 404 nếu không có.
2. Lấy toàn bộ thông tin `khach_hang` cho từng `khach_hang_id` trong `danh_sach_khach` (1 query batch).
3. **Kiểm tra trùng giường trong input:** Nếu 2 phần tử trong `danh_sach_khach` có cùng `giuong_id` → `VALIDATION_ERROR` 400 ngay, không xử lý tiếp (2 người không thể ở cùng 1 giường).
4. Với mỗi khách, áp dụng tuần tự các rule sau:

   | Rule | Điều kiện | Lý do trả về khi không đạt |
   |---|---|---|
   | Giới tính | `phong.gioi_tinh_quy_dinh IS NULL` hoặc `khach.gioi_tinh = phong.gioi_tinh_quy_dinh` | `"Không khớp giới tính quy định của phòng"` |
   | Giấy tờ | `khach.so_cmnd_cccd IS NOT NULL AND so_cmnd_cccd != ''` | `"Thiếu thông tin CMND/CCCD"` |
   | *(Placeholder)* Quốc tịch | Chưa có rule cụ thể trong PDF — bỏ qua, để mở rộng sau | — |

5. Tổng hợp kết quả: mỗi khách có `dat: true/false` kèm `ly_do` nếu `false`. Tính `tat_ca_dat = danh_sach_khach.every(k => k.dat)`.
6. **Không throw error khi có khách không đạt** — trả `success: true` với `tat_ca_dat: false`. UC08 mới là nơi quyết định dừng hay tiếp tục.

---

## 4. Output

```json
{
  "success": true,
  "data": {
    "tat_ca_dat": false,
    "chi_tiet": [
      { "khach_hang_id": "uuid", "giuong_id": "uuid", "dat": true },
      { "khach_hang_id": "uuid", "giuong_id": "uuid", "dat": false, "ly_do": "Thiếu thông tin CMND/CCCD" }
    ]
  }
}
```

---

## 5. Endpoint

UC09 có 2 cách dùng:

**Cách 1 — Nội bộ (primary):** Hàm `kiemTraDieuKienCuTru(phongId, danhSachKhach)` trong `src/services/dieuKienCuTru.service.js`, được UC08 gọi trực tiếp trong transaction.

**Cách 2 — Endpoint preview (FE gọi riêng):** FE dùng để hiển thị checklist real-time khi Quản lý nhập danh sách thành viên *trước khi* submit toàn bộ form HĐ.

```
POST /api/v1/phieu-dat-coc/:id/kiem-tra-dieu-kien
```

Body: `{ danh_sach_khach: [{ khach_hang_id, giuong_id }] }`.

> Dùng `phieu_dat_coc_id` trên URL (không phải `hop_dong_id`) vì tại thời điểm này HĐ chưa tồn tại. BE lấy `phong_id` từ `phieu_dat_coc.phong_id`.

Vai trò: QuanLy.

---

## 6. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| `phong_id` không tồn tại | `NOT_FOUND` | 404 |
| `danh_sach_khach` rỗng | `VALIDATION_ERROR` | 400 |
| Có 2 phần tử trong `danh_sach_khach` trùng `giuong_id` | `VALIDATION_ERROR` | 400 |
| `khach_hang_id` không tồn tại trong DB | `NOT_FOUND` | 404 |

---

## 7. Việc cần làm khi code

- [ ] Tạo `src/services/dieuKienCuTru.service.js` — hàm `kiemTra(phongId, danhSachKhach)` thuần logic, không side effect, dễ unit test.
- [ ] Viết route `POST /api/v1/phieu-dat-coc/:id/kiem-tra-dieu-kien` gọi service trên (lấy `phong_id` từ phiếu cọc trước).
- [ ] UC08 import và gọi trực tiếp hàm service này — không gọi qua HTTP nội bộ.
