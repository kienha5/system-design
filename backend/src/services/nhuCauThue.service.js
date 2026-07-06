import sql from '../db.js'

/**
 * Service handling rental request intakes and viewing schedules.
 */
export const nhuCauThueService = {
  /**
   * Create a new rental request, upserting the customer record by phone number.
   * Runs inside an optional database transaction.
   * 
   * @param {Object} input - Validated request body
   * @param {string} saleId - UUID of the Sale agent performing the intake
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<{id: string, khach_hang_id: string, khach_hang_da_ton_tai: boolean, trang_thai: string}>}
   */
  async create(input, saleId, tx) {
    const client = tx || sql

    const { khach_hang, ...requestDetails } = input
    let customerId
    let khach_hang_da_ton_tai = false

    // 1. Check if customer already exists by phone number
    const [existingCustomer] = await client`
      SELECT id
      FROM khach_hang
      WHERE so_dien_thoai = ${khach_hang.so_dien_thoai}
    `

    if (existingCustomer) {
      customerId = existingCustomer.id
      khach_hang_da_ton_tai = true
    } else {
      // 2. Insert new customer if not found (do not overwrite existing if found)
      const [newCustomer] = await client`
        INSERT INTO khach_hang (ho_ten, so_dien_thoai, email, gioi_tinh, quoc_tich, so_cmnd_cccd)
        VALUES (
          ${khach_hang.ho_ten},
          ${khach_hang.so_dien_thoai},
          ${khach_hang.email || null},
          ${khach_hang.gioi_tinh || null},
          ${khach_hang.quoc_tich || null},
          ${khach_hang.so_cmnd_cccd || null}
        )
        RETURNING id
      `
      customerId = newCustomer.id
      khach_hang_da_ton_tai = false
    }

    // 3. Create the rental request record
    const [newRequest] = await client`
      INSERT INTO nhu_cau_thue (
        khach_hang_id,
        sale_id,
        so_nguoi,
        gioi_tinh_yeu_cau,
        khu_vuc_yeu_cau,
        loai_phong_yeu_cau,
        muc_gia_toi_da,
        thoi_gian_vao_o_du_kien,
        thoi_han_thue_du_kien,
        ghi_chu_yeu_cau,
        phuong_thuc_thong_bao,
        trang_thai,
        phong_du_kien_id
      )
      VALUES (
        ${customerId},
        ${saleId},
        ${requestDetails.so_nguoi},
        ${requestDetails.gioi_tinh_yeu_cau || null},
        ${requestDetails.khu_vuc_yeu_cau || null},
        ${requestDetails.loai_phong_yeu_cau || null},
        ${requestDetails.muc_gia_toi_da || null},
        ${requestDetails.thoi_gian_vao_o_du_kien || null},
        ${requestDetails.thoi_han_thue_du_kien || null},
        ${requestDetails.ghi_chu_yeu_cau || null},
        ${requestDetails.phuong_thuc_thong_bao},
        'MoiTiepNhan',
        NULL
      )
      RETURNING id, trang_thai
    `

    return {
      id: newRequest.id,
      khach_hang_id: customerId,
      khach_hang_da_ton_tai,
      trang_thai: newRequest.trang_thai
    }
  },

  /**
   * Update the prospective room (phong_du_kien_id) for a rental request.
   * Runs inside an optional database transaction.
   * 
   * @param {string} id - Rental request UUID
   * @param {string} phongDuKienId - Room UUID
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<void>}
   */
  async updatePhongDuKien(id, phongDuKienId, tx) {
    const client = tx || sql

    // 1. Verify rental request exists
    const [request] = await client`
      SELECT id
      FROM nhu_cau_thue
      WHERE id = ${id}
    `
    if (!request) {
      const err = new Error('Không tìm thấy yêu cầu thuê.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    // 2. Verify room exists
    const [room] = await client`
      SELECT id
      FROM phong
      WHERE id = ${phongDuKienId}
    `
    if (!room) {
      const err = new Error('Không tìm thấy phòng dự kiến.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    // 3. Update the request
    await client`
      UPDATE nhu_cau_thue
      SET phong_du_kien_id = ${phongDuKienId}
      WHERE id = ${id}
    `
  },

  // =========================================================================
  // UC05 - SCHEDULE VIEWING & STATUS UPDATES
  // =========================================================================

  /**
   * Schedule or reschedule a room viewing appointment.
   * Runs inside an optional database transaction.
   * 
   * @param {string} id - Rental request UUID
   * @param {string} lichHenXemStr - ISO 8601 Datetime string for the viewing
   * @param {string} [phuongThucThongBao] - Optional notification method override
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The updated rental request record
   */
  async datLichXem(id, lichHenXemStr, phuongThucThongBao, tx) {
    const client = tx || sql

    // 1. Verify rental request exists
    const [request] = await client`
      SELECT id, trang_thai, phong_du_kien_id, khach_hang_id, phuong_thuc_thong_bao
      FROM nhu_cau_thue
      WHERE id = ${id}
    `
    if (!request) {
      const err = new Error('Không tìm thấy yêu cầu thuê.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    // 2. Verify state is either MoiTiepNhan or DaXemPhong
    const allowedStates = ['MoiTiepNhan', 'DaXemPhong']
    if (!allowedStates.includes(request.trang_thai)) {
      const err = new Error('Trạng thái yêu cầu thuê hiện tại không cho phép đặt lịch xem.')
      err.code = 'TRANG_THAI_KHONG_HOP_LE'
      err.status = 422
      throw err
    }

    // 3. Verify date is in the future
    const targetDate = new Date(lichHenXemStr)
    if (targetDate.getTime() <= Date.now()) {
      const err = new Error('Lịch hẹn xem phải là một thời điểm trong tương lai.')
      err.code = 'VALIDATION_ERROR'
      err.status = 400
      throw err
    }

    // 4. Verify scheduling overlap (only if a prospective room is selected)
    if (request.phong_du_kien_id) {
      const startRange = new Date(targetDate.getTime() - 60 * 60 * 1000) // -1 hour
      const endRange = new Date(targetDate.getTime() + 60 * 60 * 1000)  // +1 hour

      const [overlappingBooking] = await client`
        SELECT id
        FROM nhu_cau_thue
        WHERE phong_du_kien_id = ${request.phong_du_kien_id}
          AND trang_thai = 'DaDatLichXem'
          AND id != ${id}
          AND lich_hen_xem >= ${startRange}
          AND lich_hen_xem <= ${endRange}
        LIMIT 1
      `

      if (overlappingBooking) {
        const err = new Error('Trùng lịch hẹn xem cùng một phòng trong khoảng 1 giờ (trước/sau).')
        err.code = 'LICH_HEN_BI_TRUNG'
        err.status = 409
        throw err
      }
    }

    // 5. Determine notification method
    const notifyMethod = phuongThucThongBao || request.phuong_thuc_thong_bao

    // 6. Update rental request
    const [updatedRequest] = await client`
      UPDATE nhu_cau_thue
      SET lich_hen_xem = ${targetDate},
          phuong_thuc_thong_bao = ${notifyMethod},
          trang_thai = 'DaDatLichXem'
      WHERE id = ${id}
      RETURNING id, trang_thai, lich_hen_xem, phuong_thuc_thong_bao
    `

    // 7. Log mock notification
    console.log(`[NOTIFY] Gửi ${notifyMethod} đến khách ${request.khach_hang_id}: lịch hẹn ${targetDate.toISOString()}`)

    return {
      id: updatedRequest.id,
      trang_thai: updatedRequest.trang_thai,
      lich_hen_xem: updatedRequest.lich_hen_xem,
      phuong_thuc_thong_bao: updatedRequest.phuong_thuc_thong_bao
    }
  },

  /**
   * Confirm that the customer has completed the room viewing.
   * Runs inside an optional database transaction.
   * 
   * @param {string} id - Rental request UUID
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The updated rental request record
   */
  async xacNhanDaXem(id, tx) {
    const client = tx || sql

    // 1. Verify rental request exists
    const [request] = await client`
      SELECT id, trang_thai
      FROM nhu_cau_thue
      WHERE id = ${id}
    `
    if (!request) {
      const err = new Error('Không tìm thấy yêu cầu thuê.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    // 2. Verify state is DaDatLichXem
    if (request.trang_thai !== 'DaDatLichXem') {
      const err = new Error('Yêu cầu thuê phải ở trạng thái đã đặt lịch mới có thể xác nhận đã xem.')
      err.code = 'TRANG_THAI_KHONG_HOP_LE'
      err.status = 422
      throw err
    }

    // 3. Update status to DaXemPhong
    const [updated] = await client`
      UPDATE nhu_cau_thue
      SET trang_thai = 'DaXemPhong'
      WHERE id = ${id}
      RETURNING id, trang_thai
    `

    return updated
  },

  /**
   * Cancel the rental request.
   * Runs inside an optional database transaction.
   * 
   * @param {string} id - Rental request UUID
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The updated rental request record
   */
  async huyYeuCau(id, tx) {
    const client = tx || sql

    // 1. Verify rental request exists
    const [request] = await client`
      SELECT id
      FROM nhu_cau_thue
      WHERE id = ${id}
    `
    if (!request) {
      const err = new Error('Không tìm thấy yêu cầu thuê.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    // 2. Update status to DaHuy
    const [updated] = await client`
      UPDATE nhu_cau_thue
      SET trang_thai = 'DaHuy'
      WHERE id = ${id}
      RETURNING id, trang_thai
    `

    return updated
  },

  /**
   * Retrieves a rental request by ID, joining customer and prospective room details.
   * Runs inside an optional database transaction.
   * 
   * @param {string} id - Rental request UUID
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object|null>} The rental request details or null
   */
  async getById(id, tx) {
    const client = tx || sql

    const [request] = await client`
      SELECT 
        nct.id,
        nct.khach_hang_id,
        nct.sale_id,
        nct.so_nguoi,
        nct.gioi_tinh_yeu_cau,
        nct.khu_vuc_yeu_cau,
        nct.loai_phong_yeu_cau,
        nct.muc_gia_toi_da::float AS muc_gia_toi_da,
        nct.thoi_gian_vao_o_du_kien,
        nct.thoi_han_thue_du_kien,
        nct.ghi_chu_yeu_cau,
        nct.phuong_thuc_thong_bao,
        nct.trang_thai,
        nct.phong_du_kien_id,
        nct.lich_hen_xem,
        nct.created_at,
        nct.updated_at,
        json_build_object(
          'id', kh.id,
          'ho_ten', kh.ho_ten,
          'so_dien_thoai', kh.so_dien_thoai,
          'email', kh.email,
          'gioi_tinh', kh.gioi_tinh,
          'quoc_tich', kh.quoc_tich,
          'so_cmnd_cccd', kh.so_cmnd_cccd
        ) AS khach_hang,
        CASE 
          WHEN p.id IS NOT NULL THEN
            json_build_object(
              'id', p.id,
              'ma_phong', p.ma_phong,
              'gia_thue_mot_giuong', p.gia_thue_mot_giuong::float,
              'loai_phong', p.loai_phong,
              'gioi_tinh_quy_dinh', p.gioi_tinh_quy_dinh,
              'khu_vuc', p.khu_vuc
            )
          ELSE NULL
        END AS phong_du_kien
      FROM nhu_cau_thue nct
      JOIN khach_hang kh ON nct.khach_hang_id = kh.id
      LEFT JOIN phong p ON nct.phong_du_kien_id = p.id
      WHERE nct.id = ${id}
    `
    return request || null
  },

  /**
   * Search rental requests by customer phone number.
   * 
   * @param {string} soDienThoai - Customer phone number
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Array>} Array of matching rental requests
   */
  async search(soDienThoai, tx) {
    const client = tx || sql
    return await client`
      SELECT 
        nct.id,
        nct.trang_thai,
        nct.so_nguoi,
        nct.loai_phong_yeu_cau,
        nct.phong_du_kien_id,
        kh.ho_ten,
        kh.so_dien_thoai,
        kh.email
      FROM nhu_cau_thue nct
      JOIN khach_hang kh ON nct.khach_hang_id = kh.id
      WHERE kh.so_dien_thoai = ${soDienThoai}
      ORDER BY nct.created_at DESC
    `
  },

  async list({ trang_thai, limit = 10 }, tx) {
    const client = tx || sql
    return await client`
      SELECT 
        nct.id,
        nct.trang_thai,
        nct.so_nguoi,
        nct.loai_phong_yeu_cau,
        nct.phong_du_kien_id,
        nct.created_at,
        kh.ho_ten,
        kh.so_dien_thoai,
        kh.email
      FROM nhu_cau_thue nct
      JOIN khach_hang kh ON nct.khach_hang_id = kh.id
      WHERE nct.trang_thai = ${trang_thai}
      ORDER BY nct.created_at DESC
      LIMIT ${limit}
    `
  }
}

