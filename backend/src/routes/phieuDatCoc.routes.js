import { Router } from 'express'
import { phieuDatCocController } from '../controllers/phieuDatCoc.controller.js'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { validateBody, validateParams } from '../middleware/validate.js'
import { 
  createPhieuDatCocSchema, 
  nopChungTuSchema, 
  xacNhanPhieuSchema,
  kiemTraDieuKienSchema
} from '../validators/phieuDatCoc.validator.js'
import { z } from 'zod'

// Schema validate uuid path param
const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'id phải là định dạng UUID hợp lệ' })
})

const router = Router()

/**
 * @route POST /api/v1/phieu-dat-coc
 * @desc Create a new deposit sheet, locking the room/beds for 24h
 * @access Private (Sale only)
 */
router.post(
  '/phieu-dat-coc',
  authenticate,
  requireRole('Sale'),
  validateBody(createPhieuDatCocSchema),
  phieuDatCocController.create
)

/**
 * @route GET /api/v1/phieu-dat-coc
 * @desc List deposit sheets with optional filters
 * @access Private (Sale, QuanLy)
 */
router.get(
  '/phieu-dat-coc',
  authenticate,
  requireRole('Sale', 'QuanLy'),
  phieuDatCocController.list
)

/**
 * @route GET /api/v1/phieu-dat-coc/:id
 * @desc Get details of a single deposit sheet by ID
 * @access Private (Sale, QuanLy)
 */
router.get(
  '/phieu-dat-coc/:id',
  authenticate,
  requireRole('Sale', 'QuanLy'),
  validateParams(uuidParamSchema),
  phieuDatCocController.getById
)

/**
 * @route PATCH /api/v1/phieu-dat-coc/:id/chung-tu
 * @desc Submit payment slip for a deposit sheet
 * @access Private (Sale only)
 */
router.patch(
  '/phieu-dat-coc/:id/chung-tu',
  authenticate,
  requireRole('Sale'),
  validateParams(uuidParamSchema),
  validateBody(nopChungTuSchema),
  phieuDatCocController.nopChungTu
)

/**
 * @route PATCH /api/v1/phieu-dat-coc/:id/xac-nhan
 * @desc Confirm or reject a deposit payment
 * @access Private (QuanLy only)
 */
router.patch(
  '/phieu-dat-coc/:id/xac-nhan',
  authenticate,
  requireRole('QuanLy'),
  validateParams(uuidParamSchema),
  validateBody(xacNhanPhieuSchema),
  phieuDatCocController.xacNhan
)

/**
 * @route POST /api/v1/phieu-dat-coc/:id/kiem-tra-dieu-kien
 * @desc Preview residence condition checks for a deposit sheet
 * @access Private (QuanLy only)
 */
router.post(
  '/phieu-dat-coc/:id/kiem-tra-dieu-kien',
  authenticate,
  requireRole('QuanLy'),
  validateParams(uuidParamSchema),
  validateBody(kiemTraDieuKienSchema),
  phieuDatCocController.kiemTraDieuKien
)

export default router

