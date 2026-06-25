# UC02 — Tra cứu phòng/giường (TraCuuPhong)

| | |
|---|---|
| Actor | Sale, Quản lý, Kế toán (tất cả vai trò) |
| Liên quan | UC04 TiepNhanYeuCauThue, UC06 LapPhieuDatCoc, UC03 CapNhatTrangThaiPhong |
| Bảng DB liên quan | `phong`, `giuong`, `chi_nhanh` |

---

## 1. Mục tiêu

Tìm kiếm, lọc danh sách phòng/giường theo tiêu chí khách yêu cầu (khu vực, loại, giá, trạng thái). UC này là component dùng chung, được nhúng vào nhiều luồng khác nhau với 2 cấp độ:

- **Cấp phòng** (`GET /phong`): Sale/Quản lý xem tổng quan phòng, số giường còn trống — dùng ở UC04 khi tiếp nhận yêu cầu thuê.
- **Cấp giường** (`GET /giuong?phong_id=:id`): Sale chọn giường cụ thể để gắn vào phiếu đặt cọc — dùng ở UC06. Xem mục 3.2.

**Điều kiện tiên quyết:** Người dùng đã đăng nhập (UC01).

---

## 2. Input

### 2.1. `GET /api/v1/phong` — query params

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| chi_nhanh_id | uuid | không | lọc theo chi nhánh |
| khu_vuc | string | không | lọc theo khu vực |
| loai_phong | enum | không | `Don` / `Ghep` / `NguyenPhong` |
| gia_tu | number | không | giá từ (theo `gia_thue_mot_giuong`) |
| gia_den | number | không | giá đến |
| gioi_tinh_quy_dinh | enum | không | `Nam` / `Nu` / `Khac` |
| trang_thai | enum | không | `Trong` / `ChoDatCoc` / `DaDatCoc` / `DangThue` / `BaoTri`. **Mặc định nếu không truyền: chỉ trả `Trong`** (phù hợp mục đích tìm phòng để thuê). Quản lý muốn xem toàn bộ thì truyền từng giá trị cụ thể. |
| page | int | không | mặc định 1 |
| pageSize | int | không | mặc định 20 |

### 2.2. `GET /api/v1/giuong` — query params

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| phong_id | uuid | **có** | bắt buộc — chỉ lấy giường thuộc 1 phòng cụ thể |
| trang_thai | enum | không | `Trong` / `ChoDatCoc` / `DaDatCoc` / `DangThue`. Mặc định nếu không truyền: chỉ trả `Trong`. |

---

## 3. Business logic

### 3.1. Tra cứu phòng

1. Query bảng `phong` join `chi_nhanh`, áp dụng các điều kiện filter từ query params.
2. Với mỗi phòng, đếm thêm `so_giuong_trong` = số bản ghi trong `giuong` có `phong_id` tương ứng và `trang_thai = 'Trong'` (subquery hoặc aggregate trong cùng query).
3. Nếu không truyền `trang_thai`, tự động thêm điều kiện `phong.trang_thai = 'Trong'`.
4. Sắp xếp mặc định theo `gia_thue_mot_giuong` tăng dần.
5. Áp dụng pagination, trả `meta.total`.

### 3.2. Tra cứu giường (dùng cho UC06)

1. Query bảng `giuong` với điều kiện `phong_id = :phong_id`.
2. Nếu không truyền `trang_thai`, tự động thêm điều kiện `trang_thai = 'Trong'`.
3. Không cần pagination (số giường trong 1 phòng nhỏ — trả tất cả).

> UC06 `LapPhieuDatCoc` dùng luồng: Sale chọn phòng từ `GET /phong` → chọn giường cụ thể từ `GET /giuong?phong_id=:id&trang_thai=Trong` → gắn `giuong_id` vào body khi tạo phiếu cọc.

---

## 4. Output

### 4.1. `GET /api/v1/phong`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ma_phong": "P101",
      "loai_phong": "Ghep",
      "suc_chua_toi_da": 4,
      "so_giuong_trong": 2,
      "gia_thue_mot_giuong": 1500000,
      "khu_vuc": "Q1",
      "gioi_tinh_quy_dinh": "Nu",
      "trang_thai": "Trong",
      "chi_nhanh": { "id": "uuid", "ten_chi_nhanh": "CN Quận 1" }
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 12 }
}
```

### 4.2. `GET /api/v1/giuong`
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "ma_giuong": "G101-A", "trang_thai": "Trong" },
    { "id": "uuid", "ma_giuong": "G101-B", "trang_thai": "Trong" }
  ]
}
```
Không có `meta` (không pagination).

---

## 5. Endpoint

| Endpoint | Method | Vai trò |
|---|---|---|
| `GET /api/v1/phong` | GET | Tất cả |
| `GET /api/v1/giuong` | GET | Tất cả |

---

## 6. Error case

| Tình huống | Code | HTTP |
|---|---|---|
| `phong_id` không truyền khi gọi `GET /giuong` | `VALIDATION_ERROR` | 400 |
| `gia_tu` hoặc `gia_den` không phải số | `VALIDATION_ERROR` | 400 |
| `gia_tu > gia_den` | `VALIDATION_ERROR` | 400 |
| `trang_thai` không thuộc enum hợp lệ | `VALIDATION_ERROR` | 400 |
| Không tìm thấy kết quả nào | (không phải lỗi) — trả `data: []`, `meta.total: 0` | 200 |

---

## 7. Việc cần làm khi code

- [ ] Backend: viết `src/services/phong.service.js` — hàm `searchPhong(filters, pagination)` và `searchGiuong(phongId, trangThai)`.
- [ ] Backend: viết validator `src/validators/phong.validator.js` — zod schema cho cả 2 endpoint.
- [ ] Frontend: component `<TraCuuPhong />` dùng chung với 2 mode:
  - `mode="browse"`: hiển thị danh sách tự do (dùng ở Dashboard).
  - `mode="select" onSelectPhong={fn} onSelectGiuong={fn}`: khi chọn phòng thì tự động load danh sách giường còn trống trong phòng đó, sau đó cho chọn giường cụ thể — dùng ở UC06 form lập phiếu cọc.
