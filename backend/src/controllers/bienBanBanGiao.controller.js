import sql from '../db.js'
import { bienBanBanGiaoService } from '../services/bienBanBanGiao.service.js'

/**
 * Controller handling room handover operations (QuanLy role).
 */
export const bienBanBanGiaoController = {
  /**
   * Create a new room handover record (Step 1).
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async create(req, res) {
    const quanLyId = req.user.id

    try {
      const result = await sql.begin(async (tx) => {
        return await bienBanBanGiaoService.create(req.body, quanLyId, tx)
      })

      res.status(201).json({
        success: true,
        data: result
      })
    } catch (err) {
      const status = err.status || 500
      const code = err.code || 'SYSTEM_ERROR'

      res.status(status).json({
        success: false,
        error: {
          code,
          message: err.message
        }
      })
    }
  },

  /**
   * Update asset status checklist before final signature.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateDanhSach(req, res) {
    const { id } = req.params
    const { danh_sach_tai_san } = req.body

    try {
      const result = await sql.begin(async (tx) => {
        return await bienBanBanGiaoService.updateDanhSach(id, danh_sach_tai_san, tx)
      })

      res.json({
        success: true,
        data: result
      })
    } catch (err) {
      const status = err.status || 500
      const code = err.code || 'SYSTEM_ERROR'

      res.status(status).json({
        success: false,
        error: {
          code,
          message: err.message
        }
      })
    }
  },

  /**
   * Sign and finalize room handover, activating beds (Step 2).
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async xacNhan(req, res) {
    const { id } = req.params
    const { anh_bien_ban_url } = req.body
    const quanLyId = req.user.id

    try {
      const result = await sql.begin(async (tx) => {
        return await bienBanBanGiaoService.xacNhan(id, anh_bien_ban_url, quanLyId, tx)
      })

      res.json({
        success: true,
        data: result
      })
    } catch (err) {
      const status = err.status || 500
      const code = err.code || 'SYSTEM_ERROR'

      res.status(status).json({
        success: false,
        error: {
          code,
          message: err.message
        }
      })
    }
  },

  /**
   * Fetch handover report by contract ID.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getByHopDongId(req, res) {
    const { hop_dong_id } = req.query

    if (!hop_dong_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hop_dong_id là bắt buộc trong query string.'
        }
      })
    }

    try {
      const result = await bienBanBanGiaoService.getByHopDongId(hop_dong_id)
      res.json({
        success: true,
        data: result
      })
    } catch (err) {
      const status = err.status || 500
      const code = err.code || 'SYSTEM_ERROR'

      res.status(status).json({
        success: false,
        error: {
          code,
          message: err.message
        }
      })
    }
  }
}
