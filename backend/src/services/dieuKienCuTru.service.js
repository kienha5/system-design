import sql from '../db.js'

/**
 * Service handling residence condition checks (UC09).
 */
export const dieuKienCuTruService = {
  /**
   * Check residence conditions for a list of customers against a room.
   * This is a pure query function that does not modify the database.
   * 
   * @param {string} phongId - Room UUID
   * @param {Array} danhSachKhach - List of { khach_hang_id, giuong_id }
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} { tat_ca_dat: boolean, chi_tiet: Array }
   */
  async kiemTraDieuKienCuTru(phongId, danhSachKhach, tx) {
    const client = tx || sql

    // 1. Validate inputs
    if (!phongId) {
      const err = new Error('phong_id là bắt buộc.')
      err.code = 'VALIDATION_ERROR'
      err.status = 400
      throw err
    }

    if (!Array.isArray(danhSachKhach) || danhSachKhach.length === 0) {
      const err = new Error('Danh sách khách hàng kiểm tra không được để trống.')
      err.code = 'VALIDATION_ERROR'
      err.status = 400
      throw err
    }

    // 2. Fetch room details
    const [room] = await client`
      SELECT id, ma_phong, loai_phong, gioi_tinh_quy_dinh
      FROM phong
      WHERE id = ${phongId}
    `
    if (!room) {
      const err = new Error('Không tìm thấy phòng kiểm tra điều kiện.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    // 3. Check for duplicate giuong_id in input (cannot map two people to the same bed)
    const beds = danhSachKhach.map(k => k.giuong_id).filter(Boolean)
    const uniqueBeds = new Set(beds)
    if (beds.length !== uniqueBeds.size) {
      const err = new Error('Phát hiện trùng lặp giường trong danh sách thành viên (hai người không thể ở cùng một giường).')
      err.code = 'VALIDATION_ERROR'
      err.status = 400
      throw err
    }

    // 4. Batch query all customers
    const customerIds = danhSachKhach.map(k => k.khach_hang_id)
    const customers = await client`
      SELECT id, ho_ten, gioi_tinh, so_cmnd_cccd
      FROM khach_hang
      WHERE id = ANY(${customerIds})
    `

    // Check if all requested customer IDs exist in the DB
    if (customers.length !== new Set(customerIds).size) {
      const err = new Error('Một hoặc nhiều khách hàng trong danh sách không tồn tại.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    const customerMap = new Map(customers.map(c => [c.id, c]))

    // 5. Evaluate rules for each customer
    const chiTiet = danhSachKhach.map(item => {
      const customer = customerMap.get(item.khach_hang_id)
      let dat = true
      let ly_do = null

      // Rule 1: Gender policy check
      if (room.gioi_tinh_quy_dinh && customer.gioi_tinh !== room.gioi_tinh_quy_dinh) {
        dat = false
        ly_do = 'Không khớp giới tính quy định của phòng'
      }
      // Rule 2: ID paper check (CCCD/CMND)
      else if (!customer.so_cmnd_cccd || customer.so_cmnd_cccd.trim() === '') {
        dat = false
        ly_do = 'Thiếu thông tin CMND/CCCD'
      }

      return {
        khach_hang_id: item.khach_hang_id,
        ho_ten: customer.ho_ten,
        giuong_id: item.giuong_id || null,
        dat,
        ly_do
      }
    })

    const tat_ca_dat = chiTiet.every(c => c.dat)

    return {
      tat_ca_dat,
      chi_tiet: chiTiet
    }
  }
}
