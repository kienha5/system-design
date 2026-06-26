import { createClient } from '@supabase/supabase-js'
import sql from './src/db.js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = 'https://lycvxtqtjdqrpihwzyfp.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceRoleKey) {
  console.error('Lỗi: SUPABASE_SERVICE_ROLE_KEY chưa được định nghĩa trong file .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('Bắt đầu dọn dẹp và seed dữ liệu...')

  try {
    // 1. Dọn dẹp tài khoản cũ trong Supabase Auth
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

    // 2. Xóa sạch dữ liệu trong database theo thứ tự ràng buộc khóa ngoại
    console.log('2. Đang xóa dữ liệu cũ trong database...')
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

    // 3. Tạo chi nhánh mới
    console.log('3. Đang tạo chi nhánh...')
    const [branch] = await sql`
      INSERT INTO chi_nhanh (id, ten_chi_nhanh, dia_chi, so_dien_thoai)
      VALUES (
        gen_random_uuid(),
        'Chi nhánh KTX Homestay Quận 7',
        '123 Đường số 4, Tân Kiểng, Quận 7, TP. HCM',
        '0901234567'
      )
      RETURNING id, ten_chi_nhanh
    `
    console.log(`Đã tạo chi nhánh: ${branch.ten_chi_nhanh} (${branch.id})`)

    // 4. Tạo tài khoản trên Supabase Auth và liên kết với nguoi_dung_he_thong
    console.log('4. Đang tạo người dùng hệ thống...')
    const actors = [
      { email: 'sale@dorm.com', ho_ten: 'Nguyễn Thị Sale', vai_tro: 'Sale' },
      { email: 'quanly@dorm.com', ho_ten: 'Trần Văn Quản Lý', vai_tro: 'QuanLy' },
      { email: 'ketoan@dorm.com', ho_ten: 'Lê Thị Kế Toán', vai_tro: 'KeToan' }
    ]

    for (const actor of actors) {
      const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email: actor.email,
        password: '123',
        email_confirm: true
      })

      if (createError) {
        throw new Error(`Lỗi tạo user ${actor.email} trên Supabase: ${createError.message}`)
      }

      console.log(`Đã tạo auth user: ${actor.email} -> ID: ${user.id}`)

      // Thêm vào database nguoi_dung_he_thong
      const [dbUser] = await sql`
        INSERT INTO nguoi_dung_he_thong (id, ho_ten, vai_tro, chi_nhanh_id)
        VALUES (${user.id}, ${actor.ho_ten}, ${actor.vai_tro}, ${branch.id})
        RETURNING id, ho_ten, vai_tro
      `
      console.log(`Đã thêm vào DB nguoi_dung_he_thong: ${dbUser.ho_ten} (${dbUser.vai_tro})`)
    }

    // 5. Seed các phòng (phong)
    console.log('5. Đang tạo danh sách phòng mẫu...')
    // Phòng 101 - Phòng Đơn, Nam, Khu A, Giá 3tr
    const [p101] = await sql`
      INSERT INTO phong (id, chi_nhanh_id, ma_phong, loai_phong, suc_chua_toi_da, gia_thue_mot_giuong, gioi_tinh_quy_dinh, khu_vuc, trang_thai)
      VALUES (gen_random_uuid(), ${branch.id}, 'P101', 'Don', 1, 3000000.00, 'Nam', 'Khu A', 'Trong')
      RETURNING id, ma_phong
    `
    // Phòng 102 - Phòng Ghép, Nữ, Khu B, Giá 1.5tr
    const [p102] = await sql`
      INSERT INTO phong (id, chi_nhanh_id, ma_phong, loai_phong, suc_chua_toi_da, gia_thue_mot_giuong, gioi_tinh_quy_dinh, khu_vuc, trang_thai)
      VALUES (gen_random_uuid(), ${branch.id}, 'P102', 'Ghep', 4, 1500000.00, 'Nu', 'Khu B', 'Trong')
      RETURNING id, ma_phong
    `
    // Phòng 103 - Nguyên Phòng, Không giới hạn giới tính, Khu A, Giá 5tr
    const [p103] = await sql`
      INSERT INTO phong (id, chi_nhanh_id, ma_phong, loai_phong, suc_chua_toi_da, gia_thue_mot_giuong, gioi_tinh_quy_dinh, khu_vuc, trang_thai)
      VALUES (gen_random_uuid(), ${branch.id}, 'P103', 'NguyenPhong', 2, 5000000.00, NULL, 'Khu A', 'Trong')
      RETURNING id, ma_phong
    `
    console.log('Đã tạo 3 phòng: P101, P102, P103')

    // 6. Seed các giường (giuong)
    console.log('6. Đang tạo danh sách giường...')
    // Phòng 101 có 1 giường
    await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p101.id}, 'P101-G1', 'Trong')`
    
    // Phòng 102 có 4 giường
    await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p102.id}, 'P102-G1', 'Trong')`
    await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p102.id}, 'P102-G2', 'Trong')`
    await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p102.id}, 'P102-G3', 'Trong')`
    await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p102.id}, 'P102-G4', 'Trong')`

    // Phòng 103 có 2 giường (cho thuê nguyên phòng)
    await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p103.id}, 'P103-G1', 'Trong')`
    await sql`INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai) VALUES (gen_random_uuid(), ${p103.id}, 'P103-G2', 'Trong')`
    console.log('Đã tạo giường cho các phòng thành công.')

    // 7. Seed khách hàng mẫu (khach_hang) và yêu cầu thuê mẫu (nhu_cau_thue)
    console.log('7. Đang tạo khách hàng mẫu và yêu cầu thuê...')
    const [kh1] = await sql`
      INSERT INTO khach_hang (id, ho_ten, so_dien_thoai, email, gioi_tinh, quoc_tich, so_cmnd_cccd)
      VALUES (
        gen_random_uuid(),
        'Nguyễn Văn Nam',
        '0988888888',
        'nam@gmail.com',
        'Nam',
        'Việt Nam',
        '123456789012'
      )
      RETURNING id, ho_ten
    `
    
    // Lấy ID của Sale để làm người tiếp nhận
    const [saleUser] = await sql`SELECT id FROM nguoi_dung_he_thong WHERE vai_tro = 'Sale' LIMIT 1`

    const [nct1] = await sql`
      INSERT INTO nhu_cau_thue (
        id, khach_hang_id, sale_id, so_nguoi, gioi_tinh_yeu_cau, khu_vuc_yeu_cau, 
        loai_phong_yeu_cau, muc_gia_toi_da, thoi_gian_vao_o_du_kien, thoi_han_thue_du_kien, 
        ghi_chu_yeu_cau, phong_du_kien_id, lich_hen_xem, phuong_thuc_thong_bao, trang_thai
      )
      VALUES (
        gen_random_uuid(),
        ${kh1.id},
        ${saleUser.id},
        1,
        'Nam',
        'Khu A',
        'Don',
        3500000.00,
        CURRENT_DATE + 5,
        6,
        'Cần phòng yên tĩnh, tầng thấp.',
        ${p101.id},
        NULL,
        'Email',
        'MoiTiepNhan'
      )
      RETURNING id
    `
    console.log(`Đã tạo khách hàng: ${kh1.ho_ten}`)
    console.log(`Đã tạo yêu cầu thuê mẫu với ID: ${nct1.id}`)
    
    console.log('=== SEEDING HOÀN TẤT THÀNH CÔNG ===')
  } catch (err) {
    console.error('Lỗi nghiêm trọng khi seeding:', err)
  } finally {
    process.exit(0)
  }
}

main()
