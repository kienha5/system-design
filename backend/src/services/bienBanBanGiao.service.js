import sql from '../db.js'
import { phongService } from './phong.service.js'

/**
 * Service handling room handover records (UC11).
 */
export const bienBanBanGiaoService = {
  /**
   * Create a new room handover report (Step 1).
   * 
   * @param {Object} input - Validated input data { hop_dong_id, tinh_trang_phong, danh_sach_tai_san }
   * @param {string} quanLyId - UUID of the Manager creating the report
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The created report and warnings
   */
  async create(input, quanLyId, tx) {
    const client = tx || sql

    const {
      hop_dong_id,
      tinh_trang_phong,
      danh_sach_tai_san
    } = input

    // 1. Fetch lease contract details
    const [hopDong] = await client`
      SELECT id, trang_thai
      FROM hop_dong
      WHERE id = ${hop_dong_id}
    `
    if (!hopDong) {
      const err = new Error('Không tìm thấy hợp đồng thuê.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    if (hopDong.trang_thai !== 'HieuLuc') {
      const err = new Error('Hợp đồng không hợp lệ (phải ở trạng thái Hiệu Lực).')
      err.code = 'HOP_DONG_KHONG_HOP_LE'
      err.status = 422
      throw err
    }

    // 2. Verify that the first month's invoice is fully paid
    const [paidInvoice] = await client`
      SELECT id 
      FROM hoa_don 
      WHERE hop_dong_id = ${hop_dong_id} 
        AND trang_thai = 'DaThanhToan'
      LIMIT 1
    `
    if (!paidInvoice) {
      const err = new Error('Hóa đơn kỳ thanh toán đầu tiên của hợp đồng này chưa được thanh toán.')
      err.code = 'HOA_DON_CHUA_THANH_TOAN_DU'
      err.status = 422
      throw err
    }

    // 3. Verify that no handover record exists for this contract
    const [existingBBG] = await client`
      SELECT id 
      FROM bien_ban_ban_giao 
      WHERE hop_dong_id = ${hop_dong_id}
    `
    if (existingBBG) {
      const err = new Error('Hợp đồng này đã có biên bản bàn giao phòng trước đó.')
      err.code = 'BIEN_BAN_DA_TON_TAI'
      err.status = 409
      throw err
    }

    // 4. Check for damaged or missing items in the asset list
    let warning = null
    const hasIssues = danh_sach_tai_san.some(item => 
      item.tinh_trang === 'HuHong' || item.tinh_trang === 'MatMat'
    )
    if (hasIssues) {
      warning = 'CO_VAN_DE_HIEN_TRANG'
    }

    // 5. Generate sequential ma_bien_ban
    const [{ count }] = await client`
      SELECT COUNT(*)::int AS count 
      FROM bien_ban_ban_giao
    `
    const maBienBan = `BBG${String(count + 1).padStart(6, '0')}`

    // 6. Insert new bien_ban_ban_giao record
    const [newBBG] = await client`
      INSERT INTO bien_ban_ban_giao (
        ma_bien_ban,
        hop_dong_id,
        ngay_ban_giao,
        tinh_trang_phong,
        danh_sach_tai_san,
        quan_ly_xac_nhan_id,
        khach_da_ky_xac_nhan
      )
      VALUES (
        ${maBienBan},
        ${hop_dong_id},
        NOW(),
        ${tinh_trang_phong || ''},
        ${JSON.stringify(danh_sach_tai_san)},
        ${quanLyId},
        false
      )
      RETURNING id, ma_bien_ban, hop_dong_id, ngay_ban_giao, tinh_trang_phong, danh_sach_tai_san, khach_da_ky_xac_nhan
    `

    return {
      ...newBBG,
      canh_bao: warning
    }
  },

  /**
   * Update the asset checklist (Manager action prior to final sign-off).
   * 
   * @param {string} id - Handover report UUID
   * @param {Array} danhSach - The updated asset list
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The updated handover report
   */
  async updateDanhSach(id, danhSach, tx) {
    const client = tx || sql

    // 1. Fetch handover record
    const [bbg] = await client`
      SELECT id, khach_da_ky_xac_nhan
      FROM bien_ban_ban_giao
      WHERE id = ${id}
    `
    if (!bbg) {
      const err = new Error('Không tìm thấy biên bản bàn giao phòng.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    if (bbg.khach_da_ky_xac_nhan) {
      const err = new Error('Biên bản bàn giao đã được ký xác nhận, không thể chỉnh sửa.')
      err.code = 'TRANG_THAI_KHONG_HOP_LE'
      err.status = 422
      throw err
    }

    // 2. Update the asset checklist
    const [updated] = await client`
      UPDATE bien_ban_ban_giao
      SET danh_sach_tai_san = ${JSON.stringify(danhSach)}
      WHERE id = ${id}
      RETURNING id, ma_bien_ban, hop_dong_id, ngay_ban_giao, tinh_trang_phong, danh_sach_tai_san, khach_da_ky_xac_nhan
    `

    // Check if updating resolved all issues
    let warning = null
    const hasIssues = danhSach.some(item => 
      item.tinh_trang === 'HuHong' || item.tinh_trang === 'MatMat'
    )
    if (hasIssues) {
      warning = 'CO_VAN_DE_HIEN_TRANG'
    }

    return {
      ...updated,
      canh_bao: warning
    }
  },

  /**
   * Sign and finalize the handover record, transitioning beds and aligning contract start dates.
   * Executed entirely inside a database transaction.
   * 
   * @param {string} id - Handover report UUID
   * @param {string} anhUrl - Public URL of the signed handover sheet photo
   * @param {string} quanLyId - UUID of the Manager confirming the handover
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The finalized handover report
   */
  async xacNhan(id, anhUrl, quanLyId, tx) {
    const client = tx || sql

    // 1. Fetch handover details
    const [bbg] = await client`
      SELECT id, hop_dong_id, danh_sach_tai_san, khach_da_ky_xac_nhan
      FROM bien_ban_ban_giao
      WHERE id = ${id}
    `
    if (!bbg) {
      const err = new Error('Không tìm thấy biên bản bàn giao phòng.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    if (bbg.khach_da_ky_xac_nhan) {
      const err = new Error('Biên bản bàn giao đã được ký xác nhận trước đó.')
      err.code = 'TRANG_THAI_KHONG_HOP_LE'
      err.status = 422
      throw err
    }

    // 2. Enforce zero damaged or missing assets before signature
    const assets = typeof bbg.danh_sach_tai_san === 'string' ? JSON.parse(bbg.danh_sach_tai_san) : bbg.danh_sach_tai_san
    const hasIssues = assets.some(item => 
      item.tinh_trang === 'HuHong' || item.tinh_trang === 'MatMat'
    )
    if (hasIssues) {
      const err = new Error('Không thể ký xác nhận bàn giao khi vẫn còn tài sản bị hư hỏng hoặc mất mát chưa khắc phục.')
      err.code = 'CO_VAN_DE_HIEN_TRANG_CHUA_XU_LY'
      err.status = 422
      throw err
    }

    // 3. Update bien_ban_ban_giao status
    const [finalized] = await client`
      UPDATE bien_ban_ban_giao
      SET khach_da_ky_xac_nhan = true,
          anh_bien_ban_url = ${anhUrl || null}
      WHERE id = ${id}
      RETURNING id, ma_bien_ban, hop_dong_id, ngay_ban_giao, tinh_trang_phong, danh_sach_tai_san, khach_da_ky_xac_nhan, anh_bien_ban_url
    `

    // 4. Retrieve contract and its valid members
    const [hopDong] = await client`
      SELECT id, ngay_bat_dau
      FROM hop_dong
      WHERE id = ${bbg.hop_dong_id}
    `
    if (!hopDong) {
      const err = new Error('Không tìm thấy hợp đồng tương ứng.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    const members = await client`
      SELECT giuong_id 
      FROM thanh_vien_hop_dong 
      WHERE hop_dong_id = ${bbg.hop_dong_id} 
        AND dat_dieu_kien_cu_tru = true
    `

    // 5. Transition valid beds to 'DangThue' (triggers syncTrangThaiPhong automatically)
    for (const m of members) {
      if (m.giuong_id) {
        await phongService.updateTrangThaiGiuong(
          m.giuong_id,
          'DangThue',
          'Khách hàng hoàn tất thủ tục nhận bàn giao phòng, chính thức dời vào ở',
          quanLyId,
          client
        )
      }
    }

    // 6. Align lease start date if today differs from initial contract plan
    const todayStr = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'
    const planDateStr = new Date(hopDong.ngay_bat_dau).toISOString().split('T')[0]

    if (todayStr !== planDateStr) {
      await client`
        UPDATE hop_dong
        SET ngay_bat_dau = ${todayStr}
        WHERE id = ${bbg.hop_dong_id}
      `
    }

    return finalized
  },

  /**
   * Fetch the handover report by lease contract ID.
   * 
   * @param {string} hopDongId - Contract UUID
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object|null>} The handover report details or null
   */
  async getByHopDongId(hopDongId, tx) {
    const client = tx || sql

    const [bbg] = await client`
      SELECT 
        id,
        ma_bien_ban,
        hop_dong_id,
        ngay_ban_giao,
        tinh_trang_phong,
        danh_sach_tai_san,
        anh_bien_ban_url,
        quan_ly_xac_nhan_id,
        khach_da_ky_xac_nhan
      FROM bien_ban_ban_giao
      WHERE hop_dong_id = ${hopDongId}
    `

    return bbg || null
  }
}
