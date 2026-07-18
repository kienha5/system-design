import { Router } from 'express'
import { khachHangController } from '../controllers/khachHang.controller.js'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'

const router = Router()

/**
 * @route GET /api/v1/khach-hang
 * @desc Search customers by phone number prefix (near match)
 * @access Private (Sale, QuanLy)
 */
router.get(
  '/khach-hang',
  authenticate,
  requireRole('Sale', 'QuanLy'),
  khachHangController.search
)

export default router
