import postgres from 'postgres'
import 'dotenv/config'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL chưa được định nghĩa trong file .env')
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 10,              // max connections trong pool
  idle_timeout: 20,     // đóng connection sau 20s idle
  connect_timeout: 10,  // timeout nếu không kết nối được sau 10s
})

export default sql
