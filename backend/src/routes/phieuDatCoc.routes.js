import { Router } from 'express'
import { phieuDatCocController } from '../controllers/phieuDatCoc.controller.js'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.js'
import { createPhieuDatCocSchema } from '../validators/phieuDatCoc.validator.js'

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

export default router
