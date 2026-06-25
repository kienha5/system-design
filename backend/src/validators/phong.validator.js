import { z } from 'zod'

/**
 * Schema for validating GET /api/v1/phong query parameters
 */
export const searchPhongSchema = z.object({
  chi_nhanh_id: z.string().uuid({ message: 'chi_nhanh_id phải là định dạng UUID hợp lệ' }).optional(),
  khu_vuc: z.string().optional(),
  loai_phong: z.enum(['Don', 'Ghep', 'NguyenPhong'], { 
    message: 'loai_phong phải là Don, Ghep hoặc NguyenPhong' 
  }).optional(),
  gia_tu: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : Number(val)),
    z.number({ message: 'gia_tu phải là số' }).min(0, { message: 'gia_tu không được nhỏ hơn 0' }).optional()
  ),
  gia_den: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : Number(val)),
    z.number({ message: 'gia_den phải là số' }).min(0, { message: 'gia_den không được nhỏ hơn 0' }).optional()
  ),
  gioi_tinh_quy_dinh: z.enum(['Nam', 'Nu', 'Khac'], {
    message: 'gioi_tinh_quy_dinh phải là Nam, Nu hoặc Khac'
  }).optional(),
  trang_thai: z.enum(['Trong', 'ChoDatCoc', 'DaDatCoc', 'DangThue', 'BaoTri'], {
    message: 'trang_thai phòng phải là Trong, ChoDatCoc, DaDatCoc, DangThue hoặc BaoTri'
  }).optional(),
  page: z.preprocess(
    (val) => (val === undefined || val === '' ? 1 : Number(val)),
    z.number().int().min(1, { message: 'page phải lớn hơn hoặc bằng 1' }).default(1)
  ),
  pageSize: z.preprocess(
    (val) => (val === undefined || val === '' ? 20 : Number(val)),
    z.number().int().min(1, { message: 'pageSize phải lớn hơn hoặc bằng 1' }).default(20)
  )
}).refine(
  (data) => {
    if (data.gia_tu !== undefined && data.gia_den !== undefined) {
      return data.gia_tu <= data.gia_den
    }
    return true
  },
  {
    message: 'gia_tu phải nhỏ hơn hoặc bằng gia_den',
    path: ['gia_tu']
  }
)

/**
 * Schema for validating GET /api/v1/giuong query parameters
 */
export const searchGiuongSchema = z.object({
  phong_id: z.string({ 
    required_error: 'phong_id là tham số bắt buộc' 
  }).uuid({ 
    message: 'phong_id phải là định dạng UUID hợp lệ' 
  }),
  trang_thai: z.enum(['Trong', 'ChoDatCoc', 'DaDatCoc', 'DangThue'], {
    message: 'trang_thai giường phải là Trong, ChoDatCoc, DaDatCoc hoặc DangThue'
  }).optional()
})
