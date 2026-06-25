import { Router } from 'express'
import { phongController } from '../controllers/phong.controller.js'
import { roomStatusController } from '../controllers/roomStatus.controller.js'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { validateQuery, validateBody, validateParams } from '../middleware/validate.js'
import { searchPhongSchema, searchGiuongSchema } from '../validators/phong.validator.js'
import { uuidParamSchema, updateRoomStatusSchema, updateBedStatusSchema } from '../validators/roomStatus.validator.js'

const router = Router()

// =========================================================================
// UC02 - INQUIRIES (Accessible by all authenticated roles)
// =========================================================================

/**
 * @route GET /api/v1/phong
 * @desc Inquiry list of rooms based on filters (paginated)
 * @access Private (All roles)
 */
router.get('/phong', authenticate, validateQuery(searchPhongSchema), phongController.searchPhong)

/**
 * @route GET /api/v1/giuong
 * @desc Inquiry list of beds inside a specific room
 * @access Private (All roles)
 */
router.get('/giuong', authenticate, validateQuery(searchGiuongSchema), phongController.searchGiuong)

// =========================================================================
// UC03 - MANUAL STATUS UPDATES (Restricted to Quản lý)
// =========================================================================

/**
 * @route PATCH /api/v1/phong/:id/trang-thai
 * @desc Manually update a room's status (with transition validation and audit logging)
 * @access Private (QuanLy only)
 */
router.patch(
  '/phong/:id/trang-thai',
  authenticate,
  requireRole('QuanLy'),
  validateParams(uuidParamSchema),
  validateBody(updateRoomStatusSchema),
  roomStatusController.updateRoomStatus
)

/**
 * @route PATCH /api/v1/giuong/:id/trang-thai
 * @desc Manually update a bed's status (with transition validation, audit logging, and room status sync)
 * @access Private (QuanLy only)
 */
router.patch(
  '/giuong/:id/trang-thai',
  authenticate,
  requireRole('QuanLy'),
  validateParams(uuidParamSchema),
  validateBody(updateBedStatusSchema),
  roomStatusController.updateBedStatus
)

export default router
