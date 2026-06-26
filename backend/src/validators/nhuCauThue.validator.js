import { z } from 'zod'

// Vietnamese phone number regex: starts with 0 or 84, followed by 3, 5, 7, 8, or 9, and exactly 8 digits.
const VN_PHONE_REGEX = /^(0|84)(3|5|7|8|9)[0-9]{8}$/

/**
 * Schema for validating UUID path parameters.
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'ID trong đường dẫn phải là định dạng UUID hợp lệ' })
})

/**
 * Schema for validating POST /api/v1/nhu-cau-thue request body.
 */
export const createNhuCauThueSchema = z.object({
  khach_hang: z.object({
    ho_ten: z.string({ 
      required_error: 'ho_ten của khách hàng là bắt buộc' 
    }).trim().min(1, { message: 'ho_ten không được để trống' }).max(150, { message: 'ho_ten tối đa 150 ký tự' }),
    so_dien_thoai: z.string({ 
      required_error: 'so_dien_thoai của khách hàng là bắt buộc' 
    }).trim().regex(VN_PHONE_REGEX, { 
      message: 'so_dien_thoai không đúng định dạng số điện thoại Việt Nam hợp lệ' 
    }),
    email: z.string().trim().email({ message: 'email không đúng định dạng' }).max(150).optional().or(z.literal('')),
    gioi_tinh: z.enum(['Nam', 'Nu', 'Khac'], {
      message: 'gioi_tinh phải là Nam, Nu hoặc Khac'
    }).optional(),
    quoc_tich: z.string().trim().max(50).optional().or(z.literal('')),
    so_cmnd_cccd: z.string().trim().max(30).optional().or(z.literal(''))
  }, {
    required_error: 'Thông tin khach_hang là bắt buộc'
  }),
  so_nguoi: z.number({ 
    required_error: 'so_nguoi là bắt buộc' 
  }).int().min(1, { message: 'so_nguoi phải lớn hơn hoặc bằng 1' }),
  gioi_tinh_yeu_cau: z.enum(['Nam', 'Nu', 'Khac'], {
    message: 'gioi_tinh_yeu_cau phải là Nam, Nu hoặc Khac'
  }).optional(),
  khu_vuc_yeu_cau: z.string().trim().max(100).optional().or(z.literal('')),
  loai_phong_yeu_cau: z.enum(['Don', 'Ghep', 'NguyenPhong'], {
    message: 'loai_phong_yeu_cau phải là Don, Ghep hoặc NguyenPhong'
  }).optional(),
  muc_gia_toi_da: z.number().min(0, { message: 'muc_gia_toi_da không được nhỏ hơn 0' }).optional(),
  thoi_gian_vao_o_du_kien: z.string().trim().datetime({ offset: true }).optional().or(z.string().date()).or(z.literal('')), // Accept ISO date or YYYY-MM-DD
  thoi_han_thue_du_kien: z.number().int().min(1, { message: 'thoi_han_thue_du_kien phải lớn hơn hoặc bằng 1 tháng' }).optional(),
  ghi_chu_yeu_cau: z.string().trim().optional().or(z.literal('')),
  phuong_thuc_thong_bao: z.enum(['Email', 'SDT'], {
    required_error: 'phuong_thuc_thong_bao là bắt buộc',
    message: 'phuong_thuc_thong_bao phải là Email hoặc SDT'
  })
})

/**
 * Schema for validating PATCH /api/v1/nhu-cau-thue/:id/phong-du-kien request body.
 */
export const updatePhongDuKienSchema = z.object({
  phong_du_kien_id: z.string({ 
    required_error: 'phong_du_kien_id là bắt buộc' 
  }).uuid({ 
    message: 'phong_du_kien_id phải là định dạng UUID hợp lệ' 
  })
})

/**
 * Schema for validating PATCH /api/v1/nhu-cau-thue/:id/lich-hen request body.
 */
export const scheduleViewingSchema = z.object({
  lich_hen_xem: z.string({ 
    required_error: 'lich_hen_xem là bắt buộc' 
  }).trim().datetime({ 
    message: 'lich_hen_xem phải là định dạng ngày giờ ISO 8601 hợp lệ' 
  }),
  phuong_thuc_thong_bao: z.enum(['Email', 'SDT'], {
    message: 'phuong_thuc_thong_bao phải là Email hoặc SDT'
  }).optional()
})
