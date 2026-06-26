import { Router } from 'express'
import { bienBanBanGiaoController } from '../controllers/bienBanBanGiao.controller.js'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { validateBody, validateParams } from '../middleware/validate.js'
import { 
  createBienBanSchema, 
  updateDanhSachSchema, 
  xacNhanBienBanSchema 
} from '../validators/bienBanBanGiao.validator.js'
import { z } from 'zod'

// Schema to validate uuid path param
const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'id phải là định dạng UUID hợp lệ' })
})

const router = Router()

/**
 * @route POST /api/v1/bien-ban-ban-giao
 * @desc Create a room handover report baseline (QuanLy only)
 * @access Private
 */
router.post(
  '/bien-ban-ban-giao',
  authenticate,
  requireRole('QuanLy', 'quản lý', 'Quản lý'),
  validateBody(createBienBanSchema),
  bienBanBanGiaoController.create
)

/**
 * @route PATCH /api/v1/bien-ban-ban-giao/:id/danh-sach-tai-san
 * @desc Update the asset checklist snapshot (QuanLy only)
 * @access Private
 */
router.patch(
  '/bien-ban-ban-giao/:id/danh-sach-tai-san',
  authenticate,
  requireRole('QuanLy', 'quản lý', 'Quản lý'),
  validateParams(uuidParamSchema),
  validateBody(updateDanhSachSchema),
  bienBanBanGiaoController.updateDanhSach
)

/**
 * @route PATCH /api/v1/bien-ban-ban-giao/:id/xac-nhan
 * @desc Sign and finalize the handover, activating beds (QuanLy only)
 * @access Private
 */
router.patch(
  '/bien-ban-ban-giao/:id/xac-nhan',
  authenticate,
  requireRole('QuanLy', 'quản lý', 'Quản lý'),
  validateParams(uuidParamSchema),
  validateBody(xacNhanBienBanSchema),
  bienBanBanGiaoController.xacNhan
)

/**
 * @route GET /api/v1/bien-ban-ban-giao
 * @desc Fetch handover report by contract ID (QuanLy only)
 * @access Private
 */
router.get(
  '/bien-ban-ban-giao',
  authenticate,
  requireRole('QuanLy', 'quản lý', 'Quản lý'),
  bienBanBanGiaoController.getByHopDongId
)

export default router
