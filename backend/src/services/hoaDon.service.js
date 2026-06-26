import sql from '../db.js'

/**
 * Service handling invoice operations (UC10).
 */
export const hoaDonService = {
  /**
   * Create a new first-month invoice for a lease contract.
   * 
   * @param {Object} input - Validated input data { hop_dong_id, tien_dien, tien_nuoc, tien_dich_vu_khac }
   * @param {string} keToanId - UUID of the Accountant creating the invoice
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The created invoice details
   */
  async create(input, keToanId, tx) {
    const client = tx || sql

    const {
      hop_dong_id,
      tien_dien,
      tien_nuoc,
      tien_dich_vu_khac
    } = input

    // 1. Fetch lease contract details
    const [hopDong] = await client`
      SELECT id, trang_thai, gia_thue_theo_giuong::float AS gia_thue_theo_giuong, ngay_bat_dau
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

    // 2. Compute billing cycle (ky_thanh_toan) from hop_dong.ngay_bat_dau (format 'YYYY-MM')
    const ngayBatDauDate = new Date(hopDong.ngay_bat_dau)
    const year = ngayBatDauDate.getFullYear()
    const month = String(ngayBatDauDate.getMonth() + 1).padStart(2, '0')
    const kyThanhToan = `${year}-${month}`

    // 3. Verify no invoice exists for this contract and cycle
    const [existingInvoice] = await client`
      SELECT id 
      FROM hoa_don 
      WHERE hop_dong_id = ${hop_dong_id} 
        AND ky_thanh_toan = ${kyThanhToan}
    `
    if (existingInvoice) {
      const err = new Error('Hóa đơn cho kỳ thanh toán này đã tồn tại.')
      err.code = 'HOA_DON_DA_TON_TAI'
      err.status = 409
      throw err
    }

    // 4. Count valid members in thanh_vien_hop_dong (dat_dieu_kien_cu_tru = true)
    const [membersCountRes] = await client`
      SELECT COUNT(*)::int AS count 
      FROM thanh_vien_hop_dong 
      WHERE hop_dong_id = ${hop_dong_id} 
        AND dat_dieu_kien_cu_tru = true
    `
    const soGiuongThue = membersCountRes?.count || 0
    if (soGiuongThue === 0) {
      const err = new Error('Không tìm thấy thành viên hợp lệ nào trong hợp đồng.')
      err.code = 'VALIDATION_ERROR'
      err.status = 400
      throw err
    }

    // 5. Calculate money amounts
    const tienThue = hopDong.gia_thue_theo_giuong * soGiuongThue
    const tongTien = tienThue + tien_dien + tien_nuoc + tien_dich_vu_khac

    // 6. Generate sequential ma_hoa_don
    const [{ count }] = await client`
      SELECT COUNT(*)::int AS count 
      FROM hoa_don
    `
    const maHoaDon = `HD${String(count + 1).padStart(6, '0')}`

    // 7. Insert new invoice record
    const [newInvoice] = await client`
      INSERT INTO hoa_don (
        ma_hoa_don,
        hop_dong_id,
        ky_thanh_toan,
        tien_thue,
        tien_dien,
        tien_nuoc,
        tien_dich_vu_khac,
        tong_tien,
        trang_thai
      )
      VALUES (
        ${maHoaDon},
        ${hop_dong_id},
        ${kyThanhToan},
        ${tienThue},
        ${tien_dien},
        ${tien_nuoc},
        ${tien_dich_vu_khac},
        ${tongTien},
        'ChoThanhToan'
      )
      RETURNING id, ma_hoa_don, ky_thanh_toan, tien_thue::float AS tien_thue, tien_dien::float AS tien_dien, tien_nuoc::float AS tien_nuoc, tien_dich_vu_khac::float AS tien_dich_vu_khac, tong_tien::float AS tong_tien, trang_thai
    `

    return newInvoice
  },

  /**
   * Confirm invoice payment (Accountant action).
   * 
   * @param {string} id - Invoice UUID
   * @param {string} hinhThucThanhToan - Payment method ('TienMat' or 'ChuyenKhoan')
   * @param {string} keToanId - UUID of the Accountant confirming payment
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The updated invoice details
   */
  async xacNhanThanhToan(id, hinhThucThanhToan, keToanId, tx) {
    const client = tx || sql

    // 1. Fetch invoice details
    const [invoice] = await client`
      SELECT id, trang_thai
      FROM hoa_don
      WHERE id = ${id}
    `
    if (!invoice) {
      const err = new Error('Không tìm thấy hóa đơn cần xác nhận thanh toán.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    if (invoice.trang_thai !== 'ChoThanhToan') {
      const err = new Error('Hóa đơn không ở trạng thái Chờ Thanh Toán.')
      err.code = 'TRANG_THAI_KHONG_HOP_LE'
      err.status = 422
      throw err
    }

    // 2. Update invoice status to DaThanhToan
    const [updated] = await client`
      UPDATE hoa_don
      SET trang_thai = 'DaThanhToan',
          ngay_thanh_toan = NOW(),
          hinh_thuc_thanh_toan = ${hinhThucThanhToan},
          nguoi_xac_nhan_id = ${keToanId}
      WHERE id = ${id}
      RETURNING id, ma_hoa_don, trang_thai, ngay_thanh_toan
    `

    return updated
  },

  /**
   * Get invoice details by ID, joining contract, room, and customer info.
   * 
   * @param {string} id - Invoice UUID
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object|null>} The invoice details or null
   */
  async getById(id, tx) {
    const client = tx || sql

    const [invoice] = await client`
      SELECT 
        hd.id,
        hd.ma_hoa_don,
        hd.hop_dong_id,
        hd.ky_thanh_toan,
        hd.tien_thue::float AS tien_thue,
        hd.tien_dien::float AS tien_dien,
        hd.tien_nuoc::float AS tien_nuoc,
        hd.tien_dich_vu_khac::float AS tien_dich_vu_khac,
        hd.tong_tien::float AS tong_tien,
        hd.ngay_thanh_toan,
        hd.hinh_thuc_thanh_toan,
        hd.trang_thai,
        hd.nguoi_xac_nhan_id,
        h.ma_hop_dong,
        h.phong_id,
        p.ma_phong,
        kh.ho_ten AS khach_hang_ho_ten,
        kh.so_dien_thoai AS khach_hang_so_dien_thoai
      FROM hoa_don hd
      JOIN hop_dong h ON hd.hop_dong_id = h.id
      JOIN phong p ON h.phong_id = p.id
      JOIN phieu_dat_coc pdc ON h.phieu_dat_coc_id = pdc.id
      JOIN khach_hang kh ON pdc.khach_hang_id = kh.id
      WHERE hd.id = ${id}
    `

    return invoice || null
  },

  /**
   * Get all invoices associated with a lease contract.
   * 
   * @param {string} hopDongId - Contract UUID
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Array>} List of invoices
   */
  async getByHopDongId(hopDongId, tx) {
    const client = tx || sql

    const results = await client`
      SELECT 
        id,
        ma_hoa_don,
        hop_dong_id,
        ky_thanh_toan,
        tien_thue::float AS tien_thue,
        tien_dien::float AS tien_dien,
        tien_nuoc::float AS tien_nuoc,
        tien_dich_vu_khac::float AS tien_dich_vu_khac,
        hd.tong_tien::float AS tong_tien,
        ngay_thanh_toan,
        hinh_thuc_thanh_toan,
        trang_thai
      FROM hoa_don
      WHERE hop_dong_id = ${hopDongId}
      ORDER BY ky_thanh_toan DESC
    `

    return results
  }
}
