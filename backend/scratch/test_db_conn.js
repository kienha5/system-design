import postgres from 'postgres';
import 'dotenv/config';

const poolerUrl = process.env.DATABASE_URL;
// Tự động suy luận Direct URL từ Pooler URL
// Ví dụ: postgresql://postgres.mtjrskuepsyixlnjfyoe:kiennghia72@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
// Chuyển thành: postgresql://postgres:kiennghia72@db.mtjrskuepsyixlnjfyoe.supabase.co:5432/postgres?sslmode=require

console.log('Pooler URL:', poolerUrl);

// Thử kết nối bằng Pooler URL trước
try {
  console.log('Đang kết nối qua Pooler (6543)...');
  const sqlPooler = postgres(poolerUrl, { connect_timeout: 5 });
  await sqlPooler`SELECT 1`;
  console.log('Kết nối qua Pooler thành công!');
  await sqlPooler.end();
} catch (err) {
  console.error('Lỗi kết nối qua Pooler:', err.message);
}

// Thử kết nối bằng Direct URL
try {
  // Thay thế host và port
  const directUrl = poolerUrl
    .replace('postgres.mtjrskuepsyixlnjfyoe', 'postgres')
    .replace('aws-0-ap-southeast-1.pooler.supabase.com:6543', 'db.mtjrskuepsyixlnjfyoe.supabase.co:5432');
  
  console.log('Direct URL:', directUrl);
  console.log('Đang kết nối qua Direct Connection (5432)...');
  const sqlDirect = postgres(directUrl, { connect_timeout: 5 });
  await sqlDirect`SELECT 1`;
  console.log('Kết nối qua Direct Connection thành công!');
  await sqlDirect.end();
} catch (err) {
  console.error('Lỗi kết nối qua Direct Connection:', err.message);
}
