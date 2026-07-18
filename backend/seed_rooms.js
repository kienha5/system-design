/**
 * seed_rooms.js — Thêm 30 phòng trống vào DB hiện tại (không xóa dữ liệu cũ).
 * Chạy: node seed_rooms.js
 * Yêu cầu: Chi nhánh 'KTX Quận 1' đã tồn tại trong DB (chạy seed.js trước).
 */
import sql from './src/db.js'
import dotenv from 'dotenv'
dotenv.config()

/**
 * Định nghĩa 30 phòng mới (phân bổ đều các loại):
 * - 8 phòng Đơn (1 giường/phòng): P401 - P408 — Khu A (Nam)
 * - 10 phòng Ghép (2-3 giường/phòng): P501 - P510 — Khu C (Không giới hạn)
 * - 8 phòng NguyenPhong (4 giường/phòng): P601 - P608 — Khu B (Nữ)
 * - 4 phòng Đơn cao cấp (1 giường/phòng): P701 - P704 — Khu D (Không giới hạn)
 */
const ROOM_DEFINITIONS = [
  // === KHU A — Phòng Đơn — Nam ===
  { ma: 'P401', loai: 'Don', suc_chua: 1, gia: 2500000, gioi_tinh: 'Nam', khu: 'Khu A', so_giuong: 1 },
  { ma: 'P402', loai: 'Don', suc_chua: 1, gia: 2500000, gioi_tinh: 'Nam', khu: 'Khu A', so_giuong: 1 },
  { ma: 'P403', loai: 'Don', suc_chua: 1, gia: 2700000, gioi_tinh: 'Nam', khu: 'Khu A', so_giuong: 1 },
  { ma: 'P404', loai: 'Don', suc_chua: 1, gia: 2700000, gioi_tinh: 'Nam', khu: 'Khu A', so_giuong: 1 },
  { ma: 'P405', loai: 'Don', suc_chua: 1, gia: 2800000, gioi_tinh: 'Nam', khu: 'Khu A', so_giuong: 1 },
  { ma: 'P406', loai: 'Don', suc_chua: 1, gia: 2800000, gioi_tinh: 'Nam', khu: 'Khu A', so_giuong: 1 },
  { ma: 'P407', loai: 'Don', suc_chua: 1, gia: 3000000, gioi_tinh: 'Nam', khu: 'Khu A', so_giuong: 1 },
  { ma: 'P408', loai: 'Don', suc_chua: 1, gia: 3000000, gioi_tinh: 'Nam', khu: 'Khu A', so_giuong: 1 },

  // === KHU C — Phòng Ghép — Không giới hạn giới tính ===
  { ma: 'P501', loai: 'Ghep', suc_chua: 2, gia: 1800000, gioi_tinh: null, khu: 'Khu C', so_giuong: 2 },
  { ma: 'P502', loai: 'Ghep', suc_chua: 2, gia: 1800000, gioi_tinh: null, khu: 'Khu C', so_giuong: 2 },
  { ma: 'P503', loai: 'Ghep', suc_chua: 3, gia: 1600000, gioi_tinh: null, khu: 'Khu C', so_giuong: 3 },
  { ma: 'P504', loai: 'Ghep', suc_chua: 3, gia: 1600000, gioi_tinh: null, khu: 'Khu C', so_giuong: 3 },
  { ma: 'P505', loai: 'Ghep', suc_chua: 2, gia: 2000000, gioi_tinh: null, khu: 'Khu C', so_giuong: 2 },
  { ma: 'P506', loai: 'Ghep', suc_chua: 2, gia: 2000000, gioi_tinh: null, khu: 'Khu C', so_giuong: 2 },
  { ma: 'P507', loai: 'Ghep', suc_chua: 3, gia: 1700000, gioi_tinh: null, khu: 'Khu C', so_giuong: 3 },
  { ma: 'P508', loai: 'Ghep', suc_chua: 3, gia: 1700000, gioi_tinh: null, khu: 'Khu C', so_giuong: 3 },
  { ma: 'P509', loai: 'Ghep', suc_chua: 2, gia: 1900000, gioi_tinh: null, khu: 'Khu C', so_giuong: 2 },
  { ma: 'P510', loai: 'Ghep', suc_chua: 2, gia: 1900000, gioi_tinh: null, khu: 'Khu C', so_giuong: 2 },

  // === KHU B — Phòng NguyenPhong — Nữ ===
  { ma: 'P601', loai: 'NguyenPhong', suc_chua: 4, gia: 1500000, gioi_tinh: 'Nu', khu: 'Khu B', so_giuong: 4 },
  { ma: 'P602', loai: 'NguyenPhong', suc_chua: 4, gia: 1500000, gioi_tinh: 'Nu', khu: 'Khu B', so_giuong: 4 },
  { ma: 'P603', loai: 'NguyenPhong', suc_chua: 4, gia: 1600000, gioi_tinh: 'Nu', khu: 'Khu B', so_giuong: 4 },
  { ma: 'P604', loai: 'NguyenPhong', suc_chua: 4, gia: 1600000, gioi_tinh: 'Nu', khu: 'Khu B', so_giuong: 4 },
  { ma: 'P605', loai: 'NguyenPhong', suc_chua: 4, gia: 1400000, gioi_tinh: 'Nu', khu: 'Khu B', so_giuong: 4 },
  { ma: 'P606', loai: 'NguyenPhong', suc_chua: 4, gia: 1400000, gioi_tinh: 'Nu', khu: 'Khu B', so_giuong: 4 },
  { ma: 'P607', loai: 'NguyenPhong', suc_chua: 4, gia: 1700000, gioi_tinh: 'Nu', khu: 'Khu B', so_giuong: 4 },
  { ma: 'P608', loai: 'NguyenPhong', suc_chua: 4, gia: 1700000, gioi_tinh: 'Nu', khu: 'Khu B', so_giuong: 4 },

  // === KHU D — Phòng Đơn cao cấp — Không giới hạn ===
  { ma: 'P701', loai: 'Don', suc_chua: 1, gia: 4000000, gioi_tinh: null, khu: 'Khu D', so_giuong: 1 },
  { ma: 'P702', loai: 'Don', suc_chua: 1, gia: 4000000, gioi_tinh: null, khu: 'Khu D', so_giuong: 1 },
  { ma: 'P703', loai: 'Don', suc_chua: 1, gia: 4500000, gioi_tinh: null, khu: 'Khu D', so_giuong: 1 },
  { ma: 'P704', loai: 'Don', suc_chua: 1, gia: 4500000, gioi_tinh: null, khu: 'Khu D', so_giuong: 1 },
]

