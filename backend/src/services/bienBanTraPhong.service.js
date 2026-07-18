import sql from '../db.js'

/**
 * Service handling checkout reports (UC12, UC13, UC14).
 */
export const bienBanTraPhongService = {
  /**
   * Register a new room checkout request (UC12).
   * 
   * @param {Object} input - Validated input data { hop_dong_id, ngay_tra_phong_du_kien }
   * @param {string} saleId - UUID of the Sale registering the checkout
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The created checkout report
   */
  async create(input, saleId, tx) {
    const client = tx || sql
    const { hop_dong_id, ngay_tra_phong_du_kien } = input

    // 1. Verify contract exists and is active ('HieuLuc')
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

    // 2. Verify unique hop_dong_id in bien_ban_tra_phong
    const [existingBBT] = await client`
      SELECT id 
      FROM bien_ban_tra_phong
      WHERE hop_dong_id = ${hop_dong_id}
    `
    if (existingBBT) {
      const err = new Error('Hợp đồng này đã được đăng ký trả phòng trước đó.')
      err.code = 'DA_DANG_KY_TRA_PHONG'
      err.status = 409
      throw err
    }

    // 3. Generate sequential ma_bien_ban (e.g. BBT000001)
    const [{ count }] = await client`
      SELECT COUNT(*)::int AS count
      FROM bien_ban_tra_phong
    `
    const maBienBan = `BBT${String(count + 1).padStart(6, '0')}`

    // 4. Create record
    const [newBBT] = await client`
      INSERT INTO bien_ban_tra_phong (
        ma_bien_ban,
        hop_dong_id,
        ngay_dang_ky_tra,
        ngay_tra_phong_du_kien,
        ngay_tra_thuc_te,
        trang_thai,
        chi_phi_phat_sinh_tong,
        so_tien_khach_can_tra_them,
        khach_xac_nhan_doi_soat
      )
      VALUES (
        ${maBienBan},
        ${hop_dong_id},
        NOW(),
        ${new Date(ngay_tra_phong_du_kien)},
        NULL,
        'ChoDoiSoat',
        0,
        0,
        false
      )
      RETURNING id, ma_bien_ban, hop_dong_id, ngay_dang_ky_tra, ngay_tra_phong_du_kien, trang_thai
    `

    return newBBT;
  },

  /**
   * Update the scheduled checkout date (UC12).
   * 
   * @param {string} id - Checkout report UUID
   * @param {string} ngayDuKien - New scheduled date
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The updated checkout report
   */
  async capNhatNgayHen(id, ngayDuKien, tx) {
    const client = tx || sql

    // 1. Verify checkout report exists
    const [bbt] = await client`
      SELECT id, trang_thai
      FROM bien_ban_tra_phong
      WHERE id = ${id}
    `
    if (!bbt) {
      const err = new Error('Không tìm thấy biên bản trả phòng.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    // 2. Verify status is 'ChoDoiSoat'
    if (bbt.trang_thai !== 'ChoDoiSoat') {
      const err = new Error('Chỉ có thể đổi ngày hẹn khi biên bản đang ở trạng thái Chờ Đối Soát.')
      err.code = 'TRANG_THAI_KHONG_HOP_LE'
      err.status = 422
      throw err
    }

    // 3. Update date
    const [updated] = await client`
      UPDATE bien_ban_tra_phong
      SET ngay_tra_phong_du_kien = ${new Date(ngayDuKien)}
      WHERE id = ${id}
      RETURNING id, ma_bien_ban, hop_dong_id, ngay_dang_ky_tra, ngay_tra_phong_du_kien, trang_thai
    `

    return updated
  },

  /**
   * Record asset audit results (UC13).
   * 
   * @param {string} id - Checkout report UUID
   * @param {Object} input - { ngay_tra_thuc_te, danh_sach_doi_soat }
   * @param {string} quanLyId - UUID of Quản lý conducting the audit
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The updated checkout report
   */
  async doSoat(id, input, quanLyId, tx) {
    const client = tx || sql
    const { ngay_tra_thuc_te, danh_sach_doi_soat } = input

    // 1. Fetch checkout report details
    const [bbt] = await client`
      SELECT id, hop_dong_id, trang_thai
      FROM bien_ban_tra_phong
      WHERE id = ${id}
    `
    if (!bbt) {
      const err = new Error('Không tìm thấy biên bản trả phòng.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    // 2. Verify status is 'ChoDoiSoat'
    if (bbt.trang_thai !== 'ChoDoiSoat') {
      const err = new Error('Chỉ có thể đối soát khi biên bản đang ở trạng thái Chờ Đối Soát.')
      err.code = 'TRANG_THAI_KHONG_HOP_LE'
      err.status = 422
      throw err
    }

    // 3. Check for original handover baseline
    const [bbg] = await client`
      SELECT id, danh_sach_tai_san
      FROM bien_ban_ban_giao
      WHERE hop_dong_id = ${bbt.hop_dong_id}
    `

    let warning = null
    if (!bbg) {
      warning = 'KHONG_CO_BIEN_BAN_BAN_GIAO'
    }

    // Calculate total compensation from audit list
    const chi_phi_sua_chua_boi_thuong = (danh_sach_doi_soat || []).reduce(
      (sum, item) => sum + Number(item.chi_phi_boi_thuong || 0),
      0
    )

    // 4. Update the checkout record
    const [updated] = await client`
      UPDATE bien_ban_tra_phong
      SET 
        danh_sach_doi_soat = ${JSON.stringify(danh_sach_doi_soat)},
        ngay_tra_thuc_te = ${new Date(ngay_tra_thuc_te)},
        chi_phi_sua_chua_boi_thuong = ${chi_phi_sua_chua_boi_thuong},
        trang_thai = 'ChoXacNhan',
        quan_ly_xac_nhan_id = ${quanLyId}
      WHERE id = ${id}
      RETURNING id, ma_bien_ban, trang_thai, ngay_tra_thuc_te, danh_sach_doi_soat, chi_phi_sua_chua_boi_thuong
    `

    return {
      ...updated,
      canh_bao: warning
    }
  },

  /**
   * Accountant calculates and records checkout deductions (UC14).
   * 
   * @param {string} id - Checkout report UUID
   * @param {Object} input - Deduction details
   * @param {string} keToanId - UUID of Kế toán calculating deductions
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The updated checkout report
   */
  async khauTru(id, input, keToanId, tx) {
    const client = tx || sql

    const ty_le_hoan_coc = Number(input.ty_le_hoan_coc)
    const tien_thue_con_no = Number(input.tien_thue_con_no || 0)
    const tien_dien_nuoc_dich_vu = Number(input.tien_dien_nuoc_dich_vu || 0)
    const chi_phi_sua_chua_boi_thuong = Number(input.chi_phi_sua_chua_boi_thuong || 0)
    const tien_phat_vi_pham = Number(input.tien_phat_vi_pham || 0)

    // 1. Verify checkout report exists and is in 'ChoXacNhan'
    const [bbt] = await client`
      SELECT id, trang_thai
      FROM bien_ban_tra_phong
      WHERE id = ${id}
    `
    if (!bbt) {
      const err = new Error('Không tìm thấy biên bản trả phòng.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    if (bbt.trang_thai !== 'ChoXacNhan') {
      const err = new Error('Chỉ có thể lập khấu trừ khi biên bản đang ở trạng thái Chờ Xác Nhận.')
      err.code = 'TRANG_THAI_KHONG_HOP_LE'
      err.status = 422
      throw err
    }

    // 2. Fetch original deposit amount from phieu_dat_coc
    const [depositSheet] = await client`
      SELECT pdc.so_tien_coc
      FROM bien_ban_tra_phong bbt
      JOIN hop_dong hd ON bbt.hop_dong_id = hd.id
      JOIN phieu_dat_coc pdc ON hd.phieu_dat_coc_id = pdc.id
      WHERE bbt.id = ${id}
    `
    const so_tien_coc = Number(depositSheet?.so_tien_coc || 0)

    // Check if the accountant is overriding the suggested rate
    const [row] = await client`
      SELECT 
        bbtp.ngay_tra_thuc_te,
        hd.ngay_ky,
        hd.ngay_bat_dau,
        hd.ngay_ket_thuc
      FROM bien_ban_tra_phong bbtp
      JOIN hop_dong hd ON hd.id = bbtp.hop_dong_id
      WHERE bbtp.id = ${id}
    `
    if (row) {
      const ngayTra = row.ngay_tra_thuc_te || new Date()
      const tyLeGoiY = tinhTyLeHoanCocGoiY(row, ngayTra)
      if (tyLeGoiY !== ty_le_hoan_coc) {
        console.log(`[DEBUG] Kế toán override tỷ lệ hoàn cọc từ gợi ý ${tyLeGoiY}% thành ${ty_le_hoan_coc}% cho biên bản ${id}`)
      }
    }

    // 3. Compute costs & balances
    const chi_phi_phat_sinh_tong = tien_thue_con_no
      + tien_dien_nuoc_dich_vu
      + chi_phi_sua_chua_boi_thuong
      + tien_phat_vi_pham

    const tien_coc_duoc_hoan = so_tien_coc * (ty_le_hoan_coc / 100)

    let so_tien_hoan_khach = 0
    let so_tien_khach_can_tra_them = 0

    if (tien_coc_duoc_hoan >= chi_phi_phat_sinh_tong) {
      so_tien_hoan_khach = tien_coc_duoc_hoan - chi_phi_phat_sinh_tong
      so_tien_khach_can_tra_them = 0
    } else {
      so_tien_hoan_khach = 0
      so_tien_khach_can_tra_them = chi_phi_phat_sinh_tong - tien_coc_duoc_hoan
    }

    // 4. Update checkout report
    const [updated] = await client`
      UPDATE bien_ban_tra_phong
      SET
        chi_phi_phat_sinh_tong = ${chi_phi_phat_sinh_tong},
        ty_le_hoan_coc = ${ty_le_hoan_coc},
        so_tien_hoan_khach = ${so_tien_hoan_khach},
        so_tien_khach_can_tra_them = ${so_tien_khach_can_tra_them},
        tien_thue_con_no = ${tien_thue_con_no},
        tien_dien_nuoc_dich_vu = ${tien_dien_nuoc_dich_vu},
        chi_phi_sua_chua_boi_thuong = ${chi_phi_sua_chua_boi_thuong},
        tien_phat_vi_pham = ${tien_phat_vi_pham},
        ke_toan_xac_nhan_id = ${keToanId}
      WHERE id = ${id}
      RETURNING id, chi_phi_phat_sinh_tong, ty_le_hoan_coc, so_tien_hoan_khach, so_tien_khach_can_tra_them, trang_thai, tien_thue_con_no, tien_dien_nuoc_dich_vu, chi_phi_sua_chua_boi_thuong, tien_phat_vi_pham
    `

    return updated
  },

  /**
   * Confirm client agreement with checkout details (UC14).
   * 
   * @param {string} id - Checkout report UUID
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<Object>} The updated checkout report
   */
  async xacNhanKhach(id, tx) {
    const client = tx || sql

    // 1. Fetch checkout report details
    const [bbt] = await client`
      SELECT id, trang_thai, ke_toan_xac_nhan_id
      FROM bien_ban_tra_phong
      WHERE id = ${id}
    `
    if (!bbt) {
      const err = new Error('Không tìm thấy biên bản trả phòng.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    // 2. Verify status is 'ChoXacNhan'
    if (bbt.trang_thai !== 'ChoXacNhan') {
      const err = new Error('Chỉ có thể xác nhận khi biên bản đang ở trạng thái Chờ Xác Nhận.')
      err.code = 'TRANG_THAI_KHONG_HOP_LE'
      err.status = 422
      throw err
    }

    // 3. Verify deductions are already created
    if (!bbt.ke_toan_xac_nhan_id) {
      const err = new Error('Phiếu khấu trừ chi phí chưa được lập bởi Kế Toán.')
      err.code = 'KHAU_TRU_CHUA_DUOC_LAP'
      err.status = 422
      throw err
    }

    // 4. Update confirmation
    const [updated] = await client`
      UPDATE bien_ban_tra_phong
      SET khach_xac_nhan_doi_soat = true
      WHERE id = ${id}
      RETURNING id, khach_xac_nhan_doi_soat, trang_thai
    `

    return updated
  },

  /**
   * Get a checkout report by ID joined with baseline handover and contract info.
   * 
   * @param {string} id - Checkout report UUID
   * @returns {Promise<Object>} The checkout report details
   */
  async getById(id) {
    // 1. Fetch main checkout report with joined contract, customer and room details
    const [bbt] = await sql`
      SELECT 
        bbt.*,
        hd.ma_hop_dong,
        hd.ngay_bat_dau AS ngay_bat_dau_hop_dong,
        hd.trang_thai AS trang_thai_hop_dong,
        p.ma_phong,
        p.id AS phong_id,
        p.gia_thue_mot_giuong,
        kh.ho_ten AS ten_khach_hang,
        kh.so_dien_thoai AS sdt_khach_hang,
        pdc.so_tien_coc AS so_tien_coc_goc
      FROM bien_ban_tra_phong bbt
      JOIN hop_dong hd ON bbt.hop_dong_id = hd.id
      JOIN phieu_dat_coc pdc ON hd.phieu_dat_coc_id = pdc.id
      JOIN khach_hang kh ON pdc.khach_hang_id = kh.id
      JOIN phong p ON hd.phong_id = p.id
      WHERE bbt.id = ${id}
    `
    if (!bbt) return null

    // Format numbers
    bbt.chi_phi_phat_sinh_tong = Number(bbt.chi_phi_phat_sinh_tong)
    bbt.so_tien_khach_can_tra_them = Number(bbt.so_tien_khach_can_tra_them)
    if (bbt.so_tien_hoan_khach !== null) bbt.so_tien_hoan_khach = Number(bbt.so_tien_hoan_khach)
    if (bbt.ty_le_hoan_coc !== null) bbt.ty_le_hoan_coc = Number(bbt.ty_le_hoan_coc)
    bbt.so_tien_coc_goc = Number(bbt.so_tien_coc_goc)
    bbt.gia_thue_mot_giuong = Number(bbt.gia_thue_mot_giuong)
    bbt.tien_thue_con_no = Number(bbt.tien_thue_con_no || 0)
    bbt.tien_dien_nuoc_dich_vu = Number(bbt.tien_dien_nuoc_dich_vu || 0)
    bbt.chi_phi_sua_chua_boi_thuong = Number(bbt.chi_phi_sua_chua_boi_thuong || 0)
    bbt.tien_phat_vi_pham = Number(bbt.tien_phat_vi_pham || 0)

    // 2. Fetch baseline handover report if exists for same contract
    const [bbg] = await sql`
      SELECT id, ma_bien_ban, ngay_ban_giao, tinh_trang_phong, danh_sach_tai_san
      FROM bien_ban_ban_giao
      WHERE hop_dong_id = ${bbt.hop_dong_id}
    `

    return {
      ...bbt,
      bien_ban_ban_giao: bbg || null
    }
  },

  /**
   * Get suggested deposit refund rate based on business rules (UC14).
   */
  async getGoiYTyLe(bienBanId) {
    const [row] = await sql`
      SELECT
        bbtp.id,
        bbtp.hop_dong_id,
        bbtp.ngay_tra_thuc_te,
        hd.ngay_ky,
        hd.ngay_bat_dau,
        hd.ngay_ket_thuc
      FROM bien_ban_tra_phong bbtp
      JOIN hop_dong hd ON hd.id = bbtp.hop_dong_id
      WHERE bbtp.id = ${bienBanId}
    `

    if (!row) {
      const err = new Error('Không tìm thấy biên bản trả phòng.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    const ngayTra = row.ngay_tra_thuc_te || new Date()
    const tyLe = tinhTyLeHoanCocGoiY(row, ngayTra)

    let soThangLuuTru = null
    if (row.ngay_bat_dau) {
      const soNgay = (new Date(ngayTra) - new Date(row.ngay_bat_dau)) / (1000 * 60 * 60 * 24)
      soThangLuuTru = Math.floor(soNgay / 30)
    }

    return {
      ty_le_goi_y: tyLe,
      so_thang_luu_tru: soThangLuuTru,
      ly_do: tinhLyDoHoanCoc(tyLe)
    }
  },

  /**
   * Get a checkout report by contract ID.
   * 
   * @param {string} hopDongId - Contract UUID
   * @returns {Promise<Object>} The checkout report details
   */
  async getByHopDongId(hopDongId) {
    const [bbt] = await sql`
      SELECT id, ma_bien_ban, trang_thai
      FROM bien_ban_tra_phong
      WHERE hop_dong_id = ${hopDongId}
    `
    return bbt || null
  }
}

/**
 * Tính tỷ lệ hoàn cọc gợi ý theo quy định đề bài CSC12004.
 */
function tinhTyLeHoanCocGoiY(hopDong, ngayTra) {
  const ngayTraDate = new Date(ngayTra)

  // Case 1: chưa có HĐ (hop_dong null hoặc chưa có ngay_ky)
  if (!hopDong || !hopDong.ngay_ky) {
    return 80
  }

  // Case 4: hết hạn HĐ
  if (hopDong.ngay_ket_thuc) {
    const ngayKetThuc = new Date(hopDong.ngay_ket_thuc)
    if (ngayTraDate >= ngayKetThuc) {
      return 100
    }
  }

  // Tính số tháng lưu trú (từ ngay_bat_dau đến ngay_tra)
  const ngayBatDau = new Date(hopDong.ngay_bat_dau)
  const soNgayLuuTru = (ngayTraDate - ngayBatDau) / (1000 * 60 * 60 * 24)
  const soThangLuuTru = soNgayLuuTru / 30

  // Case 3: > 6 tháng
  if (soThangLuuTru > 6) {
    return 70
  }

  // Case 2: <= 6 tháng
  return 50
}

/**
 * Helper giải thích lý do để hiển thị trên FE
 */
function tinhLyDoHoanCoc(tyLe) {
  if (tyLe === 80) return 'Chưa ký hợp đồng thuê'
  if (tyLe === 100) return 'Hết hạn hợp đồng thuê'
  if (tyLe === 70) return 'Đã ký HĐ, lưu trú trên 6 tháng'
  if (tyLe === 50) return 'Đã ký HĐ, lưu trú dưới 6 tháng'
  return ''
}
