import sql from '../db.js'
import { phieuDatCocService } from '../services/phieuDatCoc.service.js'

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
  }
}
