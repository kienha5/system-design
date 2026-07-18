import sql from '../db.js'

export const khachHangController = {
  /**
   * Search customers by phone number prefix (LIKE query)
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

      // Query customers whose phone number starts with the search string
      const result = await sql`
        SELECT 
          id, 
          ho_ten, 
          so_dien_thoai, 
          email, 
          gioi_tinh, 
          quoc_tich, 
          so_cmnd_cccd, 
          la_nguoi_dai_dien_nhom, 
          created_at, 
          updated_at
        FROM khach_hang
        WHERE so_dien_thoai LIKE ${so_dien_thoai.trim() + '%'}
        ORDER BY ho_ten ASC
      `

      res.json({
        success: true,
        data: result
      })
    } catch (err) {
      const status = err.status || err.statusCode || 500
      const code = err.code || 'SYSTEM_ERROR'

      res.status(status).json({
        success: false,
        error: {
          code,
          message: err.message || 'Lỗi hệ thống không xác định.'
        }
      })
    }
  }
}
