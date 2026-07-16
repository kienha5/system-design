import { Router } from 'express'
import { hopDongController } from '../controllers/hopDong.controller.js'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { validateBody, validateParams } from '../middleware/validate.js'
import { createHopDongSchema } from '../validators/hopDong.validator.js'
import { z } from 'zod'

// Schema validate uuid path param
const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'id phải là định dạng UUID hợp lệ' })
})

const router = Router()

/**
 * @route POST /api/v1/hop-dong
 * @desc Create a new lease contract
 * @access Private (QuanLy only)
 */
router.post(
  '/hop-dong',
  authenticate,
  requireRole('QuanLy'),
  validateBody(createHopDongSchema),
  hopDongController.create
)

/**
 * @route GET /api/v1/hop-dong
 * @desc Search contracts by code, customer name or phone number
 * @access Private (Sale, QuanLy, KeToan)
 */
router.get(
  '/hop-dong',
  authenticate,
  requireRole('Sale', 'QuanLy', 'KeToan'),
  hopDongController.search
)

/**
 * @route GET /api/v1/hop-dong/:id
 * @desc Get details of a single lease contract by ID
 * @access Private (QuanLy, KeToan)
 */
router.get(
  '/hop-dong/:id',
  authenticate,
  requireRole('Sale', 'QuanLy', 'KeToan'),
  validateParams(uuidParamSchema),
  hopDongController.getById
)

/**
 * @route PATCH /api/v1/hop-dong/:id/thanh-ly
 * @desc Liquidate lease contract
 * @access Private (QuanLy only)
 */
router.patch(
  '/hop-dong/:id/thanh-ly',
  authenticate,
  requireRole('QuanLy'),
  validateParams(uuidParamSchema),
  validateBody(z.object({
    tai_chinh_da_hoan_tat: z.boolean({
      required_error: 'tai_chinh_da_hoan_tat là bắt buộc',
      invalid_type_error: 'tai_chinh_da_hoan_tat phải là kiểu boolean'
    })
  })),
  hopDongController.thanhLy
)

export default router
