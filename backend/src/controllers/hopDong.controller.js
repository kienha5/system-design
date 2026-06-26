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
   * Search lease contracts (via query param ?search=...).
   */
  async search(req, res) {
    const { search } = req.query

    try {
      const result = await hopDongService.search(search)
      res.json({
        success: true,
        data: result
      })
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || 'SYSTEM_ERROR',
          message: err.message
        }
      })
    }
  },

  /**
   * Fetch details of a single lease contract by ID.
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
  },

  /**
   * Liquidate contract inside a database transaction (UC15).
   */
  async thanhLy(req, res) {
    const { id } = req.params
    const { tai_chinh_da_hoan_tat } = req.body
    const quanLyId = req.user.id

    try {
      const result = await sql.begin(async (tx) => {
        return await hopDongService.thanhLy(id, tai_chinh_da_hoan_tat, quanLyId, tx)
      })

      res.json({
        success: true,
        data: result
      })
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || 'SYSTEM_ERROR',
          message: err.message
        }
      })
    }
  }
}
