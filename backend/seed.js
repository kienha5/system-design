import { createClient } from '@supabase/supabase-js'
import sql from './src/db.js'
import dotenv from 'dotenv'
dotenv.config()

/**
 * QUY ĐỊNH TỶ LỆ HOÀN CỌC TỰ ĐỘNG (CSC12004) - UC14:
 * 1. Đã đặt cọc nhưng chưa ký HĐ (không đạt điều kiện hoặc khách hủy): Hoàn 80%
 * 2. Đã ký HĐ, chưa hết hạn, lưu trú dưới 6 tháng: Hoàn 50%
 * 3. Đã ký HĐ, chưa hết hạn, lưu trú trên 6 tháng: Hoàn 70%
 * 4. Hết hạn thuê theo HĐ (ngay_tra >= ngay_ket_thuc): Hoàn 100%
 */


let supabaseUrl = process.env.SUPABASE_URL
if (supabaseUrl && supabaseUrl.endsWith('/rest/v1')) {
  supabaseUrl = supabaseUrl.replace('/rest/v1', '')
}
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Lỗi: SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY chưa được định nghĩa trong file .env')
  console.error('Hãy tạo file backend/.env từ backend/.env.example và điền thông tin dự án Supabase của bạn.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('=== BẮT ĐẦU SEED DỮ LIỆU THỰC TẾ (UC01 - UC15) ===')

  try {
    // 1. Dọn dẹp tài khoản cũ trong Supabase Auth để tránh lỗi trùng tài khoản
    console.log('1. Đang dọn dẹp tài khoản trên Supabase Auth...')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      perPage: 100
    })
    
    if (listError) throw listError

    const testEmails = ['sale@dorm.com', 'quanly@dorm.com', 'ketoan@dorm.com']
    for (const u of users || []) {
      if (testEmails.includes(u.email)) {
        const { error: delError } = await supabase.auth.admin.deleteUser(u.id)
        if (delError) {
          console.error(`Không thể xóa auth user ${u.email}:`, delError.message)
        } else {
          console.log(`Đã xóa auth user: ${u.email}`)
        }
      }
    }

    // 2. Xóa sạch dữ liệu cũ trong database theo đúng thứ tự ràng buộc khóa ngoại (Foreign Key Constraints)
    console.log('2. Đang dọn dẹp dữ liệu cũ trong database...')
    await sql`DELETE FROM lich_su_trang_thai_phong`
    await sql`DELETE FROM bien_ban_tra_phong`
    await sql`DELETE FROM bien_ban_ban_giao`
    await sql`DELETE FROM tai_san_phong`
    await sql`DELETE FROM hoa_don`
    await sql`DELETE FROM thanh_vien_hop_dong`
    await sql`DELETE FROM hop_dong`
    await sql`DELETE FROM phieu_dat_coc`
    await sql`DELETE FROM nhu_cau_thue`
    await sql`DELETE FROM khach_hang`
    await sql`DELETE FROM nguoi_dung_he_thong`
    await sql`DELETE FROM giuong`
    await sql`DELETE FROM phong`
    await sql`DELETE FROM chi_nhanh`
    console.log('Đã dọn dẹp database thành công.')

    // 3. Tạo chi nhánh mới với UUID cố định hợp lệ để dễ quản lý
    console.log('3. Đang tạo chi nhánh...')
    const branchId = 'c001c001-c001-4001-a001-c001c001c001'
    const [branch] = await sql`
      INSERT INTO chi_nhanh (id, ten_chi_nhanh, dia_chi, so_dien_thoai)
      VALUES (
        ${branchId},
        'KTX Quận 1',
        '123 Nguyễn Thị Minh Khai, Quận 1, TP.HCM',
        '028-1234-5678'
      )
      RETURNING id, ten_chi_nhanh
    `
    console.log(`Đã tạo chi nhánh: ${branch.ten_chi_nhanh}`)

    // 4. Tạo tài khoản trên Supabase Auth và liên kết với nguoi_dung_he_thong
    console.log('4. Đang tạo người dùng hệ thống (Sale, Quản lý, Kế toán) với password Demo@1234...')
    const actors = [
      { email: 'sale@dorm.com', ho_ten: 'Trần Thị Sale', vai_tro: 'Sale' },
      { email: 'quanly@dorm.com', ho_ten: 'Nguyễn Văn Quản Lý', vai_tro: 'QuanLy' },
      { email: 'ketoan@dorm.com', ho_ten: 'Lê Thị Kế Toán', vai_tro: 'KeToan' }
    ]

    const createdAuthUsers = []

    for (const actor of actors) {
      const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email: actor.email,
        password: 'Demo@1234',
        email_confirm: true
      })

      if (createError) {
        throw new Error(`Lỗi tạo user ${actor.email} trên Supabase Auth: ${createError.message}`)
      }

      createdAuthUsers.push({ email: actor.email, id: user.id })
      console.log(`Đã tạo auth user: ${actor.email} -> ID: ${user.id}`)

      // Thêm vào database nguoi_dung_he_thong
      const [dbUser] = await sql`
        INSERT INTO nguoi_dung_he_thong (id, ho_ten, vai_tro, chi_nhanh_id, email)
        VALUES (${user.id}, ${actor.ho_ten}, ${actor.vai_tro}, ${branch.id}, ${actor.email})
        RETURNING id, ho_ten, vai_tro, email
      `
      console.log(`Đã thêm vào DB nguoi_dung_he_thong: ${dbUser.ho_ten} (${dbUser.vai_tro})`)
    }

    // 5. Seed các phòng (phong)
    console.log('5. Đang tạo danh sách phòng mẫu (P101, P201, P301)...')
    // P101 — Phòng Đơn — Nam — 1 giường — 2,500,000đ/giường/tháng — Khu A
    const [p101] = await sql`
      INSERT INTO phong (id, chi_nhanh_id, ma_phong, loai_phong, suc_chua_toi_da, gia_thue_mot_giuong, gioi_tinh_quy_dinh, khu_vuc, trang_thai)
      VALUES (gen_random_uuid(), ${branch.id}, 'P101', 'Don', 1, 2500000.00, 'Nam', 'Khu A', 'Trong')
      RETURNING id, ma_phong
    `
    // P201 — Phòng Ghép — Nữ — 4 giường — 1,500,000đ/giường/tháng — Khu B (Đổi thành NguyenPhong để test hợp đồng nhóm)
    const [p201] = await sql`
      INSERT INTO phong (id, chi_nhanh_id, ma_phong, loai_phong, suc_chua_toi_da, gia_thue_mot_giuong, gioi_tinh_quy_dinh, khu_vuc, trang_thai)
      VALUES (gen_random_uuid(), ${branch.id}, 'P201', 'NguyenPhong', 4, 1500000.00, 'Nu', 'Khu B', 'Trong')
      RETURNING id, ma_phong
    `
    // P301 — Phòng Ghép — NULL (Không giới hạn) — 2 giường — 2,000,000đ/giường/tháng — Khu C
    const [p301] = await sql`
      INSERT INTO phong (id, chi_nhanh_id, ma_phong, loai_phong, suc_chua_toi_da, gia_thue_mot_giuong, gioi_tinh_quy_dinh, khu_vuc, trang_thai)
      VALUES (gen_random_uuid(), ${branch.id}, 'P301', 'Ghep', 2, 2000000.00, NULL, 'Khu C', 'Trong')
      RETURNING id, ma_phong
    `
    console.log('Đã tạo 3 phòng thành công.')

    // 6. Seed các giường (giuong)
    console.log('6. Đang tạo danh sách giường...')
    // P101: G101-A (1 giường)
    const [g101A] = await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p101.id}, 'G101-A', 'Trong') RETURNING id`
    
    // P201: G201-A, G201-B, G201-C, G201-D (4 giường)
    const [g201A] = await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p201.id}, 'G201-A', 'Trong') RETURNING id`
    const [g201B] = await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p201.id}, 'G201-B', 'Trong') RETURNING id`
    const [g201C] = await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p201.id}, 'G201-C', 'Trong') RETURNING id`
    const [g201D] = await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p201.id}, 'G201-D', 'Trong') RETURNING id`

    // P301: G301-A, G301-B (2 giường)
    const [g301A] = await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p301.id}, 'G301-A', 'Trong') RETURNING id`
    const [g301B] = await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p301.id}, 'G301-B', 'Trong') RETURNING id`
    console.log('Đã tạo giường cho các phòng thành công.')

    // 7. Seed tài sản phòng (tai_san_phong) mặc định cho mỗi phòng
    console.log('7. Đang tạo danh sách tài sản phòng mẫu...')
    
    // P101: Giường đơn x1, Nệm x1, Tủ quần áo x1, Bàn học x1, Ghế x1, Thẻ từ x1
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p101.id}, 'Giường đơn', 1)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p101.id}, 'Nệm', 1)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p101.id}, 'Tủ quần áo', 1)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p101.id}, 'Bàn học', 1)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p101.id}, 'Ghế', 1)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p101.id}, 'Thẻ từ', 1)`

    // P201: Giường tầng x2, Nệm x4, Tủ quần áo x2, Bàn học x4, Ghế x4, Thẻ từ x1
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p201.id}, 'Giường tầng', 2)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p201.id}, 'Nệm', 4)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p201.id}, 'Tủ quần áo', 2)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p201.id}, 'Bàn học', 4)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p201.id}, 'Ghế', 4)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p201.id}, 'Thẻ từ', 1)`

    // P301: Giường đơn x2, Nệm x2, Tủ quần áo x2, Bàn học x2, Ghế x2, Thẻ từ x1
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p301.id}, 'Giường đơn', 2)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p301.id}, 'Nệm', 2)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p301.id}, 'Tủ quần áo', 2)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p301.id}, 'Bàn học', 2)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p301.id}, 'Ghế', 2)`
    await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${p301.id}, 'Thẻ từ', 1)`
    console.log('Đã tạo tài sản mặc định cho 3 phòng thành công.')

    // 8. Seed khách hàng mẫu (khach_hang)
    console.log('8. Đang tạo khách hàng mẫu...')
    const [an] = await sql`
      INSERT INTO khach_hang (id, ho_ten, so_dien_thoai, email, gioi_tinh, quoc_tich, so_cmnd_cccd)
      VALUES (gen_random_uuid(), 'Nguyễn Văn An', '0901234567', 'an@gmail.com', 'Nam', 'Việt Nam', '001099012345')
      RETURNING id
    `
    const [binh] = await sql`
      INSERT INTO khach_hang (id, ho_ten, so_dien_thoai, email, gioi_tinh, quoc_tich, so_cmnd_cccd)
      VALUES (gen_random_uuid(), 'Trần Thị Bình', '0912345678', 'binh@gmail.com', 'Nu', 'Việt Nam', '079099023456')
      RETURNING id
    `
    const [dung] = await sql`
      INSERT INTO khach_hang (id, ho_ten, so_dien_thoai, email, gioi_tinh, quoc_tich, so_cmnd_cccd)
      VALUES (gen_random_uuid(), 'Phạm Thị Dung', '0934567890', 'dung@gmail.com', 'Nu', 'Việt Nam', '074099045678')
      RETURNING id
    `
    const [e] = await sql`
      INSERT INTO khach_hang (id, ho_ten, so_dien_thoai, email, gioi_tinh, quoc_tich, so_cmnd_cccd)
      VALUES (gen_random_uuid(), 'Lê Thị E', '0999999999', 'e@gmail.com', 'Nu', 'Việt Nam', NULL)
      RETURNING id
    `
    console.log('Đã tạo 4 khách hàng mẫu (trong đó Lê Thị E thiếu CCCD).')

    // Find actors to map ids
    const saleActor = createdAuthUsers.find(u => u.email === 'sale@dorm.com')
    const saleId = saleActor ? saleActor.id : createdAuthUsers[0].id
    const managerActor = createdAuthUsers.find(u => u.email === 'quanly@dorm.com')
    const managerId = managerActor ? managerActor.id : createdAuthUsers[1].id

    // 9. Seed Nhu cầu thuê để tìm kiếm được thành viên trong bước Lập hợp đồng
    console.log('9. Đang tạo Nhu cầu thuê mẫu...')
    const [nctAn] = await sql`
      INSERT INTO nhu_cau_thue (id, khach_hang_id, sale_id, so_nguoi, gioi_tinh_yeu_cau, khu_vuc_yeu_cau, loai_phong_yeu_cau, muc_gia_toi_da, trang_thai, phong_du_kien_id)
      VALUES (gen_random_uuid(), ${an.id}, ${saleId}, 1, 'Nam', 'Khu A', 'Don', 3000000.00, 'DaXemPhong', ${p101.id})
      RETURNING id
    `
    const [nctBinh] = await sql`
      INSERT INTO nhu_cau_thue (id, khach_hang_id, sale_id, so_nguoi, gioi_tinh_yeu_cau, khu_vuc_yeu_cau, loai_phong_yeu_cau, muc_gia_toi_da, trang_thai, phong_du_kien_id)
      VALUES (gen_random_uuid(), ${binh.id}, ${saleId}, 3, 'Nu', 'Khu B', 'NguyenPhong', 6000000.00, 'DaXemPhong', ${p201.id})
      RETURNING id
    `
    const [nctDung] = await sql`
      INSERT INTO nhu_cau_thue (id, khach_hang_id, sale_id, so_nguoi, gioi_tinh_yeu_cau, khu_vuc_yeu_cau, loai_phong_yeu_cau, muc_gia_toi_da, trang_thai)
      VALUES (gen_random_uuid(), ${dung.id}, ${saleId}, 1, 'Nu', 'Khu B', 'Ghep', 2000000.00, 'MoiTiepNhan')
      RETURNING id
    `
    const [nctE] = await sql`
      INSERT INTO nhu_cau_thue (id, khach_hang_id, sale_id, so_nguoi, gioi_tinh_yeu_cau, khu_vuc_yeu_cau, loai_phong_yeu_cau, muc_gia_toi_da, trang_thai)
      VALUES (gen_random_uuid(), ${e.id}, ${saleId}, 1, 'Nu', 'Khu B', 'Ghep', 2000000.00, 'MoiTiepNhan')
      RETURNING id
    `

    // 10. Seed Phiếu đặt cọc ở trạng thái DaThanhToan
    console.log('10. Đang tạo Phiếu đặt cọc đã thanh toán...')
    // Phiếu 1: Thuê cá nhân (Nguyễn Văn An), so_tien_coc = 4 triệu (tương đương 2 triệu/tháng). Giá phòng thực tế là 2.5 triệu -> Demo GIA_THUE_DA_THAY_DOI
    await sql`
      INSERT INTO phieu_dat_coc (id, ma_phieu_coc, khach_hang_id, nhu_cau_thue_id, phong_id, giuong_id, so_giuong_thue, han_thanh_toan, so_tien_coc, phuong_thuc_thanh_toan, chung_tu_url, chi_nhanh_id, sale_id, nguoi_xac_nhan_id, trang_thai)
      VALUES (
        gen_random_uuid(), 'PDC000001', ${an.id}, ${nctAn.id}, ${p101.id}, ${g101A.id}, 1, 
        NOW() + INTERVAL '24 hours', 4000000.00, 'ChuyenKhoan', 'https://example.com/chung-tu-1.jpg',
        ${branch.id}, ${saleId}, ${saleId}, 'DaThanhToan'
      )
    `

    // Phiếu 2: Thuê nhóm (Trần Thị Bình đại diện), phòng NguyenPhong, so_giuong_thue = 4. so_tien_coc = 12 triệu (tương đương 1.5 triệu/tháng)
    await sql`
      INSERT INTO phieu_dat_coc (id, ma_phieu_coc, khach_hang_id, nhu_cau_thue_id, phong_id, giuong_id, so_giuong_thue, han_thanh_toan, so_tien_coc, phuong_thuc_thanh_toan, chung_tu_url, chi_nhanh_id, sale_id, nguoi_xac_nhan_id, trang_thai)
      VALUES (
        gen_random_uuid(), 'PDC000002', ${binh.id}, ${nctBinh.id}, ${p201.id}, NULL, 4, 
        NOW() + INTERVAL '24 hours', 12000000.00, 'ChuyenKhoan', 'https://example.com/chung-tu-2.jpg',
        ${branch.id}, ${saleId}, ${saleId}, 'DaThanhToan'
      )
    `

    // Cập nhật trạng thái giường và phòng tương ứng với đặt cọc
    await sql`UPDATE giuong SET trang_thai = 'DaDatCoc' WHERE id = ${g101A.id}`
    await sql`UPDATE giuong SET trang_thai = 'DaDatCoc' WHERE phong_id = ${p201.id}`
    await sql`UPDATE phong SET trang_thai = 'DaDatCoc' WHERE id = ${p101.id}`
    await sql`UPDATE phong SET trang_thai = 'DaDatCoc' WHERE id = ${p201.id}`
    console.log('Đã cập nhật trạng thái giường và phòng tương ứng sang DaDatCoc.')

    // Output kết quả
    console.log('\n========================================================================')
    console.log('✅ Táі khoản Auth:')
    for (const u of createdAuthUsers) {
      console.log(`   ${u.email.padEnd(18)} (id: ${u.id})`)
    }
    console.log('\n✅ Chi nhánh: KTX Quận 1')
    console.log('\n✅ Phòng & Giường:')
    console.log('   P101 (Đơn/Nam):  1 giường — 2,500,000đ (Phòng: DaDatCoc)')
    console.log('   P201 (NguyenPhong/Nữ): 4 giường — 1,500,000đ (Phòng: DaDatCoc)')
    console.log('   P301 (Ghép/Any): 2 giường — 2,000,000đ (Phòng: Trong)')
    console.log('\n✅ Khách hàng mẫu: 4 khách')
    console.log('   - Nguyễn Văn An (Nam) — SĐT: 0901234567')
    console.log('   - Trần Thị Bình (Nữ) — SĐT: 0912345678')
    console.log('   - Phạm Thị Dung (Nữ) — SĐT: 0934567890')
    console.log('   - Lê Thị E (Nữ, Thiếu CCCD) — SĐT: 0999999999')
    console.log('\n✅ Đã seed 2 Phiếu đặt cọc DaThanhToan:')
    console.log('   - PDC000001 (P101): Nguyễn Văn An')
    console.log('   - PDC000002 (P201): Trần Thị Bình')
    console.log('\n🎉 Seed hoàn tất! Hệ thống sẵn sàng để test.')
    console.log('========================================================================')

  } catch (err) {
    console.error('Lỗi nghiêm trọng khi seeding:', err)
  } finally {
    process.exit(0)
  }
}

main()
