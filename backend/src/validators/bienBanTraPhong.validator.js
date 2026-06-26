import { z } from 'zod'

/**
 * Validates that a date string is a valid date and is >= today.
 */
const dateGteToday = z.string({
  required_error: 'Ngày trả phòng dự kiến là bắt buộc'
}).refine(val => {
  const date = new Date(val)
  if (isNaN(date.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date >= today
}, { message: 'Ngày trả phòng dự kiến phải lớn hơn hoặc bằng ngày hôm nay' })

/**
 * Schema for validating POST /api/v1/bien-ban-tra-phong (UC12)
 */
export const createBienBanTraPhongSchema = z.object({
  hop_dong_id: z.string({
    required_error: 'hop_dong_id là bắt buộc'
  }).uuid({ message: 'hop_dong_id phải là định dạng UUID hợp lệ' }),
  ngay_tra_phong_du_kien: dateGteToday
})

/**
 * Schema for validating PATCH /api/v1/bien-ban-tra-phong/:id/ngay-hen (UC12)
 */
export const capNhatNgayHenSchema = z.object({
  ngay_tra_phong_du_kien: dateGteToday
})

/**
 * Schema for validating PATCH /api/v1/bien-ban-tra-phong/:id/doi-soat (UC13)
 */
export const doSoatSchema = z.object({
  ngay_tra_thuc_te: z.string({
    required_error: 'ngay_tra_thuc_te là bắt buộc'
  }).refine(val => !isNaN(new Date(val).getTime()), { message: 'ngay_tra_thuc_te phải là ngày giờ hợp lệ' }),
  
  danh_sach_doi_soat: z.array(
    z.object({
      ten: z.string({ required_error: 'Tên tài sản là bắt buộc' }),
      tinh_trang: z.enum(['Tot', 'DungDuoc', 'CanChuY', 'HuHong', 'MatMat'], {
        errorMap: () => ({ message: 'Tình trạng tài sản không hợp lệ (phải là Tot, DungDuoc, CanChuY, HuHong, hoặc MatMat)' })
      }),
      ghi_chu: z.string().optional().default(''),
      chi_phi_boi_thuong: z.number({
        invalid_type_error: 'Chi phí bồi thường phải là số'
      }).min(0, { message: 'Chi phí bồi thường không được âm' }).optional().default(0)
    })
  ).min(1, { message: 'Danh sách đối soát không được rỗng' })
})

/**
 * Schema for validating PATCH /api/v1/bien-ban-tra-phong/:id/khau-tru (UC14)
 */
export const khauTruSchema = z.object({
  ty_le_hoan_coc: z.number({
    required_error: 'Tỷ lệ hoàn cọc là bắt buộc',
    invalid_type_error: 'Tỷ lệ hoàn cọc phải là số'
  }).min(0, { message: 'Tỷ lệ hoàn cọc phải từ 0 đến 100%' })
    .max(100, { message: 'Tỷ lệ hoàn cọc phải từ 0 đến 100%' }),

  tien_thue_con_no: z.number({
    invalid_type_error: 'Tiền thuê còn nợ phải là số'
  }).min(0, { message: 'Tiền thuê còn nợ không được âm' }).optional().default(0),

  tien_dien_nuoc_dich_vu: z.number({
    invalid_type_error: 'Tiền điện nước dịch vụ phải là số'
  }).min(0, { message: 'Tiền điện nước dịch vụ không được âm' }).optional().default(0),

  chi_phi_sua_chua_boi_thuong: z.number({
    invalid_type_error: 'Chi phí sửa chữa bồi thường phải là số'
  }).min(0, { message: 'Chi phí sửa chữa bồi thường không được âm' }).optional().default(0),

  tien_phat_vi_pham: z.number({
    invalid_type_error: 'Tiền phạt vi phạm phải là số'
  }).min(0, { message: 'Tiền phạt vi phạm không được âm' }).optional().default(0)
})
