import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import * as thongKeService from '../services/thongKe.service.js'

const router = Router()

/**
 * @route GET /api/v1/thong-ke/sale
 * @desc Get dashboard statistics for Sale role
 * @access Private (Sale only)
 */
router.get(
  '/thong-ke/sale',
  authenticate,
  requireRole('Sale'),
  async (req, res) => {
    try {
      const stats = await thongKeService.thongKeSale(req.user.id)
      res.json({ success: true, data: stats })
    } catch (err) {
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message }
      })
    }
  }
)

/**
 * @route GET /api/v1/thong-ke/quan-ly
 * @desc Get dashboard statistics for Manager role
 * @access Private (QuanLy only)
 */
router.get(
  '/thong-ke/quan-ly',
  authenticate,
  requireRole('QuanLy'),
  async (req, res) => {
    try {
      const stats = await thongKeService.thongKeQuanLy()
      res.json({ success: true, data: stats })
    } catch (err) {
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message }
      })
    }
  }
)

/**
 * @route GET /api/v1/thong-ke/ke-toan
 * @desc Get dashboard statistics for Accountant role
 * @access Private (KeToan only)
 */
router.get(
  '/thong-ke/ke-toan',
  authenticate,
  requireRole('KeToan'),
  async (req, res) => {
    try {
      const stats = await thongKeService.thongKeKeToan()
      res.json({ success: true, data: stats })
    } catch (err) {
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message }
      })
    }
  }
)

export default router
