import { z } from 'zod'

/**
 * Schema for validating POST /api/v1/hop-dong request body.
 */
export const createHopDongSchema = z.object({
  phieu_dat_coc_id: z.string({
    required_error: 'phieu_dat_coc_id là bắt buộc'
  }).uuid({ message: 'phieu_dat_coc_id phải là định dạng UUID hợp lệ' }),
  
  ngay_bat_dau: z.string({
    required_error: 'ngay_bat_dau là bắt buộc'
  }).refine(val => !isNaN(Date.parse(val)), { message: 'ngay_bat_dau phải là ngày hợp lệ' }),
  
  ngay_ket_thuc: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'ngay_ket_thuc phải là ngày hợp lệ' }).optional().nullable().or(z.literal('')),
  
  ky_thanh_toan: z.string().optional().default('Thang'),
  
  thanh_vien: z.array(
    z.object({
      khach_hang_id: z.string({
        required_error: 'khach_hang_id là bắt buộc'
      }).uuid({ message: 'khach_hang_id phải là định dạng UUID hợp lệ' }),
      
      giuong_id: z.string().uuid({ message: 'giuong_id phải là định dạng UUID hợp lệ' }).optional().nullable()
    })
  ).min(1, { message: 'Danh sách thành viên (thanh_vien) không được để trống' })
})
