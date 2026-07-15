import express from 'express'
import cors from 'cors'
import 'dotenv/config'

import authRouter from './src/routes/auth.routes.js'
import phongRouter from './src/routes/phong.routes.js'
import nhuCauThueRouter from './src/routes/nhuCauThue.routes.js'
import phieuDatCocRouter from './src/routes/phieuDatCoc.routes.js'
import hopDongRouter from './src/routes/hopDong.routes.js'
import hoaDonRouter from './src/routes/hoaDon.routes.js'
import bienBanBanGiaoRouter from './src/routes/bienBanBanGiao.routes.js'
import bienBanTraPhongRouter from './src/routes/bienBanTraPhong.routes.js'
import thongKeRouter from './src/routes/thongKe.routes.js'

import { requestTraceMiddleware } from './src/middleware/requestTrace.middleware.js'
import { logDebug } from './src/utils/logger.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(requestTraceMiddleware)

app.use(cors({
  origin: '*', // Hỗ trợ mọi nguồn gốc trong môi trường phát triển
  credentials: true
}))
app.use(express.json())

// Đăng ký các API routes với tiền tố /api/v1
app.use('/api/v1', authRouter)
app.use('/api/v1', phongRouter)
app.use('/api/v1', nhuCauThueRouter)
app.use('/api/v1', phieuDatCocRouter)
app.use('/api/v1', hopDongRouter)
app.use('/api/v1', hoaDonRouter)
app.use('/api/v1', bienBanBanGiaoRouter)
app.use('/api/v1', bienBanTraPhongRouter)
app.use('/api/v1', thongKeRouter)

// Middleware xử lý lỗi tập trung
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500
  const errorCode = err.code || 'SYSTEM_ERROR'
  
  logDebug(`[HTTP_RESPONSE_ERROR] ${req.method} ${req.originalUrl} - Status: ${status} - Error: ${errorCode}`, {
    method: req.method,
    url: req.originalUrl,
    statusCode: status,
    error: {
      code: errorCode,
      message: err.message
    }
  })

  // Only log full system stack errors to console error when they are internal server errors
  if (status === 500) {
    console.error('Unhandled error:', err)
  }

  res.status(status).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message || 'Lỗi hệ thống không xác định.'
    }
  })
})

app.listen(PORT, () => {
  console.log(`[SERVER] Backend đang chạy tại http://localhost:${PORT}`)
}) 

