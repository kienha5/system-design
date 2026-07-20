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
  },

  /**
   * List deposit sheets, optionally filtered by status or customer phone number.
   * Auto-runs lazy expiry cleanup on all pending deposits.
   * 
   * @param {Object} filters - Query filters (trang_thai, so_dien_thoai)
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Array>} List of deposits
   */
  async list(filters, tx) {
    const client = tx || sql
    const { trang_thai, so_dien_thoai } = filters

    // 1. Run lazy expiry on all pending deposits first to keep data fresh
    const pendings = await client`
      SELECT id 
      FROM phieu_dat_coc 
      WHERE trang_thai = 'ChoThanhToan'
    `
    for (const p of pendings) {
      await this.checkAndExpireIfNeeded(p.id, client)
    }

    // 2. Build query conditions
    const conditions = []
    if (trang_thai) {
      conditions.push(sql`pdc.trang_thai = ${trang_thai}`)
    }
    if (so_dien_thoai) {
      conditions.push(sql`kh.so_dien_thoai = ${so_dien_thoai}`)
    }

    const whereClause = conditions.length > 0
      ? sql`WHERE ${conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`)}`
      : sql``

    const results = await client`
      SELECT 
        pdc.id,
        pdc.ma_phieu_coc,
        pdc.khach_hang_id,
        pdc.nhu_cau_thue_id,
        pdc.phong_id,
        pdc.giuong_id,
        pdc.so_giuong_thue,
        pdc.ngay_dat_coc,
        pdc.han_thanh_toan,
        pdc.so_tien_coc::float AS so_tien_coc,
        pdc.phuong_thuc_thanh_toan,
        pdc.chung_tu_url,
        pdc.chi_nhanh_id,
        pdc.sale_id,
        pdc.nguoi_xac_nhan_id,
        pdc.trang_thai,
        kh.ho_ten AS khach_hang_ho_ten,
        kh.so_dien_thoai AS khach_hang_so_dien_thoai,
        p.ma_phong,
        p.loai_phong,
        g.ma_giuong,
        CASE WHEN hd.id IS NOT NULL THEN true ELSE false END AS da_co_hop_dong
      FROM phieu_dat_coc pdc
      JOIN khach_hang kh ON pdc.khach_hang_id = kh.id
      JOIN phong p ON pdc.phong_id = p.id
      LEFT JOIN giuong g ON pdc.giuong_id = g.id
      LEFT JOIN hop_dong hd ON hd.phieu_dat_coc_id = pdc.id
      ${whereClause}
      ORDER BY pdc.ngay_dat_coc DESC
    `
    return results
  },

  /**
   * Retrieve a single deposit sheet by ID with joined customer and room details.
   * Auto-runs lazy expiry cleanup.
   * 
   * @param {string} id - Deposit sheet UUID
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object|null>} The deposit sheet details or null
   */
  async getById(id, tx) {
    const client = tx || sql
    await this.checkAndExpireIfNeeded(id, client)

    const [phieu] = await client`
      SELECT 
        pdc.id,
        pdc.ma_phieu_coc,
        pdc.khach_hang_id,
        pdc.nhu_cau_thue_id,
        pdc.phong_id,
        pdc.giuong_id,
        pdc.so_giuong_thue,
        pdc.ngay_dat_coc,
        pdc.han_thanh_toan,
        pdc.so_tien_coc::float AS so_tien_coc,
        pdc.phuong_thuc_thanh_toan,
        pdc.chung_tu_url,
        pdc.chi_nhanh_id,
        pdc.sale_id,
        pdc.nguoi_xac_nhan_id,
        pdc.trang_thai,
        kh.ho_ten AS khach_hang_ho_ten,
        kh.so_dien_thoai AS khach_hang_so_dien_thoai,
        kh.email AS khach_hang_email,
        kh.gioi_tinh AS khach_hang_gioi_tinh,
        kh.quoc_tich AS khach_hang_quoc_tich,
        kh.so_cmnd_cccd AS khach_hang_so_cmnd_cccd,
        p.ma_phong,
        p.loai_phong,
        p.khu_vuc,
        p.gia_thue_mot_giuong::float AS phong_gia_thue,
        g.ma_giuong
      FROM phieu_dat_coc pdc
      JOIN khach_hang kh ON pdc.khach_hang_id = kh.id
      JOIN phong p ON pdc.phong_id = p.id
      LEFT JOIN giuong g ON pdc.giuong_id = g.id
      WHERE pdc.id = ${id}
    `
    return phieu || null
  },

  /**
   * Confirm a deposit payment (Sale action).
   * 
   * @param {string} id - Deposit sheet UUID
   * @param {Object} data - { phuong_thuc_thanh_toan, chung_tu_url }
   * @param {string} saleId - UUID of the Sale confirming the sheet
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The updated deposit sheet
   */
  async xacNhanDatCoc(id, data, saleId, tx) {
    const client = tx || sql

    // 1. Verify existence
    const [existing] = await client`
      SELECT id, phong_id, giuong_id, trang_thai 
      FROM phieu_dat_coc 
      WHERE id = ${id}
    `
    if (!existing) {
      const err = new Error('Không tìm thấy phiếu đặt cọc.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    // 2. Check and run lazy expiry
    await this.checkAndExpireIfNeeded(id, client)

    // 3. Fetch updated status
    const [phieu] = await client`
      SELECT id, trang_thai, phong_id, giuong_id
      FROM phieu_dat_coc
      WHERE id = ${id}
    `

    if (phieu.trang_thai === 'HetHan') {
      const err = new Error('Phiếu đặt cọc đã hết hạn thanh toán (quá 24h).')
      err.code = 'PHIEU_COC_HET_HAN'
      err.status = 422
      throw err
    }
    if (phieu.trang_thai === 'DaThanhToan') {
      const err = new Error('Phiếu đặt cọc đã được xác nhận thanh toán trước đó.')
      err.code = 'PHIEU_COC_DA_XAC_NHAN'
      err.status = 409
      throw err
    }
    if (phieu.trang_thai !== 'ChoThanhToan') {
      const err = new Error('Trạng thái phiếu đặt cọc không hợp lệ để xác nhận.')
      err.code = 'TRANG_THAI_KHONG_HOP_LE'
      err.status = 422
      throw err
    }

    // Update status to 'DaThanhToan' and save transaction receipt
    const [updated] = await client`
      UPDATE phieu_dat_coc
      SET trang_thai = 'DaThanhToan',
          phuong_thuc_thanh_toan = ${data.phuong_thuc_thanh_toan},
          chung_tu_url = ${data.chung_tu_url},
          nguoi_xac_nhan_id = ${saleId}
      WHERE id = ${id}
      RETURNING id, ma_phieu_coc, trang_thai, nguoi_xac_nhan_id
    `

    // Lock bed(s) to 'DaDatCoc'
    if (phieu.giuong_id) {
      // Shared/single room bed
      await phongService.updateTrangThaiGiuong(
        phieu.giuong_id, 
        'DaDatCoc', 
        'Đã nhận đặt cọc giường lẻ', 
        saleId, 
        client
      )
    } else {
      // Entire room: lock all beds
      const beds = await client`
        SELECT id 
        FROM giuong 
        WHERE phong_id = ${phieu.phong_id}
      `
      for (const bed of beds) {
        await phongService.updateTrangThaiGiuong(
          bed.id, 
          'DaDatCoc', 
          'Đã nhận đặt cọc nguyên phòng', 
          saleId, 
          client
        )
      }
    }

    return updated
  }
}

