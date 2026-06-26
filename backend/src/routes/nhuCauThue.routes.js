import { Router } from 'express'
import { nhuCauThueController } from '../controllers/nhuCauThue.controller.js'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { validateBody, validateParams } from '../middleware/validate.js'
import { 
  createNhuCauThueSchema, 
  updatePhongDuKienSchema, 
  scheduleViewingSchema, 
  uuidParamSchema 
} from '../validators/nhuCauThue.validator.js'

const router = Router()

/**
 * @route POST /api/v1/nhu-cau-thue
 * @desc Create a new rental request, upserting customer by phone number
 * @access Private (Sale only)
 */
router.post(
  '/nhu-cau-thue',
  authenticate,
  requireRole('Sale'),
  validateBody(createNhuCauThueSchema),
  nhuCauThueController.create
)

/**
 * @route GET /api/v1/nhu-cau-thue
 * @desc Search rental requests by customer phone number
 * @access Private (Sale only)
 */
router.get(
  '/nhu-cau-thue',
  authenticate,
  requireRole('Sale'),
  nhuCauThueController.search
)

/**
 * @route GET /api/v1/nhu-cau-thue/:id
 * @desc Fetch a single rental request by ID
 * @access Private (Sale only)
 */
router.get(
  '/nhu-cau-thue/:id',
  authenticate,
  requireRole('Sale'),
  validateParams(uuidParamSchema),
  nhuCauThueController.getById
)

/**
 * @route PATCH /api/v1/nhu-cau-thue/:id/phong-du-kien
 * @desc Update the prospective room for a rental request
 * @access Private (Sale only)
 */
router.patch(
  '/nhu-cau-thue/:id/phong-du-kien',
  authenticate,
  requireRole('Sale'),
  validateParams(uuidParamSchema),
  validateBody(updatePhongDuKienSchema),
  nhuCauThueController.updatePhongDuKien
)

/**
 * @route PATCH /api/v1/nhu-cau-thue/:id/lich-hen
 * @desc Schedule or reschedule a room viewing appointment
 * @access Private (Sale only)
 */
router.patch(
  '/nhu-cau-thue/:id/lich-hen',
  authenticate,
  requireRole('Sale'),
  validateParams(uuidParamSchema),
  validateBody(scheduleViewingSchema),
  nhuCauThueController.datLichXem
)

/**
 * @route PATCH /api/v1/nhu-cau-thue/:id/xac-nhan-da-xem
 * @desc Confirm room viewing has been completed
 * @access Private (Sale only)
 */
router.patch(
  '/nhu-cau-thue/:id/xac-nhan-da-xem',
  authenticate,
  requireRole('Sale'),
  validateParams(uuidParamSchema),
  nhuCauThueController.xacNhanDaXem
)

/**
 * @route PATCH /api/v1/nhu-cau-thue/:id/huy
 * @desc Cancel a rental request
 * @access Private (Sale only)
 */
router.patch(
  '/nhu-cau-thue/:id/huy',
  authenticate,
  requireRole('Sale'),
  validateParams(uuidParamSchema),
  nhuCauThueController.huyYeuCau
)

export default router
