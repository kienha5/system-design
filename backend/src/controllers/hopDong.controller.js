import sql from '../db.js'
import { hopDongService } from '../services/hopDong.service.js'

/**
 * Controller handling lease contracts (restricted to QuanLy and KeToan).
 */
export const hopDongController = {
  /**
   * Create a new lease contract inside a database transaction.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async create(req, res) {
    const quanLyId = req.user.id

    try {
      // Execute within a database transaction
      const result = await sql.begin(async (tx) => {
        return await hopDongService.create(req.body, quanLyId, tx)
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
   * Fetch details of a single lease contract by ID.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getById(req, res) {
    const { id } = req.params

    try {
      const result = await hopDongService.getById(id)
      
      if (!result) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Không tìm thấy hợp đồng thuê phòng.'
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
  }
}
