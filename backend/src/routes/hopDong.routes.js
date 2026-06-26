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
 * @route GET /api/v1/hop-dong/:id
 * @desc Get details of a single lease contract by ID
 * @access Private (QuanLy, KeToan)
 */
router.get(
  '/hop-dong/:id',
  authenticate,
  requireRole('QuanLy', 'KeToan'),
  validateParams(uuidParamSchema),
  hopDongController.getById
)

export default router
