import sql from '../db.js'
import { nhuCauThueService } from '../services/nhuCauThue.service.js'

/**
 * Controller handling rental request intakes, viewing schedules, and status updates (restricted to Sale).
 */
export const nhuCauThueController = {
  /**
   * Create a new rental request, performing transactional customer lookup/creation.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async create(req, res) {
    const saleId = req.user.id

    try {
      // Execute within a database transaction
      const result = await sql.begin(async (tx) => {
        return await nhuCauThueService.create(req.body, saleId, tx)
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
   * Update the prospective room for a rental request.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updatePhongDuKien(req, res) {
    const { id } = req.params
    const { phong_du_kien_id } = req.body

    try {
      // Execute within a database transaction
      await sql.begin(async (tx) => {
        await nhuCauThueService.updatePhongDuKien(id, phong_du_kien_id, tx)
      })

      res.json({
        success: true,
        data: {
          id,
          phong_du_kien_id
        }
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
   * Schedule or reschedule a room viewing appointment.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async datLichXem(req, res) {
    const { id } = req.params
    const { lich_hen_xem, phuong_thuc_thong_bao } = req.body

    try {
      // Execute within a database transaction
      const result = await sql.begin(async (tx) => {
        return await nhuCauThueService.datLichXem(id, lich_hen_xem, phuong_thuc_thong_bao, tx)
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
   * Confirm that the customer has completed the room viewing.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async xacNhanDaXem(req, res) {
    const { id } = req.params

    try {
      // Execute within a database transaction
      const result = await sql.begin(async (tx) => {
        return await nhuCauThueService.xacNhanDaXem(id, tx)
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
   * Cancel a rental request.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async huyYeuCau(req, res) {
    const { id } = req.params

    try {
      // Execute within a database transaction
      const result = await sql.begin(async (tx) => {
        return await nhuCauThueService.huyYeuCau(id, tx)
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
   * Fetch a single rental request by ID, joining customer and prospective room details.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getById(req, res) {
    const { id } = req.params

    try {
      const result = await nhuCauThueService.getById(id)
      
      if (!result) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Không tìm thấy yêu cầu thuê.'
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
   * Search rental requests by customer phone number.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async search(req, res) {
    const { so_dien_thoai } = req.query

    try {
      if (!so_dien_thoai) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Thiếu tham số so_dien_thoai.'
          }
        })
      }

      const result = await nhuCauThueService.search(so_dien_thoai)
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
