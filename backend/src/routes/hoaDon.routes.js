import { Router } from 'express'
import { hoaDonController } from '../controllers/hoaDon.controller.js'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { validateBody, validateParams } from '../middleware/validate.js'
import { createHoaDonSchema, xacNhanThanhToanSchema } from '../validators/hoaDon.validator.js'
import { z } from 'zod'

// Schema to validate uuid path param
const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'id phải là định dạng UUID hợp lệ' })
})

const router = Router()

/**
 * @route POST /api/v1/hoa-don
 * @desc Create a new invoice (KeToan only)
 * @access Private
 */
router.post(
  '/hoa-don',
  authenticate,
  requireRole('KeToan'),
  validateBody(createHoaDonSchema),
  hoaDonController.create
)

/**
 * @route PATCH /api/v1/hoa-don/:id/xac-nhan-thanh-toan
 * @desc Confirm payment of an invoice (KeToan only)
 * @access Private
 */
router.patch(
  '/hoa-don/:id/xac-nhan-thanh-toan',
  authenticate,
  requireRole('KeToan'),
  validateParams(uuidParamSchema),
  validateBody(xacNhanThanhToanSchema),
  hoaDonController.xacNhanThanhToan
)

/**
 * @route GET /api/v1/hoa-don/:id
 * @desc Get invoice details by ID (KeToan and QuanLy)
 * @access Private
 */
router.get(
  '/hoa-don/:id',
  authenticate,
  requireRole('KeToan', 'QuanLy', 'quản lý', 'Quản lý'),
  validateParams(uuidParamSchema),
  hoaDonController.getById
)

/**
 * @route GET /api/v1/hop-dong/:id/hoa-don
 * @desc Get all invoices for a contract (KeToan and QuanLy)
 * @access Private
 */
router.get(
  '/hop-dong/:id/hoa-don',
  authenticate,
  requireRole('KeToan', 'QuanLy', 'quản lý', 'Quản lý'),
  validateParams(uuidParamSchema),
  hoaDonController.getByHopDongId
)

export default router
