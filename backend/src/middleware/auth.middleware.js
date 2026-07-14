import jwt from 'jsonwebtoken'
import sql from '../db.js'
import 'dotenv/config'
import crypto from 'crypto'

let jwksCache = null
let jwksFetchTime = 0
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours caching for public keys

async function getPublicKeyFromJWKS(kid) {
  const now = Date.now()
  if (!jwksCache || now - jwksFetchTime > CACHE_TTL) {
    try {
      const jwksUrl = `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`
      const res = await fetch(jwksUrl)
      if (!res.ok) {
        throw new Error(`Failed to fetch JWKS: ${res.statusText}`)
      }
      jwksCache = await res.json()
      jwksFetchTime = now
    } catch (err) {
      console.error('[AUTH] Failed to fetch/refresh JWKS:', err)
      if (!jwksCache) throw err
    }
  }

  const key = jwksCache.keys.find(k => k.kid === kid)
  if (!key) {
    // Force one refresh if key is not found
    const jwksUrl = `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`
    const res = await fetch(jwksUrl)
    if (res.ok) {
      jwksCache = await res.json()
      jwksFetchTime = now
    }
    const refetchedKey = jwksCache.keys.find(k => k.kid === kid)
    if (!refetchedKey) {
      throw new Error(`Public key with kid ${kid} not found in JWKS`)
    }
    return crypto.createPublicKey({ format: 'jwk', key: refetchedKey })
  }

  return crypto.createPublicKey({ format: 'jwk', key: key })
}

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Thiếu token xác thực.' }
      })
    }

    const token = authHeader.split(' ')[1]

    // Decode token to inspect signature algorithm
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token xác thực không hợp lệ.' }
      })
    }

    const algorithm = decoded.header.alg
    let verificationKey

    if (algorithm === 'ES256') {
      verificationKey = await getPublicKeyFromJWKS(decoded.header.kid)
    } else {
      verificationKey = process.env.SUPABASE_JWT_SECRET
      if (!verificationKey) {
        return res.status(500).json({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Thiếu cấu hình JWT secret.' }
        })
      }
    }

    // Verify token signature and claims
    let payload
    try {
      payload = jwt.verify(token, verificationKey, { algorithms: [algorithm] })
    } catch (jwtErr) {
      console.warn('[AUTH] Token verification failed:', jwtErr.message)
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token không hợp lệ hoặc đã hết hạn.' }
      })
    }

    const userId = payload.sub
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token thiếu thông tin định danh.' }
      })
    }

    // Lookup user in the database
    const [nguoiDung] = await sql`
      SELECT id, ho_ten, vai_tro, chi_nhanh_id, email
      FROM nguoi_dung_he_thong
      WHERE id = ${userId}
    `

    if (!nguoiDung) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Tài khoản của bạn chưa được kích hoạt hoặc không tồn tại trong hệ thống.`
        }
      })
    }

    req.user = {
      id: nguoiDung.id,
      ho_ten: nguoiDung.ho_ten,
      vai_tro: nguoiDung.vai_tro,
      chi_nhanh_id: nguoiDung.chi_nhanh_id,
      email: nguoiDung.email
    }

    next()
  } catch (err) {
    console.error('[AUTH] Authentication middleware unexpected error:', err)
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Lỗi xác thực hệ thống.' }
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

