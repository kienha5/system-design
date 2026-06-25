import { Router } from 'express'
import { authController } from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validateMe } from '../validators/auth.validator.js'

const router = Router()

/**
 * @route GET /api/v1/me
 * @desc Get current authenticated user profile and system role
 * @access Private
 */
router.get('/me', authenticate, validateMe, authController.getMe)

export default router
