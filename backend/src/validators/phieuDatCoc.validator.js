import { z } from 'zod'

/**
 * Schema for validating POST /api/v1/phieu-dat-coc request body.
 */
export const createPhieuDatCocSchema = z.object({
  nhu_cau_thue_id: z.string().uuid({ message: 'nhu_cau_thue_id phải là định dạng UUID hợp lệ' }).optional().or(z.literal('')),
  khach_hang_id: z.string({
    required_error: 'khach_hang_id là bắt buộc'
  }).uuid({ message: 'khach_hang_id phải là định dạng UUID hợp lệ' }),
  phong_id: z.string({
    required_error: 'phong_id là bắt buộc'
  }).uuid({ message: 'phong_id phải là định dạng UUID hợp lệ' }),
  giuong_id: z.string().uuid({ message: 'giuong_id phải là định dạng UUID hợp lệ' }).optional().nullable(),
  so_giuong_thue: z.number({
    required_error: 'so_giuong_thue là bắt buộc'
  }).int().min(1, { message: 'so_giuong_thue phải lớn hơn hoặc bằng 1' }),
  chi_nhanh_id: z.string({
    required_error: 'chi_nhanh_id là bắt buộc'
  }).uuid({ message: 'chi_nhanh_id phải là định dạng UUID hợp lệ' })
})
