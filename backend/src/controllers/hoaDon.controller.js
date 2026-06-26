import sql from '../db.js'
import { hoaDonService } from '../services/hoaDon.service.js'

/**
 * Controller handling invoice operations (KeToan role).
 */
export const hoaDonController = {
  /**
   * Create a new invoice for a lease contract.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async create(req, res) {
    const keToanId = req.user.id

    try {
      const result = await sql.begin(async (tx) => {
        return await hoaDonService.create(req.body, keToanId, tx)
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
   * Confirm invoice payment.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async xacNhanThanhToan(req, res) {
    const { id } = req.params
    const { hinh_thuc_thanh_toan } = req.body
    const keToanId = req.user.id

    try {
      const result = await sql.begin(async (tx) => {
        return await hoaDonService.xacNhanThanhToan(id, hinh_thuc_thanh_toan, keToanId, tx)
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
   * Get invoice details by ID.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getById(req, res) {
    const { id } = req.params
    try {
      const result = await hoaDonService.getById(id)
      if (!result) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Không tìm thấy hóa đơn.'
          }
        })
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
   * Get all invoices for a specific lease contract.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getByHopDongId(req, res) {
    const { id } = req.params // hop_dong_id
    try {
      const result = await hoaDonService.getByHopDongId(id)
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
