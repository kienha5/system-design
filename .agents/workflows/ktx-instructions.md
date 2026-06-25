---
description: Hướng dẫn cốt lõi (Agent Instructions) cho dự án Hệ thống Đăng ký Thuê phòng (Ký túc xá). Yêu cầu agent tuân thủ nghiêm ngặt các tài liệu thiết kế (docs/) và ràng buộc hệ thống.
---

# AGENT INSTRUCTIONS — Hệ thống Đăng ký Thuê Phòng (Ký túc xá)

## Vai trò của bạn
Bạn là coding assistant cho đồ án cá nhân môn TKPM. Nhiệm vụ là giúp implement từng UC theo đúng thiết kế đã có trong thư mục `docs/`. Không được suy diễn hay tự ý thêm business logic ngoài tài liệu.

## Tài liệu bắt buộc đọc trước khi làm bất cứ việc gì
Toàn bộ tài liệu nằm trong `docs/`. Đọc theo thứ tự sau khi bắt đầu phiên làm việc mới:

```text
docs/
├── 00_DESIGN_TONG_THE.md      # Tổng quan kiến trúc, stack, kế hoạch, quyết định kỹ thuật
├── 01_DATABASE_SCHEMA.md      # Schema DB đầy đủ, enum, business rule từng bảng
├── 02_API_SPEC.md             # Convention API, error code, danh sách endpoint
└── specs/
    ├── UC01_DangNhap.md
    ├── UC02_TraCuuPhong.md
    ├── UC03_CapNhatTrangThaiPhong.md
    ├── UC04_TiepNhanYeuCauThue.md
    ├── UC05_DatLichXemPhong.md
    ├── UC06_LapPhieuDatCoc.md
    ├── UC07_GhiNhanDatCoc.md
    ├── UC08_LapHopDongThue.md
    ├── UC09_KiemTraDieuKienCuTru.md
    ├── UC10_ThanhToanKyDau.md
    ├── UC11_BanGiaoPhong.md
    ├── UC12_DangKyTraPhong.md
    ├── UC13_DoSoatTaiSan.md
    ├── UC14_KhauTruChiPhi.md
    └── UC15_ThanhLyHopDong.md

```

### Quy tắc đọc tài liệu

* **Khi được yêu cầu implement UC nào** → đọc file spec của UC đó và các UC liên quan được nhắc đến trong phần "Liên quan" / "Được gọi bởi".
* **Khi cần thêm bảng hay field DB** → đọc `01_DATABASE_SCHEMA.md` trước, không tự suy diễn schema.
* **Khi cần thêm endpoint** → đọc `02_API_SPEC.md` để giữ đúng convention response format và error code.
* **Khi có thắc mắc về business rule** → ưu tiên tài liệu trong `docs/`, không tự phán đoán.

## Stack kỹ thuật

| Layer | Công nghệ |
| --- | --- |
| **Frontend** | React (Vite) + Tailwind CSS |
| **Backend** | Node.js + Express |
| **ORM** | Prisma |
| **Database** | PostgreSQL (Supabase hosted) |
| **Auth** | Supabase Auth (JWT) — verify ở BE bằng `jsonwebtoken` + `SUPABASE_JWT_SECRET` |
| **Storage** | Supabase Storage (ảnh chứng từ, biên bản) |

## Cấu trúc thư mục

```text
project-root/
├── frontend/
│   └── src/
│       ├── pages/              # Dashboard theo role
│       ├── features/           # Theo luồng nghiệp vụ
│       ├── components/shared/  # Component dùng chung
│       ├── api/                # Axios wrappers
│       └── lib/supabaseClient.js
├── backend/
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/           # Business logic — 1 file ~ 1 nhóm UC
│       ├── middleware/         # auth.middleware.js, validate.js, errorHandler.js
│       └── validators/         # Zod schemas
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
└── docs/                       # Toàn bộ tài liệu thiết kế

```

