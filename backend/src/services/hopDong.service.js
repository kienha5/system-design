import sql from '../db.js'
import { phongService } from './phong.service.js'
import { dieuKienCuTruService } from './dieuKienCuTru.service.js'

/**
 * Service handling lease contracts (UC08).
 */
export const hopDongService = {
  /**
   * Create a new lease contract, performing residency checks and locking beds.
   * Executed entirely inside a database transaction.
   * 
   * @param {Object} input - Validated request body
   * @param {string} quanLyId - UUID of the Manager creating the contract
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The created contract and warning flags
   */
  async create(input, quanLyId, tx) {
    const client = tx || sql

    const {
      phieu_dat_coc_id,
      ngay_bat_dau,
      ngay_ket_thuc,
      ky_thanh_toan,
      thanh_vien
    } = input

    // 1. Fetch and verify deposit sheet
    const [phieu] = await client`
      SELECT id, trang_thai, phong_id, so_tien_coc, so_giuong_thue, chi_nhanh_id
      FROM phieu_dat_coc
      WHERE id = ${phieu_dat_coc_id}
    `
    if (!phieu) {
      const err = new Error('Không tìm thấy phiếu đặt cọc.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    if (phieu.trang_thai !== 'DaThanhToan') {
      const err = new Error('Phiếu đặt cọc chưa được xác nhận thanh toán.')
      err.code = 'PHIEU_COC_CHUA_XAC_NHAN'
      err.status = 422
      throw err
    }

    // 2. Verify unique phieu_dat_coc_id in hop_dong
    const [existingContract] = await client`
      SELECT id 
      FROM hop_dong 
      WHERE phieu_dat_coc_id = ${phieu_dat_coc_id}
    `
    if (existingContract) {
      const err = new Error('Phiếu đặt cọc này đã được sử dụng để lập hợp đồng trước đó.')
      err.code = 'PHIEU_COC_DA_CO_HOP_DONG'
      err.status = 409
      throw err
    }

    // 3. Fetch room details
    const [room] = await client`
      SELECT id, loai_phong, gia_thue_mot_giuong
      FROM phong
      WHERE id = ${phieu.phong_id}
    `
    if (!room) {
      const err = new Error('Không tìm thấy phòng tương ứng.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    // 4. Run UC09 KiemTraDieuKienCuTru directly in-memory
    const checkResult = await dieuKienCuTruService.kiemTraDieuKienCuTru(phieu.phong_id, thanh_vien, client)
    
    // Warnings list
    const warnings = []
    
    const validMembers = checkResult.chi_tiet.filter(m => m.dat)
    const failedMembers = checkResult.chi_tiet.filter(m => !m.dat)

    // Evaluate residency conditions according to rental mode
    const isSingleRental = room.loai_phong !== 'NguyenPhong' || thanh_vien.length === 1

    if (isSingleRental) {
      // Single/shared rental: any disqualified member results in immediate failure
      if (!checkResult.tat_ca_dat) {
        const firstFailed = failedMembers[0]
        const err = new Error(`Khách hàng ${firstFailed.ho_ten} không đạt điều kiện cư trú: ${firstFailed.ly_do}.`)
        err.code = 'DIEU_KIEN_CU_TRU_KHONG_DAT'
        err.status = 422
        throw err
      }
    } else {
      // Group rental: must have at least 1 valid member
      if (validMembers.length === 0) {
        const err = new Error('Toàn bộ thành viên trong nhóm không đạt điều kiện cư trú.')
        err.code = 'DIEU_KIEN_CU_TRU_KHONG_DAT'
        err.status = 422
        throw err
      }

      // If there are any disqualified members, flag warning
      if (failedMembers.length > 0) {
        warnings.push('CO_THANH_VIEN_BI_LOAI')
      }
    }

    // 5. Price snapshot & warning comparison
    const currentPrice = Number(room.gia_thue_mot_giuong)
    const depositUnitPrice = Number(phieu.so_tien_coc) / 2 / phieu.so_giuong_thue

    if (currentPrice !== depositUnitPrice) {
      warnings.push('GIA_THUE_DA_THAY_DOI')
    }

    // 6. Generate sequential ma_hop_dong
    const [{ count }] = await client`
      SELECT COUNT(*)::int AS count 
      FROM hop_dong
    `
    const maHopDong = `HD${String(count + 1).padStart(6, '0')}`

    // 7. Insert hop_dong record
    const [newContract] = await client`
      INSERT INTO hop_dong (
        ma_hop_dong,
        phieu_dat_coc_id,
        phong_id,
        ngay_ky,
        ngay_bat_dau,
        ngay_ket_thuc,
        gia_thue_theo_giuong,
        ky_thanh_toan,
        trang_thai,
        quan_ly_lap_id
      )
      VALUES (
        ${maHopDong},
        ${phieu_dat_coc_id},
        ${phieu.phong_id},
        NOW(),
        ${new Date(ngay_bat_dau)},
        ${ngay_ket_thuc ? new Date(ngay_ket_thuc) : null},
        ${currentPrice},
        ${ky_thanh_toan || 'Thang'},
        'HieuLuc',
        ${quanLyId}
      )
      RETURNING id, ma_hop_dong, trang_thai, ngay_ky, gia_thue_theo_giuong::float AS gia_thue_theo_giuong
    `

    // 8. Insert thanh_vien_hop_dong for VALID members only
    for (const m of validMembers) {
      await client`
        INSERT INTO thanh_vien_hop_dong (
          hop_dong_id,
          khach_hang_id,
          giuong_id,
          dat_dieu_kien_cu_tru
        )
        VALUES (
          ${newContract.id},
          ${m.khach_hang_id},
          ${m.giuong_id},
          true
        )
      `

      // 9. Bed transition logic: only transition beds belonging to valid members
      if (m.giuong_id) {
        await phongService.updateTrangThaiGiuong(
          m.giuong_id,
          'DangThue',
          'Khách hàng ký hợp đồng chính thức, chuyển vào ở',
          quanLyId,
          client
        )
      }
    }

    return {
      id: newContract.id,
      ma_hop_dong: newContract.ma_hop_dong,
      trang_thai: newContract.trang_thai,
      ngay_ky: newContract.ngay_ky,
      gia_thue_theo_giuong: newContract.gia_thue_theo_giuong,
      thanh_vien: validMembers.map(m => ({
        khach_hang_id: m.khach_hang_id,
        giuong_id: m.giuong_id,
        dat_dieu_kien_cu_tru: true
      })),
      canh_bao: warnings
    }
  },

  /**
   * Retrieve contract details by ID with joined members, customer details, and room.
   * 
   * @param {string} id - Contract UUID
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object|null>} The contract details or null
   */
  async getById(id, tx) {
    const client = tx || sql

    const [contract] = await client`
      SELECT 
        hd.id,
        hd.ma_hop_dong,
        hd.phieu_dat_coc_id,
        hd.phong_id,
        hd.ngay_ky,
        hd.ngay_bat_dau,
        hd.ngay_ket_thuc,
        hd.gia_thue_theo_giuong::float AS gia_thue_theo_giuong,
        hd.ky_thanh_toan,
        hd.trang_thai,
        hd.quan_ly_lap_id,
        p.ma_phong,
        p.loai_phong,
        p.khu_vuc
      FROM hop_dong hd
      JOIN phong p ON hd.phong_id = p.id
      WHERE hd.id = ${id}
    `

    if (!contract) return null

    // Fetch members
    const members = await client`
      SELECT 
        tv.id,
        tv.khach_hang_id,
        tv.giuong_id,
        tv.dat_dieu_kien_cu_tru,
        kh.ho_ten,
        kh.so_dien_thoai,
        kh.email,
        g.ma_giuong
      FROM thanh_vien_hop_dong tv
      JOIN khach_hang kh ON tv.khach_hang_id = kh.id
      LEFT JOIN giuong g ON tv.giuong_id = g.id
      WHERE tv.hop_dong_id = ${id}
    `

    return {
      ...contract,
      thanh_vien: members
    }
  }
}
