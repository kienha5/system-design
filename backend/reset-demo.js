import sql from './src/db.js'

async function main() {
  console.log('=== BẮT ĐẦU RESET DỮ LIỆU DEMO ===')

  try {
    // 1. Xóa các bảng dữ liệu nghiệp vụ phát sinh theo đúng thứ tự ràng buộc khóa ngoại (Foreign Key)
    console.log('1. Đang xóa các biên bản, hóa đơn, hợp đồng, phiếu cọc và yêu cầu thuê...')
    await sql`DELETE FROM lich_su_trang_thai_phong`
    await sql`DELETE FROM bien_ban_tra_phong`
    await sql`DELETE FROM bien_ban_ban_giao`
    await sql`DELETE FROM hoa_don`
    await sql`DELETE FROM thanh_vien_hop_dong`
    await sql`DELETE FROM hop_dong`
    await sql`DELETE FROM phieu_dat_coc`
    await sql`DELETE FROM nhu_cau_thue`
    console.log('🗑️  Đã xóa: biên bản trả phòng, biên bản bàn giao, hóa đơn, thành viên HĐ, hợp đồng, phiếu cọc, yêu cầu thuê')

    // 2. Reset trạng thái phòng và giường về 'Trong'
    console.log('2. Đang reset trạng thái tất cả phòng và giường về Trống...')
    await sql`UPDATE giuong SET trang_thai = 'Trong'`
    await sql`UPDATE phong SET trang_thai = 'Trong'`
    console.log('✅  Đã reset: tất cả phòng/giường về trạng thái Trống')

    console.log('\n🎉  Hệ thống sẵn sàng demo!')

  } catch (err) {
    console.error('Lỗi nghiêm trọng khi reset dữ liệu demo:', err)
  } finally {
    process.exit(0)
  }
}

main()
