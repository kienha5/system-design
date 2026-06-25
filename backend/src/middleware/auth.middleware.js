import jwt from 'jsonwebtoken'
import { authService } from '../services/auth.service.js'

/**
 * Middleware to authenticate requests using Supabase JWT offline.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token xác thực không được cung cấp hoặc sai định dạng.'
        }
      })
    }

    const token = authHeader.split(' ')[1]
    
    if (!process.env.SUPABASE_JWT_SECRET) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'SUPABASE_JWT_SECRET chưa được cấu hình ở backend.'
        }
      })
    }

    let payload
    try {
      payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET)
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token xác thực không hợp lệ hoặc đã hết hạn.'
        }
      })
    }

    const userId = payload.sub
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Payload token thiếu thông tin định danh người dùng.'
        }
      })
    }

    // Query application database for user role and branch
    const user = await authService.getCurrentUser(userId)
    if (!user) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Tài khoản của bạn chưa được kích hoạt hoặc không tồn tại trong hệ thống.'
        }
      })
    }

    // Attach user information to request object
    req.user = user
    next()
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Lỗi xác thực hệ thống.'
      }
    })
  }
}

/**
 * Middleware to restrict access based on user roles.
 * Must be placed after the authenticate middleware.
 * 
 * @param {...string} allowedRoles - Roles permitted to access the route
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Yêu cầu chưa được xác thực.'
        }
      })
    }

    if (!allowedRoles.includes(req.user.vai_tro)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Tài khoản không có quyền truy cập chức năng này.'
        }
      })
    }

    next()
  }
}
