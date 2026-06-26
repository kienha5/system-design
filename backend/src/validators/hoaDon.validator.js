import { z } from 'zod'

/**
 * Schema for validating POST /api/v1/hoa-don request body.
 */
export const createHoaDonSchema = z.object({
  hop_dong_id: z.string({
    required_error: 'hop_dong_id là bắt buộc'
  }).uuid({ message: 'hop_dong_id phải là định dạng UUID hợp lệ' }),
  
  tien_dien: z.number({
    invalid_type_error: 'tien_dien phải là số'
  }).min(0, { message: 'tien_dien không được âm' }).optional().default(0),
  
  tien_nuoc: z.number({
    invalid_type_error: 'tien_nuoc phải là số'
  }).min(0, { message: 'tien_nuoc không được âm' }).optional().default(0),
  
  tien_dich_vu_khac: z.number({
    invalid_type_error: 'tien_dich_vu_khac phải là số'
  }).min(0, { message: 'tien_dich_vu_khac không được âm' }).optional().default(0)
})

/**
 * Schema for validating PATCH /api/v1/hoa-don/:id/xac-nhan-thanh-toan request body.
 */
export const xacNhanThanhToanSchema = z.object({
  hinh_thuc_thanh_toan: z.enum(['TienMat', 'ChuyenKhoan'], {
    errorMap: () => ({ message: 'hinh_thuc_thanh_toan phải là TienMat hoặc ChuyenKhoan' })
  })
})
