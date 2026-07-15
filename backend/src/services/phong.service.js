import sql from '../db.js'
import { traceService } from '../utils/logger.js'

/**
 * Service handling room and bed inquiries and status transitions.
 */
const service = {
  /**
   * Search rooms based on criteria and compute available beds.
   * 
   * @param {Object} filters - Validated query filters
   * @returns {Promise<{rooms: Array, total: number}>}
   */
  async searchPhong(filters) {
    const {
      chi_nhanh_id,
      khu_vuc,
      loai_phong,
      gia_tu,
      gia_den,
      gioi_tinh_quy_dinh,
      trang_thai,
      page,
      pageSize
    } = filters

    const conditions = []

    if (chi_nhanh_id) {
      conditions.push(sql`p.chi_nhanh_id = ${chi_nhanh_id}`)
    }
    if (khu_vuc) {
      conditions.push(sql`p.khu_vuc = ${khu_vuc}`)
    }
    if (loai_phong) {
      conditions.push(sql`p.loai_phong = ${loai_phong}`)
    }
    if (gioi_tinh_quy_dinh) {
      conditions.push(sql`p.gioi_tinh_quy_dinh = ${gioi_tinh_quy_dinh}`)
    }
    
    // Default to 'Trong' if no trang_thai filter is provided
    if (trang_thai) {
      conditions.push(sql`p.trang_thai = ${trang_thai}`)
    } else {
      conditions.push(sql`p.trang_thai = 'Trong'`)
    }

    if (gia_tu !== undefined) {
      conditions.push(sql`p.gia_thue_mot_giuong >= ${gia_tu}`)
    }
    if (gia_den !== undefined) {
      conditions.push(sql`p.gia_thue_mot_giuong <= ${gia_den}`)
    }

    const whereClause = conditions.length > 0
      ? sql`WHERE ${conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`)}`
      : sql``

    // 1. Count total matching records for pagination
    const [countResult] = await sql`
      SELECT COUNT(*)::int AS total
      FROM phong p
      ${whereClause}
    `
    const total = countResult?.total || 0

    // 2. Query paginated results with joined chi_nhanh and computed so_giuong_trong
    const offset = (page - 1) * pageSize
    const limit = pageSize

    const rooms = await sql`
      SELECT 
        p.id, 
        p.ma_phong, 
        p.loai_phong, 
        p.suc_chua_toi_da, 
        p.gia_thue_mot_giuong, 
        p.khu_vuc, 
        p.gioi_tinh_quy_dinh, 
        p.trang_thai,
        json_build_object('id', c.id, 'ten_chi_nhanh', c.ten_chi_nhanh) AS chi_nhanh,
        (
          SELECT COUNT(*)::int 
          FROM giuong g 
          WHERE g.phong_id = p.id AND g.trang_thai = 'Trong'
        ) AS so_giuong_trong
      FROM phong p
      JOIN chi_nhanh c ON p.chi_nhanh_id = c.id
      ${whereClause}
      ORDER BY p.gia_thue_mot_giuong ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    // Convert decimal string values to JS numbers for accurate JSON responses
    const formattedRooms = rooms.map(room => ({
      ...room,
      gia_thue_mot_giuong: Number(room.gia_thue_mot_giuong)
    }))

    return { rooms: formattedRooms, total }
  },

  /**
   * Search beds inside a specific room.
   * 
   * @param {string} phongId - UUID of the room
   * @param {string} [trangThai] - Optional bed status filter (defaults to 'Trong')
   * @returns {Promise<Array>}
   */
  async searchGiuong(phongId, trangThai) {
    const beds = await sql`
      SELECT id, ma_giuong, trang_thai
      FROM giuong
      WHERE phong_id = ${phongId}
        AND trang_thai = ${trangThai || 'Trong'}
      ORDER BY ma_giuong ASC
    `
    return beds
  },

  /**
   * Search default assets for a specific room.
   * 
   * @param {string} phongId - Room UUID
   * @returns {Promise<Array>}
   */
  async getTaiSanPhong(phongId) {
    const assets = await sql`
      SELECT id, phong_id, ten_tai_san AS ten, so_luong, 'Tot'::varchar AS tinh_trang, ''::varchar AS ghi_chu
      FROM tai_san_phong
      WHERE phong_id = ${phongId}
      ORDER BY ten_tai_san ASC
    `
    return assets
  },

  // =========================================================================
  // UC03 - STATUS TRANSITIONS & LOGGING
  // =========================================================================

  /**
   * Update room status manually or automatically, recording audit history.
   * 
   * @param {string} phongId - Room UUID
   * @param {string} trangThaiMoi - Target state
   * @param {string} [lyDo] - Reason for transition (required for certain transitions)
   * @param {string} [userId] - UUID of performing user (null if system automated)
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<{id: string, trang_thai: string, warning: string|null}>}
   */
  async updateTrangThaiPhong(phongId, trangThaiMoi, lyDo, userId, tx) {
    const client = tx || sql

    // 1. Fetch current room state
    const [room] = await client`
      SELECT id, trang_thai
      FROM phong
      WHERE id = ${phongId}
    `
    if (!room) {
      const err = new Error('Không tìm thấy phòng.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    const currentState = room.trang_thai

    // If target is the same, bypass
    if (currentState === trangThaiMoi) {
      return { id: phongId, trang_thai: trangThaiMoi, warning: null }
    }

    // 2. Validate transition
    const validTransitions = {
      'Trong': ['ChoDatCoc', 'BaoTri'],
      'ChoDatCoc': ['Trong', 'DaDatCoc', 'BaoTri'],
      'DaDatCoc': ['DangThue', 'BaoTri'],
      'DangThue': ['Trong', 'BaoTri'],
      'BaoTri': ['Trong']
    }

    const allowedTargets = validTransitions[currentState] || []
    if (!allowedTargets.includes(trangThaiMoi)) {
      const err = new Error(`Không thể chuyển trạng thái phòng từ ${currentState} sang ${trangThaiMoi}.`)
      err.code = 'TRANG_THAI_CHUYEN_KHONG_HOP_LE'
      err.status = 422
      throw err
    }

    // Check if ly_do is required
    // Required when moving to BaoTri or manually moving from DangThue to Trong
    if ((trangThaiMoi === 'BaoTri' || (currentState === 'DangThue' && trangThaiMoi === 'Trong')) && (!lyDo || lyDo.trim() === '')) {
      const err = new Error('Lý do là bắt buộc đối với lượt chuyển trạng thái này.')
      err.code = 'VALIDATION_ERROR'
      err.status = 400
      throw err
    }

    // 3. Check for active contracts (warning only, does not block)
    let warning = null
    if (trangThaiMoi === 'BaoTri' || (currentState === 'DangThue' && trangThaiMoi === 'Trong')) {
      const [activeContract] = await client`
        SELECT id
        FROM hop_dong
        WHERE phong_id = ${phongId}
          AND trang_thai = 'HieuLuc'
        LIMIT 1
      `
      if (activeContract) {
        warning = 'HOP_DONG_DANG_HIEU_LUC'
      }
    }

    // 4. Write audit log entry
    await client`
      INSERT INTO lich_su_trang_thai_phong (phong_id, giuong_id, trang_thai_truoc, trang_thai_sau, ly_do, nguoi_thuc_hien_id)
      VALUES (${phongId}, NULL, ${currentState}, ${trangThaiMoi}, ${lyDo || null}, ${userId || null})
    `

    // 5. Update room status
    await client`
      UPDATE phong
      SET trang_thai = ${trangThaiMoi}
      WHERE id = ${phongId}
    `

    return { id: phongId, trang_thai: trangThaiMoi, warning }
  },

  /**
   * Update bed status manually or automatically, recording audit history and syncing room.
   * 
   * @param {string} giuongId - Bed UUID
   * @param {string} trangThaiMoi - Target state (cannot be 'BaoTri' for beds)
   * @param {string} [lyDo] - Reason for transition (required for certain transitions)
   * @param {string} [userId] - UUID of performing user (null if system automated)
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<{id: string, trang_thai: string, warning: string|null}>}
   */
  async updateTrangThaiGiuong(giuongId, trangThaiMoi, lyDo, userId, tx) {
    const client = tx || sql

    // 1. Fetch current bed state
    const [bed] = await client`
      SELECT id, phong_id, trang_thai
      FROM giuong
      WHERE id = ${giuongId}
    `
    if (!bed) {
      const err = new Error('Không tìm thấy giường.')
      err.code = 'NOT_FOUND'
      err.status = 404
      throw err
    }

    const currentState = bed.trang_thai

    // If target is the same, bypass
    if (currentState === trangThaiMoi) {
      return { id: giuongId, trang_thai: trangThaiMoi, warning: null }
    }

    // 2. Validate transition (beds don't have BaoTri status)
    const validBedTransitions = {
      'Trong': ['ChoDatCoc'],
      'ChoDatCoc': ['Trong', 'DaDatCoc'],
      'DaDatCoc': ['DangThue'],
      'DangThue': ['Trong']
    }

    const allowedTargets = validBedTransitions[currentState] || []
    if (!allowedTargets.includes(trangThaiMoi)) {
      const err = new Error(`Không thể chuyển trạng thái giường từ ${currentState} sang ${trangThaiMoi}.`)
      err.code = 'TRANG_THAI_CHUYEN_KHONG_HOP_LE'
      err.status = 422
      throw err
    }

    // Check if ly_do is required
    // Required when manually moving from DangThue to Trong
    if (currentState === 'DangThue' && trangThaiMoi === 'Trong' && (!lyDo || lyDo.trim() === '')) {
      const err = new Error('Lý do là bắt buộc đối với lượt chuyển trạng thái này.')
      err.code = 'VALIDATION_ERROR'
      err.status = 400
      throw err
    }

    // 3. Check for active contracts (warning only, does not block)
    let warning = null
    if (currentState === 'DangThue' && trangThaiMoi === 'Trong') {
      const [activeContract] = await client`
        SELECT h.id
        FROM thanh_vien_hop_dong tv
        JOIN hop_dong h ON tv.hop_dong_id = h.id
        WHERE tv.giuong_id = ${giuongId}
          AND h.trang_thai = 'HieuLuc'
        LIMIT 1
      `
      if (activeContract) {
        warning = 'HOP_DONG_DANG_HIEU_LUC'
      }
    }

    // 4. Write audit log entry
    await client`
      INSERT INTO lich_su_trang_thai_phong (phong_id, giuong_id, trang_thai_truoc, trang_thai_sau, ly_do, nguoi_thuc_hien_id)
      VALUES (NULL, ${giuongId}, ${currentState}, ${trangThaiMoi}, ${lyDo || null}, ${userId || null})
    `

    // 5. Update bed status
    await client`
      UPDATE giuong
      SET trang_thai = ${trangThaiMoi}
      WHERE id = ${giuongId}
    `

    // 6. Sync parent room status
    await this.syncTrangThaiPhong(bed.phong_id, client)

    return { id: giuongId, trang_thai: trangThaiMoi, warning }
  },

  /**
   * Synchronizes the parent room status based on the status of all its beds.
   * 
   * @param {string} phongId - Room UUID
   * @param {Object} [tx] - Optional postgres.js transaction client
   * @returns {Promise<void>}
   */
  async syncTrangThaiPhong(phongId, tx) {
    const client = tx || sql

    // 1. Fetch current room status
    const [room] = await client`
      SELECT id, trang_thai
      FROM phong
      WHERE id = ${phongId}
    `
    if (!room) return

    // If the room is in maintenance (BaoTri), do not synchronize automatically
    if (room.trang_thai === 'BaoTri') return

    // 2. Fetch all beds inside the room
    const beds = await client`
      SELECT trang_thai
      FROM giuong
      WHERE phong_id = ${phongId}
    `
    if (beds.length === 0) return

    // 3. Compute new room status based on bed status rules:
    // - All beds 'Trong' -> Room 'Trong'
    // - At least 1 bed 'ChoDatCoc' (no DaDatCoc/DangThue) -> Room 'ChoDatCoc'
    // - At least 1 bed 'DaDatCoc' (no DangThue) -> Room 'DaDatCoc'
    // - At least 1 bed 'DangThue' -> Room 'DangThue'
    const bedStates = beds.map(b => b.trang_thai)
    let newRoomState = room.trang_thai

    if (bedStates.every(s => s === 'Trong')) {
      newRoomState = 'Trong'
    } else if (bedStates.includes('DangThue')) {
      newRoomState = 'DangThue'
    } else if (bedStates.includes('DaDatCoc')) {
      newRoomState = 'DaDatCoc'
    } else if (bedStates.includes('ChoDatCoc')) {
      newRoomState = 'ChoDatCoc'
    }

    // 4. Update room if the state has changed
    if (newRoomState !== room.trang_thai) {
      // Write audit log entry for the room (system automated sync)
      await client`
        INSERT INTO lich_su_trang_thai_phong (phong_id, giuong_id, trang_thai_truoc, trang_thai_sau, ly_do, nguoi_thuc_hien_id)
        VALUES (${phongId}, NULL, ${room.trang_thai}, ${newRoomState}, 'Đồng bộ trạng thái từ giường', NULL)
      `

      // Update room table
      await client`
        UPDATE phong
        SET trang_thai = ${newRoomState}
        WHERE id = ${phongId}
      `
    }
  }
}

export const phongService = traceService('phongService', service)
