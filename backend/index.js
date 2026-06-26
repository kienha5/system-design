import express from 'express'
import cors from 'cors'
import 'dotenv/config'

import authRouter from './src/routes/auth.routes.js'
import phongRouter from './src/routes/phong.routes.js'
import nhuCauThueRouter from './src/routes/nhuCauThue.routes.js'
import phieuDatCocRouter from './src/routes/phieuDatCoc.routes.js'
import hopDongRouter from './src/routes/hopDong.routes.js'

const app = express()
const PORT = process.env.PORT || 3000

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

// Middleware xử lý lỗi tập trung
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'SYSTEM_ERROR',
      message: err.message || 'Lỗi hệ thống không xác định.'
    }
  })
})

app.listen(PORT, () => {
  console.log(`[SERVER] Backend đang chạy tại http://localhost:${PORT}`)
})
