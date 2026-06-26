import sql from '../db.js'
import { phongService } from './phong.service.js'

export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Service handling room deposit sheets.
 */
export const phieuDatCocService = {
  /**
   * Check if a deposit sheet is expired (pending payment for > 24 hours).
   * If expired, update status to 'HetHan' and release associated bed(s) back to 'Trong'.
   * Runs within an optional database transaction.
   * 
   * @param {string} phieuCocId - Deposit sheet UUID
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<boolean>} True if the deposit was expired and updated, false otherwise.
   */
  async checkAndExpireIfNeeded(phieuCocId, tx) {
    const client = tx || sql

    // 1. Fetch deposit details
    const [phieu] = await client`
      SELECT id, trang_thai, han_thanh_toan, giuong_id, phong_id
      FROM phieu_dat_coc
      WHERE id = ${phieuCocId}
    `
    if (!phieu) return false

    // 2. Check if pending payment and past deadline
    if (phieu.trang_thai === 'ChoThanhToan' && new Date() > new Date(phieu.han_thanh_toan)) {
      // Update status to 'HetHan'
      await client`
        UPDATE phieu_dat_coc
        SET trang_thai = 'HetHan'
        WHERE id = ${phieuCocId}
      `

      // Release bed(s) back to 'Trong'
      if (phieu.giuong_id) {
        // Bed rental: release the single bed (syncs room state automatically)
        await phongService.updateTrangThaiGiuong(
          phieu.giuong_id, 
          'Trong', 
          'Hết hạn 24h chưa thanh toán đặt cọc', 
          SYSTEM_USER_ID, 
          client
        )
      } else {
        // Entire room rental (NguyenPhong): release all beds in the room
        const beds = await client`
          SELECT id 
          FROM giuong 
          WHERE phong_id = ${phieu.phong_id}
        `
        for (const bed of beds) {
          await phongService.updateTrangThaiGiuong(
            bed.id, 
            'Trong', 
            'Hết hạn 24h chưa thanh toán đặt cọc nguyên phòng', 
            SYSTEM_USER_ID, 
            client
          )
        }
      }

      return true // expired and cleaned up
    }

    return false
  },

  /**
   * Create a new deposit sheet, locking the beds/room for 24h.
   * Executed entirely inside a database transaction.
   * 
   * @param {Object} input - Validated request body
   * @param {string} saleId - UUID of the Sale agent creating the sheet
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The created deposit sheet record
   */
  async create(input, saleId, tx) {
    const client = tx || sql

    const {
      nhu_cau_thue_id,
      khach_hang_id,
      phong_id,
      giuong_id,
      so_giuong_thue,
      chi_nhanh_id
    } = input

    // 1. Verify customer exists
    const [customer] = await client`
      SELECT id, ho_ten, gioi_tinh
      FROM khach_hang
      WHERE id = ${khach_hang_id}
    `
    if (!customer) {
      const err = new Error('Không tìm thấy khách hàng.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    // 2. Verify room exists
    const [room] = await client`
      SELECT id, loai_phong, suc_chua_toi_da, gioi_tinh_quy_dinh, gia_thue_mot_giuong
      FROM phong
      WHERE id = ${phong_id}
    `
    if (!room) {
      const err = new Error('Không tìm thấy phòng.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    // 3. Preliminary check: Room gender policy compliance
    if (room.gioi_tinh_quy_dinh && room.gioi_tinh_quy_dinh !== customer.gioi_tinh) {
      const err = new Error('Giới tính của khách hàng không phù hợp với quy định của phòng.')
      err.code = 'PHONG_KHONG_PHU_HOP_GIOI_TINH'
      err.status = 422
      throw err
    }

    // 4. Validate giuong_id and so_giuong_thue based on room type
    let targetGiuongId = giuong_id || null

    if (room.loai_phong === 'NguyenPhong') {
      targetGiuongId = null // Ensure giuong_id is null for entire room rentals
      if (so_giuong_thue !== room.suc_chua_toi_da) {
        const err = new Error(`Đối với hình thức thuê nguyên phòng, số giường thuê phải bằng sức chứa tối đa của phòng (${room.suc_chua_toi_da}).`)
        err.code = 'VALIDATION_ERROR'
        err.status = 400
        throw err
      }
    } else {
      // Bed rental (Don or Ghep)
      if (!targetGiuongId) {
        const err = new Error('giuong_id là bắt buộc đối với hình thức thuê giường lẻ.')
        err.code = 'VALIDATION_ERROR'
        err.status = 400
        throw err
      }
      if (so_giuong_thue !== 1) {
        const err = new Error('Đối với hình thức thuê giường lẻ, số giường thuê phải bằng 1.')
        err.code = 'VALIDATION_ERROR'
        err.status = 400
        throw err
      }
    }

    // 5. Lazy Expiry Cleanup: Clean up any conflicting pending deposits
    // Find all pending deposits for this room, bed, or beds in this room
    const conflictingDeposits = await client`
      SELECT id
      FROM phieu_dat_coc
      WHERE (
        phong_id = ${phong_id}
        OR giuong_id = ${targetGiuongId}
        OR giuong_id IN (SELECT id FROM giuong WHERE phong_id = ${phong_id})
      ) AND trang_thai = 'ChoThanhToan'
    `

    for (const conflict of conflictingDeposits) {
      await this.checkAndExpireIfNeeded(conflict.id, client)
    }

    // 6. Verify Bed(s) Availability after cleanup
    if (room.loai_phong === 'NguyenPhong') {
      const beds = await client`
        SELECT id, trang_thai
        FROM giuong
        WHERE phong_id = ${phong_id}
      `
      const unavailableBeds = beds.filter(b => b.trang_thai !== 'Trong')
      if (unavailableBeds.length > 0) {
        const err = new Error('Phòng không còn khả dụng để đặt cọc nguyên phòng (có giường không trống).')
        err.code = 'PHONG_KHONG_CON_TRONG'
        err.status = 409
        throw err
      }
    } else {
      // Bed rental: verify specific bed is 'Trong'
      const [bed] = await client`
        SELECT id, trang_thai
        FROM giuong
        WHERE id = ${targetGiuongId}
      `
      if (!bed) {
        const err = new Error('Không tìm thấy giường yêu cầu.')
        err.code = 'NOT_FOUND'
        err.status = 404
        throw err
      }
      if (bed.trang_thai !== 'Trong') {
        const err = new Error('Giường được chọn hiện không còn trống.')
        err.code = 'GIUONG_KHONG_CON_TRONG'
        err.status = 409
        throw err
      }
    }

    // 7. Calculate deposit amount (gia_thue_mot_giuong * 2 * so_giuong_thue)
    const soTienCoc = Number(room.gia_thue_mot_giuong) * 2 * so_giuong_thue

    // 8. Generate sequential ma_phieu_coc
    const [{ count }] = await client`
      SELECT COUNT(*)::int AS count 
      FROM phieu_dat_coc
    `
    const maPhieuCoc = `PC${String(count + 1).padStart(6, '0')}`

    // 9. Insert new phieu_dat_coc record
    const [newDeposit] = await client`
      INSERT INTO phieu_dat_coc (
        ma_phieu_coc,
        khach_hang_id,
        nhu_cau_thue_id,
        phong_id,
        giuong_id,
        so_giuong_thue,
        ngay_dat_coc,
        han_thanh_toan,
        so_tien_coc,
        chi_nhanh_id,
        sale_id,
        trang_thai
      )
      VALUES (
        ${maPhieuCoc},
        ${khach_hang_id},
        ${nhu_cau_thue_id || null},
        ${phong_id},
        ${targetGiuongId},
        ${so_giuong_thue},
        NOW(),
        NOW() + INTERVAL '24 hours',
        ${soTienCoc},
        ${chi_nhanh_id},
        ${saleId},
        'ChoThanhToan'
      )
      RETURNING id, ma_phieu_coc, khach_hang_id, phong_id, giuong_id, so_tien_coc, han_thanh_toan, trang_thai
    `

    // 10. Lock the bed(s) to 'ChoDatCoc'
    if (room.loai_phong === 'NguyenPhong') {
      const beds = await client`
        SELECT id 
        FROM giuong 
        WHERE phong_id = ${phong_id}
      `
      for (const bed of beds) {
        await phongService.updateTrangThaiGiuong(
          bed.id, 
          'ChoDatCoc', 
          'Khóa tạm 24h chờ thanh toán đặt cọc nguyên phòng', 
          saleId, 
          client
        )
      }
    } else {
      await phongService.updateTrangThaiGiuong(
        targetGiuongId, 
        'ChoDatCoc', 
        'Khóa tạm 24h chờ thanh toán đặt cọc', 
        saleId, 
        client
      )
    }

    // Convert decimal values to JS numbers
    return {
      ...newDeposit,
      so_tien_coc: Number(newDeposit.so_tien_coc)
    }
  }
}
