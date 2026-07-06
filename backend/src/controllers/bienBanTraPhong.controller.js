import sql from '../db.js'
import { bienBanTraPhongService } from '../services/bienBanTraPhong.service.js'

/**
 * Controller handling checkout reports (UC12, UC13, UC14).
 */
export const bienBanTraPhongController = {
  /**
   * Register a new checkout request inside a database transaction (UC12).
   */
  async create(req, res) {
    const saleId = req.user.id

    try {
      const result = await sql.begin(async (tx) => {
        return await bienBanTraPhongService.create(req.body, saleId, tx)
      })

      res.status(201).json({
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
   * Update scheduled checkout date (UC12).
   */
  async capNhatNgayHen(req, res) {
    const { id } = req.params
    const { ngay_tra_phong_du_kien } = req.body

    try {
      const result = await sql.begin(async (tx) => {
        return await bienBanTraPhongService.capNhatNgayHen(id, ngay_tra_phong_du_kien, tx)
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
  },

  /**
   * Record asset audit results (UC13).
   */
  async doSoat(req, res) {
    const { id } = req.params
    const quanLyId = req.user.id

    try {
      const result = await sql.begin(async (tx) => {
        return await bienBanTraPhongService.doSoat(id, req.body, quanLyId, tx)
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
  },

  /**
   * Accountant calculates and records deductions (UC14).
   */
  async khauTru(req, res) {
    const { id } = req.params
    const keToanId = req.user.id

    try {
      const result = await sql.begin(async (tx) => {
        return await bienBanTraPhongService.khauTru(id, req.body, keToanId, tx)
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
  },

  /**
   * Record client confirmation of checkout details (UC14).
   */
  async xacNhanKhach(req, res) {
    const { id } = req.params

    try {
      const result = await sql.begin(async (tx) => {
        return await bienBanTraPhongService.xacNhanKhach(id, tx)
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
  },

  /**
   * Fetch checkout report details by ID.
   */
  async getById(req, res) {
    const { id } = req.params

    try {
      const result = await bienBanTraPhongService.getById(id)
      
      if (!result) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Không tìm thấy biên bản trả phòng.'
          }
        })
      }

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
   * Get suggested deposit refund rate based on business rules.
   */
  async getGoiYTyLe(req, res) {
    const { id } = req.params

    try {
      const result = await bienBanTraPhongService.getGoiYTyLe(id)
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
