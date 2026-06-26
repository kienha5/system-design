import { Router } from 'express'
import { bienBanTraPhongController } from '../controllers/bienBanTraPhong.controller.js'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { validateBody, validateParams } from '../middleware/validate.js'
import { 
  createBienBanTraPhongSchema, 
  capNhatNgayHenSchema, 
  doSoatSchema, 
  khauTruSchema 
} from '../validators/bienBanTraPhong.validator.js'
import { z } from 'zod'

const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'id phải là định dạng UUID hợp lệ' })
})

const router = Router()

/**
 * @route POST /api/v1/bien-ban-tra-phong
 * @desc Register a new checkout request
 * @access Private (Sale only)
 */
router.post(
  '/bien-ban-tra-phong',
  authenticate,
  requireRole('Sale'),
  validateBody(createBienBanTraPhongSchema),
  bienBanTraPhongController.create
)

/**
 * @route PATCH /api/v1/bien-ban-tra-phong/:id/ngay-hen
 * @desc Update the scheduled checkout date
 * @access Private (Sale only)
 */
router.patch(
  '/bien-ban-tra-phong/:id/ngay-hen',
  authenticate,
  requireRole('Sale'),
  validateParams(uuidParamSchema),
  validateBody(capNhatNgayHenSchema),
  bienBanTraPhongController.capNhatNgayHen
)

/**
 * @route PATCH /api/v1/bien-ban-tra-phong/:id/doi-soat
 * @desc Record asset audit results
 * @access Private (QuanLy only)
 */
router.patch(
  '/bien-ban-tra-phong/:id/doi-soat',
  authenticate,
  requireRole('QuanLy'),
  validateParams(uuidParamSchema),
  validateBody(doSoatSchema),
  bienBanTraPhongController.doSoat
)

/**
 * @route PATCH /api/v1/bien-ban-tra-phong/:id/khau-tru
 * @desc Accountant calculates and records deductions
 * @access Private (KeToan only)
 */
router.patch(
  '/bien-ban-tra-phong/:id/khau-tru',
  authenticate,
  requireRole('KeToan'),
  validateParams(uuidParamSchema),
  validateBody(khauTruSchema),
  bienBanTraPhongController.khauTru
)

/**
 * @route PATCH /api/v1/bien-ban-tra-phong/:id/xac-nhan-khach
 * @desc Record client confirmation of checkout details
 * @access Private (QuanLy or Sale)
 */
router.patch(
  '/bien-ban-tra-phong/:id/xac-nhan-khach',
  authenticate,
  requireRole('QuanLy', 'Sale'),
  validateParams(uuidParamSchema),
  bienBanTraPhongController.xacNhanKhach
)

/**
 * @route GET /api/v1/bien-ban-tra-phong/:id
 * @desc Fetch details of a checkout report by ID
 * @access Private (Sale, QuanLy, KeToan)
 */
router.get(
  '/bien-ban-tra-phong/:id',
  authenticate,
  requireRole('Sale', 'QuanLy', 'KeToan'),
  validateParams(uuidParamSchema),
  bienBanTraPhongController.getById
)

export default router
