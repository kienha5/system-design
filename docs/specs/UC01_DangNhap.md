# UC01 — Đăng nhập (DangNhap)

| | |
|---|---|
| Actor | Sale, Quản lý, Kế toán |
| Liên quan | Tất cả UC khác (điều kiện tiên quyết — mọi UC đều yêu cầu auth) |
| Bảng DB liên quan | `nguoi_dung_he_thong` (`01_DATABASE_SCHEMA.md` §4.5) |

---

## 1. Mục tiêu

Xác thực người dùng nội bộ (Sale / Quản lý / Kế toán — không phải khách hàng) và xác định vai trò để phân quyền cho tất cả UC tiếp theo. Backend không có endpoint login riêng — chỉ expose `GET /me` và middleware verify token dùng chung cho mọi route.

**Điều kiện tiên quyết:** Tài khoản đã được admin tạo sẵn trong Supabase Auth **và** có bản ghi tương ứng trong bảng `nguoi_dung_he_thong` với `vai_tro` hợp lệ.

---

## 2. Input

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| email | string | có | validate format email ở FE trước khi gọi SDK |
| password | string | có | tối thiểu 6 ký tự (Supabase mặc định) |

---

## 3. Business logic

### 3.1. Luồng login (FE)

1. FE gọi `supabase.auth.signInWithPassword({ email, password })` trực tiếp — không qua backend.
2. Supabase trả về `{ session: { access_token, refresh_token }, user: { id } }`.
3. **Lưu session:** để Supabase JS SDK tự quản lý session (`supabase.auth.getSession()` / `onAuthStateChange`). Không tự lưu `access_token` vào state hay localStorage thủ công — SDK đã xử lý persistence.
4. FE gọi `GET /api/v1/me` (kèm `Authorization: Bearer <access_token>`) để lấy `vai_tro` và `chi_nhanh_id` từ backend.
5. FE chuyển hướng vào Dashboard tương ứng với `vai_tro` trả về.

### 3.2. Middleware `auth.middleware.js` (BE — dùng chung mọi route)

1. Lấy token từ header `Authorization: Bearer <token>`.
2. Verify JWT bằng **`jsonwebtoken` + `SUPABASE_JWT_SECRET`** (verify offline, không tốn network roundtrip mỗi request). Secret lấy từ Supabase Dashboard → Project Settings → API → JWT Secret, lưu trong `.env` của backend.
3. Lấy `sub` (= `user.id`) từ payload đã verify.
4. Query bảng `nguoi_dung_he_thong` theo `id = sub`:
   - Không tìm thấy → trả `FORBIDDEN` 403 (tài khoản Supabase hợp lệ nhưng chưa được cấp quyền trong hệ thống).
   - Tìm thấy → gắn `req.user = { id, vai_tro, chi_nhanh_id }`.
5. Gọi `next()`.

> **Lưu ý security:** `SUPABASE_JWT_SECRET` chỉ được dùng ở backend (`service_role` key và JWT secret đều **không được** expose ra FE hay commit lên repo — dùng `.env` + `.gitignore`).

### 3.3. Endpoint `GET /api/v1/me`

Được bảo vệ bởi `auth.middleware`. Trả thông tin người dùng hiện tại để FE biết vai trò ngay sau login.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ho_ten": "Nguyễn Văn A",
    "vai_tro": "Sale",
    "chi_nhanh_id": "uuid"
  }
}
```

---

## 4. Error case

| Tình huống | Nơi xử lý | Code | HTTP |
|---|---|---|---|
| Sai email hoặc password | Supabase Auth (FE nhận và hiển thị lỗi từ SDK) | — | 400 (từ Supabase) |
| Tài khoản bị khóa tạm thời (>5 lần sai) | Supabase Auth (tự xử lý) | — | 429 (từ Supabase) |
| Token không hợp lệ hoặc hết hạn | BE middleware | `UNAUTHORIZED` | 401 |
| Token hợp lệ nhưng không có bản ghi trong `nguoi_dung_he_thong` | BE middleware | `FORBIDDEN` | 403 |

> Dòng thay thế A5b trong PDF (khóa tài khoản sau 5 lần sai) do Supabase Auth tự xử lý — không cần implement thủ công.

---

## 5. Việc cần làm khi code

- [ ] Tạo Supabase project, bật Auth (email/password provider).
- [ ] Copy `SUPABASE_JWT_SECRET` vào `.env` backend (không commit).
- [ ] Viết `src/middleware/auth.middleware.js` dùng `jsonwebtoken`.
- [ ] Viết `GET /api/v1/me` trong `src/routes/auth.routes.js`.
- [ ] Seed 3 tài khoản mẫu (1 Sale, 1 QuanLy, 1 KeToan) trong cả Supabase Auth lẫn bảng `nguoi_dung_he_thong`.
