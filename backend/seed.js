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


const supabaseUrl = process.env.SUPABASE_URL || 'https://lycvxtqtjdqrpihwzyfp.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Lỗi: SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY chưa được định nghĩa trong file .env')
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

    // 5, 6, 7. Seed các phòng, giường và tài sản
    console.log('5, 6, 7. Đang tạo danh sách phòng, giường và tài sản mẫu (30 phòng, mở rộng gấp 10 lần)...')
    for (let i = 1; i <= 10; i++) {
      // Nhóm phòng Đơn (Nam) - P101 -> P110
      const maPhongDon = `P1${String(i).padStart(2, '0')}`
      const [phongDon] = await sql`
        INSERT INTO phong (id, chi_nhanh_id, ma_phong, loai_phong, suc_chua_toi_da, gia_thue_mot_giuong, gioi_tinh_quy_dinh, khu_vuc, trang_thai)
        VALUES (gen_random_uuid(), ${branch.id}, ${maPhongDon}, 'Don', 1, 2500000.00, 'Nam', 'Khu A', 'Trong')
        RETURNING id, ma_phong
      `
      // Giường phòng đơn
      await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${phongDon.id}, ${`G1${String(i).padStart(2, '0')}-A`}, 'Trong')`
      // Tài sản phòng đơn
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongDon.id}, 'Giường đơn', 1)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongDon.id}, 'Nệm', 1)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongDon.id}, 'Tủ quần áo', 1)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongDon.id}, 'Bàn học', 1)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongDon.id}, 'Ghế', 1)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongDon.id}, 'Thẻ từ', 1)`

      // Nhóm phòng Ghép (Nữ) - P201 -> P210
      const maPhongGhepNu = `P2${String(i).padStart(2, '0')}`
      const [phongGhepNu] = await sql`
        INSERT INTO phong (id, chi_nhanh_id, ma_phong, loai_phong, suc_chua_toi_da, gia_thue_mot_giuong, gioi_tinh_quy_dinh, khu_vuc, trang_thai)
        VALUES (gen_random_uuid(), ${branch.id}, ${maPhongGhepNu}, 'Ghep', 4, 1500000.00, 'Nu', 'Khu B', 'Trong')
        RETURNING id, ma_phong
      `
      // Giường phòng ghép nữ (4 giường)
      const giuongNuLetter = ['A', 'B', 'C', 'D']
      for (const char of giuongNuLetter) {
        await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${phongGhepNu.id}, ${`G2${String(i).padStart(2, '0')}-${char}`}, 'Trong')`
      }
      // Tài sản phòng ghép nữ
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongGhepNu.id}, 'Giường tầng', 2)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongGhepNu.id}, 'Nệm', 4)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongGhepNu.id}, 'Tủ quần áo', 2)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongGhepNu.id}, 'Bàn học', 4)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongGhepNu.id}, 'Ghế', 4)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongGhepNu.id}, 'Thẻ từ', 1)`

      // Nhóm phòng Ghép (Không giới hạn) - P301 -> P310
      const maPhongGhepAny = `P3${String(i).padStart(2, '0')}`
      const [phongGhepAny] = await sql`
        INSERT INTO phong (id, chi_nhanh_id, ma_phong, loai_phong, suc_chua_toi_da, gia_thue_mot_giuong, gioi_tinh_quy_dinh, khu_vuc, trang_thai)
        VALUES (gen_random_uuid(), ${branch.id}, ${maPhongGhepAny}, 'Ghep', 2, 2000000.00, NULL, 'Khu C', 'Trong')
        RETURNING id, ma_phong
      `
      // Giường phòng ghép any (2 giường)
      const giuongAnyLetter = ['A', 'B']
      for (const char of giuongAnyLetter) {
        await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${phongGhepAny.id}, ${`G3${String(i).padStart(2, '0')}-${char}`}, 'Trong')`
      }
      // Tài sản phòng ghép any
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongGhepAny.id}, 'Giường đơn', 2)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongGhepAny.id}, 'Nệm', 2)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongGhepAny.id}, 'Tủ quần áo', 2)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongGhepAny.id}, 'Bàn học', 2)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongGhepAny.id}, 'Ghế', 2)`
      await sql`INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong) VALUES (gen_random_uuid(), ${phongGhepAny.id}, 'Thẻ từ', 1)`
    }
    console.log('Đã tạo 30 phòng và đầy đủ giường/tài sản tương ứng thành công.')


    // 8. Seed khách hàng mẫu (khach_hang)
    console.log('8. Đang tạo khách hàng mẫu...')
    await sql`
      INSERT INTO khach_hang (id, ho_ten, so_dien_thoai, email, gioi_tinh, quoc_tich, so_cmnd_cccd)
      VALUES 
        (gen_random_uuid(), 'Nguyễn Văn An', '0901234567', 'an@gmail.com', 'Nam', 'Việt Nam', '001099012345'),
        (gen_random_uuid(), 'Trần Thị Bình', '0912345678', 'binh@gmail.com', 'Nu', 'Việt Nam', '079099023456'),
        (gen_random_uuid(), 'Lê Văn Cường', '0923456789', 'cuong@gmail.com', 'Nam', 'Việt Nam', '048099034567'),
        (gen_random_uuid(), 'Phạm Thị Dung', '0934567890', 'dung@gmail.com', 'Nu', 'Việt Nam', '074099045678')
    `
    console.log('Đã tạo 4 khách hàng mẫu thành công.')

    // Output kết quả
    console.log('\n========================================================================')
    console.log('✅ Tài khoản Auth:')
    for (const u of createdAuthUsers) {
      console.log(`   ${u.email.padEnd(18)} (id: ${u.id})`)
    }
    console.log('\n✅ Chi nhánh: KTX Quận 1')
    console.log('\n✅ Phòng & Giường:')
    console.log('   P101 -> P110 (Đơn/Nam):  1 giường/phòng — 2,500,000đ')
    console.log('   P201 -> P210 (Ghép/Nữ):  4 giường/phòng — 1,500,000đ')
    console.log('   P301 -> P310 (Ghép/Any): 2 giường/phòng — 2,000,000đ')
    console.log('\n✅ Tài sản phòng: đã tạo đầy đủ cho tất cả 30 phòng')
    console.log('\n✅ Khách hàng mẫu: 4 khách')
    console.log('\n🎉 Seed hoàn tất! Hệ thống sẵn sàng để test với 30 phòng mẫu.')

    console.log('========================================================================')

  } catch (err) {
    console.error('Lỗi nghiêm trọng khi seeding:', err)
  } finally {
    process.exit(0)
  }
}

main()
