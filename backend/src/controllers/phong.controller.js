import { phongService } from '../services/phong.service.js'

/**
 * Controller handling room and bed inquiries.
 */
export const phongController = {
  /**
   * Inquiry rooms based on query parameters (with pagination).
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchPhong(req, res) {
    try {
      const { rooms, total } = await phongService.searchPhong(req.query)
      
      res.json({
        success: true,
        data: rooms,
        meta: {
          page: req.query.page,
          pageSize: req.query.pageSize,
          total: total
        }
      })
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'Lỗi tra cứu phòng.'
        }
      })
    }
  },

  /**
   * Inquiry beds belonging to a specific room.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchGiuong(req, res) {
    try {
      const { phong_id, trang_thai } = req.query
      const beds = await phongService.searchGiuong(phong_id, trang_thai)
      
      res.json({
        success: true,
        data: beds
      })
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'Lỗi tra cứu giường.'
        }
      })
    }
  }
}