// Tài sản mặc định theo loại phòng
const getAssets = (loai, soGiuong) => {
  if (loai === 'Don') {
    return [
      { ten: 'Giường đơn', so_luong: 1 },
      { ten: 'Nệm', so_luong: 1 },
      { ten: 'Tủ quần áo', so_luong: 1 },
      { ten: 'Bàn học', so_luong: 1 },
      { ten: 'Ghế', so_luong: 1 },
      { ten: 'Thẻ từ', so_luong: 1 },
    ]
  }
  // Ghep & NguyenPhong
  return [
    { ten: 'Giường tầng', so_luong: Math.ceil(soGiuong / 2) },
    { ten: 'Nệm', so_luong: soGiuong },
    { ten: 'Tủ quần áo', so_luong: soGiuong },
    { ten: 'Bàn học', so_luong: soGiuong },
    { ten: 'Ghế', so_luong: soGiuong },
    { ten: 'Thẻ từ', so_luong: 1 },
  ]
}

async function main() {
  console.log('=== THÊM 30 PHÒNG TRỐNG VÀO DATABASE ===')
  console.log(`Thời gian: ${new Date().toLocaleString('vi-VN')}`)

  try {
    // Lấy chi nhánh hiện tại
    const branches = await sql`SELECT id, ten_chi_nhanh FROM chi_nhanh LIMIT 1`
    if (!branches.length) {
      throw new Error('Không tìm thấy chi nhánh! Hãy chạy seed.js trước.')
    }
    const branch = branches[0]
    console.log(`✅ Tìm thấy chi nhánh: ${branch.ten_chi_nhanh} (${branch.id})`)

    // Kiểm tra mã phòng đã tồn tại
    const existingRooms = await sql`SELECT ma_phong FROM phong`
    const existingMaCodes = new Set(existingRooms.map(r => r.ma_phong))
    console.log(`📋 Hiện tại DB có ${existingRooms.length} phòng.`)

    let createdCount = 0
    let skippedCount = 0

    for (const roomDef of ROOM_DEFINITIONS) {
      if (existingMaCodes.has(roomDef.ma)) {
        console.log(`⏭️  Bỏ qua ${roomDef.ma} (đã tồn tại)`)
        skippedCount++
        continue
      }

      // Tạo phòng
      const [phong] = await sql`
        INSERT INTO phong (id, chi_nhanh_id, ma_phong, loai_phong, suc_chua_toi_da, gia_thue_mot_giuong, gioi_tinh_quy_dinh, khu_vuc, trang_thai)
        VALUES (
          gen_random_uuid(), ${branch.id}, ${roomDef.ma}, ${roomDef.loai},
          ${roomDef.suc_chua}, ${roomDef.gia}, ${roomDef.gioi_tinh}, ${roomDef.khu}, 'Trong'
        )
        RETURNING id, ma_phong
      `

      // Tạo giường cho phòng
      for (let i = 0; i < roomDef.so_giuong; i++) {
        const suffix = String.fromCharCode(65 + i) // A, B, C, D...
        const maGiuong = `G${roomDef.ma.slice(1)}-${suffix}` // Ví dụ: G401-A
        await sql`
          INSERT INTO giuong (id, phong_id, ma_giuong, trang_thai)
          VALUES (gen_random_uuid(), ${phong.id}, ${maGiuong}, 'Trong')
        `
      }

      // Tạo tài sản mặc định cho phòng
      const assets = getAssets(roomDef.loai, roomDef.so_giuong)
      for (const asset of assets) {
        await sql`
          INSERT INTO tai_san_phong (id, phong_id, ten_tai_san, so_luong)
          VALUES (gen_random_uuid(), ${phong.id}, ${asset.ten}, ${asset.so_luong})
        `
      }

      console.log(`✅ Tạo phòng ${phong.ma_phong} (${roomDef.loai}, ${roomDef.so_giuong} giường, ${roomDef.gia.toLocaleString('vi-VN')}đ, ${roomDef.khu})`)
      createdCount++
    }

    // Tổng kết
    const [totalRow] = await sql`SELECT COUNT(*) as total FROM phong`
    const [emptyRow] = await sql`SELECT COUNT(*) as total FROM phong WHERE trang_thai = 'Trong'`

    console.log('\n========================================================================')
    console.log(`✅ Hoàn tất! Đã tạo ${createdCount} phòng mới (bỏ qua ${skippedCount} đã tồn tại)`)
    console.log(`📊 Tổng phòng trong DB: ${totalRow.total}`)
    console.log(`🟢 Phòng trạng thái "Trong" (trống): ${emptyRow.total}`)
    console.log('\n📋 Phân bổ phòng mới:')
    console.log('   Khu A — Don/Nam         : P401-P408 (8 phòng, 1 giường/phòng, 2.5-3tr/giường)')
    console.log('   Khu B — NguyenPhong/Nữ  : P601-P608 (8 phòng, 4 giường/phòng, 1.4-1.7tr/giường)')
    console.log('   Khu C — Ghep/Any        : P501-P510 (10 phòng, 2-3 giường/phòng, 1.6-2tr/giường)')
    console.log('   Khu D — Don cao cấp/Any : P701-P704 (4 phòng, 1 giường/phòng, 4-4.5tr/giường)')
    console.log('========================================================================')

  } catch (err) {
    console.error('❌ Lỗi:', err.message || err)
  } finally {
    await sql.end()
    process.exit(0)
  }
}

main()
