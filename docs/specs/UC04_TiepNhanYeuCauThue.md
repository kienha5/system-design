# UC04 — Tiếp nhận yêu cầu thuê (TiepNhanYeuCauThue)

| | |
|---|---|
| Actor | Nhân viên Sale |
| Liên quan | UC02 TraCuuPhong (FE gọi riêng để gợi ý phòng), UC05 DatLichXemPhong (UC tiếp theo) |
| Bảng DB liên quan | `khach_hang`, `nhu_cau_thue` |

---

## 1. Mục tiêu

Ghi nhận nhu cầu thuê ban đầu của khách hàng khi liên hệ ký túc xá, làm cơ sở để Sale tìm phòng phù hợp và đặt lịch xem phòng.

> Tham khảo đặc tả gốc: Nghiệp vụ 1 "Đăng ký tư vấn & xem phòng", dòng cơ bản bước 1–4 (`17_BaoCao-1.pdf`).

**Điều kiện tiên quyết:** Sale đã đăng nhập (UC01).

---

## 2. Input

Body của `POST /api/v1/nhu-cau-thue`:

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| khach_hang | object | có | `{ ho_ten, so_dien_thoai, email?, gioi_tinh?, quoc_tich?, so_cmnd_cccd? }` |
| so_nguoi | int | có | > 0 |
| gioi_tinh_yeu_cau | enum | không | `Nam` / `Nu` / `Khac` |
| khu_vuc_yeu_cau | string | không | |
| loai_phong_yeu_cau | enum | không | `Don` / `Ghep` / `NguyenPhong` |
| muc_gia_toi_da | number | không | theo `gia_thue_mot_giuong` |
| thoi_gian_vao_o_du_kien | date | không | |
| thoi_han_thue_du_kien | int | không | số tháng |
| ghi_chu_yeu_cau | string | không | tiêu chí tự do: giờ giấc, điều hòa, gửi xe... |
| phuong_thuc_thong_bao | enum | có | `Email` / `SDT` |

---

## 3. Business logic

1. **Xử lý khách hàng — upsert theo `so_dien_thoai`:**
   - Tìm `khach_hang` theo `so_dien_thoai`.
   - Nếu **chưa có** → tạo mới bản ghi `khach_hang`.
   - Nếu **đã có** → **dùng lại bản ghi cũ, không cập nhật thông tin**. FE hiển thị thông tin khách đã có để Sale xác nhận đúng người trước khi tiếp tục. Lý do: tránh ghi đè thông tin khách khác nếu số điện thoại bị nhập nhầm.

2. Tạo bản ghi `nhu_cau_thue` với:
   - `khach_hang_id` = id khách vừa tìm/tạo
   - `sale_id = req.user.id`
   - `trang_thai = 'MoiTiepNhan'`
   - `phong_du_kien_id = NULL` (chưa chọn phòng)
   - Các trường yêu cầu còn lại từ body.

3. **Gợi ý phòng (FE — không phải BE):** Sau khi tạo xong `nhu_cau_thue`, FE tự gọi `GET /phong` với filter từ các trường yêu cầu để hiển thị danh sách phòng gợi ý (theo dòng cơ bản bước 3). Backend không nhúng kết quả này vào response của `POST /nhu-cau-thue`.

4. Sale chọn 1 phòng dự kiến từ danh sách gợi ý → FE gọi `PATCH /nhu-cau-thue/:id/phong-du-kien` để cập nhật `phong_du_kien_id` (endpoint phụ trợ — xem mục 5).

5. **Dòng thay thế A3:** Nếu không có phòng phù hợp → `GET /phong` trả `data: []` — FE hiển thị thông báo và cho Sale điều chỉnh lại tiêu chí (không phải lỗi, không cần xử lý ở BE).

---

## 4. Output

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "khach_hang_id": "uuid",
    "khach_hang_da_ton_tai": true,
    "trang_thai": "MoiTiepNhan"
  }
}
```

> Field `khach_hang_da_ton_tai`: `true` nếu dùng lại bản ghi cũ → FE dùng để hiển thị thông báo "Đã tìm thấy khách hàng với SĐT này, vui lòng xác nhận đúng người".

---

## 5. Endpoint

| Endpoint | Method | Mô tả |
|---|---|---|
| `POST /api/v1/nhu-cau-thue` | POST | Tạo yêu cầu thuê mới |
| `PATCH /api/v1/nhu-cau-thue/:id/phong-du-kien` | PATCH | Cập nhật phòng dự kiến sau khi Sale chọn từ danh sách gợi ý |

Body của `PATCH .../phong-du-kien`: `{ phong_du_kien_id: "uuid" }`.

Vai trò: Sale.

---

## 6. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| Thiếu `so_dien_thoai` hoặc `ho_ten` | `VALIDATION_ERROR` | 400 |
| `so_nguoi` <= 0 | `VALIDATION_ERROR` | 400 |
| `phuong_thuc_thong_bao` không hợp lệ | `VALIDATION_ERROR` | 400 |
| `phong_du_kien_id` không tồn tại (khi PATCH) | `NOT_FOUND` | 404 |

---

## 7. Lưu ý UI (không phải lỗi backend)

- **A3 (không có phòng phù hợp):** FE hiển thị "Không tìm thấy phòng phù hợp, vui lòng điều chỉnh tiêu chí" và cho phép Sale sửa lại filter rồi gọi `GET /phong` lại — không cần tạo lại `nhu_cau_thue`.
- **A6 (thuê nhóm):** Nếu `so_nguoi > 1`, FE gợi ý Sale hỏi thêm khách về 2 hình thức "thuê nguyên phòng" hoặc "ở ghép" trước khi chốt `loai_phong_yeu_cau`.

---

## 8. Việc cần làm khi code

- [ ] Viết `src/services/nhuCauThue.service.js`:
  - `create(input, saleId)` — upsert khách hàng + tạo yêu cầu thuê.
  - `updatePhongDuKien(id, phongDuKienId)` — cập nhật phòng dự kiến.
- [ ] Validate `so_dien_thoai` bằng regex số điện thoại VN trong `src/validators/nhuCauThue.validator.js`.
