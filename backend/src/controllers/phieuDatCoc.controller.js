import sql from '../db.js'
import { phieuDatCocService } from '../services/phieuDatCoc.service.js'
import { dieuKienCuTruService } from '../services/dieuKienCuTru.service.js'

/**
 * Controller handling room deposits (restricted to Sale).
 */
export const phieuDatCocController = {
  /**
   * Create a new deposit sheet, locking the room/beds inside a database transaction.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async create(req, res) {
    const saleId = req.user.id

    try {
      // Execute within a database transaction
      const result = await sql.begin(async (tx) => {
        return await phieuDatCocService.create(req.body, saleId, tx)
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
   * List all deposit sheets with optional status and phone filters.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async list(req, res) {
    try {
      const result = await phieuDatCocService.list(req.query)
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
   * Get details of a single deposit sheet by ID.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getById(req, res) {
    const { id } = req.params
    try {
      const result = await phieuDatCocService.getById(id)
      if (!result) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Không tìm thấy phiếu đặt cọc.'
          }
        })
      }

      // Security check: only QuanLy is allowed to see the CCCD number
      const userRole = req.user?.vai_tro?.toLowerCase()
      const isQuanLy = userRole === 'quanly' || userRole === 'quản lý'
      if (!isQuanLy && result) {
        delete result.khach_hang_so_cmnd_cccd
      }

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
   * Confirm a deposit payment (Sale action).
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async xacNhan(req, res) {
    const { id } = req.params
    const { phuong_thuc_thanh_toan, chung_tu_url } = req.body
    const saleId = req.user.id

    try {
      const result = await sql.begin(async (tx) => {
        return await phieuDatCocService.xacNhanDatCoc(id, { phuong_thuc_thanh_toan, chung_tu_url }, saleId, tx)
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
   * Preview residence condition checks for a deposit sheet.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async kiemTraDieuKien(req, res) {
    const { id } = req.params
    const { danh_sach_khach } = req.body

    try {
      // 1. Fetch deposit to get phong_id
      const [phieu] = await sql`
        SELECT phong_id FROM phieu_dat_coc WHERE id = ${id}
      `
      if (!phieu) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Không tìm thấy phiếu đặt cọc.'
          }
        })
      }

      // 2. Run check
      const result = await dieuKienCuTruService.kiemTraDieuKienCuTru(phieu.phong_id, danh_sach_khach)
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
