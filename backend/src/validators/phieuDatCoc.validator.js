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

/**
 * Schema for validating PATCH /api/v1/phieu-dat-coc/:id/chung-tu request body.
 */
export const nopChungTuSchema = z.object({
  chung_tu_url: z.string({
    required_error: 'chung_tu_url là bắt buộc'
  }).min(1, { message: 'chung_tu_url không được để trống' }),
  phuong_thuc_thanh_toan: z.enum(['TienMat', 'ChuyenKhoan'], {
    required_error: 'phuong_thuc_thanh_toan là bắt buộc',
    invalid_type_error: 'phuong_thuc_thanh_toan phải là TienMat hoặc ChuyenKhoan'
  })
})

/**
 * Schema for validating PATCH /api/v1/phieu-dat-coc/:id/xac-nhan request body.
 */
export const xacNhanPhieuSchema = z.object({
  xac_nhan: z.boolean({
    required_error: 'xac_nhan là bắt buộc',
    invalid_type_error: 'xac_nhan phải be kiểu boolean (true/false)'
  })
})

/**
 * Schema for validating POST /api/v1/phieu-dat-coc/:id/kiem-tra-dieu-kien request body.
 */
export const kiemTraDieuKienSchema = z.object({
  danh_sach_khach: z.array(
    z.object({
      khach_hang_id: z.string({
        required_error: 'khach_hang_id là bắt buộc'
      }).uuid({ message: 'khach_hang_id phải là định dạng UUID hợp lệ' }),
      giuong_id: z.string().uuid({ message: 'giuong_id phải là định dạng UUID hợp lệ' }).optional().nullable()
    })
  ).min(1, { message: 'danh_sach_khach không được để trống' })
})


