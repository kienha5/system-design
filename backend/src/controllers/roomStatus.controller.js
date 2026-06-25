import sql from '../db.js'
import { phongService } from '../services/phong.service.js'

/**
 * Controller handling manual room and bed status updates (restricted to Quản lý).
 */
export const roomStatusController = {
  /**
   * Manually update a room's status inside a database transaction.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateRoomStatus(req, res) {
    const { id } = req.params
    const { trang_thai_moi, ly_do } = req.body
    const userId = req.user.id

    try {
      // Execute within a database transaction to ensure audit logging and status consistency
      const result = await sql.begin(async (tx) => {
        return await phongService.updateTrangThaiPhong(id, trang_thai_moi, ly_do, userId, tx)
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
   * Manually update a bed's status inside a database transaction, triggering room status sync.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateBedStatus(req, res) {
    const { id } = req.params
    const { trang_thai_moi, ly_do } = req.body
    const userId = req.user.id

    try {
      // Execute within a database transaction to ensure audit logging, status update, and sync are atomic
      const result = await sql.begin(async (tx) => {
        return await phongService.updateTrangThaiGiuong(id, trang_thai_moi, ly_do, userId, tx)
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
  }
}
