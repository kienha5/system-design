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
import khachHangRouter from './src/routes/khachHang.routes.js'

import { requestTraceMiddleware } from './src/middleware/requestTrace.middleware.js'
import { logDebug, wrapServiceInPlace } from './src/utils/logger.js'

import { authService } from './src/services/auth.service.js'
import { bienBanBanGiaoService } from './src/services/bienBanBanGiao.service.js'
import { bienBanTraPhongService } from './src/services/bienBanTraPhong.service.js'
import { dieuKienCuTruService } from './src/services/dieuKienCuTru.service.js'
import { hoaDonService } from './src/services/hoaDon.service.js'
import { hopDongService } from './src/services/hopDong.service.js'
import { nhuCauThueService } from './src/services/nhuCauThue.service.js'
import { phieuDatCocService } from './src/services/phieuDatCoc.service.js'
import { phongService } from './src/services/phong.service.js'
import { thongKeService } from './src/services/thongKe.service.js'

// Wrap services for tracing at startup
wrapServiceInPlace('authService', authService)
wrapServiceInPlace('bienBanBanGiaoService', bienBanBanGiaoService)
wrapServiceInPlace('bienBanTraPhongService', bienBanTraPhongService)
wrapServiceInPlace('dieuKienCuTruService', dieuKienCuTruService)
wrapServiceInPlace('hoaDonService', hoaDonService)
wrapServiceInPlace('hopDongService', hopDongService)
wrapServiceInPlace('nhuCauThueService', nhuCauThueService)
wrapServiceInPlace('phieuDatCocService', phieuDatCocService)
wrapServiceInPlace('phongService', phongService)
wrapServiceInPlace('thongKeService', thongKeService)

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
app.use('/api/v1', khachHangRouter)

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

