import { z } from 'zod'

/**
 * Schema for validating UUID path parameters.
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'ID trong đường dẫn phải là định dạng UUID hợp lệ' })
})

/**
 * Schema for validating PATCH /api/v1/phong/:id/trang-thai request body.
 */
export const updateRoomStatusSchema = z.object({
  trang_thai_moi: z.enum(['Trong', 'ChoDatCoc', 'DaDatCoc', 'DangThue', 'BaoTri'], {
    message: 'trang_thai_moi của phòng phải là Trong, ChoDatCoc, DaDatCoc, DangThue hoặc BaoTri'
  }),
  ly_do: z.string().trim().max(255, { message: 'ly_do tối đa 255 ký tự' }).optional()
}).refine(
  (data) => {
    // Transition to BaoTri requires a reason
    if (data.trang_thai_moi === 'BaoTri' && (!data.ly_do || data.ly_do === '')) {
      return false
    }
    return true
  },
  {
    message: 'ly_do bắt buộc phải có khi chuyển phòng sang trạng thái bảo trì',
    path: ['ly_do']
  }
)

/**
 * Schema for validating PATCH /api/v1/giuong/:id/trang-thai request body.
 */
export const updateBedStatusSchema = z.object({
  trang_thai_moi: z.enum(['Trong', 'ChoDatCoc', 'DaDatCoc', 'DangThue'], {
    message: 'trang_thai_moi của giường phải là Trong, ChoDatCoc, DaDatCoc hoặc DangThue'
  }),
  ly_do: z.string().trim().max(255, { message: 'ly_do tối đa 255 ký tự' }).optional()
})
