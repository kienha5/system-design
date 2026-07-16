import dotenv from 'dotenv';
dotenv.config();
console.log('--- ENV CHECK ---');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
