import { z } from 'zod'

const assetItemSchema = z.object({
  ten: z.string({
    required_error: 'Tên tài sản là bắt buộc'
  }),
  so_luong: z.number({
    required_error: 'Số lượng là bắt buộc'
  }).int().min(1, { message: 'Số lượng phải lớn hơn hoặc bằng 1' }),
  tinh_trang: z.enum(['Tot', 'DungDuoc', 'CanChuY', 'HuHong', 'MatMat'], {
    errorMap: () => ({ message: 'Tình trạng tài sản không hợp lệ (phải là Tot, DungDuoc, CanChuY, HuHong, hoặc MatMat)' })
  }),
  ghi_chu: z.string().optional().default('')
})

/**
 * Schema for validating POST /api/v1/bien-ban-ban-giao request body.
 */
export const createBienBanSchema = z.object({
  hop_dong_id: z.string({
    required_error: 'hop_dong_id là bắt buộc'
  }).uuid({ message: 'hop_dong_id phải là định dạng UUID hợp lệ' }),
  
  tinh_trang_phong: z.string().optional().default(''),
  
  danh_sach_tai_san: z.array(assetItemSchema).min(1, {
    message: 'Danh sách tài sản bàn giao không được để trống'
  })
})

/**
 * Schema for validating PATCH /api/v1/bien-ban-ban-giao/:id/danh-sach-tai-san request body.
 */
export const updateDanhSachSchema = z.object({
  danh_sach_tai_san: z.array(assetItemSchema).min(1, {
    message: 'Danh sách tài sản bàn giao không được để trống'
  })
})

/**
 * Schema for validating PATCH /api/v1/bien-ban-ban-giao/:id/xac-nhan request body.
 */
export const xacNhanBienBanSchema = z.object({
  anh_bien_ban_url: z.string().url({ message: 'Đường dẫn ảnh biên bản không hợp lệ' }).optional().nullable().or(z.literal(''))
})