## Các quyết định kỹ thuật quan trọng — KHÔNG được thay đổi

1. **Auth**: Supabase Auth chỉ xử lý xác thực. Role (Sale/QuanLy/KeToan) lưu trong bảng `nguoi_dung_he_thong` do app quản lý. Không dùng RLS Supabase. Auth middleware verify JWT offline bằng `jsonwebtoken`.
2. **Lazy expiry 24h**: Không dùng cron job. Khi có request liên quan đến phiếu đặt cọc → gọi `checkAndExpireIfNeeded()` để kiểm tra `han_thanh_toan < now()`. Nếu quá hạn → set `HetHan`, trả giường về `Trong` trong cùng 1 transaction.
3. **Prisma transaction**: Mọi operation ghi nhiều bảng cùng lúc phải dùng `prisma.$transaction()`. Các hàm service nhận tham số `tx?` optional để UC khác có thể gọi trong transaction của mình.
4. **UC03 là service nội bộ**: `updateTrangThaiGiuong()` và `syncTrangThaiPhong()` được các UC khác gọi trực tiếp — không gọi qua HTTP. Luôn ghi audit log vào `lich_su_trang_thai_phong` trong cùng transaction.
5. **Không dùng số âm cho tiền**: `bien_ban_tra_phong` có 2 cột riêng: `so_tien_hoan_khach` và `so_tien_khach_can_tra_them` — cả hai đều >= 0.

## Convention code bắt buộc

### Response format — mọi endpoint phải trả đúng format này:

```javascript
// Thành công
res.json({ success: true, data: { ... } })

// Có pagination
res.json({ success: true, data: [...], meta: { page, pageSize, total } })

// Lỗi
res.status(422).json({
  success: false,
  error: { code: 'PHIEU_COC_HET_HAN', message: '...' }
})

```

* **Error code**: SCREAMING_SNAKE_CASE. Danh sách đầy đủ xem `02_API_SPEC.md` mục 1.7. Nếu cần thêm code mới → đề xuất trước, không tự tiện thêm.
* **Validate input**: Dùng `zod` trong `src/validators/<resource>.validator.js`, gọi trước controller. Không validate trong service.
* **Tên file service**: `src/services/<tenNghiepVu>.service.js`, ví dụ `phieuDatCoc.service.js`. Các UC cùng nhóm nghiệp vụ dùng chung 1 file.
* **Không gọi HTTP nội bộ**: Khi service A cần logic của service B → import và gọi hàm trực tiếp, không dùng `axios` hay `fetch` để gọi lại chính API của mình.

## Cách làm việc theo từng UC

Khi được yêu cầu implement UC nào, thực hiện theo thứ tự:

1. Đọc file spec `docs/specs/UCxx_*.md` của UC đó.
2. Kiểm tra các bảng DB liên quan trong `docs/01_DATABASE_SCHEMA.md` — đảm bảo đúng tên cột, kiểu dữ liệu, enum.
3. Viết theo thứ tự: **validator → service → controller → route**. Không bỏ qua bước nào.
4. Ghi chú rõ trong code khi implement dòng thay thế (A3, A4a, A4b...) từ spec.
5. Báo lại nếu phát hiện mâu thuẫn giữa các file tài liệu — không tự ý chọn một hướng.

## Những việc KHÔNG làm

* Không tự thêm bảng, cột, hoặc endpoint ngoài những gì đã định nghĩa trong `docs/`.
* Không dùng `any` hoặc bỏ qua validate input.
* Không để business logic trong controller — controller chỉ gọi service và trả response.
* Không commit file `.env` hay bất kỳ key/secret nào.
* Không cài thêm thư viện lớn mà không hỏi trước (lodash, moment.js, v.v.) — ưu tiên dùng built-in hoặc những gì đã có trong `package.json`.
* Không tự sửa `prisma/schema.prisma` để thêm bảng/cột mới mà không đối chiếu với `01_DATABASE_SCHEMA.md`.

```